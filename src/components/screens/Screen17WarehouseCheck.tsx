"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import * as api from "@/lib/api";
import type { Vendor } from "@/lib/types";

function formatSerialNumber(sn: string | null | undefined): string {
  if (!sn) return "None";
  const clean = sn.replace(/\s+/g, " ").trim();
  if (clean.length > 25) {
    return clean.substring(0, 22) + "...";
  }
  return clean;
}

export default function Screen17WarehouseCheck() {
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("inquiryId");

  const [data, setData] = useState<api.WarehouseCheckResult | null>(null);
  const [vendors, setVendors] = useState<(Vendor & { timesUsed: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // States for row assignments in progress
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});
  const [handoverLoading, setHandoverLoading] = useState<Record<number, boolean>>({});
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [vendorRates, setVendorRates] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!inquiryId) return;
    let active = true;

    const loadData = async () => {
      try {
        await Promise.resolve(); // yields execution to make state changes async and prevent rendering cascade
        if (!active) return;
        setLoading(true);
        const [whData, vendorList] = await Promise.all([
          api.fetchWarehouseCheck(inquiryId),
          api.fetchVendors(),
        ]);
        if (!active) return;
        setData(whData);
        setVendors(vendorList.filter((v) => v.isActive));
      } catch (err: any) {
        console.error("Failed to load warehouse check data:", err);
        if (!active) return;
        setError(err.message || "Failed to load warehouse check data");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [inquiryId]);

  // Helper: Match quotation row with available equipment
  const getAvailableMatches = useCallback((equipName: string) => {
    if (!data) return { equipment: [], kits: [] };
    const query = equipName.toLowerCase();
    
    // Find unbooked kits
    const matchingKits = data.kits.filter(
      (kit) =>
        (kit.name.toLowerCase().includes(query) || query.includes("kit")) &&
        kit.availabilityStatus === "AVAILABLE" &&
        !kit.bookedForThisInquiry
    );

    // Find unbooked equipment
    const matchingEquip = data.equipment.filter(
      (eq) =>
        (eq.productName.toLowerCase().includes(query) || query.includes(eq.productName.toLowerCase())) &&
        !eq.isBookedForRange &&
        eq.status === "AVAILABLE" &&
        !eq.bookedForThisInquiry
    );

    return {
      kits: matchingKits,
      equipment: matchingEquip,
    };
  }, [data]);

  // Memoized quotation rows mapping with their status
  const mappedQuotationRows = useMemo(() => {
    if (!data || !data.quotation) return [];
    
    return data.quotation.equipment.map((row) => {
      const positionStr = row.no.toString();
      const booking = data.bookings.find((b) => b.position === positionStr);
      
      let matchedInhouseItem: any = null;
      let matchedVendor: any = null;

      if (booking) {
        if (booking.equipmentId) {
          matchedInhouseItem = data.equipment.find((eq) => eq.id === booking.equipmentId);
        } else if (booking.kitId) {
          matchedInhouseItem = data.kits.find((k) => k.id === booking.kitId);
        }

        if (booking.vendorId) {
          matchedVendor = vendors.find((v) => v.id === booking.vendorId);
        }
      }

      // If not booked, see if we have available stock
      const { kits: avKits, equipment: avEquip } = getAvailableMatches(row.equip);
      const hasAvailableStock = avKits.length > 0 || avEquip.length > 0;

      return {
        row,
        booking,
        matchedInhouseItem,
        matchedVendor,
        hasAvailableStock,
        availableKits: avKits,
        availableEquipment: avEquip,
      };
    });
  }, [data, vendors, getAvailableMatches]);

  // Metrics
  const metrics = useMemo(() => {
    if (!mappedQuotationRows.length) return { total: 0, available: 0, vendor: 0, confirmed: 0 };
    
    let availableCount = 0;
    let vendorCount = 0;
    let confirmedCount = 0;

    mappedQuotationRows.forEach(({ booking, hasAvailableStock }) => {
      if (booking) {
        confirmedCount++;
        if (booking.vendorId) vendorCount++;
        else availableCount++;
      } else {
        if (hasAvailableStock) availableCount++;
        else vendorCount++;
      }
    });

    return {
      total: mappedQuotationRows.length,
      available: availableCount,
      vendor: vendorCount,
      confirmed: confirmedCount,
    };
  }, [mappedQuotationRows]);

  // Action handlers
  const handleAssignInhouse = async (rowNo: number, selectionValue: string) => {
    if (!data || !inquiryId) return;
    const positionStr = rowNo.toString();
    const [type, idStr] = selectionValue.split("-");
    const id = parseInt(idStr, 10);

    try {
      setSavingRows((prev) => ({ ...prev, [positionStr]: true }));
      await api.createEquipmentBooking({
        inquiryId,
        equipmentId: type === "eq" ? id : null,
        kitId: type === "kit" ? id : null,
        position: positionStr,
        bookedFrom: data.inquiry.startDate,
        bookedTo: data.inquiry.endDate,
      });

      setToastMessage(`Row #${rowNo} assigned successfully!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);

      // Refresh data
      const updatedWh = await api.fetchWarehouseCheck(inquiryId);
      setData(updatedWh);
    } catch (err: any) {
      alert(err.message || "Failed to assign equipment");
    } finally {
      setSavingRows((prev) => ({ ...prev, [positionStr]: false }));
    }
  };

  const handleAssignVendor = async (rowNo: number, vendorIdStr: string, rateStr: string) => {
    if (!data || !inquiryId || !vendorIdStr || !rateStr) return;
    const positionStr = rowNo.toString();
    const vendorId = parseInt(vendorIdStr, 10);
    const rate = parseFloat(rateStr);

    try {
      setSavingRows((prev) => ({ ...prev, [positionStr]: true }));
      await api.createEquipmentBooking({
        inquiryId,
        vendorId,
        vendorCostPerDay: rate,
        position: positionStr,
        bookedFrom: data.inquiry.startDate,
        bookedTo: data.inquiry.endDate,
      });

      setToastMessage(`Row #${rowNo} assigned to rental vendor!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);

      const updatedWh = await api.fetchWarehouseCheck(inquiryId);
      setData(updatedWh);
    } catch (err: any) {
      alert(err.message || "Failed to assign vendor");
    } finally {
      setSavingRows((prev) => ({ ...prev, [positionStr]: false }));
    }
  };

  const handleConfirmHandover = async (bookingId: number) => {
    try {
      setHandoverLoading((prev) => ({ ...prev, [bookingId]: true }));
      await api.confirmEquipmentBooking(bookingId);
      
      setToastMessage("Handover confirmed (Status set to OUT)!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);

      const updatedWh = await api.fetchWarehouseCheck(inquiryId!);
      setData(updatedWh);
    } catch (err: any) {
      alert(err.message || "Failed to confirm handover");
    } finally {
      setHandoverLoading((prev) => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleReturnItem = async (bookingId: number) => {
    try {
      setHandoverLoading((prev) => ({ ...prev, [bookingId]: true }));
      await api.returnEquipmentBooking(bookingId);
      
      setToastMessage("Item returned to warehouse!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);

      const updatedWh = await api.fetchWarehouseCheck(inquiryId!);
      setData(updatedWh);
    } catch (err: any) {
      alert(err.message || "Failed to return item");
    } finally {
      setHandoverLoading((prev) => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleBulkConfirmHandovers = async () => {
    if (!data) return;
    const bookedIds = data.bookings
      .filter((b) => b.status === "BOOKED")
      .map((b) => b.id);

    if (bookedIds.length === 0) {
      alert("No pending bookings to confirm handover.");
      return;
    }

    if (!confirm(`Are you sure you want to bulk-confirm handover for all ${bookedIds.length} booked item(s)? This will set their statuses to OUT.`)) {
      return;
    }

    try {
      setBulkConfirming(true);
      await api.bulkConfirmBookings(bookedIds);
      setToastMessage("Bulk handover confirmed successfully!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);

      const updatedWh = await api.fetchWarehouseCheck(inquiryId!);
      setData(updatedWh);
    } catch (err: any) {
      alert(err.message || "Bulk handover confirmation failed");
    } finally {
      setBulkConfirming(false);
    }
  };

  const getEventDays = () => {
    if (!data) return 0;
    const start = new Date(data.inquiry.startDate);
    const end = new Date(data.inquiry.endDate);
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  if (loading) {
    return (
      <>
        <SectionHeader title="Warehouse Availability Check" />
        <ScreenFrame breadcrumb="Warehouse › Check">
          <div style={{ padding: "30px" }}>
            <LoadingSkeleton rows={8} message="Performing inventory audit and calendar overlap calculations..." />
          </div>
        </ScreenFrame>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <SectionHeader title="Warehouse Availability Check" />
        <ScreenFrame breadcrumb="Warehouse › Check">
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-60">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <div className="text-[16px] font-medium text-tx2 mb-1">Inquiry not found</div>
              <div className="text-[12px] text-tx3">{error || "Provide a valid inquiryId parameter."}</div>
              <Link href="/calendar" className="btn mt-4 inline-block">← Back to Calendar</Link>
            </div>
          </div>
        </ScreenFrame>
      </>
    );
  }

  const eventDays = getEventDays();

  // Filter quotation rows into Green (Available Stock) and Amber (Conflicts / Vendor Fallback)
  const greenRows = mappedQuotationRows.filter((r) => r.hasAvailableStock || (r.booking && !r.booking.vendorId));
  const amberRows = mappedQuotationRows.filter((r) => !r.hasAvailableStock && (!r.booking || r.booking.vendorId));

  return (
    <>
      <SectionHeader
        title={<>Warehouse <strong>Availability Check</strong></>}
        description="Audit required equipment against active calendar dates, assign inventory specific serials, or delegate to rental vendors."
      />

      {/* Event Details Ribbon */}
      <div className="card" style={{ background: "var(--alt2)", borderLeft: "4px solid var(--bl)", padding: "16px", marginBottom: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr", gap: "20px" }}>
          <div>
            <span style={{ fontSize: "10px", color: "var(--tx3)", textTransform: "uppercase" }}>Event / Client</span>
            <div style={{ fontWeight: 600, color: "var(--tx)", fontSize: "14px", marginTop: "2px" }}>
              {data.inquiry.eventType}
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--tx2)", marginTop: "2px" }}>
              Inquiry: <strong>#{data.inquiry.id}</strong>
            </div>
          </div>
          <div>
            <span style={{ fontSize: "10px", color: "var(--tx3)", textTransform: "uppercase" }}>Dates & Duration</span>
            <div style={{ fontWeight: 500, color: "var(--tx)", fontSize: "13px", marginTop: "2px" }}>
              {data.inquiry.startDate} to {data.inquiry.endDate}
            </div>
            <div style={{ fontSize: "11px", color: "var(--tx3)", marginTop: "2px" }}>
              Duration: <strong>{eventDays} day(s)</strong>
            </div>
          </div>
          <div>
            <span style={{ fontSize: "10px", color: "var(--tx3)", textTransform: "uppercase" }}>Venue</span>
            <div style={{ fontSize: "12px", color: "var(--tx2)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {data.inquiry.venue || "No venue assigned"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "10px", color: "var(--tx3)", textTransform: "uppercase" }}>Quote Reference</span>
            <div style={{ fontWeight: 600, color: "var(--tx2)", fontSize: "13px", marginTop: "2px" }}>
              {data.quotation?.quoteNo || "No Quotation"}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics" style={{ marginBottom: "20px" }}>
        <div className="met">
          <div className="met-l">Total Items Needed</div>
          <div className="met-v">{metrics.total}</div>
        </div>
        <div className="met">
          <div className="met-l">Available In-Stock</div>
          <div className="met-v g">{metrics.available}</div>
        </div>
        <div className="met">
          <div className="met-l">External Rental Needed</div>
          <div className="met-v a">{metrics.vendor}</div>
        </div>
        <div className="met">
          <div className="met-l">Assignments Confirmed</div>
          <div className="met-v b">{metrics.confirmed} of {metrics.total}</div>
        </div>
      </div>

      <ScreenFrame
        breadcrumb={<>Warehouse check › Inquiry #{data.inquiry.id}</>}
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleBulkConfirmHandovers}
              disabled={bulkConfirming || data.bookings.filter(b => b.status === "BOOKED").length === 0}
            >
              {bulkConfirming ? "Confirming..." : "✓ Bulk Confirm Handover (Set OUT)"}
            </button>
          </div>
        }
      >
        {/* GREEN LIST: BK STOCK AVAILABLE */}
        <div className="card" style={{ borderLeft: "5px solid var(--gr)", marginBottom: "25px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h4 style={{ margin: 0, color: "var(--gr)", fontWeight: 600, fontSize: "14px" }}>
              🟢 BK Media Stock Available ({greenRows.length})
            </h4>
            <span style={{ fontSize: "11px", color: "var(--tx3)" }}>BK owned equipment with no calendar overlaps</span>
          </div>

          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: "50px" }}>No.</th>
                <th>Item Desired (Quotation Row)</th>
                <th>Required Category</th>
                <th>Assigned Inventory Unit / Kit</th>
                <th style={{ width: "120px" }}>Status</th>
                <th style={{ width: "200px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {greenRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-tx3" style={{ fontStyle: "italic" }}>
                    No items in this quotation match available BK stock. Check external rental vendor list below.
                  </td>
                </tr>
              ) : (
                greenRows.map(({ row, booking, matchedInhouseItem, availableKits, availableEquipment }) => {
                  const positionStr = row.no.toString();
                  const isSaving = savingRows[positionStr];
                  const selectKey = `select-${positionStr}`;

                  return (
                    <tr key={row.no}>
                      <td>#{row.no}</td>
                      <td>
                        <strong style={{ color: "var(--tx)" }}>{row.equip}</strong>
                        {row.position && <div style={{ fontSize: "10px", color: "var(--tx3)", marginTop: "2px" }}>Pos: {row.position}</div>}
                      </td>
                      <td>
                        <span style={{ fontSize: "11px", textTransform: "capitalize" }}>
                          {row.equip.toLowerCase().includes("camera") ? "Camera" : "Accessory / Other"}
                        </span>
                      </td>
                      <td>
                        {booking ? (
                          matchedInhouseItem ? (
                            <div>
                              <div style={{ fontWeight: 500 }}>{matchedInhouseItem.name || matchedInhouseItem.productName}</div>
                              {matchedInhouseItem.serialNumber && (
                                <div style={{ fontSize: "10px", color: "var(--tx3)", marginTop: "2px" }}>
                                  S/N: <span style={{ fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{matchedInhouseItem.serialNumber}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "var(--tx2)" }}>In-house stock (Details loading...)</span>
                          )
                        ) : (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <select
                              id={selectKey}
                              className="fsel"
                              style={{ width: "100%", fontSize: "11.5px", padding: "4px 8px" }}
                              defaultValue=""
                              disabled={isSaving}
                            >
                              <option value="">-- Select Available In-house Item --</option>
                              {/* Kits Group */}
                              {availableKits.length > 0 && (
                                <optgroup label="Available Kits">
                                  {availableKits.map(k => (
                                    <option key={`kit-${k.id}`} value={`kit-${k.id}`}>
                                      [KIT] {k.name}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              {/* Individual Equipment Group */}
                              {availableEquipment.length > 0 && (
                                <optgroup label="Available Equipment">
                                  {availableEquipment.map(eq => (
                                    <option key={`eq-${eq.id}`} value={`eq-${eq.id}`}>
                                      {eq.productName} (S/N: {formatSerialNumber(eq.serialNumber)})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                          </div>
                        )}
                      </td>
                      <td>
                        {booking ? (
                          <Badge variant={booking.status === "RETURNED" ? "gr" : booking.status === "OUT" ? "bl" : "am"}>
                            {booking.status === "OUT" ? "OUT (At Event)" : booking.status}
                          </Badge>
                        ) : (
                          <span style={{ fontSize: "11px", color: "var(--tx3)", fontStyle: "italic" }}>Unassigned</span>
                        )}
                      </td>
                      <td>
                        {booking ? (
                          <div style={{ display: "flex", gap: "6px" }}>
                            {booking.status === "BOOKED" && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: "4px 8px", fontSize: "11px" }}
                                onClick={() => handleConfirmHandover(booking.id)}
                                disabled={handoverLoading[booking.id]}
                              >
                                {handoverLoading[booking.id] ? "Confirming..." : "Handover Out"}
                              </button>
                            )}
                            {booking.status === "OUT" && (
                              <button
                                type="button"
                                className="btn"
                                style={{ padding: "4px 8px", fontSize: "11px", color: "var(--gr)" }}
                                onClick={() => handleReturnItem(booking.id)}
                                disabled={handoverLoading[booking.id]}
                              >
                                {handoverLoading[booking.id] ? "Returning..." : "✓ Return Item"}
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-success"
                            style={{ width: "120px", padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => {
                              const el = document.getElementById(selectKey) as HTMLSelectElement;
                              if (el && el.value) {
                                handleAssignInhouse(row.no, el.value);
                              } else {
                                alert("Please select an item from the dropdown first.");
                              }
                            }}
                            disabled={isSaving}
                          >
                            {isSaving ? "Saving..." : "Confirm Book"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* AMBER LIST: CONFLICTS / VENDOR FALLBACK */}
        <div className="card" style={{ borderLeft: "5px solid var(--am)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h4 style={{ margin: 0, color: "var(--am)", fontWeight: 600, fontSize: "14px" }}>
              🟡 Rental Vendor Fallback Required ({amberRows.length})
            </h4>
            <span style={{ fontSize: "11px", color: "var(--tx3)" }}>Items with calendar conflicts or not owned by BK Media</span>
          </div>

          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: "50px" }}>No.</th>
                <th>Item Desired (Quotation Row)</th>
                <th>Assign Rental Vendor</th>
                <th style={{ width: "130px" }}>Cost per Day</th>
                <th style={{ width: "110px" }}>Total Rental Cost</th>
                <th style={{ width: "200px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {amberRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-tx3" style={{ fontStyle: "italic" }}>
                    No inventory conflicts detected! All quotation items are covered by in-house stock.
                  </td>
                </tr>
              ) : (
                amberRows.map(({ row, booking, matchedVendor }) => {
                  const positionStr = row.no.toString();
                  const isSaving = savingRows[positionStr];
                  
                  // Setup unique keys for local fields
                  const selectVendorKey = `vendor-${positionStr}`;
                  const rateInputKey = `rate-${positionStr}`;

                  // State values tracker for live UI calculations
                  const tempRate = vendorRates[positionStr] ?? (booking?.vendorCostPerDay?.toString() || "");
                  const calculatedTotal = parseFloat(tempRate) ? parseFloat(tempRate) * eventDays : 0;

                  return (
                    <tr key={row.no}>
                      <td>#{row.no}</td>
                      <td>
                        <strong style={{ color: "var(--tx)" }}>{row.equip}</strong>
                        {row.position && <div style={{ fontSize: "10px", color: "var(--tx3)", marginTop: "2px" }}>Pos: {row.position}</div>}
                        <div style={{ fontSize: "10px", color: "var(--rd)", marginTop: "2px", fontWeight: 500 }}>
                          ⚠️ Stock Unavailable (Out / Booked)
                        </div>
                      </td>
                      <td>
                        {booking ? (
                          matchedVendor ? (
                            <div>
                              <div style={{ fontWeight: 600 }}>{matchedVendor.name}</div>
                              <div style={{ fontSize: "10.5px", color: "var(--tx3)", marginTop: "2px" }}>
                                Spec: {matchedVendor.specialization || "General"}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "var(--tx2)" }}>Vendor assigned (Loading...)</span>
                          )
                        ) : (
                          <select
                            id={selectVendorKey}
                            className="fsel"
                            style={{ width: "100%", fontSize: "11.5px", padding: "4px 8px" }}
                            defaultValue=""
                            disabled={isSaving}
                          >
                            <option value="">-- Choose Rental Vendor --</option>
                            {vendors.map(v => (
                              <option key={v.id} value={v.id}>
                                {v.name} ({v.specialization || "Generic"})
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        {booking ? (
                          <span style={{ fontWeight: 500 }}>₹{(booking.vendorCostPerDay || 0).toLocaleString("en-IN")}</span>
                        ) : (
                          <input
                            id={rateInputKey}
                            type="number"
                            placeholder="Rate/day"
                            className="finp"
                            style={{ padding: "4px 8px", fontSize: "11.5px", width: "100px" }}
                            value={tempRate}
                            onChange={(e) => setVendorRates(prev => ({ ...prev, [positionStr]: e.target.value }))}
                            disabled={isSaving}
                          />
                        )}
                      </td>
                      <td>
                        {booking ? (
                          <span style={{ fontWeight: 600, color: "var(--rd)" }}>
                            ₹{(booking.totalVendorCost || 0).toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span style={{ fontWeight: 600, color: calculatedTotal > 0 ? "var(--rd)" : "var(--tx3)", fontSize: "12px" }}>
                            {calculatedTotal > 0 ? `₹${calculatedTotal.toLocaleString("en-IN")}` : "₹0"}
                          </span>
                        )}
                      </td>
                      <td>
                        {booking ? (
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <Badge variant={booking.status === "RETURNED" ? "gr" : booking.status === "OUT" ? "bl" : "am"}>
                              {booking.status}
                            </Badge>
                            {booking.status === "BOOKED" && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: "2px 6px", fontSize: "10.5px" }}
                                onClick={() => handleConfirmHandover(booking.id)}
                                disabled={handoverLoading[booking.id]}
                              >
                                Handover Out
                              </button>
                            )}
                            {booking.status === "OUT" && (
                              <button
                                type="button"
                                className="btn"
                                style={{ padding: "2px 6px", fontSize: "10.5px", color: "var(--gr)" }}
                                onClick={() => handleReturnItem(booking.id)}
                                disabled={handoverLoading[booking.id]}
                              >
                                Returned
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ width: "130px", padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => {
                              const vendorEl = document.getElementById(selectVendorKey) as HTMLSelectElement;
                              if (vendorEl && vendorEl.value && tempRate) {
                                handleAssignVendor(row.no, vendorEl.value, tempRate);
                              } else {
                                alert("Please select a vendor and enter their rental rate.");
                              }
                            }}
                            disabled={isSaving || !tempRate}
                          >
                            {isSaving ? "Saving..." : "Assign & Book"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
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
