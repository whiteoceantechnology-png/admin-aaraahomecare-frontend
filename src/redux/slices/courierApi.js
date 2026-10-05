import api from "../../utils/api";

// Courier vendors — GET/POST/PUT /admin/logistics/couriers.
//
// Uses the shared axios instance, which attaches Authorization: Bearer <token>
// in its request interceptor; no call here passes a token itself.
export const fetchCouriers = (params = {}) =>
  api.get("/admin/logistics/couriers", { params });

export const fetchCourierById = (id) =>
  api.get(`/admin/logistics/couriers/${id}`);

export const createCourier = (payload) =>
  api.post("/admin/logistics/couriers", payload);

export const editCourier = (id, payload) =>
  api.put(`/admin/logistics/couriers/${id}`, payload);
