// Logistics module — wired to the real backend (GET/POST /admin/logistics/*
// via src/redux/slices/logisticsSlice.js + logisticsApi.js). The visual
// system (Card/PanelHead/Kpi/TableShell/etc from plKit, the tab structure,
// the drawer/modal shells) reproduces the approved prototype and is kept
// as-is; only the data layer changed. A few prototype panels had no real
// backing field anywhere in the API and were removed rather than kept with
// fixture numbers — see the Overview tab below (TAT-by-zone chart, courier
// scorecard table, "Decisions this data supports" insights) and the Rates &
// config tab (fake pickup-address/parcel-dimension card). The weight-dispute
// concept and "simulate courier webhook" action were also prototype-only
// (no dead/volumetric-weight or webhook-simulation field/endpoint exists)
// and were dropped for the same reason.
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { Download, Truck, Info, AlertTriangle, Plus } from "lucide-react";
import Drawer from "../common/Drawer";
import CourierVendors from "./CourierVendors";
import Modal from "../common/Modal";
import {
  Pill, Chip, Banner, Card, PanelHead, Kpi, TableShell, Td,
  Search, Sel, BtnPri, BtnSec, BtnDgr, Fld, fldClass, Timeline, fmt,
} from "../common/plKit";
import {
  getLogisticsOverview,
  getReadyToShip,
  getShipments,
  getShipmentDetail,
  addBooking,
  getShipmentTracking,
  getNdrList,
  reattemptNdrDelivery,
  fixNdrAddress,
  initiateRtoFromNdr,
  getRtoList,
  markRtoReceived,
  markRtoRestocked,
  getRates,
  checkServiceability,
  getLogisticsConfig,
  addWalletRecharge,
  clearShipmentDetail,
} from "../../redux/slices/logisticsSlice";

/* ================= helpers ================= */
const ZONE_LIST = ["A", "B", "C", "D", "E"];

// Generous page size so the existing client-side search/filter (unchanged
// from the prototype) keeps working against one in-memory page, same
// pattern as Order.jsx's ORDER_LIST_LIMIT — real dev totals are tiny
// (≤14 shipments, 0 NDR/RTO) so this comfortably covers real data without
// needing pager UI.
const LIST_LIMIT = 200;

const sliceId = (s, n = 16) => (!s ? "—" : s.length > n ? `${s.slice(0, n)}…` : s);
const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : "—");
const courierLabel = (courier) => {
  if (!courier) return "—";
  if (typeof courier === "string") return courier;
  return courier.name || courier.id || "—";
};

// Known status styling — "shipped"/"delivered" are the statuses actually
// observed from the real API; the rest (ndr/rto_t/rto_r/scheduled/etc.) are
// kept as a defensive styling map in case the NDR/RTO endpoints surface
// them once real data exists there. Any unmapped status falls back to a
// capitalized raw label instead of crashing or rendering "undefined".
const SHIP_TONE = {
  scheduled: "bg-black/[0.06] text-[#5B6472]",
  transit: "bg-[#F0E9FC] text-[#6D28D9]",
  shipped: "bg-[#F0E9FC] text-[#6D28D9]",
  ofd: "bg-[var(--mk-info-bg)] text-[var(--mk-info)]",
  delivered: "bg-[var(--mk-ok-bg)] text-[var(--mk-ok)]",
  ndr: "bg-[var(--mk-dgr-bg)] text-[var(--mk-dgr)]",
  rto_t: "bg-[var(--mk-warn-bg)] text-[var(--mk-warn)]",
  rto_r: "bg-[var(--mk-warn-bg)] text-[var(--mk-warn)]",
  restocked: "bg-[var(--mk-ok-bg)] text-[var(--mk-ok)]",
};
const SHIP_LABEL = {
  scheduled: "Pickup scheduled",
  transit: "In transit",
  shipped: "Shipped",
  ofd: "Out for delivery",
  delivered: "Delivered",
  ndr: "NDR",
  rto_t: "RTO · in return",
  rto_r: "RTO received",
  restocked: "Restocked",
};
const ShipPill = ({ st }) => {
  const key = (st || "").toLowerCase();
  return <Pill tone={SHIP_TONE[key] || "bg-black/[0.06] text-[#5B6472]"}>{SHIP_LABEL[key] || cap(st)}</Pill>;
};
const STATUS_OPTIONS = Object.keys(SHIP_LABEL);

// Tracking-event shape from GET /admin/logistics/shipments/{awb}/tracking is
// unconfirmed (no live sample in dev), so this reads whichever common field
// names show up rather than assuming one — never fabricates entries.
const normalizeTrackingEvents = (raw) => {
  const list = raw?.scans || raw?.events || raw?.history || raw?.trackingHistory || [];
  if (!Array.isArray(list)) return [];
  return list.map((e) => {
    const text = e.description || e.status || e.message || e.location || e.remark || "Update";
    const k = /deliver|success/i.test(text) ? "ok" : /ndr|fail|undeliver|dispute/i.test(text) ? "dgr" : /rto|return|hold|delay/i.test(text) ? "warn" : "";
    return { t: e.timestamp || e.time || e.date || e.scannedAt || "", l: text, k };
  });
};

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "ready", label: "Ready to ship" },
  { key: "shipments", label: "Shipments" },
  { key: "ndr", label: "NDR" },
  { key: "rto", label: "RTO" },
  { key: "config", label: "Rates & config" },
];

