import api from "../../utils/api";

const jsonHeaders = { headers: { "Content-Type": "application/json" } };

// Backend accepts `status` as UPPERCASE (confirmed via provided curl samples:
// query `status=PROCESSING`, body `{"status":"PACKED"}`) while every existing
// piece of frontend logic (orderStatusStages.js, orderNextAction.js,
// OrderStatusPill.jsx, OrderTable tabs) is built around lowercase values.
// Rather than rewrite that logic, status is upper-cased only at this one
// outgoing boundary, and lower-cased back at the incoming boundary in
// orderSlice.js — the rest of the app never has to know the backend's casing.
// `paymentStatus` is NOT converted — the same curl samples show it already
// lowercase both ways (`paymentStatus=pending`, `{"paymentStatus":"paid"}`).
export const toBackendStatus = (status) =>
  status === undefined || status === null ? status : String(status).toUpperCase();

export const fetchOrders = (params = {}) => api.get("/admin/orders", { params });

export const fetchOrderById = (id) => api.get(`/admin/orders/${id}`);

export const fetchOrderEvents = (id) => api.get(`/admin/orders/${id}/events`);

export const editOrder = (id, data) => {
  const payload = data?.status ? { ...data, status: toBackendStatus(data.status) } : data;
  return api.put(`/admin/orders/${id}`, payload, jsonHeaders);
};

export const recordCodPaymentApi = (id, data) =>
  api.post(`/admin/orders/${id}/payments`, data, jsonHeaders);

export const updatePaymentStatusApi = (id, data) =>
  api.patch(`/admin/orders/${id}/payment-status`, data, jsonHeaders);

export const fetchInvoiceHtml = (id) =>
  api.get(`/admin/orders/${id}/invoice`, { params: { format: "html" }, responseType: "text" });

export const fetchPackingSlipHtml = (id) =>
  api.get(`/admin/orders/${id}/packing-slip`, { params: { format: "html" }, responseType: "text" });

export const requestRefundApi = (id, data) =>
  api.post(`/admin/orders/${id}/refund`, data, jsonHeaders);

export const cancelOrderApi = (id, data) =>
  api.post(`/admin/orders/${id}/cancel`, data, jsonHeaders);

export const contactCustomerApi = (id, data) =>
  api.post(`/admin/orders/${id}/contact`, data, jsonHeaders);

export const triggerAutoDeliverApi = (data) =>
  api.post(`/admin/orders/jobs/auto-deliver`, data, jsonHeaders);

export const fetchInventoryPolicy = () => api.get(`/admin/orders/inventory-policy`);
