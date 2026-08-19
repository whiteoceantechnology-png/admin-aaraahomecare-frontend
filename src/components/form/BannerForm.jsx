import { useForm } from "react-hook-form";
import { useState } from "react";
import ImageModal from "../modal/ImageModal";

const BannerForm = ({
  formId,
  onSubmit,
  defaultValues = {},
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    defaultValues: {
      id: defaultValues.id || null,
      type: defaultValues.type || "",
      appType: defaultValues.appType || "",
      issub: defaultValues.issub ?? false,
      image: [],
    },
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const imageFiles = watch("image");

  const onFormSubmit = (data) => {
    const selectedFiles = data.image?.length ? Array.from(data.image) : [];

    const finalData = {
      ...data,
      issub: data.issub === "true" || data.issub === true,
      image:
        selectedFiles.length > 0 ? selectedFiles : defaultValues.image || [],
    };

    onSubmit(finalData);
    reset();
  };

  const handleImagePreview = (url) => {
    setSelectedImageUrl(url);
    setIsModalOpen(true);
  };

  const baseURL = import.meta.env.VITE_API_BASE_URL;

  return (
    <form id={formId} onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {/* Image Upload */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Upload Banner Images
        </label>

        <input
          type="file"
          accept="image/*"
          multiple
          {...register("image", {
            required:
              !defaultValues.image?.length && "At least one image is required",
            validate: {
              maxSize: (fileList) => {
                if (!fileList.length) return true;
                for (const file of fileList) {
                  if (file.size > 4 * 1024 * 1024)
                    return "Each image must be less than 4MB";
                }
                return true;
              },
            },
          })}
          className="w-full text-sm text-gray-500 rounded-lg border border-gray-200 px-3.5 py-2 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-purple)]/25 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[var(--brand-purple)]/10 file:text-[var(--brand-purple)] file:text-sm file:font-medium hover:file:bg-[var(--brand-purple)]/20 file:cursor-pointer"
        />

        {errors.image && (
          <p className="text-red-600 text-xs mt-1.5">{errors.image.message}</p>
        )}

        {/* Preview newly selected image */}
        {imageFiles?.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-3">
            {Array.from(imageFiles).map((file, index) => {
              const previewUrl = URL.createObjectURL(file);
              return (
                <button
                  type="button"
                  key={index}
                  className="rounded-xl overflow-hidden border border-gray-200 cursor-pointer hover:ring-2 hover:ring-[var(--brand-purple)]/40 transition-all"
                  onClick={() => handleImagePreview(previewUrl)}
                >
                  <img
                    src={previewUrl}
                    alt={`Preview ${index + 1}`}
                    className="h-20 w-20 object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* Preview existing image (edit mode) */}
        {!imageFiles?.length && defaultValues.image?.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-3">
            {defaultValues.image.map((img, index) => (
              <button
                type="button"
                key={index}
                className="rounded-xl overflow-hidden border border-gray-200 cursor-pointer hover:ring-2 hover:ring-[var(--brand-purple)]/40 transition-all"
                onClick={() =>
                  handleImagePreview(`${baseURL}/profilepic/${img}`)
                }
              >
                <img
                  src={`${baseURL}/profilepic/${img}`}
                  alt={`Existing ${index + 1}`}
                  className="h-20 w-20 object-cover"
                />
              </button>
            ))}
          </div>
        )}

        <ImageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          imageUrl={selectedImageUrl}
        />
      </div>
    </form>
  );
};

export default BannerForm;
