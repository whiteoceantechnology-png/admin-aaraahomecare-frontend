// Calendar-based date filter for the Orders toolbar. One control handles
// both a single-day filter (one click) and a date-range filter (click a
// second day), matching react-datepicker's own `selectsRange` interaction —
// no separate mode toggle needed. Reuses the same DatePicker +
// "custom-datepicker" calendar styling already established in
// CouponForm.jsx, just wired for filtering instead of form input.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar, X } from "lucide-react";
import { FILTER_SELECT_CLASS as selectClass } from "./filterToolbarStyles";

const fmt = (d) => (d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "");

const OrderDateFilter = ({ startDate, endDate, onChange }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left });
    };
    updatePosition();

    const handleClickOutside = (e) => {
      const insideTrigger = triggerRef.current?.contains(e.target);
      const insidePanel = panelRef.current?.contains(e.target);
      if (!insideTrigger && !insidePanel) setOpen(false);
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const hasFilter = !!startDate;
  const label = !startDate
    ? "All dates"
    : !endDate || endDate.getTime() === startDate.getTime()
      ? fmt(startDate)
      : `${fmt(startDate)} – ${fmt(endDate)}`;

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Filter by date"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${selectClass} shrink-0 flex items-center gap-1.5`}
      >
        <Calendar size={14} className="text-[var(--mk-ink-400)]" />
        <span className={hasFilter ? "text-[var(--mk-ink-900)]" : "text-[var(--mk-ink-500)]"}>{label}</span>
        {hasFilter && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange(null, null);
            }}
            aria-label="Clear date filter"
            className="ml-0.5 text-[var(--mk-ink-400)] hover:text-[var(--mk-ink-700)] cursor-pointer"
          >
            <X size={13} />
          </span>
        )}
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="z-50 bg-white rounded-lg border border-[var(--mk-line)] shadow-lg overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-[var(--mk-line)] text-[11.5px] text-[var(--mk-ink-500)]">
              Click a date for a single day, click a second date for a range
            </div>
            <DatePicker
              selected={startDate}
              onChange={(dates) => {
                const [start, end] = dates;
                onChange(start, end);
              }}
              startDate={startDate}
              endDate={endDate}
              selectsRange
              inline
              calendarClassName="custom-datepicker"
              maxDate={new Date()}
            />
            <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--mk-line)] bg-[#FAFBFD]">
              <button
                type="button"
                onClick={() => onChange(null, null)}
                className="text-[12px] font-semibold text-[var(--mk-primary)] hover:underline cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[12px] font-semibold text-[var(--mk-ink-700)] hover:underline cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default OrderDateFilter;
