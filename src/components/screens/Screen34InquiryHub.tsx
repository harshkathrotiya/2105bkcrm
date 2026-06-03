"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import {
  useInquiries,
  useQuotations,
  useInvoices,
  useClients,
  useCalendar,
} from "@/lib/store";
import * as api from "@/lib/api";
import { approveQuotation } from "@/lib/approve-quotation";
import { useToast } from "../ui/Toast";
import {
  FileText, Receipt, Users, Building2, Wallet, CalendarDays, Pencil,
  ArrowRight, CheckCircle2, AlertCircle,
} from "lucide-react";

const fmt = (n: number) => (n ?? 0).toLocaleString("en-IN");

type Tab = "overview" | "quotation" | "invoice" | "crew" | "equipment" | "payments";

export default function Screen34InquiryHub({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { inquiries, loading: inqLoading } = useInquiries();
  const { quotations, dispatchQuotations, loading: quoLoading } = useQuotations();
  const { invoices, dispatchInvoices, loading: invLoading } = useInvoices();
  const { clients } = useClients();
  const { dispatchInquiries } = useInquiries();
  const { calendarEvents, dispatchCalendar } = useCalendar();

  const [tab, setTab] = useState<Tab>("overview");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [approving, setApproving] = useState(false);
  const [videoPercent, setVideoPercent] = useState(82);
  const [showApprove, setShowApprove] = useState(false);

  const inquiry = inquiries.find((i) => i.id === inquiryId);
  const client = inquiry ? clients.find((c) => c.id === inquiry.clientId) : undefined;

  // The active (non-revised) quotation for this inquiry
  const quotation = useMemo(
    () => quotations.find((q) => q.inquiryId === inquiryId && q.status !== "Revised"),
    [quotations, inquiryId]
  );
  const invoice = useMemo(
    () => (quotation ? invoices.find((inv) => inv.quotationId === quotation.id) : undefined),
    [invoices, quotation]
  );

  // Crew assignments (fetched per inquiry)
  useEffect(() => {
    let active = true;
    api.fetchStaffAssignments(inquiryId)
      .then((a) => { if (active) setAssignments(a); })
      .catch(() => { if (active) setAssignments([]); });
    return () => { active = false; };
  }, [inquiryId]);

  const crewCost = useMemo(() => assignments.reduce((s, a) => s + (a.totalAmount || 0), 0), [assignments]);

  const loading = inqLoading || quoLoading || invLoading;

  if (loading) {
    return (
      <ScreenFrame breadcrumb="Inquiry › Loading…">
        <LoadingSkeleton rows={8} message="Loading inquiry…" />
      </ScreenFrame>
    );
  }

  if (!inquiry) {
    return (
      <>
        <SectionHeader title={<>Inquiry <strong>not found</strong></>} />
        <div className="sf"><div className="cnt">
          No inquiry with that ID. <Link href="/inquiries" className="text-acc hover:underline">Back to inquiries</Link>.
        </div></div>
      </>
    );
  }

  const isLed = inquiry.department === "LED" || inquiry.department === "MERGED";

  const doApprove = async () => {
    if (!quotation || approving) return;
    setApproving(true);
    try {
      const res = await approveQuotation({
        quotation, inquiry, invoices, calendarEvents, videoPercent,
        dispatchQuotations, dispatchInquiries, dispatchInvoices, dispatchCalendar,
      });
      setShowApprove(false);
      // jump to the invoice tab to show the result
      setTab("invoice");
      if (res.invoiceCreated) router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  // ── Pipeline status ────────────────────────────────────────────────────────
  const steps = [
    { key: "inquiry", label: "Inquiry", done: true },
    { key: "quotation", label: "Quotation", done: !!quotation },
    { key: "approved", label: "Approved", done: quotation?.status === "Approved" },
    { key: "invoice", label: "Invoice", done: !!invoice },
    { key: "paid", label: "Paid", done: invoice?.status === "Paid" },
  ];

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: CalendarDays },
    { key: "quotation", label: "Quotation", icon: FileText },
    { key: "invoice", label: "Invoice", icon: Receipt },
    { key: "crew", label: "Crew", icon: Users },
    { key: "equipment", label: "Equipment", icon: Building2 },
    { key: "payments", label: "Staff Pay", icon: Wallet },
  ];

  return (
    <>
      <SectionHeader
        title={<>{inquiry.eventName || inquiry.eventType} · <strong>{client?.name || "Client"}</strong></>}
        description={`${inquiry.startDate}${inquiry.endDate && inquiry.endDate !== inquiry.startDate ? ` → ${inquiry.endDate}` : ""}${inquiry.venue ? ` · ${inquiry.venue}` : ""}`}
      />

      <ScreenFrame
        breadcrumbs={[{ label: "Inquiries", href: "/inquiries" }, { label: inquiry.eventName || inquiry.eventType }]}
        actions={
          <>
            <Badge variant={inquiry.status === "Confirmed" ? "gr" : inquiry.status === "Cancelled" ? "rd" : "bl"}>{inquiry.status}</Badge>
            <Link href={`/inquiries/new?id=${inquiry.id}`} className="btn text-[11px]"><Pencil size={12} /> Edit</Link>
          </>
        }
      >
        {/* Pipeline */}
        <div className="flow" style={{ marginBottom: 18 }}>
          {steps.map((s, i) => (
            <span key={s.key} style={{ display: "contents" }}>
              <span className={`flow-step ${s.done ? "flow-done" : "flow-next"}`}>{s.label}</span>
              {i < steps.length - 1 && <span className="flow-arr">›</span>}
            </span>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--b1)", marginBottom: 16, flexWrap: "wrap" }}>
          {tabs.map((t) => {
            const Icon = t.icon;
            const activeTab = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="btn"
                style={{
                  border: "none", borderBottom: activeTab ? "2px solid var(--acc)" : "2px solid transparent",
                  borderRadius: 0, background: "transparent", color: activeTab ? "var(--tx)" : "var(--tx3)",
                  fontWeight: activeTab ? 600 : 460, padding: "8px 12px",
                }}
              >
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
            <div className="card" style={{ margin: 0 }}>
              <div className="card-t">Event details</div>
              <Row k="Client" v={client?.name} />
              <Row k="Event" v={inquiry.eventName || inquiry.eventType} />
              <Row k="Type" v={inquiry.eventType} />
              <Row k="Department" v={inquiry.department} />
              <Row k="Dates" v={`${inquiry.startDate} → ${inquiry.endDate || inquiry.startDate}`} />
              <Row k="Time" v={`${inquiry.startTime || "—"} – ${inquiry.endTime || "—"}`} />
              <Row k="Venue" v={inquiry.venue || "—"} />
              {inquiry.notes && <Row k="Notes" v={inquiry.notes} />}
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className="card-t">Status summary</div>
              <Row k="Quotation" v={quotation ? `${quotation.quoteNo} · ${quotation.status}` : "Not created"} />
              <Row k="Quote total" v={quotation ? `₹${fmt(quotation.total)}` : "—"} />
              <Row k="Invoice" v={invoice ? `${invoice.invoiceNo} · ${invoice.status}` : "Not created"} />
              <Row k="Balance due" v={invoice ? `₹${fmt(invoice.balance)}` : "—"} />
              <Row k="Crew assigned" v={`${assignments.length} · ₹${fmt(crewCost)}`} />
            </div>
          </div>
        )}

        {/* ── QUOTATION ── */}
        {tab === "quotation" && (
          <div className="card" style={{ margin: 0 }}>
            <div className="card-t">Quotation</div>
            {!quotation ? (
              <Empty
                msg="No quotation yet for this inquiry."
                action={{ label: "+ Create quotation", href: `/quotations/new?inquiryId=${inquiry.id}` }}
              />
            ) : (
              <>
                <Row k="Quote no." v={quotation.quoteNo} />
                <Row k="Status" v={quotation.status} />
                <Row k="Subtotal" v={`₹${fmt(quotation.subtotal)}`} />
                <Row k="GST (18%)" v={`₹${fmt(quotation.cgst + quotation.sgst)}`} />
                <Row k="Total" v={`₹${fmt(quotation.total)}`} />
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <Link href={`/quotations/${quotation.id}/pdf`} className="btn text-[12px]"><FileText size={13} /> View / Edit PDF</Link>
                  <Link href={`/quotations/new?inquiryId=${inquiry.id}`} className="btn text-[12px]">Edit line items</Link>
                  {quotation.status !== "Approved" && !invoice && (
                    <button className="btn btn-success text-[12px]" onClick={() => setShowApprove(true)}>
                      <CheckCircle2 size={13} /> Approve &amp; generate invoice
                    </button>
                  )}
                  {quotation.status === "Approved" && (
                    <Badge variant="gr">Approved</Badge>
                  )}
                </div>

                {/* Inline approve dialog */}
                {showApprove && (
                  <div style={{ marginTop: 16, padding: 14, background: "var(--s2)", border: "1px solid var(--b2)", borderRadius: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Approve &amp; generate invoice</div>
                    {!isLed && (
                      <div className="field" style={{ marginBottom: 10 }}>
                        <div className="flbl">Video / Photo split</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <input
                            type="number" className="finp" style={{ width: 80 }} min={0} max={100}
                            value={videoPercent}
                            onChange={(e) => setVideoPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                          />
                          <span className="text-[11px] text-tx3">
                            % Video · {100 - videoPercent}% Photo
                            {quotation.subtotal > 0 && (
                              <span style={{ marginLeft: 8, color: "var(--tx2)" }}>
                                (₹{fmt(Math.round(quotation.subtotal * videoPercent / 100))} + ₹{fmt(Math.round(quotation.subtotal * (100 - videoPercent) / 100))})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="text-[11px] text-tx3" style={{ marginBottom: 10 }}>
                      This confirms the inquiry, creates calendar events, and generates an invoice (50% advance).
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-success text-[12px]" onClick={doApprove} disabled={approving}>
                        {approving ? "Approving…" : "✓ Confirm approval"}
                      </button>
                      <button className="btn text-[12px]" onClick={() => setShowApprove(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── INVOICE ── */}
        {tab === "invoice" && (
          <div className="card" style={{ margin: 0 }}>
            <div className="card-t">Invoice</div>
            {!invoice ? (
              <Empty
                msg={quotation?.status === "Approved" ? "Approved — invoice not generated yet." : "Invoice is created when the quotation is approved."}
                action={quotation ? { label: "Go to quotation", onClick: () => setTab("quotation") } : undefined}
              />
            ) : (
              <>
                <Row k="Invoice no." v={invoice.invoiceNo} />
                <Row k="Status" v={invoice.status} />
                <Row k="Advance" v={`₹${fmt(invoice.advance)} ${invoice.advanceReceived ? "(received)" : "(pending)"}`} />
                <Row k="Balance" v={`₹${fmt(invoice.balance)} ${invoice.balanceReceived ? "(received)" : "(pending)"}`} />
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <Link href={`/invoices/${invoice.id}`} className="btn text-[12px]"><Receipt size={13} /> View invoice</Link>
                  <Link href={`/invoices/${invoice.id}/payment`} className="btn btn-primary text-[12px]"><Wallet size={13} /> Record payment</Link>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── CREW ── */}
        {tab === "crew" && (
          <div className="card" style={{ margin: 0 }}>
            <div className="card-t">Crew assignments</div>
            {!quotation ? (
              <Empty
                msg="Crew positions come from the quotation. Create a quotation first."
                icon={<Users size={26} />}
                action={{ label: "Create quotation", href: `/quotations/new?inquiryId=${inquiry.id}` }}
              />
            ) : assignments.length === 0 ? (
              <Empty msg="No crew assigned yet." action={{ label: "Assign crew", href: `/staff/assign?inquiryId=${inquiry.id}` }} />
            ) : (
              <>
                <table className="tbl">
                  <thead><tr><th>Staff</th><th>Position</th><th>Days</th><th className="text-right">Amount</th></tr></thead>
                  <tbody>
                    {assignments.map((a) => (
                      <tr key={a.id}>
                        <td>{a.staffName}</td>
                        <td>{a.positionName || "—"}</td>
                        <td>{a.daysAssigned}</td>
                        <td className="text-right font-mono">₹{fmt(a.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                  <span className="text-[12px] text-tx2">Total crew cost: <strong>₹{fmt(crewCost)}</strong></span>
                  <Link href={`/staff/assign?inquiryId=${inquiry.id}`} className="btn text-[12px]">Manage crew <ArrowRight size={12} /></Link>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── EQUIPMENT ── */}
        {tab === "equipment" && (
          <div className="card" style={{ margin: 0 }}>
            <div className="card-t">Equipment &amp; warehouse</div>
            {!quotation ? (
              <Empty
                msg="Equipment needs come from the quotation. Create a quotation first."
                icon={<Building2 size={26} />}
                action={{ label: "Create quotation", href: `/quotations/new?inquiryId=${inquiry.id}` }}
              />
            ) : (
              <Empty
                msg="Manage equipment bookings, vendor rentals, and (for LED) dispatch logistics in the warehouse check."
                icon={<Building2 size={26} />}
                action={{ label: "Open warehouse check", href: `/warehouse/check?inquiryId=${inquiry.id}` }}
              />
            )}
          </div>
        )}

        {/* ── STAFF PAYMENTS ── */}
        {tab === "payments" && (
          <div className="card" style={{ margin: 0 }}>
            <div className="card-t">Staff payments</div>
            <Empty
              msg="Record per-event crew payouts and track who's been paid."
              icon={<Wallet size={26} />}
              action={{ label: "Open staff payments", href: `/staff/payments?inquiryId=${inquiry.id}` }}
            />
          </div>
        )}
      </ScreenFrame>
    </>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="row-item">
      <span className="text-[11px] text-tx3">{k}</span>
      <span className="text-[12px]" style={{ fontWeight: 500 }}>{v || "—"}</span>
    </div>
  );
}

function Empty({ msg, action, icon }: { msg: string; action?: { label: string; href?: string; onClick?: () => void }; icon?: React.ReactNode }) {
  return (
    <div style={{ padding: "24px 8px", textAlign: "center", color: "var(--tx3)" }}>
      {icon && <div style={{ marginBottom: 8, display: "flex", justifyContent: "center", opacity: 0.6 }}>{icon}</div>}
      {!icon && <AlertCircle size={22} style={{ opacity: 0.5, marginBottom: 8 }} />}
      <div style={{ fontSize: 12.5, color: "var(--tx2)", marginBottom: action ? 12 : 0 }}>{msg}</div>
      {action && (action.href
        ? <Link href={action.href} className="btn btn-primary text-[12px]">{action.label}</Link>
        : <button className="btn btn-primary text-[12px]" onClick={action.onClick}>{action.label}</button>
      )}
    </div>
  );
}
