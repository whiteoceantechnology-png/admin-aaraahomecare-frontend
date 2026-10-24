import api from "../../utils/api";

// Sales Export report — GET /admin/reports/sales-export
//
// One endpoint, three representations chosen by `format`. Every call goes
// through the shared axios client, so the admin bearer token is attached by
// its request interceptor; no token is handled here.
//
// Query parameters are only sent when they have a value — an empty product
// or SKU filter must not go out as `productId=` and narrow the report to
// nothing.
const withParams = ({ month, productId, sku } = {}) => {
  const params = {};
  if (month) params.month = month;
  if (productId !== undefined && productId !== null && productId !== "")
    params.productId = productId;
  if (sku) params.sku = sku;
  return params;
};

/** The report as JSON rows, for the on-screen table. */
export const fetchSalesExportJson = (filters = {}) =>
  api.get("/admin/reports/sales-export", {
    params: { ...withParams(filters),  format: "json" },
    headers: { Accept: "application/json" },
  });

/**
 * The report as a downloadable file.
 *
 * `responseType: "blob"` is essential: without it axios parses the body as
 * text and a binary .xlsx arrives corrupted. CSV is requested the same way
 * so both downloads share one code path.
 */
export const downloadSalesExport = (filters = {}, format = "xlsx") => {
  const csv = format === "csv";
  return api.get("/admin/reports/sales-export", {
    // Excel is the endpoint's DEFAULT representation and the documented call
    // for it sends no `format` at all, so none is sent here. Inventing
    // `format=xlsx` would rely on the backend accepting a value its own
    // contract never shows.
    params: { ...withParams(filters), ...(csv ? { format: "csv" } : {}) },
    responseType: "blob",
    headers: {
      Accept: csv
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
};
