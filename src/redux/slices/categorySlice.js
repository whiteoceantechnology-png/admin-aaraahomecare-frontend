import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchCategories,
  createCategory,
  editCategory,
  removeCategory,
  importCategoriesFile,
} from "./categoryApi";

/* ================= GET ALL ================= */
export const getAllCategoryList = createAsyncThunk(
  "category/getAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchCategories();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch");
    }
  },
);

/* ================= ADD ================= */
export const addCategory = createAsyncThunk(
  "category/add",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await createCategory(payload);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to add");
    }
  }
);
/* ================= UPDATE ================= */
export const updateCategory = createAsyncThunk(
  "category/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await editCategory(id, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update");
    }
  }
);

/* ================= DELETE ================= */
export const deleteCategory = createAsyncThunk(
  "category/delete",
  async (id, { rejectWithValue }) => {
    try {
      await removeCategory(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete");
    }
  },
);

/* ================= BULK IMPORT (xlsx/xls) ================= */
export const importCategories = createAsyncThunk(
  "category/import",
  async (file, { rejectWithValue }) => {
    try {
      const res = await importCategoriesFile(file);
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to import categories",
      );
    }
  }
);

/* ================= STATE ================= */
const initialState = {
  loading: false,
  importing: false,
  error: null,
  allCategoryList: [],
};

/* ================= SLICE ================= */
const categorySlice = createSlice({
  name: "category",
  initialState,
  reducers: {},

  extraReducers: (builder) => {
    builder
      /* GET */
      .addCase(getAllCategoryList.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAllCategoryList.fulfilled, (state, action) => {
        state.loading = false;
        state.allCategoryList = action.payload;
      })
      .addCase(getAllCategoryList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ADD */
      .addCase(addCategory.fulfilled, (state, action) => {
        state.allCategoryList.unshift(action.payload);
      })

      /* UPDATE */
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.allCategoryList = state.allCategoryList.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        );
      })

      /* DELETE */
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.allCategoryList = state.allCategoryList.filter(
          (item) => item.id !== action.payload,
        );
      })

      /* IMPORT */
      .addCase(importCategories.pending, (state) => {
        state.importing = true;
      })
      .addCase(importCategories.fulfilled, (state) => {
        state.importing = false;
      })
      .addCase(importCategories.rejected, (state) => {
        state.importing = false;
      });
  },
});

export default categorySlice.reducer;
