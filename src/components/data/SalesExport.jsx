// Sales Export — GET /admin/reports/sales-export
//
// The report itself comes from the backend. This page only supplies the
// filters (month / product / SKU) and renders what comes back:
//   format=json -> the table below
//   format=xlsx -> Export Excel
//   format=csv  -> Export CSV
//
// The table's COLUMNS are derived from the keys of the rows the API returns,
// not from a hardcoded list. That is deliberate: the report's column set is
// the backend's to define, and inventing one here would silently drop or
// mislabel fields when it changes.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
  ChevronDown,
} from "lucide-react";

import {
  fetchSalesExportJson,
  downloadSalesExport,
} from "../../redux/slices/reportsApi";
import { getAllProducts } from "../../redux/slices/productSlice";

const fldClass =
  "h-10 w-full px-[12px] rounded-lg border border-[var(--mk-line)] text-[14px] font-medium text-[var(--mk-ink-900)] bg-white outline-none transition-colors focus:ring-2 focus:ring-[var(--mk-primary-ring)] focus:border-[var(--mk-primary)]";

// "2026-10" for the month input's YYYY-MM value.
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// "totalAmount" / "total_amount" -> "Total Amount". Only used for column
// headers, so an unexpected key still renders readably.
const humanize = (key) =>
  String(key)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const isNumeric = (v) => typeof v === "number" || (v !== "" && !Number.isNaN(Number(v)));

const renderCell = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "number")
    return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return String(value);
};

// The report body is { month, productId, sku, totalRows, columns, rows }.
// It may or may not sit inside the project's { success, data } envelope, so
// both are accepted. `columns` is the API's own ordered header list and is
// used as-is — deriving headers from a row's keys would drop any column that
// happens to be absent from the first row.
const reportFrom = (body) => {
  const payload = body?.data ?? body;
  if (Array.isArray(payload)) {
    return { rows: payload, columns: [], totalRows: payload.length };
  }
  const rows =
    payload?.rows || payload?.items || payload?.sales || payload?.report || [];
  const columns = Array.isArray(payload?.columns) ? payload.columns : [];
  return {
    rows: Array.isArray(rows) ? rows : [],
    columns,
    totalRows: Number(payload?.totalRows ?? (Array.isArray(rows) ? rows.length : 0)),
  };
};

// Columns whose values are long prose. They get a width cap and an ellipsis
// so one 200-character description cannot stretch a row to fill the screen —
// the full text stays available on hover.
const isLongTextColumn = (col) => /description|address|remark|note/i.test(col);

