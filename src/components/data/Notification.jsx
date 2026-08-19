import { useEffect, useState } from "react";
import NotificationTable from "../table/NotificationTable";
import NotificationForm from "../form/NotificationForm";
import Modal from "../common/Modal";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  getAllNotificationList,
  addNotification,
} from "../../redux/slices/notificationSlice";
import { getAllPartnersList } from "../../redux/slices/partnersSlice";

const Notification = ({ title = "Notification" }) => {
  const dispatch = useDispatch();

  const allNotificationList = useSelector(
    (state) => state.allNotification.allNotificationList,
  );
  const loading = useSelector((state) => state.allNotification.loading);
  const error = useSelector((state) => state.allNotification.error);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(getAllNotificationList());
    dispatch(getAllPartnersList());
  }, [dispatch]);

  let partnerOptions = useSelector(
    (state) => state.allPartners.allPartnersList,
  );
  const formattedPartnerOptions = Array.isArray(partnerOptions)
    ? partnerOptions
        .filter((partner) => partner.completion_status === "completed")
        .map((partner) => ({ label: partner.name, id: partner.id }))
    : [];

  const handleAddData = async (finaldata) => {
    setSubmitting(true);
    const res = await dispatch(addNotification(finaldata));
    setSubmitting(false);

    if (addNotification.fulfilled.match(res)) {
      toast.success("Notification sent");
      await dispatch(getAllNotificationList());
      setShowForm(false);
    } else {
      toast.error(res.payload || "Error");
    }
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
            Send notifications to your users and partners.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center px-4 py-2.5 h-12 rounded-xl text-[14px] font-semibold text-white bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-purple-dark)] shadow-sm hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap"
        >
          Add Notification
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] overflow-hidden">
        {error ? (
          <div className="py-16 text-center text-sm text-red-500">
            Failed to load notifications: {error}
          </div>
        ) : loading ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Loading notifications…
          </div>
        ) : (
          <NotificationTable data={allNotificationList || []} title={title} />
        )}
      </div>

      {/* MODAL */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add Notification"
        maxWidth="max-w-2xl"
      >
        <NotificationForm
          partnerOptions={formattedPartnerOptions}
          loading={submitting}
          onSubmit={handleAddData}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
};

export default Notification;