const Logistics = () => {
  const dispatch = useDispatch();
  const {
    overview, readyToShip, shipments, shipmentDetail, tracking, booking,
    ndr, ndrActionLoading, rto, rtoActionLoading, config, recharging,
  } = useSelector((state) => state.logistics);

  const [tab, setTab] = useState("overview");
  const [openRow, setOpenRow] = useState(null); // shipment list-row currently in the drawer
  const [shipModalRow, setShipModalRow] = useState(null); // ready-to-ship row being booked
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [ndrModal, setNdrModal] = useState(null); // { type: "reattempt"|"address"|"rto", row }
  const [rtoModalRow, setRtoModalRow] = useState(null); // rto row being restocked

  const [shQ, setShQ] = useState("");
  const [shSt, setShSt] = useState("");



  const ov = overview.data;
  const cfg = config.data;
  const walletLow = !!(cfg && cfg.walletBalance != null && cfg.walletLowBalanceThreshold != null && cfg.walletBalance < cfg.walletLowBalanceThreshold);

  useEffect(() => {
    dispatch(getLogisticsOverview());
    dispatch(getLogisticsConfig());
  }, [dispatch]);

  useEffect(() => {
    if (tab === "ready") dispatch(getReadyToShip({ page: 1, limit: LIST_LIMIT }));
  }, [dispatch, tab]);

  useEffect(() => {
    if (tab === "shipments") dispatch(getShipments({ page: 1, limit: LIST_LIMIT }));
  }, [dispatch, tab]);

  useEffect(() => {
    if (tab === "ndr") dispatch(getNdrList({ page: 1, limit: LIST_LIMIT }));
  }, [dispatch, tab]);

  useEffect(() => {
    if (tab === "rto") dispatch(getRtoList({ page: 1, limit: LIST_LIMIT }));
  }, [dispatch, tab]);

  useEffect(() => {
    if (openRow?.awb) {
      dispatch(getShipmentDetail(openRow.awb));
      dispatch(getShipmentTracking(openRow.awb));
    }
  }, [dispatch, openRow]);

  const closeDrawer = () => {
    setOpenRow(null);
    dispatch(clearShipmentDetail());
  };

  const refreshAfterStatusChange = () => {
    dispatch(getLogisticsOverview());
    dispatch(getShipments({ page: 1, limit: LIST_LIMIT }));
  };

  const handleBookShipment = async (courierId, zone, weightKg) => {
    if (!shipModalRow) return;
    const res = await dispatch(addBooking({ orderId: shipModalRow.id, data: { courierId, zone, weightKg } }));
    if (addBooking.fulfilled.match(res)) {
      toast.success(res.payload?.awb ? `AWB ${res.payload.awb} booked` : "Shipment booked");
      setShipModalRow(null);
      setTab("shipments");
      dispatch(getReadyToShip({ page: 1, limit: LIST_LIMIT }));
      dispatch(getShipments({ page: 1, limit: LIST_LIMIT }));
      dispatch(getLogisticsOverview());
    } else {
      toast.error(res.payload || "Failed to book shipment");
    }
  };

  const handleRecharge = async (amount, paymentReference) => {
    const res = await dispatch(addWalletRecharge({ amount, paymentReference }));
    if (addWalletRecharge.fulfilled.match(res)) {
      toast.success("Wallet recharged");
      dispatch(getLogisticsConfig());
      setRechargeOpen(false);
    } else {
      toast.error(res.payload || "Failed to recharge wallet");
    }
  };

  const handleNdrSubmit = async (data) => {
    if (!ndrModal) return;
    const { type, row } = ndrModal;
    const awb = row.awb;
    const thunk = type === "reattempt" ? reattemptNdrDelivery : type === "address" ? fixNdrAddress : initiateRtoFromNdr;
    const res = await dispatch(thunk({ awb, data }));
    if (thunk.fulfilled.match(res)) {
      toast.success(type === "reattempt" ? "Reattempt queued" : type === "address" ? "Address updated" : "RTO initiated");
      setNdrModal(null);
      dispatch(getNdrList({ page: 1, limit: LIST_LIMIT }));
      refreshAfterStatusChange();
    } else {
      toast.error(res.payload || "Action failed");
    }
  };

  const handleRtoReceive = async (row) => {
    if (!row.awb) { toast.error("No AWB on this RTO record"); return; }
    const res = await dispatch(markRtoReceived(row.awb));
    if (markRtoReceived.fulfilled.match(res)) {
      toast.success("Marked received · QC pending");
      dispatch(getRtoList({ page: 1, limit: LIST_LIMIT }));
      refreshAfterStatusChange();
    } else {
      toast.error(res.payload || "Failed to mark received");
    }
  };

  const handleRtoRestockSubmit = async ({ qcResult, variantId, quantity }) => {
    if (!rtoModalRow) return;
    const res = await dispatch(markRtoRestocked({ awb: rtoModalRow.awb, data: { qcResult, variantId: Number(variantId), quantity: Number(quantity) } }));
    if (markRtoRestocked.fulfilled.match(res)) {
      toast.success("Restocked · inventory updated");
      setRtoModalRow(null);
      dispatch(getRtoList({ page: 1, limit: LIST_LIMIT }));
      refreshAfterStatusChange();
    } else {
      toast.error(res.payload || "Failed to restock");
    }
  };

  const filteredShipments = (shipments.items || [])
    .filter((s) => (shQ ? `${s.awb || ""} ${s.orderId || ""} ${s.customer?.name || ""}`.toLowerCase().includes(shQ.toLowerCase()) : true))
    .filter((s) => (shSt ? (s.status || "").toLowerCase() === shSt : true));

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-end gap-3.5 flex-wrap mb-4">
        <div>
          <h1 className="text-[23px] font-semibold text-[var(--mk-ink-900)] tracking-[-0.01em]">Logistics</h1>
          <p className="text-[12.5px] text-[var(--mk-ink-500)] mt-0.5">
            {ov ? `${ov.readyToShipCount} ready to ship · ${ov.inTransitCount} in transit` : "Loading…"}
            {cfg ? ` · wallet ${fmt(cfg.walletBalance ?? 0)}${walletLow ? " · low balance" : ""}` : ""}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <BtnPri onClick={() => setTab("ready")}>
            <Truck size={15} />
            Ship packed orders
          </BtnPri>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 flex-wrap mb-3.5">
        {TABS.map((t) => (
          <Chip
            key={t.key}
            active={tab === t.key}
            onClick={() => setTab(t.key)}
            count={t.key === "ndr" ? (ov?.ndrCount || null) : t.key === "ready" ? (ov?.readyToShipCount || null) : t.key === "rto" ? (ov?.rtoCount || null) : null}
          >
            {t.label}
          </Chip>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <>
          {overview.loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Loading overview…</div>
          ) : overview.error ? (
            <Banner tone="dgr" icon={AlertTriangle}>{overview.error}</Banner>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3.5 mb-4 max-[1280px]:grid-cols-2">
                <Kpi label="Ready to ship" value={ov?.readyToShipCount ?? 0} desc="Packed, awaiting AWB" />
                <Kpi label="In transit" value={ov?.inTransitCount ?? 0} desc="Booked shipments moving" />
                <Kpi label="Delivered today" value={ov?.deliveredToday ?? 0} desc="Since midnight" />
                <Kpi label="NDR active" value={ov?.ndrCount ?? 0} desc="Delivery exceptions open" tone={ov?.ndrCount ? "alert" : undefined} />
                <Kpi label="RTO active" value={ov?.rtoCount ?? 0} desc="Returns in flight" tone={ov?.rtoCount ? "bad" : undefined} />
                <Kpi label="Avg delivery" value={`${ov?.avgDeliveryDays ?? 0}d`} desc="Pickup → delivered" />
                <Kpi label="Aggregator wallet" value={fmt(ov?.walletBalance ?? 0)} desc={walletLow ? "Below threshold — recharge" : "Healthy"} tone={walletLow ? "alert" : undefined} />
                <Kpi label="COD pending remit" value={fmt(ov?.codPendingRemit ?? 0)} desc="Collected, not yet remitted" />
              </div>
              <div className="grid grid-cols-2 gap-3.5 items-start max-[1080px]:grid-cols-1">
                <ServiceabilityCard />
                <Card>
                  <PanelHead sub="from GET /admin/logistics/config">Courier & wallet defaults</PanelHead>
                  <div className="px-[18px] py-4 text-[12.5px] text-[var(--mk-ink-700)] flex flex-col gap-2.5">
                    <div className="flex justify-between"><span>Default courier</span><span className="font-semibold text-[var(--mk-ink-900)]">{cfg?.defaultCourier || "—"}</span></div>
                    <div className="flex justify-between"><span>Auto NDR reattempt limit</span><span className="font-semibold text-[var(--mk-ink-900)]">{cfg?.autoNdrReattemptLimit ?? "—"}</span></div>
                    <div className="flex justify-between"><span>RTO auto-close</span><span className="font-semibold text-[var(--mk-ink-900)]">{cfg?.rtoAutoCloseDays != null ? `${cfg.rtoAutoCloseDays}d` : "—"}</span></div>
                    <div className="flex justify-between"><span>Low-balance threshold</span><span className="font-semibold text-[var(--mk-ink-900)]">{cfg?.walletLowBalanceThreshold != null ? fmt(cfg.walletLowBalanceThreshold) : "—"}</span></div>
                  </div>
                </Card>
              </div>
            </>
          )}
        </>
      )}

      {/* READY TO SHIP */}
      {tab === "ready" && (
        <Card>
          <PanelHead sub="guards run at booking, not at pickup">Packed · awaiting AWB</PanelHead>
          {readyToShip.loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
          ) : (
            <TableShell head={[{ label: "Order" }, { label: "Customer" }, { label: "Address" }, { label: "Items", num: true }, { label: "Payment" }, { label: "Wallet" }, { label: "Action" }]}>
              {readyToShip.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-[13px] text-[var(--mk-ink-400)]">
                    Nothing packed — mark orders Packed from the Orders page.
                  </td>
                </tr>
              ) : (
                readyToShip.items.map((o) => {
                  const hasAddr = !!o.shippingAddress;
                  return (
                    <tr key={o.id} className={!hasAddr ? "shadow-[inset_3px_0_0_var(--mk-warn)]" : ""}>
                      <Td className="font-semibold text-[12.5px] text-[var(--mk-ink-900)]">{sliceId(o.orderId)}</Td>
                      <Td>{o.customer?.name || "—"}</Td>
                      <Td>
                        <Pill tone={hasAddr ? "bg-[var(--mk-ok-bg)] text-[var(--mk-ok)]" : "bg-[var(--mk-dgr-bg)] text-[var(--mk-dgr)]"}>{hasAddr ? "On file" : "Missing"}</Pill>
                      </Td>
                      <Td num>{o.itemCount ?? "—"}</Td>
                      <Td><Pill tone="bg-black/[0.06] text-[#5B6472]">{cap(o.paymentStatus)}</Pill></Td>
                      <Td><Pill tone={walletLow ? "bg-[var(--mk-dgr-bg)] text-[var(--mk-dgr)]" : "bg-[var(--mk-ok-bg)] text-[var(--mk-ok)]"}>{walletLow ? "Low" : "OK"}</Pill></Td>
                      <Td>
                        {hasAddr ? (
                          <button type="button" onClick={() => setShipModalRow(o)} className="h-[30px] px-3 rounded-[7px] text-[12px] font-semibold bg-[var(--mk-primary)] text-white hover:bg-[var(--mk-primary-hover)] cursor-pointer">
                            Ship now
                          </button>
                        ) : (
                          <span title="Blocked — no shipping address on the order">
                            <button type="button" disabled className="h-[30px] px-3 rounded-[7px] text-[12px] font-semibold bg-white text-[var(--mk-ink-400)] border border-[var(--mk-line)] cursor-not-allowed">
                              Ship now
                            </button>
                          </span>
                        )}
                      </Td>
                    </tr>
                  );
                })
              )}
            </TableShell>
          )}
        </Card>
      )}

      {/* SHIPMENTS */}
      {tab === "shipments" && (
        <Card>
          <div className="flex gap-2.5 flex-wrap items-center p-[13px_14px] border-b border-[var(--mk-line)]">
            <Search value={shQ} onChange={setShQ} placeholder="Search AWB, order or customer" />
            <Sel value={shSt} onChange={(e) => setShSt(e.target.value)}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{SHIP_LABEL[s]}</option>
              ))}
            </Sel>
            <div className="flex-1" />
            <span className="text-[11.5px] text-[var(--mk-ink-400)]">Status, AWB and courier come straight from the shipment record</span>
          </div>
          {shipments.loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
          ) : (
            <>
              <TableShell head={[{ label: "AWB" }, { label: "Order" }, { label: "Courier" }, { label: "Zone" }, { label: "Weight", num: true }, { label: "Rate", num: true }, { label: "COD", num: true }, { label: "Status" }, { label: "Last location" }]}>
                {filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center text-[13px] text-[var(--mk-ink-400)]">No shipments match</td>
                  </tr>
                ) : (
                  filteredShipments.map((s, i) => {
                    const stLower = (s.status || "").toLowerCase();
                    return (
                      <tr
                        key={s.awb || `${s.orderId}-${i}`}
                        onClick={() => setOpenRow(s)}
                        className={`cursor-pointer hover:bg-[#F7F8FC] ${stLower === "ndr" ? "shadow-[inset_3px_0_0_var(--mk-dgr)]" : /rto/.test(stLower) ? "shadow-[inset_3px_0_0_var(--mk-warn)]" : ""}`}
                      >
                        <Td className="font-semibold text-[12.5px] text-[var(--mk-ink-900)]">{s.awb || "—"}</Td>
                        <Td>
                          <div className="text-[var(--mk-ink-500)] text-[12.5px]">{sliceId(s.orderId)}</div>
                          <div className="text-[11.5px] text-[var(--mk-ink-400)]">{s.customer?.name || "—"}</div>
                        </Td>
                        <Td>{courierLabel(s.courier)}</Td>
                        <Td>{s.zone || "—"}</Td>
                        <Td num>{s.weightKg != null ? `${s.weightKg} kg` : "—"}</Td>
                        <Td num>{s.rate != null ? fmt(s.rate) : "—"}</Td>
                        <Td num>{s.codAmount ? fmt(s.codAmount) : "—"}</Td>
                        <Td><ShipPill st={s.status} /></Td>
                        <Td className="text-[var(--mk-ink-500)]">{s.lastLocation || "—"}</Td>
                      </tr>
                    );
                  })
                )}
              </TableShell>
              <div className="flex items-center px-[14px] py-[11px] text-[12.5px] text-[var(--mk-ink-500)] border-t border-[var(--mk-line)]">
                {filteredShipments.length} of {shipments.items.length} shipments
              </div>
            </>
          )}
        </Card>
      )}

      {/* NDR */}
      {tab === "ndr" && (
        <>
          <Banner tone="warn" icon={AlertTriangle}>
            <b>48-hour rule.</b> An NDR left untouched for 48 h risks the courier auto-initiating RTO. Reattempt or
            fix the address before that happens — RTO costs freight both ways.
          </Banner>
          <Card>
            {ndr.loading ? (
              <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
            ) : (
              <TableShell head={[{ label: "AWB" }, { label: "Order" }, { label: "Customer" }, { label: "Reason" }, { label: "Attempts", num: true }, { label: "Actions" }]}>
                {ndr.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-[13px] text-[var(--mk-ink-400)]">NDR queue clear — nothing is waiting on a delivery exception.</td>
                  </tr>
                ) : (
                  ndr.items.map((n, i) => (
                    <tr key={n.awb || n.id || i} className="shadow-[inset_3px_0_0_var(--mk-dgr)]">
                      <Td>
                        <div className="font-semibold text-[12.5px] text-[var(--mk-ink-900)]">{n.awb || "—"}</div>
                        <div className="text-[11.5px] text-[var(--mk-ink-400)]">{courierLabel(n.courier)}</div>
                      </Td>
                      <Td className="text-[var(--mk-ink-500)]">{sliceId(n.orderId)}</Td>
                      <Td>{n.customer?.name || "—"}</Td>
                      <Td>{n.reason || "—"}</Td>
                      <Td num>{n.attempts ?? "—"}</Td>
                      <Td>
                        <div className="flex items-center gap-1.5 justify-end">
                          <button type="button" disabled={!n.awb || ndrActionLoading} onClick={() => setNdrModal({ type: "reattempt", row: n })} className="h-[28px] px-2.5 rounded-[6px] text-[11.5px] font-semibold bg-white text-[var(--mk-ink-700)] border border-[var(--mk-line)] hover:border-[#C9CFDA] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed">
                            Reattempt
                          </button>
                          <button type="button" disabled={!n.awb || ndrActionLoading} onClick={() => setNdrModal({ type: "address", row: n })} className="h-[28px] px-2.5 rounded-[6px] text-[11.5px] font-semibold bg-white text-[var(--mk-ink-700)] border border-[var(--mk-line)] hover:border-[#C9CFDA] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed">
                            Fix address
                          </button>
                          <BtnDgr disabled={!n.awb || ndrActionLoading} onClick={() => setNdrModal({ type: "rto", row: n })} className="!h-[28px] !px-2.5 !text-[11.5px]">RTO</BtnDgr>
                        </div>
                      </Td>
                    </tr>
                  ))
                )}
              </TableShell>
            )}
          </Card>
        </>
      )}

      {/* RTO */}
      {tab === "rto" && (
        <>
          <Banner tone="info" icon={Info}>
            <b>RTO is a prevention metric, not a processing metric.</b> You pay freight both ways — the fix is
            upstream: COD confirmation, address validation at checkout, and courier routing by NDR history.
          </Banner>
          <Card>
            {rto.loading ? (
              <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
            ) : (
              <TableShell head={[{ label: "AWB" }, { label: "Order" }, { label: "Customer" }, { label: "Reason" }, { label: "Status" }, { label: "Action" }]}>
                {rto.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-[13px] text-[var(--mk-ink-400)]">No returns in flight</td>
                  </tr>
                ) : (
                  rto.items.map((r, i) => {
                    const stLower = (r.status || "").toLowerCase();
                    const looksReceived = stLower.includes("received");
                    const looksRestocked = stLower.includes("restock");
                    return (
                      <tr key={r.awb || r.orderId || i} className={!looksRestocked ? "shadow-[inset_3px_0_0_var(--mk-warn)]" : ""}>
                        <Td>
                          <div className="font-semibold text-[12.5px] text-[var(--mk-ink-900)]">{r.awb || "—"}</div>
                          <div className="text-[11.5px] text-[var(--mk-ink-400)]">{courierLabel(r.courier)}</div>
                        </Td>
                        <Td>
                          <div className="text-[var(--mk-ink-500)]">{sliceId(r.orderId)}</div>
                          <div className="text-[11.5px] text-[var(--mk-ink-400)]">{r.customer?.name || "—"}</div>
                        </Td>
                        <Td>{r.reason || "—"}</Td>
                        <Td><ShipPill st={r.status} /></Td>
                        <Td>
                          <div className="flex items-center gap-1.5 justify-end">
                            {looksRestocked ? (
                              <span className="text-[var(--mk-ink-400)] text-[12px]">Closed</span>
                            ) : looksReceived ? (
                              <BtnPri disabled={!r.awb || rtoActionLoading} onClick={() => setRtoModalRow(r)} className="!h-[28px] !px-2.5 !text-[11.5px]">QC · restock</BtnPri>
                            ) : (
                              <button type="button" disabled={!r.awb || rtoActionLoading} onClick={() => handleRtoReceive(r)} className="h-[28px] px-2.5 rounded-[6px] text-[11.5px] font-semibold bg-white text-[var(--mk-ink-700)] border border-[var(--mk-line)] hover:border-[#C9CFDA] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed">
                                Mark received
                              </button>
                            )}
                            {!r.awb && <span className="text-[11px] text-[var(--mk-ink-400)]">no AWB</span>}
                          </div>
                        </Td>
                      </tr>
                    );
                  })
                )}
              </TableShell>
            )}
          </Card>
        </>
      )}

      {/* RATES & CONFIG */}
      {tab === "config" && (
        <div className="grid grid-cols-2 gap-3.5 items-start max-[1080px]:grid-cols-1">
          {/* Courier vendors replaces the old zone/weight rate card here.
              GET /admin/logistics/rates is untouched — the Book Shipment
              modal still prices bookings with it. */}
          <CourierVendors />
          <div className="flex flex-col gap-3.5">
            <Card>
              <PanelHead>Aggregator wallet</PanelHead>
              <div className="px-[18px] py-4">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className="text-[22px] font-semibold text-[var(--mk-ink-900)] tabular-nums">{fmt(cfg?.walletBalance ?? 0)}</span>
                  <Pill tone={walletLow ? "bg-[var(--mk-dgr-bg)] text-[var(--mk-dgr)]" : "bg-[var(--mk-ok-bg)] text-[var(--mk-ok)]"}>{walletLow ? "Low" : "Healthy"}</Pill>
                </div>
                <p className="text-[11.5px] text-[var(--mk-ink-400)] mb-3">
                  Bookings debit this balance. Low-balance threshold: {cfg?.walletLowBalanceThreshold != null ? fmt(cfg.walletLowBalanceThreshold) : "—"}.
                </p>
                <button type="button" onClick={() => setRechargeOpen(true)} className="inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-[7px] text-[12px] font-semibold bg-[var(--mk-primary)] text-white hover:bg-[var(--mk-primary-hover)] cursor-pointer">
                  <Plus size={14} />
                  Recharge
                </button>
              </div>
            </Card>
            <Card>
              <PanelHead sub="">Booking config</PanelHead>
              <div className="px-[18px] py-4 text-[12.5px] text-[var(--mk-ink-700)] flex flex-col gap-2.5">
                <div className="flex justify-between"><span>Default courier</span><span className="font-semibold text-[var(--mk-ink-900)]">{cfg?.defaultCourier || "—"}</span></div>
                <div className="flex justify-between"><span>Auto NDR reattempt limit</span><span className="font-semibold text-[var(--mk-ink-900)]">{cfg?.autoNdrReattemptLimit ?? "—"}</span></div>
                <div className="flex justify-between"><span>RTO auto-close</span><span className="font-semibold text-[var(--mk-ink-900)]">{cfg?.rtoAutoCloseDays != null ? `${cfg.rtoAutoCloseDays}d` : "—"}</span></div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* SHIPMENT DRAWER */}
      <Drawer
        open={!!openRow}
        onClose={closeDrawer}
        title={openRow ? (openRow.awb ? `AWB ${openRow.awb}` : "Shipment") : "Shipment"}
        width="max-w-[620px]"
        compact
        headerHeightPx={58}
        titleSizePx={17}
        bodyPaddingXPx={20}
        footer={
          openRow && (
            <div className="flex items-center gap-2.5 w-full flex-wrap">
              <BtnSec onClick={() => toast("Label PDF (stub)")}>
                <Download size={14} />
                Label
              </BtnSec>
              {openRow.awb && (
                <BtnSec onClick={() => { dispatch(getShipmentDetail(openRow.awb)); dispatch(getShipmentTracking(openRow.awb)); }}>
                  Refresh tracking
                </BtnSec>
              )}
              {(openRow.status || "").toLowerCase() === "ndr" && <BtnPri onClick={() => { closeDrawer(); setTab("ndr"); }}>Open NDR queue</BtnPri>}
              {/rto/.test((openRow.status || "").toLowerCase()) && <BtnPri onClick={() => { closeDrawer(); setTab("rto"); }}>Open RTO queue</BtnPri>}
              <div className="flex-1" />
              <BtnSec onClick={closeDrawer}>Close</BtnSec>
            </div>
          )
        }
      >
        {openRow && (
          <ShipmentDrawerBody
            row={openRow}
            detail={shipmentDetail.item}
            trackingData={tracking.data}
            detailLoading={shipmentDetail.loading}
            trackingLoading={tracking.loading}
          />
        )}
      </Drawer>

      {/* SHIP NOW MODAL */}
      <Modal open={!!shipModalRow} onClose={() => setShipModalRow(null)} title={shipModalRow ? `Ship ${sliceId(shipModalRow.orderId, 20)}` : "Ship"} maxWidth="max-w-lg">
        {shipModalRow && (
          <ShipNowForm
            row={shipModalRow}
            booking={booking}
            onCancel={() => setShipModalRow(null)}
            onConfirm={handleBookShipment}
          />
        )}
      </Modal>

      {/* RECHARGE MODAL */}
      <Modal open={rechargeOpen} onClose={() => setRechargeOpen(false)} title="Recharge wallet" maxWidth="max-w-sm">
        <RechargeForm onCancel={() => setRechargeOpen(false)} onSubmit={handleRecharge} loading={recharging} />
      </Modal>

      {/* NDR ACTION MODAL (reattempt / fix address / initiate RTO) */}
      <Modal
        open={!!ndrModal}
        onClose={() => setNdrModal(null)}
        title={ndrModal?.type === "reattempt" ? "Queue reattempt" : ndrModal?.type === "address" ? "Fix address" : "Initiate RTO"}
        maxWidth="max-w-md"
      >
        {ndrModal && (
          <NdrActionModal type={ndrModal.type} loading={ndrActionLoading} onCancel={() => setNdrModal(null)} onSubmit={handleNdrSubmit} />
        )}
      </Modal>

      {/* RTO RESTOCK MODAL */}
      <Modal open={!!rtoModalRow} onClose={() => setRtoModalRow(null)} title={`Restock · ${rtoModalRow?.awb || ""}`} maxWidth="max-w-sm">
        {rtoModalRow && <RestockForm loading={rtoActionLoading} onCancel={() => setRtoModalRow(null)} onSubmit={handleRtoRestockSubmit} />}
      </Modal>
    </div>
  );
};

