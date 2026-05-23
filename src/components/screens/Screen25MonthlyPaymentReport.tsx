"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import * as api from "@/lib/api";

export default function Screen25MonthlyPaymentReport() {
  // Monthly selection
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Report Data State
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal State
  const [payModal, setPayModal] = useState<{
    show: boolean;
    staffId: number;
    staffName: string;
    amount: number;
    paymentType: "PER_DAY" | "MONTHLY";
  } | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CASH" | "BANK_TRANSFER" | "CHEQUE">("UPI");
  const [referenceNo, setReferenceNo] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  // Month selector choices (past 12 months)
  const monthChoices = useMemo(() => {
    const list = [];
    const d = new Date();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    for (let i = 0; i < 12; i++) {
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, "0")}`;
      const label = `${monthNames[month - 1]} ${year}`;
      list.push({ key, label });
      d.setMonth(d.getMonth() - 1);
    }
    return list;
  }, []);

  // Fetch Report Data
  useEffect(() => {
    let active = true;
    async function loadReport() {
      setLoading(true);
      try {
        const data = await api.fetchMonthlyReport(selectedMonth);
        if (active) {
          setReport(data);
        }
      } catch (err) {
        console.error("Failed to load monthly payment report:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadReport();
    return () => {
      active = false;
    };
  }, [selectedMonth, refreshTrigger]);

  // Open Payment modal
  const handleOpenPayModal = (staffId: number, staffName: string, amount: number, paymentType: "PER_DAY" | "MONTHLY") => {
    setPaymentMethod("UPI");
    setReferenceNo(`SALARY-${selectedMonth}`);
    setPayModal({
      show: true,
      staffId,
      staffName,
      amount,
      paymentType,
    });
  };

  // Submit Payment from modal
  const handleConfirmPayment = async () => {
    if (!payModal) return;
    setProcessingPayment(true);
    try {
      if (payModal.paymentType === "MONTHLY") {
        // Record monthly fixed salary payout
        await api.recordStaffPayment({
          staffId: payModal.staffId,
          amount: payModal.amount,
          paymentType: "MONTHLY_SALARY",
          month: selectedMonth,
          paymentMethod,
          referenceNo: referenceNo || null,
        });
      } else {
        // Record per day staff payments (find all pending assignments in that month)
        const history = await api.fetchStaffHistory(payModal.staffId);
        const pendingInMonth = history.filter(
          (h: any) => h.paymentStatus === "Pending" && h.startDate.startsWith(selectedMonth)
        );

        if (pendingInMonth.length === 0) {
          alert("No pending event assignments found for this staff member in this month.");
          setPayModal(null);
          return;
        }

        const payments = pendingInMonth.map((a: any) => ({
          staffId: payModal.staffId,
          assignmentId: a.id,
          inquiryId: a.inquiryId,
          amount: a.amount,
          paymentType: "PER_EVENT" as const,
          paymentMethod,
          referenceNo: referenceNo || null,
        }));

        await api.recordBulkStaffPayments(payments);
      }

      setRefreshTrigger((prev) => prev + 1);
      setPayModal(null);
    } catch (err: any) {
      alert(err.message || "Failed to submit payout");
    } finally {
      setProcessingPayment(false);
    }
  };

  // Pay All Pending in bulk
  const handlePayAllPending = async () => {
    if (!report) return;
    const totalPending = report.totals.pending;
    if (totalPending === 0) return;

    if (!confirm(`Mark all pending staff payouts for ${selectedMonth} as paid?`)) {
      return;
    }

    setProcessingPayment(true);
    try {
      const payments: any[] = [];

      // 1. Process Monthly Fixed Staff who are pending
      const pendingMonthly = report.monthlyStaff.filter((ms: any) => ms.status === "Pending");
      pendingMonthly.forEach((ms: any) => {
        payments.push({
          staffId: ms.staff.id,
          amount: ms.monthlySalary,
          paymentType: "MONTHLY_SALARY",
          month: selectedMonth,
          paymentMethod: "UPI",
          referenceNo: `BULK-SALARY-${selectedMonth}`,
        });
      });

      // 2. Process Per Day Staff who are pending
      const pendingPerDay = report.perDayStaff.filter((pd: any) => pd.pending > 0);
      for (const pd of pendingPerDay) {
        const history = await api.fetchStaffHistory(pd.staff.id);
        const pendingInMonth = history.filter(
          (h: any) => h.paymentStatus === "Pending" && h.startDate.startsWith(selectedMonth)
        );
        pendingInMonth.forEach((a: any) => {
          payments.push({
            staffId: pd.staff.id,
            assignmentId: a.id,
            inquiryId: a.inquiryId,
            amount: a.amount,
            paymentType: "PER_EVENT",
            paymentMethod: "UPI",
            referenceNo: `BULK-SALARY-${selectedMonth}`,
          });
        });
      }

      if (payments.length > 0) {
        await api.recordBulkStaffPayments(payments);
      }

      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      alert(err.message || "Failed to process bulk payments");
    } finally {
      setProcessingPayment(false);
    }
  };

  // Trigger browser print dialog (PDF layout styled in printable classes)
  const handlePrint = () => {
    window.print();
  };

  // Format month text (e.g. "2026-05" -> "May 2026")
  const formatMonthText = (mStr: string) => {
    const [yr, mn] = mStr.split("-").map(Number);
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${months[mn - 1]} ${yr}`;
  };

  return (
    <>
      <SectionHeader
        title={<>Monthly <strong>Salary & Payment Report</strong></>}
        description="Review payroll distributions split by monthly fixed salary staff and freelance per-day operators."
      />

      <div className="no-print">
        <ScreenFrame
          breadcrumb={`Staff › Reports › ${formatMonthText(selectedMonth)}`}
          actions={
            <div style={{ display: "flex", gap: "8px" }}>
              <select
                className="fsel"
                style={{ width: "160px", fontSize: "11.5px", height: "28px", padding: "0 6px" }}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {monthChoices.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button onClick={handlePrint} className="btn">Print / Download PDF</button>
              <button
                onClick={handlePayAllPending}
                className="btn btn-success"
                disabled={loading || !report || report.totals.pending === 0}
              >
                Pay All Pending ↗
              </button>
            </div>
          }
        >
          {loading || !report ? (
            <div className="text-center py-12 text-tx3">Loading report details...</div>
          ) : (
            <div style={{ display: "flex", border: "1px solid var(--b1)", borderRadius: "12px", overflow: "hidden", background: "var(--s1)" }}>
              
              {/* Sidebar Info Panel */}
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
                  Selected Month
                </div>
                <strong style={{ color: "var(--tx)", display: "block", fontSize: "13.5px" }}>{formatMonthText(selectedMonth)}</strong>
                
                <div style={{ height: "1px", background: "var(--b1)", margin: "10px 0" }} />

                <div style={{ padding: "0 0 4px", fontSize: "9px", color: "var(--tx3)", letterSpacing: ".1em", textTransform: "uppercase" }}>
                  Monthly Aggregates
                </div>
                <div style={{ color: "var(--tx2)" }}>Total Payable: <span style={{ color: "var(--tx)", fontFamily: "var(--font-mono)" }}>₹{report.totals.total.toLocaleString("en-IN")}</span></div>
                <div style={{ color: "var(--tx2)" }}>Paid: <span style={{ color: "var(--gr)", fontFamily: "var(--font-mono)" }}>₹{report.totals.paid.toLocaleString("en-IN")}</span></div>
                <div style={{ color: "var(--tx2)" }}>Pending: <span style={{ color: "var(--acc)", fontFamily: "var(--font-mono)" }}>₹{report.totals.pending.toLocaleString("en-IN")}</span></div>
              </div>

              {/* Main Report Table Grid */}
              <div style={{ flex: 1, padding: "16px", background: "var(--cnt-bg)", display: "flex", flexDirection: "column", gap: "16px" }}>
                
                {/* Metrics */}
                <div className="met">
                  <div className="mc">
                    <div className="ml">Total Payable ({formatMonthText(selectedMonth)})</div>
                    <div className="mv">₹{report.totals.total.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="mc">
                    <div className="ml">Paid</div>
                    <div className="mv" style={{ color: "var(--gr)" }}>₹{report.totals.paid.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="mc">
                    <div className="ml">Pending</div>
                    <div className="mv" style={{ color: "var(--acc)" }}>₹{report.totals.pending.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="mc">
                    <div className="ml">Active Staff Count</div>
                    <div className="mv">{report.perDayStaff.length + report.monthlyStaff.length}</div>
                  </div>
                </div>

                {/* Section 1: Per Day Wages */}
                <div className="card" style={{ padding: "14px", marginBottom: 0 }}>
                  <div className="ct" style={{ fontSize: "13px" }}>Per Day Wages Staff — {formatMonthText(selectedMonth)}</div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th style={{ width: "95px" }}>Type</th>
                          <th style={{ width: "120px" }} className="tc">Events / Days Worked</th>
                          <th style={{ width: "100px" }} className="tr">Rate / Day</th>
                          <th style={{ width: "110px" }} className="tr">Total Earnings</th>
                          <th style={{ width: "95px" }} className="tr">Paid</th>
                          <th style={{ width: "95px" }} className="tr">Pending</th>
                          <th style={{ width: "85px" }} className="tc">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.perDayStaff.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-4 text-tx3" style={{ fontStyle: "italic" }}>
                              No per-day staff assignments recorded for this month.
                            </td>
                          </tr>
                        ) : (
                          report.perDayStaff.map((pd: any) => (
                            <tr key={pd.staff.id}>
                              <td>
                                <strong style={{ color: "var(--tx)" }}>{pd.staff.name}</strong>
                                <div style={{ fontSize: "9.5px", color: "var(--tx3)" }}>{pd.staff.role}</div>
                              </td>
                              <td>
                                <Badge variant={pd.staff.staffType === "INHOUSE" ? "gr" : "am"}>
                                  {pd.staff.staffType === "INHOUSE" ? "In-house" : "External"}
                                </Badge>
                              </td>
                              <td className="tc" style={{ fontSize: "11.5px" }}>
                                {pd.events} event(s) / {pd.totalDays}d
                              </td>
                              <td className="tr" style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px" }}>
                                ₹{(pd.staff.ratePerDay || 0).toLocaleString("en-IN")}
                              </td>
                              <td className="tr" style={{ fontFamily: "var(--font-mono)", fontWeight: 500, color: "var(--tx)", fontSize: "11.5px" }}>
                                ₹{pd.totalAmount.toLocaleString("en-IN")}
                              </td>
                              <td className="tr" style={{ fontFamily: "var(--font-mono)", color: "var(--gr)", fontSize: "11.5px" }}>
                                ₹{pd.paid.toLocaleString("en-IN")}
                              </td>
                              <td className="tr" style={{ fontFamily: "var(--font-mono)", color: pd.pending > 0 ? "var(--acc)" : "var(--gr)", fontWeight: pd.pending > 0 ? 600 : 400, fontSize: "11.5px" }}>
                                ₹{pd.pending.toLocaleString("en-IN")}
                              </td>
                              <td className="tc">
                                {pd.pending > 0 ? (
                                  <button
                                    onClick={() => handleOpenPayModal(pd.staff.id, pd.staff.name, pd.pending, "PER_DAY")}
                                    className="btn btn-success"
                                    style={{ fontSize: "10px", padding: "2px 8px" }}
                                  >
                                    Pay
                                  </button>
                                ) : (
                                  <Badge variant="gr">Paid</Badge>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 2: Fixed Monthly Salary Staff */}
                <div className="card" style={{ padding: "14px", marginBottom: 0 }}>
                  <div className="ct" style={{ fontSize: "13px" }}>Monthly Salary Staff — {formatMonthText(selectedMonth)}</div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th style={{ width: "95px" }}>Type</th>
                          <th style={{ width: "160px" }} className="tr">Monthly Fixed Salary</th>
                          <th style={{ width: "110px" }} className="tc">Status</th>
                          <th style={{ width: "110px" }} className="tc">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.monthlyStaff.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-4 text-tx3" style={{ fontStyle: "italic" }}>
                              No fixed monthly salary staff members registered.
                            </td>
                          </tr>
                        ) : (
                          report.monthlyStaff.map((ms: any) => {
                            const isPaid = ms.status === "Paid";
                            return (
                              <tr key={ms.staff.id}>
                                <td>
                                  <strong style={{ color: "var(--tx)" }}>{ms.staff.name}</strong>
                                  <div style={{ fontSize: "9.5px", color: "var(--tx3)" }}>{ms.staff.role}</div>
                                </td>
                                <td>
                                  <Badge variant="gr">In-house</Badge>
                                </td>
                                <td className="tr" style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: "11.5px" }}>
                                  ₹{ms.monthlySalary.toLocaleString("en-IN")}/month
                                </td>
                                <td className="tc">
                                  <Badge variant={isPaid ? "gr" : "am"}>
                                    {ms.status}
                                  </Badge>
                                </td>
                                <td className="tc">
                                  {!isPaid ? (
                                    <button
                                      onClick={() => handleOpenPayModal(ms.staff.id, ms.staff.name, ms.monthlySalary, "MONTHLY")}
                                      className="btn btn-success"
                                      style={{ fontSize: "10px", padding: "2px 8px" }}
                                    >
                                      Pay
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: "11px", color: "var(--tx3)" }}>Done</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}
        </ScreenFrame>
      </div>

      {/* Printable Layout (Hidden on screen, shown in print) */}
      {report && (
        <div className="print-only" style={{ padding: "20px", color: "#000", background: "#fff", display: "none" }}>
          <div style={{ borderBottom: "2px solid #000", paddingBottom: "10px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>BK MEDIA CRM</h1>
              <div style={{ fontSize: "12px", color: "#666" }}>Monthly Payroll Distribution & Report</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "14px", fontWeight: "bold" }}>Report Month: {formatMonthText(selectedMonth)}</div>
              <div style={{ fontSize: "11px", color: "#666" }}>Printed on: {new Date().toLocaleDateString("en-IN")}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
            <div style={{ border: "1px solid #ddd", borderRadius: "4px", padding: "10px", flex: 1 }}>
              <div style={{ fontSize: "10px", color: "#666", textTransform: "uppercase" }}>Total Payable</div>
              <div style={{ fontSize: "16px", fontWeight: "bold" }}>₹{report.totals.total.toLocaleString("en-IN")}</div>
            </div>
            <div style={{ border: "1px solid #ddd", borderRadius: "4px", padding: "10px", flex: 1 }}>
              <div style={{ fontSize: "10px", color: "#666", textTransform: "uppercase" }}>Paid</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "green" }}>₹{report.totals.paid.toLocaleString("en-IN")}</div>
            </div>
            <div style={{ border: "1px solid #ddd", borderRadius: "4px", padding: "10px", flex: 1 }}>
              <div style={{ fontSize: "10px", color: "#666", textTransform: "uppercase" }}>Pending</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "orange" }}>₹{report.totals.pending.toLocaleString("en-IN")}</div>
            </div>
          </div>

          <h3 style={{ fontSize: "13px", borderBottom: "1px solid #ccc", paddingBottom: "4px", marginTop: "20px" }}>Per Day Wages Staff</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginTop: "8px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #999" }}>
                <th style={{ textAlign: "left", padding: "6px" }}>Name / Role</th>
                <th style={{ textAlign: "left", padding: "6px" }}>Type</th>
                <th style={{ textAlign: "center", padding: "6px" }}>Events / Days</th>
                <th style={{ textAlign: "right", padding: "6px" }}>Rate / Day</th>
                <th style={{ textAlign: "right", padding: "6px" }}>Total</th>
                <th style={{ textAlign: "right", padding: "6px" }}>Paid</th>
                <th style={{ textAlign: "right", padding: "6px" }}>Pending</th>
              </tr>
            </thead>
            <tbody>
              {report.perDayStaff.map((pd: any) => (
                <tr key={pd.staff.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "6px" }}><strong>{pd.staff.name}</strong> ({pd.staff.role})</td>
                  <td style={{ padding: "6px" }}>{pd.staff.staffType}</td>
                  <td style={{ padding: "6px", textAlign: "center" }}>{pd.events} events / {pd.totalDays}d</td>
                  <td style={{ padding: "6px", textAlign: "right" }}>₹{pd.staff.ratePerDay}</td>
                  <td style={{ padding: "6px", textAlign: "right" }}>₹{pd.totalAmount}</td>
                  <td style={{ padding: "6px", textAlign: "right" }}>₹{pd.paid}</td>
                  <td style={{ padding: "6px", textAlign: "right" }}>₹{pd.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ fontSize: "13px", borderBottom: "1px solid #ccc", paddingBottom: "4px", marginTop: "30px" }}>Monthly Salary Staff</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginTop: "8px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #999" }}>
                <th style={{ textAlign: "left", padding: "6px" }}>Name / Role</th>
                <th style={{ textAlign: "right", padding: "6px" }}>Monthly Fixed Salary</th>
                <th style={{ textAlign: "center", padding: "6px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {report.monthlyStaff.map((ms: any) => (
                <tr key={ms.staff.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "6px" }}><strong>{ms.staff.name}</strong> ({ms.staff.role})</td>
                  <td style={{ padding: "6px", textAlign: "right" }}>₹{ms.monthlySalary}/month</td>
                  <td style={{ padding: "6px", textAlign: "center" }}>{ms.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Dialog Modal */}
      {payModal && payModal.show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.75)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="card"
            style={{
              width: "420px",
              background: "var(--s1)",
              border: "1px solid var(--b1)",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            }}
          >
            <strong style={{ fontSize: "15px", color: "var(--tx)", display: "block", marginBottom: "4px" }}>
              Record Payroll Payout
            </strong>
            <div style={{ fontSize: "12px", color: "var(--tx3)", marginBottom: "16px" }}>
              Submit salary disbursement log for the month of {formatMonthText(selectedMonth)}.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div className="row" style={{ borderBottom: "none", padding: 0 }}>
                <span style={{ color: "var(--tx3)", fontSize: "12px" }}>Staff Member</span>
                <strong style={{ color: "var(--tx)" }}>{payModal.staffName}</strong>
              </div>
              <div className="row" style={{ borderBottom: "none", padding: 0 }}>
                <span style={{ color: "var(--tx3)", fontSize: "12px" }}>Payout Amount</span>
                <strong style={{ color: "var(--gr)", fontFamily: "var(--font-mono)" }}>₹{payModal.amount.toLocaleString("en-IN")}</strong>
              </div>

              <div style={{ height: "1px", background: "var(--b1)" }} />

              <div className="field">
                <div className="flbl">Payment Method</div>
                <select
                  className="fsel"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                >
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div className="field">
                <div className="flbl">Transaction Reference ID</div>
                <input
                  type="text"
                  className="finp"
                  placeholder="e.g. UPI12345678"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setPayModal(null)}
                className="btn"
                disabled={processingPayment}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                className="btn btn-success"
                disabled={processingPayment}
              >
                {processingPayment ? "Processing..." : "Confirm Payout ↗"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for printable views */}
      <style jsx global>{`
        @media print {
          .no-print, header, nav, footer, .sidebar-wrapper, .breadcrumb-wrapper {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
