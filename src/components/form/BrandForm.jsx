import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { UploadCloud, X } from "lucide-react";
import { uploadImage } from "../../redux/slices/imageSlice";

const inputClass = (hasError) =>
  `w-full px-3.5 py-2.5 rounded-lg border text-[15px] font-medium text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 ${
    hasError
      ? "border-red-300 focus:ring-red-200 focus:border-red-400"
      : "border-gray-200 focus:ring-[var(--brand-purple)]/25 focus:border-[var(--brand-purple)]"
  }`;

const BrandForm = ({ onSubmit, onCancel, defaultValues = {}, loading = false }) => {
  const dispatch = useDispatch();
  const { loading: imageLoading } = useSelector((state) => state.image);
  const isEdit = Boolean(defaultValues.id);
  const fileInputRef = useRef(null);

  const [logoUrl, setLogoUrl] = useState(defaultValues.logoUrl || "");
  const [isDragging, setIsDragging] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      name: defaultValues.name || "",
    },
  });

  useEffect(() => {
    reset({
      name: defaultValues.name || "",
    });
    setLogoUrl(defaultValues.logoUrl || "");
  }, [defaultValues, reset]);

  /* AUTO UPLOAD ON FILE SELECT / DROP */
  const uploadFile = async (file) => {
    if (!file) return;
    const res = await dispatch(uploadImage(file));
    if (uploadImage.fulfilled.match(res)) {
      setLogoUrl(res.payload.path);
    }
  };

  const handleFileInput = (e) => uploadFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    uploadFile(e.dataTransfer.files?.[0]);
  };

  /* SUBMIT */
  const onFormSubmit = (data) => {
    const payload = {
      name: data.name,
      logoUrl,
    };

    onSubmit({
      id: defaultValues.id || null,
      data: payload,
    });

    if (!defaultValues.id) {
      reset({ name: "" });
      setLogoUrl("");
    }
  };

  const previewUrl = logoUrl ? `${import.meta.env.VITE_API_BASE_URL}/${logoUrl}` : null;
  const primaryLabel = imageLoading
    ? "Uploading..."
    : loading
      ? "Saving..."
      : "Save Brand";

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      {/* NAME */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1.5">
          Brand Name
        </label>

        <input
          type="text"
          {...register("name", {
            required: "Brand name is required",
            minLength: {
              value: 2,
              message: "Brand name must be at least 2 characters",
            },
          })}
          placeholder="e.g. Aaraa Naturals"
          className={inputClass(errors.name)}
        />

        {errors.name && (
          <p className="text-red-600 text-xs mt-1.5">{errors.name.message}</p>
        )}
      </div>

      {/* LOGO — drag & drop uploader */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1.5">
          Brand Logo
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />

        {previewUrl ? (
          <div className="relative group rounded-xl overflow-hidden border border-gray-200 w-fit">
            <img
              src={previewUrl}
              alt="Brand logo preview"
              className="w-32 h-32 object-contain bg-gray-50"
            />
            <button
              type="button"
              onClick={() => setLogoUrl("")}
              aria-label="Remove logo"
              className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-lg bg-white/95 text-red-600 shadow-sm hover:bg-white transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-2 h-36 rounded-xl border-2 border-dashed cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-purple)]/25 ${
              isDragging
                ? "border-[var(--brand-purple)] bg-[var(--brand-purple)]/5"
                : "border-gray-200 hover:border-[var(--brand-purple)]/40 hover:bg-gray-50"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-[var(--brand-purple)]/10 flex items-center justify-center text-[var(--brand-purple)]">
              <UploadCloud size={18} />
            </div>
            <p className="text-[13px] font-medium text-gray-600">
              Click to upload or drag &amp; drop
            </p>
            <p className="text-[11px] text-gray-400">PNG or JPG, up to 5MB</p>
          </div>
        )}

        {imageLoading && (
          <p className="text-[var(--brand-purple)] text-xs mt-2">Uploading...</p>
        )}
      </div>

      {/* BUTTONS */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 h-12 rounded-xl text-[14px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition-all duration-200 cursor-pointer"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={imageLoading || loading}
          className="px-4 py-2.5 h-12 rounded-xl text-[14px] font-semibold text-white bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-purple-dark)] shadow-sm hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:brightness-100"
        >
          {primaryLabel}
        </button>
      </div>
    </form>
  );
};

export default BrandForm;
