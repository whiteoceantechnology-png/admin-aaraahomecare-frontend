import api from "../../utils/api";

export const fetchAllDeleteReviewRequests = () =>
  api.post(
    "/admin/app/getreviewrequest",
    {},
    {
      headers: {
        "Content-Type": "application/json", // optional in GET, but included here per request
      },
      withCredentials: false,
    }
  );

export const editReviewRequest = ({ id, review_id, status }) =>
  api.post(
    "/admin/app/updatereviewrequest",
    { id, review_id, status },
    {
      headers: {
        "Content-Type": "application/json", // optional in GET, but included here per request
      },
      withCredentials: false,
    }
  );
