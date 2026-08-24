// Reusable premium table shell used by every list page in the app.
// Callers pass a `columns` config + already-paginated `data`; this component
// owns header/row markup, alignment, truncation+tooltip, zebra striping,
// hover state, sticky header, and the trailing actions column.
//
// The sticky header lives inside its own bounded, self-contained scroll
// container (overflow-auto + maxHeight) rather than relying on the page's
// scroll position — coupling `sticky` to an ancestor's height (e.g. the app
// header) is fragile and breaks the moment this table is reused somewhere
// with a different layout.
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";

const ALIGN_CLASS = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const JUSTIFY_CLASS = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

const CommonTable = ({
  columns,
  data,
  keyField = "id",
  sortField,
  sortDirection = "asc",
  onSort,
  emptyMessage = "No records found",
  minWidth = "640px",
  maxHeight = "640px",
  zebra = true,
  renderRowActions,
  actionsHeader = "Actions",
  actionsWidth = "130px",
  rowPaddingY = "py-3",
  rowMinH = "min-h-8",
  fixedLayout = false,
  onRowClick,
  onCellClick,
  headerBgClass = "bg-gray-50",
  headerTextClass = "text-[14px] font-semibold text-gray-500 tracking-wide",
  headerHeightClass = "h-11",
  rowClassName,
}) => {
  const totalCols = columns.length + (renderRowActions ? 1 : 0);

  return (
    <div className="overflow-auto" style={{ maxHeight }}>
      <table
        className="w-full border-collapse"
        style={{ minWidth, tableLayout: fixedLayout ? "fixed" : "auto" }}
      >
        <thead
          className={`sticky top-0 z-10 ${headerBgClass} border-b border-gray-200`}
        >
          <tr>
            {columns.map((col) => {
              const align = col.align || "left";
              return (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => onSort?.(col.key) : undefined}
                  style={
                    col.width
                      ? { width: col.width, minWidth: col.width }
                      : undefined
                  }
                  className={`${headerHeightClass} px-[14px] py-0 ${headerTextClass} uppercase whitespace-nowrap ${ALIGN_CLASS[align]} ${
                    col.sortable
                      ? "cursor-pointer select-none hover:text-gray-700"
                      : ""
                  }`}
                >
                  <span
                    className={`flex w-full items-center gap-1 leading-none ${JUSTIFY_CLASS[align]}`}
                  >
                    {col.header}
                    {col.sortable &&
                      (sortField === col.key ? (
                        sortDirection === "asc" ? (
                          <ArrowUp
                            size={12}
                            className="text-gray-400 shrink-0"
                          />
                        ) : (
                          <ArrowDown
                            size={12}
                            className="text-gray-400 shrink-0"
                          />
                        )
                      ) : (
                        <ChevronsUpDown
                          size={12}
                          className="text-gray-300 shrink-0"
                        />
                      ))}
                  </span>
                </th>
              );
            })}
            {renderRowActions && (
              <th
                style={{ width: actionsWidth, minWidth: actionsWidth }}
                className={`${headerHeightClass} px-[14px] py-0 text-center ${headerTextClass} uppercase`}
              >
                {actionsHeader}
              </th>
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--mk-line)]">
          {data.length > 0 ? (
            data.map((item, index) => (
              <tr
                key={item?.[keyField] ?? index}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={`transition-colors hover:bg-[var(--brand-purple)]/[0.045] ${
                  onRowClick ? "cursor-pointer" : ""
                } ${zebra && index % 2 === 1 ? "bg-gray-50/50" : "bg-white"} ${rowClassName?.(item, index) || ""}`}
              >
                {columns.map((col) => {
                  const align = col.align || "left";
                  const rawValue = item?.[col.key];
                  const tooltipText = col.tooltip
                    ? col.tooltip(item)
                    : typeof rawValue === "string" ||
                        typeof rawValue === "number"
                      ? rawValue
                      : undefined;

                  return (
                    <td
                      key={col.key}
                      onClick={(event) => onCellClick?.(item, col.key, event)}
                      style={
                        col.width
                          ? { width: col.width, minWidth: col.width }
                          : undefined
                      }
                      className={`px-[14px] ${rowPaddingY} align-middle text-[13px] font-medium text-gray-700 ${ALIGN_CLASS[align]} ${col.className || ""}`}
                    >
                      <div
                        className={`flex items-center ${rowMinH} ${
                          align === "center"
                            ? "justify-center"
                            : align === "right"
                              ? "justify-end"
                              : "justify-start"
                        }`}
                      >
                        {col.truncate ? (
                          <span
                            className="block truncate"
                            style={{ maxWidth: col.truncateWidth || "320px" }}
                            title={tooltipText ?? undefined}
                          >
                            {col.render
                              ? col.render(item, index)
                              : (rawValue ?? "—")}
                          </span>
                        ) : col.render ? (
                          col.render(item, index)
                        ) : (
                          (rawValue ?? "—")
                        )}
                      </div>
                    </td>
                  );
                })}
                {renderRowActions && (
                  <td
                    className={`px-2 ${rowPaddingY} align-middle`}
                    onClick={
                      onRowClick ? (e) => e.stopPropagation() : undefined
                    }
                  >
                    <div className="flex items-center justify-center gap-1">
                      {renderRowActions(item, index)}
                    </div>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={totalCols}
                className="px-4 py-14 text-center text-sm text-gray-400"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CommonTable;
