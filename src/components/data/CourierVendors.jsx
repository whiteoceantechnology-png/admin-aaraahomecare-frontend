// Courier vendor management — the Rates & config tab's left-hand card.
//
// Replaces the old Rate Card (zone selector + weight input + Courier/Rate/ETA
// table), which is gone from this screen. GET /admin/logistics/rates itself is
// untouched: the Book Shipment modal still prices a booking with it.
//
// Every visual comes from plKit (Card/PanelHead/TableShell/Td/Pill/Btn*/Fld/
// Sel/fldClass) and the shared Modal — the same primitives the rest of the
// Logistics page renders. A content swap inside the existing card, not a new
// design.
//
// DATA-DRIVEN: nothing here knows what a "ST Courier", "DTDC" or "Delhivery"
// is. The list comes from GET /admin/logistics/couriers, so a courier added
// tomorrow appears with no frontend change.
//
// The admin manages four things: NAME, STATES, RATE RULES and STATUS. The
// backend also requires `code` and `integrationType`; both are filled in
// internally (see courierCode / DEFAULT_INTEGRATION_TYPE) and never shown.
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  Eye, Pencil, Trash2, Plus, X, Truck, ChevronDown, Check,
} from "lucide-react";
import Modal from "../common/Modal";
import {
  Card, PanelHead, TableShell, Td, Pill, BtnPri, BtnSec,
  Fld, Sel, fldClass,
} from "../common/plKit";
import {
  getCouriers,
  getCourierById,
  addCourier,
  updateCourier,
} from "../../redux/slices/courierSlice";
import {
  selectCouriers,
  selectCouriersLoading,
  selectCouriersError,
  selectCourierSaving,
} from "../../redux/slices/courierSelectors";
// The state list is config, not fetched — this project has no states
// endpoint. Swapping it for one is a change to that file alone.
import { getStateOptions, findStateCode } from "../../config/indiaStates";

// Required by the backend, never asked of the admin.
const DEFAULT_INTEGRATION_TYPE = "MANUAL";

// A courier's states as { id?, name, code }. The id is carried through so an
// update amends the existing rows instead of replacing them.
const courierStates = (courier) => {
  const list = courier?.states ?? courier?.statesCovered ?? [];
  return (Array.isArray(list) ? list : [])
    .map((s) =>
      typeof s === "string"
        ? { name: s, code: findStateCode(s) }
        : {
            id: s?.id,
            name: s?.name ?? s?.state ?? "",
            code: s?.code ?? findStateCode(s?.name ?? s?.state),
          },
    )
    .filter((s) => s.name);
};

const stateNames = (courier) => courierStates(courier).map((s) => s.name);

const rateRules = (courier) => {
  const list = courier?.rateRules ?? courier?.rates ?? [];
  return Array.isArray(list) ? list : [];
};

const isActive = (courier) => {
  const raw = courier?.status ?? courier?.isActive;
  if (typeof raw === "boolean") return raw;
  return String(raw ?? "").toUpperCase() === "ACTIVE";
};

// "0 - 7 kg", "7.001 - 10 kg", "Above 7 kg" — from the rule's own numbers.
const weightRange = (rule) => {
  const min = rule?.minWeight;
  const max = rule?.maxWeight;
  const hasMin = min != null && min !== "";
  const hasMax = max != null && max !== "";
  if (hasMin && hasMax) return `${min} - ${max} kg`;
  if (hasMin) return `Above ${min} kg`;
  if (hasMax) return `Up to ${max} kg`;
  return "—";
};

const rateLabel = (rule) => {
  if (rule?.freeShipping) return "FREE";
  const rate = rule?.ratePerKg;
  return rate != null && rate !== "" ? `₹${rate}/kg` : "—";
};

// "ST Courier" -> "ST". Initials, so the generated code stays short and
// recognisable; an existing courier always keeps the code it already has.
const courierCode = (existing, name) => {
  if (existing?.code) return existing.code;
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  const initials = words.map((w) => w[0]).join("").toUpperCase();
  return (initials.length >= 2 ? initials : String(name).trim().toUpperCase())
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
};

// A rate is always numeric. Free shipping, an empty box, or anything that is
// not a number all mean nothing is charged for that range -> 0.
const normalizeRate = (value, freeShipping) => {
  if (freeShipping) return 0;
  const n = Number(value);
  return value === "" || value == null || Number.isNaN(n) ? 0 : n;
};

