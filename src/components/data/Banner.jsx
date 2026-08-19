// src/components/data/Banner.jsx
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import BannerTable from "../table/BannerTable";
import BannerForm from "../form/BannerForm";
import Drawer from "../common/Drawer";
import { toast } from "react-hot-toast";
import {
  getActiveBannerList,
  addBanner,
  updateBanner,
  deleteBanner,
} from "../../redux/slices/bannerSlice";

const FORM_ID = "banner-drawer-form";

const buildBannerFormData = (data) => {
  const fd = new FormData();
  (data.image || []).forEach((file) => fd.append("image", file));
  if (data.type) fd.append("type", data.type);
  if (data.appType) fd.append("appType", data.appType);
  fd.append("issub", data.issub ? "true" : "false");
  return fd;
};

const Banner = ({ title = "Banner" }) => {
  const dispatch = useDispatch();
  const { allActiveBanners = [], loading } = useSelector(
    (state) => state.allBanners || {},
  );

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    dispatch(getActiveBannerList());
  }, [dispatch]);

  const isEdit = Boolean(formData?.id);

  const handleFormSubmit = async (data) => {
    setSubmitting(true);
    const formDataToSend = buildBannerFormData(data);
    if (isEdit) formDataToSend.append("id", formData.id);

    const res = isEdit
      ? await dispatch(updateBanner(formDataToSend))
      : await dispatch(addBanner(formDataToSend));
    setSubmitting(false);

    const success = isEdit
      ? updateBanner.fulfilled.match(res)
      : addBanner.fulfilled.match(res);

    if (success) {
      toast.success(isEdit ? "Banner updated" : "Banner added");
      setShowForm(false);
      dispatch(getActiveBannerList());
    } else {
      toast.error(res.payload || "Error");
    }
  };

  const handleDelete = async (id) => {
    const res = await dispatch(deleteBanner(id));
    if (deleteBanner.fulfilled.match(res)) {
      toast.success("Banner deleted");
      dispatch(getActiveBannerList());
    } else {
      toast.error(res.payload || "Error");
    }
  };

  const handleEdit = (record) => {
    setFormData({
      id: record.id,
      type: record.type || "",
      appType: record.place || "",
      issub: record.issub === "yes" || record.issub === true,
      image: record.image ? [record.image] : [],
    });
    setShowForm(true);
  };

  const handleAddNew = () => {
    setFormData(null);
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
            Manage the promotional banners shown to customers.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddNew}
          className="inline-flex items-center justify-center px-4 py-2.5 h-12 rounded-xl text-[14px] font-semibold text-white bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-purple-dark)] shadow-sm hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap"
        >
          Add Banner
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Loading banners…
          </div>
        ) : (
          <BannerTable
            data={allActiveBanners}
            title={title}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* ADD / EDIT BANNER DRAWER — same right-side drawer pattern as Add Product */}
      <Drawer
        open={showForm}
        onClose={() => setShowForm(false)}
        title={isEdit ? "Edit Banner" : "Add Banner"}
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
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Add banner"}
            </button>
          </>
        }
      >
        <BannerForm
          formId={FORM_ID}
          defaultValues={formData || {}}
          onSubmit={handleFormSubmit}
        />
      </Drawer>
    </div>
  );
};

export default Banner;
