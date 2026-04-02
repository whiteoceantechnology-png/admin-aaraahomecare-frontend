import { useForm } from "react-hook-form";
import { Save, X } from "lucide-react";

const TaxForm = ({ onSubmit, onCancel, defaultValues = {} }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      taxName: defaultValues.taxName || "",
      taxPercentage: defaultValues.taxPercentage ?? 0,
    },
  });

  const onFormSubmit = (data) => {
    const finalData = {
      id: defaultValues.id || null,
      taxName: data.taxName,
      taxPercentage: Number(data.taxPercentage) || 0,
      // Created / Updated backend or parent component handle pannalaam
    };

    onSubmit(finalData);
    reset();
  };

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
    >
      {/* Tax Name */}
      <div className="flex flex-col md:col-span-2">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Tax Name
        </label>
        <input
          type="text"
          {...register("taxName", {
            required: "Tax name is required",
            minLength: { value: 2, message: "Minimum 2 characters" },
          })}
          placeholder="Enter tax name (e.g. GST, VAT)"
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.taxName
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {errors.taxName && (
          <p className="text-sm text-red-500 mt-1">
            {errors.taxName.message}
          </p>
        )}
      </div>

      {/* Tax Percentage */}
      <div className="flex flex-col md:col-span-2 md:max-w-xs">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Tax Percentage
        </label>
        <input
          type="number"
          step="0.01"
          {...register("taxPercentage", {
            required: "Tax percentage is required",
            min: { value: 0, message: "Min 0%" },
            max: { value: 100, message: "Max 100%" },
          })}
          placeholder="e.g. 18"
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.taxPercentage
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {errors.taxPercentage && (
          <p className="text-sm text-red-500 mt-1">
            {errors.taxPercentage.message}
          </p>
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

export default TaxForm;
