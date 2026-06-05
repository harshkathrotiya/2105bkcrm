"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import SearchableSelect from "../ui/SearchableSelect";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import { useKits, useEquipment } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import * as api from "@/lib/api";
import type { Equipment, Kit } from "@/lib/types";

interface Screen17KitDetailProps {
  kitId: number;
}

function formatSerialNumber(sn: string | null | undefined): string {
  if (!sn) return "None";
  const clean = sn.replace(/\s+/g, " ").trim();
  if (clean.length > 25) {
    return clean.substring(0, 22) + "...";
  }
  return clean;
}

export default function Screen17KitDetail({ kitId }: Screen17KitDetailProps) {
  const router = useRouter();
  const { can } = useCurrentUser();
  // The kit DELETE API is gated by "kits.edit" (no separate kits.delete permission exists)
  const canEditKit = can("kits.edit");
  const canDeleteKit = can("kits.edit");
  const toast = useToast();
  const confirm = useConfirm();
  const { kits, loading: kitsLoading, refreshKits, dispatchKits } = useKits();
  const { refreshEquipment } = useEquipment();

  // Selected dates for checking availability
  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Dropdown equipment state
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);

  // Forms state
  const [selectedAccessoryId, setSelectedAccessoryId] = useState("");
  const [selectedAccessoryQty, setSelectedAccessoryQty] = useState(1);
  const [addingAccessory, setAddingAccessory] = useState(false);

  const [selectedMainBodyId, setSelectedMainBodyId] = useState("");
  const [selectedMainBodyQty, setSelectedMainBodyQty] = useState(1);
  const [settingMainBody, setSettingMainBody] = useState(false);

  // Load kits when date range changes
  useEffect(() => {
    refreshKits({ startDate, endDate });
  }, [startDate, endDate, refreshKits]);

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
    return kits.find((k) => k.id === kitId);
  }, [kits, kitId]);

  // Filter unassigned devices for Main Body
  const unassignedMainBodies = useMemo(() => {
    return allEquipment.filter(
      (item) =>
        !item.kitId &&
        item.category !== "ACCESSORY" &&
        item.status !== "RETIRED"
    );
  }, [allEquipment]);

  // Filter unassigned devices for Kit Components
  const unassignedEquipmentOptions = useMemo(() => {
    return allEquipment.filter(
      (item) =>
        !item.kitId &&
        item.status !== "RETIRED"
    );
  }, [allEquipment]);

  // Accessory validation
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

  // Main body validation
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

  // Handlers
  const handleDeleteKit = async () => {
    const ok = await confirm({ message: "Are you sure you want to delete this kit? Accessories will be unlinked but kept in inventory.", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try {
      await dispatchKits({ type: "DELETE_KIT", payload: kitId });
      loadDropdownEquipment();
      refreshEquipment();
      router.push("/kits");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete kit");
    }
  };

  const handleAddAccessory = async () => {
    if (!selectedAccessoryId || accessoryQtyError) return;
    try {
      setAddingAccessory(true);
      await dispatchKits({
        type: "ADD_ITEM",
        payload: {
          kitId: kitId,
          equipmentId: parseInt(selectedAccessoryId, 10),
          quantity: selectedAccessoryQty,
        },
      });
      setSelectedAccessoryId("");
      setSelectedAccessoryQty(1);
      loadDropdownEquipment();
      refreshEquipment();
    } catch (err: any) {
      toast.error(err.message || "Failed to add accessory");
    } finally {
      setAddingAccessory(false);
    }
  };

  const handleRemoveAccessory = async (equipmentId: number) => {
    const ok = await confirm({ message: "Are you sure you want to remove this accessory from the kit?", confirmLabel: "Remove", danger: true });
    if (!ok) return;
    try {
      await dispatchKits({
        type: "REMOVE_ITEM",
        payload: {
          kitId: kitId,
          equipmentId,
        },
      });
      loadDropdownEquipment();
      refreshEquipment();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove accessory");
    }
  };

  const handleSetMainBody = async () => {
    if (!selectedMainBodyId || selectedMainBodyQtyError) return;
    try {
      setSettingMainBody(true);
      await dispatchKits({
        type: "UPDATE_KIT",
        payload: {
          id: kitId,
          mainBodyId: parseInt(selectedMainBodyId, 10),
          mainBodyQty: selectedMainBodyQty,
        },
      });
      setSelectedMainBodyId("");
      setSelectedMainBodyQty(1);
      loadDropdownEquipment();
      refreshEquipment();
    } catch (err: any) {
      toast.error(err.message || "Failed to set main body");
    } finally {
      setSettingMainBody(false);
    }
  };

  const handleRemoveMainBody = async () => {
    if (!activeKit?.mainBodyId) return;
    const ok = await confirm({ message: "Are you sure you want to remove the main body from this kit?", confirmLabel: "Remove", danger: true });
    if (!ok) return;
    try {
      setSettingMainBody(true);
      await dispatchKits({
        type: "UPDATE_KIT",
        payload: {
          id: kitId,
          mainBodyId: null,
        },
      });
      loadDropdownEquipment();
      refreshEquipment();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove main body");
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

  if (kitsLoading && !activeKit) {
    return (
      <ScreenFrame breadcrumb="Kit Details" actions={<Link href="/kits" className="btn">‹ Back to Kits</Link>}>
        <div style={{ padding: "20px" }}>
          <LoadingSkeleton rows={6} />
        </div>
      </ScreenFrame>
    );
  }

  if (!activeKit) {
    return (
      <>
        <SectionHeader title={<>Kit <strong>Details</strong></>} />
        <ScreenFrame breadcrumb="Kit not found" actions={<Link href="/kits" className="btn">‹ Back to Kits List</Link>}>
          <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--tx3)" }}>
            <div style={{ fontSize: "48px", marginBottom: "15px", opacity: 0.3 }}>⚠️</div>
            <div style={{ fontSize: "14px", fontWeight: 500 }}>We couldn&apos;t find a kit with ID {kitId}.</div>
            <div style={{ marginTop: "15px" }}>
              <Link href="/kits" className="btn btn-primary">Go to Kits Directory</Link>
            </div>
          </div>
        </ScreenFrame>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        title={<>Kit: <strong>{activeKit.name}</strong></>}
        description="Configure and inspect the kit component assembly list, set the core camera body, and link complementary accessories."
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
        breadcrumb={<><Link href="/kits" className="hover:underline text-tx2">Kits</Link> › {activeKit.name}</>}
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <Link href="/kits" className="btn">
              ‹ Back to Kits
            </Link>
            {canDeleteKit && (
              <button
                type="button"
                className="btn text-rd"
                onClick={handleDeleteKit}
              >
                ✕ Delete Kit
              </button>
            )}
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Kit Stats Panel */}
          <div className="card" style={{ padding: "20px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--tx)", wordBreak: "break-all" }}>{activeKit.name}</h3>
              <p style={{ margin: "6px 0 0 0", fontSize: "12.5px", color: "var(--tx2)" }}>
                {activeKit.description || "No description provided."}
              </p>
            </div>
            
            <hr style={{ border: 0, borderTop: "1px solid var(--b1)", margin: "18px 0" }} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "15px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Kit Valuation</span>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--gr)", marginTop: "4px" }}>
                  ₹{getKitTotalValue(activeKit).toLocaleString("en-IN")}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Included Items</span>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--tx)", marginTop: "4px" }}>
                  {activeKit.items?.length || 0} item(s)
                </div>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Availability ({startDate} to {endDate})</span>
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
                      <div style={{ fontWeight: 550, fontSize: "13.5px" }}>{mainBody.productName}</div>
                      <div style={{ fontSize: "11px", color: "var(--tx3)", marginTop: "4px" }}>
                        Serial Number: <span style={{ fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{mainBody.serialNumber || "—"}</span> |
                        Status: <Badge variant={getEquipmentStatusBadgeVariant(mainBody.status)}>{mainBody.status}</Badge>
                      </div>
                    </div>
                    {canEditKit && (
                      <button
                        type="button"
                        className="btn text-rd"
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                        onClick={handleRemoveMainBody}
                        disabled={settingMainBody}
                      >
                        Unlink Main Body
                      </button>
                    )}
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
                <fieldset disabled={!canEditKit} style={{ border: "none", padding: 0, margin: 0, minInlineSize: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <SearchableSelect
                      style={{ flex: 1 }}
                      value={selectedMainBodyId}
                      onChange={(val) => {
                        setSelectedMainBodyId(val);
                        setSelectedMainBodyQty(1);
                      }}
                      options={unassignedMainBodies.map((item) => ({
                        value: String(item.id),
                        label: `[${item.category}] ${item.productName} (S/N: ${formatSerialNumber(item.serialNumber)}) [Available: ${item.quantity}]`,
                      }))}
                      placeholder="-- Select Unassigned Main Body (Camera / Mixer / etc.) --"
                      disabled={settingMainBody || equipmentLoading}
                    />
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
                </fieldset>
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
                          {canEditKit && (
                            <button
                              type="button"
                              className="btn text-rd"
                              style={{ padding: "2px 6px", fontSize: "10.5px" }}
                              onClick={() => handleRemoveAccessory(item.id)}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>

            {/* Add Accessory Form */}
            <div style={{ borderTop: "1px solid var(--b1)", paddingTop: "15px" }}>
              <fieldset disabled={!canEditKit} style={{ border: "none", padding: 0, margin: 0, minInlineSize: "auto" }}>
              <div style={{ fontSize: "11.3px", fontWeight: 600, color: "var(--tx3)", marginBottom: "6px" }}>ADD EQUIPMENT TO KIT</div>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <SearchableSelect
                    style={{ width: "100%" }}
                    value={selectedAccessoryId}
                    onChange={(val) => {
                      setSelectedAccessoryId(val);
                      setSelectedAccessoryQty(1);
                    }}
                    options={unassignedEquipmentOptions.map((item) => ({
                      value: String(item.id),
                      label: `${item.productName} (S/N: ${formatSerialNumber(item.serialNumber)}) [Available: ${item.quantity}]`,
                    }))}
                    placeholder="-- Select Equipment (Lens, Cables, Batteries, etc.) --"
                    disabled={addingAccessory || equipmentLoading}
                    placement="top"
                  />
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
              </fieldset>
            </div>
          </div>

        </div>
      </ScreenFrame>
    </>
  );
}
