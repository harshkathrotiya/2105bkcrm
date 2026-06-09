"use client";

import React, { useState, useMemo } from "react";
import { useDebounce } from "@/lib/use-debounce";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import { useQuotations, useInvoices, useInquiries } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import type { Quotation } from "@/lib/types";
import LoadingSkeleton, { ShimmerBar } from "../ui/LoadingSkeleton";
import Pagination from "../ui/Pagination";

const STATUS_COLORS: Record<string, "gr" | "am" | "bl" | "rd" | "gy"> = {
  Draft:    "gy",
  Sent:     "am",
  Approved: "gr",
  Revised:  "bl",
};

const ITEMS_PER_PAGE = 10;

/** Strips the revision suffix (-1, -2, etc.) from a quote number to get the root */
function getRootQuoteNo(quoteNo: string): string {
  return quoteNo.replace(/-\d+$/, "");
}

/** Gets the revision number from a quote number (0 = original, 1 = -1, etc.) */
function getRevIndex(quoteNo: string): number {
  const match = quoteNo.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

interface QuoteChain {
  rootNo: string;
  quotations: Quotation[];
  latest: Quotation;
}

export default function Screen11QuotationList() {
  const { can } = useCurrentUser();
  const canCreate = can("quotations.create");
  const { quotations, loading: quotationsLoading } = useQuotations();
  const { invoices } = useInvoices();
  const { inquiries } = useInquiries();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState<'All'|'VIDEO'|'LED'|'MERGED'>('All');
  const [page, setPage] = useState(1);
  const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set());

  // Build chains — group by root quote no
  const allChains = useMemo(() => {
    const groups = new Map<string, QuoteChain>();
    for (const qt of quotations) {
      const rootNo = getRootQuoteNo(qt.quoteNo);
      const existing = groups.get(rootNo);
      if (existing) {
        existing.quotations.push(qt);
        // Latest = highest revision number, tiebreak by createdAt
        if (
          getRevIndex(qt.quoteNo) > getRevIndex(existing.latest.quoteNo) ||
          (getRevIndex(qt.quoteNo) === getRevIndex(existing.latest.quoteNo) &&
            new Date(qt.createdAt) > new Date(existing.latest.createdAt))
        ) {
          existing.latest = qt;
        }
      } else {
        groups.set(rootNo, {
          rootNo,
          quotations: [qt],
          latest: qt,
        });
      }
    }
    return Array.from(groups.values()).sort(
      (a, b) =>
        new Date(b.latest.createdAt).getTime() -
        new Date(a.latest.createdAt).getTime()
    );
  }, [quotations]);

  // Filter chains
  const filteredChains = useMemo(() => {
    let chains = allChains;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      chains = chains.filter((chain) =>
        // Show chain if any quotation in the chain matches
        chain.quotations.some(
          (qt) =>
            qt.clientName.toLowerCase().includes(q) ||
            qt.eventName.toLowerCase().includes(q) ||
            qt.quoteNo.toLowerCase().includes(q)
        )
      );
    }
    if (statusFilter !== "All") {
      chains = chains.filter(
        (chain) => chain.latest.status === statusFilter
      );
    }
    if (deptFilter !== 'All') {
      chains = chains.filter((chain) => {
        const inq = inquiries.find((i) => i.id === chain.latest.inquiryId);
        return inq?.department === deptFilter;
      });
    }
    return chains;
  }, [allChains, debouncedSearch, statusFilter, deptFilter, inquiries]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredChains.length / ITEMS_PER_PAGE)
  );
  const paginatedChains = filteredChains.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const fmt = (n: number) => n.toLocaleString("en-IN");

  // Metrics
  const total = quotations.length;
  const activeChains = allChains.filter(
    (c) => c.latest.status !== "Revised"
  ).length;
  const approved = quotations.filter((q) => q.status === "Approved").length;
  const totalValue = quotations.reduce((s, q) => s + q.total, 0);

  const toggleChain = (rootNo: string) => {
    setExpandedChains((prev) => {
      const next = new Set(prev);
      if (next.has(rootNo)) {
        next.delete(rootNo);
      } else {
        next.add(rootNo);
      }
      return next;
    });
  };

  return (
    <>
      <SectionHeader
        title={<>Quotation <strong>list</strong></>}
        description="All quotations — grouped by revision chain. Expand to see revisions."
      />
      <ScreenFrame
        breadcrumbs={[{ label: "Quotations" }]}
        actions={
          canCreate ? (
            <Link href="/quotations/new" className="btn btn-primary">
              + New quotation
            </Link>
          ) : null
        }
      >
        {quotationsLoading ? (
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
                <ShimmerBar width="140px" height="38px" radius="8px" style={{ flex: "0 0 140px", animationDelay: "240ms" }} />
              </div>

              {/* Table Loading State */}
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 24 }}></th>
                      <th>Quote no.</th>
                      <th>Client</th>
                      <th>Event</th>
                      <th style={{ width: 130 }}>Dates</th>
                      <th style={{ width: 110, textAlign: "right" }}>Total</th>
                      <th style={{ width: 90 }}>Status</th>
                      <th style={{ width: 90 }}>Invoice</th>
                      <th style={{ width: 120 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 6 }).map((_, ri) => (
                      <tr key={ri} style={{ cursor: "default" }}>
                        <td>
                          <ShimmerBar width="12px" height="12px" style={{ animationDelay: `${ri * 60 + 300}ms`, opacity: 0.3 }} />
                        </td>
                        <td>
                          <ShimmerBar width="110px" height="13px" style={{ animationDelay: `${ri * 60 + 310}ms` }} />
                        </td>
                        <td>
                          <ShimmerBar width="75%" height="13px" style={{ animationDelay: `${ri * 60 + 320}ms`, marginBottom: "4px" }} />
                          <ShimmerBar width="40%" height="9px" style={{ animationDelay: `${ri * 60 + 330}ms` }} />
                        </td>
                        <td>
                          <ShimmerBar width="100px" height="13px" style={{ animationDelay: `${ri * 60 + 340}ms` }} />
                        </td>
                        <td>
                          <ShimmerBar width="85px" height="11px" style={{ animationDelay: `${ri * 60 + 350}ms` }} />
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end">
                            <ShimmerBar width="60px" height="11px" style={{ animationDelay: `${ri * 60 + 360}ms` }} />
                          </div>
                        </td>
                        <td>
                          <ShimmerBar width="60px" height="18px" radius="9999px" style={{ animationDelay: `${ri * 60 + 370}ms` }} />
                        </td>
                        <td>
                          <ShimmerBar width="50px" height="18px" radius="9999px" style={{ animationDelay: `${ri * 60 + 380}ms` }} />
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <ShimmerBar width="40px" height="26px" radius="8px" style={{ animationDelay: `${ri * 60 + 390}ms` }} />
                            <ShimmerBar width="60px" height="26px" radius="8px" style={{ animationDelay: `${ri * 60 + 400}ms` }} />
                          </div>
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
            <div className="met-l">Total quotations</div>
            <div className="met-v">{total}</div>
          </div>
          <div className="met">
            <div className="met-l">Active chains</div>
            <div className="met-v a">{activeChains}</div>
          </div>
          <div className="met">
            <div className="met-l">Approved</div>
            <div className="met-v g">{approved}</div>
          </div>
          <div className="met">
            <div className="met-l">Total value</div>
            <div className="met-v b text-[18px]">₹{fmt(totalValue)}</div>
          </div>
        </div>

        <div className="card !p-3">
          <div className="flex gap-1" style={{ marginBottom: '14px' }}>
            {(['All','VIDEO','LED','MERGED'] as const).map((d) => (
              <button
                key={d}
                className={`btn text-[10px] px-3 ${deptFilter === d ? 'btn-primary' : ''}`}
                onClick={() => { setDeptFilter(d); setPage(1); }}
              >
                {d === 'All' ? 'All' : d === 'VIDEO' ? 'Video' : d === 'LED' ? 'LED' : 'Merged'}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Search by client, event, quote no..."
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
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Approved">Approved</option>
              <option value="Revised">Revised</option>
            </select>
          </div>

          <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 24 }}></th>
                <th>Quote no.</th>
                <th>Client</th>
                <th>Event</th>
                <th style={{ width: 130 }}>Dates</th>
                <th style={{ width: 110, textAlign: "right" }}>Total</th>
                <th style={{ width: 90 }}>Status</th>
                <th style={{ width: 90 }}>Invoice</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {paginatedChains.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-tx3">
                    No quotations found
                  </td>
                </tr>
              ) : (
                paginatedChains.map((chain) => {
                  const isExpanded = expandedChains.has(chain.rootNo);
                  const lt = chain.latest;
                  const startFmt = new Date(lt.startDate).toLocaleDateString(
                    "en-IN",
                    { day: "numeric", month: "short" }
                  );
                  const endFmt = new Date(lt.endDate).toLocaleDateString(
                    "en-IN",
                    { day: "numeric", month: "short", year: "numeric" }
                  );
                  const hasInvoice = invoices.some(
                    (inv) => inv.quotationId === lt.id
                  );
                  const revCount = chain.quotations.length;

                  return (
                    <React.Fragment key={chain.rootNo}>
                      {/* Parent chain row */}
                      <tr
                        className="cursor-pointer"
                        onClick={() => toggleChain(chain.rootNo)}
                      >
                        <td>
                          <span className="text-tx3 text-[10px] select-none">
                            {isExpanded ? "\u25BC" : "\u25B6"}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-[6px]">
                            <span className="font-mono text-[11px] text-bl">
                              {chain.rootNo}
                            </span>
                            {revCount > 1 && (
                              <span className="text-[9px] px-[4px] py-[1px] rounded-full bg-s2 text-tx3">
                                +{revCount - 1}
                              </span>
                            )}
                            {(() => {
                              const inq = inquiries.find((i) => i.id === lt.inquiryId);
                              if (inq?.department === 'LED') return <span style={{ fontSize: '9px', background: 'var(--sem-bl-bg)', color: 'var(--sem-bl-tx)', borderRadius: '3px', padding: '1px 4px', marginLeft: '4px' }}>LED</span>;
                              if (inq?.department === 'MERGED') return <span style={{ fontSize: '9px', background: 'var(--sem-am-bg)', color: 'var(--sem-am-tx)', borderRadius: '3px', padding: '1px 4px', marginLeft: '4px' }}>MERGED</span>;
                              return null;
                            })()}
                          </div>
                        </td>
                        <td>
                          <div className="font-medium text-tx">
                            {lt.clientName}
                          </div>
                          <div className="text-[10px] text-tx3">
                            {lt.days} days
                          </div>
                        </td>
                        <td className="text-tx2">{lt.eventName}</td>
                        <td className="text-[11px] text-tx2">
                          {startFmt} \u2013 {endFmt}
                        </td>
                        <td className="text-right font-mono font-medium text-gr">
                         {fmt(lt.total)}
                        </td>
                        <td>
                          <Badge
                            variant={STATUS_COLORS[lt.status] ?? "gy"}
                          >
                            {lt.status}
                          </Badge>
                        </td>
                        <td>
                          {(() => {
                            const inv = invoices.find((i) => i.quotationId === lt.id);
                            if (inv) {
                              return (
                                <Link
                                  href={`/invoices/${inv.id}/payment`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Badge variant={inv.status === "Paid" ? "gr" : inv.status === "Partial paid" ? "am" : "rd"}>
                                    {inv.status === "Partial paid" ? "Partial" : inv.status}
                                  </Badge>
                                </Link>
                              );
                            }
                            if (lt.status === "Approved") {
                              return (
                                <Link
                                  href={`/inquiries/${lt.inquiryId}`}
                                  className="text-[9px] text-acc hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  + Invoice
                                </Link>
                              );
                            }
                            return <span style={{ fontSize: "9px", color: "var(--tx3)" }}>—</span>;
                          })()}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <Link
                              href={`/quotations/${lt.id}/pdf`}
                              className="btn text-[10px] px-[8px] py-[4px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              PDF
                            </Link>
                            {lt.status !== "Approved" && !hasInvoice && (
                              <Link
                                href={`/inquiries/${lt.inquiryId}`}
                                className="btn btn-success text-[10px] px-[8px] py-[4px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Approve
                              </Link>
                            )}
                            {hasInvoice && (
                              <Link
                                href={`/invoices/${
                                  invoices.find(
                                    (i) => i.quotationId === lt.id
                                  )?.id
                                }`}
                                className="btn text-[10px] px-[8px] py-[4px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Invoice
                              </Link>
                            )}
                            {lt.status === "Approved" && (
                              <>
                                <Link
                                  href={`/staff/assign?inquiryId=${lt.inquiryId}`}
                                  className="btn text-[10px] px-[8px] py-[4px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Crew
                                </Link>
                                <Link
                                  href={`/warehouse/check?inquiryId=${lt.inquiryId}`}
                                  className="btn text-[10px] px-[8px] py-[4px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Warehouse
                                </Link>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded children — individual revisions */}
                      {isExpanded &&
                        [...chain.quotations]
                          .sort(
                            (a, b) =>
                              getRevIndex(a.quoteNo) -
                              getRevIndex(b.quoteNo)
                          )
                          .map((rev) => {
                            const isLatest = rev.id === lt.id;
                            const revHasInvoice = invoices.some(
                              (inv) => inv.quotationId === rev.id
                            );
                            const revStartFmt = new Date(
                              rev.startDate
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            });
                            const revEndFmt = new Date(
                              rev.endDate
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            });

                            return (
                              <tr
                                key={rev.id}
                                className={`text-[11px] ${
                                  isLatest
                                    ? "bg-bl/[0.03]"
                                    : ""
                                }`}
                              >
                                <td></td>
                                <td>
                                  <div className="flex items-center gap-[6px] pl-[8px]">
                                    <span
                                      className={`font-mono ${
                                        isLatest
                                          ? "text-bl font-medium"
                                          : "text-tx2"
                                      }`}
                                    >
                                      {rev.quoteNo}
                                    </span>
                                    {getRevIndex(rev.quoteNo) === 0 && (
                                      <span className="text-[9px] text-tx3">
                                        Original
                                      </span>
                                    )}
                                    {isLatest && revCount > 1 && (
                                      <Badge variant="bl">Current</Badge>
                                    )}
                                  </div>
                                </td>
                                <td colSpan={2}>
                                  <span className="text-tx3">
                                    Created{" "}
                                    {new Date(
                                      rev.createdAt
                                    ).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>
                                </td>
                                <td className="text-tx3">
                                  {revStartFmt} \u2013 {revEndFmt}
                                </td>
                                <td className="text-right font-mono text-tx2">
                                 {fmt(rev.total)}
                                </td>
                                <td>
                                  <Badge
                                    variant={
                                      STATUS_COLORS[rev.status] ?? "gy"
                                    }
                                  >
                                    {rev.status}
                                  </Badge>
                                </td>
                                <td>
                                  <div className="flex gap-1">
                                    <Link
                                      href={`/quotations/${rev.id}/pdf`}
                                      className="btn text-[10px] px-[8px] py-[4px]"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      PDF
                                    </Link>
                                    {rev.status !== "Approved" &&
                                      !revHasInvoice && (
                                        <Link
                                          href={`/inquiries/${rev.inquiryId}`}
                                          className="btn btn-success text-[10px] px-[8px] py-[4px]"
                                          onClick={(e) =>
                                            e.stopPropagation()
                                          }
                                        >
                                          Approve
                                        </Link>
                                      )}
                                    {revHasInvoice && (
                                      <Link
                                        href={`/invoices/${
                                          invoices.find(
                                            (i) =>
                                              i.quotationId === rev.id
                                          )?.id
                                        }`}
                                        className="btn text-[10px] px-[8px] py-[4px]"
                                        onClick={(e) =>
                                          e.stopPropagation()
                                        }
                                      >
                                        Invoice
                                      </Link>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={filteredChains.length}
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
