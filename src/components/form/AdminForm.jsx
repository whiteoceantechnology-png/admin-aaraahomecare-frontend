import { useForm } from "react-hook-form";

const inputClass = (hasError) =>
  `w-full px-3.5 py-2.5 rounded-lg border text-[15px] font-medium text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 ${
    hasError
      ? "border-red-300 focus:ring-red-200 focus:border-red-400"
      : "border-gray-200 focus:ring-[var(--brand-purple)]/25 focus:border-[var(--brand-purple)]"
  }`;

const AdminForm = ({ onSubmit, onCancel, defaultValues = {}, loading = false }) => {
  const isEditMode = Boolean(defaultValues?.id);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      username: defaultValues.username || "",
      email: defaultValues.email || "",
      password: "",
      phone: defaultValues.phone || "",
    },
  });

  const onFormSubmit = (data) => {
    const trimmedData = {
      username: data.username.trim(),
      email: data.email.trim(),
      password: data.password,
      phone: data.phone.trim(),
      id: defaultValues.id || null,
    };

    onSubmit(trimmedData);
    reset();
  };

  const primaryLabel = loading ? "Saving..." : isEditMode ? "Update" : "Add";

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Username */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Username
        </label>
        <input
          type="text"
          {...register("username", {
            required: "Username is required",
            validate: (value) =>
              value.trim() !== "" || "Username cannot be only spaces",
          })}
          placeholder="Enter username"
          className={inputClass(errors.username)}
        />
        {errors.username && (
          <p className="text-red-600 text-xs mt-1.5">{errors.username.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^[^@]+@/,
              message: "Enter a valid email address",
            },
          })}
          placeholder="Enter email address"
          className={inputClass(errors.email)}
        />
        {errors.email && (
          <p className="text-red-600 text-xs mt-1.5">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Password{" "}
          {isEditMode && (
            <span className="text-gray-400 font-normal">
              (leave blank to keep current)
            </span>
          )}
        </label>
        <input
          type="password"
          {...register("password", {
            required: !isEditMode && "Password is required",
            validate: (value) =>
              isEditMode || value.trim().length >= 6 || "Minimum 6 characters",
          })}
          placeholder="Enter password"
          className={inputClass(errors.password)}
        />
        {errors.password && (
          <p className="text-red-600 text-xs mt-1.5">{errors.password.message}</p>
        )}
      </div>

      {/* Phone */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Phone
        </label>
        <input
          type="tel"
          {...register("phone", {
            required: "Phone number is required",
            pattern: {
              value: /^[0-9]{10,15}$/,
              message: "Phone must be 10 to 15 digits",
            },
          })}
          placeholder="Enter phone number"
          className={inputClass(errors.phone)}
        />
        {errors.phone && (
          <p className="text-red-600 text-xs mt-1.5">{errors.phone.message}</p>
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

export default AdminForm;
