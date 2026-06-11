"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Layers, X, AlertTriangle } from "lucide-react";
import SearchableSelect from "../../ui/SearchableSelect";
import { useKits, useEquipment } from "@/lib/store";
import { useDebounce } from "@/lib/use-debounce";
import * as api from "@/lib/api";
import type { Equipment } from "@/lib/types";

function formatSerialNumber(sn: string | null | undefined): string {
  if (!sn) return "None";
  const clean = sn.replace(/\s+/g, " ").trim();
  return clean.length > 25 ? clean.substring(0, 22) + "..." : clean;
}

const AVAIL_COLOR: Record<string, { bg: string; dot: string; text: string }> = {
  Available:   { bg: "#F0FDF4", dot: "#22C55E", text: "#15803D" },
  Partial:     { bg: "#FFFBEB", dot: "#F59E0B", text: "#B45309" },
  Unavailable: { bg: "#FFF1F2", dot: "#F43F5E", text: "#BE123C" },
};

function AvailPill({ status }: { status: string }) {
  const c = AVAIL_COLOR[status] ?? { bg: "#F3F4F6", dot: "#9CA3AF", text: "#6B7280" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: c.bg, color: c.text, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 500 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

export default function DeptKits() {
  const router = useRouter();
  const { kits, loading, refreshKits, dispatchKits } = useKits();
  const { refreshEquipment } = useEquipment();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKitName, setNewKitName] = useState("");
  const [newKitDesc, setNewKitDesc] = useState("");
  const [modalEquipment, setModalEquipment] = useState<{ id: string; qty: number }[]>([{ id: "", qty: 1 }]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);

  useEffect(() => {
    setEquipmentLoading(true);
    api.fetchEquipment({ limit: 500 })
      .then((res) => setAllEquipment(res.items))
      .catch(console.error)
      .finally(() => setEquipmentLoading(false));
  }, []);

  const unassignedEquipmentOptions = useMemo(
    () => allEquipment.filter((item) => !item.kitId && item.status !== "RETIRED"),
    [allEquipment]
  );

  const modalEquipmentErrors = useMemo(() => {
    return modalEquipment.map((item, index) => {
      if (!item.id) return "";
      const dbItem = unassignedEquipmentOptions.find((a) => a.id === parseInt(item.id, 10));
      if (!dbItem) return "Item not found";
      if (modalEquipment.some((a, i) => i !== index && a.id === item.id)) return "Already added";
      if (dbItem.itemType === "BULK" && item.qty < 1) return "Qty must be at least 1";
      if (dbItem.itemType === "BULK" && item.qty > dbItem.quantity) return `Exceeds stock (${dbItem.quantity})`;
      return "";
    });
  }, [modalEquipment, unassignedEquipmentOptions]);

  const hasModalEquipmentError = modalEquipmentErrors.some(Boolean);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return kits;
    const q = debouncedSearch.toLowerCase();
    return kits.filter((k) => k.name.toLowerCase().includes(q));
  }, [kits, debouncedSearch]);

  const totalItems = useMemo(() => kits.reduce((a, k) => a + (k.items?.length ?? 0), 0), [kits]);

  const openCreate = () => {
    setNewKitName(""); setNewKitDesc(""); setCreateError("");
    setModalEquipment([{ id: "", qty: 1 }]);
    setShowCreateModal(true);
  };

  const handleCreateKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKitName.trim()) { setCreateError("Kit name is required"); return; }
    if (hasModalEquipmentError) { setCreateError("Please resolve equipment errors first."); return; }
    setCreating(true); setCreateError("");
    try {
      const accessories = modalEquipment
        .filter((item) => item.id)
        .map((item) => ({ id: parseInt(item.id, 10), quantity: item.qty }));
      const result = await dispatchKits({
        type: "ADD_KIT",
        payload: { name: newKitName.trim(), description: newKitDesc.trim() || null, mainBodyId: null, mainBodyQty: null, accessories },
      });
      setShowCreateModal(false);
      refreshEquipment();
      if (result?.id) router.push(`/kits/${result.id}`);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create kit");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", background: "#F4F6F9" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Kits</h1>
        <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6, background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          <Layers size={14} /> Create New Kit
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Kits", value: kits.length, color: "#0F172A" },
          { label: "Total Items", value: totalItems, color: "#3B82F6" },
        ].map((k) => (
          <div key={k.label} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color, lineHeight: 1 }}>{loading ? "—" : k.value}</div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E8F0", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Kits</span>
            <span style={{ fontSize: 12, color: "#64748B", background: "#F1F5F9", borderRadius: 999, padding: "2px 8px" }}>Total {filtered.length}</span>
          </div>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748B" }} />
            <input
              style={{ paddingLeft: 30, paddingRight: 12, height: 34, border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#0F172A", background: "#FFFFFF", outline: "none", width: 200 }}
              placeholder="Search kits"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Kit", "Description", "Items", "Availability", "Action"].map((h, i) => (
                  <th key={h} style={{ padding: "11px 20px", textAlign: i === 4 ? "right" : "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0" }}>
                        <div style={{ height: 12, background: "#F1F5F9", borderRadius: 4, width: j === 0 ? "60%" : "40%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "48px 20px", textAlign: "center", color: "#64748B", fontSize: 13 }}>No kits found.</td></tr>
              ) : (
                filtered.map((kit, idx) => (
                  <tr key={kit.id} style={{ borderBottom: idx < filtered.length - 1 ? "1px solid #E2E8F0" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Layers size={18} color="#8B5CF6" />
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{kit.name}</div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 12, color: "#334155", maxWidth: 240 }}>
                      <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{kit.description || "—"}</span>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 12, color: "#334155" }}>{kit.items?.length ?? 0} items</td>
                    <td style={{ padding: "14px 20px" }}>
                      {kit.availabilityStatus ? <AvailPill status={kit.availabilityStatus} /> : <span style={{ color: "#CBD5E1", fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <Link href={`/kits/${kit.id}`}>
                        <button style={{ background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>View</button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Kit Modal */}
      {showCreateModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "var(--modal-overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px", overflowY: "auto" }}>
          <div className="sf" style={{ width: "100%", maxWidth: "520px", background: "var(--s1)", overflow: "hidden", borderRadius: "12px" }}>
            <div className="tb">
              <span style={{ fontWeight: 600, color: "var(--tx)" }}>Create New Equipment Kit</span>
              <button className="btn" style={{ padding: "4px 8px" }} type="button" onClick={() => setShowCreateModal(false)}><X size={13} /></button>
            </div>
            <form onSubmit={handleCreateKit} style={{ padding: "20px", maxHeight: "80vh", overflowY: "auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "20px" }}>
                <div className="field">
                  <div className="flbl">Kit Name *</div>
                  <input type="text" className="finp" value={newKitName} onChange={(e) => setNewKitName(e.target.value)} placeholder="e.g. LED Panel Kit A" required disabled={creating} />
                </div>
                <div className="field">
                  <div className="flbl">Description</div>
                  <textarea className="ftxt" value={newKitDesc} onChange={(e) => setNewKitDesc(e.target.value)} placeholder="e.g. Primary LED setup with panels and controller." rows={2} disabled={creating} />
                </div>
                <div style={{ borderTop: "1px solid var(--b1)", paddingTop: "15px", marginTop: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--tx3)" }}>Equipments</div>
                    <button type="button" className="btn" style={{ fontSize: "11px", padding: "2px 6px" }} onClick={() => setModalEquipment([...modalEquipment, { id: "", qty: 1 }])} disabled={creating}>+ Add Equipment</button>
                  </div>
                  {modalEquipment.length === 0 ? (
                    <div style={{ fontSize: "11px", color: "var(--tx3)", fontStyle: "italic", textAlign: "center", padding: "10px", background: "var(--alt2)", borderRadius: "4px" }}>No equipment added yet. Click &apos;+ Add Equipment&apos; to add.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {modalEquipment.map((eq, index) => {
                        const err = modalEquipmentErrors[index];
                        const selectedItem = eq.id ? unassignedEquipmentOptions.find((i) => i.id === parseInt(eq.id, 10)) : null;
                        return (
                          <div key={index} style={{ display: "flex", flexDirection: "column", gap: "4px", background: "var(--alt)", border: "1px solid var(--b1)", borderRadius: "8px", padding: "10px" }}>
                            <SearchableSelect
                              style={{ width: "100%" }}
                              value={eq.id}
                              onChange={(val) => { const updated = [...modalEquipment]; updated[index] = { id: val, qty: 1 }; setModalEquipment([...updated]); }}
                              options={unassignedEquipmentOptions
                                .filter((item) => !modalEquipment.some((itemEq, idx) => idx !== index && itemEq.id === String(item.id)))
                                .map((item) => ({ value: String(item.id), label: `${item.productName}${item.serialNumber ? ` (S/N: ${formatSerialNumber(item.serialNumber)})` : ""}` }))}
                              placeholder="-- Select Equipment --"
                              disabled={creating || equipmentLoading}
                              placement={index >= Math.max(2, modalEquipment.length - 2) ? "top" : "bottom"}
                            />
                            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                              {selectedItem?.itemType === "BULK" && (
                                <>
                                  <label style={{ fontSize: "11px", color: "var(--tx3)" }}>Qty:</label>
                                  <input type="number" min={1} max={selectedItem.quantity} className="finp" style={{ width: "70px", padding: "3px 6px", fontSize: "12px" }} value={eq.qty}
                                    onChange={(e) => { const updated = [...modalEquipment]; updated[index].qty = parseInt(e.target.value, 10) || 1; setModalEquipment(updated); }} disabled={creating} />
                                  <span style={{ fontSize: "10px", color: "var(--tx3)" }}>/ {selectedItem.quantity} {selectedItem.quantityUnit}</span>
                                </>
                              )}
                              <button type="button" className="btn" style={{ padding: "3px 10px", fontSize: "11px", color: "var(--rd)", marginLeft: "auto" }}
                                onClick={() => setModalEquipment(modalEquipment.filter((_, i) => i !== index))} disabled={creating}>Remove</button>
                            </div>
                            {err && <div style={{ color: "var(--rd)", fontSize: "10.5px", display: "inline-flex", alignItems: "center", gap: "4px" }}><AlertTriangle size={11} /> {err}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {createError && <div style={{ color: "var(--rd)", background: "var(--sem-rd-bg)", border: "1px solid var(--sem-rd-bdr)", borderRadius: "6px", padding: "10px", marginBottom: "15px", fontSize: "11.5px" }}>{createError}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" className="btn" onClick={() => setShowCreateModal(false)} disabled={creating}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating || !newKitName.trim() || hasModalEquipmentError}>{creating ? "Creating..." : "Create Kit"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
