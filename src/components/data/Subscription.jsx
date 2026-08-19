import { useEffect, useState } from "react";
import SubscriptionTable from "../table/SubscriptionTable";
import SubscriptionForm from "../form/SubscriptionForm";
import Modal from "../common/Modal";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  getAllSubscriptionsList,
  addSubscription,
  updateSubscription,
} from "../../redux/slices/subscriptionSlice";

const Subscription = ({ title = "Subscription" }) => {
  const dispatch = useDispatch();

  const allSubscriptionsList = useSelector(
    (state) => state.allSubscriptions.allSubscriptionsList,
  );
  const loading = useSelector((state) => state.allSubscriptions.loading);
  const error = useSelector((state) => state.allSubscriptions.error);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    type: "",
    days: null,
    price: null,
  });

  useEffect(() => {
    dispatch(getAllSubscriptionsList());
  }, [dispatch]);

  const isEdit = Boolean(formData.id);

  const handleFormSubmit = async (finalData) => {
    setSubmitting(true);
    const res = isEdit
      ? await dispatch(updateSubscription(finalData))
      : await dispatch(addSubscription(finalData));
    setSubmitting(false);

    const success = isEdit
      ? updateSubscription.fulfilled.match(res)
      : addSubscription.fulfilled.match(res);

    if (success) {
      toast.success(isEdit ? "Subscription updated" : "Subscription added");
      await dispatch(getAllSubscriptionsList());
      setShowForm(false);
    } else {
      toast.error(res.payload || "Error");
    }
  };

  const handleEditClick = (record) => {
    setFormData({
      id: record.id,
      type: record.type,
      days: record.days,
      price: record.price,
    });
    setShowForm(true);
  };

  const handleAddNewClick = () => {
    setFormData({ id: null, type: "", days: null, price: null });
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
            Manage subscription plans for banners, chairs, and other listings.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddNewClick}
          className="inline-flex items-center justify-center px-4 py-2.5 h-12 rounded-xl text-[14px] font-semibold text-white bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-purple-dark)] shadow-sm hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap"
        >
          Add Subscription
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] overflow-hidden">
        {error ? (
          <div className="py-16 text-center text-sm text-red-500">
            Failed to load subscriptions: {error}
          </div>
        ) : loading ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Loading subscriptions…
          </div>
        ) : (
          <SubscriptionTable
            data={allSubscriptionsList || []}
            title={title}
            onEdit={handleEditClick}
          />
        )}
      </div>

      {/* MODAL */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={isEdit ? "Edit Subscription" : "Add Subscription"}
      >
        <SubscriptionForm
          defaultValues={formData}
          loading={submitting}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
};

export default Subscription;
