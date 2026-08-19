import moment from "moment";

// Single source of truth for how dates render across the app: "12 Apr 2026".
export const formatDate = (value) => (value ? moment(value).format("DD MMM YYYY") : "—");

// Same date style, with time appended, for places where time-of-day matters
// (timelines, activity logs, "last updated" stamps).
export const formatDateTime = (value) =>
  value ? moment(value).format("DD MMM YYYY, h:mm A") : "—";
