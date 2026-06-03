"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import * as api from "@/lib/api";

interface Props {
  inquiryId: string;
}

export default function Screen27ExpenseReport({ inquiryId }: Props) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!inquiryId) return;

    let active = true;
    async function loadReport() {
      try {
        setLoading(true);
        const json = await api.fetchExpenseReport(inquiryId);
        if (active) setData(json);
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReport();
    return () => { active = false; };
  }, [inquiryId]);

  const fmt = (n: number) => n.toLocaleString("en-IN");

  if (loading) {
    return (
      <ScreenFrame breadcrumb="Reports › Expense Report › Loading...">
        <LoadingSkeleton rows={6} message="Compiling event expenses, staff rosters, and vendor rental ledgers..." />
      </ScreenFrame>
    );
  }

  if (error || !data) {
    return (
      <ScreenFrame breadcrumb="Reports › Expense Report › Error">
        <div className="text-center py-12 text-tx3">
          {error || "Could not generate expense report details."}
          <div className="mt-4">
            <button className="btn" onClick={() => router.back()}>← Go Back</button>
          </div>
        </div>
      </ScreenFrame>
    );
  }

  const { inquiry, staffAssignments, vendorBookings, totalStaffCost, totalVendorCost, totalExpense } = data;

  return (
    <>
      <SectionHeader
        title={<>Expense <strong>Report</strong></>}
        description={`Outsourcing audit and crew salary totals for event ${inquiryId}.`}
      />
      <ScreenFrame
        breadcrumb={
          <>
            <span className="text-tx2">Inquiries</span> › {inquiryId} › Expense Report
          </>
        }
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn" onClick={() => window.print()}>⎙ Print / Save PDF</button>
            <Link href={`/inquiries`} className="btn">Back to List</Link>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Summary Strip */}
          <div className="card bg-s2" style={{ padding: "16px", marginBottom: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
              <div>
                <span className="text-[10px] text-tx3 uppercase tracking-wide block">Client / Event</span>
                <strong className="text-[13px] text-tx block mt-1">{inquiry.eventName || inquiry.eventType}</strong>
                <span className="text-[11px] text-tx2">Client: {inquiry.client.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-tx3 uppercase tracking-wide block">Venue</span>
                <span className="text-[12px] font-medium text-tx block mt-1">{inquiry.venue}</span>
              </div>
              <div>
                <span className="text-[10px] text-tx3 uppercase tracking-wide block">Dates</span>
                <span className="text-[11px] text-tx2 block mt-1">
                  {new Date(inquiry.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - {new Date(inquiry.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-tx3 uppercase tracking-wide block">Total Expenses</span>
                <span className="text-[16px] font-semibold text-rd block mt-1 font-mono">₹{fmt(totalExpense)}</span>
              </div>
            </div>
          </div>

          <div className="two-col" style={{ gridTemplateColumns: "1.3fr 1fr" }}>
            {/* Left Col: Staff Payroll */}
            <div className="card" style={{ padding: "16px", marginBottom: 0 }}>
              <div className="card-t">Staff Operator Costs (Total: ₹{fmt(totalStaffCost)})</div>
              {staffAssignments.length === 0 ? (
                <div className="text-center py-6 text-tx3 italic">No operators assigned to this inquiry.</div>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Operator</th>
                      <th>Role</th>
                      <th>Type</th>
                      <th className="tc">Days</th>
                      <th className="tr">Rate/Day</th>
                      <th className="tr">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffAssignments.map((a: any) => (
                      <tr key={a.id}>
                        <td>
                          <strong className="text-tx">{a.staffName}</strong>
                          {a.isDuplicate && <span style={{ color: "var(--acc)", fontSize: "9px", marginLeft: "6px" }} title="Duplicate position assignment (unbilled)">⚠ Dup</span>}
                        </td>
                        <td>{a.role}</td>
                        <td>
                          <Badge variant={a.staffType === "INHOUSE" ? "gr" : "am"}>
                            {a.staffType === "INHOUSE" ? "Inhouse" : "External"}
                          </Badge>
                        </td>
                        <td className="tc font-mono">{a.daysAssigned}</td>
                        <td className="tr font-mono">₹{fmt(a.ratePerDay)}</td>
                        <td className="tr font-mono text-tx font-medium">₹{fmt(a.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Right Col: Vendor rental bookings */}
            <div className="card" style={{ padding: "16px", marginBottom: 0 }}>
              <div className="card-t">Vendor Rental Expenses (Total: ₹{fmt(totalVendorCost)})</div>
              {vendorBookings.length === 0 ? (
                <div className="text-center py-6 text-tx3 italic">No external vendor rentals booked.</div>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Vendor / Position</th>
                      <th>Equipment</th>
                      <th className="tr">Rate</th>
                      <th className="tr">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorBookings.map((b: any) => (
                      <tr key={b.id}>
                        <td>
                          <strong className="text-tx">{b.vendorName}</strong>
                          <div className="text-[10px] text-tx3">{b.position}</div>
                        </td>
                        <td>{b.itemName}</td>
                        <td className="tr font-mono">₹{fmt(b.costPerDay)}/d</td>
                        <td className="tr font-mono text-tx font-medium">₹{fmt(b.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </ScreenFrame>
    </>
  );
}