// A rate rule is COURIER-level: it applies to every state the courier
// covers. States travel separately in the `states` array, so no rule carries
// one.
const blankRule = () => ({
  minWeight: "",
  maxWeight: "",
  ratePerKg: "",
  freeShipping: false,
});

const blankForm = () => ({
  name: "",
  states: [],
  status: "ACTIVE",
  rates: [],
});

const formFromCourier = (courier) => ({
  name: courier?.name ?? "",
  states: courierStates(courier),
  status: isActive(courier) ? "ACTIVE" : "INACTIVE",
  rates: rateRules(courier).map((r) => ({
    id: r?.id,
    minWeight: r?.minWeight ?? "",
    maxWeight: r?.maxWeight ?? "",
    ratePerKg: normalizeRate(r?.ratePerKg, r?.freeShipping),
    freeShipping: !!r?.freeShipping,
  })),
});

// Searchable multi-select. Built from the modal's own tokens (fldClass border,
// primary-50 rows) rather than a new control: a checkbox list in a popover.
// `options` is [{ name, code }]; `selected` is the same shape.
const StateMultiSelect = ({ options, selected, onToggle }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    // CAPTURE phase, stopped dead: Modal.jsx has its own document-level
    // Escape handler that closes the whole dialog. Without this, dismissing
    // the state list would discard the entire half-filled courier form.
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.stopImmediatePropagation();
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  // The config list, plus any already-selected state that isn't in it — a
  // courier stored as "Pondicherry" stays selected rather than being dropped.
  const all = useMemo(() => {
    const merged = [...options];
    selected.forEach((s) => {
      if (!merged.some((o) => o.name.toLowerCase() === s.name.toLowerCase())) {
        merged.push(s);
      }
    });
    return merged.sort((a, b) => a.name.localeCompare(b.name));
  }, [options, selected]);

  const visible = search
    ? all.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : all;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${fldClass(false)} flex items-center justify-between text-left cursor-pointer`}
      >
        <span
          className={
            selected.length > 0
              ? "text-[var(--mk-ink-900)]"
              : "text-[var(--mk-ink-400)]"
          }
        >
          {selected.length > 0
            ? `${selected.length} state${selected.length === 1 ? "" : "s"} selected`
            : "Select State"}
        </span>
        <ChevronDown size={15} className="text-[var(--mk-ink-400)] shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-[8px] border border-[var(--mk-line)] bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-[var(--mk-line)]">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search states…"
              className="w-full h-9 rounded-[6px] border border-[#D6DCE6] px-2.5 text-[13px] outline-none focus:border-[var(--mk-primary)]"
            />
          </div>
          <div className="max-h-[190px] overflow-auto py-1">
            {visible.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-[var(--mk-ink-400)]">
                No match.
              </p>
            ) : (
              visible.map((opt) => {
                const on = selected.some(
                  (s) => s.name.toLowerCase() === opt.name.toLowerCase(),
                );
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => onToggle(opt.name)}
                    className="w-full flex items-center gap-2 px-3 py-[7px] text-[13px] text-left text-[var(--mk-ink-700)] hover:bg-[var(--mk-primary-50)] cursor-pointer"
                  >
                    <span
                      className={`w-[15px] h-[15px] rounded-[4px] border flex items-center justify-center shrink-0 ${
                        on
                          ? "bg-[var(--mk-primary)] border-[var(--mk-primary)] text-white"
                          : "border-[#C9CFDA]"
                      }`}
                    >
                      {on && <Check size={11} />}
                    </span>
                    {opt.name}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CourierVendors = () => {
  const dispatch = useDispatch();
  const items = useSelector(selectCouriers);
  const listLoading = useSelector(selectCouriersLoading);
  const listError = useSelector(selectCouriersError);
  const saving = useSelector(selectCourierSaving);

  const stateOptions = getStateOptions();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [errors, setErrors] = useState({});
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    dispatch(getCouriers());
  }, [dispatch]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const openAdd = () => {
    setEditing(null);
    setForm(blankForm());
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = async (courier) => {
    setEditing(courier);
    setForm(formFromCourier(courier));
    setErrors({});
    setViewing(null);
    setFormOpen(true);
    // The list row may omit nested states/rateRules, and it is their ids an
    // update has to preserve — so re-seed from the detail endpoint.
    const res = await dispatch(getCourierById(courier.id));
    if (getCourierById.fulfilled.match(res) && res.payload) {
      setEditing(res.payload);
      setForm(formFromCourier(res.payload));
    }
  };

  const openView = async (courier) => {
    setViewing(courier);
    const res = await dispatch(getCourierById(courier.id));
    if (getCourierById.fulfilled.match(res) && res.payload) {
      setViewing(res.payload);
    }
  };

  /* ---------------- states ---------------- */
  const addState = (name) => {
    const clean = String(name).trim();
    if (!clean) return;
    setForm((prev) =>
      prev.states.some((s) => s.name.toLowerCase() === clean.toLowerCase())
        ? prev
        : {
            ...prev,
            // The code comes from config — the admin never enters one.
            states: [...prev.states, { name: clean, code: findStateCode(clean) }],
          },
    );
  };

  const removeState = (name) =>
    setForm((prev) => ({
      ...prev,
      states: prev.states.filter((s) => s.name !== name),
    }));

  const toggleState = (name) =>
    form.states.some((s) => s.name.toLowerCase() === name.toLowerCase())
      ? removeState(name)
      : addState(name);

  /* ---------------- rate rules ---------------- */
  const setRule = (index, patch) =>
    setForm((prev) => ({
      ...prev,
      rates: prev.rates.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));

  const addRule = () =>
    setForm((prev) => ({ ...prev, rates: [...prev.rates, blankRule()] }));

  const removeRule = (index) =>
    setForm((prev) => ({
      ...prev,
      rates: prev.rates.filter((_, i) => i !== index),
    }));

  const handleSave = async () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Courier name is required.";
    if (form.states.length === 0)
      nextErrors.states = "Select at least one state this courier covers.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      name: form.name.trim(),
      code: courierCode(editing, form.name),
      integrationType: editing?.integrationType || DEFAULT_INTEGRATION_TYPE,
      status: form.status,
      // Existing states keep their id so an update amends them in place.
      states: form.states.map((s) => ({
        ...(s.id ? { id: s.id } : {}),
        name: s.name,
        code: s.code ?? findStateCode(s.name),
      })),
      rateRules: form.rates.map((r) => ({
        ...(r.id ? { id: r.id } : {}),
        minWeight: r.minWeight === "" ? 0 : Number(r.minWeight),
        maxWeight: r.maxWeight === "" ? null : Number(r.maxWeight),
        // Always a number, never null/undefined/"": a free-shipping rule or a
        // blank rate box both mean "charge nothing", which is 0.
        ratePerKg: normalizeRate(r.ratePerKg, r.freeShipping),
        freeShipping: !!r.freeShipping,
      })),
    };

    const res = editing
      ? await dispatch(updateCourier({ id: editing.id, data: payload }))
      : await dispatch(addCourier(payload));
    const ok = editing
      ? updateCourier.fulfilled.match(res)
      : addCourier.fulfilled.match(res);

    if (!ok) {
      toast.error(res.payload || "Could not save the courier");
      return;
    }
    toast.success(editing ? "Courier updated" : "Courier added");
    setFormOpen(false);
    dispatch(getCouriers());
  };

  const iconBtn =
    "inline-flex items-center justify-center w-7 h-7 rounded-[6px] text-[var(--mk-ink-400)] hover:bg-[var(--mk-primary-50)] hover:text-[var(--mk-primary)] transition-colors cursor-pointer";

  return (
    <>
      <Card>
        <PanelHead>
          Courier vendors
          <span className="ml-auto">
            <BtnPri onClick={openAdd} className="!h-[34px] !px-3.5 !text-[12px]">
              <Plus size={14} />
              Add Courier
            </BtnPri>
          </span>
        </PanelHead>

        {listError ? (
          <div className="py-14 text-center">
            <p className="text-[13px] text-[var(--mk-dgr)] mb-2">{listError}</p>
            <button
              type="button"
              onClick={() => dispatch(getCouriers())}
              className="text-[12.5px] font-semibold text-[var(--mk-primary)] hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : listLoading ? (
          <div className="py-14 text-center text-[13px] text-[var(--mk-ink-400)]">
            Loading couriers…
          </div>
        ) : (
          <TableShell
            head={[
              { label: "Vendor" },
              { label: "States covered" },
              { label: "Status" },
              { label: "Actions" },
            ]}
          >
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-14 text-center text-[13px] text-[var(--mk-ink-400)]"
                >
                  <Truck size={18} className="mx-auto mb-2 text-[var(--mk-ink-400)]" />
                  No couriers yet — add one to start routing shipments.
                </td>
              </tr>
            ) : (
              items.map((courier) => {
                const states = stateNames(courier);
                return (
                  <tr key={courier.id} className="hover:bg-[#FAFBFD]">
                    <Td className="font-semibold text-[12.5px] text-[var(--mk-ink-900)]">
                      {courier.name || "—"}
                    </Td>
                    <Td>{states.length > 0 ? states.join(", ") : "—"}</Td>
                    <Td>
                      <Pill
                        tone={
                          isActive(courier)
                            ? "bg-[var(--mk-ok-bg)] text-[var(--mk-ok)]"
                            : "bg-[var(--mk-line)] text-[var(--mk-ink-500)]"
                        }
                      >
                        {isActive(courier) ? "Active" : "Inactive"}
                      </Pill>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="View courier"
                          aria-label={`View ${courier.name}`}
                          onClick={() => openView(courier)}
                          className={iconBtn}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          title="Edit courier"
                          aria-label={`Edit ${courier.name}`}
                          onClick={() => openEdit(courier)}
                          className={iconBtn}
                        >
                          <Pencil size={15} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </TableShell>
        )}
      </Card>

      {/* ADD / EDIT */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Courier" : "Add Courier"}
        maxWidth="max-w-2xl"
      >
        <div className="px-2 pb-1">
          <Fld label="Courier name *" error={errors.name}>
            <input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. ST Courier"
              className={fldClass(!!errors.name)}
            />
          </Fld>

          <Fld label="States covered *" error={errors.states}>
            <StateMultiSelect
              options={stateOptions}
              selected={form.states}
              onToggle={toggleState}
            />
          </Fld>

          {form.states.length > 0 && (
            <div className="flex flex-wrap gap-1.5 -mt-1 mb-3.5">
              {form.states.map((s) => (
                <span
                  key={s.name}
                  className="inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full bg-[var(--mk-primary-50)] text-[var(--mk-primary)] text-[11.5px] font-medium"
                >
                  {s.name}
                  <button
                    type="button"
                    onClick={() => removeState(s.name)}
                    aria-label={`Remove ${s.name}`}
                    className="hover:text-[var(--mk-dgr)] cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* RATE RULES */}
          <div className="flex items-center justify-between mt-1 mb-2">
            <span className="text-[12.5px] font-semibold text-[var(--mk-ink-900)]">
              Shipping rate rules
            </span>
            <BtnSec
              onClick={addRule}
              className="!h-[32px] !px-3 !text-[12px]"
              type="button"
            >
              <Plus size={13} />
              Add Rate Rule
            </BtnSec>
          </div>

          {form.rates.length === 0 ? (
            <p className="text-[12px] text-[var(--mk-ink-400)] pb-2">
              No rate rules yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2 pb-1">
              <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 px-0.5 max-[820px]:hidden">
                {["Min weight (kg)", "Max weight (kg)", "Rate / kg", "Free", ""].map(
                  (h) => (
                    <span
                      key={h}
                      className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--mk-ink-400)]"
                    >
                      {h}
                    </span>
                  ),
                )}
              </div>
              {form.rates.map((rule, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-center max-[820px]:grid-cols-2"
                >
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={rule.minWeight}
                    onChange={(e) => setRule(i, { minWeight: e.target.value })}
                    placeholder="0"
                    className={fldClass(false)}
                  />
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={rule.maxWeight}
                    onChange={(e) => setRule(i, { maxWeight: e.target.value })}
                    placeholder="any"
                    className={fldClass(false)}
                  />
                  {rule.freeShipping ? (
                    <span className="h-10 flex items-center justify-center rounded-[8px] bg-[var(--mk-ok-bg)] text-[var(--mk-ok)] text-[12px] font-semibold">
                      FREE
                    </span>
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={rule.ratePerKg}
                      onChange={(e) => setRule(i, { ratePerKg: e.target.value })}
                      placeholder="₹"
                      className={fldClass(false)}
                    />
                  )}
                  <label className="inline-flex items-center gap-1.5 text-[12px] text-[var(--mk-ink-700)] whitespace-nowrap cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.freeShipping}
                      onChange={(e) =>
                        setRule(i, {
                          freeShipping: e.target.checked,
                          // Keep form state and payload in agreement.
                          ratePerKg: e.target.checked ? 0 : rule.ratePerKg,
                        })
                      }
                      className="w-[14px] h-[14px] accent-[var(--mk-primary)] cursor-pointer"
                    />
                    <span className="max-[820px]:inline hidden">Free shipping</span>
                  </label>
                  <button
                    type="button"
                    title="Delete rate rule"
                    aria-label="Delete rate rule"
                    onClick={() => removeRule(i)}
                    className={`${iconBtn} hover:!bg-[var(--mk-dgr-bg)] hover:!text-[var(--mk-dgr)]`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <p className="text-[11px] text-[var(--mk-ink-400)]">
                These rates apply to every state this courier covers. Leave max
                weight empty for “and above”. Tick Free shipping to charge
                nothing in that range.
              </p>
            </div>
          )}

          <div className="mt-3 max-w-[220px]">
            <Fld label="Status">
              <Sel
                value={form.status}
                onChange={(e) => set({ status: e.target.value })}
                className="w-full"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Sel>
            </Fld>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <BtnSec onClick={() => setFormOpen(false)} type="button">
              Cancel
            </BtnSec>
            <BtnPri onClick={handleSave} disabled={saving} type="button">
              {saving ? "Saving…" : editing ? "Update Courier" : "Save Courier"}
            </BtnPri>
          </div>
        </div>
      </Modal>

      {/* VIEW */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="Courier Details"
        maxWidth="max-w-xl"
      >
        {viewing && (
          <div className="px-2 pb-1 text-[12.5px] text-[var(--mk-ink-700)]">
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 pb-3 border-b border-[var(--mk-line)]">
              <div>
                <span className="block text-[11px] text-[var(--mk-ink-400)]">
                  Courier name
                </span>
                <span className="font-semibold text-[var(--mk-ink-900)]">
                  {viewing.name || "—"}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[var(--mk-ink-400)]">
                  Status
                </span>
                <Pill
                  tone={
                    isActive(viewing)
                      ? "bg-[var(--mk-ok-bg)] text-[var(--mk-ok)]"
                      : "bg-[var(--mk-line)] text-[var(--mk-ink-500)]"
                  }
                >
                  {isActive(viewing) ? "Active" : "Inactive"}
                </Pill>
              </div>
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--mk-ink-400)] mt-3 mb-1.5">
              States covered
            </p>
            {stateNames(viewing).length === 0 ? (
              <p className="text-[var(--mk-ink-400)]">No states assigned</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {stateNames(viewing).map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-[3px] rounded-full bg-[var(--mk-primary-50)] text-[var(--mk-primary)] text-[11.5px] font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--mk-ink-400)] mt-4 mb-1.5">
              Shipping rate rules
            </p>
            {rateRules(viewing).length === 0 ? (
              <p className="text-[var(--mk-ink-400)]">No rate rules</p>
            ) : (
              <TableShell
                head={[
                  { label: "Weight range" },
                  { label: "Rate", num: true },
                  { label: "Free shipping" },
                ]}
              >
                {rateRules(viewing).map((rule, i) => (
                  <tr key={rule.id ?? i}>
                    <Td>{weightRange(rule)}</Td>
                    <Td num className="font-semibold text-[var(--mk-ink-900)]">
                      {rateLabel(rule)}
                    </Td>
                    <Td>{rule.freeShipping ? "Yes" : "No"}</Td>
                  </tr>
                ))}
              </TableShell>
            )}

            <div className="flex justify-end gap-2.5 pt-5">
              <BtnSec onClick={() => setViewing(null)} type="button">
                Close
              </BtnSec>
              <BtnPri onClick={() => openEdit(viewing)} type="button">
                <Pencil size={14} />
                Edit Courier
              </BtnPri>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default CourierVendors;
