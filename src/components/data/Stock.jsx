// src/components/data/Stock.jsx
import { useEffect, useState } from "react";
import StockTable from "../table/StockTable";
import { toast } from "react-hot-toast";

const Stock = ({ title = "Stock" }) => {
  const [data, setData] = useState([
    {
      id: 1,
      productName: "Men Shirt",
      variantName: "Blue / L",
      tax: 18,
      availableStock: 120,
      createdAt: "Dec 10, 2025, 10:15 AM",
      updatedAt: "Dec 15, 2025, 03:20 PM",
    },
    {
      id: 2,
      productName: "Women Kurti",
      variantName: "Red / M",
      tax: 12,
      availableStock: 40,
      createdAt: "Dec 09, 2025, 09:00 AM",
      updatedAt: "Dec 14, 2025, 01:05 PM",
    },
    {
      id: 3,
      productName: "Sports Shoe",
      variantName: "Black / 9",
      tax: 15,
      availableStock: 75,
      createdAt: "Dec 11, 2025, 08:30 AM",
      updatedAt: "Dec 16, 2025, 11:45 AM",
    },
  ]);

  const [formData, setFormData] = useState({
    id: null,
    productName: "",
    variantName: "",
    tax: 0,
    availableStock: 0,
  });

  const [activeTab, setActiveTab] = useState("table"); // table | form
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleAddData = (newData) => {
    const toastId = "addstock-toast";

    const now = new Date().toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const stock = {
      id: Date.now(),
      productName: newData.productName,
      variantName: newData.variantName,
      tax: Number(newData.tax) || 0,
      availableStock: Number(newData.availableStock) || 0,
      createdAt: now,
      updatedAt: now,
    };

    setData((prev) => [stock, ...prev]);
    toast.success("Stock added!", { id: toastId });
    clearForm();
    setActiveTab("table");
  };

  const handleUpdateData = (updatedData) => {
    const toastId = "updatestock-toast";

    const now = new Date().toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    setData((prev) =>
      prev.map((item) =>
        item.id === updatedData.id
          ? {
              ...item,
              productName: updatedData.productName,
              variantName: updatedData.variantName,
              tax: Number(updatedData.tax) || item.tax,
              availableStock:
                Number(updatedData.availableStock) || item.availableStock,
              updatedAt: now,
            }
          : item
      )
    );

    toast.success("Stock updated!", { id: toastId });
    clearForm();
    setActiveTab("table");
  };

  const handleDeleteData = (id) => {
    const toastId = "deletestock-toast";
    setData((prev) => prev.filter((item) => item.id !== id));
    toast.success("Stock deleted!", { id: toastId });
  };

  const handleEditClick = (record) => {
    setFormData({
      id: record.id,
      productName: record.productName,
      variantName: record.variantName,
      tax: record.tax,
      availableStock: record.availableStock,
    });
    setActiveTab("form");
  };

  const handleAddNewClick = () => {
    clearForm();
    setActiveTab("form");
  };

  const clearForm = () => {
    setFormData({
      id: null,
      productName: "",
      variantName: "",
      tax: 0,
      availableStock: 0,
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
        Loading Stock...
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
            Stock List
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
            {formData.id ? "Edit Stock" : "Add Stock"}
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {activeTab === "form" ? (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {formData.id ? "Edit Stock" : "Add New Stock"}
              </h3>

              {/* Simple inline form instead of separate component */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  formData.id ? handleUpdateData(formData) : handleAddData(formData);
                }}
                className="space-y-4 max-w-lg"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={formData.productName}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, productName: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variant Name
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={formData.variantName}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, variantName: e.target.value }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Percentage
                    </label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      value={formData.tax}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, tax: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Available Stock
                    </label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      value={formData.availableStock}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          availableStock: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                  >
                    {formData.id ? "Update" : "Save"}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                    onClick={() => {
                      clearForm();
                      setActiveTab("table");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <div className="p-4 border-b border-gray-100">
                <button
                  style={{ cursor: "pointer" }}
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                  onClick={handleAddNewClick}
                >
                  Add New Stock
                </button>
              </div>
              <StockTable
                data={data}
                onEdit={handleEditClick}
                onDelete={handleDeleteData}
                title={title}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Stock;
