"use client";

import { useState, useMemo } from "react";
import { useDebounce } from "@/lib/use-debounce";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import { useInquiries, useClients, useQuotations, useInvoices } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import Pagination from "../ui/Pagination";
import LoadingSkeleton, { ShimmerBar } from "../ui/LoadingSkeleton";

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
  const { can } = useCurrentUser();
  const canCreateInquiry = can("inquiries.create");
  const canCreateQuote = can("quotations.create");
  const canAssignCrew = can("staff.edit");
  const canViewWarehouse = can("warehouse.view");
  const { inquiries, loading: inquiriesLoading } = useInquiries();
  const { clients, loading: clientsLoading } = useClients();
  const { quotations } = useQuotations();
  const { invoices } = useInvoices();
  const loading = inquiriesLoading || clientsLoading;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState<'All'|'VIDEO'|'LED'|'MERGED'>('All');
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

    if (deptFilter !== 'All') {
      list = list.filter((i) => i.department === deptFilter);
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((i) => {
        const client = clients.find((c) => c.id === i.clientId);
        const quote = quotations.find((qt) => qt.inquiryId === i.id);
        return (
          client?.name.toLowerCase().includes(q) ||
          i.eventType.toLowerCase().includes(q) ||
          (i.eventName && i.eventName.toLowerCase().includes(q)) ||
          i.venue.toLowerCase().includes(q) ||
          (quote?.quoteNo?.toLowerCase().includes(q) ?? false)
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
  }, [inquiries, clients, quotations, debouncedSearch, statusFilter, monthFilter, deptFilter]);

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
        breadcrumbs={[{ label: "Inquiries" }]}
        actions={
          canCreateInquiry ? (
            <Link href="/inquiries/new" className="btn btn-primary">
              + New inquiry
            </Link>
          ) : null
        }
      >
        {loading ? (
          <>
            {/* Metrics Loading State */}
            <div className="metrics">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="met" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <ShimmerBar width="40%" height="10px" style={{ opacity: 0.6, animationDelay: `${i * 40}ms` }} />
                  <ShimmerBar width="20%" height="24px" style={{ animationDelay: `${i * 40 + 20}ms` }} />
                </div>
              ))}
            </div>

            <div className="card !p-3">
              {/* Dept tabs Loading State */}
              <div className="flex gap-1" style={{ marginBottom: '14px' }}>
                {["All", "Video", "LED", "Merged"].map((tab, i) => (
                  <ShimmerBar
                    key={tab}
                    width={tab === "All" ? "40px" : "60px"}
                    height="26px"
                    radius="8px"
                    style={{ animationDelay: `${i * 40 + 100}ms` }}
                  />
                ))}
              </div>

              {/* Search & filters Loading State */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                <ShimmerBar width="100%" height="38px" radius="8px" style={{ flex: "1 1 auto", animationDelay: "200ms" }} />
                <ShimmerBar width="150px" height="38px" radius="8px" style={{ flex: "0 0 150px", animationDelay: "240ms" }} />
                <ShimmerBar width="140px" height="38px" radius="8px" style={{ flex: "0 0 140px", animationDelay: "280ms" }} />
              </div>

              {/* Table Loading State */}
              <div className="tbl-scroll">
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
                    {Array.from({ length: 6 }).map((_, ri) => (
                      <tr key={ri} style={{ cursor: "default" }}>
                        <td>
                          <ShimmerBar width="28px" height="28px" radius="50%" style={{ animationDelay: `${ri * 60 + 300}ms` }} />
                        </td>
                        <td>
                          <ShimmerBar width="70%" height="13px" style={{ animationDelay: `${ri * 60 + 320}ms`, marginBottom: "4px" }} />
                          <ShimmerBar width="40%" height="9px" style={{ animationDelay: `${ri * 60 + 340}ms` }} />
                        </td>
                        <td>
                          <ShimmerBar width="90px" height="11px" style={{ animationDelay: `${ri * 60 + 330}ms` }} />
                        </td>
                        <td>
                          <ShimmerBar width="120px" height="11px" style={{ animationDelay: `${ri * 60 + 350}ms` }} />
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end">
                            <ShimmerBar width="60px" height="11px" style={{ animationDelay: `${ri * 60 + 360}ms` }} />
                          </div>
                        </td>
                        <td>
                          <ShimmerBar width="65px" height="18px" radius="9999px" style={{ animationDelay: `${ri * 60 + 370}ms` }} />
                        </td>
                        <td>
                          <ShimmerBar width="55px" height="18px" radius="9999px" style={{ animationDelay: `${ri * 60 + 380}ms` }} />
                        </td>
                        <td>
                          <ShimmerBar width="70px" height="26px" radius="8px" style={{ animationDelay: `${ri * 60 + 390}ms` }} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Loading State */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
              <ShimmerBar width="120px" height="12px" style={{ opacity: 0.6 }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <ShimmerBar width="32px" height="32px" radius="6px" />
                <ShimmerBar width="32px" height="32px" radius="6px" />
                <ShimmerBar width="32px" height="32px" radius="6px" />
              </div>
            </div>
          </div>
          </>
        ) : (
        <>
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
          {/* Dept tabs */}
          <div style={{ marginBottom: '14px' }}>
            <select className="finp" style={{ width: "auto" }} value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value as 'All' | 'VIDEO' | 'LED' | 'MERGED'); setPage(1); }}>
              <option value="All">All Departments</option>
              <option value="VIDEO">Video</option>
              <option value="LED">LED</option>
              <option value="MERGED">Merged</option>
            </select>
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

          <div className="tbl-scroll">
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
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px 16px" }}>
                    <div style={{ color: "var(--tx3)", fontSize: "12px", marginBottom: "12px" }}>
                      {search || statusFilter !== "All" || monthFilter !== "All" || deptFilter !== "All"
                        ? "No inquiries match your filters."
                        : "No inquiries yet."}
                    </div>
                    {(search || statusFilter !== "All" || monthFilter !== "All" || deptFilter !== "All") ? (
                      <button
                        className="btn"
                        onClick={() => { setSearch(""); setStatusFilter("All"); setMonthFilter("All"); setDeptFilter("All"); }}
                      >
                        Clear filters
                      </button>
                    ) : canCreateInquiry ? (
                      <Link href="/inquiries/new" className="btn btn-primary">
                        + New inquiry
                      </Link>
                    ) : null}
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
                      onClick={() => router.push(`/inquiries/${inq.id}`)}
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
                        <div className="font-medium text-tx">{client?.name ?? "Unknown"}</div>
                        <div className="text-[10px] text-tx3">
                          {inq.eventName ? `${inq.eventName} (${inq.eventType})` : inq.eventType}
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
                        <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                          {!hasQuotation && canCreateQuote && (
                            <Link
                              href={`/inquiries/${inq.id}/quotation`}
                              className="btn btn-primary text-[10px] px-[8px] py-[4px]"
                              title="Create quotation"
                            >
                              + Quote
                            </Link>
                          )}
                          {hasQuotation && !invoice && (
                            <Link
                              href={`/inquiries/${inq.id}/quotation`}
                              className="btn text-[10px] px-[8px] py-[4px]"
                              title="View/edit quotation"
                            >
                              Quotation
                            </Link>
                          )}
                          {invoice && (
                            <Link
                              href={`/invoices/${invoice.id}`}
                              className="btn btn-primary text-[10px] px-[8px] py-[4px]"
                              title="View invoice"
                            >
                              Invoice <ArrowRight size={11} />
                            </Link>
                          )}
                          {inq.status === "Confirmed" && (canAssignCrew || canViewWarehouse) && (
                            <div className="flex gap-1">
                              {canAssignCrew && (
                                <Link
                                  href={`/inquiries/${inq.id}/crew`}
                                  className="btn text-[10px] px-[6px] py-[4px]"
                                  title="Assign crew"
                                >
                                  Crew
                                </Link>
                              )}
                              {canViewWarehouse && (
                                <Link
                                  href={`/inquiries/${inq.id}/warehouse`}
                                  className="btn text-[10px] px-[6px] py-[4px]"
                                  title="Warehouse check"
                                >
                                  Warehouse
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setPage}
          />
        </div>
        </>
        )}
      </ScreenFrame>
    </>
  );
}
