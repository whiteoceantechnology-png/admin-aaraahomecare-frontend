import { useForm } from "react-hook-form";
import { useEffect } from "react";

const inputClass = (hasError) =>
  `w-full px-3.5 py-2.5 rounded-lg border text-[15px] font-medium text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 ${
    hasError
      ? "border-red-300 focus:ring-red-200 focus:border-red-400"
      : "border-gray-200 focus:ring-[var(--brand-purple)]/25 focus:border-[var(--brand-purple)]"
  }`;

const NotificationForm = ({
  onSubmit,
  onCancel,
  defaultValues = {},
  partnerOptions = [],
  loading = false,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setValue,
    resetField,
  } = useForm({
    defaultValues: {
      notification_type: defaultValues.notification_type || "",
      sent_to: defaultValues.sent_to || "",
      title: defaultValues.title || "",
      description: defaultValues.description || "",
    },
  });

  const watchType = watch("notification_type");

  useEffect(() => {
    if (watchType === "subscription") {
      setValue("sent_to", "user");
    } else {
      resetField("sent_to");
    }
  }, [watchType, setValue, resetField]);

  const sentToOptions =
    watchType === "subscription"
      ? [{ value: "user", label: "User" }]
      : [
          { value: "all", label: "All" },
          { value: "user", label: "User" },
          { value: "store", label: "Partner" },
        ];

  const onFormSubmit = (data) => {
    onSubmit(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Notification Type */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Notification Type
        </label>
        <select
          {...register("notification_type", {
            required: "Notification type is required",
          })}
          className={inputClass(errors.notification_type)}
        >
          <option value="">Select Notification Type</option>
          <option value="general">General</option>
          <option value="subscription">Subscription</option>
        </select>
        {errors.notification_type && (
          <p className="text-red-600 text-xs mt-1.5">
            {errors.notification_type.message}
          </p>
        )}
      </div>

      {/* Partner (subscription only) */}
      {watchType === "subscription" && (
        <div className="flex flex-col">
          <label className="text-[14px] font-medium text-gray-700 mb-1">
            Partner
          </label>
          <select
            {...register("store_id", { required: "Partner is required" })}
            className={inputClass(errors.store_id)}
          >
            <option value="">Select a partner</option>
            {partnerOptions.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.label}
              </option>
            ))}
          </select>
          {errors.store_id && (
            <p className="text-red-600 text-xs mt-1.5">
              {errors.store_id.message}
            </p>
          )}
        </div>
      )}

      {/* Sent To */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Sent To
        </label>
        <select
          {...register("sent_to", { required: "Sent to is required" })}
          className={inputClass(errors.sent_to)}
        >
          <option value="">Select Sent To</option>
          {sentToOptions.map((option, index) => (
            <option key={index} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.sent_to && (
          <p className="text-red-600 text-xs mt-1.5">{errors.sent_to.message}</p>
        )}
      </div>

      {/* Title */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          type="text"
          {...register("title", {
            required: "Title is required",
            minLength: { value: 3, message: "Minimum 3 characters" },
          })}
          placeholder="Enter notification title"
          className={inputClass(errors.title)}
        />
        {errors.title && (
          <p className="text-red-600 text-xs mt-1.5">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col md:col-span-2">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          placeholder="Describe the notification in detail"
          {...register("description", {
            required: "Description is required",
            minLength: { value: 10, message: "At least 10 characters" },
          })}
          rows={3}
          className={inputClass(errors.description)}
        />
        {errors.description && (
          <p className="text-red-600 text-xs mt-1.5">
            {errors.description.message}
          </p>
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
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
};

export default NotificationForm;
