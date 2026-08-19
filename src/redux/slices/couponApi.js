import api from "../../utils/api";

export const fetchAllCoupons = () =>
  api.post(
    "/admin/app/getallcoupons",
    {},
    {
      headers: {
        "Content-Type": "application/json", // optional in GET, but included here per request
      },
      withCredentials: false,
    }
  );

export const createCoupon = (couponData) =>
  api.post("/admin/app/addcoupons", couponData, {
    headers: {
      "Content-Type": "application/json", // optional in GET, but included here per request
    },
    withCredentials: false,
  });

export const editCoupon = (couponData) =>
  api.post("/admin/app/updatecoupons", couponData, {
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: false,
  });

export const removeCoupon = (id) =>
  api.post("/admin/app/deletecoupons", id, {
    headers: {
      "Content-Type": "application/json", // optional in GET, but included here per request
    },
    withCredentials: false,
  });
