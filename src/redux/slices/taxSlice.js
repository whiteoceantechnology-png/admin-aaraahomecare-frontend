import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchTaxes, createTax, editTax, removeTax } from "./taxApi";

// GET TAX LIST
export const getAllTaxes = createAsyncThunk(
  "tax/getAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchTaxes();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch taxes",
      );
    }
  }
);

// ADD TAX
export const addTax = createAsyncThunk(
  "tax/add",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await createTax(payload);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to add tax",
      );
    }
  }
);

// UPDATE TAX
export const updateTax = createAsyncThunk(
  "tax/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await editTax(id, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update tax",
      );
    }
  }
);

// DELETE TAX
export const deleteTax = createAsyncThunk(
  "tax/delete",
  async (id, { rejectWithValue }) => {
    try {
      await removeTax(id);
      return id;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete tax",
      );
    }
  }
);

const taxSlice = createSlice({
  name: "tax",
  initialState: {
    taxes: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getAllTaxes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllTaxes.fulfilled, (state, action) => {
        state.loading = false;
        state.taxes = action.payload;
      })
      .addCase(getAllTaxes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addTax.fulfilled, (state, action) => {
        state.taxes.unshift(action.payload);
      })
      .addCase(updateTax.fulfilled, (state, action) => {
        state.taxes = state.taxes.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        );
      })
      .addCase(deleteTax.fulfilled, (state, action) => {
        state.taxes = state.taxes.filter((item) => item.id !== action.payload);
      });
  },
});

export default taxSlice.reducer;
