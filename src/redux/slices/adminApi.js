import api from "../../utils/api";

export const createAdmin = (adminData) =>
  api.post("/admin/school/addAdmin", adminData, {
    // headers: { "Content-Type": "application/json" },
    withCredentials: false,
  });

export const fetchAdminList = () =>
  api.get("/admin/school/listAdmin", {
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: false,
  });
