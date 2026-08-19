import { useEffect, useState } from "react";
import AdminForm from "../form/AdminForm";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { addAdmin, getAdmin } from "../../redux/slices/adminSlice";
import AdminTable from "../table/Admintable";
import Modal from "../common/Modal";

const Admin = ({ title = "Admin" }) => {
  const dispatch = useDispatch();

  const adminValue = useSelector((state) => state.admin.adminList);
  const loading = useSelector((state) => state.admin.loading);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(getAdmin());
  }, [dispatch]);

  const handleAddData = async (newData) => {
    setSubmitting(true);
    const res = await dispatch(addAdmin(newData));
    setSubmitting(false);

    if (addAdmin.fulfilled.match(res)) {
      toast.success("Admin added");
      dispatch(getAdmin());
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
            Manage admin users with access to this dashboard.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center px-4 py-2.5 h-12 rounded-xl text-[14px] font-semibold text-white bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-purple-dark)] shadow-sm hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap"
        >
          Add Admin
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Loading admins…
          </div>
        ) : (
          <AdminTable data={adminValue || []} title={title} />
        )}
      </div>

      {/* MODAL */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add Admin"
      >
        <AdminForm
          loading={submitting}
          onSubmit={handleAddData}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
};

export default Admin;
