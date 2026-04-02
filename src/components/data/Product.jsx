// src/components/data/Product.jsx
import { useEffect, useState } from "react";
import ProductTable from "../table/ProductTable";
import ProductForm from "../form/ProductForm";
import { toast } from "react-hot-toast";

const Product = ({ title }) => {
  const [data, setData] = useState([
    {
      id: 1,
      categoryName: "Skin Care",
      productName: "Hydrating Face Serum",
      productImage: "face-serum.jpg",
      createdAt: "Dec 10, 2025, 10:15 AM",
      updatedAt: "Dec 15, 2025, 03:20 PM",
      status: "active",
    },
    {
      id: 2,
      categoryName: "Hair Care",
      productName: "Argan Oil Shampoo",
      productImage: "argan-shampoo.jpg",
      createdAt: "Dec 09, 2025, 09:00 AM",
      updatedAt: "Dec 14, 2025, 01:05 PM",
      status: "active",
    },
    {
      id: 3,
      categoryName: "Makeup",
      productName: "Matte Liquid Lipstick",
      productImage: "liquid-lipstick.jpg",
      createdAt: "Dec 11, 2025, 08:30 AM",
      updatedAt: "Dec 16, 2025, 11:45 AM",
      status: "inactive",
    },
  ]);

  const [activeTab, setActiveTab] = useState("table"); // "table" | "form"
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    id: null,
    categoryName: "",
    productName: "",
    productImage: null,
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleDelete = (id) => {
    const toastId = "delete-product";
    setData((prev) => prev.filter((item) => item.id !== id));
    toast.success("Product deleted!", { id: toastId });
  };

  const handleEdit = (item) => {
    setFormData({
      id: item.id,
      categoryName: item.categoryName,
      productName: item.productName,
      productImage: null,
    });
    setActiveTab("form");
  };

  const handleAddNewClick = () => {
    setFormData({
      id: null,
      categoryName: "",
      productName: "",
      productImage: null,
    });
    setActiveTab("form");
  };

  const handleFormSubmit = (finalData) => {
    const toastId = "save-product";

    if (finalData.id) {
      setData((prev) =>
        prev.map((p) =>
          p.id === finalData.id
            ? {
                ...p,
                categoryName: finalData.categoryName,
                productName: finalData.productName,
                updatedAt: new Date().toLocaleString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }),
              }
            : p
        )
      );
      toast.success("Product updated!", { id: toastId });
    } else {
      const now = new Date().toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      const newProduct = {
        id: Date.now(),
        categoryName: finalData.categoryName,
        productName: finalData.productName,
        productImage: finalData.productImage?.name || "demo.jpg",
        createdAt: now,
        updatedAt: now,
        status: "active",
      };
      setData((prev) => [newProduct, ...prev]);
      toast.success("Product added!", { id: toastId });
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
        Loading Products...
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
            Product List
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
            {formData.id ? "Edit Product" : "Add Product"}
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
                  Add New Product
                </button>
              </div>
              <ProductTable
                data={data}
                title={title}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          ) : (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {formData.id ? "Edit Product" : "Add New Product"}
              </h3>
              <ProductForm
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

export default Product;
