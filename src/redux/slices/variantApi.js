import api from "../../utils/api";

export const fetchVariants = () => api.get("/admin/variants");

export const createVariant = (payload) => api.post("/admin/variants", payload);

export const editVariant = (id, data) => api.put(`/admin/variants/${id}`, data);

export const removeVariant = (id) => api.delete(`/admin/variants/${id}`);

// Master Data bulk endpoints (confirmed against the real Swagger spec).
export const fetchVariantsTemplate = () =>
  api.get("/admin/variants/template", { responseType: "blob" });

export const importVariantsFile = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/admin/variants/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const fetchVariantsExport = () =>
  api.get("/admin/variants/export", { responseType: "blob" });
