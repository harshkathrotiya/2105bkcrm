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
import { useInvoices, useInquiries } from "@/lib/store";

function formatSerialNumber(sn: string | null | undefined): string {
  if (!sn) return "None";
  const clean = sn.replace(/\s+/g, " ").trim();
  if (clean.length > 25) {
    return clean.substring(0, 22) + "...";
  }
  return clean;
}

function normalizeEquipmentName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getEquipmentSearchTerms(equipName: string): string[] {
  const query = normalizeEquipmentName(equipName);
  const terms = new Set<string>([query]);

  if (query.includes("fs6")) terms.add("fx6");
  if (query.includes("fx6")) terms.add("fx6");
  if (query.includes("fx3")) terms.add("fx3");
  if (query.includes("wireless")) terms.add("wireless");
  if (query.includes("dslr")) {
    terms.add("camera");
    terms.add("alpha");
  }
  if (query.includes("crane")) terms.add("crane");

  return [...terms].filter(Boolean);
}

function equipmentMatchesSearch(candidate: string, terms: string[]): boolean {
  const normalizedCandidate = normalizeEquipmentName(candidate);
  return terms.some((term) => normalizedCandidate.includes(term));
}

export default function Screen17WarehouseCheck() {
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("inquiryId");

  const [data, setData] = useState<api.WarehouseCheckResult | null>(null);
  const { invoices } = useInvoices();
  const { inquiries } = useInquiries();
  const invoice = data?.quotation ? invoices.find((inv) => inv.quotationId === data.quotation?.id) : null;
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

  // Logistics states
  const [dispatchDate, setDispatchDate] = useState("");
  const [dispatchTime, setDispatchTime] = useState("");
  const [vehicle1Number, setVehicle1Number] = useState("");
  const [vehicle1Driver, setVehicle1Driver] = useState("");
  const [vehicle2Number, setVehicle2Number] = useState("");
  const [vehicle2Driver, setVehicle2Driver] = useState("");
  const [savingLogistics, setSavingLogistics] = useState(false);

  useEffect(() => {
    if (!inquiryId) {
      setLoading(false);
      return;
    }
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
        
        if (whData.inquiry) {
          setDispatchDate(whData.inquiry.dispatchDate || whData.inquiry.startDate || "");
          setDispatchTime(whData.inquiry.dispatchTime || "06:00 AM");
          setVehicle1Number(whData.inquiry.vehicle1Number || "");
          setVehicle1Driver(whData.inquiry.vehicle1Driver || "");
          setVehicle2Number(whData.inquiry.vehicle2Number || "");
          setVehicle2Driver(whData.inquiry.vehicle2Driver || "");
        }
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
    const searchTerms = getEquipmentSearchTerms(equipName);
    
    // Find unbooked kits
    const matchingKits = data.kits.filter(
      (kit) =>
        equipmentMatchesSearch(`${kit.name} ${kit.description ?? ""}`, searchTerms) &&
        kit.availabilityStatus === "AVAILABLE" &&
        !kit.bookedForThisInquiry
    );

    // Find unbooked equipment
    const matchingEquip = data.equipment.filter(
      (eq) =>
        equipmentMatchesSearch(
          `${eq.productName} ${eq.category ?? ""} ${eq.kitName ?? ""}`,
          searchTerms
        ) &&
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
      const booking = data.bookings.find(
        (b) => b.position === positionStr || b.position === row.position
      );
      
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

    // Try to resolve matching kitId or equipmentId by name
    let resolvedEquipmentId: number | null = null;
    let resolvedKitId: number | null = null;

    const rowObj = data.quotation?.equipment?.find((r: any) => r.no === rowNo);
    if (rowObj && rowObj.equip) {
      const equipNameLower = rowObj.equip.toLowerCase();
      
      const matchingKit = data.kits?.find((k: any) => k.name.toLowerCase() === equipNameLower);
      if (matchingKit) {
        resolvedKitId = matchingKit.id;
      } else {
        const matchingEquip = data.equipment?.find((eq: any) => eq.productName.toLowerCase() === equipNameLower);
        if (matchingEquip) {
          resolvedEquipmentId = matchingEquip.id;
        }
      }
    }

    try {
      setSavingRows((prev) => ({ ...prev, [positionStr]: true }));
      await api.createEquipmentBooking({
        inquiryId,
        vendorId,
        vendorCostPerDay: rate,
        position: positionStr,
        bookedFrom: data.inquiry.startDate,
        bookedTo: data.inquiry.endDate,
        equipmentId: resolvedEquipmentId,
        kitId: resolvedKitId,
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

  const ledAssetSummary = useMemo(() => {
    if (!data) return [];
    
    // Count bookings of each category
    const panelBooked = data.bookings.filter(b => {
      const eq = data.equipment.find(e => e.id === b.equipmentId);
      return eq?.category === "LED_PANEL";
    }).length;

    const procBooked = data.bookings.filter(b => {
      const eq = data.equipment.find(e => e.id === b.equipmentId);
      return eq?.category === "LED_PROCESSOR";
    }).length;

    const cableBooked = data.bookings.filter(b => {
      const eq = data.equipment.find(e => e.id === b.equipmentId);
      return eq?.category === "LED_CABLE";
    }).length;

    const accBooked = data.bookings.filter(b => {
      const eq = data.equipment.find(e => e.id === b.equipmentId);
      return eq?.category === "LED_ACCESSORY";
    }).length;

    return [
      { name: "LED Panels", category: "LED_PANEL", needed: data.inquiry.totalCabinets || 0, assigned: panelBooked },
      { name: "LED Processors", category: "LED_PROCESSOR", needed: data.inquiry.totalCabinets ? Math.ceil(data.inquiry.totalCabinets / 100) : 1, assigned: procBooked },
      { name: "LED Cables (Power & Data)", category: "LED_CABLE", needed: data.inquiry.totalCabinets ? Math.ceil(data.inquiry.totalCabinets * 1.2) : 0, assigned: cableBooked },
      { name: "LED Accessories / Rigging", category: "LED_ACCESSORY", needed: data.inquiry.totalCabinets ? Math.ceil(data.inquiry.totalCabinets / 10) : 0, assigned: accBooked }
    ];
  }, [data]);

  const handleSaveLogistics = async () => {
    if (!data || !inquiryId) return;
    try {
      setSavingLogistics(true);
      await api.updateInquiry(inquiryId, {
        dispatchDate: dispatchDate || undefined,
        dispatchTime: dispatchTime || undefined,
        vehicle1Number: vehicle1Number || undefined,
        vehicle1Driver: vehicle1Driver || undefined,
        vehicle2Number: vehicle2Number || undefined,
        vehicle2Driver: vehicle2Driver || undefined,
      });
      setToastMessage("Logistics details saved successfully!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
      
      // Refresh
      const updatedWh = await api.fetchWarehouseCheck(inquiryId);
      setData(updatedWh);
    } catch (err: any) {
      alert(err.message || "Failed to save logistics");
    } finally {
      setSavingLogistics(false);
    }
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

  if (!inquiryId) {
    return (
      <>
        <SectionHeader title="Warehouse Availability Check" />
        <ScreenFrame breadcrumb="Warehouse › Check">
          <div className="card" style={{ padding: "20px" }}>
            <div className="card-t" style={{ marginBottom: "16px", fontSize: "14px", fontWeight: 600 }}>Select an Inquiry to Audit</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {inquiries.length === 0 ? (
                <div className="text-center py-6 text-tx3" style={{ fontStyle: "italic" }}>No inquiries available.</div>
              ) : (
                inquiries.map((inq) => (
                  <div
                    key={inq.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "var(--s2)",
                      border: "1px solid var(--b1)",
                      borderRadius: "8px",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "13px", color: "var(--tx)" }}>{inq.eventName || "Unnamed Event"}</strong>
                      <div style={{ fontSize: "10px", color: "var(--tx3)", marginTop: "2px" }}>
                        Dates: {inq.startDate} to {inq.endDate} · Department: {inq.department || "VIDEO"}
                      </div>
                    </div>
                    <Link href={`/warehouse/check?inquiryId=${inq.id}`} className="btn btn-primary text-[11px] py-1.5 px-3">
                      Run Audit ↗
                    </Link>
                  </div>
                ))
              )}
            </div>
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
            <div style={{ fontWeight: 600, color: "var(--tx)", fontSize: "15px", marginTop: "2px" }}>
              {(data.inquiry as any).eventName || data.inquiry.eventType}
            </div>
            <div style={{ fontSize: "12px", color: "var(--tx2)", marginTop: "2px" }}>
              Client: <strong>{(data.inquiry as any).clientName || "—"}</strong>
            </div>
            <div style={{ fontSize: "11px", color: "var(--tx3)", marginTop: "2px" }}>
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
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Link href={inquiryId ? `/inquiries/${inquiryId}` : "/inquiries"} className="btn">
              ← Back to inquiry
            </Link>
            {data?.quotation && (
              <Link href={`/quotations/${data.quotation.id}/pdf`} className="btn">
                📋 Quotation
              </Link>
            )}
            {invoice && (
              <Link href={`/invoices/${invoice.id}`} className="btn">
                📄 Invoice
              </Link>
            )}
            <Link
              href={`/staff/assign?inquiryId=${inquiryId}`}
              className="btn btn-warning"
            >
              → Assign Positions
            </Link>
            <Link
              href={`/staff/payments?inquiryId=${inquiryId}`}
              className="btn"
            >
              💵 Staff Payments
            </Link>
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
        {/* LED logistics & requirements sections */}
        {(data.inquiry.department === 'LED' || data.inquiry.department === 'MERGED') && (
          <div className="grid grid-cols-2 gap-4" style={{ marginBottom: "25px" }}>
            {/* LED Logistics Card */}
            <div className="card">
              <div className="card-t">LED Dispatch & Logistics</div>
              <div className="fgrid text-[11px]" style={{ gap: "10px" }}>
                <div className="field">
                  <div className="flbl">Dispatch Date</div>
                  <input
                    type="date"
                    className="finp"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <div className="flbl">Dispatch Time</div>
                  <input
                    type="text"
                    className="finp"
                    placeholder="e.g. 06:00 AM"
                    value={dispatchTime}
                    onChange={(e) => setDispatchTime(e.target.value)}
                  />
                </div>
                <div className="field">
                  <div className="flbl">Vehicle 1 Number</div>
                  <input
                    type="text"
                    className="finp"
                    placeholder="e.g. GJ-06-XX-1234"
                    value={vehicle1Number}
                    onChange={(e) => setVehicle1Number(e.target.value)}
                  />
                </div>
                <div className="field">
                  <div className="flbl">Vehicle 1 Driver</div>
                  <input
                    type="text"
                    className="finp"
                    placeholder="Driver Name"
                    value={vehicle1Driver}
                    onChange={(e) => setVehicle1Driver(e.target.value)}
                  />
                </div>
                <div className="field">
                  <div className="flbl">Vehicle 2 Number</div>
                  <input
                    type="text"
                    className="finp"
                    placeholder="e.g. GJ-06-YY-5678"
                    value={vehicle2Number}
                    onChange={(e) => setVehicle2Number(e.target.value)}
                  />
                </div>
                <div className="field">
                  <div className="flbl">Vehicle 2 Driver</div>
                  <input
                    type="text"
                    className="finp"
                    placeholder="Driver Name"
                    value={vehicle2Driver}
                    onChange={(e) => setVehicle2Driver(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary w-full justify-center"
                style={{ marginTop: "12px" }}
                onClick={handleSaveLogistics}
                disabled={savingLogistics}
              >
                {savingLogistics ? "Saving logistics..." : "Save Logistics Details"}
              </button>
            </div>

            {/* LED Checklist Card */}
            <div className="card">
              <div className="card-t">📋 LED Required Checklist</div>
              <table className="tbl text-[11px]">
                <thead>
                  <tr>
                    <th>Asset Category</th>
                    <th style={{ textAlign: "center", width: "70px" }}>Required</th>
                    <th style={{ textAlign: "center", width: "70px" }}>Assigned</th>
                    <th style={{ textAlign: "center", width: "80px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ledAssetSummary.map((item) => {
                    const shortage = item.needed > item.assigned;
                    return (
                      <tr key={item.category}>
                        <td style={{ fontWeight: 500 }}>{item.name}</td>
                        <td style={{ textAlign: "center", fontWeight: "bold" }}>{item.needed}</td>
                        <td style={{ textAlign: "center" }}>{item.assigned}</td>
                        <td style={{ textAlign: "center" }}>
                          <Badge variant={shortage ? "rd" : "gr"}>
                            {shortage ? `Short (${item.needed - item.assigned})` : "OK"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="text-[10px] text-tx3" style={{ marginTop: "8px", fontStyle: "italic" }}>
                * Panels calculated from area. Cables, Processors, Accessories calculated dynamically.
              </div>
            </div>
          </div>
        )}

        {/* LED Screen Warehouse Audit & Vendor Assignment (FRD Module 5) */}
        {data && (data.inquiry.department === 'LED' || data.inquiry.department === 'MERGED') && (() => {
          const ledType = data.inquiry.ledType || "P4";
          
          const matchingEquipment = data.equipment.filter(e => 
            e.category === "LED_PANEL" && 
            e.productName.toLowerCase().includes(ledType.toLowerCase())
          );
          
          const inhouseEquipment = matchingEquipment.filter(e => e.ownershipType === "INHOUSE");
          const totalOwnedCabinets = inhouseEquipment.reduce((sum, e) => sum + (e.quantity || 1), 0);
          const totalOwnedSqft = totalOwnedCabinets * 4;
          
          const bookedCabinets = inhouseEquipment
            .filter(e => e.isBookedForRange && !e.bookedForThisInquiry)
            .reduce((sum, e) => sum + (e.quantity || 1), 0);
          
          const availableCabinets = Math.max(0, totalOwnedCabinets - bookedCabinets);
          const availableSqft = availableCabinets * 4;
          
          const neededSqft = Number(data.inquiry.screenAreaSqft) || 0;
          const neededCabinets = Number(data.inquiry.totalCabinets) || 0;
          
          const shortfallSqft = Math.max(0, neededSqft - availableSqft);
          const shortfallCabinets = Math.max(0, neededCabinets - availableCabinets);
          
          const currentInhouseBooking = data.bookings.find(b => 
            !b.vendorId && 
            b.position === "LED_PANEL_INHOUSE"
          );
          
          const currentVendorBooking = data.bookings.find(b => 
            b.vendorId && 
            b.position === "LED_PANEL_VENDOR"
          );
          
          return (
            <div className="card" style={{ padding: "16px", marginBottom: "25px", border: "1.5px solid var(--sem-bl-bdr)" }}>
              <div className="card-t" style={{ color: "var(--bl)", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>LED Panel Warehouse Audit & Vendor Assignment</span>
                <span className="text-[10px] bg-bl/10 text-bl px-2 py-0.5 rounded font-normal font-mono">
                  {ledType} Screen · {neededSqft} sq.ft needed ({neededCabinets} cabinets)
                </span>
              </div>
              
              <div className="two-col" style={{ marginTop: "12px", gap: "20px" }}>
                <div style={{ flex: 1.8 }}>
                  <div style={{ marginBottom: "16px" }}>
                    <div className="text-[11px] font-semibold text-gr flex justify-between" style={{ marginBottom: "6px" }}>
                      <span>Section 1 — BK Media stock</span>
                      <span>Total Owned: {totalOwnedSqft} sq.ft ({totalOwnedCabinets} cabinets)</span>
                    </div>
                    <table className="tbl text-[11.5px]">
                      <thead>
                        <tr>
                          <th>LED Type</th>
                          <th style={{ textAlign: "center" }}>Cabinets Available</th>
                          <th style={{ textAlign: "center" }}>Sq.ft Available</th>
                          <th style={{ textAlign: "center" }}>Status</th>
                          <th style={{ textAlign: "right", width: "120px" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ background: "var(--sem-gr-bg)/10" }}>
                          <td className="font-medium text-tx">{ledType} Panel</td>
                          <td style={{ textAlign: "center" }} className="font-mono">{availableCabinets}</td>
                          <td style={{ textAlign: "center" }} className="font-mono">{availableSqft} sq.ft</td>
                          <td style={{ textAlign: "center" }}>
                            {currentInhouseBooking ? (
                              <Badge variant="gr">Assigned</Badge>
                            ) : availableSqft >= neededSqft ? (
                              <Badge variant="gr">Available</Badge>
                            ) : availableSqft > 0 ? (
                              <Badge variant="am">Shortfall ({shortfallSqft} sq.ft)</Badge>
                            ) : (
                              <Badge variant="rd">Unavailable</Badge>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {currentInhouseBooking ? (
                              <button
                                type="button"
                                className="btn btn-danger"
                                style={{ padding: "3px 8px", fontSize: "10.5px" }}
                                onClick={async () => {
                                  if (confirm("Are you sure you want to release BK stock panels?")) {
                                    await api.returnEquipmentBooking(currentInhouseBooking.id);
                                    window.location.reload();
                                  }
                                }}
                              >
                                Release
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-success"
                                style={{ padding: "3px 8px", fontSize: "10.5px" }}
                                disabled={availableSqft === 0}
                                onClick={async () => {
                                  await api.createEquipmentBooking({
                                    inquiryId: inquiryId!,
                                    position: "LED_PANEL_INHOUSE",
                                    bookedFrom: data.inquiry.startDate,
                                    bookedTo: data.inquiry.endDate,
                                    equipmentId: inhouseEquipment[0]?.id || null,
                                  });
                                  window.location.reload();
                                }}
                              >
                                Confirm BK Stock
                              </button>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {shortfallSqft > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold text-am" style={{ marginBottom: "6px" }}>
                        ⚠️ Section 2 — Vendor needed (Shortfall: {shortfallSqft} sq.ft / {shortfallCabinets} cabinets)
                      </div>
                      <table className="tbl text-[11.5px]">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th style={{ textAlign: "center" }}>Shortfall</th>
                            <th>Select Vendor</th>
                            <th style={{ width: "100px" }}>Cost/sq.ft (₹)</th>
                            <th style={{ textAlign: "right" }}>Total Cost</th>
                            <th style={{ textAlign: "right", width: "80px" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="font-medium">{ledType} (Vendor Rental)</td>
                            <td style={{ textAlign: "center" }} className="font-mono text-am font-semibold">{shortfallSqft} sq.ft</td>
                            <td>
                              {currentVendorBooking ? (
                                <span className="font-semibold text-tx">
                                  {vendors.find(v => v.id === currentVendorBooking.vendorId)?.name || "Vendor Assigned"}
                                </span>
                              ) : (
                                <select id="led-vendor-select" className="fsel text-[11px]" style={{ padding: "3px 6px" }}>
                                  <option value="">-- Select Vendor --</option>
                                  {vendors.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td>
                              {currentVendorBooking ? (
                                <span className="font-mono">₹{(currentVendorBooking.vendorCostPerDay || 0) / shortfallSqft}</span>
                              ) : (
                                <input
                                  id="led-vendor-rate"
                                  type="number"
                                  className="finp text-[11px] text-right"
                                  style={{ padding: "3px 6px" }}
                                  placeholder="Rate/sqft"
                                  defaultValue="80"
                                />
                              )}
                            </td>
                            <td style={{ textAlign: "right" }} className="font-mono font-semibold text-rd">
                              {currentVendorBooking ? (
                                `₹${(currentVendorBooking.totalVendorCost || 0).toLocaleString("en-IN")}`
                              ) : (
                                "Calculated live"
                              )}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {currentVendorBooking ? (
                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  style={{ padding: "3px 8px", fontSize: "10.5px" }}
                                  onClick={async () => {
                                    if (confirm("Are you sure you want to release vendor panels?")) {
                                      await api.returnEquipmentBooking(currentVendorBooking.id);
                                      window.location.reload();
                                    }
                                  }}
                                >
                                  Release
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-warning"
                                  style={{ padding: "3px 8px", fontSize: "10.5px" }}
                                  onClick={async () => {
                                    const vEl = document.getElementById("led-vendor-select") as HTMLSelectElement;
                                    const rEl = document.getElementById("led-vendor-rate") as HTMLInputElement;
                                    const vId = Number(vEl?.value);
                                    const rate = Number(rEl?.value) || 0;
                                    if (!vId) {
                                      alert("Please select a vendor.");
                                      return;
                                    }
                                    if (rate <= 0) {
                                      alert("Please enter a valid rate per sq.ft.");
                                      return;
                                    }
                                    await api.createEquipmentBooking({
                                      inquiryId: inquiryId!,
                                      vendorId: vId,
                                      vendorCostPerDay: rate * shortfallSqft,
                                      position: "LED_PANEL_VENDOR",
                                      bookedFrom: data.inquiry.startDate,
                                      bookedTo: data.inquiry.endDate,
                                    });
                                    window.location.reload();
                                  }}
                                >
                                  Save Vendor
                                </button>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div style={{ flex: 0.8, minWidth: "220px" }}>
                  <div className="card" style={{ background: "var(--alt2)", padding: "12px", border: "1px solid var(--b1)", height: "100%" }}>
                    <div className="text-[11px] font-bold text-bl uppercase tracking-wider" style={{ marginBottom: "10px" }}>📊 Live P&L Preview (Internal Only)</div>
                    {(() => {
                      const ledRow = data.quotation?.equipment?.find((r: any) => r.equip.includes("LED") || r.equip.toLowerCase() === "led screen");
                      const revenue = ledRow ? ledRow.amount : 0;
                      let vendorCost = 0;
                      if (currentVendorBooking) {
                        vendorCost = currentVendorBooking.totalVendorCost || 0;
                      } else if (shortfallSqft > 0) {
                        vendorCost = shortfallSqft * 80;
                      }
                      const grossMargin = revenue - vendorCost;
                      const marginPercent = revenue > 0 ? (grossMargin / revenue) * 100 : 0;
                      return (
                        <div className="flex flex-col gap-3 text-[12px]">
                          <div className="flex justify-between">
                            <span className="text-tx3">Revenue:</span>
                            <span className="font-mono font-semibold">₹{revenue.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between border-b border-b1 pb-2">
                            <span className="text-tx3">Vendor Cost:</span>
                            <span className="font-mono text-rd">₹{vendorCost.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between pt-1">
                            <span className="text-tx2 font-medium">Gross Margin:</span>
                            <span className="font-mono font-bold text-gr">₹{grossMargin.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between items-center bg-s1 px-2 py-1 rounded mt-1">
                            <span className="text-[11px] text-tx3">Margin %:</span>
                            <span className={`font-bold font-mono ${marginPercent >= 70 ? "text-gr" : marginPercent >= 40 ? "text-am" : "text-rd"}`}>
                              {marginPercent.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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
