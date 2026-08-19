import axios from "axios";
import store, { persistor } from "../redux/store";
import { logout } from "../redux/slices/authSlice";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

// Request interceptor to attach token as adminauthtoken header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

let isHandlingUnauthorized = false;

// Centralized cleanup so every unauthorized path (401 interceptor, manual
// logout, etc.) clears the same state instead of duplicating it per-caller.
export const clearAuthAndRedirect = () => {
  if (isHandlingUnauthorized || window.location.pathname === "/auth") {
    return;
  }
  isHandlingUnauthorized = true;

  localStorage.removeItem("token");
  store.dispatch(logout());
  persistor.purge();

  window.location.replace("/auth");
};

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message;

    if (status === 401 || message === "Invalid or expired token") {
      clearAuthAndRedirect();
      // Swallow the error so components mid-request don't run their
      // .catch/error-toast logic while the page is navigating away.
      return new Promise(() => {});
    }

    return Promise.reject(error);
  },
);

export default api;
