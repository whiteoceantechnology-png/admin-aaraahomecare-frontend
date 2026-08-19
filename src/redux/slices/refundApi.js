import api from "../../utils/api";

export const fetchAllRefunds = () =>
  api.post(
    "/admin/app/getrefundrequets",
    {},
    {
      headers: {
        "Content-Type": "application/json", // optional in GET, but included here per request
      },
      withCredentials: false,
    }
  );

export const editRefundRequest = ({ id, status }) =>
  api.post(
    "/admin/app/updaterefundrequest",
    { id, status },
    {
      headers: {
        "Content-Type": "application/json", // optional in GET, but included here per request
      },
      withCredentials: false,
    }
  );
