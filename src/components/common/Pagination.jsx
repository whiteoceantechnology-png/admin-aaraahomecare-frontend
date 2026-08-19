// Shared pagination control: prev/next, page numbers, rows-per-page selector,
// and a "Showing X-Y of Z entries" summary. Used across list/table pages so
// pagination behaves and looks the same everywhere.
const Pagination = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 25, 50, 100],
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const delta = 1;
    const middle = [];
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      middle.push(i);
    }

    const withEllipses = [1];
    if (currentPage - delta > 2) withEllipses.push("...");
    withEllipses.push(...middle);
    if (currentPage + delta < totalPages - 1) withEllipses.push("...");
    if (totalPages > 1) withEllipses.push(totalPages);

    return withEllipses.filter((v, i, arr) => arr.indexOf(v) === i);
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-white">
      <div className="flex flex-wrap items-center gap-3 text-[12px] font-medium text-gray-500">
        <span>
          Showing <span className="font-medium text-gray-700">{startItem}</span>
          –<span className="font-medium text-gray-700">{endItem}</span> of{" "}
          <span className="font-medium text-gray-700">{totalItems}</span>{" "}
          entries
        </span>

        {onItemsPerPageChange && (
          <label className="flex items-center gap-1.5">
            <span>Rows:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="border border-gray-200 rounded-lg text-[12px] font-medium px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--brand-purple)]/25 cursor-pointer"
            >
              {itemsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 ${
            currentPage === 1
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-600 hover:bg-gray-100 cursor-pointer active:scale-95"
          }`}
        >
          Prev
        </button>

        {pages.map((p, idx) =>
          p === "..." ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-1.5 text-sm text-gray-400 select-none"
            >
              …
            </span>
          ) : (
            <button
              type="button"
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === currentPage ? "page" : undefined}
              className={`min-w-8 h-8 px-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 cursor-pointer active:scale-95 ${
                p === currentPage
                  ? "bg-[var(--brand-purple)] text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 ${
            currentPage === totalPages
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-600 hover:bg-gray-100 cursor-pointer active:scale-95"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;
