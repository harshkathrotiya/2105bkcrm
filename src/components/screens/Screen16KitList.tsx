"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, X, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import LoadingSkeleton, { ShimmerBar } from "../ui/LoadingSkeleton";
import SearchableSelect from "../ui/SearchableSelect";
import { useKits, useEquipment } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import * as api from "@/lib/api";
import type { Equipment, Kit } from "@/lib/types";

function formatSerialNumber(sn: string | null | undefined): string {
  if (!sn) return "None";
  const clean = sn.replace(/\s+/g, " ").trim();
  if (clean.length > 25) {
    return clean.substring(0, 22) + "...";
  }
  return clean;
}

export default function Screen16KitList() {
  const router = useRouter();
  const { can } = useCurrentUser();
  const canEdit = can("kits.edit");
  const { kits, loading: kitsLoading, refreshKits, dispatchKits } = useKits();
  const { refreshEquipment } = useEquipment();

  // Selected dates for checking availability
  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // For unassigned equipment dropdowns in creation modal
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);

  // For Kit Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKitName, setNewKitName] = useState("");
  const [newKitDesc, setNewKitDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [modalEquipment, setModalEquipment] = useState<{ id: string; qty: number }[]>([{ id: "", qty: 1 }]);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Reset pagination when search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  // Filter kits by search query
  const filteredKits = useMemo(() => {
    if (!searchQuery.trim()) return kits;
    const q = searchQuery.toLowerCase();
    return kits.filter((kit) => kit.name.toLowerCase().includes(q));
  }, [kits, searchQuery]);

  // Paginate filtered kits
  const totalPages = Math.max(1, Math.ceil(filteredKits.length / ITEMS_PER_PAGE));
  const paginatedKits = filteredKits.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Load kits when date range changes
  useEffect(() => {
    refreshKits({ startDate, endDate });
  }, [startDate, endDate, refreshKits]);

  // Load all equipment for creation dropdowns
  const loadDropdownEquipment = async () => {
    try {
      setEquipmentLoading(true);
      const res = await api.fetchEquipment({ limit: 500 });
      setAllEquipment(res.items);
    } catch (err) {
      console.error("Failed to load dropdown equipment:", err);
    } finally {
      setEquipmentLoading(false);
    }
  };

  useEffect(() => {
    loadDropdownEquipment();
  }, []);

  // Filter unassigned devices for Kit Components in creation modal
  const unassignedEquipmentOptions = useMemo(() => {
    return allEquipment.filter(
      (item) =>
        !item.kitId &&
        item.status !== "RETIRED"
    );
  }, [allEquipment]);

  // Validation for modal equipment
  const modalEquipmentErrors = useMemo(() => {
    const errors: string[] = [];
    const equipmentTotals: Record<string, number> = {};

    modalEquipment.forEach((item) => {
      if (item.id) {
        equipmentTotals[item.id] = (equipmentTotals[item.id] || 0) + item.qty;
      }
    });

    modalEquipment.forEach((item, index) => {
      if (!item.id) {
        errors[index] = "";
        return;
      }

      const dbItem = unassignedEquipmentOptions.find((a) => a.id === parseInt(item.id, 10));
      if (!dbItem) {
        errors[index] = "Selected item not found";
        return;
      }

      if (item.qty <= 0) {
        errors[index] = "Quantity must be greater than 0";
        return;
      }

      const totalSelected = equipmentTotals[item.id];
      if (dbItem.quantity < totalSelected) {
        if (modalEquipment.filter((a) => a.id === item.id).length > 1) {
          errors[index] = `Combined quantity (${totalSelected}) exceeds available stock (${dbItem.quantity})`;
        } else {
          errors[index] = `Quantity exceeds available stock (${dbItem.quantity})`;
        }
      } else {
        errors[index] = "";
      }
    });

    return errors;
  }, [modalEquipment, unassignedEquipmentOptions]);

  const hasModalEquipmentError = useMemo(() => {
    return modalEquipmentErrors.some((err) => !!err);
  }, [modalEquipmentErrors]);

  const handleCreateKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKitName.trim()) {
      setCreateError("Kit name is required");
      return;
    }
    if (modalEquipment.length > 0 && hasModalEquipmentError) {
      setCreateError("Please resolve equipment validation errors first.");
      return;
    }
    try {
      setCreating(true);
      setCreateError("");

      const accessoriesPayload = modalEquipment
        .filter((item) => item.id)
        .map((item) => ({
          id: parseInt(item.id, 10),
          quantity: item.qty,
        }));

      const result = await dispatchKits({
        type: "ADD_KIT",
        payload: {
          name: newKitName.trim(),
          description: newKitDesc.trim() || null,
          mainBodyId: null,
          mainBodyQty: null,
          accessories: accessoriesPayload,
        },
      });
      setShowCreateModal(false);
      setNewKitName("");
      setNewKitDesc("");
      setModalEquipment([{ id: "", qty: 1 }]);
      
      loadDropdownEquipment();
      refreshEquipment();

      // Redirect to the newly created kit's details page
      if (result?.id) {
        router.push(`/kits/${result.id}`);
      }
    } catch (err: any) {
      setCreateError(err.message || "Failed to create kit");
    } finally {
      setCreating(false);
    }
  };

  const getAvailabilityBadgeVariant = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "gr";
      case "PARTIAL": return "am";
      case "UNAVAILABLE": return "rd";
      default: return "gy";
    }
  };

  const getKitMainBodyName = (kit: Kit) => {
    const mainBody = kit.items?.find((item) => item.id === kit.mainBodyId);
    return mainBody ? mainBody.productName : "—";
  };

  const getKitTotalValue = (kit: Kit) => {
    if (!kit.items) return 0;
    return kit.items.reduce((sum, item) => sum + (item.purchasePrice || 0) * (item.quantity || 1), 0);
  };

  return (
    <>
      <SectionHeader
        title={<>Kit <strong>Management</strong></>}
        description="Bundle equipment main bodies and accessories into logical, trackable production kits and monitor their booking availability."
      />

      {/* Date Availability Checker Bar */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <strong style={{ fontSize: "13px", color: "var(--tx)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Check Kit Availability for Date Range:
            </strong>
            <div style={{ fontSize: "11px", color: "var(--tx3)", marginTop: "2px" }}>Displays live status of kit components for the chosen dates.</div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11.5px", color: "var(--tx2)" }}>From:</span>
              <input
                type="date"
                className="finp"
                style={{ padding: "4px 8px", width: "135px" }}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) setEndDate(e.target.value);
                }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11.5px", color: "var(--tx2)" }}>To:</span>
              <input
                type="date"
                className="finp"
                style={{ padding: "4px 8px", width: "135px" }}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (e.target.value < startDate) setStartDate(e.target.value);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <ScreenFrame
        breadcrumbs={[{ label: "Kits" }]}
        actions={
          canEdit ? (
            <button type="button" className="btn btn-primary" onClick={() => {
              setNewKitName("");
              setNewKitDesc("");
              setModalEquipment([{ id: "", qty: 1 }]);
              setCreateError("");
              setShowCreateModal(true);
            }}>
              + Create New Kit
            </button>
          ) : null
        }
      >
        <div className="card !p-3">
          {/* Search box */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Search kits by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="finp"
              style={{ width: "100%", maxWidth: "400px" }}
            />
          </div>

          {kitsLoading ? (
            <>
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Kit Name</th>
                      <th>Main Body Component</th>
                      <th style={{ width: "120px" }}>Included Items</th>
                      <th style={{ width: "150px" }}>Total Valuation</th>
                      <th style={{ width: "140px" }}>Live Status</th>
                      <th style={{ width: "100px", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 6 }).map((_, ri) => (
                      <tr key={ri} style={{ cursor: "default" }}>
                        <td>
                          <ShimmerBar width="140px" height="13px" style={{ animationDelay: `${ri * 60 + 100}ms` }} />
                        </td>
                        <td>
                          <ShimmerBar width="180px" height="13px" style={{ animationDelay: `${ri * 60 + 120}ms` }} />
                        </td>
                        <td>
                          <ShimmerBar width="60px" height="11px" style={{ animationDelay: `${ri * 60 + 140}ms` }} />
                        </td>
                        <td>
                          <ShimmerBar width="70px" height="11px" style={{ animationDelay: `${ri * 60 + 150}ms` }} />
                        </td>
                        <td>
                          <ShimmerBar width="70px" height="18px" radius="9999px" style={{ animationDelay: `${ri * 60 + 160}ms` }} />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="flex justify-end">
                            <ShimmerBar width="65px" height="26px" radius="8px" style={{ animationDelay: `${ri * 60 + 175}ms` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Loading State */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
                <ShimmerBar width="120px" height="12px" style={{ opacity: 0.6 }} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <ShimmerBar width="32px" height="32px" radius="6px" />
                  <ShimmerBar width="32px" height="32px" radius="6px" />
                  <ShimmerBar width="32px" height="32px" radius="6px" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="tbl-scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Kit Name</th>
                    <th>Main Body Component</th>
                    <th style={{ width: "120px" }}>Included Items</th>
                    <th style={{ width: "150px" }}>Total Valuation</th>
                    <th style={{ width: "140px" }}>Live Status</th>
                    <th style={{ width: "100px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-tx3">
                        {searchQuery ? "No kits match your search." : "No kits defined. Click '+ Create New Kit' to build one."}
                      </td>
                    </tr>
                  ) : (
                    paginatedKits.map((kit) => {
                      const totalValue = getKitTotalValue(kit);
                      const mainBodyName = getKitMainBodyName(kit);
                      const availability = kit.availabilityStatus || "AVAILABLE";

                      return (
                        <tr
                          key={kit.id}
                          onClick={() => router.push(`/kits/${kit.id}`)}
                          className="cursor-pointer"
                        >
                          <td className="font-medium text-tx hover:text-bl transition-colors">
                            {kit.name}
                          </td>
                          <td className="text-tx2">
                            {mainBodyName}
                          </td>
                          <td className="text-tx2">
                            {kit.items?.length || 0} item(s)
                          </td>
                          <td className="font-mono font-medium text-gr">
                            ₹{totalValue.toLocaleString("en-IN")}
                          </td>
                          <td>
                            <Badge variant={getAvailabilityBadgeVariant(availability)}>
                              {availability}
                            </Badge>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <Link href={`/kits/${kit.id}`} className="btn" onClick={(e) => e.stopPropagation()}>
                              Details <ArrowRight size={12} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              </div>

              {/* Pagination */}
              {filteredKits.length > ITEMS_PER_PAGE && (
                <div className="flex justify-between items-center text-[11px] text-tx3" style={{ paddingTop: "24px" }}>
                  <span>
                    {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filteredKits.length)} of {filteredKits.length} kits
                  </span>
                  <div className="flex gap-1">
                    <button
                      className="btn"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={13} /> Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        className={`btn ${page === i + 1 ? "btn-primary" : ""}`}
                        style={{ padding: "5px 10px" }}
                        onClick={() => setPage(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      className="btn"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScreenFrame>

      {/* Create Kit Modal */}
      {showCreateModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "var(--modal-overlay)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1000, padding: "20px", overflowY: "auto"
        }}>
          <div className="sf" style={{ width: "100%", maxWidth: "520px", background: "var(--s1)", overflow: "hidden", borderRadius: "12px" }}>
            <div className="tb">
              <span style={{ fontWeight: 600, color: "var(--tx)" }}>Create New Equipment Kit</span>
              <button className="btn" style={{ padding: "4px 8px" }} type="button" onClick={() => {
                setShowCreateModal(false);
                setModalEquipment([{ id: "", qty: 1 }]);
              }}><X size={13} /></button>
            </div>
            <form onSubmit={handleCreateKit} style={{ padding: "20px", maxHeight: "80vh", overflowY: "auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "20px" }}>
                <div className="field">
                  <div className="flbl">Kit Name *</div>
                  <input
                    type="text"
                    className="finp"
                    value={newKitName}
                    onChange={(e) => setNewKitName(e.target.value)}
                    placeholder="e.g. Sony FX6 Camera Kit A"
                    required
                    disabled={creating}
                  />
                </div>

                <div className="field">
                  <div className="flbl">Description</div>
                  <textarea
                    className="ftxt"
                    value={newKitDesc}
                    onChange={(e) => setNewKitDesc(e.target.value)}
                    placeholder="e.g. Primary cinema setup with standard zoom lens and monitor."
                    rows={2}
                    disabled={creating}
                  />
                </div>

                {/* Modal Equipment Section */}
                <div style={{ borderTop: "1px solid var(--b1)", paddingTop: "15px", marginTop: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--tx3)" }}>Equipments</div>
                    <button
                      type="button"
                      className="btn"
                      style={{ fontSize: "11px", padding: "2px 6px" }}
                      onClick={() => setModalEquipment([...modalEquipment, { id: "", qty: 1 }])}
                      disabled={creating}
                    >
                      + Add Equipment
                    </button>
                  </div>

                  {modalEquipment.length === 0 ? (
                    <div style={{ fontSize: "11px", color: "var(--tx3)", fontStyle: "italic", textAlign: "center", padding: "10px", background: "var(--alt2)", borderRadius: "4px" }}>
                      No additional equipment added yet. Click &apos;+ Add Equipment&apos; to add.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {modalEquipment.map((eq, index) => {
                        const err = modalEquipmentErrors[index];
                        return (
                          <div key={index} style={{ display: "flex", flexDirection: "column", gap: "4px", background: "var(--alt)", border: "1px solid var(--b1)", borderRadius: "8px", padding: "10px" }}>
                            <SearchableSelect
                              style={{ width: "100%" }}
                              value={eq.id}
                              onChange={(val) => {
                                const updated = [...modalEquipment];
                                updated[index].id = val;
                                updated[index].qty = 1;
                                setModalEquipment(updated);
                              }}
                              options={unassignedEquipmentOptions
                                .filter((item) => {
                                  const isSelectedElsewhere = modalEquipment.some((itemEq, idx) => idx !== index && itemEq.id === String(item.id));
                                  return !isSelectedElsewhere;
                                })
                                .map((item) => ({
                                  value: String(item.id),
                                  label: `${item.productName} (S/N: ${formatSerialNumber(item.serialNumber)}) [Avail: ${item.quantity}]`,
                                }))}
                              placeholder="-- Select Equipment --"
                              disabled={creating}
                              placement={index >= Math.max(2, modalEquipment.length - 2) ? "top" : "bottom"}
                            />
                            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                              <label style={{ fontSize: "11px", color: "var(--tx3)" }}>Qty:</label>
                              <input
                                type="number"
                                min={1}
                                className="finp"
                                style={{ width: "70px", padding: "3px 6px", fontSize: "12px" }}
                                value={eq.qty}
                                onChange={(e) => {
                                  const updated = [...modalEquipment];
                                  updated[index].qty = parseInt(e.target.value, 10) || 0;
                                  setModalEquipment(updated);
                                }}
                                disabled={creating || !eq.id}
                              />
                              <button
                                type="button"
                                className="btn"
                                style={{ padding: "3px 10px", fontSize: "11px", color: "var(--rd)", marginLeft: "auto" }}
                                onClick={() => {
                                  const updated = modalEquipment.filter((_, i) => i !== index);
                                  setModalEquipment(updated);
                                }}
                                disabled={creating}
                              >
                                Remove
                              </button>
                            </div>
                            {err && (
                              <div style={{ color: "var(--rd)", fontSize: "10.5px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <AlertTriangle size={11} /> {err}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {createError && (
                <div style={{ color: "var(--rd)", background: "var(--sem-rd-bg)", border: "1px solid var(--sem-rd-bdr)", borderRadius: "6px", padding: "10px", marginBottom: "15px", fontSize: "11.5px" }}>
                  {createError}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" className="btn" onClick={() => {
                  setShowCreateModal(false);
                  setModalEquipment([{ id: "", qty: 1 }]);
                }} disabled={creating}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating || !newKitName.trim() || hasModalEquipmentError}>
                  {creating ? "Creating..." : "Create Kit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
