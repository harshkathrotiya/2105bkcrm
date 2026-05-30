"use client";

import { useState, useEffect } from "react";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import Timeline from "../ui/Timeline";
import { useRouter } from "next/navigation";
import { useInvoices, useQuotations, useInquiries } from "@/lib/store";
import * as api from "@/lib/api";
import { useMemo } from "react";

interface Props {
  invoiceId: string;
}

export default function Screen09PaymentTracking({ invoiceId }: Props) {
  const router = useRouter();
  const { invoices, dispatchInvoices } = useInvoices();
  const { quotations } = useQuotations();
  const { inquiries } = useInquiries();

  const invoice = invoices.find((inv) => inv.id === invoiceId) ?? invoices[invoices.length - 1];
  const quotation = invoice ? quotations.find((q) => q.id === invoice.quotationId) : null;
  const inquiry = invoice ? inquiries.find((i) => i.id === quotation?.inquiryId) : null;
  const isLed = inquiry?.department === "LED" || inquiry?.department === "MERGED";

  const [warehouseData, setWarehouseData] = useState<any>(null);

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

  const handleRecordPayment = () => {
    if (!invoice) return;
    const isAdvance = formType === "Advance";
    if (isAdvance && invoice.advanceReceived) return;
    if (!isAdvance && invoice.balanceReceived) return;

    if (!isLed && !isAdvance && invoice.deinstallDone === false) {
      alert("Cannot record balance payment (mark Paid in Full) because LED Deinstallation is pending!");
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

    dispatchInvoices({
      type: "UPDATE_INVOICE",
      payload,
    });
    router.push("/invoices/" + invoice.id);
  };

  const handleMarkHDD = () => {
    if (!invoice) return;
    dispatchInvoices({
      type: "UPDATE_INVOICE",
      payload: {
        id: invoice.id,
        hddDelivered: !invoice.hddDelivered,
      },
    });
    router.push("/invoices/" + invoice.id);
  };

  const handleToggleDeinstall = async () => {
    if (!invoice) return;
    if (isLed && !invoice.balanceReceived) {
      alert("Full payment is required before de-installation can be completed!");
      return;
    }

    const nextVal = !invoice.deinstallDone;

    dispatchInvoices({
      type: "UPDATE_INVOICE",
      payload: {
        id: invoice.id,
        deinstallDone: nextVal,
      },
    });

    if (isLed && nextVal && warehouseData?.bookings) {
      try {
        const activeBookings = warehouseData.bookings.filter(
          (b: any) => b.status === "OUT" || b.status === "BOOKED"
        );
        await Promise.all(
          activeBookings.map((b: any) => api.returnEquipmentBooking(b.id))
        );
      } catch (err) {
        console.error("Failed to automatically return equipment bookings:", err);
      }
    }

    router.push("/invoices/" + invoice.id);
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
        breadcrumb={
          <>
            <span className="text-tx2">Invoices</span> › {invoice.invoiceNo} › Payment
          </>
        }
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
                    <div className="flbl">Payment method</div>
                    <select
                      className="fsel"
                      value={formMethod}
                      onChange={(e) => setFormMethod(e.target.value)}
                    >
                      <option>Bank transfer</option>
                      <option>UPI</option>
                      <option>Cash</option>
                      <option>Cheque</option>
                    </select>
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
                <button
                  className="btn btn-success w-full justify-center"
                  style={{ marginTop: "10px" }}
                  onClick={handleRecordPayment}
                >
                  ✓ Record payment ↗
                </button>
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
                          <span style={{ fontSize: "14px" }}>🔒</span>
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
                          <span style={{ fontSize: "14px" }}>🔓</span>
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
                    <button
                      className={`btn w-full justify-center ${invoice.deinstallDone ? "btn-success" : (invoice.balanceReceived ? "btn-primary" : "")}`}
                      onClick={handleToggleDeinstall}
                      disabled={!invoice.balanceReceived}
                    >
                      {invoice.deinstallDone ? "✓ De-installation done!" : "✓ Mark de-installation done"}
                    </button>
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
                    <button
                      className={`btn w-full justify-center ${invoice.deinstallDone ? "" : "btn-primary"}`}
                      onClick={handleToggleDeinstall}
                    >
                      {invoice.deinstallDone ? "✓ Mark Pending" : "✓ Mark Deinstalled"}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="card">
                <div className="card-t">HDD delivery</div>
                <div className="bg-s2 rounded-lg" style={{ padding: "12px 14px", marginBottom: "10px" }}>
                  <div className="row-item">
                    <span className="text-[11px] text-tx3">Total data</span>
                    <span className="font-mono font-medium">480 GB</span>
                  </div>
                  <div className="row-item">
                    <span className="text-[11px] text-tx3">HDD size</span>
                    <Badge variant="am">1 TB</Badge>
                  </div>
                  <div className="row-item">
                    <span className="text-[11px] text-tx3">Status</span>
                    <Badge variant={invoice.balanceReceived ? "gr" : "bl"}>
                      {invoice.balanceReceived ? "Payment received — ready" : "Awaiting payment"}
                    </Badge>
                  </div>
                </div>
                <button
                  className={`btn w-full justify-center ${
                    invoice.balanceReceived ? "btn-success" : ""
                  }`}
                  onClick={handleMarkHDD}
                  disabled={!invoice.balanceReceived && !invoice.hddDelivered}
                >
                  {invoice.hddDelivered ? "✓ HDD delivered" : "✓ Mark HDD delivered ↗"}
                </button>
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
                <div style={{ fontSize: "24px", marginBottom: "6px" }}>🎉</div>
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
