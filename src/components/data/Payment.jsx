// Payments module — reproduces the reference prototype
// ("Payment and logistics - E Commerce Module.html") pixel-for-pixel using
// this app's existing mk- design tokens and shared Drawer/Modal shells, now
// wired to the real Payments API (src/redux/slices/paymentSlice.js +
// paymentApi.js) instead of the fixture arrays the prototype shipped with.
//
// Several fixture-only affordances from the prototype had no real backend
// support and were removed rather than faked: the "Simulate
// refund.processed" button, the settlement "Investigate/Mark under review"
// flow, the COD "Record remittance" flow, and the fabricated Gateway
// key/test-mode/method-toggle card. Settlement and COD row shapes are
// unconfirmed against real data (dev currently has 0 settlements) so those
// tables render defensively from whatever fields are present.
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  CreditCard,
  Download,
  Info,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import Drawer from "../common/Drawer";
import Modal from "../common/Modal";
import Pagination from "../common/Pagination";
import {
  Pill, Chip, Banner, Card, PanelHead, Kpi, HBar, Insight, TableShell, Td,
  Search, Sel, BtnPri, BtnSec, BtnDgr, Fld, fldClass, Timeline, fmt, r2,
} from "../common/plKit";
import {
  getPaymentsOverview,
  getTransactions,
  getTransactionDetail,
  getRefunds,
  addRefund,
  getSettlements,
  getCodCycles,
  getPaymentsHealth,
  reconcileTxn,
  getPaymentLinks,
  addPaymentLink,
} from "../../redux/slices/paymentSlice";

/* ================= small shared bits ================= */
const NEUTRAL_TONE = "bg-black/[0.06] text-[#5B6472]";
const capitalize = (s = "") => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

const PAYMENT_METHOD_LABEL = { cod: "COD", upi: "UPI", card: "Card", netbanking: "Netbanking", wallet: "Wallet", emi: "EMI" };
const methodLabel = (m) => PAYMENT_METHOD_LABEL[(m || "").toLowerCase()] || capitalize(m) || "—";

// Known/plausible transaction statuses get polished styling; anything else
// (only "captured" is confirmed against real data so far) falls back to a
// neutral pill with the raw value capitalized, rather than crashing.
const TX_PILL = {
  captured: "bg-[var(--mk-ok-bg)] text-[var(--mk-ok)]",
  pending: "bg-[var(--mk-warn-bg)] text-[var(--mk-warn)]",
  failed: "bg-[var(--mk-dgr-bg)] text-[var(--mk-dgr)]",
  expired: NEUTRAL_TONE,
  refunded: "bg-[#F0E9FC] text-[#6D28D9]",
  partial: "bg-[#F0E9FC] text-[#6D28D9]",
};
const TX_LABEL = { captured: "Captured", pending: "Pending", failed: "Failed", expired: "Expired", refunded: "Refunded", partial: "Partially refunded" };
const TxPill = ({ status }) => {
  const key = (status || "").toLowerCase();
  if (TX_LABEL[key]) return <Pill tone={TX_PILL[key]}>{TX_LABEL[key]}</Pill>;
  return <Pill tone={NEUTRAL_TONE}>{capitalize(status) || "Unknown"}</Pill>;
};

// Generic status pill for refunds/settlements/COD cycles/gateways/payment
// links — real statuses beyond "captured"/"requested" aren't confirmed, so
// this maps a handful of plausible words to a tone and falls back to
// neutral + capitalized raw text for anything else.
const GENERIC_TONE = {
  ok: "bg-[var(--mk-ok-bg)] text-[var(--mk-ok)]",
  warn: "bg-[var(--mk-warn-bg)] text-[var(--mk-warn)]",
  dgr: "bg-[var(--mk-dgr-bg)] text-[var(--mk-dgr)]",
  neutral: NEUTRAL_TONE,
};
const GENERIC_STATUS_TONE_KEY = {
  captured: "ok", closed: "ok", processed: "ok", success: "ok", approved: "ok", verified: "ok", up: "ok", remitted: "ok",
  pending: "warn", requested: "warn", review: "warn", transit: "warn", open: "warn",
  failed: "dgr", mismatch: "dgr", rejected: "dgr", declined: "dgr", down: "dgr",
};
const StatusPill = ({ status }) => {
  const key = (status || "").toLowerCase();
  const tone = GENERIC_STATUS_TONE_KEY[key] || "neutral";
  return <Pill tone={GENERIC_TONE[tone]}>{capitalize(status) || "Unknown"}</Pill>;
};

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const humanizeEvent = (event = "") =>
  event.split("_").filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "Event";
const eventTone = (event = "") => {
  const e = event.toLowerCase();
  if (e.includes("fail")) return "dgr";
  if (e.includes("refund")) return "warn";
  if (e.includes("captured") || e.includes("processed") || e.includes("recorded")) return "ok";
  return "";
};

