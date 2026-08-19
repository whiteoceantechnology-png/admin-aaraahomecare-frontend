import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { uploadImageFile } from "./imageApi";

/* ================= UPLOAD IMAGE ================= */
export const uploadImage = createAsyncThunk(
  "image/uploadImage",
  async (file, { rejectWithValue }) => {
    try {
      const res = await uploadImageFile(file);

      // ✅ return first image object
      return res.data.data[0];
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Image upload failed",
      );
    }
  },
);

/* ================= INITIAL STATE ================= */
const initialState = {
  loading: false,
  error: null,
  uploadedImage: null, // { id, path }
};

/* ================= SLICE ================= */
const imageSlice = createSlice({
  name: "image",
  initialState,

  reducers: {
    /* 🔄 RESET */
    resetImageState: (state) => {
      state.loading = false;
      state.error = null;
      state.uploadedImage = null;
    },
  },

  extraReducers: (builder) => {
    builder

      /* 🔄 UPLOAD */
      .addCase(uploadImage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(uploadImage.fulfilled, (state, action) => {
        state.loading = false;
        state.uploadedImage = action.payload; // 🔥 store image
      })

      .addCase(uploadImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetImageState } = imageSlice.actions;

export default imageSlice.reducer;
