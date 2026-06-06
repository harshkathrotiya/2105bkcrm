"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ArrowUpRight } from "lucide-react";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import { useStaff } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
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
  rentalEarned?: number;
  rentalPaid?: number;
  rentalPending?: number;
}

interface StaffRentalItem {
  bookingId: number;
  inquiryId: string;
  eventName: string;
  startDate: string;
  endDate: string;
  equipmentName: string;
  ratePerDay: number;
  totalRental: number;
}

export default function Screen22StaffProfile({ staffId }: { staffId: number }) {
  const router = useRouter();
  const { can } = useCurrentUser();
  const canEditStaff = can("staff.edit");
  const toast = useToast();
  const confirm = useConfirm();
  const { staff, loading: staffLoading, refreshStaff } = useStaff();

  const [history, setHistory] = useState<StaffHistoryItem[]>([]);
  const [summary, setSummary] = useState<StaffSummary | null>(null);
  const [rentals, setRentals] = useState<StaffRentalItem[]>([]);
  const [fetchedStaff, setFetchedStaff] = useState<Staff | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Owned equipment states
  const [ownedEquipment, setOwnedEquipment] = useState<any[]>([]);
  const [equipCategories, setEquipCategories] = useState<string[]>([]);
  const [showAddEquipForm, setShowAddEquipForm] = useState(false);
  const [addEquipForm, setAddEquipForm] = useState({ productName: "", category: "", quantity: "1", rentalRatePerDay: "", notes: "" });
  const [addEquipLoading, setAddEquipLoading] = useState(false);
  const [addEquipError, setAddEquipError] = useState("");

// Find target staff member
  const staffMember = staff.find((s) => s.id === staffId) || fetchedStaff;

  const handleUnassign = async (assignmentId: number) => {
    const ok = await confirm({ message: "Are you sure you want to remove this staff assignment?", confirmLabel: "Remove", danger: true });
    if (!ok) return;
    setActionLoading(true);
    try {
      await api.deleteStaffAssignment(assignmentId);
      const [histData, summData] = await Promise.all([
        api.fetchStaffHistory(staffId),
        api.fetchStaffSummary(staffId),
      ]);
      setHistory(histData);
      setSummary(summData);
      await refreshStaff();
      toast.success("Assignment removed.");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove assignment");
    } finally {
      setActionLoading(false);
    }
  };


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
        const [histData, summData, rentalData, memberData, equipRes, catOpts] = await Promise.all([
          api.fetchStaffHistory(staffId),
          api.fetchStaffSummary(staffId),
          api.fetchStaffRentals(staffId).catch(() => []),
          api.fetchStaffItem(staffId).catch(() => null),
          api.fetchEquipment({ ownerStaffId: staffId, limit: 200 }).catch(() => ({ items: [] })),
          api.fetchOptions("EQUIPMENT_CATEGORY").catch(() => []),
        ]);
        if (active) {
          setHistory(histData);
          setSummary(summData);
          setRentals(rentalData);
          if (memberData) setFetchedStaff(memberData);
          setOwnedEquipment(equipRes.items);
          setEquipCategories(catOpts.map((o: any) => o.value));
        }
      } catch (err) {
        console.error("Failed to load staff details:", err);
      } finally {
        if (active) setLoadingDetails(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, [staffId]);

  const refreshOwnedEquipment = async () => {
    const res = await api.fetchEquipment({ ownerStaffId: staffId, limit: 200 }).catch(() => ({ items: [] }));
    setOwnedEquipment(res.items);
  };

  const [settlingRental, setSettlingRental] = useState(false);
  const handleSettleRental = async () => {
    const pending = summary?.rentalPending || 0;
    if (pending <= 0) return;
    const ok = await confirm({
      message: `Record an equipment rental payment of ₹${pending.toLocaleString("en-IN")} to ${staffMember?.name}?`,
      confirmLabel: "Record payment",
    });
    if (!ok) return;
    setSettlingRental(true);
    try {
      await api.recordStaffPayment({
        staffId,
        amount: pending,
        paymentType: "EQUIPMENT_RENTAL",
        paymentMethod: "BANK_TRANSFER",
        notes: "Equipment rental settlement",
      } as any);
      const summData = await api.fetchStaffSummary(staffId);
      setSummary(summData);
      toast.success("Rental payment recorded.");
    } catch (err: any) {
      toast.error(err.message || "Failed to record rental payment");
    } finally {
      setSettlingRental(false);
    }
  };

  const handleAddEquipment = async () => {
    if (!addEquipForm.productName.trim()) { setAddEquipError("Product name is required."); return; }
    if (!addEquipForm.category) { setAddEquipError("Category is required."); return; }
    setAddEquipError("");
    try {
      setAddEquipLoading(true);
      await api.createEquipment({
        productName: addEquipForm.productName.trim(),
        category: addEquipForm.category,
        quantity: parseInt(addEquipForm.quantity) || 1,
        defaultRate: addEquipForm.rentalRatePerDay ? parseFloat(addEquipForm.rentalRatePerDay) : null,
        notes: addEquipForm.notes.trim() || null,
        ownershipType: "STAFF",
        ownerStaffId: staffId,
        status: "AVAILABLE",
        department: "VIDEO",
      } as any);
      setAddEquipForm({ productName: "", category: "", quantity: "1", rentalRatePerDay: "", notes: "" });
      setShowAddEquipForm(false);
      toast.success("Equipment created!");
      await refreshOwnedEquipment();
    } catch (err: any) {
      setAddEquipError(err.message || "Failed to create equipment");
    } finally {
      setAddEquipLoading(false);
    }
  };

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
    const ok = await confirm({ message: `Deactivate ${staffMember.name}? They will be hidden from all lists but their history will be preserved.`, confirmLabel: "Deactivate", danger: true });
    if (!ok) return;
    setActionLoading(true);
    try {
      await api.deleteStaff(staffMember.id);
      await refreshStaff();
      router.push("/staff");
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate staff");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reactivate
  const handleReactivate = async () => {
    if (!staffMember) return;
    const ok = await confirm({ message: `Reactivate ${staffMember.name}? They will appear in the staff list again.`, confirmLabel: "Reactivate" });
    if (!ok) return;
    setActionLoading(true);
    try {
      await api.reactivateStaff(staffMember.id);
      await refreshStaff();
      const memberData = await api.fetchStaffItem(staffId).catch(() => null);
      if (memberData) {
        setFetchedStaff(memberData);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reactivate staff");
    } finally {
      setActionLoading(false);
    }
  };

  if (staffLoading || (loadingDetails && !staffMember)) {
    return (
      <ScreenFrame breadcrumb="Staff › Profile › Loading...">
        <LoadingSkeleton rows={6} />
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
            {canEditStaff && (staffMember.isActive ? (
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
            ))}
            {canEditStaff && (
              <Link href={`/staff/${staffMember.id}/edit`} className="btn btn-primary">Edit Profile <ArrowUpRight size={13} /></Link>
            )}
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
                      <Check size={12} strokeWidth={3} style={{ color: "var(--gr)", marginRight: "4px" }} /> Aadhar Front
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
                      <Check size={12} strokeWidth={3} style={{ color: "var(--gr)", marginRight: "4px" }} /> Aadhar Back
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

                  {/* Equipment rental — owner's separate income stream */}
                  {!!summary.rentalEarned && (
                    <>
                      <div style={{ borderTop: "1px dashed var(--bdr)", margin: "8px 0 4px" }} />
                      <div className="row-item">
                        <span style={{ color: "var(--tx3)" }}>Equipment rental earned</span>
                        <strong style={{ color: "var(--gr)", fontFamily: "var(--font-mono)" }}>
                          ₹{(summary.rentalEarned || 0).toLocaleString("en-IN")}
                        </strong>
                      </div>
                      <div className="row-item">
                        <span style={{ color: "var(--tx3)" }}>Rental paid</span>
                        <span style={{ color: "var(--gr)", fontFamily: "var(--font-mono)" }}>
                          ₹{(summary.rentalPaid || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="row-item">
                        <span style={{ color: "var(--tx3)" }}>Rental pending</span>
                        <strong style={{ color: "var(--acc)", fontFamily: "var(--font-mono)" }}>
                          ₹{(summary.rentalPending || 0).toLocaleString("en-IN")}
                        </strong>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Equipment Rental Income — per-event, credited to this owner */}
              {rentals.length > 0 && (
                <div className="card" style={{ padding: "16px", marginBottom: 0, marginTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div className="ct">Equipment Rental Income</div>
                    {canEditStaff && (summary?.rentalPending || 0) > 0 && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: "4px 10px", fontSize: "11px" }}
                        disabled={settlingRental}
                        onClick={handleSettleRental}
                      >
                        {settlingRental ? "Recording…" : `Pay ₹${(summary?.rentalPending || 0).toLocaleString("en-IN")}`}
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--tx3)", marginBottom: 8 }}>
                    Rental credited to {staffMember?.name} as the equipment owner, regardless of who used the gear.
                  </div>
                  {rentals.map((r) => (
                    <div key={r.bookingId} className="row-item" style={{ alignItems: "flex-start" }}>
                      <span style={{ color: "var(--tx3)" }}>
                        <div style={{ color: "var(--tx)", fontWeight: 500 }}>{r.equipmentName}</div>
                        <div style={{ fontSize: "10px" }}>{r.eventName} · {r.startDate} → {r.endDate}</div>
                      </span>
                      <strong style={{ color: "var(--gr)", fontFamily: "var(--font-mono)" }}>
                        ₹{r.totalRental.toLocaleString("en-IN")}
                      </strong>
                    </div>
                  ))}
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
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Badge variant="bl">Deployed</Badge>
                      {canEditStaff && (
                        <button
                          onClick={() => handleUnassign(activeDeployment.id)}
                          className="btn"
                          style={{ padding: "4px 8px", fontSize: "10px", borderColor: "var(--rd)", color: "var(--rd)", minHeight: "auto", height: "auto" }}
                        >
                          Unassign
                        </button>
                      )}
                    </div>
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

              {/* Owned Equipment */}
              <div className="card" style={{ padding: "14px", marginBottom: 0 }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                    <line x1="6" y1="6" x2="6.01" y2="6"></line>
                    <line x1="6" y1="18" x2="6.01" y2="18"></line>
                  </svg>
                  Owned Equipment ({ownedEquipment.length})
                </h4>

                {loadingDetails ? (
                  <div style={{ fontSize: "11px", color: "var(--tx3)", fontStyle: "italic" }}>Loading...</div>
                ) : ownedEquipment.length === 0 ? (
                  <div style={{ fontSize: "11.5px", color: "var(--tx3)", fontStyle: "italic", background: "var(--alt2)", padding: "10px", borderRadius: "4px", marginBottom: "12px" }}>
                    No equipment linked to this staff member.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px", maxHeight: "180px", overflowY: "auto", paddingRight: "4px" }}>
                    {ownedEquipment.map((eq: any) => (
                      <div key={eq.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--alt)", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--b1)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <Link href={`/equipment/${eq.id}`} style={{ fontSize: "12px", fontWeight: 500, color: "var(--bl)", textDecoration: "underline" }}>
                            {eq.productName}
                          </Link>
                          <span style={{ fontSize: "10px", color: "var(--tx3)" }}>
                            {eq.category.replace(/_/g, " ")} | Qty: {eq.quantity}{eq.defaultRate ? ` | ₹${eq.defaultRate}/day` : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {canEditStaff && (
                  <div style={{ marginTop: "10px" }}>
                    {!showAddEquipForm ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: "5px 12px", fontSize: "11.5px", width: "100%" }}
                        onClick={() => { setShowAddEquipForm(true); setAddEquipError(""); }}
                      >
                        + Add Equipment
                      </button>
                    ) : (
                      <div style={{ border: "1px solid var(--b1)", borderRadius: "8px", padding: "14px", background: "var(--alt)", display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600 }}>New Equipment</span>
                          <button type="button" onClick={() => { setShowAddEquipForm(false); setAddEquipError(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--tx3)", lineHeight: 1 }}>×</button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <label style={{ fontSize: "11px", color: "var(--tx3)", fontWeight: 500 }}>Product Name *</label>
                          <input
                            className="finp"
                            style={{ padding: "5px 8px", fontSize: "12px" }}
                            placeholder="e.g. Sony FX6"
                            value={addEquipForm.productName}
                            onChange={(e) => setAddEquipForm((f) => ({ ...f, productName: e.target.value }))}
                          />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <label style={{ fontSize: "11px", color: "var(--tx3)", fontWeight: 500 }}>Category *</label>
                          <select
                            className="fsel"
                            style={{ padding: "5px 8px", fontSize: "12px" }}
                            value={addEquipForm.category}
                            onChange={(e) => setAddEquipForm((f) => ({ ...f, category: e.target.value }))}
                          >
                            <option value="">-- Select Category --</option>
                            {equipCategories.map((c) => (
                              <option key={c} value={c}>
                                {c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                            <label style={{ fontSize: "11px", color: "var(--tx3)", fontWeight: 500 }}>Quantity</label>
                            <input
                              className="finp"
                              type="number"
                              min="1"
                              style={{ padding: "5px 8px", fontSize: "12px" }}
                              value={addEquipForm.quantity}
                              onChange={(e) => setAddEquipForm((f) => ({ ...f, quantity: e.target.value }))}
                            />
                          </div>
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                            <label style={{ fontSize: "11px", color: "var(--tx3)", fontWeight: 500 }}>Rental Rate / Day (₹)</label>
                            <input
                              className="finp"
                              type="number"
                              min="0"
                              style={{ padding: "5px 8px", fontSize: "12px" }}
                              placeholder="0"
                              value={addEquipForm.rentalRatePerDay}
                              onChange={(e) => setAddEquipForm((f) => ({ ...f, rentalRatePerDay: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <label style={{ fontSize: "11px", color: "var(--tx3)", fontWeight: 500 }}>Note</label>
                          <textarea
                            className="finp"
                            style={{ padding: "5px 8px", fontSize: "12px", resize: "vertical", minHeight: "56px" }}
                            placeholder="Any additional details..."
                            value={addEquipForm.notes}
                            onChange={(e) => setAddEquipForm((f) => ({ ...f, notes: e.target.value }))}
                          />
                        </div>

                        {addEquipError && <div style={{ fontSize: "11px", color: "var(--rd)", fontWeight: 500 }}>{addEquipError}</div>}

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ flex: 1, padding: "6px 12px", fontSize: "11.5px" }}
                            onClick={handleAddEquipment}
                            disabled={addEquipLoading}
                          >
                            {addEquipLoading ? "Creating..." : "Create Equipment"}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: "6px 12px", fontSize: "11.5px" }}
                            onClick={() => { setShowAddEquipForm(false); setAddEquipError(""); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
