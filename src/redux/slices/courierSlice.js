import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchCouriers,
  fetchCourierById,
  createCourier,
  editCourier,
} from "./courierApi";

// Response envelope is { success, statusCode, data } across this API, so every
// thunk unwraps res.data.data — the same convention every other slice uses.
const listFrom = (payload) =>
  Array.isArray(payload)
    ? payload
    : payload?.couriers || payload?.items || payload?.rows || [];

export const getCouriers = createAsyncThunk(
  "courier/getCouriers",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await fetchCouriers(params);
      return listFrom(res.data?.data);
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch couriers",
      );
    }
  },
);

// The list response may omit nested states/rateRules; the detail endpoint is
// what carries the ids an update has to preserve, so Edit always loads it.
export const getCourierById = createAsyncThunk(
  "courier/getCourierById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await fetchCourierById(id);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch courier",
      );
    }
  },
);

export const addCourier = createAsyncThunk(
  "courier/addCourier",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await createCourier(payload);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to create courier",
      );
    }
  },
);

export const updateCourier = createAsyncThunk(
  "courier/updateCourier",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await editCourier(id, data);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update courier",
      );
    }
  },
);

const initialState = {
  items: [],
  loading: false,
  error: null,
  saving: false,
  detail: null,
  detailLoading: false,
  detailError: null,
};

const courierSlice = createSlice({
  name: "courier",
  initialState,
  reducers: {
    clearCourierDetail(state) {
      state.detail = null;
      state.detailLoading = false;
      state.detailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCouriers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCouriers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(getCouriers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getCourierById.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
      })
      .addCase(getCourierById.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.detail = action.payload;
      })
      .addCase(getCourierById.rejected, (state, action) => {
        state.detailLoading = false;
        state.detailError = action.payload;
      })
      .addMatcher(
        (action) =>
          [addCourier, updateCourier].some((t) => t.pending.match(action)),
        (state) => {
          state.saving = true;
        },
      )
      .addMatcher(
        (action) =>
          [addCourier, updateCourier].some(
            (t) => t.fulfilled.match(action) || t.rejected.match(action),
          ),
        (state) => {
          state.saving = false;
        },
      );
  },
});

export const { clearCourierDetail } = courierSlice.actions;
export default courierSlice.reducer;
