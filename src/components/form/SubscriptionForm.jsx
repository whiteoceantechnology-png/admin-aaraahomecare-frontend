import { useForm } from "react-hook-form";

const inputClass = (hasError) =>
  `w-full px-3.5 py-2.5 rounded-lg border text-[15px] font-medium text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 ${
    hasError
      ? "border-red-300 focus:ring-red-200 focus:border-red-400"
      : "border-gray-200 focus:ring-[var(--brand-purple)]/25 focus:border-[var(--brand-purple)]"
  }`;

const SubscriptionForm = ({ onSubmit, onCancel, defaultValues = {}, loading = false }) => {
  const isEdit = Boolean(defaultValues.id);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      type: defaultValues.type || "",
      days: defaultValues.days ?? null,
      price: defaultValues.price ?? null,
    },
  });

  const onFormSubmit = (data) => {
    const finalData = {
      ...data,
      id: defaultValues.id || null,
    };

    onSubmit(finalData);
    reset();
  };

  const primaryLabel = loading ? "Saving..." : isEdit ? "Update" : "Add";

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Type */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Type
        </label>
        <select
          {...register("type", { required: "Type is required" })}
          className={inputClass(errors.type)}
        >
          <option value="">Select Type</option>
          <option value="chairs">Chairs</option>
          <option value="range">Range</option>
          <option value="banner">Banner</option>
          <option value="notification">Notification</option>
        </select>
        {errors.type && (
          <p className="text-red-600 text-xs mt-1.5">{errors.type.message}</p>
        )}
      </div>

      {/* Days */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Days
        </label>
        <input
          type="number"
          {...register("days", {
            required: "Days is required",
            min: { value: 1, message: "Days must be at least 1" },
            setValueAs: (v) => (v === "" ? null : parseInt(v, 10)),
          })}
          placeholder="e.g. 30"
          className={inputClass(errors.days)}
        />
        {errors.days && (
          <p className="text-red-600 text-xs mt-1.5">{errors.days.message}</p>
        )}
      </div>

      {/* Price */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Price
        </label>
        <input
          type="number"
          {...register("price", {
            required: "Price is required",
            min: { value: 1, message: "Price must be at least 1" },
            setValueAs: (v) => (v === "" ? null : parseInt(v, 10)),
          })}
          placeholder="e.g. 499"
          className={inputClass(errors.price)}
        />
        {errors.price && (
          <p className="text-red-600 text-xs mt-1.5">{errors.price.message}</p>
        )}
      </div>

      {/* Buttons */}
      <div className="md:col-span-2 flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 h-12 rounded-xl text-[14px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition-all duration-200 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2.5 h-12 rounded-xl text-[14px] font-semibold text-white bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-purple-dark)] shadow-sm hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:brightness-100"
        >
          {primaryLabel}
        </button>
      </div>
    </form>
  );
};

export default SubscriptionForm;
