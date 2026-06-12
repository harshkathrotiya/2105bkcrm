"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Pencil, Trash2, Check, Circle } from "lucide-react";
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
import Button from "../ui/Button";

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

  const [form, setForm] = useState({
    productName: "",
    category: "CAMERA" as string,
    itemType: "INDIVIDUAL" as "INDIVIDUAL" | "BULK",
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
    department: "VIDEO" as string,
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

  const handleRemoveCategory = async (value: string) => {
    if (!value) return;
    const ok = await confirm({
      message: `Are you sure you want to remove the category "${catLabel(value)}"? Existing equipment items of this category will remain unchanged, but it will be removed from the option list.`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.removeOption("EQUIPMENT_CATEGORY", value);
      setCategories((prev) => {
        const remaining = prev.filter((c) => c !== value);
        // If the deleted category was selected, move to first remaining
        setForm((f) => f.category === value ? { ...f, category: remaining[0] ?? "" } : f);
        return remaining;
      });
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
            itemType: data.itemType || "INDIVIDUAL",
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
            department: data.department || "VIDEO",
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
      purchasePrice: form.purchasePrice === "" || (!isNaN(priceNum) && priceNum >= 0),
      vendorSelected: hasVendorId,
      ownerStaffSelected: hasOwnerStaff,
    };
  }, [form]);

  const allRequired = validations.productName && validations.category && validations.purchasePrice && validations.vendorSelected && validations.ownerStaffSelected;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!allRequired || saving) return;

    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        quantity: form.itemType === "BULK" ? Number(form.quantity) : 1,
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
        toast.success("Equipment updated successfully!");
      } else {
        await dispatchEquipment({
          type: "ADD_EQUIPMENT",
          payload,
        });
        toast.success("Equipment added successfully!");
      }

      setTimeout(() => {
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
      toast.success("Equipment retired successfully!");
      setTimeout(() => {
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
              <Button variant="danger" loading={saving} onClick={handleDelete}>
                Retire/Delete
              </Button>
            )}
            {canSave && (
              <Button variant="primary" loading={saving} disabled={!allRequired} onClick={() => handleSave()}>
                {isEdit ? "Save Changes" : "Create Item"}
              </Button>
            )}
          </div>
        }
      >
        <form onSubmit={handleSave}>
        <fieldset disabled={!canSave} className="two-col" style={{ border: "none", padding: 0, margin: 0, minInlineSize: "auto", gridTemplateColumns: "1fr 280px", display: "grid" }}>
          {/* Main Form Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="card">
              <div className="card-t">Item Type</div>
              <div style={{ display: "flex", gap: "10px" }}>
                {(["INDIVIDUAL", "BULK"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => update("itemType", type)}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: `2px solid ${form.itemType === type ? "var(--bl)" : "var(--b1)"}`,
                      background: form.itemType === type ? "var(--sem-bl-bg)" : "var(--s2)",
                      color: form.itemType === type ? "var(--bl)" : "var(--tx2)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "3px" }}>
                      {type === "INDIVIDUAL" ? "Individual Item" : "Bulk / Consumable"}
                    </div>
                    <div style={{ fontSize: "10.5px", opacity: 0.75 }}>
                      {type === "INDIVIDUAL"
                        ? "One unique unit — camera, lens, light, monitor, etc."
                        : "Quantity-based — wire, cable, connector, etc."}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-t">Department</div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {[
                  { value: "VIDEO", label: "Video", desc: "Cameras, lenses, mixers, recorders" },
                  { value: "LED", label: "LED", desc: "LED panels, processors, cables" },
                  { value: "AUDIO", label: "Audio", desc: "Mixers, wireless, intercoms" },
                  { value: "LIGHTS", label: "Lights", desc: "Lighting equipment" },
                ].map((dept) => (
                  <button
                    key={dept.value}
                    type="button"
                    onClick={() => {
                      update("department", dept.value);
                      if (dept.value === "LED") update("category", "LED_PANEL");
                      else if (form.department === "LED") update("category", "CAMERA");
                    }}
                    style={{
                      flex: "1 1 140px",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: `2px solid ${form.department === dept.value ? "var(--bl)" : "var(--b1)"}`,
                      background: form.department === dept.value ? "var(--sem-bl-bg)" : "var(--s2)",
                      color: form.department === dept.value ? "var(--bl)" : "var(--tx2)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{dept.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 3 }}>{dept.desc}</div>
                  </button>
                ))}
              </div>
            </div>

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
                    placeholder={form.department === "LED" ? "e.g. Nova LED P4 Lot" : "e.g. Sony FX6 Cinema Camera"}
                    required
                  />
                </div>

                <div className="field">
                  <div className="flbl" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Category *</span>
                    {form.department !== "LED" && !addingCategory && !editingCategory && (
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
                  {form.department === "LED" ? (
                    <select
                      className="fsel"
                      value={form.category}
                      onChange={(e) => update("category", e.target.value)}
                      required
                    >
                      <option value="LED_PANEL">LED Panel</option>
                      <option value="LED_PROCESSOR">LED Processor</option>
                      <option value="LED_CONTROLLER">LED Controller</option>
                      <option value="LED_CABLE">LED Cable</option>
                      <option value="LED_ACCESSORY">LED Accessory</option>
                    </select>
                  ) : addingCategory ? (
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
                                  onClick={() => handleRemoveCategory(c)}
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

                {form.itemType === "BULK" && (
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
                        style={{ width: "110px" }}
                        value={form.quantityUnit}
                        onChange={(e) => update("quantityUnit", e.target.value as "pieces" | "pair" | "metre")}
                      >
                        <option value="pieces">Pieces</option>
                        <option value="pair">Pair</option>
                        <option value="metre">Metre</option>
                      </select>
                    </div>
                  </div>
                )}

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
                  <div className="flbl">Serial Number{form.itemType === "BULK" ? " / Batch Number" : ""}</div>
                  <input
                    type="text"
                    className="finp"
                    value={form.serialNumber}
                    onChange={(e) => update("serialNumber", e.target.value)}
                    placeholder={form.itemType === "BULK" ? "e.g. BATCH-2026-001" : "e.g. FX6-S-701"}
                  />
                </div>

                {/* LED-specific fields */}
                {form.department === "LED" && (
                  <>
                    <div className="field">
                      <div className="flbl">LED Type</div>
                      <select className="fsel" value={(form as any).ledType ?? "P4"} onChange={(e) => update("ledType", e.target.value)}>
                        <option value="P4">P4</option>
                        <option value="P3">P3</option>
                        <option value="P2">P2</option>
                        <option value="FLOOR">FLOOR</option>
                        <option value="P4_CURVED">P4 Curved</option>
                      </select>
                    </div>
                    <div className="field">
                      <div className="flbl">Cabinets / Box</div>
                      <input type="number" className="finp" min={1} placeholder="e.g. 5"
                        value={(form as any).cabinetsPerBox ?? ""}
                        onChange={(e) => update("cabinetsPerBox", e.target.value ? Number(e.target.value) : "")} />
                    </div>
                    <div className="field">
                      <div className="flbl">Cabinet Height (mm)</div>
                      <input type="number" className="finp" min={1} placeholder="e.g. 576"
                        value={(form as any).cabinetHeightMm ?? ""}
                        onChange={(e) => update("cabinetHeightMm", e.target.value ? Number(e.target.value) : "")} />
                    </div>
                    <div className="field">
                      <div className="flbl">Cabinet Width (mm)</div>
                      <input type="number" className="finp" min={1} placeholder="e.g. 576"
                        value={(form as any).cabinetWidthMm ?? ""}
                        onChange={(e) => update("cabinetWidthMm", e.target.value ? Number(e.target.value) : "")} />
                    </div>
                    <div className="field">
                      <div className="flbl">Total Cabinets</div>
                      <input type="number" className="finp" min={0} placeholder="e.g. 100"
                        value={(form as any).totalCabinets ?? ""}
                        onChange={(e) => update("totalCabinets", e.target.value ? Number(e.target.value) : "")} />
                    </div>
                    {/* Live preview */}
                    <div className="field">
                      <div className="flbl">Preview</div>
                      <div style={{ background: "var(--s2)", border: "1px solid var(--b1)", borderRadius: 8, padding: "10px 12px", fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                        {(() => {
                          const tc = Number((form as any).totalCabinets) || 0;
                          const cpb = Number((form as any).cabinetsPerBox) || 0;
                          const hmm = Number((form as any).cabinetHeightMm) || 0;
                          const wmm = Number((form as any).cabinetWidthMm) || 0;
                          const sqft = tc * 4;
                          const boxes = cpb > 0 ? Math.ceil(tc / cpb) : 0;
                          const h8 = hmm > 0 ? Math.round((8 * 304.8) / hmm) : 0;
                          const w14 = wmm > 0 ? Math.round((14 * 304.8) / wmm) : 0;
                          return (
                            <>
                              <div><span style={{ color: "var(--tx3)" }}>Sq.ft for pricing:</span> <strong>{sqft}</strong></div>
                              <div><span style={{ color: "var(--tx3)" }}>Total boxes:</span> <strong>{boxes}</strong></div>
                              <div style={{ borderTop: "1px solid var(--b1)", paddingTop: 6, marginTop: 2, fontSize: 11, color: "var(--tx3)" }}>
                                8×14 ft screen example:<br />
                                H: {h8} cabs = {h8 * hmm}mm &nbsp;|&nbsp; W: {w14} cabs = {w14 * wmm}mm
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </>
                )}
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
                  <span>{validations.productName ? <Check size={12} strokeWidth={3} /> : <Circle size={12} />}</span>
                  <span>Product Name (min 2 chars)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: validations.category ? "var(--gr)" : "var(--tx3)" }}>
                  <span>{validations.category ? <Check size={12} strokeWidth={3} /> : <Circle size={12} />}</span>
                  <span>Valid Category Selected</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: validations.purchasePrice ? "var(--gr)" : "var(--tx3)" }}>
                  <span>{validations.purchasePrice ? <Check size={12} strokeWidth={3} /> : <Circle size={12} />}</span>
                  <span>Purchase Price (non-negative)</span>
                </div>
                {form.ownershipType === "VENDOR" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: validations.vendorSelected ? "var(--gr)" : "var(--tx3)" }}>
                    <span>{validations.vendorSelected ? <Check size={12} strokeWidth={3} /> : <Circle size={12} />}</span>
                    <span>Vendor Selection (Required)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-t">Asset Valuation</div>
              <div style={{ fontSize: "11.5px", lineHeight: "1.6" }}>
                {form.itemType === "BULK" && (
                  <>
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
                  </>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 600 }}>
                  <span>Total Value:</span>
                  <span style={{ color: "var(--gr)" }}>
                    {form.purchasePrice !== ""
                      ? `₹${(Number(form.purchasePrice) * (form.itemType === "BULK" ? Number(form.quantity) : 1)).toLocaleString("en-IN")}`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </fieldset>
        </form>
      </ScreenFrame>

    </>
  );
}
