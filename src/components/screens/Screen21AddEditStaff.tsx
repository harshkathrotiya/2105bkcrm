"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import { useStaff } from "@/lib/store";
import * as api from "@/lib/api";
import { useToast } from "../ui/Toast";
import { STAFF_ROLES } from "@/lib/validate";
import type { Staff } from "@/lib/types";

interface FormData {
  name: string;
  phone: string;
  role: Staff["role"];
  staffType: "INHOUSE" | "EXTERNAL";
  paymentType: "PER_DAY" | "MONTHLY";
  ratePerDay: string;
  monthlySalary: string;
  withEquipment: boolean;
  equipmentDesc: string;
  equipmentRatePerDay: string;
  aadharNumber: string;
  aadharFront: string | null;
  aadharBack: string | null;
}

export default function Screen21AddEditStaff({ staffId }: { staffId?: number }) {
  const router = useRouter();
  const { staff, dispatchStaff } = useStaff();
  const toast = useToast();

  const isEditMode = staffId !== undefined;
  const staffMember = useMemo(() => {
    if (!isEditMode) return undefined;
    return staff.find((s) => s.id === staffId);
  }, [staff, staffId, isEditMode]);

  const [form, setForm] = useState<FormData>({
    name: "",
    phone: "",
    role: "Videographer",
    staffType: "INHOUSE",
    paymentType: "PER_DAY",
    ratePerDay: "",
    monthlySalary: "",
    withEquipment: false,
    equipmentDesc: "",
    equipmentRatePerDay: "",
    aadharNumber: "",
    aadharFront: null,
    aadharBack: null,
  });

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // Dynamic, user-managed role list
  const [roles, setRoles] = useState<string[]>([]);
  const [addingRole, setAddingRole] = useState(false);
  const [newRole, setNewRole] = useState("");

  useEffect(() => {
    let active = true;
    api.fetchOptions("STAFF_ROLE")
      .then((opts) => { if (active) setRoles(opts.map((o) => o.value)); })
      .catch(() => { if (active) setRoles([...STAFF_ROLES]); });
    return () => { active = false; };
  }, []);

  const handleAddRole = async () => {
    const value = newRole.trim();
    if (!value) return;
    try {
      await api.addOption("STAFF_ROLE", value);
      setRoles((prev) => (prev.includes(value) ? prev : [...prev, value]));
      update("role", value as Staff["role"]);
      setNewRole("");
      setAddingRole(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add role");
    }
  };

  // Pre-fill form in edit mode once staff member data is loaded
  useEffect(() => {
    if (isEditMode && staffMember) {
      setForm({
        name: staffMember.name,
        phone: staffMember.phone,
        role: staffMember.role,
        staffType: staffMember.staffType,
        paymentType: staffMember.paymentType,
        ratePerDay: staffMember.ratePerDay ? staffMember.ratePerDay.toString() : "",
        monthlySalary: staffMember.monthlySalary ? staffMember.monthlySalary.toString() : "",
        withEquipment: staffMember.withEquipment,
        equipmentDesc: staffMember.equipmentDesc || "",
        equipmentRatePerDay: staffMember.equipmentRatePerDay ? staffMember.equipmentRatePerDay.toString() : "",
        aadharNumber: staffMember.aadharNumber || "",
        aadharFront: staffMember.aadharFront || null,
        aadharBack: staffMember.aadharBack || null,
      });
    }
  }, [staffMember, isEditMode]);

  const update = (field: keyof FormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Auto-format Aadhar: XXXX XXXX XXXX
  const formatAadharDisplay = (value: string) => {
    const clean = value.replace(/\D/g, "").slice(0, 12);
    const parts = [];
    for (let i = 0; i < clean.length; i += 4) {
      parts.push(clean.substring(i, i + 4));
    }
    return parts.join(" ");
  };

  const handleAadharChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "").slice(0, 12);
    update("aadharNumber", rawVal);
  };

  // Convert uploaded files to base64 Data URLs
  const handleFileUpload = (field: "aadharFront" | "aadharBack", file: File | undefined) => {
    if (!file) {
      update(field, null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      update(field, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Form validations
  const validations = useMemo(() => {
    const isNameValid = form.name.trim().length >= 2;
    const isPhoneValid = /^\d{10}$/.test(form.phone);
    const isRoleValid = !!form.role;
    const isTypeValid = !!form.staffType;

    let isRateValid = false;
    if (form.paymentType === "PER_DAY") {
      isRateValid = parseFloat(form.ratePerDay) > 0;
    } else {
      isRateValid = parseFloat(form.monthlySalary) > 0;
    }

    const isAadharValid = form.aadharNumber.length === 0 || form.aadharNumber.length === 12;

    return {
      name: isNameValid,
      phone: isPhoneValid,
      role: isRoleValid,
      staffType: isTypeValid,
      rate: isRateValid,
      aadhar: isAadharValid,
    };
  }, [form]);

  const allRequiredValid =
    validations.name &&
    validations.phone &&
    validations.role &&
    validations.staffType &&
    validations.rate &&
    validations.aadhar;

  const initials = useMemo(() => {
    if (!form.name.trim()) return "?";
    return form.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [form.name]);

  const handleSave = async () => {
    if (!allRequiredValid || saving) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: form.role,
        staffType: form.staffType,
        paymentType: form.paymentType,
        ratePerDay: form.paymentType === "PER_DAY" ? parseFloat(form.ratePerDay) : null,
        monthlySalary: form.paymentType === "MONTHLY" ? parseFloat(form.monthlySalary) : null,
        withEquipment: form.withEquipment,
        equipmentDesc: form.withEquipment ? form.equipmentDesc.trim() : null,
        equipmentRatePerDay: form.withEquipment && form.equipmentRatePerDay ? parseFloat(form.equipmentRatePerDay) : null,
        aadharNumber: form.aadharNumber || null,
        aadharFront: form.aadharFront,
        aadharBack: form.aadharBack,
      };

      if (isEditMode && staffId !== undefined) {
        await dispatchStaff({
          type: "UPDATE_STAFF",
          payload: { id: staffId, ...payload },
        });
        setToastMessage("Staff profile updated successfully!");
      } else {
        await dispatchStaff({
          type: "ADD_STAFF",
          payload,
        });
        setToastMessage("New staff profile created!");
      }

      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        router.push("/staff");
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "Failed to save staff profile");
      setSaving(false);
    }
  };

  return (
    <>
      <SectionHeader
        title={isEditMode ? <>Edit <strong>Staff Profile</strong></> : <>Add <strong>New Staff</strong></>}
        description="Register crew members, define salary rates, track gear ownership and archive identification cards."
      />

      <ScreenFrame
        breadcrumb={isEditMode ? `Staff › Edit › ${form.name || "Profile"}` : "Staff › Add"}
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <Link href="/staff" className={`btn ${saving ? "opacity-50 pointer-events-none" : ""}`}>Cancel</Link>
            <button
              onClick={handleSave}
              className={`btn btn-success ${!allRequiredValid || saving ? "opacity-50" : ""}`}
              disabled={!allRequiredValid || saving}
            >
              {saving ? "Saving..." : (isEditMode ? "Save Changes ↗" : "Save Staff ↗")}
            </button>
          </div>
        }
      >
        <div className="two-col">
          {/* Left Form Panel */}
          <div>
            
            {/* Basic Information */}
            <div className="card">
              <div className="card-t">Basic Information</div>
              <div className="fgrid">
                <div className="field span2">
                  <div className="flbl">Full Name *</div>
                  <input
                    type="text"
                    className="finp"
                    placeholder="e.g. Nirav Parmar"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                  />
                </div>
                <div className="field">
                  <div className="flbl">Mobile Number * (10 digits)</div>
                  <input
                    type="text"
                    className="finp"
                    placeholder="98250 88888"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                </div>
                <div className="field">
                  <div className="flbl" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Role / Specialization *</span>
                    {!addingRole && (
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: 10, padding: "2px 6px" }}
                        onClick={() => setAddingRole(true)}
                      >
                        + Add role
                      </button>
                    )}
                  </div>
                  {addingRole ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        className="finp"
                        autoFocus
                        placeholder="New role name"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); handleAddRole(); }
                          if (e.key === "Escape") { setAddingRole(false); setNewRole(""); }
                        }}
                      />
                      <button type="button" className="btn btn-primary" style={{ fontSize: 11 }} onClick={handleAddRole}>Add</button>
                      <button type="button" className="btn" style={{ fontSize: 11 }} onClick={() => { setAddingRole(false); setNewRole(""); }}>Cancel</button>
                    </div>
                  ) : (
                    <select
                      className="fsel"
                      value={form.role}
                      onChange={(e) => update("role", e.target.value as any)}
                    >
                      {/* Keep current value selectable even if it's a custom role not in the list */}
                      {form.role && !roles.includes(form.role) && (
                        <option value={form.role}>{form.role}</option>
                      )}
                      {roles.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="field span2">
                  <div className="flbl">Staff Type *</div>
                  <select
                    className="fsel"
                    value={form.staffType}
                    onChange={(e) => update("staffType", e.target.value)}
                  >
                    <option value="INHOUSE">In-house (Permanent)</option>
                    <option value="EXTERNAL">External (Freelance / Contract)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="card">
              <div className="card-t">Payment Details</div>
              <div className="fgrid">
                <div className="field span2">
                  <div className="flbl">Payment Frequency *</div>
                  <select
                    className="fsel"
                    value={form.paymentType}
                    onChange={(e) => update("paymentType", e.target.value)}
                  >
                    <option value="PER_DAY">Per Day (Paid per event days worked)</option>
                    <option value="MONTHLY">Monthly Fixed Salary</option>
                  </select>
                </div>
                
                {form.paymentType === "PER_DAY" ? (
                  <div className="field span2">
                    <div className="flbl">Rate per Day (Rs.) *</div>
                    <input
                      type="number"
                      className="finp"
                      placeholder="1500"
                      value={form.ratePerDay}
                      onChange={(e) => update("ratePerDay", e.target.value)}
                    />
                    <div style={{ fontSize: "10.5px", color: "var(--tx3)", marginTop: "4px" }}>
                      Staff is charged per event day. Default payment when not active is ₹0.
                    </div>
                  </div>
                ) : (
                  <div className="field span2">
                    <div className="flbl">Monthly Fixed Salary (Rs.) *</div>
                    <input
                      type="number"
                      className="finp"
                      placeholder="35000"
                      value={form.monthlySalary}
                      onChange={(e) => update("monthlySalary", e.target.value)}
                    />
                    <div style={{ fontSize: "10.5px", color: "var(--tx3)", marginTop: "4px" }}>
                      Fixed salary paid every month, independent of the number of events worked.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Equipment Toggle */}
            <div className="card">
              <div className="card-t">Equipment Ownership (Optional)</div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <input
                  type="checkbox"
                  id="withEquipmentCheckbox"
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  checked={form.withEquipment}
                  onChange={(e) => update("withEquipment", e.target.checked)}
                />
                <label htmlFor="withEquipmentCheckbox" style={{ fontSize: "12.5px", cursor: "pointer", color: "var(--tx2)" }}>
                  Staff comes with their own equipment / kit fallback
                </label>
              </div>

              {form.withEquipment && (
                <div className="field">
                  <div className="flbl">Equipment description *</div>
                  <input
                    type="text"
                    className="finp"
                    placeholder="e.g. Crane 32ft, DJI Mavic Drone, GoPro FPV"
                    value={form.equipmentDesc}
                    onChange={(e) => update("equipmentDesc", e.target.value)}
                  />
                  <div style={{ fontSize: "10.5px", color: "var(--tx3)", marginTop: "4px" }}>
                    This description will display in the Quotation and Warehouse checklists.
                  </div>
                </div>
              )}

              {form.withEquipment && (
                <div className="field">
                  <div className="flbl">Equipment rate / day (₹)</div>
                  <input
                    type="number"
                    min={0}
                    className="finp"
                    placeholder="e.g. 2000"
                    value={form.equipmentRatePerDay}
                    onChange={(e) => update("equipmentRatePerDay", e.target.value)}
                  />
                  <div style={{ fontSize: "10.5px", color: "var(--tx3)", marginTop: "4px" }}>
                    Extra per-day amount added to this staff&apos;s pay when their equipment is sent on a job.
                    Total = (day rate + equipment rate) × days.
                  </div>
                </div>
              )}
            </div>

            {/* Aadhar verification */}
            <div className="card">
              <div className="card-t">Aadhar Card Verification</div>
              <div className="fgrid">
                <div className="field span2">
                  <div className="flbl">Aadhar Number (12 digits)</div>
                  <input
                    type="text"
                    className="finp font-mono"
                    placeholder="XXXX XXXX XXXX"
                    value={formatAadharDisplay(form.aadharNumber)}
                    onChange={handleAadharChange}
                  />
                </div>
                
                {/* File Upload Mock/Actions */}
                <div className="field">
                  <div className="flbl">Aadhar Card Front</div>
                  <label className="approval-upload" style={{ height: "64px", position: "relative" }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("aadharFront", e.target.files?.[0])}
                    />
                    {form.aadharFront ? (
                      <span className="approval-upload-title" style={{ color: "var(--gr)" }}>✓ Front Image Loaded</span>
                    ) : (
                      <>
                        <span className="approval-upload-title">+ Upload Front</span>
                        <span className="approval-upload-meta">PNG, JPG format</span>
                      </>
                    )}
                  </label>
                </div>

                <div className="field">
                  <div className="flbl">Aadhar Card Back</div>
                  <label className="approval-upload" style={{ height: "64px", position: "relative" }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("aadharBack", e.target.files?.[0])}
                    />
                    {form.aadharBack ? (
                      <span className="approval-upload-title" style={{ color: "var(--gr)" }}>✓ Back Image Loaded</span>
                    ) : (
                      <>
                        <span className="approval-upload-title">+ Upload Back</span>
                        <span className="approval-upload-meta">PNG, JPG format</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>

          </div>

          {/* Right Live Preview Panel */}
          <div>
            <div className="card">
              <div className="card-t">Live Preview</div>
              <div className="preview-avatar">
                <div
                  className="mx-auto w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold"
                  style={{
                    background: form.name.length > 0 ? "var(--sidebar-active)" : "var(--alt3)",
                    color: form.name.length > 0 ? "var(--acc)" : "var(--tx3)",
                    border: "1px solid var(--b1)",
                  }}
                >
                  {initials}
                </div>
                <div className="text-[15px] font-medium mt-[12px] text-tx">
                  {form.name || "Staff Member Name"}
                </div>
                <div className="text-[11.5px] text-tx3 mt-[4px]">
                  {form.role} • {form.staffType === "INHOUSE" ? "In-house" : "External"}
                </div>
                <div className="text-[11.5px] text-tx3 mt-[2px] font-mono">
                  {form.phone ? form.phone.replace(/(\d{5})(\d{5})/, "$1 $2") : "98XXX XXXXX"}
                </div>
              </div>

              <div className="row-item">
                <span className="text-[11px] text-tx3">Payment Rate</span>
                <span className="font-mono text-[12px] font-medium text-tx">
                  {form.paymentType === "PER_DAY"
                    ? form.ratePerDay
                      ? `₹${parseFloat(form.ratePerDay).toLocaleString("en-IN")}/day`
                      : "₹0/day"
                    : form.monthlySalary
                    ? `₹${parseFloat(form.monthlySalary).toLocaleString("en-IN")}/month`
                    : "₹0/month"}
                </span>
              </div>

              <div className="row-item">
                <span className="text-[11px] text-tx3">Equipment Fallback</span>
                <span className="text-[12px]">
                  {form.withEquipment ? (form.equipmentDesc || "Yes (Unspecified)") : "No"}
                </span>
              </div>

              <div className="row-item">
                <span className="text-[11px] text-tx3">Aadhar Verification</span>
                <span className={`text-[11px] font-mono ${form.aadharNumber.length === 12 ? "text-gr" : "text-tx3"}`}>
                  {form.aadharNumber.length === 12 ? formatAadharDisplay(form.aadharNumber) : "Not Entered"}
                </span>
              </div>

              <div className="row-item">
                <span className="text-[11px] text-tx3">Aadhar Images</span>
                <span className="text-[11.5px] text-tx2">
                  {form.aadharFront && form.aadharBack ? "Both Uploaded" : form.aadharFront || form.aadharBack ? "Partial" : "Missing"}
                </span>
              </div>
            </div>

            {/* Validations Checklist */}
            <div className="card">
              <div className="card-t">Validation Checklist</div>
              <div className="flex flex-col gap-[6px] text-[11.5px]">
                <div className={`flex items-center gap-[6px] ${validations.name ? "text-gr" : "text-tx3"}`}>
                  {validations.name ? "✓" : "○"} Full Name (min 2 characters)
                </div>
                <div className={`flex items-center gap-[6px] ${validations.phone ? "text-gr" : "text-tx3"}`}>
                  {validations.phone ? "✓" : "○"} Phone (10 digits)
                </div>
                <div className={`flex items-center gap-[6px] ${validations.role ? "text-gr" : "text-tx3"}`}>
                  {validations.role ? "✓" : "○"} Role Selected
                </div>
                <div className={`flex items-center gap-[6px] ${validations.staffType ? "text-gr" : "text-tx3"}`}>
                  {validations.staffType ? "✓" : "○"} Staff Type Selected
                </div>
                <div className={`flex items-center gap-[6px] ${validations.rate ? "text-gr" : "text-tx3"}`}>
                  {validations.rate ? "✓" : "○"} Payment Rate Valid (must be &gt; 0)
                </div>
                <div className={`flex items-center gap-[6px] ${validations.aadhar ? "text-gr" : "text-tx3"}`}>
                  {validations.aadhar ? "✓" : "○"} Aadhar Number (empty or exactly 12 digits)
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScreenFrame>

      {/* Success Toast */}
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
