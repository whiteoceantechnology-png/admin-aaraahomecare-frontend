// Crop / flip / rotate step required before any product image is uploaded.
// No image-editing library or component existed anywhere in this app before
// this — react-image-crop (a well-established, widely-used React cropping
// library) supplies the draggable/resizable crop box; flip and rotate are
// plain CSS transforms for the live preview, baked into the final image via
// canvas in utils/cropImage.js. Reuses the shared Modal shell (same one used
// everywhere else in this app) rather than introducing new modal chrome.
import { useRef, useState } from "react";
import { toast } from "react-hot-toast";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { FlipHorizontal2, FlipVertical2, RotateCw, RotateCcw as ResetIcon } from "lucide-react";
import Modal from "./Modal";
import IconButton from "./IconButton";
import { getCroppedImageBlob } from "../../utils/cropImage";

// Product/Category images are always saved at a fixed 1:1 square ratio —
// the crop box is locked to this (no free-form cropping) so every uploaded
// image ends up the same shape.
const CROP_ASPECT = 1 / 1;
const DEFAULT_CROP = { unit: "%", x: 10, y: 10, width: 80, height: 80 * CROP_ASPECT };

const makeAspectCropFor = (mediaWidth, mediaHeight) =>
  centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, CROP_ASPECT, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );

const ImageEditorModal = ({ open, imageSrc, onCancel, onApply }) => {
  const [crop, setCrop] = useState(DEFAULT_CROP);
  const [percentCrop, setPercentCrop] = useState(DEFAULT_CROP);
  const [rotateDeg, setRotateDeg] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [applying, setApplying] = useState(false);
  const imgRef = useRef(null);

  const handleReset = () => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      const next = makeAspectCropFor(width, height);
      setCrop(next);
      setPercentCrop(next);
    } else {
      setCrop(DEFAULT_CROP);
      setPercentCrop(DEFAULT_CROP);
    }
    setRotateDeg(0);
    setFlipH(false);
    setFlipV(false);
    setApplying(false);
  };

  // Recenter the locked-ratio crop box once the real rendered image
  // dimensions are known, so it starts centered instead of anchored top-left.
  const handleImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    const next = makeAspectCropFor(width, height);
    setCrop(next);
    setPercentCrop(next);
  };

  const handleClose = () => {
    handleReset();
    onCancel?.();
  };

  const handleApply = async () => {
    if (!imgRef.current) return;
    const { naturalWidth, naturalHeight } = imgRef.current;
    // Round width to a whole pixel and reuse it for height so width:height
    // is an exact 1:1 integer ratio — canvas.width/height (cropImage.js)
    // truncate to integers independently, which otherwise drifts the output
    // ratio by a fraction of a percent.
    const rawWidth = (percentCrop.width / 100) * naturalWidth;
    const width = Math.max(1, Math.round(rawWidth));
    const height = width;
    const cropPixels = {
      x: (percentCrop.x / 100) * naturalWidth,
      y: (percentCrop.y / 100) * naturalHeight,
      width,
      height,
    };
    setApplying(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, cropPixels, { rotateDeg, flipH, flipV });
      handleReset();
      onApply?.(blob);
    } catch (err) {
      console.error("Image crop/apply failed:", err, { cropPixels, naturalWidth, naturalHeight });
      toast.error("Couldn't process that image — try a different crop area");
      setApplying(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Edit image" maxWidth="max-w-lg">
      {imageSrc && (
        <>
          <div className="flex justify-center bg-[#FAFBFD] border border-[var(--mk-line)] rounded-lg overflow-hidden max-h-[360px] mb-3.5">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(_, pc) => setPercentCrop(pc)}
              aspect={CROP_ASPECT}
              minWidth={20}
              className="max-h-[360px]"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Selected for crop"
                onLoad={handleImageLoad}
                style={{
                  transform: `rotate(${rotateDeg}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                  maxHeight: 360,
                }}
              />
            </ReactCrop>
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <IconButton
              icon={FlipHorizontal2}
              label="Flip horizontal"
              tone="flat"
              onClick={() => setFlipH((v) => !v)}
            />
            <IconButton
              icon={FlipVertical2}
              label="Flip vertical"
              tone="flat"
              onClick={() => setFlipV((v) => !v)}
            />
            <IconButton
              icon={RotateCw}
              label="Rotate 90°"
              tone="flat"
              onClick={() => setRotateDeg((r) => (r + 90) % 360)}
            />
            <IconButton icon={ResetIcon} label="Reset" tone="flat" onClick={handleReset} />
          </div>

          <p className="text-[11.5px] text-[var(--mk-ink-400)] text-center mb-3.5">
            Drag the corners to resize the crop area, drag inside to move it.
          </p>

          <div className="flex justify-end gap-2.5 px-1 pt-3.5 border-t border-[var(--mk-line)]">
            <button
              type="button"
              onClick={handleClose}
              disabled={applying}
              className="px-4 py-2.5 rounded-lg text-[13px] font-semibold text-[var(--mk-ink-700)] border border-[var(--mk-line)] bg-white hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={applying}
              className="px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {applying ? "Applying..." : "Apply"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
};

export default ImageEditorModal;