const NON_REFUNDABLE_STATUSES = ["refunded", "failed", "expired"];
const METHOD_COLORS = ["var(--mk-primary)", "#8A7FE0", "#5B8DEF", "#8E6FE0", "#C9A227", "#4FB0C6"];

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "txns", label: "Transactions" },
  { key: "refunds", label: "Refunds" },
  { key: "settle", label: "Settlements" },
  { key: "cod", label: "COD" },
  { key: "health", label: "Health & config" },
];

const TX_LIMIT = 10;
const REFUND_LIMIT = 10;
const SETTLE_LIMIT = 10;
const COD_LIMIT = 10;
const LINK_LIMIT = 5;

const Payment = () => {
  const dispatch = useDispatch();
  const {
    overview,
    transactions,
    transactionDetail,
    refunds,
    refundSaving,
    settlements,
    cod,
    health,
    paymentLinks,
    linkSaving,
    reconciling,
  } = useSelector((state) => state.payment);

  const [tab, setTab] = useState("overview");
  const [openTxnId, setOpenTxnId] = useState(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  const [txQ, setTxQ] = useState("");
  const [txSt, setTxSt] = useState("");
  const [txPage, setTxPage] = useState(1);
  const [refundPage, setRefundPage] = useState(1);
  const [settlePage, setSettlePage] = useState(1);
  const [codPage, setCodPage] = useState(1);

  // Overview + health power the header subtitle regardless of which tab is
  // active, so they're fetched once on mount rather than lazily per tab.
  useEffect(() => {
    dispatch(getPaymentsOverview({ days: 30 }));
    dispatch(getPaymentsHealth());
  }, [dispatch]);

  useEffect(() => {
    if (tab === "txns") {
      dispatch(getTransactions({ page: txPage, limit: TX_LIMIT }));
      dispatch(getPaymentLinks({ page: 1, limit: LINK_LIMIT }));
    }
  }, [dispatch, tab, txPage]);

  useEffect(() => {
    if (tab === "refunds") dispatch(getRefunds({ page: refundPage, limit: REFUND_LIMIT }));
  }, [dispatch, tab, refundPage]);

  useEffect(() => {
    if (tab === "settle") dispatch(getSettlements({ page: settlePage, limit: SETTLE_LIMIT }));
  }, [dispatch, tab, settlePage]);

  useEffect(() => {
    if (tab === "cod") dispatch(getCodCycles({ page: codPage, limit: COD_LIMIT }));
  }, [dispatch, tab, codPage]);

  useEffect(() => {
    if (openTxnId) dispatch(getTransactionDetail(openTxnId));
  }, [dispatch, openTxnId]);

  const openTxn = openTxnId ? transactionDetail.item : null;

  const filteredTxns = (transactions.items || [])
    .filter((t) => (txQ ? `${t.transactionId} ${t.orderId} ${t.customer?.name || ""}`.toLowerCase().includes(txQ.toLowerCase()) : true))
    .filter((t) => (txSt ? (t.status || "").toLowerCase() === txSt : true));

  const gatewayNames = health.data?.gateways?.map((g) => g.name).filter(Boolean).join(" · ");

  // Dynamic, real-data-driven decision callouts — the prototype hardcoded
  // specific fabricated numbers here ("78.4% vs 90%", "UPI is 62%"...); this
  // instead derives from whatever the overview endpoint actually returns and
  // simply shows nothing once there's not enough data to say anything.
  const insights = [];
  if (overview.data) {
    const { successRate, methodMix, refundRate, codOutstanding, failureReasons } = overview.data;
    if (typeof successRate === "number") {
      insights.push(
        successRate < 90
          ? {
              icon: AlertTriangle,
              bg: "var(--mk-warn-bg)",
              color: "var(--mk-warn)",
              content: (
                <>
                  <b>Success rate {successRate}% vs ≥90% benchmark.</b>{" "}
                  {failureReasons?.[0]
                    ? `Top failure: ${failureReasons[0].reason ?? failureReasons[0].label ?? "unknown"}.`
                    : "Investigate declined/expired attempts."}
                </>
              ),
            }
          : {
              icon: CheckCircle2,
              bg: "var(--mk-ok-bg)",
              color: "var(--mk-ok)",
              content: <><b>Success rate {successRate}%</b> — at or above the ≥90% benchmark.</>,
            },
      );
    }
    if (methodMix?.length) {
      const top = [...methodMix].sort((a, b) => (b.share ?? 0) - (a.share ?? 0))[0];
      if (top) {
        insights.push({
          icon: CreditCard,
          bg: "var(--mk-info-bg)",
          color: "var(--mk-info)",
          content: <><b>{methodLabel(top.method)} is {top.share}% of captured value.</b> Keep it first in checkout method order.</>,
        });
      }
    }
    if (typeof refundRate === "number" && refundRate > 0) {
      insights.push({
        icon: Info,
        bg: "#F0E9FC",
        color: "#6D28D9",
        content: <><b>Refund rate is {refundRate}%</b> over the last 30 days.</>,
      });
    }
    if (codOutstanding > 0) {
      insights.push({
        icon: AlertTriangle,
        bg: "var(--mk-warn-bg)",
        color: "var(--mk-warn)",
        content: <><b>{fmt(codOutstanding)} COD outstanding.</b> Delivered orders awaiting courier remittance.</>,
      });
    }
  }

  const handleRefund = async (amount, reason) => {
    if (!openTxn) return;
    const res = await dispatch(
      addRefund({ transactionId: openTxn.transactionId, orderId: openTxn.orderId, amount: r2(amount), reason }),
    );
    if (addRefund.fulfilled.match(res)) {
      toast.success(`Refund initiated · ${fmt(amount)}`);
      dispatch(getTransactionDetail(openTxn.transactionId));
    } else {
      toast.error(res.payload || "Failed to issue refund");
    }
  };

  const handleReconcile = async () => {
    if (!openTxn) return;
    const res = await dispatch(reconcileTxn({ transactionId: openTxn.transactionId }));
    if (reconcileTxn.fulfilled.match(res)) {
      toast.success("Reconciled with gateway");
      dispatch(getTransactionDetail(openTxn.transactionId));
    } else {
      toast.error(res.payload || "Failed to reconcile");
    }
  };

  const handleCreateLink = async (amount, phone) => {
    const res = await dispatch(addPaymentLink({ amount: r2(amount), phone }));
    if (addPaymentLink.fulfilled.match(res)) {
      toast.success(`Payment link sent · ${fmt(amount)}`);
      setLinkModalOpen(false);
    } else {
      toast.error(res.payload || "Failed to create payment link");
    }
  };

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-end gap-3.5 flex-wrap mb-4">
        <div>
          <h1 className="text-[23px] font-semibold text-[var(--mk-ink-900)] tracking-[-0.01em]">Payments</h1>
          <p className="text-[12.5px] text-[var(--mk-ink-500)] mt-0.5">
            {overview.data ? `${fmt(overview.data.collectedAmount)} collected · last 30 days` : overview.loading ? "Loading…" : "—"}
            {gatewayNames ? ` · ${gatewayNames}` : ""}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <BtnSec onClick={() => setLinkModalOpen(true)}>
            <CreditCard size={15} />
            Create payment link
          </BtnSec>
          <button
            type="button"
            onClick={() => toast("Export is not available yet")}
            className="inline-flex items-center gap-2 h-[34px] px-3.5 rounded-[7px] text-[12px] font-semibold bg-white text-[var(--mk-ink-700)] border border-[var(--mk-line)] hover:border-[#C9CFDA] cursor-pointer"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 flex-wrap mb-3.5">
        {TABS.map((t) => (
          <Chip key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </Chip>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <>
          <div className="grid grid-cols-6 gap-3.5 mb-4 max-[1280px]:grid-cols-3 max-[820px]:grid-cols-2">
            <Kpi
              label="Payment success rate"
              value={overview.data ? `${overview.data.successRate}%` : "—"}
              desc="Benchmark ≥90%"
              tone={overview.data && overview.data.successRate < 90 ? "bad" : undefined}
            />
            <Kpi label="Collected · 30 days" value={overview.data ? fmt(overview.data.collectedAmount) : "—"} desc="Captured value, last 30 days" />
            <Kpi label="Gateway fees · 30 days" value={overview.data ? fmt(overview.data.gatewayFees) : "—"} desc="Deducted before settlement" />
            <Kpi label="Refund rate" value={overview.data ? `${overview.data.refundRate}%` : "—"} desc="Last 30 days" />
            <Kpi label="Avg settlement lag" value={overview.data ? `T+${overview.data.settlementLagDays}d` : "—"} desc="UTR-verified, not promised" />
            <Kpi
              label="COD outstanding"
              value={overview.data ? fmt(overview.data.codOutstanding) : "—"}
              desc="Delivered, remittance pending"
              tone={overview.data && overview.data.codOutstanding > 0 ? "alert" : undefined}
            />
          </div>
          <div className="grid grid-cols-2 gap-3.5 items-start max-[1080px]:grid-cols-1">
            <Card>
              <PanelHead sub="₹ captured per day · 30d">Collected · last 30 days</PanelHead>
              {overview.loading && !overview.data ? (
                <div className="py-10 text-center text-[13px] text-[var(--mk-ink-400)]">Loading…</div>
              ) : overview.data?.collectionTrend?.length ? (
                <>
                  <div className="flex items-end gap-[3px] h-[112px] px-[18px] pt-4 pb-1.5">
                    {overview.data.collectionTrend.map((d, i) => {
                      const max = Math.max(...overview.data.collectionTrend.map((x) => x.amount || 0), 1);
                      return (
                        <div
                          key={i}
                          title={`${d.date} · ${fmt(d.amount)}`}
                          className="flex-1 min-h-[3px] rounded-t-[4px] bg-[var(--mk-primary)] opacity-[0.82] hover:opacity-100"
                          style={{ height: `${Math.max(((d.amount || 0) / max) * 100, 3)}%` }}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between px-[18px] pb-[13px] text-[10.5px] text-[var(--mk-ink-400)]">
                    <span>{formatDate(overview.data.collectionTrend[0]?.date)}</span>
                    <span>{formatDate(overview.data.collectionTrend[overview.data.collectionTrend.length - 1]?.date)}</span>
                  </div>
                </>
              ) : (
                <div className="py-10 text-center text-[13px] text-[var(--mk-ink-400)]">No collection data yet</div>
              )}
            </Card>
            <Card>
              <PanelHead sub="share of captured value · 30d">Method mix</PanelHead>
              <div className="px-[18px] py-[12px] flex flex-col gap-[9px]">
                {overview.data?.methodMix?.length ? (
                  overview.data.methodMix.map((m, i) => (
                    <HBar key={m.method || i} label={methodLabel(m.method)} pct={m.share ?? 0} color={METHOD_COLORS[i % METHOD_COLORS.length]} />
                  ))
                ) : (
                  <p className="text-[12.5px] text-[var(--mk-ink-400)] py-2">No method-mix data yet</p>
                )}
              </div>
            </Card>
            <Card>
              <PanelHead sub="share of failed attempts · 30d">Failure reasons</PanelHead>
              <div className="px-[18px] py-[12px] flex flex-col gap-[9px]">
                {overview.data?.failureReasons?.length ? (
                  overview.data.failureReasons.map((f, i) => (
                    <HBar key={i} label={f.reason ?? f.label ?? "Unknown"} pct={f.share ?? f.percent ?? f.count ?? 0} color="var(--mk-dgr)" />
                  ))
                ) : (
                  <p className="text-[12.5px] text-[var(--mk-ink-400)] py-2">No failure data yet</p>
                )}
              </div>
            </Card>
            <Card>
              <PanelHead>Decisions this data supports</PanelHead>
              {insights.length ? (
                <ul className="px-[18px] py-2">
                  {insights.map((ins, i) => (
                    <Insight key={i} icon={ins.icon} bg={ins.bg} color={ins.color}>
                      {ins.content}
                    </Insight>
                  ))}
                </ul>
              ) : (
                <p className="px-[18px] py-4 text-[12.5px] text-[var(--mk-ink-400)]">Not enough data yet to surface decisions.</p>
              )}
            </Card>
          </div>
        </>
      )}

      {/* TRANSACTIONS */}
      {tab === "txns" && (
        <>
          <Card className="mb-3.5">
            <PanelHead sub={paymentLinks.items.length ? `${paymentLinks.items.length} recent` : undefined}>Payment links</PanelHead>
            {paymentLinks.loading && paymentLinks.items.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[var(--mk-ink-400)]">Loading…</div>
            ) : paymentLinks.items.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[var(--mk-ink-400)]">No payment links yet</div>
            ) : (
              <TableShell head={[{ label: "Link" }, { label: "Amount", num: true }, { label: "Phone" }, { label: "Status" }, { label: "Created" }]}>
                {paymentLinks.items.map((l, i) => (
                  <tr key={l.id ?? l.linkId ?? i}>
                    <Td className="font-semibold text-[12.5px] text-[var(--mk-ink-900)]">{l.id ?? l.linkId ?? "—"}</Td>
                    <Td num>{l.amount != null ? fmt(l.amount) : "—"}</Td>
                    <Td>{l.phone ?? "—"}</Td>
                    <Td><StatusPill status={l.status} /></Td>
                    <Td>{formatDate(l.createdAt ?? l.date)}</Td>
                  </tr>
                ))}
              </TableShell>
            )}
          </Card>
          <Card>
            <div className="flex gap-2.5 flex-wrap items-center p-[13px_14px] border-b border-[var(--mk-line)]">
              <Search value={txQ} onChange={setTxQ} placeholder="Search txn ID, order or customer" />
              <Sel value={txSt} onChange={(e) => setTxSt(e.target.value)}>
                <option value="">All statuses</option>
                {Object.keys(TX_LABEL).map((s) => (
                  <option key={s} value={s}>
                    {TX_LABEL[s]}
                  </option>
                ))}
              </Sel>
              <div className="flex-1" />
              <span className="text-[11.5px] text-[var(--mk-ink-400)]">The webhook, not the redirect, moves money state</span>
            </div>
            <TableShell head={[{ label: "Transaction" }, { label: "Order" }, { label: "Method" }, { label: "Amount", num: true }, { label: "Fee", num: true }, { label: "Status" }, { label: "Date" }]}>
              {transactions.loading && transactions.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-[13px] text-[var(--mk-ink-400)]">
                    Loading…
                  </td>
                </tr>
              ) : filteredTxns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-[13px] text-[var(--mk-ink-400)]">
                    No transactions match
                  </td>
                </tr>
              ) : (
                filteredTxns.map((t) => (
                  <tr
                    key={t.transactionId}
                    onClick={() => setOpenTxnId(t.transactionId)}
                    className={`cursor-pointer hover:bg-[#F7F8FC] ${
                      (t.status || "").toLowerCase() === "failed"
                        ? "shadow-[inset_3px_0_0_var(--mk-dgr)]"
                        : (t.status || "").toLowerCase() === "pending"
                          ? "shadow-[inset_3px_0_0_var(--mk-warn)]"
                          : ""
                    }`}
                  >
                    <Td className="font-semibold text-[12.5px] text-[var(--mk-ink-900)]">{t.transactionId}</Td>
                    <Td>
                      <div className="text-[var(--mk-ink-500)] text-[12.5px]">
                        {t.orderId?.slice(0, 18)}
                        {t.orderId?.length > 18 ? "…" : ""}
                      </div>
                      <div className="text-[11.5px] text-[var(--mk-ink-400)]">{t.customer?.name || "—"}</div>
                    </Td>
                    <Td>{methodLabel(t.paymentMethod)}</Td>
                    <Td num>{fmt(t.amount)}</Td>
                    <Td num>{t.gatewayFee ? fmt(t.gatewayFee) : "—"}</Td>
                    <Td>
                      <TxPill status={t.status} />
                    </Td>
                    <Td>{formatDate(t.date)}</Td>
                  </tr>
                ))
              )}
            </TableShell>
            <div className="flex items-center px-[14px] py-[11px] text-[12.5px] text-[var(--mk-ink-500)] border-t border-[var(--mk-line)]">
              {filteredTxns.length} of {transactions.items.length} loaded on this page
            </div>
            <Pagination
              currentPage={transactions.meta.page}
              totalItems={transactions.meta.total}
              itemsPerPage={transactions.meta.limit || TX_LIMIT}
              onPageChange={setTxPage}
            />
          </Card>
        </>
      )}

      {/* REFUNDS */}
      {tab === "refunds" && (
        <>
          <Banner tone="info" icon={Info}>
            <b>Auto-refund on cancel.</b> Admin cancel of a captured order fires the refund automatically — manual
            refunds (from a transaction drawer) are the exception path, not the default.
          </Banner>
          <Card>
            <TableShell head={[{ label: "Refund" }, { label: "Order" }, { label: "Customer" }, { label: "Amount", num: true }, { label: "Reason" }, { label: "Status" }, { label: "Initiated" }]}>
              {refunds.loading && refunds.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-[13px] text-[var(--mk-ink-400)]">
                    Loading…
                  </td>
                </tr>
              ) : refunds.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-[13px] text-[var(--mk-ink-400)]">
                    No refunds yet
                  </td>
                </tr>
              ) : (
                refunds.items.map((r, i) => (
                  <tr key={r.refundId ?? r.id ?? i} className={(r.status || "").toLowerCase() === "requested" ? "shadow-[inset_3px_0_0_var(--mk-warn)]" : ""}>
                    <Td className="font-semibold text-[12.5px] text-[var(--mk-ink-900)]">{r.refundId ?? r.id ?? "—"}</Td>
                    <Td className="text-[var(--mk-ink-500)]">{r.orderId ? `${r.orderId.slice(0, 16)}…` : "—"}</Td>
                    <Td>{r.customer?.name || "—"}</Td>
                    <Td num>{fmt(r.amount)}</Td>
                    <Td>{r.reason || "—"}</Td>
                    <Td>
                      <StatusPill status={r.status} />
                    </Td>
                    <Td>{formatDate(r.createdAt)}</Td>
                  </tr>
                ))
              )}
            </TableShell>
            <Pagination
              currentPage={refunds.meta.page}
              totalItems={refunds.meta.total}
              itemsPerPage={refunds.meta.limit || REFUND_LIMIT}
              onPageChange={setRefundPage}
            />
          </Card>
        </>
      )}

      {/* SETTLEMENTS */}
      {tab === "settle" && (
        <>
          <Banner tone="info" icon={Info}>
            <b>Book revenue off UTR lines, not the dashboard.</b> Each batch nets out gateway fees; refunds can claw
            back from a later cycle.
          </Banner>
          <Card>
            <TableShell head={[{ label: "Batch" }, { label: "UTR" }, { label: "Date" }, { label: "Amount", num: true }, { label: "Status" }]}>
              {settlements.loading && settlements.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-[13px] text-[var(--mk-ink-400)]">
                    Loading…
                  </td>
                </tr>
              ) : settlements.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-[13px] text-[var(--mk-ink-400)]">
                    No settlements yet
                  </td>
                </tr>
              ) : (
                settlements.items.map((s, i) => (
                  <tr key={s.id ?? s.settlementId ?? i}>
                    <Td className="font-semibold text-[12.5px] text-[var(--mk-ink-900)]">{s.id ?? s.settlementId ?? "—"}</Td>
                    <Td className="text-[var(--mk-ink-500)]">{s.utr ?? "—"}</Td>
                    <Td>{formatDate(s.date ?? s.createdAt)}</Td>
                    <Td num>{s.amount != null ? fmt(s.amount) : s.netAmount != null ? fmt(s.netAmount) : "—"}</Td>
                    <Td>
                      <StatusPill status={s.status} />
                    </Td>
                  </tr>
                ))
              )}
            </TableShell>
            <Pagination
              currentPage={settlements.meta.page}
              totalItems={settlements.meta.total}
              itemsPerPage={settlements.meta.limit || SETTLE_LIMIT}
              onPageChange={setSettlePage}
            />
          </Card>
        </>
      )}

      {/* COD */}
      {tab === "cod" && (
        <>
          <Banner tone="info" icon={Info}>
            <b>Two money pipes, one ledger.</b> Prepaid money arrives via gateway settlement; COD cash is collected by
            the courier and remitted in cycles.
          </Banner>
          <div className="grid grid-cols-2 gap-3.5 items-start max-[1080px]:grid-cols-1">
            <Card>
              <PanelHead sub="courier → bank">Remittance cycles</PanelHead>
              <TableShell head={[{ label: "Cycle" }, { label: "COD collected", num: true }, { label: "Remittances", num: true }, { label: "Status" }]}>
                {cod.loading && cod.cycles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-14 text-center text-[13px] text-[var(--mk-ink-400)]">
                      Loading…
                    </td>
                  </tr>
                ) : cod.cycles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-14 text-center text-[13px] text-[var(--mk-ink-400)]">
                      No remittance cycles yet
                    </td>
                  </tr>
                ) : (
                  cod.cycles.map((c, i) => (
                    <tr key={c.cycleId ?? i}>
                      <Td className="font-semibold text-[12.5px] text-[var(--mk-ink-900)]">{c.cycleId ?? "—"}</Td>
                      <Td num>{c.collected != null ? fmt(c.collected) : "—"}</Td>
                      <Td num>{c.remittances ?? "—"}</Td>
                      <Td>
                        <StatusPill status={c.status} />
                      </Td>
                    </tr>
                  ))
                )}
              </TableShell>
              <Pagination
                currentPage={cod.meta.page}
                totalItems={cod.meta.total}
                itemsPerPage={cod.meta.limit || COD_LIMIT}
                onPageChange={setCodPage}
              />
            </Card>
            <Card>
              <PanelHead sub={`${cod.deliveredAwaitingCash.length} order${cod.deliveredAwaitingCash.length === 1 ? "" : "s"}`}>Delivered · awaiting remittance</PanelHead>
              {cod.deliveredAwaitingCash.length === 0 ? (
                <div className="py-10 text-center text-[13px] text-[var(--mk-ink-400)]">No orders awaiting remittance</div>
              ) : (
                <TableShell head={[{ label: "Order" }, { label: "Customer" }, { label: "COD amount", num: true }, { label: "Delivered" }]}>
                  {cod.deliveredAwaitingCash.map((o, i) => (
                    <tr key={o.orderId ?? o.id ?? i}>
                      <Td className="font-semibold text-[12.5px] text-[var(--mk-ink-900)]">
                        {String(o.orderId ?? o.id ?? "—").slice(0, 16)}…
                      </Td>
                      <Td>{o.customer?.name ?? o.customerName ?? "—"}</Td>
                      <Td num>{(o.amount ?? o.codAmount) != null ? fmt(o.amount ?? o.codAmount) : "—"}</Td>
                      <Td>{formatDate(o.deliveredAt ?? o.delivered)}</Td>
                    </tr>
                  ))}
                </TableShell>
              )}
            </Card>
          </div>
        </>
      )}

      {/* HEALTH & CONFIG */}
      {tab === "health" && (
        <div className="grid grid-cols-2 gap-3.5 items-start max-[1080px]:grid-cols-1">
          <Card>
            <PanelHead sub="GET /admin/payments/health">Webhook log</PanelHead>
            {health.loading && !health.data ? (
              <div className="py-10 text-center text-[13px] text-[var(--mk-ink-400)]">Loading…</div>
            ) : !health.data?.webhookLog?.length ? (
              <div className="py-10 text-center text-[13px] text-[var(--mk-ink-400)]">No webhook events yet</div>
            ) : (
              <TableShell head={[{ label: "Event" }, { label: "Reference" }, { label: "Signature" }, { label: "Result" }, { label: "Received" }]}>
                {health.data.webhookLog.map((w, i) => (
                  <tr key={i}>
                    <Td className="font-semibold text-[12.5px] text-[var(--mk-ink-900)]">{w.event ?? w.type ?? "—"}</Td>
                    <Td className="text-[var(--mk-ink-500)]">{w.ref ?? w.reference ?? "—"}</Td>
                    <Td>
                      <StatusPill status={w.signature ?? w.sig} />
                    </Td>
                    <Td>{w.result ?? w.res ?? "—"}</Td>
                    <Td>{formatDateTime(w.at ?? w.receivedAt ?? w.timestamp)}</Td>
                  </tr>
                ))}
              </TableShell>
            )}
          </Card>
          <div className="flex flex-col gap-3.5">
            <Card>
              <PanelHead>Gateways</PanelHead>
              {health.loading && !health.data ? (
                <div className="py-10 text-center text-[13px] text-[var(--mk-ink-400)]">Loading…</div>
              ) : !health.data?.gateways?.length ? (
                <div className="py-10 text-center text-[13px] text-[var(--mk-ink-400)]">No gateway data yet</div>
              ) : (
                <div className="px-[18px] py-4 flex flex-col gap-2.5">
                  {health.data.gateways.map((g) => (
                    <div
                      key={g.id ?? g.name}
                      className="flex items-center justify-between border border-[var(--mk-line)] rounded-[10px] px-3.5 py-3 text-[12.5px] text-[var(--mk-ink-700)]"
                    >
                      <div>
                        <b className="text-[var(--mk-ink-900)]">{g.name}</b>
                        {typeof g.successRate === "number" && (
                          <span className="text-[var(--mk-ink-400)] text-[11.5px]"> · {g.successRate}% success</span>
                        )}
                      </div>
                      <StatusPill status={g.status} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <PanelHead>Retry config</PanelHead>
              <div className="px-[18px] py-4 text-[12.5px] text-[var(--mk-ink-700)] flex flex-col gap-2.5">
                {health.data?.retryConfig ? (
                  <>
                    <div className="border border-[var(--mk-line)] rounded-[10px] px-3.5 py-3">
                      <b className="text-[var(--mk-ink-900)]">Max attempts</b> {health.data.retryConfig.maxAttempts}
                    </div>
                    <div className="border border-[var(--mk-line)] rounded-[10px] px-3.5 py-3">
                      <b className="text-[var(--mk-ink-900)]">Backoff</b> {health.data.retryConfig.backoffSeconds}s between attempts
                    </div>
                  </>
                ) : (
                  <p className="text-[var(--mk-ink-400)]">No retry config yet</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TRANSACTION DRAWER */}
      <Drawer
        open={!!openTxnId}
        onClose={() => setOpenTxnId(null)}
        title={openTxn?.transactionId || "Transaction"}
        width="max-w-[620px]"
        compact
        headerHeightPx={58}
        titleSizePx={17}
        bodyPaddingXPx={20}
        footer={
          openTxnId && (
            <div className="flex items-center gap-2.5 w-full">
              <BtnPri onClick={handleReconcile} disabled={reconciling || !openTxn}>
                {reconciling ? "Reconciling…" : "Fetch from gateway & reconcile"}
              </BtnPri>
              <BtnSec onClick={() => toast("Order drawer stays on the Orders page")}>Open order</BtnSec>
              <div className="flex-1" />
              <BtnSec onClick={() => setOpenTxnId(null)}>Close</BtnSec>
            </div>
          )
        }
      >
        {transactionDetail.loading && !openTxn ? (
          <div className="py-14 text-center text-[13px] text-[var(--mk-ink-400)]">Loading…</div>
        ) : openTxn ? (
          <TxnDrawerBody t={openTxn} onRefund={handleRefund} refundSaving={refundSaving} />
        ) : null}
      </Drawer>

      {/* PAYMENT LINK MODAL */}
      <Modal open={linkModalOpen} onClose={() => setLinkModalOpen(false)} title="Create payment link" maxWidth="max-w-lg">
        <PaymentLinkForm onCancel={() => setLinkModalOpen(false)} onSubmit={handleCreateLink} saving={linkSaving} />
      </Modal>
    </div>
  );
};

const TxnDrawerBody = ({ t, onRefund, refundSaving }) => {
  const [amt, setAmt] = useState("");
  const [reason, setReason] = useState("Order cancelled");
  const refundable = t.amount;
  const canRefund = !NON_REFUNDABLE_STATUSES.includes((t.status || "").toLowerCase());
  const bad = amt !== "" && !(Number(amt) > 0 && Number(amt) <= refundable + 1e-9);

  const timeline = (t.timeline || []).map((e) => ({
    l: `${humanizeEvent(e.event)}${e.detail ? " · " + e.detail : ""}`,
    t: formatDateTime(e.at),
    k: eventTone(e.event),
  }));

  return (
    <div className="space-y-0">
      {(t.status || "").toLowerCase() === "failed" && (
        <Banner tone="warn" icon={Info}>
          <b>Payment failed.</b> The order may need a retry or an alternate payment method.
        </Banner>
      )}
      <div className="flex gap-2 flex-wrap mb-2">
        <TxPill status={t.status} />
        <Pill tone={NEUTRAL_TONE}>{methodLabel(t.paymentMethod)}</Pill>
        {t.gateway && <Pill tone={NEUTRAL_TONE}>{methodLabel(t.gateway)}</Pill>}
      </div>
      <div className="border border-[var(--mk-line)] rounded-[10px] px-3.5 py-3 my-3 text-[12.5px] text-[var(--mk-ink-700)]">
        <b className="text-[var(--mk-ink-900)]">{t.customer?.name || "—"}</b>
        <br />
        <span className="text-[var(--mk-ink-400)]">{t.orderId}</span>
      </div>
      <div className="border border-[var(--mk-line)] rounded-[10px] px-3.5 py-3 mb-3.5">
        <div className="flex justify-between text-[13px] py-[3px]">
          <span>Amount</span>
          <span className="tabular-nums">{fmt(t.amount)}</span>
        </div>
        <div className="flex justify-between text-[13px] py-[3px]">
          <span>Gateway fee</span>
          <span className="tabular-nums">−{fmt(t.gatewayFee || 0)}</span>
        </div>
        <div className="flex justify-between text-[13px] py-[3px]">
          <span>Tax</span>
          <span className="tabular-nums">−{fmt(t.tax || 0)}</span>
        </div>
        <div className="flex justify-between text-[13.5px] font-semibold text-[var(--mk-ink-900)] pt-2 mt-1.5 border-t border-[var(--mk-line)]">
          <span>Net to settlement</span>
          <span className="tabular-nums">{t.netToSettlement != null ? fmt(t.netToSettlement) : "—"}</span>
        </div>
      </div>
      <h3 className="text-[13.5px] font-semibold text-[var(--mk-ink-900)] mb-2">
        Timeline <span className="text-[11.5px] font-normal text-[var(--mk-ink-400)]">gateway + webhook events</span>
      </h3>
      {timeline.length ? <Timeline items={timeline} /> : <p className="text-[12.5px] text-[var(--mk-ink-400)]">No events yet</p>}
      {canRefund && (
        <div className="border border-dashed border-[#C9CFDA] rounded-[10px] p-3.5 mt-3.5 bg-[#FBFCFE]">
          <h4 className="text-[12.5px] font-semibold text-[var(--mk-ink-900)] mb-2.5">Issue refund</h4>
          <div className="grid grid-cols-2 gap-3.5">
            <Fld label={`Amount · up to ${fmt(refundable)}`} error={bad && amt !== "" ? "Must be above ₹0 and at most the transaction amount." : undefined}>
              <input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.00" className={fldClass(bad && amt !== "")} />
            </Fld>
            <Fld label="Reason">
              <select value={reason} onChange={(e) => setReason(e.target.value)} className={fldClass(false)}>
                <option>Order cancelled</option>
                <option>Damaged in transit</option>
                <option>Wrong item shipped</option>
                <option>Customer return</option>
              </select>
            </Fld>
          </div>
          <BtnDgr
            disabled={refundSaving || !(Number(amt) > 0 && Number(amt) <= refundable + 1e-9)}
            onClick={() => {
              onRefund(Number(amt), reason);
              setAmt("");
            }}
            className="!h-9 !text-[12.5px]"
          >
            <CreditCard size={14} />
            {refundSaving ? "Refunding…" : "Refund"}
          </BtnDgr>
          <p className="text-[11.5px] text-[var(--mk-ink-400)] mt-2">Refund timelines depend on the original payment method.</p>
        </div>
      )}
    </div>
  );
};

const PaymentLinkForm = ({ onCancel, onSubmit, saving }) => {
  const [amt, setAmt] = useState("");
  const [phone, setPhone] = useState("");
  const badA = amt !== "" && !(Number(amt) > 0);
  const badP = phone !== "" && phone.replace(/\D/g, "").length !== 10;
  const canSubmit = Number(amt) > 0 && phone.replace(/\D/g, "").length === 10;
  return (
    <div>
      <p className="text-[12.5px] text-[var(--mk-ink-500)] pb-2.5">
        For WhatsApp / Instagram / walk-in orders — manual orders need a first-class capture path or they never enter
        this system.
      </p>
      <div className="grid grid-cols-2 gap-3.5">
        <Fld label="Amount (₹)" error={badA ? "Amount must be above ₹0." : undefined}>
          <input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.00" className={fldClass(badA)} />
        </Fld>
        <Fld label="Customer phone" error={badP ? "Enter a valid 10-digit number." : undefined}>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" className={fldClass(badP)} />
        </Fld>
      </div>
      <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
        <BtnSec onClick={onCancel}>Cancel</BtnSec>
        <BtnPri disabled={!canSubmit || saving} onClick={() => onSubmit(Number(amt), phone.replace(/\D/g, ""))}>
          {saving ? "Sending…" : "Send link"}
        </BtnPri>
      </div>
    </div>
  );
};

export default Payment;
