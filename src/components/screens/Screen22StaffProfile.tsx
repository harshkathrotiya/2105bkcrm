"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import { useStaff } from "@/lib/store";
import * as api from "@/lib/api";
import type { Staff } from "@/lib/types";

interface StaffHistoryItem {
  id: number;
  inquiryId: string;
  eventName: string;
  eventType: string;
  startDate: string;
  endDate: string;
  days: number;
  positionName: string;
  amount: number;
  paymentStatus: "Paid" | "Pending";
}

interface StaffSummary {
  eventsWorked: number;
  totalDays: number;
  totalEarned: number;
  paid: number;
  pending: number;
}

export default function Screen22StaffProfile({ staffId }: { staffId: number }) {
  const router = useRouter();
  const { staff, loading: staffLoading, refreshStaff } = useStaff();

  const [history, setHistory] = useState<StaffHistoryItem[]>([]);
  const [summary, setSummary] = useState<StaffSummary | null>(null);
  const [fetchedStaff, setFetchedStaff] = useState<Staff | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Find target staff member
  const staffMember = useMemo(() => {
    return staff.find((s) => s.id === staffId) || fetchedStaff;
  }, [staff, staffId, fetchedStaff]);

  const staffStatus = useMemo(() => {
    if (!staffMember) return "Unknown";
    if (!staffMember.isActive) return "Inactive";
    return ("status" in staffMember ? (staffMember as any).status : "Available") as string;
  }, [staffMember]);

  // Load staff history and summary details
  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoadingDetails(true);
      try {
        const [histData, summData, memberData] = await Promise.all([
          api.fetchStaffHistory(staffId),
          api.fetchStaffSummary(staffId),
          api.fetchStaffItem(staffId).catch(() => null),
        ]);
        if (active) {
          setHistory(histData);
          setSummary(summData);
          if (memberData) {
            setFetchedStaff(memberData);
          }
        }
      } catch (err) {
        console.error("Failed to load staff details:", err);
      } finally {
        if (active) {
          setLoadingDetails(false);
        }
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [staffId]);

  // Initials for avatar
  const initials = useMemo(() => {
    if (!staffMember) return "?";
    return staffMember.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [staffMember]);

  // Check if there is an active event deployment today
  const activeDeployment = useMemo(() => {
    if (!history.length) return null;
    const today = new Date().toISOString().split("T")[0];
    return history.find((h) => h.startDate <= today && h.endDate >= today) || null;
  }, [history]);

  // Format date range helper (e.g. "10-12 May")
  const formatDateRange = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}-${end.getDate()} ${months[start.getMonth()]}`;
    }
    return `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]}`;
  };

  // Handle deactivate (soft delete)
  const handleDeactivate = async () => {
    if (!staffMember) return;
    if (!confirm(`Deactivate ${staffMember.name}? They will be hidden from all lists but their history will be preserved.`)) return;
    setActionLoading(true);
    try {
      await api.deleteStaff(staffMember.id);
      await refreshStaff();
      router.push("/staff");
    } catch (err: any) {
      alert(err.message || "Failed to deactivate staff");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reactivate
  const handleReactivate = async () => {
    if (!staffMember) return;
    if (!confirm(`Reactivate ${staffMember.name}? They will appear in the staff list again.`)) return;
    setActionLoading(true);
    try {
      await api.reactivateStaff(staffMember.id);
      await refreshStaff();
      const memberData = await api.fetchStaffItem(staffId).catch(() => null);
      if (memberData) {
        setFetchedStaff(memberData);
      }
    } catch (err: any) {
      alert(err.message || "Failed to reactivate staff");
    } finally {
      setActionLoading(false);
    }
  };

  if (staffLoading || (loadingDetails && !staffMember)) {
    return (
      <ScreenFrame breadcrumb="Staff › Profile › Loading...">
        <LoadingSkeleton rows={6} message="Loading profile details..." />
      </ScreenFrame>
    );
  }

  if (!staffMember) {
    return (
      <ScreenFrame breadcrumb="Staff › Profile › Not Found">
        <div className="text-center py-12 text-tx3">Staff member not found.</div>
      </ScreenFrame>
    );
  }

  return (
    <>
      <SectionHeader
        title={<>Staff <strong>Profile</strong></>}
        description={`View details, event history, earnings summary and timeline for ${staffMember.name}.`}
      />

      <ScreenFrame
        breadcrumb={`Staff › Profile › ${staffMember.name}`}
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <Link href="/staff" className="btn">Back to List</Link>
            {staffMember.isActive ? (
              <button
                onClick={handleDeactivate}
                className="btn"
                disabled={actionLoading}
                style={{ color: "var(--rd)", borderColor: "var(--rd)" }}
              >
                {actionLoading ? "..." : "Deactivate"}
              </button>
            ) : (
              <button
                onClick={handleReactivate}
                className="btn btn-success"
                disabled={actionLoading}
              >
                {actionLoading ? "..." : "Reactivate"}
              </button>
            )}
            <Link href={`/staff/${staffMember.id}/edit`} className="btn btn-primary">Edit Profile ↗</Link>
          </div>
        }
      >
        <div style={{ display: "flex", border: "1px solid var(--b1)", borderRadius: "12px", overflow: "hidden", background: "var(--s1)" }}>
          
          {/* Quick Staff Navigation Sidebar */}
          <div
            style={{
              width: "185px",
              background: "var(--s2)",
              borderRight: "1px solid var(--b1)",
              padding: "12px 0",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              overflowY: "auto",
              maxHeight: "650px",
            }}
          >
            <div style={{ padding: "6px 14px 2px", fontSize: "9px", color: "var(--tx3)", letterSpacing: ".1em", textTransform: "uppercase" }}>
              Staff List
            </div>
            {staff.map((s) => (
              <div
                key={s.id}
                onClick={() => router.push(`/staff/${s.id}`)}
                style={{
                  padding: "8px 14px",
                  fontSize: "12px",
                  color: s.id === staffId ? "var(--tx)" : "var(--tx3)",
                  background: s.id === staffId ? "var(--s1)" : "transparent",
                  borderLeft: `2px solid ${s.id === staffId ? "var(--acc)" : "transparent"}`,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: s.id === staffId ? 500 : 400,
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    fontSize: "8px",
                    background: s.id === staffId ? "var(--sidebar-active)" : "var(--alt3)",
                    color: s.id === staffId ? "var(--acc)" : "var(--tx3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                  }}
                >
                  {s.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2)}
                </div>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
              </div>
            ))}
          </div>

          {/* Profile Core View */}
          <div style={{ flex: 1, padding: "16px", background: "var(--cnt-bg)", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.5fr)", gap: "16px" }}>
            
            {/* Left Column: Core Info & YTD summary */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              
              {/* Profile Card */}
              <div className="card" style={{ padding: "16px", marginBottom: 0 }}>
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: "16px", borderBottom: "1px solid var(--b1)" }}>
                  <div
                    className="avatar-lg"
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      fontSize: "20px",
                      background: "var(--sidebar-active)",
                      color: "var(--acc)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      border: "1px solid var(--b1)",
                      marginBottom: "10px",
                    }}
                  >
                    {initials}
                  </div>
                  <strong style={{ fontSize: "16px", color: "var(--tx)" }}>{staffMember.name}</strong>
                  <div style={{ fontSize: "12px", color: "var(--tx3)", marginTop: "2px" }}>{staffMember.role}</div>
                  
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                    <Badge variant={staffMember.staffType === "INHOUSE" ? "gr" : "am"}>
                      {staffMember.staffType === "INHOUSE" ? "In-house" : "External"}
                    </Badge>
                    <Badge variant={staffStatus === "Available" ? "gr" : staffStatus === "Deployed" ? "bl" : "gy"}>
                      {staffStatus}
                    </Badge>
                  </div>
                </div>

                <div style={{ marginTop: "12px" }}>
                  <div className="row-item">
                    <span style={{ color: "var(--tx3)" }}>Mobile</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--tx2)" }}>
                      {staffMember.phone.replace(/(\d{5})(\d{5})/, "$1 $2")}
                    </span>
                  </div>
                  <div className="row-item">
                    <span style={{ color: "var(--tx3)" }}>Payment type</span>
                    <span style={{ color: "var(--tx2)" }}>{staffMember.paymentType === "PER_DAY" ? "Per Day" : "Monthly Fixed"}</span>
                  </div>
                  <div className="row-item">
                    <span style={{ color: "var(--tx3)" }}>Rate / Salary</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500, color: "var(--tx)" }}>
                      {staffMember.paymentType === "PER_DAY"
                        ? `₹${(staffMember.ratePerDay || 0).toLocaleString("en-IN")}/day`
                        : `₹${(staffMember.monthlySalary || 0).toLocaleString("en-IN")}/month`}
                    </span>
                  </div>
                  <div className="row-item">
                    <span style={{ color: "var(--tx3)" }}>With equipment</span>
                    <span style={{ color: "var(--tx2)" }}>
                      {staffMember.withEquipment ? staffMember.equipmentDesc || "Yes" : "No"}
                    </span>
                  </div>
                  <div className="row-item">
                    <span style={{ color: "var(--tx3)" }}>Aadhar Number</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--tx2)" }}>
                      {staffMember.aadharNumber
                        ? staffMember.aadharNumber.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")
                        : "Not Entered"}
                    </span>
                  </div>
                </div>

                {/* Aadhar Uploads Download/View */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "12px" }}>
                  {staffMember.aadharFront ? (
                    <a
                      href={staffMember.aadharFront}
                      download={`aadhar_front_${staffMember.name.toLowerCase().replace(/\s+/g, "_")}.png`}
                      className="btn btn-success"
                      style={{ fontSize: "10.5px", padding: "6px 8px", justifyContent: "center", display: "flex" }}
                    >
                      <span style={{ color: "var(--gr)", marginRight: "4px" }}>✓</span> Aadhar Front
                    </a>
                  ) : (
                    <div className="btn" style={{ fontSize: "10.5px", padding: "6px 8px", justifyContent: "center", display: "flex", opacity: 0.4, cursor: "not-allowed" }}>
                      Missing Front
                    </div>
                  )}

                  {staffMember.aadharBack ? (
                    <a
                      href={staffMember.aadharBack}
                      download={`aadhar_back_${staffMember.name.toLowerCase().replace(/\s+/g, "_")}.png`}
                      className="btn btn-success"
                      style={{ fontSize: "10.5px", padding: "6px 8px", justifyContent: "center", display: "flex" }}
                    >
                      <span style={{ color: "var(--gr)", marginRight: "4px" }}>✓</span> Aadhar Back
                    </a>
                  ) : (
                    <div className="btn" style={{ fontSize: "10.5px", padding: "6px 8px", justifyContent: "center", display: "flex", opacity: 0.4, cursor: "not-allowed" }}>
                      Missing Back
                    </div>
                  )}
                </div>
              </div>

              {/* Fiscal Year Financial Summary Card */}
              {summary && (
                <div className="card" style={{ padding: "16px", marginBottom: 0 }}>
                  <div className="ct">FY {new Date().getFullYear()}-{String(new Date().getFullYear() + 1).slice(2)} Summary</div>
                  
                  <div className="row-item">
                    <span style={{ color: "var(--tx3)" }}>Events worked</span>
                    <strong style={{ color: "var(--tx)" }}>{summary.eventsWorked}</strong>
                  </div>
                  <div className="row-item">
                    <span style={{ color: "var(--tx3)" }}>Total days worked</span>
                    <strong style={{ color: "var(--tx)" }}>{summary.totalDays} days</strong>
                  </div>
                  <div className="row-item">
                    <span style={{ color: "var(--tx3)" }}>Total earned</span>
                    <strong style={{ color: "var(--gr)", fontFamily: "var(--font-mono)" }}>
                      ₹{summary.totalEarned.toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <div className="row-item">
                    <span style={{ color: "var(--tx3)" }}>Paid</span>
                    <span style={{ color: "var(--gr)", fontFamily: "var(--font-mono)" }}>
                      ₹{summary.paid.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="row-item">
                    <span style={{ color: "var(--tx3)" }}>Pending</span>
                    <strong style={{ color: "var(--acc)", fontFamily: "var(--font-mono)" }}>
                      ₹{summary.pending.toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Deployment & Event History & Timeline */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              
              {/* Current Deployment Card */}
              <div className="card" style={{ padding: "14px", marginBottom: 0 }}>
                <div className="ct">Current Deployment</div>
                {activeDeployment ? (
                  <div
                    style={{
                      background: "var(--s2)",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: "1px solid var(--b1)",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "12.5px", color: "var(--tx)" }}>{activeDeployment.eventName}</strong>
                      <div style={{ fontSize: "10px", color: "var(--tx3)", marginTop: "2.5px" }}>
                        Role: {activeDeployment.positionName} • {formatDateRange(activeDeployment.startDate, activeDeployment.endDate)}
                      </div>
                    </div>
                    <Badge variant="bl">Deployed</Badge>
                  </div>
                ) : (
                  <div
                    style={{
                      background: "var(--s2)",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: "1px solid var(--b1)",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "12.5px", color: "var(--tx)" }}>No active event today</strong>
                      <div style={{ fontSize: "10px", color: "var(--tx3)", marginTop: "2.5px" }}>
                        Available for assignment
                      </div>
                    </div>
                    <Badge variant="gr">Free</Badge>
                  </div>
                )}
              </div>

              {/* Event History Table */}
              <div className="card" style={{ padding: "14px", marginBottom: 0 }}>
                <div className="ct">Event History</div>
                <div style={{ overflowX: "auto" }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th style={{ width: "95px" }}>Dates</th>
                        <th style={{ width: "50px" }} className="tc">Days</th>
                        <th style={{ width: "85px" }} className="tr">Amount</th>
                        <th style={{ width: "75px" }} className="tc">Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-tx3" style={{ fontStyle: "italic" }}>
                            No events worked yet.
                          </td>
                        </tr>
                      ) : (
                        history.map((h) => (
                          <tr key={h.id}>
                            <td>
                              <strong style={{ color: "var(--tx)" }}>{h.eventName}</strong>
                              <div style={{ fontSize: "9.5px", color: "var(--tx3)", marginTop: "1px" }}>{h.positionName}</div>
                            </td>
                            <td style={{ fontSize: "10px" }}>{formatDateRange(h.startDate, h.endDate)}</td>
                            <td className="tc">{h.days}</td>
                            <td className="tr" style={{ fontFamily: "var(--font-mono)" }}>₹{h.amount.toLocaleString("en-IN")}</td>
                            <td className="tc">
                              <Badge variant={h.paymentStatus === "Paid" ? "gr" : "am"}>
                                {h.paymentStatus}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Timeline */}
              <div className="card" style={{ padding: "14px", marginBottom: 0 }}>
                <div className="ct">Payment Timeline</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {history.length === 0 ? (
                    <div style={{ fontSize: "11px", color: "var(--tx3)", fontStyle: "italic" }}>No timeline entries available.</div>
                  ) : (
                    history.slice(0, 5).map((h, index) => (
                      <div className="tl-item" key={h.id}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div className="tl-dot" style={{ background: h.paymentStatus === "Paid" ? "var(--gr)" : "var(--acc)" }} />
                          {index < Math.min(5, history.length) - 1 && <div className="tl-line" />}
                        </div>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--tx)" }}>
                            {h.eventName} - {h.positionName}
                          </div>
                          <div style={{ fontSize: "10px", color: "var(--tx3)" }}>
                            {formatDateRange(h.startDate, h.endDate)} - ₹{h.amount.toLocaleString("en-IN")} - {h.paymentStatus}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {history.length > 5 && (
                    <div style={{ fontSize: "10px", color: "var(--tx3)", paddingLeft: "18px", marginTop: "4px" }}>
                      + {history.length - 5} older events in log
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>
      </ScreenFrame>
    </>
  );
}
