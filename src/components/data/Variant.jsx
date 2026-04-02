// src/components/data/Variant.jsx
import { useEffect, useState } from "react";
import VariantTable from "../table/VariantTable";
import VariantForm from "../form/VariantForm";
import { toast } from "react-hot-toast";

const Variant = ({ title }) => {
  // Demo variant list (table data)
  const [variants, setVariants] = useState([
    {
      id: 1,
      productId: "P001",
      productName: "Hydrating Face Serum",
      tax: "GST 18%",
      variantName: "30ml",
      variantImage: ["serum-30ml.jpg"],
      tags: ["hydrating", "dry skin"],
      variantColor: "Transparent",
      actualPrice: 999,
      discountPrice: 799,
      createdAt: "Dec 10, 2025, 10:15 AM",
      updatedAt: "Dec 15, 2025, 03:20 PM",
      status: "active",
    },
    {
      id: 2,
      productId: "P001",
      productName: "Hydrating Face Serum",
      tax: "GST 18%",
      variantName: "50ml",
      variantImage: ["serum-50ml.jpg"],
      tags: ["hydrating", "glow"],
      variantColor: "Transparent",
      actualPrice: 1299,
      discountPrice: 999,
      createdAt: "Dec 11, 2025, 09:30 AM",
      updatedAt: "Dec 16, 2025, 11:45 AM",
      status: "active",
    },
    {
      id: 3,
      productId: "P010",
      productName: "Matte Liquid Lipstick",
      tax: "GST 18%",
      variantName: "Rose Pink",
      variantImage: ["lipstick-rose.jpg"],
      tags: ["matte", "longwear"],
      variantColor: "Rose Pink",
      actualPrice: 699,
      discountPrice: 499,
      createdAt: "Dec 09, 2025, 05:10 PM",
      updatedAt: "Dec 13, 2025, 06:25 PM",
      status: "inactive",
    },
  ]);

  // form state (single variant object)
  const [formData, setFormData] = useState({
    id: null,
    productId: "",
    productName: "",
    tax: "",
    variantName: "",
    variantImage: [], // File[] or string[]
    tags: [],
    variantColor: "",
    actualPrice: 0,
    discountPrice: 0,
  });

  const [activeTab, setActiveTab] = useState("table"); // "table" | "form"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleDelete = (id) => {
    const toastId = "delete-variant";
    setVariants((prev) => prev.filter((item) => item.id !== id));
    toast.success("Variant deleted!", { id: toastId });
  };

  const handleEdit = (item) => {
    setFormData({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      tax: item.tax,
      variantName: item.variantName,
      variantImage: [], // existing images UI-ku மட்டும் use pannalaam
      tags: item.tags || [],
      variantColor: item.variantColor,
      actualPrice: item.actualPrice,
      discountPrice: item.discountPrice,
    });
    setActiveTab("form");
  };

  const handleAddNewClick = () => {
    setFormData({
      id: null,
      productId: "",
      productName: "",
      tax: "",
      variantName: "",
      variantImage: [],
      tags: [],
      variantColor: "",
      actualPrice: 0,
      discountPrice: 0,
    });
    setActiveTab("form");
  };

  const handleFormSubmit = (finalData) => {
    const toastId = "save-variant";

    if (finalData.id) {
      const now = new Date().toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      setVariants((prev) =>
        prev.map((v) =>
          v.id === finalData.id
            ? {
                ...v,
                productId: finalData.productId,
                productName: finalData.productName,
                tax: finalData.tax,
                variantName: finalData.variantName,
                tags: finalData.tags,
                variantColor: finalData.variantColor,
                actualPrice: Number(finalData.actualPrice) || 0,
                discountPrice: Number(finalData.discountPrice) || 0,
                updatedAt: now,
              }
            : v
        )
      );
      toast.success("Variant updated!", { id: toastId });
    } else {
      const now = new Date().toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      const newVariant = {
        id: Date.now(),
        productId: finalData.productId,
        productName: finalData.productName,
        tax: finalData.tax,
        variantName: finalData.variantName,
        variantImage:
          finalData.variantImage?.map((f) => f.name) || ["demo-variant.jpg"],
        tags: finalData.tags,
        variantColor: finalData.variantColor,
        actualPrice: Number(finalData.actualPrice) || 0,
        discountPrice: Number(finalData.discountPrice) || 0,
        createdAt: now,
        updatedAt: now,
        status: "active",
      };

      setVariants((prev) => [newVariant, ...prev]);
      toast.success("Variant added!", { id: toastId });
    }

    setActiveTab("table");
  };

  const handleFormCancel = () => {
    setActiveTab("table");
  };

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
        Loading Variants...
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
            onClick={() => setActiveTab("table")}
          >
            Variant List
          </button>
          <button
            style={{ cursor: "pointer" }}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
              activeTab === "form"
                ? "bg-white border border-gray-200 border-b-white text-blue-600"
                : "bg-gray-50 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
            onClick={handleAddNewClick}
          >
            {formData.id ? "Edit Variant" : "Add Variant"}
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {activeTab === "table" ? (
            <div>
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <button
                  style={{ cursor: "pointer" }}
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                  onClick={handleAddNewClick}
                >
                  Add New Variant
                </button>
              </div>
              <VariantTable
                data={variants}
                title={title}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          ) : (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {formData.id ? "Edit Variant" : "Add New Variant"}
              </h3>
              <VariantForm
                defaultValues={formData}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Variant;
