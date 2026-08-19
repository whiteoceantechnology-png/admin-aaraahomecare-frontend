// Tax add/edit fields — rendered inside the shared right-side Drawer (see
// Tax.jsx), matching the Field/input styling used by ProductDetailDrawer.
// The submit button lives in the Drawer's fixed footer (targets this form
// via `form={formId}`), so this component only renders the field set.
import { useEffect } from "react";
import { useForm } from "react-hook-form";

const fldClass = (hasError) =>
  `h-10 w-full px-3 rounded-lg border text-[14px] font-medium text-[var(--mk-ink-900)] placeholder:text-[var(--mk-ink-400)] bg-white outline-none transition-colors ${
    hasError
      ? "border-[var(--mk-dgr)] focus:ring-2 focus:ring-[var(--mk-dgr)]/15"
      : "border-[var(--mk-line)] focus:ring-2 focus:ring-[var(--mk-primary-ring)] focus:border-[var(--mk-primary)]"
  }`;

const Field = ({ label, error, children }) => (
  <div className="flex flex-col gap-1.5 mb-3.5">
    <label className="text-[12.5px] font-medium text-[var(--mk-ink-700)]">{label}</label>
    {children}
    {error && <span className="text-[11.5px] font-medium text-[var(--mk-dgr)]">{error}</span>}
  </div>
);

const TaxForm = ({ formId, onSubmit, defaultValues = {} }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      name: defaultValues.name || "",
      percent: defaultValues.percent ?? "",
    },
  });

  useEffect(() => {
    reset({
      name: defaultValues.name || "",
      percent: defaultValues.percent ?? "",
    });
  }, [defaultValues, reset]);

  const onFormSubmit = (data) => {
    onSubmit({
      id: defaultValues.id || null,
      data: { name: data.name, percent: Number(data.percent) },
    });
  };

  return (
    <form id={formId} onSubmit={handleSubmit(onFormSubmit)}>
      <Field label="Tax Name" error={errors.name?.message}>
        <input
          type="text"
          {...register("name", {
            required: "Tax name is required",
            minLength: { value: 2, message: "Tax name must be at least 2 characters" },
          })}
          placeholder="e.g. GST"
          className={fldClass(errors.name)}
        />
      </Field>

      <Field label="Tax Percentage" error={errors.percent?.message}>
        <div className="relative">
          <input
            type="number"
            step="0.01"
            {...register("percent", {
              required: "Tax percentage is required",
              min: { value: 0, message: "Must be 0 or greater" },
              max: { value: 100, message: "Must be 100 or less" },
            })}
            placeholder="e.g. 18"
            className={`${fldClass(errors.percent)} pr-9`}
          />
          <span className="absolute inset-y-0 right-3 flex items-center text-[13px] font-medium text-[var(--mk-ink-400)] pointer-events-none">
            %
          </span>
        </div>
      </Field>
    </form>
  );
};

export default TaxForm;
