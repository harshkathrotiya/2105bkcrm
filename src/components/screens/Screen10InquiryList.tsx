"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import { useInquiries, useClients, useQuotations, useInvoices } from "@/lib/store";

const STATUS_COLORS: Record<string, "gr" | "am" | "bl" | "rd" | "gy"> = {
  New:       "bl",
  Quoted:    "am",
  Confirmed: "gr",
  Cancelled: "rd",
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const ITEMS_PER_PAGE = 20;

export default function Screen10InquiryList() {
  const router = useRouter();
  const { inquiries } = useInquiries();
  const { clients } = useClients();
  const { quotations } = useQuotations();
  const { invoices } = useInvoices();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['VIDEO', 'LED']);
  const [page, setPage] = useState(1);

  // Build month options from existing inquiries
  const monthOptions = useMemo(() => {
    const seen = new Set<string>();
    inquiries.forEach((i) => {
      const d = new Date(i.startDate);
      seen.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    });
    return Array.from(seen).sort().reverse();
  }, [inquiries]);

  const filtered = useMemo(() => {
    let list = [...inquiries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (selectedDepts.length > 0 && selectedDepts.length < 2) {
      const activeDept = selectedDepts[0];
      list = list.filter((i) => i.department === activeDept || i.department === 'MERGED');
    } else if (selectedDepts.length === 0) {
      list = []; // If nothing selected, show empty
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) => {
        const client = clients.find((c) => c.id === i.clientId);
        const quote = quotations.find((qt) => qt.inquiryId === i.id);
        return (
          client?.name.toLowerCase().includes(q) ||
          i.eventType.toLowerCase().includes(q) ||
          (i.eventName && i.eventName.toLowerCase().includes(q)) ||
          i.venue.toLowerCase().includes(q) ||
          (quote?.quoteNo.toLowerCase().includes(q) ?? false)
        );
      });
    }

    if (statusFilter !== "All") {
      list = list.filter((i) => i.status === statusFilter);
    }

    if (monthFilter !== "All") {
      const [fy, fm] = monthFilter.split("-").map(Number);
      list = list.filter((i) => {
        const d = new Date(i.startDate);
        return d.getFullYear() === fy && d.getMonth() + 1 === fm;
      });
    }

    return list;
  }, [inquiries, clients, quotations, search, statusFilter, monthFilter, selectedDepts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const fmt = (n: number) => n.toLocaleString("en-IN");

  // Metrics
  const total = inquiries.length;
  const newCount = inquiries.filter((i) => i.status === "New").length;
  const confirmedCount = inquiries.filter((i) => i.status === "Confirmed").length;
  const quotedCount = inquiries.filter((i) => i.status === "Quoted").length;

  return (
    <>
      <SectionHeader
        title={<>Inquiry <strong>list</strong></>}
        description="All event inquiries — track status from new through confirmed."
      />
      <ScreenFrame
        breadcrumb="Inquiries"
        actions={
          <Link href="/inquiries/new" className="btn btn-primary">
            + New inquiry
          </Link>
        }
      >
        {/* Metrics */}
        <div className="metrics">
          <div className="met">
            <div className="met-l">Total</div>
            <div className="met-v">{total}</div>
          </div>
          <div className="met">
            <div className="met-l">New</div>
            <div className="met-v b">{newCount}</div>
          </div>
          <div className="met">
            <div className="met-l">Quoted</div>
            <div className="met-v a">{quotedCount}</div>
          </div>
          <div className="met">
            <div className="met-l">Confirmed</div>
            <div className="met-v g">{confirmedCount}</div>
          </div>
        </div>

        <div className="card !p-3">
          {/* Department checkboxes */}
          <div className="flex gap-4 items-center" style={{ marginBottom: '14px' }}>
            <span className="text-[11px] text-tx3 font-medium">Departments:</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-tx2">
              <input
                type="checkbox"
                checked={selectedDepts.includes('VIDEO')}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSelectedDepts(prev => checked ? [...prev, 'VIDEO'] : prev.filter(d => d !== 'VIDEO'));
                  setPage(1);
                }}
              />
              <span>Video</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-tx2">
              <input
                type="checkbox"
                checked={selectedDepts.includes('LED')}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSelectedDepts(prev => checked ? [...prev, 'LED'] : prev.filter(d => d !== 'LED'));
                  setPage(1);
                }}
              />
              <span>LED</span>
            </label>
          </div>

          {/* Search & filters */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Search by client, event type, venue, quote no..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="finp"
              style={{ flex: "1 1 auto", minWidth: "200px" }}
            />
            <select
              value={monthFilter}
              onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }}
              className="fsel"
              style={{ flex: "0 0 150px" }}
            >
              <option value="All">All months</option>
              {monthOptions.map((m) => {
                const [y, mo] = m.split("-").map(Number);
                return (
                  <option key={m} value={m}>
                    {MONTHS[mo - 1]} {y}
                  </option>
                );
              })}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="fsel"
              style={{ flex: "0 0 140px" }}
            >
              <option value="All">All statuses</option>
              <option value="New">New</option>
              <option value="Quoted">Quoted</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Client / Event</th>
                <th style={{ width: 150 }}>Dates</th>
                <th>Venue</th>
                <th style={{ width: 110, textAlign: "right" }}>Amount</th>
                <th style={{ width: 90 }}>Status</th>
                <th style={{ width: 80 }}>Invoice</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-tx3">
                    No inquiries found
                  </td>
                </tr>
              ) : (
                paginated.map((inq) => {
                  const client = clients.find((c) => c.id === inq.clientId);
                  const quote = quotations.find((q) => q.inquiryId === inq.id && q.status !== "Revised");
                  const invoice = quote ? invoices.find((inv) => inv.quotationId === quote.id) : undefined;
                  const hasQuotation = !!quote;
                  const startFmt = new Date(inq.startDate).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short",
                  });
                  const endFmt = new Date(inq.endDate).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                  });
                  return (
                    <tr 
                      key={inq.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/inquiries/new?id=${inq.id}`)}
                    >
                      <td>
                        {client ? (
                          <div
                            className="avatar-sm"
                            style={{ background: client.bg, color: client.fg }}
                          >
                            {client.initials}
                          </div>
                        ) : (
                          <div className="avatar-sm" style={{ background: "var(--s2)", color: "var(--tx3)" }}>?</div>
                        )}
                      </td>
                      <td>
                        <div className="font-medium text-tx">{inq.eventName || inq.eventType}</div>
                        <div className="text-[10px] text-tx3">
                          {client?.name ?? "Unknown"}
                          {quote ? ` · ${quote.quoteNo}` : ''}
                          {(inq.department === 'LED' || inq.department === 'MERGED') && (
                            <span style={{ marginLeft: '4px', background: 'var(--sem-bl-bg)', color: 'var(--sem-bl-tx)', borderRadius: '3px', padding: '1px 4px', fontSize: '9px' }}>
                              {inq.department === 'LED' ? 'LED' : 'MERGED'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-[11px] text-tx2">
                        {startFmt} – {endFmt}
                      </td>
                      <td className="text-[11px] text-tx2 max-w-[160px] truncate">
                        {inq.venue || "—"}
                      </td>
                      <td className="text-right font-mono font-medium text-[11px]">
                        {quote ? (
                          <span className="text-gr">₹{fmt(quote.total)}</span>
                        ) : (
                          <span className="text-tx3">—</span>
                        )}
                      </td>
                      <td>
                        <Badge variant={STATUS_COLORS[inq.status] ?? "gy"}>
                          {inq.status}
                        </Badge>
                      </td>
                      <td>
                        {invoice ? (
                          <Badge variant={invoice.status === "Paid" ? "gr" : invoice.status === "Partial paid" ? "am" : "rd"}>
                            {invoice.status === "Partial paid" ? "Partial" : invoice.status}
                          </Badge>
                        ) : quote ? (
                          <span style={{ fontSize: "9px", color: "var(--tx3)" }}>No invoice</span>
                        ) : null}
                      </td>
                      <td>
                        <Link
                          href={`/quotations/new?inquiryId=${inq.id}`}
                          className={`btn text-[10px] px-[8px] py-[4px] ${hasQuotation ? "" : "btn-primary"}`}
                          title={hasQuotation ? "View/edit quotation" : "Create quotation"}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {hasQuotation ? "Quotation" : "+ Quote"}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex justify-between items-center text-[11px] text-tx3" style={{ paddingTop: "24px" }}>
            <span>
              {filtered.length === 0
                ? "0 results"
                : `${(page - 1) * ITEMS_PER_PAGE + 1}–${Math.min(page * ITEMS_PER_PAGE, filtered.length)} of ${filtered.length}`}
            </span>
            <div className="flex gap-1">
              <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  className={`btn ${page === i + 1 ? "btn-primary" : ""}`}
                  style={{ padding: "5px 10px" }}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button className="btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next ›</button>
            </div>
          </div>
        </div>
      </ScreenFrame>
    </>
  );
}
