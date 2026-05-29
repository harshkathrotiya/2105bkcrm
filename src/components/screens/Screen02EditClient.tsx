"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import { useClients, useInquiries, useQuotations, useInvoices } from "@/lib/store";

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
  status: "Active" | "Inactive";
}

export default function Screen02EditClient({
  clientId,
}: {
  clientId: string;
}) {
  const router = useRouter();
  const { clients, dispatchClients } = useClients();
  const { inquiries } = useInquiries();
  const { quotations } = useQuotations();
  const { invoices } = useInvoices();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const client = useMemo(
    () => clients.find((c) => c.id === clientId),
    [clients, clientId]
  );

  const [form, setForm] = useState<FormData>({
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
    status: "Active",
  });

  // Pre-fill form once client data is available
  useEffect(() => {
    let active = true;
    const initializeForm = async () => {
      await Promise.resolve(); // yields execution to prevent synchronous rendering phase state updates
      if (!active) return;
      if (client) {
        setForm({
          name: client.name,
          mobile: client.mobile,
          contact: client.contact,
          email: client.email,
          gst: client.gst,
          pan: client.pan,
          addressLine: client.addressLine,
          city: client.city,
          district: client.district,
          state: client.state,
          pin: client.pin,
          status: client.status,
        });
      }
    };
    initializeForm();
    return () => {
      active = false;
    };
  }, [client]);

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
    const colors = [
      { bg: "#EEEDFE", fg: "#3C3489" },
      { bg: "#E1F5EE", fg: "#085041" },
      { bg: "#FAECE7", fg: "#712B13" },
      { bg: "#E6F1FB", fg: "#0C447C" },
      { bg: "#FAEEDA", fg: "#633806" },
    ];
    return colors[form.name.length % colors.length];
  }, [form.name]);

  const validations = useMemo(
    () => ({
      name: form.name.trim().length >= 2,
      mobile: /^\d{10}$/.test(form.mobile),
      contact: form.contact.trim().length >= 2,
      email:
        form.email.length === 0 ||
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
      gst:
        form.gst.length === 0 ||
        /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/i.test(form.gst),
      pan:
        form.pan.length === 0 || /^[A-Z]{5}\d{4}[A-Z]$/.test(form.pan),
      city: form.city.trim().length >= 2,
      district: form.district.trim().length >= 2,
      state: form.state.trim().length >= 2,
    }),
    [form]
  );

  const requiredFields: (keyof typeof validations)[] = [
    "name",
    "mobile",
    "contact",
    "city",
    "district",
    "state",
  ];
  const allRequired = requiredFields.every((f) => validations[f]);

  // ── Client activity timeline (cross-module) ──────────────────────────
  const clientActivity = useMemo(() => {
    const clientInquiries = inquiries
      .filter((i) => i.clientId === clientId)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    return clientInquiries.map((inq) => {
      const quote = quotations.find((q) => q.inquiryId === inq.id && q.status !== "Revised");
      const invoice = quote ? invoices.find((inv) => inv.quotationId === quote.id) : undefined;
      return { inq, quote, invoice };
    });
  }, [inquiries, quotations, invoices, clientId]);

  const totalRevenue = useMemo(() =>
    clientActivity.reduce((s, { invoice }) =>
      s + (invoice ? invoice.advance + invoice.balance : 0), 0
    ), [clientActivity]);

  const handleSave = () => {
    if (!allRequired || !client) return;
    dispatchClients({
      type: "UPDATE_CLIENT",
      payload: {
        id: clientId,
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
        status: form.status,
      },
    });
    setToastMessage("Client updated successfully!");
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      router.push("/clients");
    }, 2000);
  };

  const handleDelete = () => {
    if (!client || !confirm("Are you sure you want to delete this client?"))
      return;
    dispatchClients({ type: "DELETE_CLIENT", payload: clientId });
    setToastMessage("Client deleted!");
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      router.push("/clients");
    }, 2000);
  };

  // Not found state
  if (!client && clients.length > 0) {
    return (
      <>
        <SectionHeader
          title={<>Edit <strong>client</strong></>}
        />
        <ScreenFrame breadcrumb={<>Clients › Edit client</>}>
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-60">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <div className="text-[16px] font-medium text-tx2 mb-1">
                Client not found
              </div>
              <div className="text-[12px] text-tx3">
                The client you are looking for does not exist or may have been
                deleted.
              </div>
              <Link href="/clients" className="btn mt-4 inline-block">
                ← Back to clients
              </Link>
            </div>
          </div>
        </ScreenFrame>
      </>
    );
  }

  // Loading state
  if (!client) {
    return (
      <>
        <SectionHeader
          title={<>Edit <strong>client</strong></>}
        />
        <ScreenFrame breadcrumb={<>Clients › Edit client</>}>
          <LoadingSkeleton rows={6} message="Loading client…" />
        </ScreenFrame>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        title={<>Edit <strong>client</strong></>}
        description="Update client details below. Required fields are marked with *."
      />
      <ScreenFrame
        breadcrumb={<>Clients › Edit client</>}
        actions={
          <>
            <Link
              href={`/inquiries/new?clientId=${clientId}`}
              className="btn"
            >
              + New Inquiry
            </Link>
            <button className="btn text-rd" onClick={handleDelete}>
              Delete
            </button>
            <button
              className={`btn btn-success ${!allRequired ? "opacity-50" : ""}`}
              onClick={handleSave}
              disabled={!allRequired}
            >
              Update client ↗
            </button>
          </>
        }
      >
        <div className="two-col">
          {/* Left - Forms */}
          <div>
            {/* Basic Information */}
            <div className="card">
              <div className="card-t">Basic information</div>
              <div className="fgrid">
                <div className="field span2">
                  <div className="flbl">Client name *</div>
                  <input
                    className="finp"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="e.g. Adani Group"
                  />
                </div>
                <div className="field">
                  <div className="flbl">Mobile number * (10 digits)</div>
                  <input
                    className="finp"
                    value={form.mobile}
                    onChange={(e) =>
                      update(
                        "mobile",
                        e.target.value.replace(/\D/g, "").slice(0, 10)
                      )
                    }
                    placeholder="9825011111"
                  />
                </div>
                <div className="field">
                  <div className="flbl">Contact person *</div>
                  <input
                    className="finp"
                    value={form.contact}
                    onChange={(e) => update("contact", e.target.value)}
                    placeholder="e.g. Vikram Shah"
                  />
                </div>
                <div className="field span2">
                  <div className="flbl">Email (optional)</div>
                  <input
                    className="finp"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="field">
                  <div className="flbl">Status</div>
                  <select
                    className="fsel"
                    value={form.status}
                    onChange={(e) =>
                      update("status", e.target.value as "Active" | "Inactive")
                    }
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tax Information */}
            <div className="card">
              <div className="card-t">Tax information</div>
              <div className="fgrid">
                <div className="field">
                  <div className="flbl">GST number (15 char)</div>
                  <input
                    className="finp font-mono text-[11px]"
                    value={form.gst}
                    onChange={(e) =>
                      update("gst", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                    }
                    maxLength={15}
                    placeholder="24XXXXX1234X1ZX"
                  />
                </div>
                <div className="field">
                  <div className="flbl">PAN number (10 char)</div>
                  <input
                    className="finp font-mono text-[11px]"
                    value={form.pan}
                    onChange={(e) =>
                      update("pan", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                    }
                    maxLength={10}
                    placeholder="ABCDE1234F"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="card">
              <div className="card-t">Address</div>
              <div className="fgrid">
                <div className="field span2">
                  <div className="flbl">Address line</div>
                  <textarea
                    className="ftxt"
                    value={form.addressLine}
                    onChange={(e) => update("addressLine", e.target.value)}
                    placeholder="Street, area..."
                  />
                </div>
                <div className="field">
                  <div className="flbl">City *</div>
                  <input
                    className="finp"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                  />
                </div>
                <div className="field">
                  <div className="flbl">District *</div>
                  <input
                    className="finp"
                    value={form.district}
                    onChange={(e) => update("district", e.target.value)}
                  />
                </div>
                <div className="field">
                  <div className="flbl">State *</div>
                  <select
                    className="fsel"
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
                  </select>
                </div>
                <div className="field">
                  <div className="flbl">PIN code</div>
                  <input
                    className="finp"
                    value={form.pin}
                    onChange={(e) =>
                      update("pin", e.target.value.replace(/\D/g, ""))
                    }
                    maxLength={6}
                    placeholder="390001"
                  />
                </div>
              </div>
            </div>
          </div>

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
                  {validations.name ? "✓" : "○"} Client name
                </div>
                <div
                  className={`flex items-center gap-[6px] ${
                    validations.mobile ? "text-gr" : "text-tx3"
                  }`}
                >
                  {validations.mobile ? "✓" : "○"} Mobile (10 digits)
                </div>
                <div
                  className={`flex items-center gap-[6px] ${
                    validations.contact ? "text-gr" : "text-tx3"
                  }`}
                >
                  {validations.contact ? "✓" : "○"} Contact person
                </div>
                <div
                  className={`flex items-center gap-[6px] ${
                    validations.city && validations.district && validations.state
                      ? "text-gr"
                      : "text-tx3"
                  }`}
                >
                  {validations.city && validations.district && validations.state
                    ? "✓"
                    : "○"}{" "}
                  City / District / State
                </div>
                <div
                  className={`flex items-center gap-[6px] ${
                    validations.email
                      ? "text-gr"
                      : form.email
                      ? "text-rd"
                      : "text-tx3"
                  }`}
                >
                  {validations.email ? "✓" : "○"} Email
                  {form.email && !validations.email
                    ? " (invalid format)"
                    : " (optional)"}
                </div>
                <div
                  className={`flex items-center gap-[6px] ${
                    validations.gst
                      ? "text-gr"
                      : form.gst
                      ? "text-rd"
                      : "text-tx3"
                  }`}
                >
                  {validations.gst ? "✓" : "○"} GST
                  {form.gst && !validations.gst
                    ? " (invalid format)"
                    : " (optional)"}
                </div>
                <div
                  className={`flex items-center gap-[6px] ${
                    validations.pan
                      ? "text-gr"
                      : form.pan
                      ? "text-rd"
                      : "text-tx3"
                  }`}
                >
                  {validations.pan ? "✓" : "○"} PAN
                  {form.pan && !validations.pan
                    ? " (invalid format)"
                    : " (optional)"}
                </div>
              </div>
            </div>
            {/* Activity Timeline */}
            <div className="card">
              <div className="card-t">
                <span>Client Activity</span>
                {totalRevenue > 0 && (
                  <span style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "var(--gr)",
                    marginLeft: "8px",
                  }}>
                    ₹{totalRevenue.toLocaleString("en-IN")} total
                  </span>
                )}
              </div>
              {clientActivity.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "var(--tx3)", fontSize: "11px" }}>
                  No inquiries yet
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
                  {clientActivity.map(({ inq, quote, invoice }, idx) => {
                    const invStatusColor: Record<string, string> = {
                      "Paid": "var(--gr)",
                      "Partial paid": "var(--yl)",
                      "Unpaid": "var(--rd)",
                    };
                    const inqStatusColor: Record<string, string> = {
                      "New": "var(--acc)",
                      "Quoted": "var(--yl)",
                      "Confirmed": "var(--gr)",
                      "Cancelled": "var(--rd)",
                    };
                    return (
                      <div
                        key={inq.id}
                        style={{
                          padding: "10px 0",
                          borderBottom: idx < clientActivity.length - 1 ? "1px solid var(--b1)" : "none",
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: "8px",
                          alignItems: "start",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                            <span style={{
                              display: "inline-block",
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: inqStatusColor[inq.status] ?? "var(--tx3)",
                              flexShrink: 0,
                            }} />
                            <span style={{ fontSize: "12px", fontWeight: 500 }}>{inq.eventName || inq.eventType}</span>
                          </div>
                          <div style={{ fontSize: "10px", color: "var(--tx3)", paddingLeft: "12px" }}>
                            {new Date(inq.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            {inq.venue ? ` · ${inq.venue}` : ""}
                          </div>
                          {quote && (
                            <div style={{ fontSize: "10px", color: "var(--tx2)", paddingLeft: "12px", marginTop: "2px" }}>
                              <span style={{ fontFamily: "monospace" }}>{quote.quoteNo}</span>
                              {" · "}
                              <span style={{ fontWeight: 600 }}>₹{quote.total.toLocaleString("en-IN")}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                          <span style={{
                            fontSize: "9px",
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: `${inqStatusColor[inq.status] ?? "var(--tx3)"}22`,
                            color: inqStatusColor[inq.status] ?? "var(--tx3)",
                          }}>
                            {inq.status}
                          </span>
                          {invoice && (
                            <span style={{
                              fontSize: "9px",
                              fontWeight: 600,
                              padding: "1px 6px",
                              borderRadius: "4px",
                              background: `${invStatusColor[invoice.status] ?? "var(--tx3)"}22`,
                              color: invStatusColor[invoice.status] ?? "var(--tx3)",
                            }}>
                              {invoice.status}
                            </span>
                          )}
                          {!invoice && quote && (
                            <Link
                              href={`/invoices/${quote.id}/new`}
                              style={{
                                fontSize: "9px",
                                color: "var(--acc)",
                                textDecoration: "underline",
                              }}
                            >
                              + Invoice
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </ScreenFrame>

      {/* Toast notification */}
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
