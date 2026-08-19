import api from "../../utils/api";

export const fetchAllNotifications = () =>
  api.post(
    "/admin/app/getalnotification",
    {},
    {
      headers: {
        "Content-Type": "application/json", // optional in GET, but included here per request
      },
      withCredentials: false,
    }
  );

export const createNotification = (notificationData) =>
  api.post("/admin/app/addnotification", notificationData, {
    headers: {
      "Content-Type": "application/json", // optional in GET, but included here per request
    },
    withCredentials: false,
  });
