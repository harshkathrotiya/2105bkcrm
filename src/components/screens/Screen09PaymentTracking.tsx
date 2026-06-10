"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Lock, Unlock, PartyPopper, Pencil, Trash2 } from "lucide-react";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Timeline from "../ui/Timeline";
import { useRouter } from "next/navigation";
import { useInvoices, useQuotations, useInquiries } from "@/lib/store";
import * as api from "@/lib/api";
import { useMemo } from "react";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import { useCurrentUser } from "@/lib/use-current-user";

interface Props {
  invoiceId: string;
}

export default function Screen09PaymentTracking({ invoiceId }: Props) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useCurrentUser();
  const canRecordPayment = can("invoices.edit");
  const { invoices, dispatchInvoices } = useInvoices();
  const { quotations } = useQuotations();
  const { inquiries } = useInquiries();

  const invoice = invoices.find((inv) => inv.id === invoiceId) ?? invoices[invoices.length - 1];
  const quotation = invoice ? quotations.find((q) => q.id === invoice.quotationId) : null;
  const inquiry = invoice ? inquiries.find((i) => i.id === quotation?.inquiryId) : null;
  const isLed = inquiry?.department === "LED" || inquiry?.department === "MERGED";

  const [warehouseData, setWarehouseData] = useState<any>(null);
  const [totalGb, setTotalGb] = useState<number | "">("");

  useEffect(() => {
    if (!quotation?.inquiryId) return;
    let active = true;
    api.fetchWarehouseCheck(quotation.inquiryId).then((data) => {
      if (active) setWarehouseData(data);
    });
    return () => { active = false; };
  }, [quotation?.inquiryId]);

  const panelCounts = useMemo(() => {
    if (!warehouseData) return { total: 0, inHouse: 0, vendor: 0 };
    
    let inHouse = 0;
    let vendor = 0;
    
    const bks = warehouseData.bookings || [];
    const eqList = warehouseData.equipment || [];
    
    bks.forEach((b: any) => {
      if (b.vendorId) {
        vendor += b.quantity || 1;
      } else if (b.equipmentId) {
        const eq = eqList.find((e: any) => e.id === b.equipmentId);
        if (eq && eq.category === "LED_PANEL") {
          inHouse += b.quantity || 1;
        }
      }
    });

    const total = inquiry?.totalCabinets || (inHouse + vendor) || 0;
    if (total > 0 && inHouse === 0 && vendor === 0) {
      inHouse = Math.min(total, 40);
      vendor = Math.max(0, total - inHouse);
    }
    
    return { total: inHouse + vendor || total, inHouse, vendor };
  }, [warehouseData, inquiry]);

  // Dynamic payment methods
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [addingMethod, setAddingMethod] = useState(false);
  const [newMethod, setNewMethod] = useState("");
  const [editingMethod, setEditingMethod] = useState(false);
  const [editMethodName, setEditMethodName] = useState("");
  const methodRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (methodRef.current && !methodRef.current.contains(e.target as Node)) {
        setShowMethodDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let active = true;
    api.fetchOptions("PAYMENT_METHOD")
      .then((opts) => {
        if (!active) return;
        const values = opts.map((o) => o.value);
        setPaymentMethods(values);
        setFormMethod((cur) => cur || values[0] || "Bank transfer");
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const handleAddMethod = async () => {
    const value = newMethod.trim();
    if (!value) return;
    try {
      await api.addOption("PAYMENT_METHOD", value);
      setPaymentMethods((prev) => prev.includes(value) ? prev : [...prev, value]);
      setFormMethod(value);
      setNewMethod("");
      setAddingMethod(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add payment method");
    }
  };

  const handleEditMethod = async () => {
    const oldValue = formMethod;
    const newValue = editMethodName.trim();
    if (!newValue || oldValue === newValue) { setEditingMethod(false); return; }
    try {
      await api.updateOption("PAYMENT_METHOD", oldValue, newValue);
      setPaymentMethods((prev) => prev.map((m) => m === oldValue ? newValue : m));
      setFormMethod(newValue);
      setEditingMethod(false);
      toast.success("Payment method updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update payment method");
    }
  };

  const handleRemoveMethod = async (value: string) => {
    const ok = await confirm({
      message: `Remove payment method "${value}"?`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.removeOption("PAYMENT_METHOD", value);
      setPaymentMethods((prev) => {
        const remaining = prev.filter((m) => m !== value);
        setFormMethod((cur) => cur === value ? (remaining[0] ?? "") : cur);
        return remaining;
      });
      toast.success("Payment method removed!");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove payment method");
    }
  };

  const [formAmount, setFormAmount] = useState(
    invoice ? (invoice.advanceReceived ? invoice.balance.toString() : invoice.advance.toString()) : ""
  );
  const [formType, setFormType] = useState(
    invoice && !invoice.advanceReceived ? "Advance" : "Balance"
  );
  const [formMethod, setFormMethod] = useState("Bank transfer");
  const [formRef, setFormRef] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      await Promise.resolve(); // yields execution to make state changes async and prevent rendering cascade
      if (!active) return;
      setFormRef(`NEFT${Date.now().toString().slice(-6)}`);
      setFormDate(new Date().toISOString().split("T")[0]);
    };
    initialize();
    return () => {
      active = false;
    };
  }, []);

  const handleRecordPayment = async () => {
    if (!invoice) return;
    const isAdvance = formType === "Advance";
    if (isAdvance && invoice.advanceReceived) return;
    if (!isAdvance && invoice.balanceReceived) return;

    if (isLed && !isAdvance && invoice.deinstallDone === false) {
      toast.error("Cannot record LED balance payment — de-installation is still pending.");
      return;
    }

    const payload: any = {
      id: invoice.id,
    };

    if (isAdvance) {
      payload.advance = parseFloat(formAmount) || invoice.advance;
      payload.advanceReceived = true;
      payload.advanceReceivedAt = formDate;
      payload.advanceRef = formRef;
      payload.advanceMethod = formMethod;
      payload.status = invoice.balanceReceived ? "Paid" : "Partial paid";
    } else {
      payload.balance = parseFloat(formAmount) || invoice.balance;
      payload.balanceReceived = true;
      payload.balanceReceivedAt = formDate;
      payload.balanceRef = formRef;
      payload.balanceMethod = formMethod;
      payload.status = invoice.advanceReceived ? "Paid" : "Partial paid";
    }

    setSaving(true);
    try {
      dispatchInvoices({
        type: "UPDATE_INVOICE",
        payload,
      });
      router.push("/invoices/" + invoice.id);
    } catch (err) {
      toast.error("Failed to record payment. Please try again.");
      console.error("handleRecordPayment error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkHDD = async () => {
    if (!invoice) return;
    setSaving(true);
    try {
      dispatchInvoices({
        type: "UPDATE_INVOICE",
        payload: {
          id: invoice.id,
          hddDelivered: !invoice.hddDelivered,
        },
      });
      router.push("/invoices/" + invoice.id);
    } catch (err) {
      toast.error("Failed to update HDD delivery status. Please try again.");
      console.error("handleMarkHDD error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDeinstall = async () => {
    if (!invoice) return;
    if (isLed && !invoice.balanceReceived) {
      toast.error("Full payment is required before de-installation can be completed!");
      return;
    }

    const nextVal = !invoice.deinstallDone;
    setSaving(true);
    try {
      dispatchInvoices({
        type: "UPDATE_INVOICE",
        payload: {
          id: invoice.id,
          deinstallDone: nextVal,
        },
      });

      if (isLed && nextVal && warehouseData?.bookings) {
        const activeBookings = warehouseData.bookings.filter(
          (b: any) => b.status === "OUT" || b.status === "BOOKED"
        );
        await Promise.all(
          activeBookings.map((b: any) => api.returnEquipmentBooking(b.id))
        );
      }

      router.push("/invoices/" + invoice.id);
    } catch (err) {
      toast.error("Failed to update de-installation status. Please try again.");
      console.error("handleToggleDeinstall error:", err);
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString("en-IN");

  const totalReceived =
    (invoice?.advanceReceived ? invoice.advance : 0) +
    (invoice?.balanceReceived ? invoice.balance : 0);

  const grossAmount = invoice
    ? invoice.advance + invoice.balance
    : 258420;

  const percentPaid = Math.round((totalReceived / grossAmount) * 100) || 0;

  if (!invoice) {
    return (
      <>
        <SectionHeader title={<>Payment <strong>tracking</strong></>} />
        <div className="sf"><div className="cnt flex items-center justify-center min-h-[300px]"><div className="text-tx3">No invoice found.</div></div></div>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        title={<>Payment <strong>tracking</strong></>}
        description="Track payments, record receipts, and manage HDD delivery after full payment."
      />
      <ScreenFrame
        breadcrumbs={[
          { label: "Invoices", href: "/invoices" },
          { label: invoice.invoiceNo, href: `/invoices/${invoice.id}` },
          { label: "Payment" },
        ]}
        actions={
          <Badge variant={invoice.status === "Paid" ? "gr" : invoice.status === "Partial paid" ? "am" : "rd"}>
            {invoice.status}
          </Badge>
        }
      >
        {/* Metrics */}
        <div className="metrics">
          <div className="met">
            <div className="met-l">Invoice total</div>
            <div className="met-v">₹{fmt(grossAmount)}</div>
          </div>
          <div className="met">
            <div className="met-l">Received</div>
            <div className="met-v g">₹{fmt(totalReceived)}</div>
          </div>
          <div className="met">
            <div className="met-l">Balance</div>
            <div className={`met-v ${grossAmount - totalReceived <= 0 ? "g" : "a"}`}>₹{fmt(Math.max(0, grossAmount - totalReceived))}</div>
          </div>
          <div className="met">
            <div className="met-l">{invoice.deinstallDone !== undefined ? "Deinstallation" : "HDD delivery"}</div>
            <div className="met-v text-[12px]" style={{ marginTop: "4px" }}>
              {invoice.deinstallDone !== undefined ? (
                <Badge variant={invoice.deinstallDone ? "gr" : "bl"}>
                  {invoice.deinstallDone ? "Deinstalled" : "Pending"}
                </Badge>
              ) : (
                <Badge variant={invoice.hddDelivered ? "gr" : "bl"}>
                  {invoice.hddDelivered ? "Delivered" : "Pending"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Payment Progress Bar */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <div className="flex justify-between items-center" style={{ marginBottom: "8px" }}>
            <span className="text-[12px] font-medium text-tx2">Payment Progress</span>
            <span className="text-[12px] font-bold text-tx1 font-mono">{percentPaid}% Paid</span>
          </div>
          <div style={{ width: "100%", height: "8px", background: "var(--b2)", borderRadius: "4px", overflow: "hidden", marginBottom: "8px" }}>
            <div style={{ width: `${percentPaid}%`, height: "100%", background: percentPaid >= 100 ? "var(--gr)" : "var(--acc)", transition: "width 0.3s ease" }}></div>
          </div>
          <div className="text-[11px] text-tx3 font-mono">
            ₹{fmt(totalReceived)} received of ₹{fmt(grossAmount)}
          </div>
        </div>

        <div className="two-col">
          {/* Left - Payment history & Record new payment */}
          <div>
            <div className="card">
              <div className="card-t">Payment history</div>
              <div
                className="rounded-lg"
                style={{
                  padding: "12px 14px",
                  marginBottom: "8px",
                  background: invoice.advanceReceived ? "var(--sem-gr-bg)" : "var(--sem-gy-bg)",
                  border: `1px solid ${invoice.advanceReceived ? "var(--sem-gr-bdr)" : "var(--b1)"}`,
                }}
              >
                <div className="flex justify-between items-start" style={{ marginBottom: "6px" }}>
                  <div>
                    <div className="text-[13px] font-medium">Advance payment — 50%</div>
                    <div className="text-[11px] text-tx3" style={{ marginTop: "2px" }}>
                      {invoice.advanceReceived
                        ? `${invoice.advanceReceivedAt} · ${invoice.advanceMethod} · Ref: ${invoice.advanceRef}`
                        : "Not yet received"}
                    </div>
                  </div>
                  <Badge variant={invoice.advanceReceived ? "gr" : "am"}>
                    {invoice.advanceReceived ? "Received" : "Pending"}
                  </Badge>
                </div>
                <div className="text-[16px] font-medium font-mono" style={{ color: invoice.advanceReceived ? "var(--sem-gr-tx)" : "var(--sem-gy-tx)" }}>
                  ₹{fmt(invoice.advance)}
                </div>
              </div>
              <div
                className="rounded-lg"
                style={{
                  padding: "12px 14px",
                  background: invoice.balanceReceived ? "var(--sem-gr-bg)" : "var(--sem-am-bg)",
                  border: `1px solid ${invoice.balanceReceived ? "var(--sem-gr-bdr)" : "var(--sem-am-bdr)"}`,
                }}
              >
                <div className="flex justify-between items-start" style={{ marginBottom: "6px" }}>
                  <div>
                    <div className="text-[13px] font-medium">Balance payment — 50%</div>
                    <div className="text-[11px] text-tx3" style={{ marginTop: "2px" }}>
                      {invoice.balanceReceived
                        ? `${invoice.balanceReceivedAt} · ${invoice.balanceMethod} · Ref: ${invoice.balanceRef}`
                        : "Pending"}
                    </div>
                  </div>
                  <Badge variant={invoice.balanceReceived ? "gr" : "am"}>
                    {invoice.balanceReceived ? "Received" : "Pending"}
                  </Badge>
                </div>
                <div className="text-[16px] font-medium font-mono" style={{ color: invoice.balanceReceived ? "var(--sem-gr-tx)" : "var(--sem-am-tx)" }}>
                  ₹{fmt(invoice.balance)}
                </div>
              </div>
            </div>

            {!(invoice.advanceReceived && invoice.balanceReceived) && (
              <div className="card">
                <div className="card-t">Record new payment</div>
                <fieldset disabled={!canRecordPayment} style={{ border: "none", padding: 0, margin: 0, minInlineSize: "auto" }}>
                <div className="fgrid">
                  <div className="field">
                    <div className="flbl">Amount (₹)</div>
                    <input
                      className="finp"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <div className="flbl">Payment type</div>
                    <select
                      className="fsel"
                      value={formType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormType(val);
                        if (val === "Advance") {
                          setFormAmount(invoice.advance.toString());
                        } else {
                          setFormAmount(invoice.balance.toString());
                        }
                      }}
                    >
                      {!invoice.balanceReceived && <option value="Balance">Balance</option>}
                      {!invoice.advanceReceived && <option value="Advance">Advance</option>}
                    </select>
                  </div>
                  <div className="field">
                    <div className="flbl" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Payment method</span>
                      {!addingMethod && !editingMethod && (
                        <button type="button" className="btn" style={{ fontSize: 10, padding: "2px 6px" }} onClick={() => setAddingMethod(true)}>
                          + Add
                        </button>
                      )}
                    </div>
                    {addingMethod ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          className="finp" autoFocus placeholder="New payment method"
                          value={newMethod} onChange={(e) => setNewMethod(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddMethod(); } if (e.key === "Escape") { setAddingMethod(false); setNewMethod(""); } }}
                        />
                        <button type="button" className="btn btn-primary" style={{ fontSize: 11 }} onClick={handleAddMethod}>Add</button>
                        <button type="button" className="btn" style={{ fontSize: 11 }} onClick={() => { setAddingMethod(false); setNewMethod(""); }}>Cancel</button>
                      </div>
                    ) : editingMethod ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          className="finp" autoFocus placeholder="Edit method name"
                          value={editMethodName} onChange={(e) => setEditMethodName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleEditMethod(); } if (e.key === "Escape") { setEditingMethod(false); setEditMethodName(""); } }}
                        />
                        <button type="button" className="btn btn-primary" style={{ fontSize: 11 }} onClick={handleEditMethod}>Save</button>
                        <button type="button" className="btn" style={{ fontSize: 11 }} onClick={() => { setEditingMethod(false); setEditMethodName(""); }}>Cancel</button>
                      </div>
                    ) : (
                      <div ref={methodRef} style={{ position: "relative" }}>
                        <div className="fsel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowMethodDropdown(!showMethodDropdown)}>
                          <span>{formMethod || "-- Select Method --"}</span>
                          <span style={{ fontSize: 10, color: "var(--tx3)", opacity: 0.7 }}>▼</span>
                        </div>
                        {showMethodDropdown && (
                          <div className="absolute z-[999] left-0 w-full bg-s1 border border-b1 rounded-md shadow-lg flex flex-col" style={{ top: "100%", marginTop: 4, padding: "6px", maxHeight: 200, overflowY: "auto" }}>
                            {formMethod && !paymentMethods.includes(formMethod) && (
                              <div className="flex items-center px-3 py-2 text-[12px] cursor-pointer hover:bg-s2 rounded font-medium" onClick={() => setShowMethodDropdown(false)}>
                                <span>{formMethod}</span>
                              </div>
                            )}
                            {paymentMethods.map((m) => (
                              <div key={m} className={`flex items-center justify-between px-3 py-2 text-[12px] cursor-pointer hover:bg-s2 transition-colors rounded ${formMethod === m ? "bg-s2 font-medium" : "text-tx"}`} onClick={() => { setFormMethod(m); setShowMethodDropdown(false); }}>
                                <span>{m}</span>
                                <div className="flex items-center gap-3 pr-2" onClick={(e) => e.stopPropagation()}>
                                  <button type="button" className="p-1 hover:bg-s3 rounded text-tx3 hover:text-bl transition-all" title="Rename" onClick={() => { setEditingMethod(true); setEditMethodName(m); setFormMethod(m); setShowMethodDropdown(false); }}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button type="button" className="p-1 hover:bg-s3 rounded text-tx3 hover:text-rd transition-all" title="Delete" onClick={() => handleRemoveMethod(m)}>
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
                    <div className="flbl">Reference no.</div>
                    <input
                      className="finp"
                      value={formRef}
                      onChange={(e) => setFormRef(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <div className="flbl">Date</div>
                    <input
                      type="date"
                      className="finp"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <div className="flbl">Notes</div>
                    <input
                      className="finp"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                    />
                  </div>
                </div>
                </fieldset>
                {canRecordPayment && (
                  <Button
                    variant="success"
                    loading={saving}
                    className="w-full justify-center"
                    style={{ marginTop: "10px" }}
                    onClick={handleRecordPayment}
                  >
                    <Check size={13} strokeWidth={3} /> Record payment
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Right - HDD & Timeline */}
          <div>
            {invoice.deinstallDone !== undefined ? (
              <div className="card">
                <div className="card-t">Deinstallation Gate</div>
                {isLed ? (
                  <>
                    {!invoice.balanceReceived ? (
                      /* State 1: Locked */
                      <div className="bg-[#2E1F0A] border border-[#4A3010] text-[#F5A623] rounded-lg p-3 text-[11px] mb-3">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
                          <Lock size={14} />
                          <span>De-installation Locked</span>
                        </div>
                        <div style={{ marginTop: "6px", color: "var(--tx3)" }}>
                          Full payment is required to unlock de-installation.
                        </div>
                        <div style={{ marginTop: "6px", fontWeight: 600 }}>
                          Warning: Balance ₹{fmt(invoice.balance)} pending
                        </div>
                      </div>
                    ) : (
                      /* State 2: Unlocked */
                      <div className="bg-[#0F2E22] border border-[#1A4A34] text-[#2DD4A0] rounded-lg p-3 text-[11px] mb-3">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
                          <Unlock size={14} />
                          <span>De-installation Unlocked</span>
                        </div>
                        <div style={{ marginTop: "6px", color: "var(--tx3)" }}>
                          Full payment received. Ready for panel return.
                        </div>
                        <div style={{ borderTop: "1px solid #1A4A34", marginTop: "8px", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Total panels:</span>
                            <strong>{panelCounts.total} cabinets</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>· BK Media:</span>
                            <span>{panelCounts.inHouse} cabinets</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>· Vendor:</span>
                            <span>{panelCounts.vendor} cabinets</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Return to warehouse:</span>
                            <Badge variant={invoice.deinstallDone ? "gr" : "am"}>
                              {invoice.deinstallDone ? "Returned" : "Pending"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                    {canRecordPayment && (
                      <Button
                        variant={invoice.deinstallDone ? "success" : (invoice.balanceReceived ? "primary" : "default")}
                        loading={saving}
                        className="w-full justify-center"
                        onClick={handleToggleDeinstall}
                        disabled={!invoice.balanceReceived}
                      >
                        <Check size={13} strokeWidth={3} /> {invoice.deinstallDone ? "De-installation done!" : "Mark de-installation done"}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="bg-s2 rounded-lg" style={{ padding: "12px 14px", marginBottom: "10px" }}>
                      <div className="row-item">
                        <span className="text-[11px] text-tx3">Site Deinstallation</span>
                        <Badge variant={invoice.deinstallDone ? "gr" : "am"}>
                          {invoice.deinstallDone ? "Completed" : "Pending"}
                        </Badge>
                      </div>
                      <div className="text-[9px] text-tx3" style={{ marginTop: "6px" }}>
                        Deinstallation must be completed before recording the final balance payment.
                      </div>
                    </div>
                    {canRecordPayment && (
                      <Button
                        variant={invoice.deinstallDone ? "default" : "primary"}
                        loading={saving}
                        className="w-full justify-center"
                        onClick={handleToggleDeinstall}
                      >
                        <Check size={13} strokeWidth={3} /> {invoice.deinstallDone ? "Mark Pending" : "Mark Deinstalled"}
                      </Button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="card">
                <div className="card-t">HDD delivery</div>
                <div className="bg-s2 rounded-lg" style={{ padding: "12px 14px", marginBottom: "10px" }}>
                  <div className="row-item">
                    <span className="text-[11px] text-tx3">Total data (GB)</span>
                    <input
                      type="number"
                      className="finp text-right font-mono"
                      style={{ width: "100px", height: "28px", padding: "0 8px" }}
                      placeholder="e.g. 480"
                      value={totalGb}
                      disabled={!canRecordPayment}
                      onChange={(e) => setTotalGb(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                  <div className="row-item">
                    <span className="text-[11px] text-tx3">HDD size</span>
                    <Badge variant="am">
                      {!totalGb ? "—" : Number(totalGb) > 500 ? "2 TB" : Number(totalGb) > 200 ? "1 TB" : "500 GB"}
                    </Badge>
                  </div>
                  <div className="row-item">
                    <span className="text-[11px] text-tx3">Status</span>
                    <Badge variant={invoice.balanceReceived ? "gr" : "bl"}>
                      {invoice.balanceReceived ? "Payment received — ready" : "Awaiting payment"}
                    </Badge>
                  </div>
                </div>
                {canRecordPayment && (
                  <Button
                    variant={invoice.balanceReceived ? "success" : "default"}
                    loading={saving}
                    className="w-full justify-center"
                    onClick={handleMarkHDD}
                    disabled={!invoice.balanceReceived && !invoice.hddDelivered}
                  >
                    <Check size={13} strokeWidth={3} /> {invoice.hddDelivered ? "HDD delivered" : "Mark HDD delivered"}
                  </Button>
                )}
                <div className="text-[10px] text-tx3 text-center" style={{ marginTop: "6px" }}>
                  HDD deliver only after full payment
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-t">Timeline</div>
              <Timeline
                items={[
                  ...(invoice.advanceReceived
                    ? [
                        {
                          title: `Advance received — ₹${fmt(invoice.advance)}`,
                          time: `${invoice.advanceReceivedAt} · ${invoice.advanceMethod}`,
                          color: "var(--sem-gr-tx)",
                        },
                      ]
                    : []),
                  ...(invoice.balanceReceived
                    ? [
                        {
                          title: `Balance received — ₹${fmt(invoice.balance)}`,
                          time: `${invoice.balanceReceivedAt} · ${invoice.balanceMethod}`,
                          color: "var(--sem-gr-tx)",
                        },
                      ]
                    : [
                        {
                          title: "Balance payment pending",
                          time: "Awaiting",
                          color: "var(--tx3)",
                        },
                      ]),
                  {
                    title: invoice.deinstallDone !== undefined
                      ? (invoice.deinstallDone ? "Deinstallation completed" : "Deinstallation pending")
                      : (invoice.hddDelivered ? "HDD delivered" : "HDD delivery pending"),
                    time: invoice.deinstallDone !== undefined
                      ? (invoice.deinstallDone ? "Completed" : "Awaiting deinstall")
                      : (invoice.hddDelivered ? "Completed" : "Ready to deliver"),
                    color: (invoice.deinstallDone !== undefined ? invoice.deinstallDone : invoice.hddDelivered) ? "var(--sem-gr-tx)" : "var(--tx3)",
                  },
                ]}
              />
            </div>

            {isLed && invoice.deinstallDone && (
              <div className="card text-center" style={{ background: "var(--sem-gr-bg)", border: "1px solid var(--sem-gr-bdr)", color: "var(--sem-gr-tx)", marginTop: "14px", padding: "16px" }}>
                <div style={{ marginBottom: "6px", display: "flex", justifyContent: "center" }}><PartyPopper size={24} /></div>
                <div className="font-medium text-[14px]" style={{ marginBottom: "2px", color: "var(--sem-gr-tx)" }}>Event Completed</div>
                <div className="text-[10px] text-tx3" style={{ marginBottom: "12px" }}>De-installation done & all panels returned.</div>
                <div style={{ display: "flex", justifyContent: "space-around", borderTop: "1px solid var(--sem-gr-bdr)", paddingTop: "12px", fontSize: "11px" }}>
                  <div>
                    <div className="text-tx3" style={{ fontSize: "9px" }}>Total Invoiced</div>
                    <div className="font-mono font-medium" style={{ color: "var(--tx)" }}>₹{fmt(grossAmount)}</div>
                  </div>
                  <div>
                    <div className="text-tx3" style={{ fontSize: "9px" }}>Total Received</div>
                    <div className="font-mono font-medium" style={{ color: "var(--tx)" }}>₹{fmt(totalReceived)}</div>
                  </div>
                  <div>
                    <div className="text-tx3" style={{ fontSize: "9px" }}>Status</div>
                    <div style={{ marginTop: "2px" }}><Badge variant="gr">CLOSED</Badge></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScreenFrame>
    </>
  );
}
