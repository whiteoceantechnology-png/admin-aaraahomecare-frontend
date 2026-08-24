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

const authFailurePattern =
  /(?:invalid|expired|missing|wrong).{0,40}(?:token|jwt|session|authentication)|(?:token|jwt|session).{0,40}(?:invalid|expired|missing|wrong)|unauthori[sz]ed/i;

const isInvalidAuthenticationResponse = (error) => {
  const response = error?.response;
  const requestUrl = error?.config?.url || "";
  if (requestUrl.includes("/admin/auth/login")) return false;
  if (!response || ![401, 403].includes(response.status)) return false;

  // The dashboard endpoint uses a plain 403 for an invalid Admin token, so
  // handle that known auth boundary even when the response has no message.
  if (response.status === 403 && requestUrl.includes("/admin/dashboard")) {
    return true;
  }

  const data = response.data;
  const details = [
    data?.message,
    data?.error,
    data?.error?.message,
    data?.code,
    data?.error?.code,
  ]
    .filter((value) => typeof value === "string")
    .join(" ");

  // 401 is an authentication failure by definition. A 403 is only treated
  // as one when the API explicitly describes an invalid/expired auth token;
  // ordinary permission/role denials must continue to their callers.
  return response.status === 401 || authFailurePattern.test(details);
};

// Centralized cleanup so every unauthorized path (401 interceptor, manual
// logout, etc.) clears the same state instead of duplicating it per-caller.
export const clearAuthAndRedirect = () => {
  if (isHandlingUnauthorized) return;
  isHandlingUnauthorized = true;

  localStorage.removeItem("token");
  store.dispatch(logout());
  persistor.purge();

  if (window.location.pathname !== "/auth") {
    window.location.replace("/auth");
  }
};

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isInvalidAuthenticationResponse(error)) {
      clearAuthAndRedirect();
      // Swallow the error so components mid-request don't run their
      // .catch/error-toast logic while the page is navigating away.
      return new Promise(() => {});
    }

    return Promise.reject(error);
  },
);

export default api;
