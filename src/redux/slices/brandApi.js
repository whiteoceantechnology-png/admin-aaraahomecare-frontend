import api from "../../utils/api";

export const fetchBrands = () => api.get("/admin/brands");

export const createBrand = (payload) => api.post("/admin/brands", payload);

export const editBrand = (id, data) => api.put(`/admin/brands/${id}`, data);

export const removeBrand = (id) => api.delete(`/admin/brands/${id}`);
