"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Wrench } from "lucide-react";
import { useEquipment } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import { useDebounce } from "@/lib/use-debounce";

const STATUS_COLOR: Record<string, { bg: string; dot: string; text: string }> = {
  AVAILABLE:   { bg: "#F0FDF4", dot: "#22C55E", text: "#15803D" },
  IN_USE:      { bg: "#EFF6FF", dot: "#3B82F6", text: "#1D4ED8" },
  MAINTENANCE: { bg: "#FFFBEB", dot: "#F59E0B", text: "#B45309" },
  RETIRED:     { bg: "#F3F4F6", dot: "#9CA3AF", text: "#6B7280" },
};

function StatusPill({ status, inUse }: { status: string; inUse?: boolean }) {
  const key = inUse ? "IN_USE" : status;
  const c = STATUS_COLOR[key] ?? { bg: "#F3F4F6", dot: "#9CA3AF", text: "#6B7280" };
  const label = inUse ? "In Use" : status.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: c.bg, color: c.text, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 500 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

export default function DeptEquipment() {
  const { user } = useCurrentUser();
  const { equipment, loading, refreshEquipment } = useEquipment();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    refreshEquipment({ search: debouncedSearch || undefined, department: user?.department || undefined });
  }, [debouncedSearch, user?.department]);

  const deptEquipment = useMemo(() =>
    equipment.filter((e) => !user?.department || !e.department || e.department === user.department),
  [equipment, user?.department]);

  const filtered = useMemo(() => {
    return deptEquipment.filter((e) => {
      if (statusFilter === "IN_USE") return e.inUseToday;
      if (statusFilter !== "All" && e.status !== statusFilter) return false;
      return true;
    });
  }, [deptEquipment, statusFilter]);

  const counts = useMemo(() => ({
    total: deptEquipment.length,
    available: deptEquipment.filter((e) => e.status === "AVAILABLE" && !e.inUseToday).length,
    inUse: deptEquipment.filter((e) => e.inUseToday).length,
    maintenance: deptEquipment.filter((e) => e.status === "MAINTENANCE").length,
  }), [deptEquipment]);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", background: "#F4F6F9" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Equipment</h1>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total", value: counts.total, color: "#0F172A" },
          { label: "Available", value: counts.available, color: "#22C55E" },
          { label: "In Use", value: counts.inUse, color: "#3B82F6" },
          { label: "Maintenance", value: counts.maintenance, color: "#F59E0B" },
        ].map((k) => (
          <div key={k.label} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color, lineHeight: 1 }}>{loading ? "—" : k.value}</div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E8F0", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Equipment</span>
            <span style={{ fontSize: 12, color: "#64748B", background: "#F1F5F9", borderRadius: 999, padding: "2px 8px" }}>Total {filtered.length}</span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748B" }} />
              <input
                style={{ paddingLeft: 30, paddingRight: 12, height: 34, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#0F172A", background: "#FFFFFF", outline: "none", width: 200 }}
                placeholder="Search equipment"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              style={{ height: 34, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, padding: "0 10px", background: "#FFFFFF", color: "#0F172A", outline: "none" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="IN_USE">In Use</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Equipment", "Category", "Type", "Serial No.", "Status", "Action"].map((h, i) => (
                  <th key={h} style={{ padding: "11px 20px", textAlign: i === 5 ? "right" : "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0" }}>
                        <div style={{ height: 12, background: "#F1F5F9", borderRadius: 4, width: j === 0 ? "60%" : "40%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "48px 20px", textAlign: "center", color: "#64748B", fontSize: 13 }}>No equipment found.</td></tr>
              ) : (
                filtered.map((eq, idx) => (
                  <tr key={eq.id} style={{ borderBottom: idx < filtered.length - 1 ? "1px solid #E2E8F0" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Wrench size={18} color="#22C55E" />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{eq.productName}</div>
                          {eq.department && <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{eq.department}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 12, color: "#334155" }}>{eq.category || "—"}</td>
                    <td style={{ padding: "14px 20px", fontSize: 12, color: "#334155" }}>{eq.itemType === "BULK" ? `Bulk · ${eq.quantity} ${eq.quantityUnit}` : "Individual"}</td>
                    <td style={{ padding: "14px 20px", fontSize: 12, color: "#334155", fontFamily: "monospace" }}>{eq.serialNumber || "—"}</td>
                    <td style={{ padding: "14px 20px" }}><StatusPill status={eq.status} inUse={eq.inUseToday} /></td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <Link href={`/equipment/${eq.id}/edit`}>
                        <button style={{ background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Edit</button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
