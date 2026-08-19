import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchPaymentsOverview,
  fetchTransactions,
  fetchTransactionDetail,
  fetchRefunds,
  createRefund,
  fetchSettlements,
  fetchSettlementDetail,
  fetchCodCycles,
  fetchPaymentsHealth,
  reconcileTransaction,
  createPaymentLink,
  fetchPaymentLinks,
} from "./paymentApi";

// Payments list endpoints all share the same {[key]: [...], pagination: {page,
// limit, total, totalPages}} envelope (confirmed against the real dev API —
// GET /admin/payments/transactions|refunds|settlements|payment-links) — `key`
// picks the actual array field per endpoint (e.g. "transactions", "refunds").
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
export const getPaymentsOverview = createAsyncThunk(
  "payment/getOverview",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await fetchPaymentsOverview(params);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch payments overview");
    }
  },
);

/* ================= TRANSACTIONS ================= */
export const getTransactions = createAsyncThunk(
  "payment/getTransactions",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await fetchTransactions(params);
      return normalizePaged(res.data?.data, "transactions");
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch transactions");
    }
  },
);

export const getTransactionDetail = createAsyncThunk(
  "payment/getTransactionDetail",
  async (id, { rejectWithValue }) => {
    try {
      const res = await fetchTransactionDetail(id);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch transaction");
    }
  },
);

/* ================= REFUNDS ================= */
export const getRefunds = createAsyncThunk(
  "payment/getRefunds",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await fetchRefunds(params);
      return normalizePaged(res.data?.data, "refunds");
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch refunds");
    }
  },
);

export const addRefund = createAsyncThunk(
  "payment/addRefund",
  async (data, { rejectWithValue }) => {
    try {
      const res = await createRefund(data);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create refund");
    }
  },
);

/* ================= SETTLEMENTS ================= */
export const getSettlements = createAsyncThunk(
  "payment/getSettlements",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await fetchSettlements(params);
      return normalizePaged(res.data?.data, "settlements");
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch settlements");
    }
  },
);

export const getSettlementDetail = createAsyncThunk(
  "payment/getSettlementDetail",
  async (id, { rejectWithValue }) => {
    try {
      const res = await fetchSettlementDetail(id);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch settlement");
    }
  },
);

/* ================= COD ================= */
export const getCodCycles = createAsyncThunk(
  "payment/getCodCycles",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await fetchCodCycles(params);
      const payload = res.data?.data;
      const { rows, meta } = normalizePaged(payload, "cycles");
      return { cycles: rows, deliveredAwaitingCash: payload?.deliveredAwaitingCash || [], meta };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch COD cycles");
    }
  },
);

/* ================= HEALTH ================= */
export const getPaymentsHealth = createAsyncThunk(
  "payment/getHealth",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchPaymentsHealth();
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch gateway health");
    }
  },
);

/* ================= RECONCILE ================= */
export const reconcileTxn = createAsyncThunk(
  "payment/reconcile",
  async (data, { rejectWithValue }) => {
    try {
      const res = await reconcileTransaction(data);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to reconcile transaction");
    }
  },
);

/* ================= PAYMENT LINKS ================= */
export const getPaymentLinks = createAsyncThunk(
  "payment/getPaymentLinks",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await fetchPaymentLinks(params);
      return normalizePaged(res.data?.data, "links");
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch payment links");
    }
  },
);

export const addPaymentLink = createAsyncThunk(
  "payment/addPaymentLink",
  async (data, { rejectWithValue }) => {
    try {
      const res = await createPaymentLink(data);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create payment link");
    }
  },
);

const pagedState = () => ({ items: [], meta: { total: 0, page: 1, limit: 25, totalPages: 1 }, loading: false, error: null });

const initialState = {
  overview: { data: null, loading: false, error: null },
  transactions: pagedState(),
  transactionDetail: { item: null, loading: false, error: null },
  refunds: pagedState(),
  refundSaving: false,
  settlements: pagedState(),
  settlementDetail: { item: null, loading: false, error: null },
  cod: { cycles: [], deliveredAwaitingCash: [], meta: { total: 0, page: 1, limit: 25, totalPages: 1 }, loading: false, error: null },
  health: { data: null, loading: false, error: null },
  paymentLinks: pagedState(),
  linkSaving: false,
  reconciling: false,
};

