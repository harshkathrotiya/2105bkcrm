"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle } from "lucide-react";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import { TextField, TextAreaField, SelectField } from "../ui/Field";
import { useClients } from "@/lib/store";
import { AVATAR_PALETTE } from "@/lib/constants";
import { useCurrentUser } from "@/lib/use-current-user";
import Button from "../ui/Button";

interface FormData {
  name: string;
  mobile: string;
  contact: string;
  email: string;
  gst: string;
  pan: string;
  addressLine: string;
  city: string;
  district: string;
  state: string;
  pin: string;
}

const initialState: FormData = {
  name: "",
  mobile: "",
  contact: "",
  email: "",
  gst: "",
  pan: "",
  addressLine: "",
  city: "Vadodara",
  district: "Vadodara",
  state: "Gujarat",
  pin: "390001",
};

export default function Screen02AddClient() {
  const router = useRouter();
  const { can } = useCurrentUser();
  const canCreate = can("clients.create");
  const { dispatchClients } = useClients();
  const [form, setForm] = useState<FormData>(initialState);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const update = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const initials = form.name
    ? form.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "—";

  const avatarColor = useMemo(() => {
    const colors = AVATAR_PALETTE.slice(0, 5);
    return colors[form.name.length % colors.length];
  }, [form.name]);

  const validations = useMemo(
    () => ({
      name: form.name.trim().length >= 2,
      mobile: /^\d{10}$/.test(form.mobile),
      contact: form.contact.trim().length >= 2,
      email: form.email.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
      gst: form.gst.length === 0 || /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/i.test(form.gst),
      pan: form.pan.length === 0 || /^[A-Z]{5}\d{4}[A-Z]$/.test(form.pan),
      city: form.city.trim().length >= 2,
      district: form.district.trim().length >= 2,
      state: form.state.trim().length >= 2,
    }),
    [form]
  );

  // Required fields: name, mobile, contact, city, district, state
  // Optional: GST, PAN, PIN, email — these show warnings but don't block save
  const requiredFields: (keyof typeof validations)[] = ["name", "mobile", "contact", "city", "district", "state"];
  const allRequired = requiredFields.every((f) => validations[f]);

  const handleReset = () => {
    setForm(initialState);
  };

  const handleSave = async () => {
    if (!allRequired || saving) return;
    setSaving(true);
    try {
      await dispatchClients({
        type: "ADD_CLIENT",
        payload: {
          id: `client-${Date.now()}`,
          initials,
          bg: avatarColor.bg,
          fg: avatarColor.fg,
          name: form.name,
          contact: form.contact,
          mobile: form.mobile,
          email: form.email,
          gst: form.gst,
          pan: form.pan,
          addressLine: form.addressLine,
          city: form.city,
          district: form.district,
          state: form.state,
          pin: form.pin,
          status: "Active",
          createdAt: new Date().toISOString().split("T")[0],
        },
      });
      // only runs if the dispatch did NOT throw (e.g. 403 / validation)
      setShowToast(true);
      setTimeout(() => { setShowToast(false); router.push("/clients"); }, 2000);
    } catch {
      // error already surfaced via toast in the context
      setSaving(false);
    }
  };

  return (
    <>
      <SectionHeader
        title={<>Add / Edit <strong>client</strong></>}
        description="Add a new client — fill in the required details and preview before saving."
      />
      <ScreenFrame
        breadcrumbs={[{ label: "Clients", href: "/clients" }, { label: "New client" }]}
        actions={
          canCreate ? (
            <>
              <button className="btn" onClick={handleReset} disabled={saving}>
                Reset
              </button>
              <Button variant="success" loading={saving} disabled={!allRequired} onClick={handleSave}>
                Save client
              </Button>
            </>
          ) : (
            <span className="text-[11px] text-tx3">View only — you don&apos;t have create access.</span>
          )
        }
      >
        <div className="two-col">
          {/* Left - Forms */}
          <fieldset disabled={!canCreate} style={{ border: "none", padding: 0, margin: 0, minInlineSize: "auto" }}>
            {/* Basic Information */}
            <div className="card">
              <div className="card-t">Basic information</div>
              <div className="fgrid">
                <TextField
                  className="span2"
                  label="Client name"
                  required
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. Adani Group"
                  error={!validations.name && form.name.length > 0 ? "At least 2 characters" : undefined}
                />
                <TextField
                  label="Mobile number"
                  required
                  hint="10 digits"
                  value={form.mobile}
                  onChange={(e) =>
                    update(
                      "mobile",
                      e.target.value.replace(/\D/g, "").slice(0, 10)
                    )
                  }
                  placeholder="9825011111"
                  error={!validations.mobile && form.mobile.length > 0 ? "Enter a 10-digit number" : undefined}
                />
                <TextField
                  label="Contact person"
                  required
                  value={form.contact}
                  onChange={(e) => update("contact", e.target.value)}
                  placeholder="e.g. Vikram Shah"
                  error={!validations.contact && form.contact.length > 0 ? "At least 2 characters" : undefined}
                />
                <TextField
                  className="span2"
                  label="Email"
                  hint="optional"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="email@example.com"
                  error={!validations.email && form.email.length > 0 ? "Enter a valid email" : undefined}
                />
              </div>
            </div>

            {/* Tax Information */}
            <div className="card">
              <div className="card-t">Tax information</div>
              <div className="fgrid">
                <div className="field">
                  <label className="flbl" htmlFor="client-gst">GST number (15 char)</label>
                  <input
                    id="client-gst"
                    className="finp font-mono text-[11px]"
                    value={form.gst}
                    onChange={(e) =>
                      update("gst", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                    }
                    maxLength={15}
                    placeholder="24XXXXX1234X1ZX"
                    aria-invalid={!validations.gst && form.gst.length > 0 ? true : undefined}
                    aria-describedby={!validations.gst && form.gst.length > 0 ? "client-gst-err" : undefined}
                    style={!validations.gst && form.gst.length > 0 ? { borderColor: "var(--rd)" } : undefined}
                  />
                  {!validations.gst && form.gst.length > 0 && (
                    <span id="client-gst-err" role="alert" className="text-[11px] text-rd">Invalid GST format</span>
                  )}
                </div>
                <div className="field">
                  <label className="flbl" htmlFor="client-pan">PAN number (10 char)</label>
                  <input
                    id="client-pan"
                    className="finp font-mono text-[11px]"
                    value={form.pan}
                    onChange={(e) =>
                      update("pan", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                    }
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    aria-invalid={!validations.pan && form.pan.length > 0 ? true : undefined}
                    aria-describedby={!validations.pan && form.pan.length > 0 ? "client-pan-err" : undefined}
                    style={!validations.pan && form.pan.length > 0 ? { borderColor: "var(--rd)" } : undefined}
                  />
                  {!validations.pan && form.pan.length > 0 && (
                    <span id="client-pan-err" role="alert" className="text-[11px] text-rd">Invalid PAN format</span>
                  )}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="card">
              <div className="card-t">Address</div>
              <div className="fgrid">
                <TextAreaField
                  className="span2"
                  label="Address line"
                  value={form.addressLine}
                  onChange={(e) => update("addressLine", e.target.value)}
                  placeholder="Street, area..."
                />
                <TextField
                  label="City"
                  required
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  error={!validations.city && form.city.length > 0 ? "At least 2 characters" : undefined}
                />
                <TextField
                  label="District"
                  required
                  value={form.district}
                  onChange={(e) => update("district", e.target.value)}
                  error={!validations.district && form.district.length > 0 ? "At least 2 characters" : undefined}
                />
                <SelectField
                  label="State"
                  required
                  value={form.state}
                  onChange={(e) => update("state", e.target.value)}
                >
                    <option>Andhra Pradesh</option>
                    <option>Arunachal Pradesh</option>
                    <option>Assam</option>
                    <option>Bihar</option>
                    <option>Chhattisgarh</option>
                    <option>Goa</option>
                    <option>Gujarat</option>
                    <option>Haryana</option>
                    <option>Himachal Pradesh</option>
                    <option>Jharkhand</option>
                    <option>Karnataka</option>
                    <option>Kerala</option>
                    <option>Madhya Pradesh</option>
                    <option>Maharashtra</option>
                    <option>Manipur</option>
                    <option>Meghalaya</option>
                    <option>Mizoram</option>
                    <option>Nagaland</option>
                    <option>Odisha</option>
                    <option>Punjab</option>
                    <option>Rajasthan</option>
                    <option>Sikkim</option>
                    <option>Tamil Nadu</option>
                    <option>Telangana</option>
                    <option>Tripura</option>
                    <option>Uttar Pradesh</option>
                    <option>Uttarakhand</option>
                    <option>West Bengal</option>
                    <option>Andaman and Nicobar</option>
                    <option>Chandigarh</option>
                    <option>Dadra and Nagar Haveli</option>
                    <option>Daman and Diu</option>
                    <option>Delhi</option>
                    <option>Jammu and Kashmir</option>
                    <option>Ladakh</option>
                    <option>Lakshadweep</option>
                    <option>Puducherry</option>
                </SelectField>
                <TextField
                  label="PIN code"
                  value={form.pin}
                  onChange={(e) =>
                    update("pin", e.target.value.replace(/\D/g, ""))
                  }
                  maxLength={6}
                  placeholder="390001"
                />
              </div>
            </div>
          </fieldset>

          {/* Right - Preview & Validation */}
          <div>
            <div className="card">
              <div className="card-t">Preview</div>
              <div className="preview-avatar">
                <div
                  className="mx-auto w-12 h-12 rounded-full flex items-center justify-center text-base font-medium"
                  style={{ background: avatarColor.bg, color: avatarColor.fg }}
                >
                  {initials}
                </div>
                <div className="text-[14px] font-medium mt-[10px]">
                  {form.name || "Client name"}
                </div>
                <div className="text-[11px] text-tx3 mt-[3px]">
                  {form.contact || "Contact person"}
                </div>
                <div className="text-[11px] text-tx3 mt-[2px]">
                  {form.mobile || "98XXX XXXXX"}
                </div>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">GST</span>
                <span className="font-mono text-[11px]">
                  {form.gst || "—"}
                </span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">PAN</span>
                <span className="font-mono text-[11px]">
                  {form.pan || "—"}
                </span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">City</span>
                <span className="text-[11px]">{form.city}</span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">District</span>
                <span className="text-[11px]">{form.district}</span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">State</span>
                <span className="text-[11px]">{form.state}</span>
              </div>
            </div>

            <div className="card">
              <div className="card-t">Validation</div>
              <div className="flex flex-col gap-[5px] text-[11px]">
                <div
                  className={`flex items-center gap-[6px] ${
                    validations.name ? "text-gr" : "text-tx3"
                  }`}
                >
                  {validations.name ? <Check size={12} strokeWidth={3} /> : <Circle size={12} />} Client name
                </div>
                <div
                  className={`flex items-center gap-[6px] ${
                    validations.mobile ? "text-gr" : "text-tx3"
                  }`}
                >
                  {validations.mobile ? <Check size={12} strokeWidth={3} /> : <Circle size={12} />} Mobile (10 digits)
                </div>
                <div
                  className={`flex items-center gap-[6px] ${
                    validations.contact ? "text-gr" : "text-tx3"
                  }`}
                >
                  {validations.contact ? <Check size={12} strokeWidth={3} /> : <Circle size={12} />} Contact person
                </div>
                <div
                  className={`flex items-center gap-[6px] ${
                    validations.city && validations.district && validations.state
                      ? "text-gr"
                      : "text-tx3"
                  }`}
                >
                  {validations.city && validations.district && validations.state
                    ? <Check size={12} strokeWidth={3} />
                    : <Circle size={12} />}{" "}
                  City / District / State
                </div>
                <div
                  className={`flex items-center gap-[6px] ${
                    validations.email ? "text-gr" : form.email ? "text-rd" : "text-tx3"
                  }`}
                >
                  {validations.email ? <Check size={12} strokeWidth={3} /> : <Circle size={12} />} Email{form.email && !validations.email ? " (invalid format)" : " (optional)"}
                </div>
                <div
                  className={`flex items-center gap-[6px] ${
                    validations.gst ? "text-gr" : form.gst ? "text-rd" : "text-tx3"
                  }`}
                >
                  {validations.gst ? <Check size={12} strokeWidth={3} /> : <Circle size={12} />} GST{form.gst && !validations.gst ? " (invalid format)" : " (optional)"}
                </div>
                <div
                  className={`flex items-center gap-[6px] ${
                    validations.pan ? "text-gr" : form.pan ? "text-rd" : "text-tx3"
                  }`}
                >
                  {validations.pan ? <Check size={12} strokeWidth={3} /> : <Circle size={12} />} PAN{form.pan && !validations.pan ? " (invalid format)" : " (optional)"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScreenFrame>

      {/* Toast notification */}
      {showToast && (
        <div
          className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-[13px] font-medium shadow-lg"
          style={{ background: "var(--sem-gr-bg)", border: "1px solid var(--sem-gr-bdr)", color: "var(--sem-gr-tx)" }}
        >
          <Check size={15} strokeWidth={3} />
          <span>Client saved successfully!</span>
        </div>
      )}
    </>
  );
}
