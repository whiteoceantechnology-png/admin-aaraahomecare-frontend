import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchCustomers,
  fetchCustomerById,
  toggleCustomerBlockRequest,
} from "./customerApi";

/* ================= GET ALL ================= */
export const getAllCustomers = createAsyncThunk(
  "customer/getAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchCustomers();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch");
    }
  },
);

/* ================= GET DETAIL ================= */
export const getCustomerDetail = createAsyncThunk(
  "customer/getDetail",
  async (id, { rejectWithValue }) => {
    try {
      const res = await fetchCustomerById(id);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch");
    }
  },
);

/* ================= TOGGLE BLOCK ================= */
export const toggleCustomerBlock = createAsyncThunk(
  "customer/toggleBlock",
  async (id, { rejectWithValue }) => {
    try {
      const res = await toggleCustomerBlockRequest(id);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update");
    }
  },
);

/* ================= STATE ================= */
const initialState = {
  loading: false,
  error: null,
  allCustomers: [],
  selectedCustomer: null,
  detailLoading: false,
};

/* ================= SLICE ================= */
const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    clearSelectedCustomer: (state) => {
      state.selectedCustomer = null;
    },
  },

  extraReducers: (builder) => {
    builder
      /* GET ALL */
      .addCase(getAllCustomers.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAllCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.allCustomers = action.payload;
      })
      .addCase(getAllCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* GET DETAIL */
      .addCase(getCustomerDetail.pending, (state) => {
        state.detailLoading = true;
      })
      .addCase(getCustomerDetail.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selectedCustomer = action.payload;
      })
      .addCase(getCustomerDetail.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = action.payload;
      })

      /* TOGGLE BLOCK */
      .addCase(toggleCustomerBlock.fulfilled, (state, action) => {
        const { id, isBlocked } = action.payload;
        state.allCustomers = state.allCustomers.map((item) =>
          item.id === id ? { ...item, isBlocked } : item,
        );
        if (state.selectedCustomer?.id === id) {
          state.selectedCustomer = { ...state.selectedCustomer, isBlocked };
        }
      });
  },
});

export const { clearSelectedCustomer } = customerSlice.actions;
export default customerSlice.reducer;