/* ================= sub-components ================= */

const ServiceabilityCard = () => {
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector((s) => s.logistics.serviceability);
  const [pin, setPin] = useState("");

  const check = () => {
    const p = pin.trim();
    if (!/^[1-9][0-9]{5}$/.test(p)) { toast.error("Enter a valid 6-digit pincode."); return; }
    dispatch(checkServiceability(p));
  };

  return (
    <Card>
      <PanelHead sub="block at checkout, not at manifest">Serviceability check</PanelHead>
      <div className="flex gap-2.5 px-[18px] py-[14px]">
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
          placeholder="6-digit pincode"
          maxLength={6}
          className="flex-1 h-[38px] rounded-[8px] border border-[#D6DCE6] px-3 outline-none text-[13.5px] focus:border-[var(--mk-primary)] focus:ring-2 focus:ring-[var(--mk-primary-ring)]"
        />
        <BtnPri onClick={check} disabled={loading}>{loading ? "Checking…" : "Check"}</BtnPri>
      </div>
      {!loading && error && (
        <div className="mx-[18px] mb-4 px-3 py-2.5 rounded-[9px] border border-dashed border-[var(--mk-dgr)]/40 text-[var(--mk-dgr)] text-[12.5px]">
          <AlertTriangle size={13} className="inline mr-1.5 -mt-0.5" />
          {error}
        </div>
      )}
      {!loading && !error && data && (
        <div className={`mx-[18px] mb-4 px-3 py-2.5 rounded-[9px] border border-dashed text-[12.5px] ${data.serviceable ? "border-[#C9CFDA] text-[var(--mk-ink-700)]" : "border-[var(--mk-dgr)]/40 text-[var(--mk-dgr)]"}`}>
          {!data.serviceable && <AlertTriangle size={13} className="inline mr-1.5 -mt-0.5" />}
          {data.serviceable
            ? `${data.pincode} — serviceable · zone ${data.zone} · COD ${data.codAvailable ? "available" : "not offered — prepaid only"} · ${data.couriers?.length ?? 0} courier${(data.couriers?.length ?? 0) === 1 ? "" : "s"} cover this pin`
            : `${data.pincode} — not serviceable by any partner. Block at checkout, don't discover at manifest.`}
        </div>
      )}
    </Card>
  );
};

