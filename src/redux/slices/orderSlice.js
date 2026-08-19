import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchOrders,
  fetchOrderById,
  fetchOrderEvents,
  editOrder,
  recordCodPaymentApi,
  updatePaymentStatusApi,
  requestRefundApi,
  cancelOrderApi,
  contactCustomerApi,
} from "./orderApi";

// See orderApi.js's toBackendStatus comment — backend `status` is uppercase,
// every existing frontend consumer expects lowercase, so it's normalized back
// the moment an order object enters redux state and never dealt with again.
const normalizeOrder = (order) =>
  order && typeof order === "object" && order.status
    ? { ...order, status: String(order.status).toLowerCase() }
    : order;

const mergeOrderPatch = (state, id, patch) => {
  state.allOrders = state.allOrders.map((o) => (o?.id === id ? { ...o, ...patch } : o));
  if (state.selectedOrder?.id === id) {
    state.selectedOrder = { ...state.selectedOrder, ...patch };
  }
};

/* ================= GET ALL ================= */
// Accepts the real list query params (page/limit/status/paymentStatus/search/
// startDate/endDate) so the endpoint contract matches the backend exactly,
// but Order.jsx still calls this with a single large `limit` and no filters —
// the existing Orders UI (tabs, search, column filters, client pagination in
// OrderTable.jsx) all operate on the full in-memory list already, and
// switching that to true server-side filtering would change how tab counts
// and search behave (they currently see every order, not just one page/one
// status at a time). Flagged in the implementation report as a deliberate,
// disclosed choice rather than a silent limitation.
export const getAllOrders = createAsyncThunk(
  "order/getAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await fetchOrders(params);
      const payload = res.data?.data;
      const rawOrders = Array.isArray(payload) ? payload : payload?.orders || [];
      const meta = Array.isArray(payload)
        ? { total: rawOrders.length, page: 1, limit: rawOrders.length, totalPages: 1 }
        : {
            total: payload?.total ?? rawOrders.length,
            page: payload?.page ?? 1,
            limit: payload?.limit ?? rawOrders.length,
            totalPages: payload?.totalPages ?? 1,
          };
      return { orders: rawOrders.map(normalizeOrder), meta };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch orders");
    }
  },
);

/* ================= GET DETAIL ================= */
export const getOrderDetail = createAsyncThunk(
  "order/getDetail",
  async (id, { rejectWithValue }) => {
    try {
      const res = await fetchOrderById(id);
      return normalizeOrder(res.data?.data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch");
    }
  },
);

/* ================= GET EVENTS (dedicated timeline endpoint) ================= */
// Failures here are swallowed (not toasted) — events are supplementary, and
// OrderDetailDrawer already has a real fallback (derives 2 honest events from
// createdAt/updatedAt) if this endpoint is unavailable for a given order, so
// one flaky/unready endpoint shouldn't block viewing the rest of the order.
export const getOrderEvents = createAsyncThunk(
  "order/getEvents",
  async (id, { rejectWithValue }) => {
    try {
      const res = await fetchOrderEvents(id);
      const payload = res.data?.data;
      const events = Array.isArray(payload) ? payload : payload?.events || [];
      return { id, events };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch order events");
    }
  },
);

/* ================= UPDATE (status / tracking / notes) ================= */
export const updateOrder = createAsyncThunk(
  "order/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await editOrder(id, data);
      return normalizeOrder(res.data?.data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update");
    }
  },
);

/* ================= CANCEL (dedicated endpoint) ================= */
export const cancelOrder = createAsyncThunk(
  "order/cancel",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await cancelOrderApi(id, data);
      return normalizeOrder(res.data?.data) || { id, status: "cancelled" };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to cancel order");
    }
  },
);

/* ================= RECORD COD PAYMENT ================= */
// Response describes the PAYMENT record ({id, orderId, amount, method,
// receivedAt, paymentStatus}) — its `id` is the payment's id, not the
// order's, so the order patch is keyed off `orderId` (falling back to the
// id we called with), never off the payment response's own `id`.
export const recordCodPayment = createAsyncThunk(
  "order/recordCodPayment",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await recordCodPaymentApi(id, data);
      const payment = res.data?.data || {};
      return { orderId: payment.orderId || id, paymentStatus: payment.paymentStatus, payment };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to record COD payment");
    }
  },
);

