import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllTaxes,
  addTax,
  updateTax,
  deleteTax,
} from "../../redux/slices/taxSlice";
import TaxForm from "../form/TaxForm";
import TaxTable from "../table/TaxTable";
import Drawer from "../common/Drawer";
import { toast } from "react-hot-toast";
import { formatDate } from "../../utils/formatDate";

const FORM_ID = "tax-drawer-form";

const Tax = () => {
  const dispatch = useDispatch();
  const { taxes = [], loading } = useSelector((state) => state.taxes);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: "", percent: "" });

  useEffect(() => {
    dispatch(getAllTaxes());
  }, [dispatch]);

  const isEdit = Boolean(formData.id);

  /* ADD */
  const handleAddData = async ({ data }) => {
    setSubmitting(true);
    const res = await dispatch(addTax(data));
    setSubmitting(false);

    if (addTax.fulfilled.match(res)) {
      toast.success("Tax added");
      setShowForm(false);
    } else {
      toast.error(res.payload || "Error");
    }
  };

  /* UPDATE */
  const handleUpdateData = async ({ id, data }) => {
    setSubmitting(true);
    const res = await dispatch(updateTax({ id, data }));
    setSubmitting(false);

    if (updateTax.fulfilled.match(res)) {
      toast.success("Tax updated");
      setShowForm(false);
    } else {
      toast.error(res.payload || "Error");
    }
  };

  /* DELETE */
  const handleDelete = async (id) => {
    const res = await dispatch(deleteTax(id));

    if (deleteTax.fulfilled.match(res)) {
      toast.success("Tax deleted");
    } else {
      toast.error(res.payload || "Error");
    }
  };

  /* EDIT */
  const handleEdit = (item) => {
    setFormData({ id: item.id, name: item.name, percent: item.percent });
    setShowForm(true);
  };

  /* ADD NEW */
  const handleAddNew = () => {
    setFormData({ id: null, name: "", percent: "" });
    setShowForm(true);
  };

  const formattedData = taxes.map((item) => ({
    id: item.id,
    name: item.name,
    percent: item.percent,
    createdAt: formatDate(item.createdAt),
  }));

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] lg:text-[34px] font-bold text-gray-900 tracking-[-0.02em] leading-[1.2]">
            Tax
          </h2>
          <p className="text-[15px] font-medium text-gray-500 mt-1.5 leading-[1.6]">
            Manage the tax rates applied to orders.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddNew}
          className="inline-flex items-center justify-center px-4 py-2.5 h-12 rounded-xl text-[14px] font-semibold text-white bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-purple-dark)] shadow-sm hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap"
        >
          Add Tax
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Loading taxes…
          </div>
        ) : (
          <TaxTable
            data={formattedData}
            title="Tax"
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* ADD / EDIT TAX DRAWER — same right-side drawer pattern as Add Product */}
      <Drawer
        open={showForm}
        onClose={() => setShowForm(false)}
        title={isEdit ? "Edit Tax" : "Add Tax"}
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
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Add tax"}
            </button>
          </>
        }
      >
        <TaxForm
          formId={FORM_ID}
          defaultValues={formData}
          onSubmit={isEdit ? handleUpdateData : handleAddData}
        />
      </Drawer>
    </div>
  );
};

export default Tax;
