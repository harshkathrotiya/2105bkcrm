"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
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

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  style,
  placement = "bottom",
  disabled = false,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string; group?: string }[];
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  placement?: "top" | "bottom";
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  const selectedLabel = options.find(o => o.value === value)?.label || value;

  const hasGroups = options.some(o => o.group);
  const groupedFiltered = hasGroups
    ? Array.from(new Set(filtered.map(o => o.group || "")))
        .map(group => ({ group, items: filtered.filter(o => (o.group || "") === group) }))
        .filter(g => g.items.length > 0)
    : null;

  return (
    <div className={`relative ${className}`} ref={containerRef} style={style}>
      <div
        className={`fsel cursor-pointer flex justify-between items-center bg-s1 ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        onClick={() => { if (!disabled) { setOpen(!open); setSearch(""); } }}
      >
        <span className={`flex-1 min-w-0 text-left whitespace-nowrap overflow-hidden text-ellipsis ${value ? "" : "text-tx3"}`}>
          {value ? selectedLabel : placeholder}
        </span>
        <span className="text-[10px] text-tx3 opacity-50 ml-2 shrink-0">▼</span>
      </div>
      
      {open && !disabled && (
        <div 
          className="absolute z-[999] left-0 w-full bg-s1 border border-b1 rounded-md shadow-lg flex flex-col min-w-[200px]" 
          style={{ 
            ...(placement === "top" ? { bottom: "100%", marginBottom: "4px" } : { top: "100%", marginTop: "4px" }),
            overflow: "hidden", 
            maxHeight: "260px" 
          }}
        >
          <div className="border-b border-b1 shrink-0 bg-s1" style={{ padding: "8px" }}>
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              className="w-full text-[11px] outline-none border border-b1 rounded bg-s1"
              style={{ padding: "6px 8px" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div style={{ overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div className="text-center text-tx3 text-[10px]" style={{ padding: "12px" }}>No results</div>
            ) : groupedFiltered ? (
              groupedFiltered.map(({ group, items }) => (
                <div key={group}>
                  <div style={{
                    padding: "5px 12px 3px",
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase" as const,
                    color: "var(--tx3)",
                    background: "var(--alt2)",
                    borderBottom: "1px solid var(--b1)",
                  }}>
                    {group}
                  </div>
                  {items.map((opt) => (
                    <div
                      key={opt.value}
                      className={`text-[11px] cursor-pointer transition-colors ${opt.value === value ? "bg-bl/[0.05] text-bl font-medium" : "text-tx hover:bg-s2"}`}
                      style={{ padding: "7px 14px" }}
                      onClick={() => { onChange(opt.value); setOpen(false); }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              filtered.map((opt) => (
                <div
                  key={opt.value}
                  className={`text-[11px] cursor-pointer transition-colors ${opt.value === value ? "bg-bl/[0.05] text-bl font-medium" : "text-tx hover:bg-s2"}`}
                  style={{ padding: "8px 12px" }}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Screen16KitList() {
  const searchParams = useSearchParams();
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

  // Search & Pagination for kits sidebar
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // For Add Accessory Form
  const [selectedAccessoryId, setSelectedAccessoryId] = useState("");
  const [selectedAccessoryQty, setSelectedAccessoryQty] = useState(1);
  const [addingAccessory, setAddingAccessory] = useState(false);

  // For Set Main Body Form
  const [selectedMainBodyId, setSelectedMainBodyId] = useState("");
  const [selectedMainBodyQty, setSelectedMainBodyQty] = useState(1);
  const [settingMainBody, setSettingMainBody] = useState(false);

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

  // Handle selected kit from URL parameter
  useEffect(() => {
    let active = true;

    const syncKitSelection = async () => {
      await Promise.resolve(); // yields execution to prevent synchronous rendering phase state updates
      if (!active) return;

      if (urlKitId) {
        const targetId = parseInt(urlKitId, 10);
        setSelectedKitId((prev) => (prev === targetId ? prev : targetId));
      } else if (kits.length > 0 && selectedKitId === null) {
        setSelectedKitId((prev) => (prev === null ? kits[0].id : prev));
      }
    };

    syncKitSelection();

    return () => {
      active = false;
    };
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
    let active = true;

    const loadDropdownEquipment = async () => {
      try {
        await Promise.resolve(); // yields execution to prevent synchronous rendering phase state updates
        if (!active) return;
        setEquipmentLoading(true);
        const res = await api.fetchEquipment({ limit: 500 });
        if (!active) return;
        setAllEquipment(res.items);
      } catch (err) {
        console.error("Failed to load dropdown equipment:", err);
      } finally {
        if (active) {
          setEquipmentLoading(false);
        }
      }
    };

    loadDropdownEquipment();

    return () => {
      active = false;
    };
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
            <div className="tb" style={{ padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: "var(--tx3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>KITS IN STOCK ({kits.length})</span>
            </div>
            {/* Search input */}
            <div style={{ padding: "6px 8px" }}>
              <input
                type="text"
                placeholder="Search kits by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="finp"
                style={{ width: "100%", fontSize: "11px", padding: "5px 8px" }}
              />
            </div>
            {kitsLoading ? (
              <div style={{ padding: "15px" }}>
                <LoadingSkeleton rows={4} message="Fetching kits..." type="list" />
              </div>
            ) : (
              <>
                <div style={{ padding: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {filteredKits.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "var(--tx3)", fontSize: "12px" }}>
                      {searchQuery ? "No kits match your search." : "No kits defined. Click '+ Create New Kit' to build one."}
                    </div>
                  ) : (
                    paginatedKits.map((kit) => {
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

                {/* Pagination */}
                {filteredKits.length > ITEMS_PER_PAGE && (
                  <div style={{ padding: "8px 6px", display: "flex", justifyContent: "center", alignItems: "center", gap: "4px", borderTop: "1px solid var(--b1)" }}>
                    <button
                      className="btn"
                      style={{ padding: "3px 8px", fontSize: "10px" }}
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      {"\u2039"}
                    </button>
                    <span style={{ fontSize: "10px", color: "var(--tx3)", padding: "0 4px" }}>
                      {page} / {totalPages}
                    </span>
                    <button
                      className="btn"
                      style={{ padding: "3px 8px", fontSize: "10px" }}
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      {"\u203A"}
                    </button>
                  </div>
                )}
              </>
            )}
          </aside>

          {/* Right Column: Kit Detail & Edit Panel */}
          <div>
            {!activeKit ? (
              <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "350px", color: "var(--tx3)" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "48px", marginBottom: "10px", opacity: 0.3 }}>⧉</div>
                  <div>Select a kit from the sidebar or click &apos;+ Create New Kit&apos; to get started.</div>
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
                          <SearchableSelect
                            style={{ flex: 1 }}
                            value={selectedMainBodyId}
                            onChange={(val) => {
                              setSelectedMainBodyId(val);
                              setSelectedMainBodyQty(1);
                            }}
                            options={unassignedMainBodies.map((item) => ({
                              value: String(item.id),
                              label: `[${item.category}] ${item.productName} (S/N: {formatSerialNumber(item.serialNumber)}) [Available: ${item.quantity}]`,
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
          justifyContent: "center", zIndex: 1000, padding: "20px", overflowY: "auto"
        }}>
          <div className="sf" style={{ width: "100%", maxWidth: "500px", background: "var(--s1)", overflow: "visible" }}>
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
                          <div key={index} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <SearchableSelect
                                style={{ flex: 1 }}
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
