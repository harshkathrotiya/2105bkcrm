"use client";

import { useState, useEffect, useMemo } from "react";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import * as api from "@/lib/api";
import type { Staff } from "@/lib/types";

interface AvailabilityStaff extends Staff {
  status: "FREE" | "PARTIAL" | "BUSY";
  conflicts: {
    eventName: string;
    startDate: string;
    endDate: string;
  }[];
}

export default function Screen26AvailabilityCheck() {
  // Initialize From Date (today) and To Date (today + 3 days)
  const [fromDate, setFromDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });

  const [roleFilter, setRoleFilter] = useState("All roles");
  const [staffList, setStaffList] = useState<AvailabilityStaff[]>([]);
  const [loading, setLoading] = useState(true);

  // Load availability
  const loadAvailability = async () => {
    setLoading(true);
    try {
      const role = roleFilter === "All roles" ? "" : roleFilter;
      const data = await api.checkStaffAvailability(fromDate, toDate, role);
      setStaffList(data as AvailabilityStaff[]);
    } catch (err) {
      console.error("Failed to fetch staff availability check:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, []);

  // Compute status aggregates
  const counts = useMemo(() => {
    const total = staffList.length;
    const free = staffList.filter((s) => s.status === "FREE").length;
    const partial = staffList.filter((s) => s.status === "PARTIAL").length;
    const busy = staffList.filter((s) => s.status === "BUSY").length;
    return { total, free, partial, busy };
  }, [staffList]);

  // Avatar initials helper
  const getAvatarInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date range helper (e.g. "10-12 May")
  const formatDateRangeText = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}-${end.getDate()} ${months[start.getMonth()]}`;
    }
    return `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]}`;
  };

  return (
    <>
      <SectionHeader
        title={<>Staff <strong>Availability Checker</strong></>}
        description="Verify crew allocations for custom date ranges, filtering by specialization roles and highlighting conflicting event deployments."
      />

      <ScreenFrame breadcrumb="Staff › Availability Check">
        <div style={{ display: "flex", border: "1px solid var(--b1)", borderRadius: "12px", overflow: "hidden", background: "var(--s1)" }}>
          
          {/* Sidebar Checking Panel */}
          <div
            style={{
              width: "190px",
              background: "var(--s2)",
              borderRight: "1px solid var(--b1)",
              padding: "12px 14px",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ padding: "0 0 2px", fontSize: "9px", color: "var(--tx3)", letterSpacing: ".1em", textTransform: "uppercase" }}>
              Check Dates
            </div>
            
            <div className="field">
              <div className="flbl">From Date</div>
              <input
                type="date"
                className="finp"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="field">
              <div className="flbl">To Date</div>
              <input
                type="date"
                className="finp"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div className="field">
              <div className="flbl">Role Filter</div>
              <select
                className="fsel"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="All roles">All roles</option>
                <option value="Videographer">Videographer</option>
                <option value="Photographer">Photographer</option>
                <option value="Crane operator">Crane operator</option>
                <option value="Drone operator">Drone operator</option>
                <option value="LED operator">LED operator</option>
                <option value="Audio operator">Audio operator</option>
                <option value="Editor">Editor</option>
                <option value="Photo editor">Photo editor</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <button
              onClick={loadAvailability}
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", height: "28px" }}
            >
              Check Availability
            </button>

            <div style={{ height: "1px", background: "var(--b1)", margin: "4px 0" }} />

            <div style={{ padding: "0 0 2px", fontSize: "9px", color: "var(--tx3)", letterSpacing: ".1em", textTransform: "uppercase" }}>
              Summary Counts
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--tx3)", lineHeight: "1.7" }}>
              <div style={{ color: "var(--gr)", fontWeight: 500 }}>Free: {counts.free}</div>
              <div style={{ color: "var(--acc)", fontWeight: 500 }}>Partial: {counts.partial}</div>
              <div style={{ color: "var(--rd)", fontWeight: 500 }}>Busy: {counts.busy}</div>
            </div>
          </div>

          {/* Main Grid Content */}
          <div style={{ flex: 1, padding: "16px", background: "var(--cnt-bg)", minHeight: "480px" }}>
            
            {/* Top metrics grids */}
            <div className="met" style={{ marginBottom: "16px" }}>
              <div className="mc">
                <div className="ml">Total Crew Check</div>
                <div className="mv">{counts.total}</div>
              </div>
              <div className="mc">
                <div className="ml">Available (Free)</div>
                <div className="mv" style={{ color: "var(--gr)" }}>{counts.free}</div>
              </div>
              <div className="mc">
                <div className="ml">Partial Overlap</div>
                <div className="mv" style={{ color: "var(--acc)" }}>{counts.partial}</div>
              </div>
              <div className="mc">
                <div className="ml">Fully Booked (Busy)</div>
                <div className="mv" style={{ color: "var(--rd)" }}>{counts.busy}</div>
              </div>
            </div>

            {/* List of cards */}
            <div className="card" style={{ border: "none", padding: 0 }}>
              <div className="ct" style={{ fontSize: "13px", marginBottom: "12px" }}>
                Staff Occupancy List: {new Date(fromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} to {new Date(toDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {loading ? (
                  <div className="text-center py-12 text-tx3">Checking availability calendar...</div>
                ) : staffList.length === 0 ? (
                  <div style={{ fontStyle: "italic", color: "var(--tx3)", textAlign: "center", padding: "20px" }}>
                    No staff profiles matching role filters.
                  </div>
                ) : (
                  staffList.map((s) => {
                    // Decide styling based on FREE / PARTIAL / BUSY
                    let cardBg = "#0F2E22";
                    let cardBorder = "1px solid #1A4A34";
                    let badgeVariant: "gr" | "am" | "rd" = "gr";

                    if (s.status === "PARTIAL") {
                      cardBg = "#2E1F0A";
                      cardBorder = "1px solid #4A3010";
                      badgeVariant = "am";
                    } else if (s.status === "BUSY") {
                      cardBg = "#2E0A0A";
                      cardBorder = "1px solid #4A1818";
                      badgeVariant = "rd";
                    }

                    return (
                      <div
                        key={s.id}
                        style={{
                          background: cardBg,
                          border: cardBorder,
                          borderRadius: "8px",
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "50%",
                              fontSize: "10.5px",
                              background: "var(--sidebar-active)",
                              color: "var(--acc)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 600,
                            }}
                          >
                            {getAvatarInitials(s.name)}
                          </div>
                          <div>
                            <strong style={{ fontSize: "12.5px", color: "var(--tx)" }}>{s.name}</strong>
                            <div style={{ fontSize: "10px", color: "var(--tx3)", marginTop: "1px" }}>
                              {s.role} • {s.staffType === "INHOUSE" ? "In-house" : "External"} • {s.paymentType === "PER_DAY" ? `₹${(s.ratePerDay || 0).toLocaleString("en-IN")}/day` : `₹${(s.monthlySalary || 0).toLocaleString("en-IN")}/month`}
                            </div>
                            
                            {/* Conflicts list */}
                            {s.status !== "FREE" && s.conflicts.map((c, idx) => (
                              <div
                                key={idx}
                                style={{
                                  fontSize: "10px",
                                  color: s.status === "BUSY" ? "var(--rd)" : "var(--acc)",
                                  marginTop: "3px",
                                }}
                              >
                                {s.status === "BUSY" ? "Busy" : "Partial"}: {c.eventName} ({formatDateRangeText(c.startDate, c.endDate)})
                              </div>
                            ))}

                            {s.status === "FREE" && (
                              <div style={{ fontSize: "10px", color: "var(--tx3)", marginTop: "3px" }}>
                                Available for assignment
                              </div>
                            )}
                          </div>
                        </div>

                        <Badge variant={badgeVariant}>
                          {s.status === "FREE" ? "Free" : s.status === "PARTIAL" ? "Partial" : "Busy"}
                        </Badge>
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
