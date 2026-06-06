"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import { useEquipment } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import * as api from "@/lib/api";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";

interface Screen14AddEditEquipmentProps {
  equipmentId?: number;
}

export default function Screen14AddEditEquipment({ equipmentId }: Screen14AddEditEquipmentProps) {
  const router = useRouter();
  const { dispatchEquipment } = useEquipment();
  const { can } = useCurrentUser();
  const toast = useToast();
  const confirm = useConfirm();

  const isEdit = typeof equipmentId !== "undefined";
  const canSave = isEdit ? can("equipment.edit") : can("equipment.create");
  const canDelete = can("equipment.delete");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [form, setForm] = useState({
    productName: "",
    category: "CAMERA" as string,
    quantity: 1,
    serialNumber: "",
    bodyName: "",
    respPerson: "",
    purchaseDate: "",
    purchaseFrom: "",
    billNumber: "",
    purchasePrice: "" as string | number,
    status: "AVAILABLE" as "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "SOLD" | "RETIRED",
    notes: "",
    ownershipType: "INHOUSE" as "INHOUSE" | "VENDOR" | "STAFF",
    vendorId: "" as string | number,
    ownerStaffId: "" as string | number,
    defaultRate: "" as string | number,
    quantityUnit: "pieces" as "pieces" | "pair" | "metre",
  });

  const [vendors, setVendors] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>([]);

  // Dynamic, user-managed equipment categories
  const [categories, setCategories] = useState<string[]>([]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setShowCatDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Humanize a category code for display: "LED_PANEL" -> "Led Panel"
  const catLabel = (c: string) =>
    c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

  useEffect(() => {
    let active = true;
    api.fetchOptions("EQUIPMENT_CATEGORY")
      .then((opts) => { if (active) setCategories(opts.map((o) => o.value)); })
      .catch(() => { /* keep empty; current value still selectable */ });
    return () => { active = false; };
  }, []);

  const handleAddCategory = async () => {
    // Store as an UPPER_SNAKE_CASE code to match existing categories
    const value = newCategory.trim().toUpperCase().replace(/\s+/g, "_");
    if (!value) return;
    try {
      await api.addOption("EQUIPMENT_CATEGORY", value);
      setCategories((prev) => (prev.includes(value) ? prev : [...prev, value]));
      update("category", value);
      setNewCategory("");
      setAddingCategory(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add category");
    }
  };

  const handleEditCategory = async () => {
    const oldValue = form.category;
    const newValue = editCategoryName.trim().toUpperCase().replace(/\s+/g, "_");
    if (!newValue || oldValue === newValue) {
      setEditingCategory(false);
      return;
    }
    try {
      await api.updateOption("EQUIPMENT_CATEGORY", oldValue, newValue);
      setCategories((prev) => prev.map((c) => (c === oldValue ? newValue : c)));
      update("category", newValue);
      setEditingCategory(false);
      toast.success("Category updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update category");
    }
  };

  const handleRemoveCategory = async () => {
    const value = form.category;
    if (!value) return;
    const ok = await confirm({
      message: `Are you sure you want to remove the category "${catLabel(value)}"? Existing equipment items of this category will remain unchanged, but it will be removed from the option list.`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.removeOption("EQUIPMENT_CATEGORY", value);
      const remaining = categories.filter((c) => c !== value);
      setCategories(remaining);
      update("category", remaining.length > 0 ? remaining[0] : "");
      toast.success("Category removed successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove category");
    }
  };


  // Fetch equipment item details if editing
  useEffect(() => {
    if (!isEdit || !equipmentId) return;
    let active = true;

    async function loadItem() {
      try {
        setLoading(true);
        const data = await api.fetchEquipmentItem(equipmentId!);
        if (active) {
          setForm({
            productName: data.productName || "",
            category: data.category || "CAMERA",
            quantity: data.quantity || 1,
            serialNumber: data.serialNumber || "",
            bodyName: data.bodyName || "",
            respPerson: data.respPerson || "",
            purchaseDate: data.purchaseDate || "",
            purchaseFrom: data.purchaseFrom || "",
            billNumber: data.billNumber || "",
            purchasePrice: data.purchasePrice !== null && data.purchasePrice !== undefined ? data.purchasePrice : "",
            status: data.status || "AVAILABLE",
            notes: data.notes || "",
            ownershipType: data.ownershipType || "INHOUSE",
            vendorId: data.vendorId !== null && data.vendorId !== undefined ? data.vendorId : "",
            ownerStaffId: data.ownerStaffId !== null && data.ownerStaffId !== undefined ? data.ownerStaffId : "",
            defaultRate: data.defaultRate !== null && data.defaultRate !== undefined ? data.defaultRate : "",
            quantityUnit: data.quantityUnit || "pieces",
          });
        }
      } catch (err: any) {
        console.error("Failed to load equipment details:", err);
        if (active) setError(err.message || "Failed to load equipment details");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadItem();
    return () => {
      active = false;
    };
  }, [isEdit, equipmentId]);

  // Fetch active vendors
  useEffect(() => {
    let active = true;
    async function loadVendors() {
      try {
        const list = await api.fetchVendors();
        if (active) setVendors(list.filter((v) => v.isActive));
      } catch (err) {
        console.error("Failed to load vendors:", err);
      }
    }
    loadVendors();
    return () => {
      active = false;
    };
  }, []);

  // Fetch active staff (for staff-owned / partner equipment)
  useEffect(() => {
    let active = true;
    async function loadStaff() {
      try {
        const list = await api.fetchStaff();
        if (active) setStaffList(list.map((s) => ({ id: s.id, name: s.name })));
      } catch (err) {
        console.error("Failed to load staff:", err);
      }
    }
    loadStaff();
    return () => {
      active = false;
    };
  }, []);

  const update = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validations = useMemo(() => {
    const priceNum = Number(form.purchasePrice);
    const hasVendorId = form.ownershipType === "VENDOR" ? (form.vendorId !== "" && form.vendorId !== null && form.vendorId !== undefined) : true;
    const hasOwnerStaff = form.ownershipType === "STAFF" ? (form.ownerStaffId !== "" && form.ownerStaffId !== null && form.ownerStaffId !== undefined) : true;
    return {
      productName: form.productName.trim().length >= 2,
      category: form.category.trim().length > 0,
      quantity: Number(form.quantity) >= 1,
      purchasePrice: form.purchasePrice === "" || (!isNaN(priceNum) && priceNum >= 0),
      vendorSelected: hasVendorId,
      ownerStaffSelected: hasOwnerStaff,
    };
  }, [form]);

  const allRequired = validations.productName && validations.category && validations.quantity && validations.purchasePrice && validations.vendorSelected && validations.ownerStaffSelected;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!allRequired || saving) return;

    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        purchasePrice: form.purchasePrice === "" ? null : Number(form.purchasePrice),
        serialNumber: form.serialNumber.trim() || null,
        bodyName: form.bodyName.trim() || null,
        respPerson: form.respPerson.trim() || null,
        purchaseDate: form.purchaseDate || null,
        purchaseFrom: form.purchaseFrom.trim() || null,
        billNumber: form.billNumber.trim() || null,
        notes: form.notes.trim() || null,
        ownershipType: form.ownershipType,
        vendorId: form.ownershipType === "VENDOR" && form.vendorId ? Number(form.vendorId) : null,
        ownerStaffId: form.ownershipType === "STAFF" && form.ownerStaffId ? Number(form.ownerStaffId) : null,
        defaultRate: form.defaultRate === "" ? null : Number(form.defaultRate),
      };

      if (isEdit) {
        await dispatchEquipment({
          type: "UPDATE_EQUIPMENT",
          payload: { id: equipmentId, ...payload },
        });
        setToastMessage("Equipment updated successfully!");
      } else {
        await dispatchEquipment({
          type: "ADD_EQUIPMENT",
          payload,
        });
        setToastMessage("Equipment added successfully!");
      }

      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        router.push("/equipment");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to save equipment");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (saving) return;
    const ok = await confirm({
      message: "Are you sure you want to retire/delete this equipment item?",
      confirmLabel: "Retire/Delete",
      danger: true,
    });
    if (!ok) return;
    setSaving(true);
    setError("");
    try {
      await dispatchEquipment({
        type: "DELETE_EQUIPMENT",
        payload: equipmentId,
      });
      setToastMessage("Equipment retired successfully!");
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        router.push("/equipment");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to delete equipment");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <SectionHeader title={isEdit ? "Edit Equipment" : "Add Equipment"} />
        <ScreenFrame breadcrumb={isEdit ? "Equipment Master › Edit" : "Equipment Master › New"}>
          <LoadingSkeleton rows={6} />
        </ScreenFrame>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        title={isEdit ? <>Edit <strong>Equipment</strong></> : <>Add <strong>Equipment</strong></>}
        description={isEdit ? "Modify equipment fields and save changes." : "Create a new equipment entry in the master database."}
      />

      {error && (
        <div style={{ color: "var(--rd)", background: "var(--sem-rd-bg)", border: "1px solid var(--sem-rd-bdr)", borderRadius: "6px", padding: "10px", marginBottom: "20px", fontSize: "11.5px" }}>
          {error}
        </div>
      )}

      <ScreenFrame
        breadcrumb={
          <div className="flex items-center gap-1">
            <Link href="/equipment" style={{ color: "var(--tx2)" }}>Equipment Master</Link>
            <span style={{ color: "var(--tx3)" }}>›</span>
            <span>{isEdit ? "Edit" : "New"}</span>
          </div>
        }
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <Link href="/equipment" className={`btn ${saving ? "opacity-50 pointer-events-none" : ""}`}>Cancel</Link>
            {isEdit && canDelete && (
              <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? "Deleting..." : "Retire/Delete"}
              </button>
            )}
            {canSave && (
              <button
                type="button"
                className={`btn btn-primary ${!allRequired || saving ? "opacity-50" : ""}`}
                onClick={() => handleSave()}
                disabled={!allRequired || saving}
              >
                {saving ? "Saving..." : (isEdit ? "Save Changes" : "Create Item")}
              </button>
            )}
          </div>
        }
      >
        <form onSubmit={handleSave}>
        <fieldset disabled={!canSave} className="two-col" style={{ border: "none", padding: 0, margin: 0, minInlineSize: "auto", gridTemplateColumns: "1fr 280px", display: "grid" }}>
          {/* Main Form Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="card">
              <div className="card-t">General Information</div>
              <div className="fgrid">
                <div className="field span2">
                  <div className="flbl">Product Name *</div>
                  <input
                    type="text"
                    className="finp"
                    value={form.productName}
                    onChange={(e) => update("productName", e.target.value)}
                    placeholder="e.g. Sony FX6 Cinema Camera"
                    required
                  />
                </div>

                <div className="field">
                  <div className="flbl" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Category *</span>
                    {!addingCategory && !editingCategory && (
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: 10, padding: "2px 6px" }}
                        onClick={() => setAddingCategory(true)}
                      >
                        + Add category
                      </button>
                    )}
                  </div>
                  {addingCategory ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        className="finp"
                        autoFocus
                        placeholder="New category name"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); }
                          if (e.key === "Escape") { setAddingCategory(false); setNewCategory(""); }
                        }}
                      />
                      <button type="button" className="btn btn-primary" style={{ fontSize: 11 }} onClick={handleAddCategory}>Add</button>
                      <button type="button" className="btn" style={{ fontSize: 11 }} onClick={() => { setAddingCategory(false); setNewCategory(""); }}>Cancel</button>
                    </div>
                  ) : editingCategory ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        className="finp"
                        autoFocus
                        placeholder="Edit category name"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); handleEditCategory(); }
                          if (e.key === "Escape") { setEditingCategory(false); setEditCategoryName(""); }
                        }}
                      />
                      <button type="button" className="btn btn-primary" style={{ fontSize: 11 }} onClick={handleEditCategory}>Save</button>
                      <button type="button" className="btn" style={{ fontSize: 11 }} onClick={() => { setEditingCategory(false); setEditCategoryName(""); }}>Cancel</button>
                    </div>
                  ) : (
                    <div ref={catRef} style={{ position: "relative" }}>
                      <div
                        className="fsel"
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                        onClick={() => setShowCatDropdown(!showCatDropdown)}
                      >
                        <span>{form.category ? catLabel(form.category) : "-- Select Category --"}</span>
                        <span style={{ fontSize: 10, color: "var(--tx3)", opacity: 0.7 }}>▼</span>
                      </div>

                      {showCatDropdown && (
                        <div
                          className="absolute z-[999] left-0 w-full bg-s1 border border-b1 rounded-md shadow-lg flex flex-col"
                          style={{
                            top: "100%",
                            marginTop: 4,
                            padding: "6px",
                            maxHeight: 250,
                            overflowY: "auto",
                          }}
                        >
                          {/* Keep current value selectable even if it's a custom category not yet in the list */}
                          {form.category && !categories.includes(form.category) && (
                            <div
                              className="flex items-center justify-between px-3 py-2 text-[12px] cursor-pointer hover:bg-s2 transition-colors text-tx font-medium rounded"
                              onClick={() => {
                                update("category", form.category);
                                setShowCatDropdown(false);
                              }}
                            >
                              <span>{catLabel(form.category)}</span>
                            </div>
                          )}
                          {categories.map((c) => (
                            <div
                              key={c}
                              className={`flex items-center justify-between px-3 py-2 text-[12px] cursor-pointer hover:bg-s2 transition-colors rounded ${
                                form.category === c ? "bg-s2 font-medium" : "text-tx"
                              }`}
                              onClick={() => {
                                update("category", c);
                                setShowCatDropdown(false);
                              }}
                            >
                              <span>{catLabel(c)}</span>
                              <div
                                className="flex items-center gap-3 pr-2"
                                onClick={(e) => e.stopPropagation()} // Prevent select trigger on icon click
                              >
                                <button
                                  type="button"
                                  className="p-1 hover:bg-s3 rounded text-tx3 hover:text-bl transition-all"
                                  title="Rename Category"
                                  onClick={() => {
                                    setEditingCategory(true);
                                    setEditCategoryName(c);
                                    update("category", c);
                                    setShowCatDropdown(false);
                                  }}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="p-1 hover:bg-s3 rounded text-tx3 hover:text-rd transition-all"
                                  title="Delete Category"
                                  onClick={async () => {
                                    update("category", c);
                                    await handleRemoveCategory();
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="field">
                  <div className="flbl">Status *</div>
                  <select
                    className="fsel"
                    value={form.status}
                    onChange={(e) => update("status", e.target.value)}
                    required
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="IN_USE">In Use</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="SOLD">Sold</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </div>

                <div className="field">
                  <div className="flbl">Quantity *</div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="number"
                      className="finp"
                      style={{ flex: 1 }}
                      min="1"
                      value={form.quantity}
                      onChange={(e) => update("quantity", Math.max(1, parseInt(e.target.value) || 1))}
                      required
                    />
                    <select
                      className="fsel"
                      style={{ width: "100px" }}
                      value={form.quantityUnit}
                      onChange={(e) => update("quantityUnit", e.target.value as "pieces" | "pair" | "metre")}
                    >
                      <option value="pieces">pcs</option>
                      <option value="pair">pair</option>
                      <option value="metre">mtr</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <div className="flbl">Responsible Person (Ops/Owner)</div>
                  <input
                    type="text"
                    className="finp"
                    value={form.respPerson}
                    onChange={(e) => update("respPerson", e.target.value)}
                    placeholder="e.g. Vikram"
                  />
                </div>

                <div className="field">
                  <div className="flbl">Ownership *</div>
                  <select
                    className="fsel"
                    value={form.ownershipType}
                    onChange={(e) => {
                      const val = e.target.value as "INHOUSE" | "VENDOR" | "STAFF";
                      setForm(prev => ({
                        ...prev,
                        ownershipType: val,
                        // Keep only the FK relevant to the selected owner type
                        vendorId: val === "VENDOR" ? prev.vendorId : "",
                        ownerStaffId: val === "STAFF" ? prev.ownerStaffId : "",
                      }));
                    }}
                    required
                  >
                    <option value="INHOUSE">BK Media (Self)</option>
                    <option value="STAFF">Staff (Partner)</option>
                    <option value="VENDOR">Vendor (Outsourced)</option>
                  </select>
                </div>

                {form.ownershipType === "VENDOR" && (
                  <div className="field">
                    <div className="flbl">Vendor *</div>
                    <select
                      className="fsel"
                      value={form.vendorId}
                      onChange={(e) => update("vendorId", e.target.value)}
                      required
                    >
                      <option value="">-- Select Vendor --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.specialization || "General"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {form.ownershipType === "STAFF" && (
                  <div className="field">
                    <div className="flbl">Owner (Staff) *</div>
                    <select
                      className="fsel"
                      value={form.ownerStaffId}
                      onChange={(e) => update("ownerStaffId", e.target.value)}
                      required
                    >
                      <option value="">-- Select Staff --</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="field">
                  <div className="flbl">Default rental rate / day (₹)</div>
                  <input
                    type="number"
                    min={0}
                    className="finp"
                    placeholder="e.g. 20000"
                    value={form.defaultRate}
                    onChange={(e) => update("defaultRate", e.target.value)}
                  />
                  <div style={{ fontSize: "10.5px", color: "var(--tx3)", marginTop: "4px" }}>
                    Standard per-day rate charged to clients. Specific clients can have their own rate on the client page.
                  </div>
                </div>

                {form.category === "ACCESSORY" && (
                  <div className="field span2">
                    <div className="flbl">Main Body Association</div>
                    <input
                      type="text"
                      className="finp"
                      value={form.bodyName}
                      onChange={(e) => update("bodyName", e.target.value)}
                      placeholder="e.g. Sony FX6 Kit A (if accessory)"
                    />
                  </div>
                )}

                <div className="field span2">
                  <div className="flbl">
                    Serial Numbers {form.quantity > 1 ? "(Enter one serial number per line)" : ""}
                  </div>
                  <textarea
                    className="ftxt"
                    value={form.serialNumber}
                    onChange={(e) => update("serialNumber", e.target.value)}
                    placeholder={form.quantity > 1 ? "FX6-S-701\nFX6-S-702\nFX6-S-703" : "e.g. FX6-S-701"}
                    rows={form.quantity > 1 ? 4 : 2}
                  />
                  {form.quantity > 1 && (
                    <div style={{ fontSize: "10.5px", color: "var(--tx3)", marginTop: "4px" }}>
                      Tip: Enter {form.quantity} serial numbers split by newlines.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-t">Purchase & Valuation Details</div>
              <div className="fgrid">
                <div className="field">
                  <div className="flbl">Purchase Date</div>
                  <input
                    type="date"
                    className="finp"
                    value={form.purchaseDate}
                    onChange={(e) => update("purchaseDate", e.target.value)}
                  />
                </div>

                <div className="field">
                  <div className="flbl">Bill / Invoice Number</div>
                  <input
                    type="text"
                    className="finp"
                    value={form.billNumber}
                    onChange={(e) => update("billNumber", e.target.value)}
                    placeholder="e.g. INV/2026/089"
                  />
                </div>

                <div className="field">
                  <div className="flbl">Purchased From</div>
                  <input
                    type="text"
                    className="finp"
                    value={form.purchaseFrom}
                    onChange={(e) => update("purchaseFrom", e.target.value)}
                    placeholder="e.g. Soni & Sons Mumbai"
                  />
                </div>

                <div className="field">
                  <div className="flbl">Purchase Price (₹ per unit)</div>
                  <input
                    type="number"
                    className="finp"
                    min="0"
                    value={form.purchasePrice}
                    onChange={(e) => update("purchasePrice", e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 450000"
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-t">Operational Notes</div>
              <div className="field">
                <textarea
                  className="ftxt"
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Enter details on condition, specific accessories included, storage bin details..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Validation Sidebar */}
          <div>
            <div className="card">
              <div className="card-t">Validation Checks</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "11.5px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: validations.productName ? "var(--gr)" : "var(--tx3)" }}>
                  <span>{validations.productName ? "✓" : "○"}</span>
                  <span>Product Name (min 2 chars)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: validations.category ? "var(--gr)" : "var(--tx3)" }}>
                  <span>{validations.category ? "✓" : "○"}</span>
                  <span>Valid Category Selected</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: validations.quantity ? "var(--gr)" : "var(--tx3)" }}>
                  <span>{validations.quantity ? "✓" : "○"}</span>
                  <span>Quantity (minimum 1)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: validations.purchasePrice ? "var(--gr)" : "var(--tx3)" }}>
                  <span>{validations.purchasePrice ? "✓" : "○"}</span>
                  <span>Purchase Price (non-negative)</span>
                </div>
                {form.ownershipType === "VENDOR" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: validations.vendorSelected ? "var(--gr)" : "var(--tx3)" }}>
                    <span>{validations.vendorSelected ? "✓" : "○"}</span>
                    <span>Vendor Selection (Required)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-t">Asset Valuation Summary</div>
              <div style={{ fontSize: "11.5px", lineHeight: "1.6" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "var(--tx3)" }}>Quantity:</span>
                  <span style={{ fontWeight: 500 }}>{form.quantity} {form.quantityUnit}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "var(--tx3)" }}>Price per unit:</span>
                  <span style={{ fontWeight: 500 }}>
                    {form.purchasePrice !== "" ? `₹${Number(form.purchasePrice).toLocaleString("en-IN")}` : "—"}
                  </span>
                </div>
                <hr style={{ border: "0", borderTop: "1px solid var(--b1)", margin: "8px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 600 }}>
                  <span>Total Value:</span>
                  <span style={{ color: "var(--gr)" }}>
                    {form.purchasePrice !== "" ? `₹${(Number(form.purchasePrice) * Number(form.quantity)).toLocaleString("en-IN")}` : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </fieldset>
        </form>
      </ScreenFrame>

      {showToast && (
        <div
          className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-[13px] font-medium shadow-lg"
          style={{
            background: "var(--sem-gr-bg)",
            border: "1px solid var(--sem-gr-bdr)",
            color: "var(--sem-gr-tx)",
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
