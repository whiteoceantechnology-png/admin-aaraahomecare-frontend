import api from "../../utils/api";

export const fetchDashboard = () =>
  api.get("/admin/dashboard", {
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: false,
  });
