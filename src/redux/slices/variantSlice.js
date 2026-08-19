import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchVariants,
  createVariant,
  editVariant,
  removeVariant,
  importVariantsFile,
} from "./variantApi";

// GET ALL
export const getAllVariants = createAsyncThunk(
  "variant/getAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchVariants();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch variants",
      );
    }
  }
);

// ADD
export const addVariant = createAsyncThunk(
  "variant/add",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await createVariant(payload);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to add variant",
      );
    }
  }
);

// UPDATE
export const updateVariant = createAsyncThunk(
  "variant/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await editVariant(id, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update variant",
      );
    }
  }
);

// DELETE
export const deleteVariant = createAsyncThunk(
  "variant/delete",
  async (id, { rejectWithValue }) => {
    try {
      await removeVariant(id);
      return id;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete variant",
      );
    }
  }
);

// BULK IMPORT (xlsx/xls)
export const importVariants = createAsyncThunk(
  "variant/import",
  async (file, { rejectWithValue }) => {
    try {
      const res = await importVariantsFile(file);
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to import variants",
      );
    }
  }
);

const variantSlice = createSlice({
  name: "variant",
  initialState: {
    variants: [],
    loading: false,
    importing: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // GET ALL
      .addCase(getAllVariants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllVariants.fulfilled, (state, action) => {
        state.loading = false;
        state.variants = action.payload;
      })
      .addCase(getAllVariants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ADD
      .addCase(addVariant.fulfilled, (state, action) => {
        state.variants.unshift(action.payload);
      })

      // UPDATE
      .addCase(updateVariant.fulfilled, (state, action) => {
        const index = state.variants.findIndex(
          (v) => v.id === action.payload.id
        );
        if (index !== -1) {
          state.variants[index] = action.payload;
        }
      })

      // DELETE
      .addCase(deleteVariant.fulfilled, (state, action) => {
        state.variants = state.variants.filter(
          (v) => v.id !== action.payload
        );
      })

      // IMPORT
      .addCase(importVariants.pending, (state) => {
        state.importing = true;
      })
      .addCase(importVariants.fulfilled, (state) => {
        state.importing = false;
      })
      .addCase(importVariants.rejected, (state) => {
        state.importing = false;
      });
  },
});

export default variantSlice.reducer;
