"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import { useKits, useEquipment } from "@/lib/store";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const { kits, loading: kitsLoading, refreshKits, dispatchKits } = useKits();
  const { refreshEquipment } = useEquipment();

  // Selected dates for checking availability
  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Selected Kit
  const urlKitId = searchParams.get("kitId");
  const [selectedKitId, setSelectedKitId] = useState<number | null>(null);

  // For unassigned equipment dropdowns
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);

  // For Kit Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKitName, setNewKitName] = useState("");
  const [newKitDesc, setNewKitDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [modalEquipment, setModalEquipment] = useState<{ id: string; qty: number }[]>([{ id: "", qty: 1 }]);

  // For Add Accessory Form
  const [selectedAccessoryId, setSelectedAccessoryId] = useState("");
  const [selectedAccessoryQty, setSelectedAccessoryQty] = useState(1);
  const [addingAccessory, setAddingAccessory] = useState(false);

  // For Set Main Body Form
  const [selectedMainBodyId, setSelectedMainBodyId] = useState("");
  const [selectedMainBodyQty, setSelectedMainBodyQty] = useState(1);
  const [settingMainBody, setSettingMainBody] = useState(false);

  // Load kits when date range changes
  useEffect(() => {
    refreshKits({ startDate, endDate });
  }, [startDate, endDate, refreshKits]);

  // Handle selected kit from URL parameter
  useEffect(() => {
    if (urlKitId) {
      setSelectedKitId(parseInt(urlKitId, 10));
    } else if (kits.length > 0 && selectedKitId === null) {
      setSelectedKitId(kits[0].id);
    }
  }, [urlKitId, kits, selectedKitId]);

  // Load all equipment for dropdowns
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

  const activeKit = useMemo(() => {
    return kits.find((k) => k.id === selectedKitId);
  }, [kits, selectedKitId]);

  // Filter unassigned devices for Main Body
  const unassignedMainBodies = useMemo(() => {
    return allEquipment.filter(
      (item) =>
        !item.kitId &&
        item.category !== "ACCESSORY" &&
        item.status !== "RETIRED" &&
        !modalEquipment.some((m) => m.id === String(item.id))
    );
  }, [allEquipment, modalEquipment]);

  // Filter unassigned devices for Kit Components
  const unassignedEquipmentOptions = useMemo(() => {
    return allEquipment.filter(
      (item) =>
        !item.kitId &&
        item.status !== "RETIRED"
    );
  }, [allEquipment]);

  // Helpers for single accessory validation
  const selectedAccessory = useMemo(() => {
    if (!selectedAccessoryId) return null;
    return unassignedEquipmentOptions.find((a) => a.id === parseInt(selectedAccessoryId, 10)) || null;
  }, [unassignedEquipmentOptions, selectedAccessoryId]);

  const accessoryQtyError = useMemo(() => {
    if (!selectedAccessory) return "";
    if (selectedAccessoryQty <= 0) return "Quantity must be greater than 0";
    if (selectedAccessoryQty > selectedAccessory.quantity) {
      return `Quantity exceeds available stock (${selectedAccessory.quantity})`;
    }
    return "";
  }, [selectedAccessory, selectedAccessoryQty]);

  const selectedMainBodyItem = useMemo(() => {
    if (!selectedMainBodyId) return null;
    return unassignedMainBodies.find((item) => item.id === parseInt(selectedMainBodyId, 10)) || null;
  }, [unassignedMainBodies, selectedMainBodyId]);

  const selectedMainBodyQtyError = useMemo(() => {
    if (!selectedMainBodyItem) return "";
    if (selectedMainBodyQty <= 0) return "Quantity must be greater than 0";
    if (selectedMainBodyQty > selectedMainBodyItem.quantity) {
      return `Quantity exceeds available stock (${selectedMainBodyItem.quantity})`;
    }
    return "";
  }, [selectedMainBodyItem, selectedMainBodyQty]);

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

  // Handlers
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
      // Select the new kit
      if (result?.id) {
        setSelectedKitId(result.id);
      }
      loadDropdownEquipment();
      refreshEquipment();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create kit");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKit = async (kitId: number) => {
    if (!confirm("Are you sure you want to delete this kit? Accessories will be unlinked but kept in inventory.")) {
      return;
    }
    try {
      await dispatchKits({ type: "DELETE_KIT", payload: kitId });
      setSelectedKitId(kits.find((k) => k.id !== kitId)?.id || null);
      loadDropdownEquipment();
      refreshEquipment();
    } catch (err: any) {
      alert(err.message || "Failed to delete kit");
    }
  };

  const handleAddAccessory = async () => {
    if (!selectedKitId || !selectedAccessoryId || accessoryQtyError) return;
    try {
      setAddingAccessory(true);
      await dispatchKits({
        type: "ADD_ITEM",
        payload: {
          kitId: selectedKitId,
          equipmentId: parseInt(selectedAccessoryId, 10),
          quantity: selectedAccessoryQty,
        },
      });
      setSelectedAccessoryId("");
      setSelectedAccessoryQty(1);
      loadDropdownEquipment();
      refreshEquipment();
    } catch (err: any) {
      alert(err.message || "Failed to add accessory");
    } finally {
      setAddingAccessory(false);
    }
  };

  const handleRemoveAccessory = async (equipmentId: number) => {
    if (!selectedKitId) return;
    if (!confirm("Are you sure you want to remove this accessory from the kit?")) return;
    try {
      await dispatchKits({
        type: "REMOVE_ITEM",
        payload: {
          kitId: selectedKitId,
          equipmentId,
        },
      });
      loadDropdownEquipment();
      refreshEquipment();
    } catch (err: any) {
      alert(err.message || "Failed to remove accessory");
    }
  };

  const handleSetMainBody = async () => {
    if (!selectedKitId || !selectedMainBodyId || selectedMainBodyQtyError) return;
    try {
      setSettingMainBody(true);
      await dispatchKits({
        type: "UPDATE_KIT",
        payload: {
          id: selectedKitId,
          mainBodyId: parseInt(selectedMainBodyId, 10),
          mainBodyQty: selectedMainBodyQty,
        },
      });
      setSelectedMainBodyId("");
      setSelectedMainBodyQty(1);
      loadDropdownEquipment();
      refreshEquipment();
    } catch (err: any) {
      alert(err.message || "Failed to set main body");
    } finally {
      setSettingMainBody(false);
    }
  };

  const handleRemoveMainBody = async () => {
    if (!selectedKitId || !activeKit?.mainBodyId) return;
    if (!confirm("Are you sure you want to remove the main body from this kit?")) return;
    try {
      setSettingMainBody(true);
      await dispatchKits({
        type: "UPDATE_KIT",
        payload: {
          id: selectedKitId,
          mainBodyId: null,
        },
      });
      loadDropdownEquipment();
      refreshEquipment();
    } catch (err: any) {
      alert(err.message || "Failed to remove main body");
    } finally {
      setSettingMainBody(false);
    }
  };

  // Helper styles/classes
  const getAvailabilityBadgeVariant = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "gr";
      case "PARTIAL": return "am";
      case "UNAVAILABLE": return "rd";
      default: return "gy";
    }
  };

  const getEquipmentStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "gr";
      case "IN_USE": return "bl";
      case "MAINTENANCE": return "am";
      case "SOLD": return "gy";
      case "RETIRED": return "rd";
      default: return "gy";
    }
  };

  const getKitMainBodyName = (kit: Kit) => {
    const mainBody = kit.items?.find((item) => item.id === kit.mainBodyId);
    return mainBody ? mainBody.productName : "No main body";
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
        breadcrumb="Kit List & Configuration"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => {
            setNewKitName("");
            setNewKitDesc("");
            setModalEquipment([{ id: "", qty: 1 }]);
            setCreateError("");
            setShowCreateModal(true);
          }}>
            + Create New Kit
          </button>
        }
      >
        <div className="two-col" style={{ gridTemplateColumns: "260px 1fr" }}>
          {/* Left Column: Kits Sidebar */}
          <aside className="sf" style={{ background: "var(--alt2)", borderRight: "1px solid var(--b1)", alignSelf: "start" }}>
            <div className="tb" style={{ padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: "var(--tx3)" }}>
              KITS IN STOCK ({kits.length})
            </div>
            {kitsLoading ? (
              <div style={{ padding: "15px" }}>
                <LoadingSkeleton rows={4} message="Fetching kits..." />
              </div>
            ) : (
              <div style={{ padding: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {kits.length === 0 ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--tx3)", fontSize: "12px" }}>
                    No kits defined. Click '+ Create New Kit' to build one.
                  </div>
                ) : (
                  kits.map((kit) => {
                    const isActive = kit.id === selectedKitId;
                    const totalValue = getKitTotalValue(kit);
                    const mainBodyName = getKitMainBodyName(kit);
                    const availability = kit.availabilityStatus || "AVAILABLE";

                    return (
                      <button
                        key={kit.id}
                        onClick={() => setSelectedKitId(kit.id)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "10px",
                          borderRadius: "6px",
                          background: isActive ? "var(--sidebar-active)" : "transparent",
                          color: isActive ? "var(--tx)" : "var(--tx2)",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                          marginBottom: "2px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                          <span style={{ fontWeight: isActive ? 600 : 500, fontSize: "12.5px" }}>{kit.name}</span>
                          <Badge variant={getAvailabilityBadgeVariant(availability)}>
                            {availability}
                          </Badge>
                        </div>
                        <div style={{ fontSize: "10.5px", color: "var(--tx3)" }}>
                          {mainBodyName}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--tx3)", marginTop: "2px" }}>
                          <span>{kit.items?.length || 0} items</span>
                          <span>₹{totalValue.toLocaleString("en-IN")}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </aside>

          {/* Right Column: Kit Detail & Edit Panel */}
          <div>
            {!activeKit ? (
              <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "350px", color: "var(--tx3)" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "48px", marginBottom: "10px", opacity: 0.3 }}>⧉</div>
                  <div>Select a kit from the sidebar or click '+ Create New Kit' to get started.</div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Kit Header info */}
                <div className="card" style={{ padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--tx)", wordBreak: "break-word", overflowWrap: "break-word" }}>{activeKit.name}</h3>
                      <p style={{ margin: "5px 0 0 0", fontSize: "12px", color: "var(--tx2)", wordBreak: "break-word", overflowWrap: "break-word" }}>
                        {activeKit.description || "No description provided."}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn text-rd"
                      style={{ fontSize: "11px", padding: "4px 8px" }}
                      onClick={() => handleDeleteKit(activeKit.id)}
                    >
                      ✕ Delete Kit
                    </button>
                  </div>

                  <hr style={{ border: 0, borderTop: "1px solid var(--b1)", margin: "15px 0" }} />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: "15px" }}>
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--tx3)" }}>Kit Value Valuation</span>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--gr)", marginTop: "4px" }}>
                        ₹{getKitTotalValue(activeKit).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--tx3)" }}>Total Included Items</span>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--tx)", marginTop: "4px" }}>
                        {activeKit.items?.length || 0} item(s)
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--tx3)" }}>Live Status ({startDate} to {endDate})</span>
                      <div style={{ marginTop: "4px" }}>
                        <Badge variant={getAvailabilityBadgeVariant(activeKit.availabilityStatus || "AVAILABLE")}>
                          {activeKit.availabilityStatus || "AVAILABLE"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Body Section */}
                <div className="card">
                  <div className="card-t">Main Body Component</div>
                  {activeKit.mainBodyId ? (
                    (() => {
                      const mainBody = activeKit.items?.find((i) => i.id === activeKit.mainBodyId);
                      return mainBody ? (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: "13px" }}>{mainBody.productName}</div>
                            <div style={{ fontSize: "10.5px", color: "var(--tx3)", marginTop: "4px" }}>
                              Serial Number: <span style={{ fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{mainBody.serialNumber || "—"}</span> |
                              Status: <Badge variant={getEquipmentStatusBadgeVariant(mainBody.status)}>{mainBody.status}</Badge>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn text-rd"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={handleRemoveMainBody}
                            disabled={settingMainBody}
                          >
                            Unlink Main Body
                          </button>
                        </div>
                      ) : (
                        <div style={{ color: "var(--rd)", fontSize: "12px" }}>Main body linked but item not found.</div>
                      );
                    })()
                  ) : (
                    <div>
                      <div style={{ color: "var(--am)", fontSize: "12px", marginBottom: "12px", background: "var(--sem-am-bg)", border: "1px solid var(--sem-am-bdr)", borderRadius: "6px", padding: "8px" }}>
                        ⚠️ Warning: No main body (e.g. Camera or Mixer) linked to this kit. A kit requires a main body to track correctly.
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                          <select
                            className="fsel"
                            style={{ flex: 1 }}
                            value={selectedMainBodyId}
                            onChange={(e) => {
                              setSelectedMainBodyId(e.target.value);
                              setSelectedMainBodyQty(1);
                            }}
                            disabled={settingMainBody || equipmentLoading}
                          >
                            <option value="">-- Select Unassigned Main Body (Camera / Mixer / etc.) --</option>
                            {unassignedMainBodies.map((item) => (
                              <option key={item.id} value={item.id}>
                                [{item.category}] {item.productName} (S/N: {formatSerialNumber(item.serialNumber)}) [Available: {item.quantity}]
                              </option>
                            ))}
                          </select>
                          {selectedMainBodyId && (
                            <div style={{ width: "80px" }}>
                              <input
                                type="number"
                                min={1}
                                className="finp"
                                style={{ width: "100%" }}
                                value={selectedMainBodyQty}
                                onChange={(e) => setSelectedMainBodyQty(parseInt(e.target.value, 10) || 0)}
                                disabled={settingMainBody}
                                placeholder="Qty"
                              />
                            </div>
                          )}
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSetMainBody}
                            disabled={!selectedMainBodyId || settingMainBody || !!selectedMainBodyQtyError}
                          >
                            {settingMainBody ? "Linking..." : "Set Main Body"}
                          </button>
                        </div>
                        {selectedMainBodyQtyError && (
                          <div style={{ color: "var(--rd)", fontSize: "11px" }}>
                            ⚠️ {selectedMainBodyQtyError}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Accessories Section */}
                <div className="card">
                  <div className="card-t">Linked Equipment ({activeKit.items?.filter((i) => i.id !== activeKit.mainBodyId).length || 0})</div>
                  <table className="tbl" style={{ marginBottom: "15px" }}>
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th style={{ width: "120px" }}>Category</th>
                        <th style={{ width: "140px" }}>Serial Number</th>
                        <th style={{ width: "110px" }}>Status</th>
                        <th style={{ width: "80px" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!activeKit.items || activeKit.items.filter((i) => i.id !== activeKit.mainBodyId).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-tx3" style={{ fontStyle: "italic" }}>
                            No additional equipment linked to this kit.
                          </td>
                        </tr>
                      ) : (
                        activeKit.items
                          .filter((i) => i.id !== activeKit.mainBodyId)
                          .map((item) => (
                            <tr key={item.id}>
                              <td>{item.productName}</td>
                              <td>{item.category.replace(/_/g, " ")}</td>
                              <td className="font-mono text-[11px]" style={{ wordBreak: "break-all" }}>{item.serialNumber || "—"}</td>
                              <td>
                                <Badge variant={getEquipmentStatusBadgeVariant(item.status)}>{item.status}</Badge>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn text-rd"
                                  style={{ padding: "2px 6px", fontSize: "10.5px" }}
                                  onClick={() => handleRemoveAccessory(item.id)}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>

                  {/* Add Accessory Form */}
                  <div style={{ borderTop: "1px solid var(--b1)", paddingTop: "15px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--tx3)", marginBottom: "6px" }}>ADD EQUIPMENT TO KIT</div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        <select
                          className="fsel"
                          style={{ width: "100%" }}
                          value={selectedAccessoryId}
                          onChange={(e) => {
                            setSelectedAccessoryId(e.target.value);
                            setSelectedAccessoryQty(1);
                          }}
                          disabled={addingAccessory || equipmentLoading}
                        >
                          <option value="">-- Select Equipment (Lens, Cables, Batteries, etc.) --</option>
                          {unassignedEquipmentOptions.map((item) => (
                             <option key={item.id} value={item.id}>
                               {item.productName} (S/N: {formatSerialNumber(item.serialNumber)}) [Available: {item.quantity}]
                             </option>
                           ))}
                        </select>
                      </div>
                      <div style={{ width: "80px", display: "flex", flexDirection: "column" }}>
                        <input
                          type="number"
                          min={1}
                          className="finp"
                          style={{ width: "100%" }}
                          value={selectedAccessoryQty}
                          onChange={(e) => setSelectedAccessoryQty(parseInt(e.target.value, 10) || 0)}
                          disabled={addingAccessory || !selectedAccessoryId}
                          placeholder="Qty"
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleAddAccessory}
                        disabled={!selectedAccessoryId || addingAccessory || !!accessoryQtyError}
                      >
                        {addingAccessory ? "Adding..." : "Add Equipment"}
                      </button>
                    </div>
                    {accessoryQtyError && (
                      <div style={{ color: "var(--rd)", fontSize: "11px", marginTop: "6px" }}>
                        ⚠️ {accessoryQtyError}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScreenFrame>

      {/* Create Kit Modal */}
      {showCreateModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "var(--modal-overlay)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1000, padding: "20px"
        }}>
          <div className="sf" style={{ width: "100%", maxWidth: "500px", background: "var(--s1)" }}>
            <div className="tb">
              <span style={{ fontWeight: 600, color: "var(--tx)" }}>Create New Equipment Kit</span>
              <button className="btn" style={{ padding: "4px 8px" }} type="button" onClick={() => {
                setShowCreateModal(false);
                setModalEquipment([{ id: "", qty: 1 }]);
              }}>✕</button>
            </div>
            <form onSubmit={handleCreateKit} style={{ padding: "20px" }}>
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
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--tx3)" }}>Additional Equipment (Optional)</div>
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
                      No additional equipment added yet. Click '+ Add Equipment' to add.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {modalEquipment.map((eq, index) => {
                        const err = modalEquipmentErrors[index];
                        return (
                          <div key={index} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <select
                                className="fsel"
                                style={{ flex: 1 }}
                                value={eq.id}
                                onChange={(e) => {
                                  const updated = [...modalEquipment];
                                  updated[index].id = e.target.value;
                                  updated[index].qty = 1;
                                  setModalEquipment(updated);
                                }}
                                disabled={creating}
                              >
                                <option value="">-- Select Equipment --</option>
                                {unassignedEquipmentOptions
                                  .filter((item) => {
                                    const isSelectedElsewhere = modalEquipment.some((itemEq, idx) => idx !== index && itemEq.id === String(item.id));
                                    return !isSelectedElsewhere;
                                  })
                                  .map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.productName} (S/N: {formatSerialNumber(item.serialNumber)}) [Avail: {item.quantity}]
                                    </option>
                                  ))}
                              </select>

                              <input
                                type="number"
                                min={1}
                                className="finp"
                                style={{ width: "65px" }}
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
                                className="btn text-rd"
                                style={{ padding: "4px 8px" }}
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
                              <div style={{ color: "var(--rd)", fontSize: "10.5px", paddingLeft: "4px" }}>
                                ⚠️ {err}
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
