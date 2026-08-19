import api from "../../utils/api";

export const fetchActiveBanners = () =>
  api.post(
    "/admin/app/getactivebanner",
    {},
    {
      headers: {
        "Content-Type": "application/json", // optional in GET, but included here per request
      },
      withCredentials: false,
    }
  );

export const createBanner = (formDataToSend) =>
  api.post("/admin/app/addbanner", formDataToSend, {
    withCredentials: false,
  });

export const editBanner = (formDataToSend) =>
  api.post("/admin/app/updatebanner", formDataToSend, {
    withCredentials: false,
  });

export const removeBanner = (id) =>
  api.post("/admin/app/deletebanner", id, {
    headers: {
      "Content-Type": "application/json", // optional in GET, but included here per request
    },
    withCredentials: false,
  });
