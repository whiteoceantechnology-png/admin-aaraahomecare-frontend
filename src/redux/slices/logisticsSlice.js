import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchLogisticsOverview,
  fetchReadyToShip,
  fetchShipments,
  fetchShipmentDetail,
  bookShipment,
  fetchShipmentTracking,
  fetchNdrList,
  reattemptNdr,
  updateNdrAddress,
  initiateNdrRto,
  fetchRtoList,
  receiveRto,
  restockRto,
  fetchRates,
  fetchServiceability,
  fetchLogisticsConfig,
  rechargeWallet,
} from "./logisticsApi";

// Logistics list endpoints share the same {[key]: [...], pagination: {page,
// limit, total, totalPages}} envelope (confirmed against the real dev API —
// GET /admin/logistics/ready-to-ship|shipments|ndr|rto) — `key` picks the
// actual array field per endpoint (e.g. "orders", "shipments").
const normalizePaged = (payload, key) => {
  const rows = payload?.[key] || [];
  const pagination = payload?.pagination || {};
  return {
    rows,
    meta: {
      total: pagination.total ?? rows.length,
      page: pagination.page ?? 1,
      limit: pagination.limit ?? rows.length,
      totalPages: pagination.totalPages ?? 1,
    },
  };
};

/* ================= OVERVIEW ================= */
export const getLogisticsOverview = createAsyncThunk(
  "logistics/getOverview",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchLogisticsOverview();
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch logistics overview");
    }
  },
);

/* ================= READY TO SHIP ================= */
export const getReadyToShip = createAsyncThunk(
  "logistics/getReadyToShip",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await fetchReadyToShip(params);
      return normalizePaged(res.data?.data, "orders");
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch ready-to-ship orders");
    }
  },
);

/* ================= SHIPMENTS ================= */
export const getShipments = createAsyncThunk(
  "logistics/getShipments",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await fetchShipments(params);
      return normalizePaged(res.data?.data, "shipments");
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch shipments");
    }
  },
);

export const getShipmentDetail = createAsyncThunk(
  "logistics/getShipmentDetail",
  async (awb, { rejectWithValue }) => {
    try {
      const res = await fetchShipmentDetail(awb);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch shipment");
    }
  },
);

export const addBooking = createAsyncThunk(
  "logistics/bookShipment",
  async ({ orderId, data }, { rejectWithValue }) => {
    try {
      const res = await bookShipment(orderId, data);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to book shipment");
    }
  },
);

export const getShipmentTracking = createAsyncThunk(
  "logistics/getShipmentTracking",
  async (awb, { rejectWithValue }) => {
    try {
      const res = await fetchShipmentTracking(awb);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch tracking");
    }
  },
);

/* ================= NDR ================= */
export const getNdrList = createAsyncThunk(
  "logistics/getNdrList",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await fetchNdrList(params);
      return normalizePaged(res.data?.data, "ndrs");
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch NDR queue");
    }
  },
);

export const reattemptNdrDelivery = createAsyncThunk(
  "logistics/reattemptNdr",
  async ({ awb, data }, { rejectWithValue }) => {
    try {
      const res = await reattemptNdr(awb, data);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to queue reattempt");
    }
  },
);

export const fixNdrAddress = createAsyncThunk(
  "logistics/fixNdrAddress",
  async ({ awb, data }, { rejectWithValue }) => {
    try {
      const res = await updateNdrAddress(awb, data);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update address");
    }
  },
);

export const initiateRtoFromNdr = createAsyncThunk(
  "logistics/initiateNdrRto",
  async ({ awb, data }, { rejectWithValue }) => {
    try {
      const res = await initiateNdrRto(awb, data);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to initiate RTO");
    }
  },
);

/* ================= RTO ================= */
export const getRtoList = createAsyncThunk(
  "logistics/getRtoList",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await fetchRtoList(params);
      return normalizePaged(res.data?.data, "rtos");
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch RTO queue");
    }
  },
);

export const markRtoReceived = createAsyncThunk(
  "logistics/receiveRto",
  async (awb, { rejectWithValue }) => {
    try {
      const res = await receiveRto(awb);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to mark RTO received");
    }
  },
);

