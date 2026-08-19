// Compact stat block used in stats rows on detail pages.
const StatTile = ({ icon: Icon, label, value, tone = "purple" }) => {
  const toneClass =
    tone === "gold"
      ? "bg-[var(--brand-gold)]/10 text-[var(--brand-gold-dark)]"
      : "bg-[var(--brand-purple)]/10 text-[var(--brand-purple)]";

  return (
    <div className="flex items-center gap-3.5 bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-300 ease-out p-4 animate-fade-in-up">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${toneClass}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-[16px] font-medium text-gray-900 truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
};

export default StatTile;
