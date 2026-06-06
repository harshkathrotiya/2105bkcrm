"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import * as api from "@/lib/api";
import type { EquipmentHistoryItem } from "@/lib/api";

function statusVariant(status: string) {
  switch (status) {
    case "RETURNED": return "gr";
    case "OUT": return "bl";
    case "BOOKED": return "am";
    default: return "gy";
  }
}

function sourceLabel(item: EquipmentHistoryItem): { text: string; variant: string } {
  if (item.source === "VENDOR") return { text: `Vendor: ${item.vendorName || "Outsourced"}`, variant: "am" };
  if (item.source === "STAFF") return { text: `Staff: ${item.ownerStaffName || "Staff-owned"}`, variant: "bl" };
  return { text: "In-house", variant: "gr" };
}

export default function Screen35EquipmentHistory() {
  const router = useRouter();
  const [rows, setRows] = useState<EquipmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.fetchEquipmentHistory({
          search: search || undefined,
          status: statusFilter || undefined,
        });
        if (active) setRows(data);
      } catch (err) {
        console.error("Failed to load equipment history:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    // Debounce search typing slightly
    const t = setTimeout(load, search ? 250 : 0);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [search, statusFilter]);

  return (
    <>
      <SectionHeader
        title={<>Equipment <strong>Usage History</strong></>}
        description="Every booking across all equipment — which item was used at which event, when, and by what source."
      />

      <ScreenFrame breadcrumbs={[{ label: "Equipment", href: "/equipment" }, { label: "Usage History" }]}>
        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", padding: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 280px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--tx3)" }} />
            <input
              className="finp"
              style={{ width: "100%", paddingLeft: "30px" }}
              placeholder="Search by equipment, event, client, vendor or owner…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="fsel"
            style={{ flex: "0 0 160px" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="BOOKED">Booked</option>
            <option value="OUT">Out (at event)</option>
            <option value="RETURNED">Returned</option>
          </select>
        </div>

        {loading ? (
          <LoadingSkeleton rows={8} />
        ) : (
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Event / Client</th>
                  <th style={{ width: "150px" }}>Dates</th>
                  <th style={{ width: "110px" }}>Status</th>
                  <th style={{ width: "160px" }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-tx3">
                      No equipment usage history found.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const src = sourceLabel(r);
                    return (
                      <tr
                        key={r.id}
                        className={r.equipmentId ? "cursor-pointer" : ""}
                        onClick={() => r.equipmentId && router.push(`/equipment/${r.equipmentId}`)}
                      >
                        <td>
                          <div style={{ fontWeight: 500, color: "var(--tx)" }}>{r.equipmentName}</div>
                          {r.position && (
                            <div style={{ fontSize: "10px", color: "var(--tx3)" }}>{r.position}</div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: "12px" }}>{r.eventName || r.eventType || "—"}</div>
                          <div style={{ fontSize: "10px", color: "var(--tx3)" }}>{r.clientName || ""}</div>
                        </td>
                        <td style={{ fontSize: "11.5px", fontFamily: "var(--font-mono)" }}>
                          {r.bookedFrom} → {r.bookedTo}
                        </td>
                        <td>
                          <Badge variant={statusVariant(r.status) as any}>
                            {r.status === "OUT" ? "OUT (At Event)" : r.status}
                          </Badge>
                        </td>
                        <td>
                          <Badge variant={src.variant as any}>{src.text}</Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </ScreenFrame>
    </>
  );
}
