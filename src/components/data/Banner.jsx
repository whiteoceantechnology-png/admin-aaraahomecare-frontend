// src/components/data/Banner.jsx
import { useEffect, useState } from "react";
import BannerTable from "../table/BannerTable";
import BannerForm from "../form/BannerForm";
import { toast } from "react-hot-toast";

const Banner = ({ title = "Banner" }) => {
  // Dummy banner list
  const [data, setData] = useState([
    {
      id: 1,
      store_id: 1,
      image: "banner1.jpg",
      type: "home",
      place: "app",
      issub: "no",
    },
    {
      id: 2,
      store_id: 2,
      image: "banner2.jpg",
      type: "offer",
      place: "web",
      issub: "yes",
    },
  ]);

  // Dummy partner options
  const [partnerOptions] = useState([
    { id: 1, label: "Store One" },
    { id: 2, label: "Store Two" },
  ]);

  const [formData, setFormData] = useState({
    id: null,          // store_id
    image: null,       // File or string
    type: "",
    appType: "",       // place
    issub: "no",
  });

  const [activeTab, setActiveTab] = useState("table"); // table | form
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  // ADD (dummy – local state only)
  const handleAddData = async (newData) => {
    const toastId = "addBanner-toast";

    const newId = Date.now();
    const imgs =
      Array.isArray(newData.image) && newData.image.length
        ? newData.image.map((f) => f.name || "banner.jpg")
        : [newData.image?.name || "banner.jpg"];

    const bannersToAdd = imgs.map((img, idx) => ({
      id: newId + idx,
    
      image: img,
      
    }));

    setData((prev) => [...bannersToAdd, ...prev]);
    toast.success("Banner added! (dummy)", { id: toastId });
    clearForm();
    setActiveTab("table");
  };

  // UPDATE (dummy)
  const handleUpdateData = async (updatedData) => {
    const toastId = "updateBanner-toast";

    setData((prev) =>
      prev.map((item) =>
        item.id === updatedData.rowId
          ? {
              ...item,
              store_id: updatedData.id || item.store_id,
              image:
                updatedData.image?.name ||
                item.image ||
                "banner.jpg",
              type: updatedData.type,
              place: updatedData.appType,
              issub: updatedData.issub,
            }
          : item
      )
    );

    toast.success("Banner updated! (dummy)", { id: toastId });
    clearForm();
    setActiveTab("table");
  };

  // DELETE (dummy)
  const handleDeleteData = async (id) => {
    const toastId = "delete-toast";
    setData((prev) => prev.filter((item) => item.id !== id));
    toast.success("Banner deleted! (dummy)", { id: toastId });
  };

  const handleEditClick = (record) => {
    setFormData({
      rowId: record.id,              // internal row id
      id: record.store_id || null,   // store_id
      image: null,                   // new upload only
      type: record.type || "",
      appType: record.place || "",
      issub: record.issub || "no",
    });
    setActiveTab("form");
  };

  const handleAddNewClick = () => {
    clearForm();
    setActiveTab("form");
  };

  const clearForm = () => {
    setFormData({
      rowId: null,
      id: null,
      image: null,
      type: "",
      appType: "",
      issub: "no",
    });
  };

  const handleTabClick = (tab) => setActiveTab(tab);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-500">
        <svg
          className="animate-spin h-5 w-5 text-purple-500 mr-2"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
        Loading Banner...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            style={{ cursor: "pointer" }}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg mr-2 ${
              activeTab === "table"
                ? "bg-white border border-gray-200 border-b-white text-blue-600"
                : "bg-gray-50 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => handleTabClick("table")}
          >
            Banners
          </button>
          <button
            style={{ cursor: "pointer" }}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
              activeTab === "form"
                ? "bg-white border border-gray-200 border-b-white text-blue-600"
                : "bg-gray-50 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => handleTabClick("form")}
          >
            {formData.rowId ? "Edit Banner" : "Add New Banner"}
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {activeTab === "form" ? (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {formData.rowId ? "Edit Banner" : "Add New Banner"}
              </h3>
              <BannerForm
                defaultValues={formData}
                partnerOptions={partnerOptions}
                onSubmit={formData.rowId ? handleUpdateData : handleAddData}
                onCancel={() => {
                  clearForm();
                  setActiveTab("table");
                }}
              />
            </div>
          ) : (
            <div>
              <div className="p-4 border-b border-gray-100">
                <button
                  style={{ cursor: "pointer" }}
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-black"
                  onClick={handleAddNewClick}
                >
                  Add New Banner
                </button>
              </div>
              <BannerTable
                data={data}
                title={title}
                onEdit={handleEditClick}
                onDelete={handleDeleteData}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Banner;