const paymentSlice = createSlice({
  name: "payment",
  initialState,
  reducers: {
    clearTransactionDetail: (state) => {
      state.transactionDetail = { item: null, loading: false, error: null };
    },
    clearSettlementDetail: (state) => {
      state.settlementDetail = { item: null, loading: false, error: null };
    },
  },
  extraReducers: (builder) => {
    builder
      /* OVERVIEW */
      .addCase(getPaymentsOverview.pending, (state) => {
        state.overview.loading = true;
        state.overview.error = null;
      })
      .addCase(getPaymentsOverview.fulfilled, (state, action) => {
        state.overview.loading = false;
        state.overview.data = action.payload;
      })
      .addCase(getPaymentsOverview.rejected, (state, action) => {
        state.overview.loading = false;
        state.overview.error = action.payload;
      })

      /* TRANSACTIONS */
      .addCase(getTransactions.pending, (state) => {
        state.transactions.loading = true;
        state.transactions.error = null;
      })
      .addCase(getTransactions.fulfilled, (state, action) => {
        state.transactions.loading = false;
        state.transactions.items = action.payload.rows;
        state.transactions.meta = action.payload.meta;
      })
      .addCase(getTransactions.rejected, (state, action) => {
        state.transactions.loading = false;
        state.transactions.error = action.payload;
      })

      .addCase(getTransactionDetail.pending, (state) => {
        state.transactionDetail.loading = true;
        state.transactionDetail.error = null;
      })
      .addCase(getTransactionDetail.fulfilled, (state, action) => {
        state.transactionDetail.loading = false;
        state.transactionDetail.item = action.payload;
      })
      .addCase(getTransactionDetail.rejected, (state, action) => {
        state.transactionDetail.loading = false;
        state.transactionDetail.error = action.payload;
      })

      /* REFUNDS */
      .addCase(getRefunds.pending, (state) => {
        state.refunds.loading = true;
        state.refunds.error = null;
      })
      .addCase(getRefunds.fulfilled, (state, action) => {
        state.refunds.loading = false;
        state.refunds.items = action.payload.rows;
        state.refunds.meta = action.payload.meta;
      })
      .addCase(getRefunds.rejected, (state, action) => {
        state.refunds.loading = false;
        state.refunds.error = action.payload;
      })
      .addCase(addRefund.pending, (state) => {
        state.refundSaving = true;
      })
      .addCase(addRefund.fulfilled, (state, action) => {
        state.refundSaving = false;
        if (action.payload) state.refunds.items = [action.payload, ...state.refunds.items];
      })
      .addCase(addRefund.rejected, (state) => {
        state.refundSaving = false;
      })

      /* SETTLEMENTS */
      .addCase(getSettlements.pending, (state) => {
        state.settlements.loading = true;
        state.settlements.error = null;
      })
      .addCase(getSettlements.fulfilled, (state, action) => {
        state.settlements.loading = false;
        state.settlements.items = action.payload.rows;
        state.settlements.meta = action.payload.meta;
      })
      .addCase(getSettlements.rejected, (state, action) => {
        state.settlements.loading = false;
        state.settlements.error = action.payload;
      })
      .addCase(getSettlementDetail.pending, (state) => {
        state.settlementDetail.loading = true;
        state.settlementDetail.error = null;
      })
      .addCase(getSettlementDetail.fulfilled, (state, action) => {
        state.settlementDetail.loading = false;
        state.settlementDetail.item = action.payload;
      })
      .addCase(getSettlementDetail.rejected, (state, action) => {
        state.settlementDetail.loading = false;
        state.settlementDetail.error = action.payload;
      })

      /* COD */
      .addCase(getCodCycles.pending, (state) => {
        state.cod.loading = true;
        state.cod.error = null;
      })
      .addCase(getCodCycles.fulfilled, (state, action) => {
        state.cod.loading = false;
        state.cod.cycles = action.payload.cycles;
        state.cod.deliveredAwaitingCash = action.payload.deliveredAwaitingCash;
        state.cod.meta = action.payload.meta;
      })
      .addCase(getCodCycles.rejected, (state, action) => {
        state.cod.loading = false;
        state.cod.error = action.payload;
      })

      /* HEALTH */
      .addCase(getPaymentsHealth.pending, (state) => {
        state.health.loading = true;
        state.health.error = null;
      })
      .addCase(getPaymentsHealth.fulfilled, (state, action) => {
        state.health.loading = false;
        state.health.data = action.payload;
      })
      .addCase(getPaymentsHealth.rejected, (state, action) => {
        state.health.loading = false;
        state.health.error = action.payload;
      })

      /* RECONCILE */
      .addCase(reconcileTxn.pending, (state) => {
        state.reconciling = true;
      })
      .addCase(reconcileTxn.fulfilled, (state) => {
        state.reconciling = false;
      })
      .addCase(reconcileTxn.rejected, (state) => {
        state.reconciling = false;
      })

      /* PAYMENT LINKS */
      .addCase(getPaymentLinks.pending, (state) => {
        state.paymentLinks.loading = true;
        state.paymentLinks.error = null;
      })
      .addCase(getPaymentLinks.fulfilled, (state, action) => {
        state.paymentLinks.loading = false;
        state.paymentLinks.items = action.payload.rows;
        state.paymentLinks.meta = action.payload.meta;
      })
      .addCase(getPaymentLinks.rejected, (state, action) => {
        state.paymentLinks.loading = false;
        state.paymentLinks.error = action.payload;
      })
      .addCase(addPaymentLink.pending, (state) => {
        state.linkSaving = true;
      })
      .addCase(addPaymentLink.fulfilled, (state, action) => {
        state.linkSaving = false;
        if (action.payload) state.paymentLinks.items = [action.payload, ...state.paymentLinks.items];
      })
      .addCase(addPaymentLink.rejected, (state) => {
        state.linkSaving = false;
      });
  },
});

export const { clearTransactionDetail, clearSettlementDetail } = paymentSlice.actions;
export default paymentSlice.reducer;
