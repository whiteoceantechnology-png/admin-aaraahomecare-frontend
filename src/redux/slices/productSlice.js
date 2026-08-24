import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchProducts,
  fetchProductById,
  createProduct,
  editProduct,
  addProductImageRequest,
  removeProductImageRequest,
  saveProductSpecificationRequest,
  removeProductSpecificationRequest,
  fetchProductDocuments,
  createProductDocumentRequest,
  editProductDocumentRequest,
  removeProductDocumentRequest,
  importProductsFile,
  removeProduct,
} from "./productApi";

// GET ALL
export const getAllProducts = createAsyncThunk(
  "product/getAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchProducts();
      const data = res.data?.data;
      return Array.isArray(data) ? data : data?.products || data?.items || [];
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch products",
      );
    }
  },
);

// GET ONE
export const getProductById = createAsyncThunk(
  "product/getById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await fetchProductById(id);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch product",
      );
    }
  },
);

// ADD
export const addProduct = createAsyncThunk(
  "product/add",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await createProduct(payload);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to add product",
      );
    }
  },
);

// UPDATE
export const updateProduct = createAsyncThunk(
  "product/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await editProduct(id, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update product",
      );
    }
  },
);

// ADD IMAGE
export const addProductImage = createAsyncThunk(
  "product/addImage",
  async ({ productId, data }, { rejectWithValue }) => {
    try {
      const res = await addProductImageRequest(productId, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to add image",
      );
    }
  },
);

// DELETE IMAGE
export const deleteProductImage = createAsyncThunk(
  "product/deleteImage",
  async (imageId, { rejectWithValue }) => {
    try {
      await removeProductImageRequest(imageId);
      return imageId;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete image",
      );
    }
  },
);

// SAVE (CREATE/UPDATE) SPECIFICATION
export const saveProductSpecification = createAsyncThunk(
  "product/saveSpecification",
  async ({ productId, data }, { rejectWithValue }) => {
    try {
      const res = await saveProductSpecificationRequest(productId, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to save specification",
      );
    }
  },
);

// DELETE SPECIFICATION
export const deleteProductSpecification = createAsyncThunk(
  "product/deleteSpecification",
  async (productId, { rejectWithValue }) => {
    try {
      await removeProductSpecificationRequest(productId);
      return productId;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete specification",
      );
    }
  },
);

/* ---------------- Technical documents (COA / MSDS / SDS) ---------------- */

// LIST DOCUMENTS
export const getProductDocuments = createAsyncThunk(
  "product/getDocuments",
  async (productId, { rejectWithValue }) => {
    try {
      const res = await fetchProductDocuments(productId);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch documents",
      );
    }
  },
);

// UPLOAD DOCUMENT — `data` is a FormData built by the caller
export const addProductDocument = createAsyncThunk(
  "product/addDocument",
  async ({ productId, data }, { rejectWithValue }) => {
    try {
      const res = await createProductDocumentRequest(productId, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to upload document",
      );
    }
  },
);

// UPDATE DOCUMENT — title, file, or both
export const updateProductDocument = createAsyncThunk(
  "product/updateDocument",
  async ({ productId, documentId, data }, { rejectWithValue }) => {
    try {
      const res = await editProductDocumentRequest(productId, documentId, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update document",
      );
    }
  },
);

// DELETE DOCUMENT
export const deleteProductDocument = createAsyncThunk(
  "product/deleteDocument",
  async ({ productId, documentId }, { rejectWithValue }) => {
    try {
      await removeProductDocumentRequest(productId, documentId);
      return documentId;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete document",
      );
    }
  },
);

// BULK IMPORT (xlsx/xls)
export const importProducts = createAsyncThunk(
  "product/import",
  async (file, { rejectWithValue }) => {
    try {
      const res = await importProductsFile(file);
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to import products",
      );
    }
  },
);

// DELETE
export const deleteProduct = createAsyncThunk(
  "product/delete",
  async (id, { rejectWithValue }) => {
    try {
      await removeProduct(id);
      return id;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete product",
      );
    }
  },
);

const productSlice = createSlice({
  name: "product",
  initialState: {
    products: [],
    singleProduct: null,
    // Technical documents are a separate resource from the product payload,
    // so they get their own slice of state and their own loading flag.
    documents: [],
    documentsLoading: false,
    documentsError: null,
    loading: false,
    importing: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // IMPORT
      .addCase(importProducts.pending, (state) => {
        state.importing = true;
      })
      .addCase(importProducts.fulfilled, (state) => {
        state.importing = false;
      })
      .addCase(importProducts.rejected, (state) => {
        state.importing = false;
      })
      // GET ALL
      .addCase(getAllProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(getAllProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // GET ONE
      .addCase(getProductById.fulfilled, (state, action) => {
        state.singleProduct = action.payload;
      })

      // ADD
      .addCase(addProduct.fulfilled, (state, action) => {
        state.products.unshift(action.payload);
      })

      // UPDATE
      .addCase(updateProduct.fulfilled, (state, action) => {
        const index = state.products.findIndex(
          (p) => p.id === action.payload.id,
        );
        if (index !== -1) {
          state.products[index] = action.payload;
        }
      })

      // DELETE
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.products = state.products.filter((p) => p.id !== action.payload);
      })

      // DOCUMENTS
      .addCase(getProductDocuments.pending, (state) => {
        state.documentsLoading = true;
        state.documentsError = null;
      })
      .addCase(getProductDocuments.fulfilled, (state, action) => {
        state.documentsLoading = false;
        state.documents = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(getProductDocuments.rejected, (state, action) => {
        state.documentsLoading = false;
        state.documents = [];
        state.documentsError = action.payload;
      });
  },
});

export default productSlice.reducer;
