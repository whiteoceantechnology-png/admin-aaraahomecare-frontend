import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchInventoryList,
  fetchLowStockInventory,
  fetchInventoryDetail,
  updateInventoryStock,
  adjustInventoryStock,
  reserveInventoryStock,
  releaseInventoryStock,
  fetchInventoryHistory,
  bulkUpdateInventory,
} from "./inventoryApi";

// Same defensive list-shape normalization getAllOrders/getAllCustomers
// already use elsewhere — the payload may come back as a bare array or as
// {items/rows/data, total, page, limit, totalPages}; never guessed beyond
// that. `inventory` is the confirmed real key for GET /admin/inventory and
// /admin/inventory/low-stock (checked first); the others stay as fallbacks
// for any inventory endpoint that shapes its list differently.
const normalizeList = (payload) => {
  const rows = Array.isArray(payload)
    ? payload
    : payload?.inventory || payload?.items || payload?.rows || payload?.data || [];
  const meta = Array.isArray(payload)
    ? { total: rows.length, page: 1, limit: rows.length || 25, totalPages: 1 }
    : {
        total: payload?.total ?? rows.length,
        page: payload?.page ?? 1,
        limit: payload?.limit ?? rows.length,
        totalPages: payload?.totalPages ?? 1,
      };
  return { rows, meta };
};

/* ================= LIST ================= */
export const getInventoryList = createAsyncThunk(
  "inventory/getList",
  async (params = {}, { rejectWithValue, signal }) => {
    try {
      // Passing the thunk's signal through means .abort() on the dispatch
      // promise cancels the HTTP request itself.
      const res = await fetchInventoryList(params, { signal });
      return normalizeList(res.data?.data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch inventory");
    }
  },
);

/* ================= LOW STOCK ================= */
export const getLowStockInventory = createAsyncThunk(
  "inventory/getLowStock",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await fetchLowStockInventory(params);
      return normalizeList(res.data?.data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch low stock inventory");
    }
  },
);

/* ================= DETAIL ================= */
export const getInventoryDetail = createAsyncThunk(
  "inventory/getDetail",
  async (id, { rejectWithValue }) => {
    try {
      const res = await fetchInventoryDetail(id);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch stock details");
    }
  },
);

/* ================= UPDATE STOCK ================= */
export const updateStock = createAsyncThunk(
  "inventory/updateStock",
  async ({ id, stockQuantity }, { rejectWithValue }) => {
    try {
      const res = await updateInventoryStock(id, stockQuantity);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update stock");
    }
  },
);

/* ================= ADJUST ================= */
export const adjustStock = createAsyncThunk(
  "inventory/adjustStock",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await adjustInventoryStock(id, data);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to adjust stock");
    }
  },
);

/* ================= RESERVE ================= */
export const reserveStock = createAsyncThunk(
  "inventory/reserveStock",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await reserveInventoryStock(id, data);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to reserve stock");
    }
  },
);

/* ================= RELEASE ================= */
export const releaseStock = createAsyncThunk(
  "inventory/releaseStock",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await releaseInventoryStock(id, data);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to release stock");
    }
  },
);

/* ================= HISTORY ================= */
export const getInventoryHistory = createAsyncThunk(
  "inventory/getHistory",
  async ({ id, params = {} }, { rejectWithValue }) => {
    try {
      const res = await fetchInventoryHistory(id, params);
      return normalizeList(res.data?.data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch stock history");
    }
  },
);

/* ================= BULK UPDATE ================= */
export const bulkUpdateStock = createAsyncThunk(
  "inventory/bulkUpdate",
  async (updates, { rejectWithValue }) => {
    try {
      const res = await bulkUpdateInventory(updates);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to bulk-update stock");
    }
  },
);

const initialState = {
  items: [],
  meta: { total: 0, page: 1, limit: 25, totalPages: 1 },
  loading: false,
  error: null,

  lowStock: { items: [], meta: { total: 0, page: 1, limit: 25, totalPages: 1 }, loading: false, error: null },

  selected: null,
  selectedLoading: false,
  selectedError: null,

  history: { items: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 }, loading: false, error: null },

  saving: false,
  bulkSaving: false,
};

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    clearSelectedInventory: (state) => {
      state.selected = null;
      state.history = initialState.history;
    },
  },
  extraReducers: (builder) => {
    builder
      /* LIST */
      .addCase(getInventoryList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getInventoryList.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.rows;
        state.meta = action.payload.meta;
      })
      .addCase(getInventoryList.rejected, (state, action) => {
        // A request cancelled because a newer one replaced it must not clear
        // the loading flag or raise an error — the newer request is still in
        // flight and owns the state now.
        if (action.meta?.aborted) return;
        state.loading = false;
        state.error = action.payload;
      })

      /* LOW STOCK */
      .addCase(getLowStockInventory.pending, (state) => {
        state.lowStock.loading = true;
        state.lowStock.error = null;
      })
      .addCase(getLowStockInventory.fulfilled, (state, action) => {
        state.lowStock.loading = false;
        state.lowStock.items = action.payload.rows;
        state.lowStock.meta = action.payload.meta;
      })
      .addCase(getLowStockInventory.rejected, (state, action) => {
        state.lowStock.loading = false;
        state.lowStock.error = action.payload;
      })

      /* DETAIL */
      .addCase(getInventoryDetail.pending, (state) => {
        state.selectedLoading = true;
        state.selectedError = null;
      })
      .addCase(getInventoryDetail.fulfilled, (state, action) => {
        state.selectedLoading = false;
        state.selected = action.payload;
      })
      .addCase(getInventoryDetail.rejected, (state, action) => {
        state.selectedLoading = false;
        state.selectedError = action.payload;
      })

      /* HISTORY */
      .addCase(getInventoryHistory.pending, (state) => {
        state.history.loading = true;
        state.history.error = null;
      })
      .addCase(getInventoryHistory.fulfilled, (state, action) => {
        state.history.loading = false;
        state.history.items = action.payload.rows;
        state.history.meta = action.payload.meta;
      })
      .addCase(getInventoryHistory.rejected, (state, action) => {
        state.history.loading = false;
        state.history.error = action.payload;
      })

      /* BULK UPDATE */
      .addCase(bulkUpdateStock.pending, (state) => {
        state.bulkSaving = true;
      })
      .addCase(bulkUpdateStock.fulfilled, (state) => {
        state.bulkSaving = false;
      })
      .addCase(bulkUpdateStock.rejected, (state) => {
        state.bulkSaving = false;
      })

      /* WRITE ACTIONS — shared pending/settled saving flag; the caller
         (drawer) always refetches detail/history/list itself on success,
         so these reducers only need to patch `selected` optimistically
         when the response describes the same record. addMatcher must come
         after every addCase in this builder chain (Redux Toolkit requires
         it). */
      .addMatcher(
        (action) => [updateStock, adjustStock, reserveStock, releaseStock].some((t) => t.pending.match(action)),
        (state) => {
          state.saving = true;
        },
      )
      .addMatcher(
        (action) =>
          [updateStock, adjustStock, reserveStock, releaseStock].some(
            (t) => t.fulfilled.match(action) || t.rejected.match(action),
          ),
        (state, action) => {
          state.saving = false;
          if (action.payload && typeof action.payload === "object" && state.selected?.id === action.payload.id) {
            state.selected = { ...state.selected, ...action.payload };
          }
        },
      );
  },
});

export const { clearSelectedInventory } = inventorySlice.actions;
export default inventorySlice.reducer;