export const markRtoRestocked = createAsyncThunk(
  "logistics/restockRto",
  async ({ awb, data }, { rejectWithValue }) => {
    try {
      const res = await restockRto(awb, data);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to restock RTO");
    }
  },
);

/* ================= RATES / SERVICEABILITY / CONFIG ================= */
export const getRates = createAsyncThunk(
  "logistics/getRates",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await fetchRates(params);
      return res.data?.data?.couriers || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch rates");
    }
  },
);

export const checkServiceability = createAsyncThunk(
  "logistics/checkServiceability",
  async (pincode, { rejectWithValue }) => {
    try {
      const res = await fetchServiceability(pincode);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to check serviceability");
    }
  },
);

export const getLogisticsConfig = createAsyncThunk(
  "logistics/getConfig",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchLogisticsConfig();
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch logistics config");
    }
  },
);

export const addWalletRecharge = createAsyncThunk(
  "logistics/rechargeWallet",
  async (data, { rejectWithValue }) => {
    try {
      const res = await rechargeWallet(data);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to recharge wallet");
    }
  },
);

const pagedState = () => ({ items: [], meta: { total: 0, page: 1, limit: 25, totalPages: 1 }, loading: false, error: null });

const initialState = {
  overview: { data: null, loading: false, error: null },
  readyToShip: pagedState(),
  shipments: pagedState(),
  shipmentDetail: { item: null, loading: false, error: null },
  tracking: { data: null, loading: false, error: null },
  booking: false,
  ndr: pagedState(),
  ndrActionLoading: false,
  rto: pagedState(),
  rtoActionLoading: false,
  rates: { items: [], loading: false, error: null },
  serviceability: { data: null, loading: false, error: null },
  config: { data: null, loading: false, error: null },
  recharging: false,
};

