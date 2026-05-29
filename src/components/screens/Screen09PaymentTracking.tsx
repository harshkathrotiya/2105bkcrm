"use client";

import { useState, useEffect } from "react";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import Timeline from "../ui/Timeline";
import { useRouter } from "next/navigation";
import { useInvoices } from "@/lib/store";

interface Props {
  invoiceId: string;
}

export default function Screen09PaymentTracking({ invoiceId }: Props) {
  const router = useRouter();
  const { invoices, dispatchInvoices } = useInvoices();
  const invoice = invoices.find((inv) => inv.id === invoiceId) ?? invoices[invoices.length - 1];

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

    if (!isAdvance && invoice.deinstallDone === false) {
      alert("Cannot record balance payment (mark Paid in Full) because LED Deinstallation is pending!");
      return;
    }

    const payload: any = {
      id: invoice.id,
    };

    if (isAdvance) {
      payload.advanceReceived = true;
      payload.advanceReceivedAt = formDate;
      payload.advanceRef = formRef;
      payload.advanceMethod = formMethod;
      payload.status = invoice.balanceReceived ? "Paid" : "Partial paid";
    } else {
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

  const handleToggleDeinstall = () => {
    if (!invoice) return;
    dispatchInvoices({
      type: "UPDATE_INVOICE",
      payload: {
        id: invoice.id,
        deinstallDone: !invoice.deinstallDone,
      },
    });
    router.push("/invoices/" + invoice.id);
  };

  const fmt = (n: number) => n.toLocaleString("en-IN");

  const totalReceived =
    (invoice?.advanceReceived ? invoice.advance : 0) +
    (invoice?.balanceReceived ? invoice.balance : 0);

  const grossAmount = invoice
    ? invoice.advance + invoice.balance
    : 258420;

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
          </div>
        </div>
      </ScreenFrame>
    </>
  );
}
