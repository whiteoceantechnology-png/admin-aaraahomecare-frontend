import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchBrands, createBrand, editBrand, removeBrand } from "./brandApi";

/* ================= GET ALL ================= */
export const getAllBrands = createAsyncThunk(
  "brand/getAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchBrands();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch brands",
      );
    }
  },
);

/* ================= ADD ================= */
export const addBrand = createAsyncThunk(
  "brand/add",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await createBrand(payload);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to add brand");
    }
  },
);

/* ================= UPDATE ================= */
export const updateBrand = createAsyncThunk(
  "brand/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await editBrand(id, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update brand",
      );
    }
  },
);

/* ================= DELETE ================= */
export const deleteBrand = createAsyncThunk(
  "brand/delete",
  async (id, { rejectWithValue }) => {
    try {
      await removeBrand(id);
      return id;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete brand",
      );
    }
  },
);

const brandSlice = createSlice({
  name: "brand",
  initialState: {
    brands: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getAllBrands.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllBrands.fulfilled, (state, action) => {
        state.loading = false;
        state.brands = action.payload;
      })
      .addCase(getAllBrands.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addBrand.fulfilled, (state, action) => {
        state.brands.unshift(action.payload);
      })
      .addCase(updateBrand.fulfilled, (state, action) => {
        state.brands = state.brands.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        );
      })
      .addCase(deleteBrand.fulfilled, (state, action) => {
        state.brands = state.brands.filter((item) => item.id !== action.payload);
      });
  },
});

export default brandSlice.reducer;
