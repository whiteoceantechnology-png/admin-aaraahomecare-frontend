import api from "../../utils/api";

export const fetchInventoryList = (params = {}) => api.get("/admin/inventory", { params });

export const fetchLowStockInventory = (params = {}) => api.get("/admin/inventory/low-stock", { params });

export const fetchInventoryDetail = (id) => api.get(`/admin/inventory/${id}`);

export const updateInventoryStock = (id, stockQuantity) =>
  api.put(`/admin/inventory/${id}/stock`, { stockQuantity });

export const adjustInventoryStock = (id, data) => api.post(`/admin/inventory/${id}/adjust`, data);

export const reserveInventoryStock = (id, data) => api.post(`/admin/inventory/${id}/reserve`, data);

export const releaseInventoryStock = (id, data) => api.post(`/admin/inventory/${id}/release`, data);

export const fetchInventoryHistory = (id, params = {}) => api.get(`/admin/inventory/${id}/history`, { params });

export const bulkUpdateInventory = (updates) => api.post("/admin/inventory/bulk-update", { updates });
