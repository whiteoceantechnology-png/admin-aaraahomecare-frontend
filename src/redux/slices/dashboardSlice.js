import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchDashboard } from "./dashboardApi";

// get dashboard
export const getDashboard = createAsyncThunk(
  "dashboard/getDashboard",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchDashboard();
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch dashboard";
      return rejectWithValue(message);
    }
  }
);


const initialState = {
  loading: false,
  error: null,
  success: false,
  dashboardList: {},

};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    resetDashboardState(state) {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.dashboardList = {};

    },
  },
  extraReducers: (builder) => {
    builder
      // Get dashboard list
      .addCase(getDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardList = action.payload;
      })
      .addCase(getDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch dashboard";
      })

  },
});

export const { resetDashboardState } = dashboardSlice.actions;
export default dashboardSlice.reducer;
