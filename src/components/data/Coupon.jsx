import { useEffect, useState } from "react";
import CouponTable from "../table/CouponTable";
import CouponForm from "../form/CouponForm";
import Drawer from "../common/Drawer";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  getAllCouponsList,
  addCoupon,
  updateCoupon,
  deleteCoupon,
} from "../../redux/slices/couponSlice";

const FORM_ID = "coupon-drawer-form";

const Coupon = ({ title = "Coupon" }) => {
  const dispatch = useDispatch();

  const allCouponsList = useSelector(
    (state) => state.allCoupons.allCouponsList,
  );
  const loading = useSelector((state) => state.allCoupons.loading);
  const error = useSelector((state) => state.allCoupons.error);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    code: "",
    description: "",
    usage_limit: null,
    discount_type: "",
    discount_value: null,
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    dispatch(getAllCouponsList());
  }, [dispatch]);

  const isEdit = Boolean(formData.id);

  const handleFormSubmit = async (finalData) => {
    setSubmitting(true);
    const res = isEdit
      ? await dispatch(updateCoupon(finalData))
      : await dispatch(addCoupon(finalData));
    setSubmitting(false);

    const success = isEdit
      ? updateCoupon.fulfilled.match(res)
      : addCoupon.fulfilled.match(res);

    if (success) {
      toast.success(isEdit ? "Coupon updated" : "Coupon added");
      await dispatch(getAllCouponsList());
      setShowForm(false);
    } else {
      toast.error(res.payload || "Error");
    }
  };

  const handleDelete = async (id) => {
    const res = await dispatch(deleteCoupon(id));
    if (deleteCoupon.fulfilled.match(res)) {
      toast.success("Coupon deleted");
      dispatch(getAllCouponsList());
    } else {
      toast.error(res.payload || "Error");
    }
  };

  const handleEditClick = (record) => {
    setFormData({
      id: record.id,
      code: record.code,
      description: record.description,
      usage_limit: record.usage_limit,
      discount_type: record.discount_type,
      discount_value: record.discount_value,
      start_date: record.start_date,
      end_date: record.end_date,
    });
    setShowForm(true);
  };

  const handleAddNewClick = () => {
    setFormData({
      id: null,
      code: "",
      description: "",
      usage_limit: null,
      discount_type: "",
      discount_value: null,
      start_date: "",
      end_date: "",
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] lg:text-[34px] font-bold text-gray-900 tracking-[-0.02em] leading-[1.2]">
            {title}
          </h2>
          <p className="text-[15px] font-medium text-gray-500 mt-1.5 leading-[1.6]">
            Manage discount coupons for your store.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddNewClick}
          className="inline-flex items-center justify-center px-4 py-2.5 h-12 rounded-xl text-[14px] font-semibold text-white bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-purple-dark)] shadow-sm hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap"
        >
          Add Coupon
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] overflow-hidden">
        {error ? (
          <div className="py-16 text-center text-sm text-red-500">
            Failed to load coupons: {error}
          </div>
        ) : loading ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Loading coupons…
          </div>
        ) : (
          <CouponTable
            data={allCouponsList || []}
            title={title}
            onEdit={handleEditClick}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* ADD / EDIT COUPON DRAWER — same right-side drawer pattern as Add Product */}
      <Drawer
        open={showForm}
        onClose={() => setShowForm(false)}
        title={isEdit ? "Edit Coupon" : "Add Coupon"}
        width="max-w-[620px]"
        footer={
          <>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-lg text-[13px] font-semibold text-[var(--mk-ink-700)] border border-[var(--mk-line)] bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              form={FORM_ID}
              disabled={submitting}
              className="px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Add coupon"}
            </button>
          </>
        }
      >
        <CouponForm
          formId={FORM_ID}
          defaultValues={formData}
          onSubmit={handleFormSubmit}
        />
      </Drawer>
    </div>
  );
};

export default Coupon;
