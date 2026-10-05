import api from "../../utils/api";

export const fetchCategories = () => api.get("/admin/categories");

// One category WITH the products that belong to it — the only endpoint in
// this app that exposes the category-to-product relationship. Inventory uses
// it to work out which products a selected category contains.
export const fetchCategoryById = (id) => api.get(`/admin/categories/${id}`);

export const createCategory = (payload) =>
  api.post("/admin/categories", payload, {
    headers: { "Content-Type": "application/json" },
  });

export const editCategory = (id, data) =>
  api.put(`/admin/categories/${id}`, data, {
    headers: { "Content-Type": "application/json" },
  });

export const removeCategory = (id) => api.delete(`/admin/categories/${id}`);

export const importCategoriesFile = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/admin/masterdata/categories/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
