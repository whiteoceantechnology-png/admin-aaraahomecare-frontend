import { useForm, Controller } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";

const inputClass = (hasError) =>
  `w-full px-3.5 py-2.5 rounded-lg border text-[15px] font-medium text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 ${
    hasError
      ? "border-red-300 focus:ring-red-200 focus:border-red-400"
      : "border-gray-200 focus:ring-[var(--brand-purple)]/25 focus:border-[var(--brand-purple)]"
  }`;

const CouponForm = ({ formId, onSubmit, defaultValues = {} }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
  } = useForm({
    defaultValues: {
      code: defaultValues.code || "",
      description: defaultValues.description || "",
      usage_limit: defaultValues.usage_limit ?? null,
      discount_type: defaultValues.discount_type || "",
      discount_value: defaultValues.discount_value ?? null,
      start_date: defaultValues.start_date || "",
      end_date: defaultValues.end_date || "",
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

  return (
    <form id={formId} onSubmit={handleSubmit(onFormSubmit)} className="grid grid-cols-1 gap-5">
      {/* Code */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">Code</label>
        <input
          type="text"
          {...register("code", {
            required: "Code is required",
            minLength: { value: 3, message: "Minimum 3 characters" },
          })}
          placeholder="e.g. SAVE20"
          className={inputClass(errors.code)}
        />
        {errors.code && (
          <p className="text-red-600 text-xs mt-1.5">{errors.code.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          placeholder="Describe the coupon in detail"
          {...register("description", {
            required: "Description is required",
            minLength: { value: 10, message: "At least 10 characters" },
          })}
          rows={2}
          className={inputClass(errors.description)}
        />
        {errors.description && (
          <p className="text-red-600 text-xs mt-1.5">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Usage Limit */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Usage Limit
        </label>
        <input
          type="number"
          {...register("usage_limit", {
            required: "Usage limit is required",
            min: { value: 1, message: "Usage limit must be at least 1" },
            setValueAs: (v) => (v === "" ? null : parseInt(v, 10)),
          })}
          placeholder="e.g. 100"
          className={inputClass(errors.usage_limit)}
        />
        {errors.usage_limit && (
          <p className="text-red-600 text-xs mt-1.5">
            {errors.usage_limit.message}
          </p>
        )}
      </div>

      {/* Discount Type */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Discount Type
        </label>
        <select
          {...register("discount_type", { required: "Discount type is required" })}
          className={inputClass(errors.discount_type)}
        >
          <option value="">Select Discount Type</option>
          <option value="flat">Flat</option>
          <option value="percentage">Percentage</option>
        </select>
        {errors.discount_type && (
          <p className="text-red-600 text-xs mt-1.5">
            {errors.discount_type.message}
          </p>
        )}
      </div>

      {/* Discount Value */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Discount Value
        </label>
        <input
          type="number"
          {...register("discount_value", {
            required: "Discount value is required",
            min: { value: 1, message: "Discount value must be at least 1" },
            setValueAs: (v) => (v === "" ? null : parseInt(v, 10)),
          })}
          placeholder="e.g. 20"
          className={inputClass(errors.discount_value)}
        />
        {errors.discount_value && (
          <p className="text-red-600 text-xs mt-1.5">
            {errors.discount_value.message}
          </p>
        )}
      </div>

      {/* Start Date */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Start Date
        </label>
        <Controller
          control={control}
          name="start_date"
          rules={{ required: "Start date is required" }}
          render={({ field }) => (
            <DatePicker
              selected={field.value ? new Date(field.value) : null}
              onChange={(date) => {
                field.onChange(date ? format(date, "yyyy-MM-dd") : null);
              }}
              placeholderText="Pick start date"
              dateFormat="dd, MMMM, yyyy"
              minDate={new Date()}
              className={inputClass(errors.start_date)}
              calendarClassName="custom-datepicker"
            />
          )}
        />
        {errors.start_date && (
          <p className="text-red-600 text-xs mt-1.5">
            {errors.start_date.message}
          </p>
        )}
      </div>

      {/* End Date */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          End Date
        </label>
        <Controller
          control={control}
          name="end_date"
          rules={{
            required: "End date is required",
            validate: (value) => {
              const start = watch("start_date");
              if (!start || !value) return true;
              const startDate = new Date(start);
              const endDate = new Date(value);
              if (endDate <= startDate) {
                return "End date must be at least 1 day after start date";
              }
              return true;
            },
          }}
          render={({ field }) => (
            <DatePicker
              selected={field.value ? new Date(field.value) : null}
              onChange={(date) => {
                field.onChange(date ? format(date, "yyyy-MM-dd") : null);
              }}
              placeholderText="Pick end date"
              dateFormat="dd, MMMM, yyyy"
              minDate={
                watch("start_date")
                  ? new Date(new Date(watch("start_date")).getTime() + 86400000)
                  : new Date()
              }
              className={inputClass(errors.end_date)}
              calendarClassName="custom-datepicker"
            />
          )}
        />
        {errors.end_date && (
          <p className="text-red-600 text-xs mt-1.5">
            {errors.end_date.message}
          </p>
        )}
      </div>
    </form>
  );
};

export default CouponForm;
