import api from "../../utils/api";

export const fetchAllPartners = () =>
  api.post(
    "/admin/app/getallpartner",
    {},
    {
      headers: {
        "Content-Type": "application/json", // optional in GET, but included here per request
      },
      withCredentials: false,
    }
  );

export const editPartnerDetail = (formData) =>
  api.post("/admin/app/editpartner", formData, {
    // ✅ Do NOT set Content-Type manually
    withCredentials: false,
  });

export const fetchPartnerDetail = (id) =>
  api.post("/admin/app/getallpartnerdetails", id, {
    headers: {
      "Content-Type": "application/json", // optional in GET, but included here per request
    },
    withCredentials: false,
  });

export const fetchStoreServices = (id) =>
  api.post("/admin/app/getservices", id, {
    headers: {
      "Content-Type": "application/json", // optional in GET, but included here per request
    },
    withCredentials: false,
  });

export const editPartnerStatus = ({ id, status }) =>
  api.post(
    "/admin/app/updatepartner",
    { id, status },
    {
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: false,
    }
  );

export const createPayout = ({ store_id, amount }) =>
  api.post(
    "/admin/app/addpayout",
    { store_id, amount },
    {
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: false,
    }
  );

export const fetchAllPayoutLogs = (id) =>
  api.post("/admin/app/getpayoutlogs", id, {
    headers: {
      "Content-Type": "application/json", // optional in GET, but included here per request
    },
    withCredentials: false,
  });

export const removePartner = (id) =>
  api.post(
    "/admin/app/deletePartner",
    { id },
    {
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: false,
    }
  );

export const editMultiplePartner = ({ ids, status }) =>
  api.post(
    "/admin/app/updateMultiplePartner",
    { ids, status },
    {
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: false,
    }
  );