const logisticsSlice = createSlice({
  name: "logistics",
  initialState,
  reducers: {
    clearShipmentDetail: (state) => {
      state.shipmentDetail = { item: null, loading: false, error: null };
      state.tracking = { data: null, loading: false, error: null };
    },
    clearServiceability: (state) => {
      state.serviceability = { data: null, loading: false, error: null };
    },
  },
  extraReducers: (builder) => {
    builder
      /* OVERVIEW */
      .addCase(getLogisticsOverview.pending, (state) => {
        state.overview.loading = true;
        state.overview.error = null;
      })
      .addCase(getLogisticsOverview.fulfilled, (state, action) => {
        state.overview.loading = false;
        state.overview.data = action.payload;
      })
      .addCase(getLogisticsOverview.rejected, (state, action) => {
        state.overview.loading = false;
        state.overview.error = action.payload;
      })

      /* READY TO SHIP */
      .addCase(getReadyToShip.pending, (state) => {
        state.readyToShip.loading = true;
        state.readyToShip.error = null;
      })
      .addCase(getReadyToShip.fulfilled, (state, action) => {
        state.readyToShip.loading = false;
        state.readyToShip.items = action.payload.rows;
        state.readyToShip.meta = action.payload.meta;
      })
      .addCase(getReadyToShip.rejected, (state, action) => {
        state.readyToShip.loading = false;
        state.readyToShip.error = action.payload;
      })

      /* SHIPMENTS */
      .addCase(getShipments.pending, (state) => {
        state.shipments.loading = true;
        state.shipments.error = null;
      })
      .addCase(getShipments.fulfilled, (state, action) => {
        state.shipments.loading = false;
        state.shipments.items = action.payload.rows;
        state.shipments.meta = action.payload.meta;
      })
      .addCase(getShipments.rejected, (state, action) => {
        state.shipments.loading = false;
        state.shipments.error = action.payload;
      })
      .addCase(getShipmentDetail.pending, (state) => {
        state.shipmentDetail.loading = true;
        state.shipmentDetail.error = null;
      })
      .addCase(getShipmentDetail.fulfilled, (state, action) => {
        state.shipmentDetail.loading = false;
        state.shipmentDetail.item = action.payload;
      })
      .addCase(getShipmentDetail.rejected, (state, action) => {
        state.shipmentDetail.loading = false;
        state.shipmentDetail.error = action.payload;
      })
      .addCase(getShipmentTracking.pending, (state) => {
        state.tracking.loading = true;
        state.tracking.error = null;
      })
      .addCase(getShipmentTracking.fulfilled, (state, action) => {
        state.tracking.loading = false;
        state.tracking.data = action.payload;
      })
      .addCase(getShipmentTracking.rejected, (state, action) => {
        state.tracking.loading = false;
        state.tracking.error = action.payload;
      })
      .addCase(addBooking.pending, (state) => {
        state.booking = true;
      })
      .addCase(addBooking.fulfilled, (state) => {
        state.booking = false;
      })
      .addCase(addBooking.rejected, (state) => {
        state.booking = false;
      })

      /* NDR */
      .addCase(getNdrList.pending, (state) => {
        state.ndr.loading = true;
        state.ndr.error = null;
      })
      .addCase(getNdrList.fulfilled, (state, action) => {
        state.ndr.loading = false;
        state.ndr.items = action.payload.rows;
        state.ndr.meta = action.payload.meta;
      })
      .addCase(getNdrList.rejected, (state, action) => {
        state.ndr.loading = false;
        state.ndr.error = action.payload;
      })

      /* RTO */
      .addCase(getRtoList.pending, (state) => {
        state.rto.loading = true;
        state.rto.error = null;
      })
      .addCase(getRtoList.fulfilled, (state, action) => {
        state.rto.loading = false;
        state.rto.items = action.payload.rows;
        state.rto.meta = action.payload.meta;
      })
      .addCase(getRtoList.rejected, (state, action) => {
        state.rto.loading = false;
        state.rto.error = action.payload;
      })

      /* RATES / SERVICEABILITY / CONFIG */
      .addCase(getRates.pending, (state) => {
        state.rates.loading = true;
        state.rates.error = null;
      })
      .addCase(getRates.fulfilled, (state, action) => {
        state.rates.loading = false;
        state.rates.items = action.payload;
      })
      .addCase(getRates.rejected, (state, action) => {
        state.rates.loading = false;
        state.rates.error = action.payload;
      })
      .addCase(checkServiceability.pending, (state) => {
        state.serviceability.loading = true;
        state.serviceability.error = null;
      })
      .addCase(checkServiceability.fulfilled, (state, action) => {
        state.serviceability.loading = false;
        state.serviceability.data = action.payload;
      })
      .addCase(checkServiceability.rejected, (state, action) => {
        state.serviceability.loading = false;
        state.serviceability.error = action.payload;
      })
      .addCase(getLogisticsConfig.pending, (state) => {
        state.config.loading = true;
        state.config.error = null;
      })
      .addCase(getLogisticsConfig.fulfilled, (state, action) => {
        state.config.loading = false;
        state.config.data = action.payload;
      })
      .addCase(getLogisticsConfig.rejected, (state, action) => {
        state.config.loading = false;
        state.config.error = action.payload;
      })
      .addCase(addWalletRecharge.pending, (state) => {
        state.recharging = true;
      })
      .addCase(addWalletRecharge.fulfilled, (state, action) => {
        state.recharging = false;
        if (action.payload?.walletBalance != null) state.config.data = { ...state.config.data, walletBalance: action.payload.walletBalance };
      })
      .addCase(addWalletRecharge.rejected, (state) => {
        state.recharging = false;
      })

      /* NDR/RTO WRITE ACTIONS — the caller always refetches the relevant list
         itself on success, so these reducers only track a shared busy flag. */
      .addMatcher(
        (action) => [reattemptNdrDelivery, fixNdrAddress, initiateRtoFromNdr].some((t) => t.pending.match(action)),
        (state) => {
          state.ndrActionLoading = true;
        },
      )
      .addMatcher(
        (action) =>
          [reattemptNdrDelivery, fixNdrAddress, initiateRtoFromNdr].some(
            (t) => t.fulfilled.match(action) || t.rejected.match(action),
          ),
        (state) => {
          state.ndrActionLoading = false;
        },
      )
      .addMatcher(
        (action) => [markRtoReceived, markRtoRestocked].some((t) => t.pending.match(action)),
        (state) => {
          state.rtoActionLoading = true;
        },
      )
      .addMatcher(
        (action) => [markRtoReceived, markRtoRestocked].some((t) => t.fulfilled.match(action) || t.rejected.match(action)),
        (state) => {
          state.rtoActionLoading = false;
        },
      );
  },
});

export const { clearShipmentDetail, clearServiceability } = logisticsSlice.actions;
export default logisticsSlice.reducer;
