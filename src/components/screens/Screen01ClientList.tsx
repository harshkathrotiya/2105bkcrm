"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import { useClients, useInquiries, useQuotations, useInvoices } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import Pagination from "../ui/Pagination";

const ITEMS_PER_PAGE = 20;

export default function Screen01ClientList() {
  const router = useRouter();
  const { can } = useCurrentUser();
  const canCreate = can("clients.create");
  const canCreateInquiry = can("inquiries.create");
  const { clients, loading: clientsLoading } = useClients();
  const { inquiries, loading: inquiriesLoading } = useInquiries();
  const { quotations, loading: quotationsLoading } = useQuotations();
  const { invoices } = useInvoices();

  const loading = clientsLoading || inquiriesLoading || quotationsLoading;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = clients;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.contact.toLowerCase().includes(q) ||
          c.mobile.includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "All") {
      list = list.filter((c) => c.status === statusFilter);
    }
    return list;
  }, [clients, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "Active").length;
  const activeEvents = inquiries.filter(
    (i) => i.status === "Confirmed" || i.status === "Quoted"
  ).length;
  const pendingQuotes = quotations.filter(
    (q) => q.status === "Draft" || q.status === "Sent"
  ).length;

  return (
    <>
      <SectionHeader
        title={<>Client <strong>list</strong></>}
        description="Manage your clients — search, filter by status, and view event activity."
      />
      <ScreenFrame
        breadcrumbs={[{ label: "Clients" }]}
        actions={
          canCreate ? (
            <Link href="/clients/new" className="btn btn-primary">
              + New client
            </Link>
          ) : null
        }
      >
        {loading ? (
          <LoadingSkeleton rows={6} />
        ) : (
        <>
        {/* Metrics */}
        <div className="metrics">
          <div className="met">
            <div className="met-l">Total clients</div>
            <div className="met-v">{totalClients}</div>
          </div>
          <div className="met">
            <div className="met-l">Active</div>
            <div className="met-v g">{activeClients}</div>
          </div>
          <div className="met">
            <div className="met-l">Active events</div>
            <div className="met-v b">{activeEvents}</div>
          </div>
          <div className="met">
            <div className="met-l">Pending quotes</div>
            <div className="met-v a">{pendingQuotes}</div>
          </div>
        </div>

        {/* Search & filter */}
        <div className="card !p-3">
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Search by name, contact, mobile..."
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
              <option value="All">All clients</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Client</th>
                <th style={{ width: 130 }}>Mobile</th>
                <th style={{ width: 120 }}>Last Activity</th>
                <th style={{ width: 130, textAlign: "right" }}>Revenue</th>
                <th style={{ width: 90 }}>Status</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px 16px" }}>
                    <div style={{ color: "var(--tx3)", fontSize: "12px", marginBottom: "12px" }}>
                      {search || statusFilter !== "All"
                        ? "No clients match your filters."
                        : "No clients yet."}
                    </div>
                    {(search || statusFilter !== "All") ? (
                      <button
                        className="btn"
                        onClick={() => { setSearch(""); setStatusFilter("All"); }}
                      >
                        Clear filters
                      </button>
                    ) : canCreate ? (
                      <Link href="/clients/new" className="btn btn-primary">
                        + Add first client
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ) : (
                paginated.map((c) => {
                  const clientInquiries = inquiries.filter((i) => i.clientId === c.id);
                  const inquiryCount = clientInquiries.length;
                  const latestInquiry = clientInquiries.sort(
                    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
                  )[0];
                  // Total revenue = sum of all invoices for this client
                  const clientQuoteIds = new Set(
                    quotations.filter((q) => clientInquiries.some((i) => i.id === q.inquiryId)).map((q) => q.id)
                  );
                  const clientRevenue = invoices
                    .filter((inv) => clientQuoteIds.has(inv.quotationId))
                    .reduce((s, inv) => s + inv.advance + inv.balance, 0);

                  const inqStatusColor: Record<string, string> = {
                    New: "var(--acc)",
                    Quoted: "var(--yl)",
                    Confirmed: "var(--gr)",
                    Cancelled: "var(--rd)",
                  };

                  return (
                    <tr
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => router.push("/clients/" + c.id)}
                    >
                      <td>
                        <div
                          className="avatar-sm"
                          style={{ background: c.bg, color: c.fg }}
                        >
                          {c.initials}
                        </div>
                      </td>
                      <td>
                        <Link
                          href={"/clients/" + c.id}
                          className="font-medium text-tx hover:text-acc transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.name}
                        </Link>
                        <div className="text-[10px] text-tx3 mt-[1px]">
                          {c.contact}
                          {c.email ? " \u00b7 " + c.email : ""}
                        </div>
                      </td>
                      <td className="font-mono text-[12px]">{c.mobile}</td>
                      <td>
                        {latestInquiry ? (
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                              <span style={{
                                display: "inline-block",
                                width: "5px",
                                height: "5px",
                                borderRadius: "50%",
                                background: inqStatusColor[latestInquiry.status] ?? "var(--tx3)",
                                flexShrink: 0,
                              }} />
                              <span style={{ fontSize: "11px", fontWeight: 500 }}>
                                {new Date(latestInquiry.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                              </span>
                            </div>
                            <div style={{ fontSize: "9px", color: "var(--tx3)", paddingLeft: "10px" }}>
                              {inquiryCount} {inquiryCount === 1 ? "inquiry" : "inquiries"} · {latestInquiry.eventName || latestInquiry.eventType}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: "11px", color: "var(--tx3)" }}>No activity</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {clientRevenue > 0 ? (
                          <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--gr)" }}>
                            ₹{clientRevenue.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span style={{ color: "var(--tx3)", fontSize: "11px" }}>—</span>
                        )}
                      </td>
                      <td>
                        <Badge variant={c.status === "Active" ? "gr" : "gy"}>
                          {c.status}
                        </Badge>
                      </td>
                      <td>
                        {canCreateInquiry && (
                          <Link
                            href={"/inquiries/new?clientId=" + c.id}
                            className="btn text-[10px] px-[8px] py-[4px]"
                            title="New inquiry for this client"
                            onClick={(e) => e.stopPropagation()}
                          >
                            + Inquiry
                          </Link>
                        )}
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
