import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

/* ================= GET ALL ================= */

export const getAllCategoryList = createAsyncThunk(
  "allCategory/getAllCategoryList",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/admin/categories");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch categories"
      );
    }
  }
);

/* ================= ADD ================= */

export const addCategory = createAsyncThunk(
  "allCategory/addCategory",
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/categories", data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to add category"
      );
    }
  }
);

/* ================= UPDATE ================= */

export const updateCategory = createAsyncThunk(
  "allCategory/updateCategory",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/categories/${id}`, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update category"
      );
    }
  }
);

/* ================= DELETE ================= */

export const deleteCategory = createAsyncThunk(
  "allCategory/deleteCategory",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/categories/${id}`);
      return id; // only id return pannuvom
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete category"
      );
    }
  }
);

/* ================= INITIAL STATE ================= */

const initialState = {
  loading: false,
  error: null,
  success: false,
  allCategoryList: [],
};

/* ================= SLICE ================= */

const allCategorySlice = createSlice({
  name: "allCategory",
  initialState,

  reducers: {
    resetAllCategoryState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
    },
  },

  extraReducers: (builder) => {
    builder

      /* ===== GET ===== */
      .addCase(getAllCategoryList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllCategoryList.fulfilled, (state, action) => {
        state.loading = false;
        state.allCategoryList = action.payload;
      })
      .addCase(getAllCategoryList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ===== ADD ===== */
      .addCase(addCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCategory.fulfilled, (state, action) => {
        state.loading = false;

        // 🔥 instantly add to UI (no reload)
        state.allCategoryList.unshift(action.payload);
      })
      .addCase(addCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ===== UPDATE ===== */
      .addCase(updateCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.loading = false;

        state.allCategoryList = state.allCategoryList.map((item) =>
          item.id === action.payload.id ? action.payload : item
        );
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ===== DELETE ===== */
      .addCase(deleteCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.loading = false;

        state.allCategoryList = state.allCategoryList.filter(
          (item) => item.id !== action.payload
        );
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetAllCategoryState } = allCategorySlice.actions;
export default allCategorySlice.reducer;