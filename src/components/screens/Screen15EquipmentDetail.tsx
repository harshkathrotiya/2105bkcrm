"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import Badge from "../ui/Badge";
import * as api from "@/lib/api";
import { useEquipment } from "@/lib/store";

interface Screen15EquipmentDetailProps {
  equipmentId: number;
}

export default function Screen15EquipmentDetail({ equipmentId }: Screen15EquipmentDetailProps) {
  const { refreshEquipment } = useEquipment();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [returningId, setReturningId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    const fetchDetails = async () => {
      try {
        await Promise.resolve(); // yields execution to prevent synchronous rendering phase state updates
        if (!active) return;
        setLoading(true);
        const data = await api.fetchEquipmentItem(equipmentId);
        if (!active) return;
        setItem(data);
      } catch (err: any) {
        console.error("Failed to load equipment details:", err);
        if (!active) return;
        setError(err.message || "Failed to load equipment details");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDetails();

    return () => {
      active = false;
    };
  }, [equipmentId, refreshKey]);

  const handleReturn = async (bookingId: number) => {
    if (!confirm("Are you sure you want to mark this item as returned? This updates the equipment status to AVAILABLE.")) {
      return;
    }
    try {
      setReturningId(bookingId);
      await api.returnEquipmentBooking(bookingId);
      setToastMessage("Item returned and set to AVAILABLE!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      
      // Refresh current details via key & global store
      setRefreshKey((prev) => prev + 1);
      await refreshEquipment();
    } catch (err: any) {
      alert(err.message || "Failed to mark as returned");
    } finally {
      setReturningId(null);
    }
  };

  // Helper for category badge styling
  const getCategoryBadgeVariant = (cat: string) => {
    switch (cat) {
      case "CAMERA": return "gr";
      case "VIDEO_MIXER": return "bl";
      case "VIDEO_RECORDER": return "am";
      case "AUDIO_MIXER": return "rd";
      case "WIRELESS_TX": return "bl";
      case "UPS": return "gy";
      default: return "gy";
    }
  };

  // Helper for status badge styling
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "gr";
      case "IN_USE": return "bl";
      case "MAINTENANCE": return "am";
      case "SOLD": return "gy";
      case "RETIRED": return "rd";
      default: return "gy";
    }
  };

  // Find if there is a booking that is active (i.e. status is BOOKED or OUT)
  const activeBooking = item?.bookings?.find((b: any) => b.status === "BOOKED" || b.status === "OUT");

  if (loading) {
    return (
      <>
        <SectionHeader title="Equipment Details" />
        <ScreenFrame breadcrumb="Equipment Master › Details">
          <LoadingSkeleton rows={6} message="Loading equipment details…" />
        </ScreenFrame>
      </>
    );
  }

  if (error || !item) {
    return (
      <>
        <SectionHeader title="Equipment Details" />
        <ScreenFrame breadcrumb="Equipment Master › Details">
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-60">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <div className="text-[16px] font-medium text-tx2 mb-1">
                Equipment not found
              </div>
              <div className="text-[12px] text-tx3">
                {error || "The equipment you are looking for does not exist."}
              </div>
              <Link href="/equipment" className="btn mt-4 inline-block">
                ← Back to equipment list
              </Link>
            </div>
          </div>
        </ScreenFrame>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        title={<>Equipment <strong>Details</strong></>}
        description="View complete asset data, kit memberships, and booking logs."
      />

      <ScreenFrame
        breadcrumb={
          <div className="flex items-center gap-1">
            <Link href="/equipment" style={{ color: "var(--tx2)" }}>Equipment Master</Link>
            <span style={{ color: "var(--tx3)" }}>›</span>
            <span>{item.productName}</span>
          </div>
        }
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <Link href="/equipment" className="btn">
              ← Back to List
            </Link>
            <Link href={`/equipment/${item.id}/edit`} className="btn btn-primary">
              ✎ Edit Equipment
            </Link>
          </div>
        }
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", marginBottom: "20px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600, color: "var(--tx)" }}>
              {item.productName}
            </h2>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <Badge variant={getCategoryBadgeVariant(item.category)}>
                {item.category.replace(/_/g, " ")}
              </Badge>
              <Badge variant={getStatusBadgeVariant(item.status)}>
                {item.status}
              </Badge>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "11px", color: "var(--tx3)" }}>Asset ID</span>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 600, color: "var(--tx2)" }}>
              #EQ-{item.id.toString().padStart(4, "0")}
            </div>
          </div>
        </div>

        <div className="two-col" style={{ gridTemplateColumns: "1fr 340px" }}>
          {/* Left Column: Specs, Purchase, and Kits */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Technical Specifications */}
            <div className="card">
              <div className="card-t">Technical Specifications</div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">Product Name</span>
                <span className="text-[12px] font-medium">{item.productName}</span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">Category</span>
                <span className="text-[12px] font-medium">{item.category.replace(/_/g, " ")}</span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">Quantity in stock</span>
                <span className="text-[12px] font-medium">{item.quantity} unit(s)</span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">Responsible Person</span>
                <span className="text-[12px] font-medium">{item.respPerson || <span style={{ color: "var(--tx3)" }}>—</span>}</span>
              </div>
              {item.category === "ACCESSORY" && (
                <div className="row-item">
                  <span className="text-[11px] text-tx3">Main Body Association</span>
                  <span className="text-[12px] font-medium">{item.bodyName || <span style={{ color: "var(--tx3)" }}>—</span>}</span>
                </div>
              )}
              <div className="row-item" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                <span className="text-[11px] text-tx3">Serial Number(s)</span>
                <span className="font-mono text-[11px] whitespace-pre-line" style={{ background: "var(--b1)", width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--b2)", wordBreak: "break-word", overflowWrap: "break-word" }}>
                  {item.serialNumber || <span style={{ color: "var(--tx3)" }}>No serial numbers registered.</span>}
                </span>
              </div>
            </div>

            {/* Purchase & Financial Details */}
            <div className="card">
              <div className="card-t">Purchase & Financial Info</div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">Purchase Date</span>
                <span className="text-[12px] font-medium">{item.purchaseDate || <span style={{ color: "var(--tx3)" }}>—</span>}</span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">Purchased From (Vendor)</span>
                <span className="text-[12px] font-medium">{item.purchaseFrom || <span style={{ color: "var(--tx3)" }}>—</span>}</span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">Bill / Invoice Number</span>
                <span className="text-[12px] font-medium">{item.billNumber || <span style={{ color: "var(--tx3)" }}>—</span>}</span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">Purchase Price (per unit)</span>
                <span className="text-[12px] font-medium">
                  {item.purchasePrice !== null && item.purchasePrice !== undefined ? `₹${item.purchasePrice.toLocaleString("en-IN")}` : <span style={{ color: "var(--tx3)" }}>—</span>}
                </span>
              </div>
              <div className="row-item">
                <span className="text-[11px] text-tx3">Total Asset Valuation</span>
                <span className="text-[13px] font-semibold text-gr">
                  {item.purchasePrice !== null && item.purchasePrice !== undefined ? `₹${(item.purchasePrice * item.quantity).toLocaleString("en-IN")}` : <span style={{ color: "var(--tx3)" }}>—</span>}
                </span>
              </div>
            </div>

            {/* Kit Associations */}
            <div className="card">
              <div className="card-t">Kit Associations</div>
              {item.kit && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--tx3)" }}>Accessory in Kit:</span>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--tx)", marginTop: "4px" }}>
                      {item.kit.name}
                    </div>
                  </div>
                  <Link href={`/kits?kitId=${item.kit.id}`} className="btn" style={{ padding: "4px 8px", fontSize: "11px" }}>
                    View Kit
                  </Link>
                </div>
              )}
              {item.mainBodyOfKit && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--tx3)" }}>Main Body of Kit:</span>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--tx)", marginTop: "4px" }}>
                      {item.mainBodyOfKit.name}
                    </div>
                  </div>
                  <Link href={`/kits?kitId=${item.mainBodyOfKit.id}`} className="btn" style={{ padding: "4px 8px", fontSize: "11px" }}>
                    View Kit
                  </Link>
                </div>
              )}
              {!item.kit && !item.mainBodyOfKit && (
                <div style={{ color: "var(--tx3)", fontSize: "12px", fontStyle: "italic" }}>
                  This equipment item is not associated with any kit.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Active Status and History */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Active Booking Banner */}
            <div className="card" style={{ padding: "16px" }}>
              <div className="card-t">Current Booking Status</div>
              {activeBooking ? (
                <div style={{
                  background: activeBooking.status === "OUT" ? "var(--sem-bl-bg)" : "var(--sem-am-bg)",
                  border: `1px solid ${activeBooking.status === "OUT" ? "var(--sem-bl-bdr)" : "var(--sem-am-bdr)"}`,
                  color: activeBooking.status === "OUT" ? "var(--sem-bl-tx)" : "var(--sem-am-tx)",
                  padding: "12px", borderRadius: "8px", fontSize: "12px", display: "flex", flexDirection: "column", gap: "8px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ textTransform: "uppercase", fontSize: "10.5px" }}>
                      {activeBooking.status === "OUT" ? "Currently Out" : "Booked"}
                    </strong>
                    <Badge variant={activeBooking.status === "OUT" ? "bl" : "am"}>{activeBooking.status}</Badge>
                  </div>
                  <div>
                    <span style={{ color: "var(--tx2)", fontSize: "11px" }}>Event:</span>
                    <div style={{ fontWeight: 600, color: "var(--tx)" }}>{activeBooking.eventType}</div>
                  </div>
                  <div>
                    <span style={{ color: "var(--tx2)", fontSize: "11px" }}>Client:</span>
                    <div style={{ fontWeight: 500, color: "var(--tx)" }}>{activeBooking.clientName}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <span style={{ color: "var(--tx3)", fontSize: "10.5px" }}>Booked From:</span>
                      <div>{activeBooking.bookedFrom}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--tx3)", fontSize: "10.5px" }}>Booked To:</span>
                      <div>{activeBooking.bookedTo}</div>
                    </div>
                  </div>

                  {activeBooking.vendorName && (
                    <div style={{ borderTop: "1px solid var(--b2)", paddingTop: "8px", marginTop: "4px" }}>
                      <span style={{ color: "var(--tx3)", fontSize: "10.5px" }}>Rented From:</span>
                      <div style={{ fontWeight: 500 }}>{activeBooking.vendorName}</div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: "100%", marginTop: "8px", fontSize: "11px" }}
                    onClick={() => handleReturn(activeBooking.id)}
                    disabled={returningId === activeBooking.id}
                  >
                    {returningId === activeBooking.id ? "Returning..." : "✓ Mark as Returned"}
                  </button>
                </div>
              ) : (
                <div style={{
                  background: "var(--sem-gr-bg)",
                  border: "1px solid var(--sem-gr-bdr)",
                  color: "var(--sem-gr-tx)",
                  padding: "12px", borderRadius: "8px", fontSize: "12px", textAlign: "center"
                }}>
                  <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}>✓ Available</div>
                  <span style={{ color: "var(--tx2)", fontSize: "11.5px" }}>This item is currently in the warehouse and ready for booking.</span>
                </div>
              )}
            </div>

            {/* Operational Notes Summary */}
            {item.notes && (
              <div className="card">
                <div className="card-t">Notes & Info</div>
                <div style={{ fontSize: "12px", color: "var(--tx2)", lineHeight: "1.5", fontStyle: "italic", wordBreak: "break-word", overflowWrap: "break-word" }}>
                  &ldquo;{item.notes}&rdquo;
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Booking History Log */}
        <div className="card" style={{ marginTop: "20px" }}>
          <div className="card-t">Booking History Log</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Event & Inquiry</th>
                <th>Client</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {!item.bookings || item.bookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-tx3">
                    No booking records found for this equipment.
                  </td>
                </tr>
              ) : (
                item.bookings.map((booking: any) => (
                  <tr key={booking.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: "var(--tx)" }}>{booking.eventType}</div>
                      <Link href={`/warehouse/check?inquiryId=${booking.inquiryId}`} style={{ fontSize: "10.5px", color: "var(--tx3)" }}>
                        Inquiry: {booking.inquiryId}
                      </Link>
                    </td>
                    <td>{booking.clientName}</td>
                    <td>
                      <div style={{ fontSize: "11px" }}>{booking.bookedFrom} to {booking.bookedTo}</div>
                    </td>
                    <td>
                      <Badge variant={booking.status === "RETURNED" ? "gr" : booking.status === "OUT" ? "bl" : "am"}>
                        {booking.status}
                      </Badge>
                    </td>
                    <td>
                      {booking.vendorName ? (
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 500 }}>Vendor Rental</div>
                          <div style={{ fontSize: "9.5px", color: "var(--tx3)" }}>{booking.vendorName}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--tx3)" }}>In-house stock</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
