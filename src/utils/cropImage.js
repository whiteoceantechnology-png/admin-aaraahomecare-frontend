// Canvas-based crop/flip/rotate — runs entirely client-side, no new API.
// The standard react-image-crop recipe (draw the selected pixel rect onto a
// canvas) extended with flip/rotate transforms applied before the draw, so
// Apply always bakes crop + flip + rotate into one final image.
export const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

// cropPixels: { x, y, width, height } in source-image pixel space.
// rotateDeg: 0 | 90 | 180 | 270. flipH/flipV: booleans.
export const getCroppedImageBlob = async (imageSrc, cropPixels, { rotateDeg = 0, flipH = false, flipV = false } = {}) => {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const swapDims = rotateDeg % 180 !== 0;
  canvas.width = swapDims ? cropPixels.height : cropPixels.width;
  canvas.height = swapDims ? cropPixels.width : cropPixels.height;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotateDeg * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.translate(-cropPixels.width / 2, -cropPixels.height / 2);

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height,
  );
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))), "image/jpeg", 0.92);
  });
};
