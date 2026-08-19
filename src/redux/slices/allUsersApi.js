import api from "../../utils/api";

export const fetchAllUsers = () =>
  api.post(
    "/admin/app/getallusers",
    {},
    {
      headers: {
        "Content-Type": "application/json", // optional in GET, but included here per request
      },
      withCredentials: false,
    }
  );

export const fetchUserDetail = (id) =>
  api.post("/admin/app/getalluserdeatils", id, {
    headers: {
      "Content-Type": "application/json", // optional in GET, but included here per request
    },
    withCredentials: false,
  });

export const editUserStatus = ({ id, status }) =>
  api.post(
    "/admin/app/updateuser",
    { id, status },
    {
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: false,
    }
  );
