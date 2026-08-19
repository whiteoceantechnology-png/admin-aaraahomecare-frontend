import api from "../../utils/api"; // axios instance

export const loginRequest = (credentials) =>
  api.post("/admin/auth/login", credentials, {
    headers: {
      "Content-Type": "application/json",
    },
    // Remove withCredentials if the server does not use cookies
    withCredentials: false,
  });
