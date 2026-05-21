"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import { useInvoices } from "@/lib/store";

const STATUS_COLORS: Record<string, "gr" | "am" | "bl" | "rd" | "gy"> = {
  Paid:           "gr",
  "Partial paid": "am",
  Unpaid:         "rd",
};

const ITEMS_PER_PAGE = 8;

export default function Screen12InvoiceList() {
  const { invoices } = useInvoices();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = [...invoices].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (search) {
      const q = search.toLowerCase();
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
    return list;
  }, [invoices, search, statusFilter]);

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
      <ScreenFrame breadcrumb="Invoices">
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
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Search by client, event, invoice no..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="finp flex-1 min-w-[200px]"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="fsel w-[140px]"
            >
              <option value="All">All statuses</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial paid">Partial paid</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <table className="tbl">
            <thead>
              <tr>
                <th>Invoice no.</th>
                <th>Client</th>
                <th>Event</th>
                <th style={{ width: 110, textAlign: "right" }}>Total</th>
                <th style={{ width: 110, textAlign: "right" }}>Balance</th>
                <th style={{ width: 90 }}>Status</th>
                <th style={{ width: 60 }}>HDD</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-tx3">
                    No invoices found
                  </td>
                </tr>
              ) : (
                paginated.map((inv) => {
                  const total = inv.advance + inv.balance;
                  const remaining = inv.balanceReceived ? 0 : inv.balance;
                  return (
                    <tr key={inv.id}>
                      <td>
                        <span className="font-mono text-[11px] text-bl">{inv.invoiceNo}</span>
                      </td>
                      <td>
                        <div className="font-medium text-tx">{inv.clientName}</div>
                        <div className="text-[10px] text-tx3">
                          Due: {new Date(inv.dueDate).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="text-tx2">{inv.eventName}</td>
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
                        <Badge variant={inv.hddDelivered ? "gr" : "gy"}>
                          {inv.hddDelivered ? "Done" : "Pending"}
                        </Badge>
                      </td>
                      <td>
                        <Link
                          href={`/invoices/${inv.id}/payment`}
                          className="btn text-[10px] px-[8px] py-[4px]"
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

          {/* Pagination */}
          <div className="flex justify-between items-center pt-[10px] text-[11px] text-tx3">
            <span>
              {filtered.length === 0
                ? "0 results"
                : `${(page - 1) * ITEMS_PER_PAGE + 1}–${Math.min(
                    page * ITEMS_PER_PAGE,
                    filtered.length
                  )} of ${filtered.length}`}
            </span>
            <div className="flex gap-1">
              <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ‹ Prev
              </button>
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
              <button className="btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next ›
              </button>
            </div>
          </div>
        </div>
      </ScreenFrame>
    </>
  );
}
