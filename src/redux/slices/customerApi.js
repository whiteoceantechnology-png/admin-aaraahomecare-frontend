import api from "../../utils/api";

export const fetchCustomers = () => api.get("/admin/customers");

export const fetchCustomerById = (id) => api.get(`/admin/customers/${id}`);

export const toggleCustomerBlockRequest = (id) =>
  api.patch(`/admin/customers/${id}/toggle-block`);
