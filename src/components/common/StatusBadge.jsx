// Compact, premium status pill. Covers the status vocabularies used across
// modules (active/inactive, order lifecycle, review moderation, etc.) with a
// sensible default for anything unmapped; pass `tone` to override directly.
const TONE_BY_KEYWORD = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  confirmed: "bg-blue-50 text-blue-700 ring-blue-600/20",
  shipped: "bg-blue-50 text-blue-700 ring-blue-600/20",
  processing: "bg-amber-50 text-amber-700 ring-amber-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  inactive: "bg-gray-100 text-gray-600 ring-gray-500/20",
  expired: "bg-gray-100 text-gray-600 ring-gray-500/20",
  disabled: "bg-gray-100 text-gray-600 ring-gray-500/20",
  cancelled: "bg-red-50 text-red-700 ring-red-600/20",
  canceled: "bg-red-50 text-red-700 ring-red-600/20",
  rejected: "bg-red-50 text-red-700 ring-red-600/20",
  failed: "bg-red-50 text-red-700 ring-red-600/20",
};

const StatusBadge = ({ status, tone }) => {
  const key = (status ?? "").toString().toLowerCase();
  const toneClass = tone || TONE_BY_KEYWORD[key] || "bg-gray-100 text-gray-600 ring-gray-500/20";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold capitalize ring-1 ring-inset whitespace-nowrap ${toneClass}`}
    >
      {status || "—"}
    </span>
  );
};

export default StatusBadge;