const ShipmentDrawerBody = ({ row, detail, trackingData, detailLoading, trackingLoading }) => {
  if (!row) return null;
  if (!row.awb) {
    return (
      <div className="py-10 text-center">
        <Truck size={26} className="mx-auto text-[#C5CCD8] mb-2" />
        <p className="text-[13px] text-[var(--mk-ink-500)]">No AWB yet — this shipment hasn't been booked through this module.</p>
      </div>
    );
  }
  const merged = { ...row, ...(detail || {}) };
  const events = normalizeTrackingEvents(trackingData);
  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-2">
        <ShipPill st={merged.status} />
        {merged.codAmount ? <Pill tone="bg-[var(--mk-info-bg)] text-[var(--mk-info)]">COD {fmt(merged.codAmount)}</Pill> : <Pill tone="bg-black/[0.06] text-[#5B6472]">Prepaid</Pill>}
        <Pill tone="bg-black/[0.06] text-[#5B6472]">Zone {merged.zone || "—"}</Pill>
      </div>
      <div className="border border-[var(--mk-line)] rounded-[10px] px-3.5 py-3 my-3 text-[12.5px] text-[var(--mk-ink-700)]">
        <b className="text-[var(--mk-ink-900)]">{merged.customer?.name || "—"}</b>
        <br />
        <span className="text-[var(--mk-ink-400)]">{merged.orderId} · {courierLabel(merged.courier)}</span>
      </div>
      <div className="border border-[var(--mk-line)] rounded-[10px] px-3.5 py-3 mb-3.5">
        <div className="flex justify-between text-[13px] py-[3px]"><span>Weight</span><span className="tabular-nums">{merged.weightKg != null ? `${merged.weightKg} kg` : "—"}</span></div>
        <div className="flex justify-between text-[13.5px] font-semibold text-[var(--mk-ink-900)] pt-2 mt-1.5 border-t border-[var(--mk-line)]">
          <span>Rate</span>
          <span className="tabular-nums">{merged.rate != null ? fmt(merged.rate) : "—"}</span>
        </div>
      </div>
      <h3 className="text-[13.5px] font-semibold text-[var(--mk-ink-900)] mb-2">
        Tracking <span className="text-[11.5px] font-normal text-[var(--mk-ink-400)]">courier webhook scans</span>
      </h3>
      {detailLoading || trackingLoading ? (
        <p className="text-[12.5px] text-[var(--mk-ink-400)]">Loading…</p>
      ) : events.length === 0 ? (
        <p className="text-[12.5px] text-[var(--mk-ink-400)]">No tracking events yet.</p>
      ) : (
        <Timeline items={events} />
      )}
    </div>
  );
};

