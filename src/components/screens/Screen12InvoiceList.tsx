"use client";

import { useState, useMemo } from "react";
import { useDebounce } from "@/lib/use-debounce";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import { useInvoices, useInquiries, useQuotations } from "@/lib/store";
import Pagination from "../ui/Pagination";
import LoadingSkeleton, { ShimmerBar } from "../ui/LoadingSkeleton";

const STATUS_COLORS: Record<string, "gr" | "am" | "bl" | "rd" | "gy"> = {
  Paid:           "gr",
  "Partial paid": "am",
  Unpaid:         "rd",
};

const ITEMS_PER_PAGE = 8;

export default function Screen12InvoiceList() {
  const router = useRouter();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { inquiries } = useInquiries();
  const { quotations } = useQuotations();
  const loading = invoicesLoading;

  const getInvDept = (inv: typeof invoices[0]) => {
    const quot = quotations.find((q) => q.id === inv.quotationId);
    const inq = quot ? inquiries.find((i) => i.id === quot.inquiryId) : undefined;
    return inq?.department ?? 'VIDEO';
  };

  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "All";
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState(
    ["All", "Paid", "Partial paid", "Unpaid"].includes(initialStatus) ? initialStatus : "All"
  );
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['VIDEO', 'LED']);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = [...invoices].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (inv) =>
          inv.clientName.toLowerCase().includes(q) ||
          inv.eventName.toLowerCase().includes(q) ||
          inv.invoiceNo.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "All") {
      list = list.filter((inv) => inv.status === statusFilter);
    }
    if (selectedDepts.length > 0 && selectedDepts.length < 2) {
      const activeDept = selectedDepts[0];
      list = list.filter((inv) => {
        const dept = getInvDept(inv);
        return dept === activeDept || dept === 'MERGED';
      });
    } else if (selectedDepts.length === 0) {
      list = [];
    }
    return list;
  }, [invoices, debouncedSearch, statusFilter, selectedDepts, inquiries, quotations]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const fmt = (n: number) => n.toLocaleString("en-IN");

  // Metrics
  const totalInvoices = invoices.length;
  const totalValue = invoices.reduce((s, inv) => s + inv.advance + inv.balance, 0);
  const totalReceived = invoices.reduce(
    (s, inv) =>
      s +
      (inv.advanceReceived ? inv.advance : 0) +
      (inv.balanceReceived ? inv.balance : 0),
    0
  );
  const totalPending = totalValue - totalReceived;

  return (
    <>
      <SectionHeader
        title={<>Invoice <strong>list</strong></>}
        description="All invoices — track payment status and HDD delivery."
      />
      <ScreenFrame breadcrumbs={[{ label: "Invoices" }]}>
        {loading ? (
          <>
            {/* Metrics Loading State */}
            <div className="metrics">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="met" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <ShimmerBar width="40%" height="10px" style={{ opacity: 0.6, animationDelay: `${i * 40}ms` }} />
                  <ShimmerBar width="30%" height="24px" style={{ animationDelay: `${i * 40 + 20}ms` }} />
                </div>
              ))}
            </div>

            <div className="card !p-3">
              {/* Dept checkboxes Loading State */}
              <div className="flex gap-4 items-center" style={{ marginBottom: '14px' }}>
                <ShimmerBar width="70px" height="11px" style={{ opacity: 0.6 }} />
                <div className="flex gap-3">
                  <ShimmerBar width="50px" height="16px" radius="4px" />
                  <ShimmerBar width="50px" height="16px" radius="4px" />
                </div>
              </div>

              {/* Search & filters Loading State */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                <ShimmerBar width="100%" height="38px" radius="8px" style={{ flex: "1 1 auto", animationDelay: "200ms" }} />
                <ShimmerBar width="140px" height="38px" radius="8px" style={{ flex: "0 0 140px", animationDelay: "240ms" }} />
              </div>

              {/* Table Loading State */}
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Invoice no.</th>
                      <th>Event</th>
                      <th>Client</th>
                      <th style={{ width: 110, textAlign: "right" }}>Total</th>
                      <th style={{ width: 110, textAlign: "right" }}>Balance</th>
                      <th style={{ width: 90 }}>Status</th>
                      <th style={{ width: 80 }}>HDD / Install</th>
                      <th style={{ width: 80 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 6 }).map((_, ri) => (
                      <tr key={ri} style={{ cursor: "default" }}>
                        <td>
                          <ShimmerBar width="90px" height="13px" style={{ animationDelay: `${ri * 60 + 300}ms` }} />
                        </td>
                        <td>
                          <ShimmerBar width="140px" height="13px" style={{ animationDelay: `${ri * 60 + 310}ms`, marginBottom: "4px" }} />
                          <ShimmerBar width="70%" height="9px" style={{ animationDelay: `${ri * 60 + 320}ms` }} />
                        </td>
                        <td>
                          <ShimmerBar width="120px" height="13px" style={{ animationDelay: `${ri * 60 + 330}ms` }} />
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end">
                            <ShimmerBar width="70px" height="11px" style={{ animationDelay: `${ri * 60 + 340}ms` }} />
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end">
                            <ShimmerBar width="60px" height="11px" style={{ animationDelay: `${ri * 60 + 350}ms` }} />
                          </div>
                        </td>
                        <td>
                          <ShimmerBar width="60px" height="18px" radius="9999px" style={{ animationDelay: `${ri * 60 + 360}ms` }} />
                        </td>
                        <td>
                          <ShimmerBar width="60px" height="18px" radius="9999px" style={{ animationDelay: `${ri * 60 + 375}ms` }} />
                        </td>
                        <td>
                          <ShimmerBar width="65px" height="26px" radius="8px" style={{ animationDelay: `${ri * 60 + 390}ms` }} />
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
            <div className="met-l">Total invoices</div>
            <div className="met-v">{totalInvoices}</div>
          </div>
          <div className="met">
            <div className="met-l">Total value</div>
            <div className="met-v b text-[18px]">₹{fmt(totalValue)}</div>
          </div>
          <div className="met">
            <div className="met-l">Received</div>
            <div className="met-v g text-[18px]">₹{fmt(totalReceived)}</div>
          </div>
          <div className="met">
            <div className="met-l">Pending</div>
            <div className="met-v a text-[18px]">₹{fmt(totalPending)}</div>
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
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Search by client, event, invoice no..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="finp"
              style={{ flex: "1 1 auto", minWidth: "200px" }}
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="fsel"
              style={{ flex: "0 0 140px" }}
            >
              <option value="All">All statuses</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial paid">Partial paid</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Invoice no.</th>
                <th>Event</th>
                <th>Client</th>
                <th style={{ width: 110, textAlign: "right" }}>Total</th>
                <th style={{ width: 110, textAlign: "right" }}>Balance</th>
                <th style={{ width: 90 }}>Status</th>
                <th style={{ width: 80 }}>HDD / Install</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px 16px" }}>
                    <div style={{ color: "var(--tx3)", fontSize: "12px", marginBottom: "12px" }}>
                      {search || statusFilter !== "All"
                        ? "No invoices match your filters."
                        : "No invoices yet."}
                    </div>
                    {(search || statusFilter !== "All") ? (
                      <button
                        className="btn"
                        onClick={() => { setSearch(""); setStatusFilter("All"); }}
                      >
                        Clear filters
                      </button>
                    ) : (
                      <Link href="/inquiries" className="btn btn-primary">
                        Start with an inquiry →
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                paginated.map((inv) => {
                  const total = inv.advance + inv.balance;
                  const remaining = inv.balanceReceived ? 0 : inv.balance;
                  return (
                    <tr
                      key={inv.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/invoices/${inv.id}`)}
                    >
                      <td>
                        <span className="font-mono text-[11px] text-bl">{inv.invoiceNo}</span>
                      </td>
                      <td>
                        <div className="font-medium text-tx">{inv.eventName}</div>
                        <div className="text-[10px] text-tx3">
                          Due: {new Date(inv.dueDate).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="text-tx2">{inv.clientName}</td>
                      <td className="text-right font-mono font-medium text-tx">
                        ₹{fmt(total)}
                      </td>
                      <td className={`text-right font-mono font-medium ${remaining > 0 ? "text-rd" : "text-gr"}`}>
                        {remaining > 0 ? `₹${fmt(remaining)}` : "—"}
                      </td>
                      <td>
                        <Badge variant={STATUS_COLORS[inv.status] ?? "gy"}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td>
                        {getInvDept(inv) === 'LED' || getInvDept(inv) === 'MERGED' ? (
                          <Badge variant={inv.deinstallDone ? 'gr' : 'gy'}>
                            {inv.deinstallDone ? 'Deinstalled' : 'Pending'}
                          </Badge>
                        ) : (
                          <Badge variant={inv.hddDelivered ? 'gr' : 'gy'}>
                            {inv.hddDelivered ? 'Done' : 'Pending'}
                          </Badge>
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/invoices/${inv.id}/payment`}
                          className="btn text-[10px] px-[8px] py-[4px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Payment
                        </Link>
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
