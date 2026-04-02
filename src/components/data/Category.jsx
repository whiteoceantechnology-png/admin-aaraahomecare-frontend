import { useEffect, useState } from "react";
import CategoryTable from "../table/CategoryTable";
import CategoryForm from "../form/CategoryForm";
import TaxForm from "../form/TaxForm";
import { toast } from "react-hot-toast";

import { useDispatch, useSelector } from "react-redux";
import {
  getAllCategoryList,
  addCategory,
  updateCategory,
  deleteCategory,
} from "../../redux/slices/categorySlice";

const Category = ({ title }) => {
  const dispatch = useDispatch();

  const { allCategoryList, loading } = useSelector(
    (state) => state.allCategory,
  );

  const [formData, setFormData] = useState({
    id: null,
    name: "",
    image: null,
    status: "active",
  });

  const [taxData, setTaxData] = useState([]);
  const [taxFormData, setTaxFormData] = useState({
    id: null,
    taxName: "",
    taxPercentage: 0,
  });

  const [activeTab, setActiveTab] = useState("table");

  /* ================= LOAD ================= */
  useEffect(() => {
    dispatch(getAllCategoryList());
  }, [dispatch]);

  /* ================= HELPERS ================= */

  const generateSlug = (name) => name.toLowerCase().replace(/\s+/g, "-");

  /* ================= CATEGORY ================= */

  const handleAddData = async (newData) => {
    const payload = {
      name: newData.name,
      slug: generateSlug(newData.name),
      parentId: null,
    };

    const result = await dispatch(addCategory(payload));

    if (addCategory.fulfilled.match(result)) {
      toast.success("Category added!");
      setActiveTab("table");
    } else {
      toast.error(result.payload);
    }
  };

  const handleUpdateData = async (updatedData) => {
    const payload = {
      name: updatedData.name,
      slug: generateSlug(updatedData.name),
      isActive: updatedData.status === "active",
    };

    const result = await dispatch(
      updateCategory({ id: updatedData.id, data: payload }),
    );

    if (updateCategory.fulfilled.match(result)) {
      toast.success("Updated!");
      setActiveTab("table");
    } else {
      toast.error(result.payload);
    }
  };

  const handleDeleteData = async (id) => {
    const result = await dispatch(deleteCategory(id));

    if (deleteCategory.fulfilled.match(result)) {
      toast.success("Deleted!");
    } else {
      toast.error(result.payload);
    }
  };

  const handleEditClick = (record) => {
    setFormData({
      id: record.id,
      name: record.name,
      status: record.status,
    });
    setActiveTab("form");
  };

  const handleAddNewClick = () => {
    setFormData({
      id: null,
      name: "",
      status: "active",
    });
    setActiveTab("form");
  };

  /* ================= TAX (LOCAL) ================= */

  const handleAddTax = (newTax) => {
    setTaxData((prev) => [{ id: Date.now(), ...newTax }, ...prev]);
    toast.success("Tax added!");
  };

  const handleDeleteTax = (id) => {
    setTaxData((prev) => prev.filter((item) => item.id !== id));
  };

  const handleEditTaxClick = (record) => {
    setTaxFormData(record);
    setActiveTab("tax");
  };

  /* ================= FORMAT DATA ================= */

  const formattedData = allCategoryList.map((item) => ({
    id: item.id,
    name: item.name,
    image: item.categoryImage,
    createdAt: new Date(item.createdAt).toLocaleString(),
    updatedAt: new Date(item.updatedAt).toLocaleString(),
    status: item.isActive ? "active" : "inactive",
  }));

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div className="flex justify-center py-10 text-gray-500">
        Loading Category...
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: "table", label: "Categories" },
          { id: "form", label: "Add Category" },
          { id: "tax", label: "Add Tax" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        {/* FORM */}
        {activeTab === "form" && (
          <div className="p-6">
            <CategoryForm
              defaultValues={formData}
              onSubmit={formData.id ? handleUpdateData : handleAddData}
              onCancel={() => setActiveTab("table")}
            />
          </div>
        )}

        {/* TAX */}
        {activeTab === "tax" && (
          <div className="p-6">
            <TaxForm
              defaultValues={taxFormData}
              onSubmit={handleAddTax}
              onCancel={() => setActiveTab("table")}
            />

            <table className="mt-4 w-full text-sm border">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>%</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {taxData.map((t) => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{t.taxName}</td>
                    <td>{t.taxPercentage}</td>
                    <td>
                      <button onClick={() => handleEditTaxClick(t)}>
                        Edit
                      </button>
                      <button onClick={() => handleDeleteTax(t.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TABLE */}
        {activeTab === "table" && (
          <>
            <div className="p-4 border-b">
              <button
                className="px-4 py-2 bg-black text-white rounded"
                onClick={handleAddNewClick}
              >
                Add New Category
              </button>
            </div>

            <CategoryTable
              data={formattedData} // ✅ API DATA
              onEdit={handleEditClick}
              onDelete={handleDeleteData}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Category;
