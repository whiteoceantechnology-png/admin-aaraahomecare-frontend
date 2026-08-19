// Shared UI primitives for the Payments + Logistics pages — both reproduce
// the same reference prototype design system, so these live in one place
// rather than being duplicated per page.
export const Pill = ({ tone, children }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11.5px] font-semibold tracking-[0.02em] whitespace-nowrap ${tone}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
    {children}
  </span>
);

export const Chip = ({ active, onClick, children, count }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-3 py-[6px] rounded-full text-[12.5px] font-medium border cursor-pointer transition-colors ${
      active
        ? "bg-[var(--mk-primary-50)] border-[#C9C2EE] text-[var(--mk-primary)]"
        : "bg-white border-[var(--mk-line)] text-[var(--mk-ink-500)] hover:border-[#C9CFDA]"
    }`}
  >
    {children}
    {count != null && (
      <span className={`text-[10.5px] font-semibold rounded-full px-[6px] py-[1px] ${active ? "bg-[rgba(67,56,155,0.14)]" : "bg-black/[0.06]"}`}>{count}</span>
    )}
  </button>
);

export const Banner = ({ tone, icon: Icon, children }) => {
  const toneClass = {
    warn: "bg-[var(--mk-warn-bg)] text-[#7A3A08] border-[#F2D9B8]",
    info: "bg-[var(--mk-info-bg)] text-[#1D4ED8] border-[#C9DBFA]",
    ok: "bg-[var(--mk-ok-bg)] text-[#0B6B3E] border-[#BFE6CF]",
    dgr: "bg-[var(--mk-dgr-bg)] text-[#8E2A1F] border-[#F0C7C0]",
  }[tone];
  return (
    <div className={`flex items-start gap-2.5 px-[15px] py-3 rounded-[10px] text-[12.5px] mb-3.5 border ${toneClass}`}>
      <Icon size={15} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
};

export const Card = ({ children, className = "" }) => (
  <div className={`bg-white border border-[var(--mk-line)] rounded-[12px] ${className}`}>{children}</div>
);

export const PanelHead = ({ children, sub }) => (
  <div className="flex items-center gap-2.5 px-[18px] py-[14px] border-b border-[var(--mk-line)] text-[14px] font-semibold text-[var(--mk-ink-900)]">
    {children}
    {sub && <span className="ml-auto text-[11.5px] font-normal text-[var(--mk-ink-400)]">{sub}</span>}
  </div>
);

export const Kpi = ({ label, value, desc, tone }) => {
  const toneClass = { alert: "border-[#F2D9B8] bg-gradient-to-b from-white to-[#FFFBF4]", bad: "border-[#F3CCC6] bg-gradient-to-b from-white to-[#FFF7F5]" }[tone] || "";
  return (
    <div className={`border border-[var(--mk-line)] rounded-[12px] px-[18px] py-4 ${toneClass}`}>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-ink-400)]">{label}</p>
      <p className="text-[24px] font-semibold text-[var(--mk-ink-900)] mt-1.5 mb-0.5 tabular-nums">{value}</p>
      <p className="text-[12px] text-[var(--mk-ink-500)]">{desc}</p>
    </div>
  );
};

export const HBar = ({ label, pct, color = "var(--mk-primary)" }) => (
  <div className="grid grid-cols-[92px_1fr_34px] gap-[10px] items-center text-[12.5px] font-medium text-[var(--mk-ink-700)]">
    <span>{label}</span>
    <div className="h-[22px] rounded-[6px] bg-[var(--mk-bg)] overflow-hidden">
      <div className="h-full rounded-[6px]" style={{ width: `${pct}%`, background: color }} />
    </div>
    <span className="text-right tabular-nums">{pct}%</span>
  </div>
);

export const Insight = ({ icon: Icon, bg, color, children }) => (
  <li className="flex gap-[11px] py-[9px] border-b border-dashed border-[var(--mk-line)] last:border-b-0 text-[12.5px] text-[var(--mk-ink-700)]">
    <span className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center shrink-0" style={{ background: bg, color }}>
      <Icon size={14} />
    </span>
    <div>{children}</div>
  </li>
);

export const TableShell = ({ head, children }) => (
  <div className="overflow-auto">
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {head.map((h, i) => (
            <th
              key={i}
              className={`sticky top-0 bg-[#FAFBFD] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--mk-ink-400)] text-left px-[14px] py-[10px] border-b border-[var(--mk-line)] whitespace-nowrap ${
                h.num ? "text-right" : ""
              }`}
            >
              {h.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

export const Td = ({ children, num, className = "" }) => (
  <td className={`px-[14px] py-[11px] border-b border-[var(--mk-line)] align-middle text-[13px] text-[var(--mk-ink-700)] ${num ? "text-right tabular-nums" : ""} ${className}`}>
    {children}
  </td>
);

export const Search = ({ value, onChange, placeholder }) => (
  <div className="relative flex-[0_1_280px] min-w-[220px]">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[var(--mk-ink-400)]">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-[38px] rounded-[8px] border border-[#D6DCE6] pl-[34px] pr-3 outline-none bg-white text-[13.5px] focus:border-[var(--mk-primary)] focus:ring-2 focus:ring-[var(--mk-primary-ring)]"
    />
  </div>
);

export const Sel = (props) => (
  <select
    {...props}
    className="h-[38px] rounded-[8px] border border-[#D6DCE6] px-[10px] bg-white text-[var(--mk-ink-700)] text-[13.5px] outline-none focus:border-[var(--mk-primary)]"
  />
);

export const BtnPri = ({ children, className = "", ...p }) => (
  <button {...p} className={`inline-flex items-center gap-2 h-[38px] px-4 rounded-[8px] text-[13px] font-semibold bg-[var(--mk-primary)] text-white hover:bg-[var(--mk-primary-hover)] transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${className}`}>
    {children}
  </button>
);

export const BtnSec = ({ children, className = "", ...p }) => (
  <button {...p} className={`inline-flex items-center gap-2 h-[38px] px-4 rounded-[8px] text-[13px] font-semibold bg-white text-[var(--mk-ink-700)] border border-[var(--mk-line)] hover:border-[#C9CFDA] hover:text-[var(--mk-ink-900)] transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${className}`}>
    {children}
  </button>
);

export const BtnDgr = ({ children, className = "", ...p }) => (
  <button {...p} className={`inline-flex items-center gap-2 h-[38px] px-4 rounded-[8px] text-[13px] font-semibold bg-[var(--mk-dgr)] text-white hover:brightness-105 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${className}`}>
    {children}
  </button>
);

export const Fld = ({ label, error, children }) => (
  <div className="flex flex-col gap-1.5 mb-3.5">
    <label className="text-[12.5px] font-medium text-[var(--mk-ink-700)]">{label}</label>
    {children}
    {error && <span className="text-[11.5px] font-medium text-[var(--mk-dgr)]">{error}</span>}
  </div>
);

export const fldClass = (bad) =>
  `h-10 w-full rounded-[8px] border px-3 bg-white outline-none text-[13.5px] ${
    bad ? "border-[var(--mk-dgr)] focus:ring-2 focus:ring-[var(--mk-dgr)]/15" : "border-[#D6DCE6] focus:border-[var(--mk-primary)] focus:ring-2 focus:ring-[var(--mk-primary-ring)]"
  }`;

export const Timeline = ({ items }) => (
  <ol className="relative pl-5">
    <span className="absolute left-[6px] top-[6px] bottom-[6px] w-[2px] bg-[var(--mk-line)]" />
    {items.map((e, i) => {
      const dotColor = e.k === "ok" ? "border-[var(--mk-ok)]" : e.k === "warn" ? "border-[var(--mk-warn)]" : e.k === "dgr" ? "border-[var(--mk-dgr)]" : "border-[var(--mk-ink-400)]";
      return (
        <li key={i} className="relative pb-[14px] last:pb-0 text-[12.5px] text-[var(--mk-ink-700)]">
          <span className={`absolute -left-[18.5px] top-1 w-[10px] h-[10px] rounded-full bg-white border-2 ${dotColor}`} />
          <span className="font-semibold text-[var(--mk-ink-900)] text-[12.5px]">{e.l}</span>
          <span className="text-[var(--mk-ink-400)] text-[11.5px] ml-1.5">{e.t}</span>
        </li>
      );
    })}
  </ol>
);

export const fmt = (n) => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const r2 = (n) => Math.round(n * 100) / 100;
