import api from "../../utils/api";

export const fetchPaymentsOverview = (params = {}) => api.get("/admin/payments/overview", { params });

export const fetchTransactions = (params = {}) => api.get("/admin/payments/transactions", { params });

export const fetchTransactionDetail = (id) => api.get(`/admin/payments/transactions/${id}`);

export const fetchRefunds = (params = {}) => api.get("/admin/payments/refunds", { params });

export const createRefund = (data) => api.post("/admin/payments/refunds", data);

export const fetchSettlements = (params = {}) => api.get("/admin/payments/settlements", { params });

export const fetchSettlementDetail = (id) => api.get(`/admin/payments/settlements/${id}`);

export const fetchCodCycles = (params = {}) => api.get("/admin/payments/cod", { params });

export const fetchPaymentsHealth = () => api.get("/admin/payments/health");

export const reconcileTransaction = (data) => api.post("/admin/payments/reconcile", data);

export const createPaymentLink = (data) => api.post("/admin/payments/payment-links", data);

export const fetchPaymentLinks = (params = {}) => api.get("/admin/payments/payment-links", { params });