const ShipNowForm = ({ row, booking, onCancel, onConfirm }) => {
  const dispatch = useDispatch();
  const { items: rateItems, loading: ratesLoading } = useSelector((s) => s.logistics.rates);
  const pincode = row?.shippingAddress?.postalCode || "";
  const [zone, setZone] = useState("B");
  const [zoneAuto, setZoneAuto] = useState(false);
  const [weight, setWeight] = useState(0.5);
  const [sel, setSel] = useState("");

  useEffect(() => {
    if (!pincode) return;
    let active = true;
    dispatch(checkServiceability(pincode)).then((res) => {
      if (active && checkServiceability.fulfilled?.match(res) && res.payload?.zone) {
        setZone(res.payload.zone);
        setZoneAuto(true);
      }
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pincode]);

  useEffect(() => {
    dispatch(getRates({ zone, weightKg: weight }));
  }, [dispatch, zone, weight]);

  useEffect(() => {
    if (rateItems.length && !rateItems.some((c) => c.id === sel)) setSel(rateItems[0].id);
    if (!rateItems.length) setSel("");
  }, [rateItems, sel]);

  return (
    <div>
      <p className="text-[12px] text-[var(--mk-ink-400)] pb-2">
        Rates are pulled live for the selected zone and weight.
        {zoneAuto && ` Zone ${zone} auto-detected from the shipping pincode ${pincode}.`}
      </p>
      <div className="flex gap-2.5 mb-3">
        <Fld label="Zone">
          <Sel value={zone} onChange={(e) => { setZone(e.target.value); setZoneAuto(false); }}>
            {ZONE_LIST.map((z) => <option key={z} value={z}>{z}</option>)}
          </Sel>
        </Fld>
        <Fld label="Weight (kg)">
          <input type="number" min="0.1" step="0.1" value={weight} onChange={(e) => setWeight(Math.max(0.1, Number(e.target.value) || 0.1))} className={fldClass(false)} />
        </Fld>
      </div>
      {ratesLoading ? (
        <div className="py-8 text-center text-[13px] text-[var(--mk-ink-400)]">Loading rates…</div>
      ) : rateItems.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-[var(--mk-ink-400)]">No courier rates available for this zone/weight.</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rateItems.map((c) => (
            <div
              key={c.id}
              onClick={() => setSel(c.id)}
              className={`flex items-center gap-3 border rounded-[10px] px-3.5 py-[11px] cursor-pointer ${sel === c.id ? "border-[var(--mk-primary)] ring-2 ring-[var(--mk-primary-ring)]" : "border-[var(--mk-line)] hover:border-[#C9C2EE] hover:bg-[#FBFAFE]"}`}
            >
              <div>
                <div className="text-[13px] font-semibold text-[var(--mk-ink-900)]">{c.name}</div>
                <div className="text-[11.5px] text-[var(--mk-ink-500)]">ETA {c.etaDays != null ? `${c.etaDays}d` : "—"} · zone {c.zone} · {c.weightKg}kg</div>
              </div>
              <div className="ml-auto text-[14px] font-semibold text-[var(--mk-ink-900)] tabular-nums">{fmt(c.rate)}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2.5 pt-3.5 border-t border-gray-100 mt-3.5">
        <BtnSec onClick={onCancel}>Cancel</BtnSec>
        <BtnPri disabled={!sel || booking} onClick={() => onConfirm(sel, zone, weight)}>{booking ? "Booking…" : "Generate AWB & schedule pickup"}</BtnPri>
      </div>
    </div>
  );
};

const RechargeForm = ({ onCancel, onSubmit, loading }) => {
  const [amt, setAmt] = useState("");
  const [ref, setRef] = useState("");
  return (
    <div>
      <Fld label="Amount (₹)">
        <input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="1000" className={fldClass(false)} />
      </Fld>
      <Fld label="Payment reference">
        <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Transaction / UTR reference" className={fldClass(false)} />
      </Fld>
      <p className="text-[11.5px] text-[var(--mk-ink-400)] mb-3">Recorded against this reference for reconciliation with the aggregator.</p>
      <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
        <BtnSec onClick={onCancel}>Cancel</BtnSec>
        <BtnPri disabled={!(Number(amt) > 0) || !ref.trim() || loading} onClick={() => onSubmit(Number(amt), ref.trim())}>{loading ? "Adding…" : "Add funds"}</BtnPri>
      </div>
    </div>
  );
};

const NdrActionModal = ({ type, loading, onCancel, onSubmit }) => {
  const [note, setNote] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");

  if (type === "reattempt") {
    return (
      <div>
        <Fld label="Reattempt note">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={fldClass(false)} placeholder="e.g. Customer confirmed availability after 5pm" />
        </Fld>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
          <BtnSec onClick={onCancel}>Cancel</BtnSec>
          <BtnPri disabled={loading} onClick={() => onSubmit({ note })}>{loading ? "Queuing…" : "Queue reattempt"}</BtnPri>
        </div>
      </div>
    );
  }
  if (type === "address") {
    return (
      <div>
        <Fld label="Corrected address">
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className={fldClass(false)} />
        </Fld>
        <Fld label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={fldClass(false)} />
        </Fld>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
          <BtnSec onClick={onCancel}>Cancel</BtnSec>
          <BtnPri disabled={loading || !address.trim()} onClick={() => onSubmit({ address: address.trim(), phone: phone.trim() })}>{loading ? "Saving…" : "Save & retry"}</BtnPri>
        </div>
      </div>
    );
  }
  return (
    <div>
      <Fld label="RTO reason">
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={fldClass(false)} placeholder="e.g. 3 failed delivery attempts" />
      </Fld>
      <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
        <BtnSec onClick={onCancel}>Cancel</BtnSec>
        <BtnDgr disabled={loading} onClick={() => onSubmit({ reason })}>{loading ? "Initiating…" : "Initiate RTO"}</BtnDgr>
      </div>
    </div>
  );
};

const RestockForm = ({ onCancel, onSubmit, loading }) => {
  const [qcResult, setQcResult] = useState("pass");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  return (
    <div>
      <Fld label="QC result">
        <Sel value={qcResult} onChange={(e) => setQcResult(e.target.value)}>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
        </Sel>
      </Fld>
      <Fld label="Variant ID">
        <input type="number" value={variantId} onChange={(e) => setVariantId(e.target.value)} className={fldClass(false)} placeholder="e.g. 12" />
      </Fld>
      <Fld label="Quantity">
        <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={fldClass(false)} />
      </Fld>
      <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
        <BtnSec onClick={onCancel}>Cancel</BtnSec>
        <BtnPri disabled={loading || !variantId || !(Number(quantity) > 0)} onClick={() => onSubmit({ qcResult, variantId, quantity })}>{loading ? "Saving…" : "Confirm restock"}</BtnPri>
      </div>
    </div>
  );
};

export default Logistics;
