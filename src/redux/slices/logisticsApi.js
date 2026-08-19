import api from "../../utils/api";

export const fetchLogisticsOverview = () => api.get("/admin/logistics/overview");

export const fetchReadyToShip = (params = {}) => api.get("/admin/logistics/ready-to-ship", { params });

export const fetchShipments = (params = {}) => api.get("/admin/logistics/shipments", { params });

export const fetchShipmentDetail = (awb) => api.get(`/admin/logistics/shipments/${awb}`);

export const bookShipment = (orderId, data) => api.post(`/admin/logistics/shipments/${orderId}/book`, data);

export const fetchShipmentTracking = (awb) => api.get(`/admin/logistics/shipments/${awb}/tracking`);

export const fetchNdrList = (params = {}) => api.get("/admin/logistics/ndr", { params });

export const reattemptNdr = (awb, data) => api.post(`/admin/logistics/ndr/${awb}/reattempt`, data);

export const updateNdrAddress = (awb, data) => api.post(`/admin/logistics/ndr/${awb}/address`, data);

export const initiateNdrRto = (awb, data) => api.post(`/admin/logistics/ndr/${awb}/rto`, data);

export const fetchRtoList = (params = {}) => api.get("/admin/logistics/rto", { params });

export const receiveRto = (awb) => api.post(`/admin/logistics/rto/${awb}/receive`);

export const restockRto = (awb, data) => api.post(`/admin/logistics/rto/${awb}/restock`, data);

export const fetchRates = (params = {}) => api.get("/admin/logistics/rates", { params });

export const fetchServiceability = (pincode) => api.get(`/admin/logistics/serviceability/${pincode}`);

export const fetchLogisticsConfig = () => api.get("/admin/logistics/config");

export const rechargeWallet = (data) => api.post("/admin/logistics/wallet/recharge", data);
