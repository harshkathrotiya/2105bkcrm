"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import { useEquipment } from "@/lib/store";
import * as api from "@/lib/api";

interface Screen14AddEditEquipmentProps {
  equipmentId?: number;
}

export default function Screen14AddEditEquipment({ equipmentId }: Screen14AddEditEquipmentProps) {
  const router = useRouter();
  const { dispatchEquipment } = useEquipment();
  
  const isEdit = typeof equipmentId !== "undefined";
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [form, setForm] = useState({
    productName: "",
    category: "CAMERA" as "CAMERA" | "VIDEO_MIXER" | "VIDEO_RECORDER" | "AUDIO_MIXER" | "WIRELESS_TX" | "UPS" | "ACCESSORY",
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
  });

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

  const update = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validations = useMemo(() => {
    const priceNum = Number(form.purchasePrice);
    return {
      productName: form.productName.trim().length >= 2,
      category: ["CAMERA", "VIDEO_MIXER", "VIDEO_RECORDER", "AUDIO_MIXER", "WIRELESS_TX", "UPS", "ACCESSORY"].includes(form.category),
      quantity: Number(form.quantity) >= 1,
      purchasePrice: form.purchasePrice === "" || (!isNaN(priceNum) && priceNum >= 0),
    };
  }, [form]);

  const allRequired = validations.productName && validations.category && validations.quantity && validations.purchasePrice;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!allRequired) return;

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
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to retire/delete this equipment item?")) return;
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
    }
  };

  if (loading) {
    return (
      <>
        <SectionHeader title={isEdit ? "Edit Equipment" : "Add Equipment"} />
        <ScreenFrame breadcrumb={isEdit ? "Equipment Master › Edit" : "Equipment Master › New"}>
          <LoadingSkeleton rows={6} message="Loading equipment details…" />
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
            <Link href="/equipment" className="btn">Cancel</Link>
            {isEdit && (
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Retire/Delete
              </button>
            )}
            <button
              type="button"
              className={`btn btn-primary ${!allRequired ? "opacity-50" : ""}`}
              onClick={() => handleSave()}
              disabled={!allRequired}
            >
              {isEdit ? "Save Changes" : "Create Item"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSave} className="two-col" style={{ gridTemplateColumns: "1fr 280px" }}>
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
                  <div className="flbl">Category *</div>
                  <select
                    className="fsel"
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                    required
                  >
                    <option value="CAMERA">Camera</option>
                    <option value="VIDEO_MIXER">Video Mixer</option>
                    <option value="VIDEO_RECORDER">Video Recorder</option>
                    <option value="AUDIO_MIXER">Audio Mixer</option>
                    <option value="WIRELESS_TX">Wireless TX</option>
                    <option value="UPS">UPS System</option>
                    <option value="ACCESSORY">Accessory</option>
                  </select>
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
                  <input
                    type="number"
                    className="finp"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => update("quantity", Math.max(1, parseInt(e.target.value) || 1))}
                    required
                  />
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
              </div>
            </div>

            <div className="card">
              <div className="card-t">Asset Valuation Summary</div>
              <div style={{ fontSize: "11.5px", lineHeight: "1.6" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "var(--tx3)" }}>Quantity:</span>
                  <span style={{ fontWeight: 500 }}>{form.quantity} unit(s)</span>
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
