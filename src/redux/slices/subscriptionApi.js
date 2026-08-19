import api from "../../utils/api";

export const fetchAllSubscriptions = () =>
  api.post(
    "/admin/app/getallsubscriptions",
    {},
    {
      headers: {
        "Content-Type": "application/json", // optional in GET, but included here per request
      },
      withCredentials: false,
    }
  );

export const createSubscription = (subscriptionData) =>
  api.post("/admin/app/addsubscription", subscriptionData, {
    headers: {
      "Content-Type": "application/json", // optional in GET, but included here per request
    },
    withCredentials: false,
  });

export const editSubscription = (subscriptionData) =>
  api.post("/admin/app/updatesubscription", subscriptionData, {
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: false,
  });

export const editSubscriptionStatus = ({ id, status }) =>
  api.post(
    "/admin/app/updatesubscription",
    { id, status },
    {
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: false,
    }
  );
