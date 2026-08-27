import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { getAllCategoryList } from "../../redux/slices/categorySlice";
import { getAllTaxes } from "../../redux/slices/taxSlice";
import { getAllBrands } from "../../redux/slices/brandSlice";
import { uploadImage } from "../../redux/slices/imageSlice";

const inputClass = (hasError) =>
  `w-full px-3.5 py-2.5 rounded-lg border text-[15px] font-medium text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 ${
    hasError
      ? "border-red-300 focus:ring-red-200 focus:border-red-400"
      : "border-gray-200 focus:ring-[var(--brand-purple)]/25 focus:border-[var(--brand-purple)]"
  }`;

const ProductForm = ({ onSubmit, onCancel, defaultValues = {}, loading = false }) => {
  const dispatch = useDispatch();
  const isEdit = Boolean(defaultValues.id);

  const { allCategoryList = [] } = useSelector((state) => state.category);
  const { taxes = [] } = useSelector((state) => state.taxes);
  const { brands = [] } = useSelector((state) => state.brand);
  const { loading: imageLoading } = useSelector((state) => state.image);

  const [imagePath, setImagePath] = useState(defaultValues.productImage || "");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues,
  });

  useEffect(() => {
    dispatch(getAllCategoryList());
    dispatch(getAllTaxes());
    dispatch(getAllBrands());
  }, [dispatch]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const res = await dispatch(uploadImage(file));
    if (uploadImage.fulfilled.match(res)) {
      setImagePath(res.payload.path);
    }
  };

  const onFormSubmit = (data) => {
    const payload = {
      categoryId: Number(data.categoryId),
      brandId: Number(data.brandId),
      name: data.name,
      description: data.description,
      hsnCode: data.hsnCode,
      taxId: Number(data.taxId),
      taxPercent: Number(data.taxPercent),
      actualPrice: Number(data.actualPrice),
      discountPrice: Number(data.discountPrice),
      productImage: imagePath,
    };

    onSubmit(payload);
  };

  const primaryLabel = imageLoading
    ? "Uploading..."
    : loading
      ? "Saving..."
      : isEdit
        ? "Update"
        : "Add";

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* NAME */}
        <div className="flex flex-col">
          <label className="text-[14px] font-medium text-gray-700 mb-1">
            Product Name
          </label>
          <input
            {...register("name", { required: "Product name is required" })}
            placeholder="e.g. Aloe Vera Gel"
            className={inputClass(errors.name)}
          />
          {errors.name && (
            <p className="text-red-600 text-xs mt-1.5">{errors.name.message}</p>
          )}
        </div>

        {/* CATEGORY */}
        <div className="flex flex-col">
          <label className="text-[14px] font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            {...register("categoryId", { required: "Category is required" })}
            className={inputClass(errors.categoryId)}
          >
            <option value="">Select Category</option>
            {allCategoryList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="text-red-600 text-xs mt-1.5">
              {errors.categoryId.message}
            </p>
          )}
        </div>

        {/* BRAND */}
        {/* <div className="flex flex-col">
          <label className="text-[14px] font-medium text-gray-700 mb-1">
            Brand
          </label>
          <select
            {...register("brandId", { required: "Brand is required" })}
            className={inputClass(errors.brandId)}
          >
            <option value="">Select Brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {errors.brandId && (
            <p className="text-red-600 text-xs mt-1.5">
              {errors.brandId.message}
            </p>
          )}
        </div> */}

        {/* TAX */}
        <div className="flex flex-col">
          <label className="text-[14px] font-medium text-gray-700 mb-1">
            Tax
          </label>
          <select
            {...register("taxId")}
            className={inputClass(false)}
            onChange={(e) => {
              const t = taxes.find((x) => x.id == e.target.value);
              if (t) setValue("taxPercent", t.percent);
            }}
          >
            <option value="">Select Tax</option>
            {taxes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* TAX % */}
        <div className="flex flex-col">
          <label className="text-[14px] font-medium text-gray-700 mb-1">
            Tax %
          </label>
          <input
            {...register("taxPercent")}
            readOnly
            className={`${inputClass(false)} bg-gray-50 text-gray-500`}
          />
        </div>

        {/* HSN */}
        <div className="flex flex-col">
          <label className="text-[14px] font-medium text-gray-700 mb-1">
            HSN Code
          </label>
          <input {...register("hsnCode")} className={inputClass(false)} />
        </div>

        {/* ACTUAL PRICE */}
        {/* <div className="flex flex-col">
          <label className="text-[14px] font-medium text-gray-700 mb-1">
            Actual Price
          </label>
          <input
            type="number"
            step="0.01"
            {...register("actualPrice", {
              required: "Actual price is required",
              min: { value: 0, message: "Must be 0 or greater" },
            })}
            className={inputClass(errors.actualPrice)}
          />
          {errors.actualPrice && (
            <p className="text-red-600 text-xs mt-1.5">
              {errors.actualPrice.message}
            </p>
          )}
        </div> */}

        {/* DISCOUNT PRICE */}
        {/* <div className="flex flex-col">
          <label className="text-[14px] font-medium text-gray-700 mb-1">
            Discount Price
          </label>
          <input
            type="number"
            step="0.01"
            {...register("discountPrice", {
              required: "Discount price is required",
              min: { value: 0, message: "Must be 0 or greater" },
            })}
            className={inputClass(errors.discountPrice)}
          />
          {errors.discountPrice && (
            <p className="text-red-600 text-xs mt-1.5">
              {errors.discountPrice.message}
            </p>
          )}
        </div> */}
      </div>

      {/* DESCRIPTION */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          rows={3}
          {...register("description")}
          className={inputClass(false)}
        />
      </div>

      {/* IMAGE */}
      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">
          Product Image
        </label>

        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="w-full text-sm text-gray-500 rounded-lg border border-gray-200 px-3.5 py-2 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-purple)]/25 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[var(--brand-purple)]/10 file:text-[var(--brand-purple)] file:text-sm file:font-medium hover:file:bg-[var(--brand-purple)]/20 file:cursor-pointer"
        />

        {imageLoading && (
          <p className="text-[var(--brand-purple)] text-xs mt-1.5">
            Uploading...
          </p>
        )}

        {imagePath && !imageLoading && (
          <img
            src={`${import.meta.env.VITE_API_BASE_URL}/${imagePath}`}
            alt="preview"
            className="w-24 h-24 mt-3 rounded-xl object-cover border border-gray-200"
          />
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

export default ProductForm;
