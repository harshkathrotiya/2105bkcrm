"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import { useStaff } from "@/lib/store";
import * as api from "@/lib/api";
import type { Inquiry, Quotation, Staff, StaffAssignment } from "@/lib/types";
import { useToast } from "../ui/Toast";

interface PositionRow {
  no: number;
  position: string;
  equip: string;
  rate: number;
  days: number;
  amount: number;
}

export default function Screen23AssignPosition() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("inquiryId") || "";

  const { staff, refreshStaff } = useStaff();

  // Local State
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [existingAssignments, setExistingAssignments] = useState<StaffAssignment[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Record<number, number>>({}); // position.no -> staffId
  const [confirmedDuplicates, setConfirmedDuplicates] = useState<Record<number, boolean>>({}); // staffId -> confirmed
  const [reportingTimes, setReportingTimes] = useState<Record<number, string>>({}); // position.no -> time string
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Availability state
  const [staffAvailability, setStaffAvailability] = useState<Record<number, { status: "FREE" | "PARTIAL" | "BUSY"; conflicts: any[] }>>({});

  // Duplicate warning state
  const [showDupWarning, setShowDupWarning] = useState(false);
  const [dupStaff, setDupStaff] = useState<Staff | null>(null);
  const [dupPositionName, setDupPositionName] = useState("");
  const [dupPreviousPosition, setDupPreviousPosition] = useState("");
  const [dupPositionNo, setDupPositionNo] = useState<number | null>(null);

  // Overlap warning state
  const [showOverlapWarning, setShowOverlapWarning] = useState(false);
  const [overlapStaff, setOverlapStaff] = useState<Staff | null>(null);
  const [overlapPositionNo, setOverlapPositionNo] = useState<number | null>(null);
  const [overlapPositionName, setOverlapPositionName] = useState("");
  const [overlapConflictsList, setOverlapConflictsList] = useState<any[]>([]);

  // Load Inquiry, Quotation, and Existing Assignments
  useEffect(() => {
    if (!inquiryId) return;

    let active = true;
    async function loadData() {
      setLoading(true);
      try {
        const [warehouseCheckData, assignmentsData] = await Promise.all([
          api.fetchWarehouseCheck(inquiryId),
          api.fetchStaffAssignments(inquiryId),
        ]);

        if (active) {
          const inq = warehouseCheckData.inquiry;
          setInquiry(inq);
          setQuotation(warehouseCheckData.quotation as unknown as Quotation);
          setExistingAssignments(assignmentsData);

          // Populate selectedStaff and reportingTimes from existing assignments
          const initialSelections: Record<number, number> = {};
          const confirmedDups: Record<number, boolean> = {};
          const initialTimes: Record<number, string> = {};

          assignmentsData.forEach((a) => {
            if (a.positionNo !== null && a.positionNo !== undefined) {
              initialSelections[a.positionNo] = a.staffId;
              initialTimes[a.positionNo] = a.reportingTime || "09:00 AM";
              if (a.confirmedDup) {
                confirmedDups[a.staffId] = true;
              }
            }
          });

          setSelectedStaff(initialSelections);
          setConfirmedDuplicates(confirmedDups);
          setReportingTimes(initialTimes);

          // Fetch staff availability
          if (inq && inq.startDate && inq.endDate) {
            try {
              const availability = await api.checkStaffAvailability(inq.startDate, inq.endDate);
              const availabilityMap: Record<number, { status: "FREE" | "PARTIAL" | "BUSY"; conflicts: any[] }> = {};
              availability.forEach((s) => {
                availabilityMap[s.id] = {
                  status: s.status,
                  conflicts: s.conflicts,
                };
              });
              setStaffAvailability(availabilityMap);
            } catch (err) {
              console.error("Failed to fetch staff availability:", err);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load position assignments data:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [inquiryId]);

  // Total Event Days
  const eventDays = useMemo(() => {
    if (!inquiry) return 1;
    const start = new Date(inquiry.startDate);
    const end = new Date(inquiry.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [inquiry]);

  // Group staff for dropdowns
  const groupedStaff = useMemo(() => {
    const inHouse = staff.filter((s) => s.isActive && s.staffType === "INHOUSE");
    const external = staff.filter((s) => s.isActive && s.staffType === "EXTERNAL");
    return { inHouse, external };
  }, [staff]);

  // List of positions from quotation
  const positions: PositionRow[] = useMemo(() => {
    if (!quotation?.equipment) return [];
    try {
      // quotation.equipment is already parsed if fetched via API
      return typeof quotation.equipment === "string"
        ? JSON.parse(quotation.equipment)
        : quotation.equipment;
    } catch (e) {
      console.error("Failed to parse quotation equipment:", e);
      return [];
    }
  }, [quotation]);

  // Check if staff is duplicate in local selections
  const checkLocalDuplicate = (staffId: number, currentPositionNo: number) => {
    const existing = Object.entries(selectedStaff).find(
      ([posNo, id]) => id === staffId && parseInt(posNo, 10) !== currentPositionNo
    );
    if (existing) {
      const posNo = parseInt(existing[0], 10);
      const pos = positions.find((p) => p.no === posNo);
      return pos ? pos.position : `Position #${posNo}`;
    }
    return null;
  };

  // Handle staff selection dropdown change
  const handleSelectStaff = (positionNo: number, staffIdStr: string) => {
    const staffId = staffIdStr ? parseInt(staffIdStr, 10) : 0;
    
    if (!staffId) {
      setSelectedStaff((prev) => {
        const next = { ...prev };
        delete next[positionNo];
        return next;
      });
      return;
    }

    const targetStaff = staff.find((s) => s.id === staffId);
    if (!targetStaff) return;

    // 1. Check for overlapping conflicts from DB
    const avail = staffAvailability[staffId];
    if (avail && (avail.status === "BUSY" || avail.status === "PARTIAL")) {
      const pos = positions.find((p) => p.no === positionNo);
      setOverlapStaff(targetStaff);
      setOverlapPositionNo(positionNo);
      setOverlapPositionName(pos ? pos.position : `Position #${positionNo}`);
      setOverlapConflictsList(avail.conflicts || []);
      setShowOverlapWarning(true);
      return;
    }

    // 2. Proceed with local duplicate check
    proceedWithLocalDuplicateCheck(targetStaff, positionNo);
  };

  const proceedWithLocalDuplicateCheck = (targetStaff: Staff, positionNo: number) => {
    const duplicateInPosition = checkLocalDuplicate(targetStaff.id, positionNo);

    if (duplicateInPosition) {
      const pos = positions.find((p) => p.no === positionNo);
      setDupStaff(targetStaff);
      setDupPositionNo(positionNo);
      setDupPositionName(pos ? pos.position : `Position #${positionNo}`);
      setDupPreviousPosition(duplicateInPosition);
      setShowDupWarning(true);
    } else {
      setSelectedStaff((prev) => ({ ...prev, [positionNo]: targetStaff.id }));
    }
  };

  // Confirm Overlap Dialog click
  const handleConfirmOverlap = () => {
    if (overlapStaff && overlapPositionNo) {
      const staffMember = overlapStaff;
      const posNo = overlapPositionNo;
      setShowOverlapWarning(false);
      setOverlapStaff(null);
      setOverlapPositionNo(null);
      proceedWithLocalDuplicateCheck(staffMember, posNo);
    }
  };

  // Cancel Overlap Dialog click
  const handleCancelOverlap = () => {
    setShowOverlapWarning(false);
    setOverlapStaff(null);
    setOverlapPositionNo(null);
    setOverlapConflictsList([]);
  };

  // Confirm Duplicate Dialog click
  const handleConfirmDuplicate = () => {
    if (dupStaff && dupPositionNo) {
      setSelectedStaff((prev) => ({ ...prev, [dupPositionNo]: dupStaff.id }));
      setConfirmedDuplicates((prev) => ({ ...prev, [dupStaff.id]: true }));
    }
    setShowDupWarning(false);
    setDupStaff(null);
    setDupPositionNo(null);
  };

  // Cancel Duplicate Dialog click
  const handleCancelDuplicate = () => {
    setShowDupWarning(false);
    setDupStaff(null);
    setDupPositionNo(null);
  };

  // Unique staff assignment summary calculations
  const staffSummary = useMemo(() => {
    const summaryMap: Record<
      number,
      {
        staff: Staff;
        positionsCount: number;
        rate: number;
        total: number;
        isDuplicate: boolean;
      }
    > = {};

    Object.entries(selectedStaff).forEach(([posNo, id]) => {
      const pos = positions.find((p) => p.no === parseInt(posNo, 10));
      if (!pos) return;

      const staffMember = staff.find((s) => s.id === id);
      if (!staffMember) return;

      const rate = staffMember.paymentType === "PER_DAY" ? staffMember.ratePerDay || 0 : 0; // monthly staff rate is 0 for event days
      const total = rate * eventDays;

      if (!summaryMap[id]) {
        summaryMap[id] = {
          staff: staffMember,
          positionsCount: 1,
          rate,
          total,
          isDuplicate: false,
        };
      } else {
        summaryMap[id].positionsCount += 1;
        summaryMap[id].isDuplicate = true;
      }
    });

    return Object.values(summaryMap);
  }, [selectedStaff, positions, staff, eventDays]);

  // Grand Total Staff Cost
  const totalStaffCost = useMemo(() => {
    return staffSummary.reduce((acc, item) => acc + item.total, 0);
  }, [staffSummary]);

  // Positions metrics
  const positionsMetrics = useMemo(() => {
    const total = positions.length;
    const assigned = Object.keys(selectedStaff).length;
    const pending = total - assigned;
    return { total, assigned, pending };
  }, [positions, selectedStaff]);

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Determine deleted assignments
      const toDelete = existingAssignments.filter((ea) => {
        if (ea.positionNo === null || ea.positionNo === undefined) return false;
        // Delete if not selected anymore, if selected staff has changed, or if reporting time has changed
        const currentStaffId = selectedStaff[ea.positionNo];
        const currentTime = reportingTimes[ea.positionNo] || "09:00 AM";
        const oldTime = ea.reportingTime || "09:00 AM";
        return !currentStaffId || currentStaffId !== ea.staffId || currentTime !== oldTime;
      });

      // 2. Determine new assignments to insert
      const toCreate: {
        staffId: number;
        positionNo: number;
        positionName: string;
        ratePerDay: number;
        daysAssigned: number;
        reportingTime?: string;
      }[] = [];

      Object.entries(selectedStaff).forEach(([posNoStr, staffId]) => {
        const posNo = parseInt(posNoStr, 10);
        const pos = positions.find((p) => p.no === posNo);
        if (!pos) return;

        const reportingTime = reportingTimes[posNo] || "09:00 AM";

        // Check if an existing assignment matches both staffId and reportingTime
        const existing = existingAssignments.find(
          (ea) => ea.positionNo === posNo && ea.staffId === staffId && (ea.reportingTime || "09:00 AM") === reportingTime
        );

        if (!existing) {
          const staffMember = staff.find((s) => s.id === staffId);
          const rate = staffMember?.paymentType === "PER_DAY" ? staffMember.ratePerDay || 0 : 0;

          toCreate.push({
            staffId,
            positionNo: posNo,
            positionName: pos.position,
            ratePerDay: rate,
            daysAssigned: eventDays,
            reportingTime,
          });
        }
      });

      // 3. Run deletions
      for (const d of toDelete) {
        await api.deleteStaffAssignment(d.id);
      }

      // 4. Run insertions
      for (const c of toCreate) {
        const newAssignment = await api.createStaffAssignment({
          inquiryId,
          staffId: c.staffId,
          positionNo: c.positionNo,
          positionName: c.positionName,
          ratePerDay: c.ratePerDay,
          daysAssigned: c.daysAssigned,
          reportingTime: c.reportingTime || "09:00 AM",
        });

        // If duplicate is confirmed locally, confirm duplicate in DB as well
        if (confirmedDuplicates[c.staffId] && newAssignment.isDuplicate) {
          await api.confirmDuplicateAssignment(newAssignment.id);
        }
      }

      await refreshStaff();
      router.push(`/warehouse/check?inquiryId=${inquiryId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save assignments");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenFrame breadcrumb="Staff › Assignments › Loading...">
        <LoadingSkeleton rows={6} message="Loading quotation and staff data..." />
      </ScreenFrame>
    );
  }

  if (!inquiry || !quotation) {
    return (
      <ScreenFrame breadcrumb="Staff › Assignments › Error">
        <div className="text-center py-12 text-tx3">Quotation details not found for this inquiry.</div>
      </ScreenFrame>
    );
  }

  return (
    <>
      <SectionHeader
        title={<>Operator <strong>Assignments</strong></>}
        description={`Allocate positions and staff operators for ${inquiry.eventName || inquiry.eventType}. Handles duplicate validation and tracks total crew costs.`}
      />

      <ScreenFrame
        breadcrumb={`Quotations › ${quotation.quoteNo || "Draft"} › Assignments`}
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <Link href={`/inquiries/${inquiryId}`} className="btn">← Back to inquiry</Link>
            <Link href={`/warehouse/check?inquiryId=${inquiryId}`} className="btn">Warehouse</Link>
            <Link
              href={`/staff/new?type=EXTERNAL&redirect=/staff/assign?inquiryId=${inquiryId}`}
              className="btn btn-warning"
            >
              + Add External Staff
            </Link>
            <button
              onClick={handleSave}
              className="btn btn-success"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Assignments ↗"}
            </button>
          </div>
        }
      >
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
              Event Info
            </div>
            <strong style={{ color: "var(--tx)", display: "block" }}>{quotation.eventName || inquiry.eventType}</strong>
            <div style={{ color: "var(--tx3)", fontSize: "11px" }}>Client: {quotation.clientName}</div>
            <div style={{ color: "var(--tx2)", fontSize: "11.5px", marginTop: "2px" }}>
              {new Date(inquiry.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - {new Date(inquiry.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </div>
            <div style={{ color: "var(--bl)", fontWeight: 500 }}>{eventDays} Days</div>

            <div style={{ height: "1px", background: "var(--b1)", margin: "10px 0" }} />

            <div style={{ padding: "0 0 4px", fontSize: "9px", color: "var(--tx3)", letterSpacing: ".1em", textTransform: "uppercase" }}>
              Summary
            </div>
            <div style={{ color: "var(--tx2)" }}>Total Positions: {positionsMetrics.total}</div>
            <div style={{ color: "var(--gr)", fontWeight: 500 }}>Assigned: {positionsMetrics.assigned}</div>
            <div style={{ color: "var(--acc)", fontWeight: 500 }}>Pending: {positionsMetrics.pending}</div>

            <div style={{ height: "1px", background: "var(--b1)", margin: "10px 0" }} />

            <div style={{ padding: "0 0 4px", fontSize: "9px", color: "var(--tx3)", letterSpacing: ".1em", textTransform: "uppercase" }}>
              Staff Cost
            </div>
            <div style={{ fontSize: "10.5px", color: "var(--tx3)", marginBottom: "2px" }}>Total ({eventDays} days)</div>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--bl)", fontFamily: "var(--font-mono)" }}>
              ₹{totalStaffCost.toLocaleString("en-IN")}
            </div>
          </div>

          {/* Main Grid Content */}
          <div style={{ flex: 1, padding: "16px", background: "var(--cnt-bg)", minHeight: "480px" }}>
            
            {/* Overlap Assignment Warning Card */}
            {showOverlapWarning && overlapStaff && (
              <div
                className="warn"
                style={{
                  background: "#2E1F0A",
                  border: "1px solid #4A3010",
                  borderRadius: "8px",
                  padding: "14px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div style={{ fontSize: "20px", color: "var(--acc)", lineHeight: 1 }}>⚠</div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: "13px", color: "var(--tx)", display: "block", marginBottom: "4px" }}>
                      Overlapping Booking Conflict Warning
                    </strong>
                    <div style={{ fontSize: "12px", color: "var(--tx2)", marginBottom: "10px", lineHeight: "1.5" }}>
                      <strong>{overlapStaff.name}</strong> has other confirmed booking(s) during these dates:
                      <ul style={{ listStyleType: "disc", paddingLeft: "20px", marginTop: "4px" }}>
                        {overlapConflictsList.map((c, idx) => (
                          <li key={idx}>
                            <strong>{c.eventName || "Event"}</strong> ({c.startDate} to {c.endDate})
                          </li>
                        ))}
                      </ul>
                      Do you still want to assign them to <strong>{overlapPositionName}</strong>?
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={handleConfirmOverlap} className="btn btn-success" style={{ padding: "4px 10px" }}>
                        Yes, Assign Anyway
                      </button>
                      <button onClick={handleCancelOverlap} className="btn" style={{ padding: "4px 10px" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Duplicate Assignment Warning Card */}
            {showDupWarning && dupStaff && (
              <div
                className="warn"
                style={{
                  background: "#2E1F0A",
                  border: "1px solid #4A3010",
                  borderRadius: "8px",
                  padding: "14px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div style={{ fontSize: "20px", color: "var(--acc)", lineHeight: 1 }}>⚠</div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: "13px", color: "var(--tx)", display: "block", marginBottom: "4px" }}>
                      Duplicate Assignment Confirmation
                    </strong>
                    <div style={{ fontSize: "12px", color: "var(--tx2)", marginBottom: "10px", lineHeight: "1.5" }}>
                      <strong>{dupStaff.name}</strong> is already assigned to position <strong>{dupPreviousPosition}</strong>.<br />
                      Are you sure you want to assign them to <strong>{dupPositionName}</strong> as well?
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={handleConfirmDuplicate} className="btn btn-success" style={{ padding: "4px 10px" }}>
                        Yes, Assign Both
                      </button>
                      <button onClick={handleCancelDuplicate} className="btn" style={{ padding: "4px 10px" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Positions Table */}
            <div className="card" style={{ padding: 0, border: "none" }}>
              <div className="ct" style={{ padding: "12px 14px 4px", fontSize: "13px" }}>Position-Wise Operator Selection</div>
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: "45px" }} className="tc">No.</th>
                      <th style={{ width: "150px" }}>Position</th>
                      <th style={{ width: "110px" }}>Equipment Required</th>
                      <th>Operator Select</th>
                      <th style={{ width: "110px" }}>Reporting Time</th>
                      <th style={{ width: "90px" }}>Source</th>
                      <th style={{ width: "90px" }}>With Equip.</th>
                      <th style={{ width: "90px" }} className="tr">Pay / Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos) => {
                      const staffId = selectedStaff[pos.no] || 0;
                      const staffMember = staff.find((s) => s.id === staffId);
                      const isDup = staffId ? staffSummary.find((sum) => sum.staff.id === staffId)?.isDuplicate : false;
                      const rowBg = isDup ? "#1A1000" : "transparent";

                      return (
                        <tr key={pos.no} style={{ background: rowBg }}>
                          <td className="tc" style={{ color: "var(--tx3)", fontFamily: "var(--font-mono)" }}>{pos.no}</td>
                          <td>
                            <strong style={{ color: "var(--tx)" }}>{pos.position}</strong>
                          </td>
                          <td style={{ fontSize: "11.5px" }}>{pos.equip}</td>
                          <td>
                            <select
                              className="fsel"
                              style={{
                                fontSize: "11.5px",
                                padding: "0 6px",
                                borderColor: isDup ? "var(--acc)" : "var(--b1)",
                              }}
                              value={staffId || ""}
                              onChange={(e) => handleSelectStaff(pos.no, e.target.value)}
                            >
                              <option value="">-- Select Operator --</option>
                              <optgroup label="In-house Staff">
                                {groupedStaff.inHouse.map((s) => {
                                  const avail = staffAvailability[s.id];
                                  const statusStr = avail && avail.status !== "FREE" ? ` [${avail.status}]` : "";
                                  return (
                                    <option key={s.id} value={s.id}>
                                      {s.name} ({s.role}){statusStr}
                                    </option>
                                  );
                                })}
                              </optgroup>
                              <optgroup label="External / Freelancers">
                                {groupedStaff.external.map((s) => {
                                  const avail = staffAvailability[s.id];
                                  const statusStr = avail && avail.status !== "FREE" ? ` [${avail.status}]` : "";
                                  return (
                                    <option key={s.id} value={s.id}>
                                      {s.name} ({s.role}) {s.withEquipment ? " [Gear Fallback]" : ""}{statusStr}
                                    </option>
                                  );
                                })}
                              </optgroup>
                            </select>
                          </td>
                          <td>
                            {staffId ? (
                              <input
                                type="text"
                                className="finp font-mono"
                                style={{
                                  fontSize: "11.5px",
                                  padding: "2px 6px",
                                  width: "90px",
                                }}
                                placeholder="09:00 AM"
                                value={reportingTimes[pos.no] || "09:00 AM"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setReportingTimes((prev) => ({ ...prev, [pos.no]: val }));
                                }}
                              />
                            ) : (
                              <span style={{ color: "var(--tx3)" }}>--</span>
                            )}
                          </td>
                          <td>
                            {staffMember ? (
                              <Badge variant={staffMember.staffType === "INHOUSE" ? "gr" : "am"}>
                                {staffMember.staffType === "INHOUSE" ? "In-house" : "External"}
                              </Badge>
                            ) : (
                              <span style={{ color: "var(--tx3)" }}>--</span>
                            )}
                          </td>
                          <td>
                            {staffMember?.withEquipment ? (
                              <Badge variant="bl">
                                {staffMember.equipmentDesc ? `+${staffMember.equipmentDesc.split(",")[0]}` : "Yes"}
                              </Badge>
                            ) : staffMember ? (
                              <span style={{ color: "var(--tx3)", fontSize: "11.5px" }}>No</span>
                            ) : (
                              <span style={{ color: "var(--tx3)" }}>--</span>
                            )}
                          </td>
                          <td className="tr">
                            {isDup ? (
                              <span style={{ color: "var(--acc)", fontWeight: 500 }}>Duplicate!</span>
                            ) : staffMember ? (
                              <span style={{ color: "var(--gr)", fontFamily: "var(--font-mono)", fontSize: "11.5px" }}>
                                {staffMember.paymentType === "PER_DAY"
                                  ? `₹${(staffMember.ratePerDay || 0).toLocaleString("en-IN")}`
                                  : "Salary Fixed"}
                              </span>
                            ) : (
                              <span style={{ color: "var(--tx3)" }}>--</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Crew Cost Summary Table */}
            <div className="card" style={{ padding: "14px", marginTop: "16px", marginBottom: 0 }}>
              <div className="ct" style={{ fontSize: "13px" }}>Crew Cost Summary</div>
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Staff Name</th>
                      <th style={{ width: "100px" }}>Type</th>
                      <th style={{ width: "80px" }} className="tc">Positions</th>
                      <th style={{ width: "110px" }} className="tr">Rate / Day</th>
                      <th style={{ width: "130px" }} className="tr">Total ({eventDays} days)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffSummary.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-tx3" style={{ fontStyle: "italic" }}>
                          No staff operators assigned yet.
                        </td>
                      </tr>
                    ) : (
                      staffSummary.map((item) => (
                        <tr key={item.staff.id}>
                          <td>
                            <strong style={{ color: "var(--tx)" }}>{item.staff.name}</strong>
                            <div style={{ fontSize: "9.5px", color: "var(--tx3)", marginTop: "1px" }}>{item.staff.role}</div>
                          </td>
                          <td>
                            <Badge variant={item.staff.staffType === "INHOUSE" ? "gr" : "am"}>
                              {item.staff.staffType === "INHOUSE" ? "In-house" : "External"}
                            </Badge>
                          </td>
                          <td className="tc">
                            {item.isDuplicate ? (
                              <span className="bdg ba" style={{ fontSize: "10px", padding: "1px 6px" }}>
                                {item.positionsCount} !
                              </span>
                            ) : (
                              item.positionsCount
                            )}
                          </td>
                          <td className="tr" style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px" }}>
                            {item.staff.paymentType === "PER_DAY"
                              ? `₹${item.rate.toLocaleString("en-IN")}`
                              : "Salary Fixed"}
                          </td>
                          <td className="tr" style={{ fontFamily: "var(--font-mono)", fontWeight: 500, color: "var(--gr)", fontSize: "12px" }}>
                            ₹{item.total.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  textAlign: "right",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  paddingTop: "12px",
                  borderTop: "1px solid var(--b1)",
                  marginTop: "8px",
                }}
              >
                Total Crew Cost ({eventDays} days): <span style={{ color: "var(--bl)", fontFamily: "var(--font-mono)" }}>₹{totalStaffCost.toLocaleString("en-IN")}</span>
              </div>
            </div>

          </div>

        </div>
      </ScreenFrame>
    </>
  );
}