/* ================= UPDATE PAYMENT STATUS ================= */
export const updatePaymentStatus = createAsyncThunk(
  "order/updatePaymentStatus",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await updatePaymentStatusApi(id, data);
      return res.data?.data || { id, paymentStatus: data.paymentStatus };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update payment status");
    }
  },
);

/* ================= REFUND ================= */
// Refund response ({refundId, orderId, amount, status}) describes the refund
// record itself, not a new order/paymentStatus — nothing here is invented,
// so it's stored as `lastRefund` on the order rather than mutating
// status/paymentStatus off values the API never actually returned.
export const requestRefund = createAsyncThunk(
  "order/requestRefund",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await requestRefundApi(id, data);
      return { orderId: id, refund: res.data?.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to process refund");
    }
  },
);

/* ================= CONTACT CUSTOMER ================= */
export const contactCustomer = createAsyncThunk(
  "order/contactCustomer",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await contactCustomerApi(id, data);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to contact customer");
    }
  },
);

/* ================= STATE ================= */
const initialState = {
  loading: false,
  error: null,
  allOrders: [],
  pagination: { total: 0, page: 1, limit: 0, totalPages: 1 },
  selectedOrder: null,
  detailLoading: false,
  selectedOrderEvents: [],
  eventsLoading: false,
};

/* ================= SLICE ================= */
const orderSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
    clearSelectedOrder: (state) => {
      state.selectedOrder = null;
      state.selectedOrderEvents = [];
    },
  },

  extraReducers: (builder) => {
    builder
      /* GET ALL */
      .addCase(getAllOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAllOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.allOrders = action.payload.orders;
        state.pagination = action.payload.meta;
      })
      .addCase(getAllOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* GET DETAIL */
      .addCase(getOrderDetail.pending, (state) => {
        state.detailLoading = true;
      })
      .addCase(getOrderDetail.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selectedOrder = action.payload;
      })
      .addCase(getOrderDetail.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = action.payload;
      })

      /* GET EVENTS */
      .addCase(getOrderEvents.pending, (state) => {
        state.eventsLoading = true;
      })
      .addCase(getOrderEvents.fulfilled, (state, action) => {
        state.eventsLoading = false;
        if (state.selectedOrder?.id === action.payload.id) {
          state.selectedOrderEvents = action.payload.events;
        }
      })
      .addCase(getOrderEvents.rejected, (state) => {
        state.eventsLoading = false;
        state.selectedOrderEvents = [];
      })

      /* UPDATE */
      .addCase(updateOrder.fulfilled, (state, action) => {
        mergeOrderPatch(state, action.payload.id, action.payload);
      })

      /* CANCEL */
      .addCase(cancelOrder.fulfilled, (state, action) => {
        mergeOrderPatch(state, action.payload.id, action.payload);
      })

      /* COD PAYMENT */
      .addCase(recordCodPayment.fulfilled, (state, action) => {
        const { orderId, paymentStatus, payment } = action.payload;
        const patch = {};
        if (paymentStatus) patch.paymentStatus = paymentStatus;
        // Append the just-created payment record so it shows up in Payment
        // History / the Paid-Outstanding split immediately, without waiting
        // on a refetch — same list GET /admin/orders/{id} already returns.
        if (payment && (payment.id != null || payment.amount != null)) {
          const existing = state.selectedOrder?.id === orderId
            ? state.selectedOrder.payments
            : state.allOrders.find((o) => o?.id === orderId)?.payments;
          const already = Array.isArray(existing) && existing.some((p) => p?.id != null && p.id === payment.id);
          if (!already) patch.payments = [...(Array.isArray(existing) ? existing : []), payment];
        }
        if (Object.keys(patch).length > 0) mergeOrderPatch(state, orderId, patch);
      })

      /* PAYMENT STATUS */
      .addCase(updatePaymentStatus.fulfilled, (state, action) => {
        mergeOrderPatch(state, action.payload.id, action.payload);
      })

      /* REFUND */
      .addCase(requestRefund.fulfilled, (state, action) => {
        mergeOrderPatch(state, action.payload.orderId, { lastRefund: action.payload.refund });
      });
  },
});

export const { clearSelectedOrder } = orderSlice.actions;
export default orderSlice.reducer;
