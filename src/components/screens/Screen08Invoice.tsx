"use client";

import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import { useInvoices } from "@/lib/store";
import { calcDays } from "@/lib/utils";

interface Props {
  invoiceId: string;
}

export default function Screen08Invoice({ invoiceId }: Props) {
  const { invoices, dispatchInvoices } = useInvoices();
  const invoice = invoices.find((inv) => inv.id === invoiceId) ?? invoices[invoices.length - 1];

  const handleMarkReceived = () => {
    if (!invoice || invoice.balanceReceived) return;
    dispatchInvoices({
      type: "UPDATE_INVOICE",
      payload: {
        id: invoice.id,
        balanceReceived: true,
        balanceReceivedAt: new Date().toISOString().split("T")[0],
        balanceRef: "NEFT" + Date.now().toString().slice(-6),
        balanceMethod: "Bank transfer",
        status: invoice.advanceReceived ? "Paid" : "Partial paid",
      },
    });
  };

  if (!invoice) {
    return (
      <>
        <SectionHeader title={<>Invoice</>} />
        <div className="sf"><div className="cnt">No invoice found.</div></div>
      </>
    );
  }

  const fmt = (n: number) => n.toLocaleString("en-IN");

  const eventDays = invoice ? calcDays(invoice.startDate, invoice.endDate) : 1;

  const statusBadge = (() => {
    switch (invoice.status) {
      case "Paid":
        return <Badge variant="gr">Paid</Badge>;
      case "Partial paid":
        return <Badge variant="am">Partial paid</Badge>;
      default:
        return <Badge variant="rd">Unpaid</Badge>;
    }
  })();

  return (
    <>
      <SectionHeader
        title={<>Invoice</>}
        description="Two-line-item invoice for videography and photography services with payment tracking."
      />
      <ScreenFrame
        breadcrumb={
          <>
            <span className="text-tx2">{invoice.invoiceNo}</span> › Invoice
          </>
        }
        actions={
          <>
            {statusBadge}
            <button className="btn">WhatsApp ↗</button>
            <button className="btn btn-primary" onClick={() => window.print()}>Download PDF</button>
          </>
        }
      >
        {/* Warning */}
        <div
          className="rounded-lg text-[11px]"
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 14px",
            marginBottom: "20px",
            background: "var(--sem-notif-bg)",
            border: "1px solid var(--sem-notif-bdr)",
            color: "var(--acc)"
          }}
        >
          <span style={{ marginRight: "6px" }}>⚠</span>
          <span>Video invoice: ફક્ત 2 line items — Videography services + Photography services. Item rates show નહીં.</span>
        </div>

        <div className="two-col">
          {/* PDF Invoice */}
          <div>
            <div className="pdf-frame" id="invoice-pdf-content">
              <div className="pdf-hdr">
                <div>
                  <div className="pdf-co">BK Media</div>
                  <div className="pdf-co-sub">
                    Vadodara, Gujarat · GST: 24XXXXX1234X1ZX<br />
                    +91 98250 00000 · info@bkmedia.in
                  </div>
                </div>
                <div className="pdf-doc">
                  <div className="pdf-doc-lbl">Tax invoice</div>
                  <div className="pdf-doc-num">{invoice.invoiceNo}</div>
                  <div className="pdf-doc-sub">
                    Date:{" "}
                    {new Date(invoice.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <div className="pdf-doc-sub">
                    Due:{" "}
                    {new Date(invoice.dueDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>

              <div className="text-[11px] mb-2 text-[#333]">
                <strong>{invoice.clientName}</strong> — Ref: {invoice.quotationId}
              </div>

              <div className="pdf-strip grid-cols-3">
                <div>
                  <div className="psi-l">Event</div>
                  <div className="psi-v">{invoice.eventName}</div>
                </div>
                <div>
                  <div className="psi-l">Dates</div>
                  <div className="psi-v">
                    {new Date(invoice.startDate).getDate()}–
                    {new Date(invoice.endDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div>
                  <div className="psi-l">Venue</div>
                  <div className="psi-v">{invoice.venue}</div>
                </div>
              </div>

              {/* Invoice items - exactly 2 */}
              <table className="pdf-tbl">
                <thead>
                  <tr>
                    <th style={{ width: 28 }}>No.</th>
                    <th>Service description</th>
                    <th style={{ width: 46, textAlign: "center" }}>Days</th>
                    <th style={{ width: 90, textAlign: "right" }}>
                      Amount (₹)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.videographyAmount > 0 && (
                    <tr>
                      <td>1</td>
                      <td>
                        <strong>{invoice.photographyAmount === 0 ? "LED / Videography services" : "Videography services"}</strong>
                        <br />
                        <span className="text-[9px] text-[#666]">
                          {invoice.eventName} · {invoice.venue} ·{" "}
                          {new Date(invoice.startDate).getDate()}–
                          {new Date(invoice.endDate).toLocaleDateString("en-IN", {
                            month: "short",
                          })}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>{eventDays}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {fmt(invoice.videographyAmount)}
                      </td>
                    </tr>
                  )}
                  {invoice.photographyAmount > 0 && (
                    <tr>
                      <td>{invoice.videographyAmount > 0 ? 2 : 1}</td>
                      <td>
                        <strong>Photography services</strong>
                        <br />
                        <span className="text-[9px] text-[#666]">
                          {invoice.eventName} · {invoice.venue} ·{" "}
                          {new Date(invoice.startDate).getDate()}–
                          {new Date(invoice.endDate).toLocaleDateString("en-IN", {
                            month: "short",
                          })}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>{eventDays}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {fmt(invoice.photographyAmount)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="pdf-totals">
                <div className="pdf-totals-box">
                  <div className="pdf-trow">
                    <span>Amount before tax</span>
                    <span>
                      ₹{fmt(invoice.videographyAmount + invoice.photographyAmount)}
                    </span>
                  </div>
                  <div className="pdf-trow">
                    <span>CGST @ 9%</span>
                    <span>₹{fmt(Math.round((invoice.videographyAmount + invoice.photographyAmount) * 0.09))}</span>
                  </div>
                  <div className="pdf-trow">
                    <span>SGST @ 9%</span>
                    <span>₹{fmt(Math.round((invoice.videographyAmount + invoice.photographyAmount) * 0.09))}</span>
                  </div>
                  <div className="pdf-trow">
                    <span>Gross total</span>
                    <span style={{ fontWeight: 700 }}>
                      ₹{fmt(invoice.advance + invoice.balance)}
                    </span>
                  </div>
                  <div
                    className="pdf-trow"
                    style={{ color: "#1A7A40" }}
                  >
                    <span>Less: Advance (50%)</span>
                    <span>— ₹{fmt(invoice.advance)}</span>
                  </div>
                  <div className="pdf-trow">
                    <span>Balance payable</span>
                    <span style={{ color: "#1050A0" }}>
                      ₹{fmt(invoice.balance)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#F8F8F0] rounded-[4px] p-[8px_10px] text-[9px] mt-2 text-[#666]">
                Terms: Hard disk delivery only after receipt of full payment.
              </div>

              <div className="pdf-footer">
                <div className="pdf-sign">
                  <div className="pdf-sign-line"></div>
                  <div className="pdf-sign-lbl">BK Media — Authorised</div>
                </div>
                <div className="w-10 h-10 rounded-full border-[1.5px] border-[#888] flex items-center justify-center text-[8px] font-bold text-[#888]">
                  STAMP
                </div>
                <div className="pdf-sign">
                  <div className="pdf-sign-line"></div>
                  <div className="pdf-sign-lbl">Client signature</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Payment tracking */}
          <div>
            <div className="grid grid-cols-2 gap-2 mb-[14px]">
              <div className="met">
                <div className="met-l">Invoice total</div>
                <div className="met-v b text-[14px]">
                  ₹{fmt(invoice.advance + invoice.balance)}
                </div>
              </div>
              <div className="met">
                <div className="met-l">Balance due</div>
                <div className="met-v a text-[14px]">
                  ₹{fmt(invoice.balanceReceived ? 0 : invoice.balance)}
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-t">Payment tracking</div>
              <div 
                className="rounded-lg" 
                style={{ 
                  padding: "10px 12px", 
                  marginBottom: "8px", 
                  background: invoice.advanceReceived ? "var(--sem-gr-bg)" : "var(--sem-gy-bg)", 
                  border: `1px solid ${invoice.advanceReceived ? "var(--sem-gr-bdr)" : "var(--b1)"}` 
                }}
              >
                <div className="text-[12px] font-medium" style={{ marginBottom: "2px" }}>
                  Advance — 50%
                </div>
                <div className="text-[10px] text-tx3" style={{ marginBottom: "6px" }}>
                  {invoice.advanceReceived
                    ? `Received: ${invoice.advanceReceivedAt} · ${invoice.advanceMethod}`
                    : "Not yet received"}
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono font-medium text-[14px]">
                    ₹{fmt(invoice.advance)}
                  </span>
                  <Badge variant={invoice.advanceReceived ? "gr" : "am"}>
                    {invoice.advanceReceived ? "Received" : "Pending"}
                  </Badge>
                </div>
              </div>
              <div 
                className="rounded-lg" 
                style={{ 
                  padding: "10px 12px", 
                  marginBottom: "10px", 
                  background: invoice.balanceReceived ? "var(--sem-gr-bg)" : "var(--sem-am-bg)", 
                  border: `1px solid ${invoice.balanceReceived ? "var(--sem-gr-bdr)" : "var(--sem-am-bdr)"}` 
                }}
              >
                <div className="text-[12px] font-medium" style={{ marginBottom: "2px" }}>
                  Balance — 50%
                </div>
                <div className="text-[10px] text-tx3" style={{ marginBottom: "6px" }}>
                  {invoice.balanceReceived
                    ? `Received: ${invoice.balanceReceivedAt} · ${invoice.balanceMethod}`
                    : `Due: ${new Date(invoice.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono font-medium text-[14px]">
                    ₹{fmt(invoice.balance)}
                  </span>
                  <Badge variant={invoice.balanceReceived ? "gr" : "am"}>
                    {invoice.balanceReceived ? "Received" : "Pending"}
                  </Badge>
                </div>
              </div>
              <button
                className={`btn w-full justify-center ${
                  invoice.balanceReceived ? "" : "btn-success"
                }`}
                onClick={handleMarkReceived}
                disabled={invoice.balanceReceived}
              >
                {invoice.balanceReceived
                  ? "✓ Balance received"
                  : "✓ Mark balance received ↗"}
              </button>
            </div>
          </div>
        </div>
      </ScreenFrame>
      {/* Print styles injected for PDF download */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-pdf-content,
          #invoice-pdf-content * {
            visibility: visible;
          }
          #invoice-pdf-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .pdf-frame {
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            margin: 15mm;
            size: A4;
          }
        }
      `}</style>
    </>
  );
}
