import api from "../../utils/api";

export const fetchTaxes = () => api.get("/taxes");

export const createTax = (payload) => api.post("/taxes", payload);

export const editTax = (id, data) => api.put(`/taxes/${id}`, data);

export const removeTax = (id) => api.delete(`/taxes/${id}`);
