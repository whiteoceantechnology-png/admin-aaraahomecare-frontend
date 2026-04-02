// src/components/form/ProductForm.jsx
import { useForm } from "react-hook-form";
import { Save, X } from "lucide-react";

const ProductForm = ({ defaultValues = {}, onSubmit, onCancel }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      categoryName: defaultValues.categoryName || "",
      productName: defaultValues.productName || "",
      taxName: "",
      tags: "",
      productDescription: "",
      moreInfo: "",
    },
  });

  const onFormSubmit = (data) => {
    const finalData = {
      id: defaultValues.id || null,
      categoryName: data.categoryName,
      productName: data.productName,
      productImage: null, // later image handling add pannalaam
    };
    onSubmit(finalData);
    reset();
  };

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
    >
      {/* Category Name */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Category Name
        </label>
        <input
          type="text"
          {...register("categoryName", { required: "Category is required" })}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.categoryName
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
          placeholder="Skin Care"
        />
        {errors.categoryName && (
          <p className="text-xs text-red-500 mt-1">
            {errors.categoryName.message}
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

      {/* Tax Name (simple input - later Select-ஆ change pannalaam) */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Tax Name
        </label>
        <input
          type="text"
          {...register("taxName")}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
          placeholder="GST"
        />
      </div>

      {/* Tags (comma separated) */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Tags (comma separated)
        </label>
        <input
          type="text"
          {...register("tags")}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
          placeholder="serum, glow, dry-skin"
        />
      </div>

      {/* Product Description */}
      <div className="flex flex-col md:col-span-2">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Product Description
        </label>
        <textarea
          rows={3}
          {...register("productDescription")}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
          placeholder="Short description about the product..."
        />
      </div>

      {/* Additional Info */}
      <div className="flex flex-col md:col-span-2">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Additional Information
        </label>
        <textarea
          rows={3}
          {...register("moreInfo")}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-500"
          placeholder="Ingredients, how to use, etc."
        />
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

export default ProductForm;