// Single-select, searchable product picker.
//
// It SHOWS the product name and reports the product ID: `onChange` is called
// with the id, which is what goes to the report API. The name is never sent.
const ProductSelect = ({ products, value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef(null);

  const selected = useMemo(
    () => products.find((p) => String(p.id) === String(value)) || null,
    [products, value],
  );

  // Close on an outside click or Escape, like the other dropdowns here.
  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) =>
      String(p.name ?? "").toLowerCase().includes(term),
    );
  }, [products, query]);

  const pick = (product) => {
    onChange(product ? String(product.id) : "");
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`${fldClass} flex items-center justify-between gap-2 text-left disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer`}
      >
        <span
          className={`truncate ${selected ? "" : "text-[var(--mk-ink-400)]"}`}
        >
          {selected ? selected.name : "All products"}
        </span>
        <ChevronDown size={15} className="shrink-0 text-[var(--mk-ink-400)]" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-[260px] rounded-lg border border-[var(--mk-line)] bg-white shadow-lg">
          <div className="p-2 border-b border-[var(--mk-line)]">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search product name"
              className="h-8 w-full px-2 rounded-md border border-[var(--mk-line)] text-[13px] outline-none focus:border-[var(--mk-primary)]"
            />
          </div>
          <div className="max-h-[220px] overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => pick(null)}
              className={`w-full px-3 py-2 text-left text-[13px] hover:bg-gray-50 cursor-pointer ${
                !selected ? "font-semibold text-[var(--mk-ink-900)]" : "text-[var(--mk-ink-700)]"
              }`}
            >
              All products
            </button>
            {visible.length === 0 ? (
              <p className="!m-0 px-3 py-3 text-[12.5px] text-[var(--mk-ink-500)]">
                No product matches that search.
              </p>
            ) : (
              visible.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p)}
                  title={`${p.name} · ID ${p.id}`}
                  className={`w-full px-3 py-2 text-left text-[13px] hover:bg-gray-50 cursor-pointer truncate ${
                    String(p.id) === String(value)
                      ? "font-semibold text-[var(--mk-ink-900)]"
                      : "text-[var(--mk-ink-700)]"
                  }`}
                >
                  {p.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Card = ({ title, action, children }) => (
  <div className="bg-white rounded-[10px] border border-[var(--mk-line)] p-5">
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
      <h3 className="!text-[15px] !font-semibold !m-0 text-[var(--mk-ink-900)]">
        {title}
      </h3>
      {action}
    </div>
    {children}
  </div>
);

const SalesExport = ({ title = "Sales Export" }) => {
  const dispatch = useDispatch();
  // The existing Products API/slice — no new endpoint for the dropdown.
  const { products: productList = [] } = useSelector(
    (state) => state.product || {},
  );

  const [month, setMonth] = useState(currentMonth);
  const [productId, setProductId] = useState("");
  const [sku, setSku] = useState("");

  const [rows, setRows] = useState([]);
  const [apiColumns, setApiColumns] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(null); // "xlsx" | "csv" | null

  // The filters the CURRENT table was fetched with, so the export buttons
  // always send exactly what is on screen.
  const filters = useMemo(
    () => ({ month, productId, sku }),
    [month, productId, sku],
  );

  const load = useCallback(async (active) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSalesExportJson(active);
      const report = reportFrom(res.data);
      setRows(report.rows);
      setApiColumns(report.columns);
      setTotalRows(report.totalRows);
    } catch (err) {
      setRows([]);
      setApiColumns([]);
      setTotalRows(0);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load the sales report",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Loads on mount with the current month, then whenever the month changes.
  // Product/SKU are applied via Apply filters so typing a SKU doesn't fire a
  // request per keystroke.
  useEffect(() => {
    dispatch(getAllProducts());
  }, [dispatch]);

  // Only id and name are needed; sorted so the list is scannable.
  const productOptions = useMemo(
    () =>
      (Array.isArray(productList) ? productList : [])
        .filter((p) => p?.id != null)
        .map((p) => ({ id: p.id, name: p.name ?? p.productName ?? `#${p.id}` }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [productList],
  );

  useEffect(() => {
    load({ month, productId, sku });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const handleExport = async (format) => {
    if (exporting) return;
    setExporting(format);
    let url;
    try {
      const res = await downloadSalesExport(filters, format);
      const type =
        format === "csv"
          ? "text/csv"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const blob =
        res.data instanceof Blob ? res.data : new Blob([res.data], { type });

      // Prefer the server's own filename when it sends one.
      const disposition =
        res.headers?.["content-disposition"] ||
        res.headers?.get?.("content-disposition") ||
        "";
      const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
      const fallback = `sales-export-${month || "all"}.${format}`;
      const filename = match ? decodeURIComponent(match[1]) : fallback;

      url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success(`${format.toUpperCase()} downloaded`);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || `Failed to export ${format.toUpperCase()}`,
      );
    } finally {
      // Released as soon as the click is dispatched — an un-revoked object
      // URL keeps the whole file in memory for the life of the document.
      if (url) URL.revokeObjectURL(url);
      setExporting(null);
    }
  };

  const columns = useMemo(() => {
    if (apiColumns.length > 0) return apiColumns;
    // Only when the response carries no `columns`: union the keys across ALL
    // rows, not just the first, so a field missing from row 1 still shows.
    const keys = [];
    rows.forEach((r) => {
      if (!r || typeof r !== "object") return;
      Object.keys(r).forEach((k) => {
        if (!keys.includes(k)) keys.push(k);
      });
    });
    return keys;
  }, [apiColumns, rows]);

  const busy = loading || !!exporting;

  return (
    <div className="space-y-[18px]">
      <div className="flex items-baseline gap-3 min-w-0">
        <h2 className="!text-[24px] !font-bold !leading-[1.2] !m-0 text-[var(--mk-ink-900)] tracking-[-0.01em] shrink-0">
          {title}
        </h2>
        <p className="text-[13px] font-medium text-[var(--mk-ink-500)] leading-[1.4] truncate">
          Monthly sales report with product and SKU filters
        </p>
      </div>

      {/* FILTERS */}
      <Card
        title="Report filters"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExport("xlsx")}
              disabled={busy}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-[12.5px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {exporting === "xlsx" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={15} />
              )}
              {exporting === "xlsx" ? "Exporting…" : "Export Excel"}
            </button>
            <button
              type="button"
              onClick={() => handleExport("csv")}
              disabled={busy}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-[12.5px] font-semibold text-[var(--mk-ink-700)] border border-[var(--mk-line)] bg-white hover:border-[#C9CFDA] hover:text-[var(--mk-ink-900)] transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {exporting === "csv" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Download size={15} />
              )}
              {exporting === "csv" ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--mk-ink-700)]">
              Month
            </span>
            {/* YYYY-MM, exactly the format the API expects. */}
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={fldClass}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--mk-ink-700)]">
              Product
            </span>
            {/* Shows the NAME, reports the ID — productId is what reaches
                the report API. */}
            <ProductSelect
              products={productOptions}
              value={productId}
              onChange={setProductId}
              disabled={busy}
            />
          </div>

          {/* <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--mk-ink-700)]">
              SKU
            </span>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. CP-100"
              className={fldClass}
            />
          </label> */}

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => load(filters)}
              disabled={busy}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-[13px] font-semibold text-white bg-[var(--mk-ink-900)] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Search size={15} />
              )}
              Apply filters
            </button>
            <button
              type="button"
              onClick={() => {
                setProductId("");
                setSku("");
                load({ month });
              }}
              disabled={busy}
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-[var(--mk-line)] bg-white text-[var(--mk-ink-700)] hover:border-[#C9CFDA] transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              title="Reset product and SKU filters"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </Card>

      {/* REPORT TABLE */}
      <Card
        title="Sales report"
        action={
          !loading &&
          !error && (
            <span className="text-[12.5px] font-medium text-[var(--mk-ink-500)]">
              {/* The API's own totalRows, with the rendered count beside it
                  when they differ so a truncated response is visible. */}
              {rows.length}
              {totalRows && totalRows !== rows.length ? ` of ${totalRows}` : ""}{" "}
              row{rows.length === 1 ? "" : "s"}
              {columns.length ? ` · ${columns.length} columns` : ""}
              {month ? ` · ${month}` : ""}
            </span>
          )
        }
      >
        {loading ? (
          <p className="!m-0 py-12 text-center text-[13px] text-[var(--mk-ink-500)]">
            <Loader2 size={16} className="inline animate-spin mr-2" />
            Loading sales report…
          </p>
        ) : error ? (
          <div className="py-10 flex flex-col items-center text-center">
            <span className="flex items-center justify-center w-11 h-11 rounded-full bg-red-50 text-red-500 mb-3">
              <AlertTriangle size={20} />
            </span>
            <p className="!m-0 text-[14px] font-semibold text-[var(--mk-ink-900)]">
              Couldn&apos;t load the sales report
            </p>
            <p className="!m-0 mt-1 text-[12.5px] text-[var(--mk-ink-500)] max-w-md">
              {error}
            </p>
            <button
              type="button"
              onClick={() => load(filters)}
              className="mt-4 inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-[12.5px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] transition-colors cursor-pointer"
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <p className="!m-0 py-12 text-center text-[13px] text-[var(--mk-ink-500)]">
            No sales found for this period and filter.
          </p>
        ) : (
          /* Horizontal scroll for all 33 columns, vertical scroll for the
             rows, and a sticky header so the column names stay put. */
          <div className="overflow-auto max-h-[70vh] border border-[var(--mk-line)] rounded-lg">
            {/* min-w-max, NOT w-full: with w-full the 33 columns are squeezed
                into the container width and the 200-character Item
                Description wraps into a cell tall enough to fill the screen,
                which is why only the first row appeared to render. Sizing to
                content instead keeps every row one line tall and lets the
                container scroll sideways. */}
            <table className="min-w-max text-[13px] border-collapse">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--mk-ink-500)] border-b border-[var(--mk-line)]">
                  {columns.map((c) => (
                    <th key={c} className="px-3 py-2.5 whitespace-nowrap bg-white">
                      {humanize(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--mk-line)]">
                {rows.map((row, i) => (
                  <tr
                    key={`${row?.["Order ID *"] ?? row?.id ?? "row"}-${i}`}
                    className="hover:bg-gray-50/70 transition-colors"
                  >
                    {columns.map((c) => {
                      const value = row?.[c];
                      const long = isLongTextColumn(c);
                      return (
                        <td
                          key={c}
                          title={long ? String(value ?? "") : undefined}
                          className={`px-3 py-2.5 align-top text-[var(--mk-ink-700)] ${
                            long
                              ? "max-w-[280px] truncate"
                              : "whitespace-nowrap"
                          } ${isNumeric(value) ? "text-right tabular-nums" : ""}`}
                        >
                          {renderCell(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SalesExport;
