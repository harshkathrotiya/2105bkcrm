"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import * as api from "@/lib/api";
import type { Inquiry, Quotation, StaffAssignment } from "@/lib/types";

interface GroupedStaffPayment {
  staffId: number;
  staffName: string;
  staffType: "INHOUSE" | "EXTERNAL";
  role: string;
  positionsCount: number;
  positionsDesc: string;
  days: number;
  ratePerDay: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: "Paid" | "Pending";
  paidAt: string | null;
  paymentMethod: string | null;
  referenceNo: string | null;
  assignments: any[];
}

export default function Screen24PerEventPayment() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("inquiryId") || "";

  // Local State
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null); // staffId being paid
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Bulk default settings in sidebar
  const [defaultMethod, setDefaultMethod] = useState<"UPI" | "CASH" | "BANK_TRANSFER" | "CHEQUE">("UPI");

  // Inline forms for each pending staff
  const [paymentMethods, setPaymentMethods] = useState<Record<number, string>>({});
  const [referenceNos, setReferenceNos] = useState<Record<number, string>>({});

  // Load Data
  const loadData = async () => {
    if (!inquiryId) return;
    setLoading(true);
    try {
      const [warehouseCheckData, assignmentsData] = await Promise.all([
        api.fetchWarehouseCheck(inquiryId),
        api.fetchStaffAssignments(inquiryId),
      ]);
      setInquiry(warehouseCheckData.inquiry);
      setQuotation(warehouseCheckData.quotation as unknown as Quotation);
      setAssignments(assignmentsData);

      // Initialize inline input states
      const methods: Record<number, string> = {};
      const refs: Record<number, string> = {};
      assignmentsData.forEach((a) => {
        methods[a.staffId] = "UPI";
        refs[a.staffId] = "";
      });
      setPaymentMethods(methods);
      setReferenceNos(refs);
    } catch (err) {
      console.error("Failed to load per event payments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [inquiryId]);

  // Group assignments by staffId for card layout
  const groupedStaff: GroupedStaffPayment[] = useMemo(() => {
    const groups: Record<number, GroupedStaffPayment> = {};

    assignments.forEach((a) => {
      if (!groups[a.staffId]) {
        groups[a.staffId] = {
          staffId: a.staffId,
          staffName: a.staffName,
          staffType: a.staffType,
          role: a.positionName || "Crew",
          positionsCount: 1,
          positionsDesc: a.positionName || "Crew",
          days: a.daysAssigned,
          ratePerDay: a.ratePerDay,
          totalAmount: a.totalAmount,
          paidAmount: a.paidAmount || 0,
          pendingAmount: Math.max(0, a.totalAmount - (a.paidAmount || 0)),
          status: (a.paidAmount || 0) >= a.totalAmount ? "Paid" : "Pending",
          paidAt: a.paidAt,
          paymentMethod: a.paymentMethod,
          referenceNo: a.referenceNo,
          assignments: [a],
        };
      } else {
        const g = groups[a.staffId];
        g.positionsCount += 1;
        g.positionsDesc += `, ${a.positionName || "Crew"}`;
        
        // Duplicates: we don't multiply daily rates unless they are paid per position.
        // In BK CRM rules, they are paid per event day worked (once).
        // However, if the assignments have totalAmounts already recorded, let's look at the database.
        // If they have two separate assignments (e.g. duplicate), they technically have two entries in the database.
        // Let's sum the amounts or check. In SQLite queries, each assignment row gets saved.
        // Let's follow the assignment row amounts so the accounting balances the assignment table totals.
        g.totalAmount += a.totalAmount;
        g.paidAmount += a.paidAmount || 0;
        g.pendingAmount = Math.max(0, g.totalAmount - g.paidAmount);
        g.status = g.paidAmount >= g.totalAmount ? "Paid" : "Pending";
        g.assignments.push(a);

        // Keep the latest payment details if any are paid
        if (a.paidAt && (!g.paidAt || a.paidAt > g.paidAt)) {
          g.paidAt = a.paidAt;
          g.paymentMethod = a.paymentMethod;
          g.referenceNo = a.referenceNo;
        }
      }
    });

    return Object.values(groups);
  }, [assignments]);

  // Aggregates
  const aggregates = useMemo(() => {
    const total = groupedStaff.reduce((acc, g) => acc + g.totalAmount, 0);
    const paid = groupedStaff.reduce((acc, g) => acc + g.paidAmount, 0);
    const pending = Math.max(0, total - paid);
    const count = groupedStaff.length;
    return { total, paid, pending, count };
  }, [groupedStaff]);

  // Mark a single staff member paid
  const handleMarkPaid = async (staffId: number) => {
    const group = groupedStaff.find((g) => g.staffId === staffId);
    if (!group) return;

    setSubmitting(staffId);
    try {
      const method = paymentMethods[staffId] || "UPI";
      const ref = referenceNos[staffId] || "";

      // We record payments for all pending assignments of this staff member in this inquiry
      const payments = group.assignments
        .filter((a) => (a.paidAmount || 0) < a.totalAmount)
        .map((a) => ({
          staffId,
          assignmentId: a.id,
          inquiryId,
          amount: a.totalAmount - (a.paidAmount || 0),
          paymentType: "PER_EVENT" as const,
          paymentMethod: method as any,
          referenceNo: ref || null,
        }));

      if (payments.length > 0) {
        await api.recordBulkStaffPayments(payments);
      }

      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to record payment");
    } finally {
      setSubmitting(null);
    }
  };

  // Pay all pending staff members bulk action
  const handlePayAllPending = async () => {
    const pendingGroups = groupedStaff.filter((g) => g.status === "Pending");
    if (pendingGroups.length === 0) return;

    if (!confirm(`Mark all ${pendingGroups.length} pending staff members as paid via ${defaultMethod}?`)) {
      return;
    }

    setBulkSubmitting(true);
    try {
      const payments: any[] = [];
      pendingGroups.forEach((g) => {
        g.assignments
          .filter((a) => (a.paidAmount || 0) < a.totalAmount)
          .map((a) => {
            payments.push({
              staffId: g.staffId,
              assignmentId: a.id,
              inquiryId,
              amount: a.totalAmount - (a.paidAmount || 0),
              paymentType: "PER_EVENT",
              paymentMethod: defaultMethod,
              referenceNo: `BULK-${inquiryId.toUpperCase()}`,
            });
          });
      });

      if (payments.length > 0) {
        await api.recordBulkStaffPayments(payments);
      }

      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to record bulk payments");
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Avatar Initials helper
  const getAvatarInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <ScreenFrame breadcrumb="Staff › Payments › Loading...">
        <LoadingSkeleton rows={6} message="Loading event payments data..." />
      </ScreenFrame>
    );
  }

  if (!inquiry || !quotation) {
    return (
      <ScreenFrame breadcrumb="Staff › Payments › Error">
        <div className="text-center py-12 text-tx3">Quotation details not found for this inquiry.</div>
      </ScreenFrame>
    );
  }

  return (
    <>
      <SectionHeader
        title={<>Per Event <strong>Staff Payments</strong></>}
        description={`Record payouts for crew members assigned to ${inquiry.eventType}. Supports individual transaction tracking and bulk payout triggers.`}
      />

      <ScreenFrame
        breadcrumb={`Quotations › ${quotation.quoteNo || "Draft"} › Staff Payments`}
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <Link href={`/warehouse/check?inquiryId=${inquiryId}`} className="btn">Back to Warehouse Check</Link>
            <button
              onClick={handlePayAllPending}
              className="btn btn-success"
              disabled={bulkSubmitting || aggregates.pending === 0}
            >
              {bulkSubmitting ? "Processing..." : "Pay All Pending ↗"}
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", border: "1px solid var(--b1)", borderRadius: "12px", overflow: "hidden", background: "var(--s1)" }}>
          
          {/* Sidebar Summary Panel */}
          <div
            style={{
              width: "190px",
              background: "var(--s2)",
              borderRight: "1px solid var(--b1)",
              padding: "12px 14px",
              flexShrink: 0,
              fontSize: "12px",
              lineHeight: "1.7",
            }}
          >
            <div style={{ padding: "0 0 4px", fontSize: "9px", color: "var(--tx3)", letterSpacing: ".1em", textTransform: "uppercase" }}>
              Event Info
            </div>
            <strong style={{ color: "var(--tx)", display: "block" }}>{quotation.eventName}</strong>
            <div style={{ color: "var(--tx3)", fontSize: "11px" }}>{inquiry.eventType}</div>
            
            <div style={{ height: "1px", background: "var(--b1)", margin: "10px 0" }} />

            <div style={{ padding: "0 0 4px", fontSize: "9px", color: "var(--tx3)", letterSpacing: ".1em", textTransform: "uppercase" }}>
              Financial Summary
            </div>
            <div style={{ color: "var(--tx2)" }}>Total Payable: <span style={{ color: "var(--tx)", fontFamily: "var(--font-mono)" }}>₹{aggregates.total.toLocaleString("en-IN")}</span></div>
            <div style={{ color: "var(--tx2)" }}>Paid: <span style={{ color: "var(--gr)", fontFamily: "var(--font-mono)" }}>₹{aggregates.paid.toLocaleString("en-IN")}</span></div>
            <div style={{ color: "var(--tx2)" }}>Pending: <span style={{ color: "var(--acc)", fontFamily: "var(--font-mono)" }}>₹{aggregates.pending.toLocaleString("en-IN")}</span></div>

            <div style={{ height: "1px", background: "var(--b1)", margin: "10px 0" }} />

            <div style={{ padding: "0 0 4px", fontSize: "9px", color: "var(--tx3)", letterSpacing: ".1em", textTransform: "uppercase" }}>
              Bulk Default Method
            </div>
            <select
              className="fsel"
              style={{ fontSize: "11.5px", marginTop: "4px", padding: "0 6px" }}
              value={defaultMethod}
              onChange={(e) => setDefaultMethod(e.target.value as any)}
            >
              <option value="UPI">UPI (Default)</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          {/* Main Grid Content */}
          <div style={{ flex: 1, padding: "16px", background: "var(--cnt-bg)", minHeight: "480px" }}>
            
            {/* Top aggregate metric cards */}
            <div className="met" style={{ marginBottom: "16px" }}>
              <div className="mc">
                <div className="ml">Total Payable</div>
                <div className="mv">₹{aggregates.total.toLocaleString("en-IN")}</div>
              </div>
              <div className="mc">
                <div className="ml">Paid</div>
                <div className="mv" style={{ color: "var(--gr)" }}>₹{aggregates.paid.toLocaleString("en-IN")}</div>
              </div>
              <div className="mc">
                <div className="ml">Pending Payout</div>
                <div className="mv" style={{ color: "var(--acc)" }}>₹{aggregates.pending.toLocaleString("en-IN")}</div>
              </div>
              <div className="mc">
                <div className="ml">Staff Crew Count</div>
                <div className="mv">{aggregates.count}</div>
              </div>
            </div>

            {/* Payouts list per staff member */}
            <div className="card" style={{ border: "none", padding: 0 }}>
              <div className="ct" style={{ fontSize: "13px", marginBottom: "12px" }}>Payment Details Per Staff Member</div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {groupedStaff.length === 0 ? (
                  <div style={{ fontStyle: "italic", color: "var(--tx3)", textAlign: "center", padding: "20px" }}>
                    No staff members assigned to this inquiry yet.
                  </div>
                ) : (
                  groupedStaff.map((g) => {
                    const isPaid = g.status === "Paid";
                    
                    return (
                      <div
                        key={g.staffId}
                        style={{
                          background: isPaid ? "#0F2E22" : "#1A1000",
                          border: isPaid ? "1px solid #1A4A34" : "1px solid #4A3010",
                          borderRadius: "10px",
                          padding: "14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                fontSize: "11px",
                                background: "var(--sidebar-active)",
                                color: "var(--acc)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 600,
                              }}
                            >
                              {getAvatarInitials(g.staffName)}
                            </div>
                            <div>
                              <strong style={{ fontSize: "13px", color: "var(--tx)" }}>{g.staffName}</strong>
                              <div style={{ fontSize: "10px", color: "var(--tx3)", marginTop: "2px" }}>
                                {g.role} • {g.staffType === "INHOUSE" ? "In-house" : "External"} • {g.positionsCount} position(s) • {g.days} day(s)
                              </div>
                            </div>
                          </div>
                          <Badge variant={isPaid ? "gr" : "am"}>{g.status}</Badge>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "4px" }}>
                          <div style={{ fontSize: "11.5px", color: "var(--tx3)" }}>
                            {g.assignments.map((a) => (
                              <div key={a.id}>
                                {a.positionName}: ₹{a.ratePerDay.toLocaleString("en-IN")}/day x {a.daysAssigned} days
                              </div>
                            ))}
                          </div>
                          <div style={{ fontSize: "16px", fontWeight: 600, fontFamily: "var(--font-mono)", color: isPaid ? "var(--gr)" : "var(--acc)" }}>
                            ₹{g.totalAmount.toLocaleString("en-IN")}
                          </div>
                        </div>

                        {/* Paid Details / Recording Form */}
                        {isPaid ? (
                          <div style={{ fontSize: "10px", color: "var(--tx3)", borderTop: "1px solid #1A4A34", paddingTop: "8px" }}>
                            Paid on: {g.paidAt ? new Date(g.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "N/A"} • Method: {g.paymentMethod} • Ref: {g.referenceNo || "None"}
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              borderTop: "1px solid #4A3010",
                              paddingTop: "10px",
                              alignItems: "center",
                            }}
                          >
                            <select
                              className="fsel"
                              style={{ width: "120px", fontSize: "11px", height: "26px", padding: "0 6px" }}
                              value={paymentMethods[g.staffId] || "UPI"}
                              onChange={(e) => setPaymentMethods((prev) => ({ ...prev, [g.staffId]: e.target.value }))}
                            >
                              <option value="UPI">UPI</option>
                              <option value="CASH">Cash</option>
                              <option value="BANK_TRANSFER">Bank Transfer</option>
                              <option value="CHEQUE">Cheque</option>
                            </select>
                            <input
                              type="text"
                              className="finp"
                              placeholder="Transaction / Reference ID"
                              style={{ flex: 1, fontSize: "11px", height: "26px", padding: "0 8px" }}
                              value={referenceNos[g.staffId] || ""}
                              onChange={(e) => setReferenceNos((prev) => ({ ...prev, [g.staffId]: e.target.value }))}
                            />
                            <button
                              onClick={() => handleMarkPaid(g.staffId)}
                              className="btn btn-success"
                              style={{ padding: "4px 10px", fontSize: "11px", height: "26px" }}
                              disabled={submitting === g.staffId}
                            >
                              {submitting === g.staffId ? "Processing..." : "Mark Paid"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>
      </ScreenFrame>
    </>
  );
}
