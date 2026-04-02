// src/components/form/VariantForm.jsx
import { useForm } from "react-hook-form";
import { Save, X } from "lucide-react";
import { useEffect } from "react";

const VariantForm = ({ defaultValues = {}, onSubmit, onCancel }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      productId: defaultValues.productId || "",
      productName: defaultValues.productName || "",
      tax: defaultValues.tax || "",
      variantName: defaultValues.variantName || "",
      variantImage: [],
      tags: (defaultValues.tags || []).join(", "),
      variantColor: defaultValues.variantColor || "",
      actualPrice: defaultValues.actualPrice || 0,
      discountPrice: defaultValues.discountPrice || 0,
    },
  });

  useEffect(() => {
    reset({
      productId: defaultValues.productId || "",
      productName: defaultValues.productName || "",
      tax: defaultValues.tax || "",
      variantName: defaultValues.variantName || "",
      variantImage: [],
      tags: (defaultValues.tags || []).join(", "),
      variantColor: defaultValues.variantColor || "",
      actualPrice: defaultValues.actualPrice || 0,
      discountPrice: defaultValues.discountPrice || 0,
    });
  }, [defaultValues, reset]);

  const onFormSubmit = (data) => {
    const files = data.variantImage ? Array.from(data.variantImage) : [];
    const tagsArray = data.tags
      ? data.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const finalData = {
      id: defaultValues.id || null,
      productId: data.productId,
      productName: data.productName,
      tax: data.tax,
      variantName: data.variantName,
      variantImage: files,
      tags: tagsArray,
      variantColor: data.variantColor,
      actualPrice: Number(data.actualPrice) || 0,
      discountPrice: Number(data.discountPrice) || 0,
    };

    onSubmit(finalData);
    // reset(); // parent handles view change
  };

  const previewFiles = watch("variantImage");

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
    >
      {/* Product ID */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Product ID
        </label>
        <input
          type="text"
          {...register("productId", { required: "Product ID is required" })}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.productId
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
          placeholder="P001"
        />
        {errors.productId && (
          <p className="text-xs text-red-500 mt-1">
            {errors.productId.message}
          </p>
        )}
      </div>

      {/* Product Name */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Product Name
        </label>
        <input
          type="text"
          {...register("productName", { required: "Product name is required" })}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.productName
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
          placeholder="Hydrating Face Serum"
        />
        {errors.productName && (
          <p className="text-xs text-red-500 mt-1">
            {errors.productName.message}
          </p>
        )}
      </div>

      {/* Tax */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Tax</label>
        <input
          type="text"
          {...register("tax")}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
          placeholder="GST 18%"
        />
      </div>

      {/* Variant Name */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Variant Name
        </label>
        <input
          type="text"
          {...register("variantName", {
            required: "Variant name is required",
          })}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.variantName
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
          placeholder="30ml / Rose Pink"
        />
        {errors.variantName && (
          <p className="text-xs text-red-500 mt-1">
            {errors.variantName.message}
          </p>
        )}
      </div>

      {/* Variant Color */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Variant Color
        </label>
        <input
          type="text"
          {...register("variantColor")}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
          placeholder="Rose Pink / Transparent"
        />
      </div>

      {/* Tags */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Tags (comma separated)
        </label>
        <input
          type="text"
          {...register("tags")}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
          placeholder="hydrating, glow, dry skin"
        />
      </div>

      {/* Actual Price */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Actual Price
        </label>
        <input
          type="number"
          step="0.01"
          {...register("actualPrice", {
            required: "Actual price is required",
            min: { value: 0, message: "Min 0" },
          })}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.actualPrice
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
          placeholder="999"
        />
        {errors.actualPrice && (
          <p className="text-xs text-red-500 mt-1">
            {errors.actualPrice.message}
          </p>
        )}
      </div>

      {/* Discount Price */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Discount Price
        </label>
        <input
          type="number"
          step="0.01"
          {...register("discountPrice", {
            min: { value: 0, message: "Min 0" },
          })}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.discountPrice
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
          placeholder="799"
        />
        {errors.discountPrice && (
          <p className="text-xs text-red-500 mt-1">
            {errors.discountPrice.message}
          </p>
        )}
      </div>

      {/* Variant Images */}
      <div className="flex flex-col md:col-span-2">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Variant Images
        </label>
        <input
          type="file"
          multiple
          accept="image/*"
          {...register("variantImage")}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
        />
        {previewFiles && previewFiles.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-3">
            {Array.from(previewFiles).map((file, idx) => (
              <div
                key={idx}
                className="w-16 h-16 rounded-md overflow-hidden border border-gray-200"
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={`preview-${idx}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="md:col-span-2 flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center cursor-pointer px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
        >
          <X size={16} className="mr-1" />
          Cancel
        </button>
        <button
          type="submit"
          className="flex items-center cursor-pointer px-4 py-2 bg-black hover:bg-black text-white rounded-md"
        >
          <Save size={16} className="mr-1" />
          {defaultValues.id ? "Update" : "Save"}
        </button>
      </div>
    </form>
  );
};

export default VariantForm;
