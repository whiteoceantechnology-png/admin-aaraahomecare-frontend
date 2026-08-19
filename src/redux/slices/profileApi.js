import api from "../../utils/api";

export const fetchProfile = () =>
  api.get("/admin/app/profile", {
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: false,
  });
