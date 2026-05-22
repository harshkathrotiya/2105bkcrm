"use client";

import { useState, useEffect, useMemo } from "react";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import Timeline from "../ui/Timeline";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import { useVendors } from "@/lib/vendors-context";
import * as api from "@/lib/api";
import type { Vendor } from "@/lib/types";

export default function Screen18VendorList() {
  const { vendors, loading, refreshVendors, dispatchVendors } = useVendors();

  // Selected vendor for detail sidebar
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [vendorHistory, setVendorHistory] = useState<any[]>([]);
  const [vendorYtdSpend, setVendorYtdSpend] = useState<number>(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal / Drawer state for Add and Edit
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    specialization: "",
    city: "",
    gstNumber: "",
    notes: "",
  });

  const [editFormData, setEditFormData] = useState<{
    id: number;
    name: string;
    phone: string;
    email: string;
    specialization: string;
    city: string;
    gstNumber: string;
    notes: string;
    isActive: boolean;
  } | null>(null);

  // Toast State
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: "" });

  const triggerToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), 2000);
  };

  // Fetch selected vendor history and YTD spend
  useEffect(() => {
    if (selectedVendorId === null) {
      setVendorHistory([]);
      setVendorYtdSpend(0);
      return;
    }

    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await api.fetchVendorHistory(selectedVendorId);
        setVendorHistory(res.history);
        setVendorYtdSpend(res.ytdSpend);
      } catch (err) {
        console.error("Error fetching vendor history:", err);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [selectedVendorId]);

  // Handle Quick Toggle for Active/Inactive
  const handleToggleStatus = async (vendor: Vendor, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening sidebar
    try {
      await dispatchVendors({
        type: "UPDATE_VENDOR",
        payload: {
          id: vendor.id,
          isActive: !vendor.isActive,
        },
      });
      triggerToast(`Vendor '${vendor.name}' status updated!`);
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  // GST Number validation helper
  // Standard Indian GST format: 2 numbers, 5 letters, 4 numbers, 1 letter, 1 alphanumeric/number, 'Z', 1 alphanumeric/number
  const validateGst = (gst: string): boolean => {
    if (!gst.trim()) return true; // Optional field
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{3}$/i;
    return gstRegex.test(gst.trim());
  };

  // Submit new vendor
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Vendor name is required.");
      return;
    }
    if (!formData.phone.trim()) {
      setFormError("Phone number is required.");
      return;
    }
    if (formData.gstNumber && !validateGst(formData.gstNumber)) {
      setFormError("Invalid GST format. Must be 15-character uppercase alphanumeric (e.g. 22AAAAA0000A1Z5).");
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        specialization: formData.specialization.trim() || null,
        city: formData.city.trim() || null,
        gstNumber: formData.gstNumber.trim().toUpperCase() || null,
        notes: formData.notes.trim() || null,
      };

      const result = await dispatchVendors({
        type: "ADD_VENDOR",
        payload,
      });

      triggerToast(`Vendor '${payload.name}' created!`);
      setShowAddModal(false);
      setFormData({
        name: "",
        phone: "",
        email: "",
        specialization: "",
        city: "",
        gstNumber: "",
        notes: "",
      });

      // Auto-select newly created vendor
      if (result && result.id) {
        setSelectedVendorId(result.id);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create vendor.");
    }
  };

  // Open Edit Modal with current data
  const handleOpenEdit = (vendor: Vendor, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditFormData({
      id: vendor.id,
      name: vendor.name,
      phone: vendor.phone,
      email: vendor.email || "",
      specialization: vendor.specialization || "",
      city: vendor.city || "",
      gstNumber: vendor.gstNumber || "",
      notes: vendor.notes || "",
      isActive: vendor.isActive,
    });
    setFormError("");
    setShowEditModal(true);
  };

  // Submit edit vendor
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!editFormData) return;

    if (!editFormData.name.trim()) {
      setFormError("Vendor name is required.");
      return;
    }
    if (!editFormData.phone.trim()) {
      setFormError("Phone number is required.");
      return;
    }
    if (editFormData.gstNumber && !validateGst(editFormData.gstNumber)) {
      setFormError("Invalid GST format. Must be 15-character uppercase alphanumeric (e.g. 22AAAAA0000A1Z5).");
      return;
    }

    try {
      const payload = {
        id: editFormData.id,
        name: editFormData.name.trim(),
        phone: editFormData.phone.trim(),
        email: editFormData.email.trim() || null,
        specialization: editFormData.specialization.trim() || null,
        city: editFormData.city.trim() || null,
        gstNumber: editFormData.gstNumber.trim().toUpperCase() || null,
        notes: editFormData.notes.trim() || null,
        isActive: editFormData.isActive,
      };

      await dispatchVendors({
        type: "UPDATE_VENDOR",
        payload,
      });

      triggerToast(`Vendor '${payload.name}' updated successfully!`);
      setShowEditModal(false);

      // Refresh side history view if the selected vendor was updated
      if (selectedVendorId === editFormData.id) {
        // Trigger a change to force refresh history
        const temp = selectedVendorId;
        setSelectedVendorId(null);
        setTimeout(() => setSelectedVendorId(temp), 50);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to update vendor.");
    }
  };

  // Filter vendors list
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchesSearch =
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.specialization && v.specialization.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.city && v.city.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && v.isActive) ||
        (statusFilter === "INACTIVE" && !v.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [vendors, searchQuery, statusFilter]);

  // Compute Metrics
  const metrics = useMemo(() => {
    const total = vendors.length;
    const active = vendors.filter((v) => v.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [vendors]);

  const selectedVendor = useMemo(() => {
    if (selectedVendorId === null) return null;
    return vendors.find((v) => v.id === selectedVendorId) || null;
  }, [vendors, selectedVendorId]);

  // Format Timeline items from history
  const timelineItems = useMemo(() => {
    return vendorHistory.map((h) => {
      const costStr = h.totalVendorCost ? `YTD Cost: ₹${h.totalVendorCost.toLocaleString("en-IN")}` : `₹${h.vendorCostPerDay}/day`;
      let badgeColor = "var(--bl)"; // BOOKED
      if (h.status === "OUT") badgeColor = "var(--rd)";
      if (h.status === "RETURNED") badgeColor = "var(--gr)";

      return {
        title: `${h.eventType} (${h.itemName})`,
        time: `${h.bookedFrom} to ${h.bookedTo} • Client: ${h.clientName} • ${costStr} [${h.status}]`,
        color: badgeColor,
      };
    });
  }, [vendorHistory]);

  if (loading) {
    return (
      <>
        <SectionHeader title="Rental Vendor Directory" />
        <ScreenFrame breadcrumb="Vendors › Directory">
          <div style={{ padding: "30px" }}>
            <LoadingSkeleton rows={6} message="Retrieving vendor accounts and YTD metrics..." />
          </div>
        </ScreenFrame>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        title={<>Rental <strong>Vendor Management</strong></>}
        description="Maintain verified external suppliers, track custom hardware specializations, GST credentials, and monitor YTD outsourcing spends."
      />

      {/* Metrics Header */}
      <div className="metrics" style={{ marginBottom: "20px" }}>
        <div className="met">
          <div className="met-l">Total Registered Vendors</div>
          <div className="met-v">{metrics.total}</div>
        </div>
        <div className="met">
          <div className="met-l">Active Fallbacks</div>
          <div className="met-v g">{metrics.active}</div>
        </div>
        <div className="met">
          <div className="met-l">Inactive / Suspended</div>
          <div className="met-v gy">{metrics.inactive}</div>
        </div>
      </div>

      <div className="two-col" style={{ gridTemplateColumns: selectedVendor ? "1.4fr 1.1fr" : "1fr" }}>
        {/* Left Side: Table & Search */}
        <div className="card" style={{ padding: "16px" }}>
          {/* Controls Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: "8px", flex: 1, minWidth: "260px" }}>
              <input
                type="text"
                placeholder="Search vendor name, spec, or city..."
                className="finp"
                style={{ flex: 1, padding: "6px 12px", fontSize: "12px" }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="fsel"
                style={{ width: "120px", padding: "6px 8px", fontSize: "12px" }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setFormError("");
                setShowAddModal(true);
              }}
            >
              + Add Rental Vendor
            </button>
          </div>

          {/* Vendors Table */}
          <table className="tbl">
            <thead>
              <tr>
                <th>Vendor Name</th>
                <th>Specialization</th>
                <th>City</th>
                <th>Phone</th>
                <th style={{ textAlign: "center" }}>Times Used</th>
                <th style={{ width: "90px", textAlign: "center" }}>Active</th>
                <th style={{ width: "100px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-tx3" style={{ fontStyle: "italic" }}>
                    No vendors match the active search criteria.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    onClick={() => setSelectedVendorId(vendor.id)}
                    style={{
                      cursor: "pointer",
                      background: selectedVendorId === vendor.id ? "var(--alt2)" : "transparent",
                    }}
                  >
                    <td>
                      <strong style={{ color: "var(--tx)", fontSize: "12.5px" }}>{vendor.name}</strong>
                      {vendor.email && (
                        <div style={{ fontSize: "10px", color: "var(--tx3)", marginTop: "2px" }}>
                          {vendor.email}
                        </div>
                      )}
                    </td>
                    <td>
                      <Badge variant="bl">{vendor.specialization || "General"}</Badge>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: "var(--tx2)" }}>{vendor.city || "—"}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--tx2)" }}>
                        {vendor.phone}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>
                      {vendor.timesUsed}
                    </td>
                    <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                      <label className="switch" style={{ display: "inline-block", position: "relative" }}>
                        <input
                          type="checkbox"
                          checked={vendor.isActive}
                          onChange={(e) => handleToggleStatus(vendor, e as any)}
                          style={{ cursor: "pointer" }}
                        />
                        <span className="slider round"></span>
                      </label>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                        onClick={(e) => handleOpenEdit(vendor, e)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Right Side: Detail Sidebar */}
        {selectedVendor && (
          <div className="card" style={{ padding: "16px", borderLeft: "3px solid var(--bl)", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>{selectedVendor.name}</h3>
                <span style={{ fontSize: "11px", color: "var(--tx3)" }}>
                  Registered ID: <strong>#{selectedVendor.id}</strong>
                </span>
              </div>
              <button
                type="button"
                className="btn"
                style={{ padding: "2px 6px", fontSize: "11px" }}
                onClick={() => setSelectedVendorId(null)}
              >
                ✕ Close
              </button>
            </div>

            {/* General details grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "var(--alt)", padding: "12px", borderRadius: "6px" }}>
              <div>
                <span style={{ fontSize: "10px", color: "var(--tx3)", display: "block" }}>Specialization</span>
                <span style={{ fontSize: "12px", fontWeight: 500 }}>{selectedVendor.specialization || "General"}</span>
              </div>
              <div>
                <span style={{ fontSize: "10px", color: "var(--tx3)", display: "block" }}>City</span>
                <span style={{ fontSize: "12px", fontWeight: 500 }}>{selectedVendor.city || "—"}</span>
              </div>
              <div>
                <span style={{ fontSize: "10px", color: "var(--tx3)", display: "block" }}>GST Number</span>
                <span style={{ fontSize: "11.5px", fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--tx)" }}>
                  {selectedVendor.gstNumber || "Not Registered"}
                </span>
              </div>
              <div>
                <span style={{ fontSize: "10px", color: "var(--tx3)", display: "block" }}>Active Status</span>
                <Badge variant={selectedVendor.isActive ? "gr" : "gy"}>
                  {selectedVendor.isActive ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <span style={{ fontSize: "10px", color: "var(--tx3)", display: "block" }}>Notes</span>
                <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "var(--tx2)", fontStyle: "italic", whiteSpace: "pre-line" }}>
                  {selectedVendor.notes || "No extra notes recorded."}
                </p>
              </div>
            </div>

            {/* YTD Spend Metrics Card */}
            <div
              style={{
                background: "linear-gradient(135deg, var(--bl-bg), var(--alt))",
                border: "1px solid var(--bl-bdr)",
                padding: "14px",
                borderRadius: "6px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "10px", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Total outsourcing Spend (YTD)
                </div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--bl)", marginTop: "4px" }}>
                  ₹{vendorYtdSpend.toLocaleString("en-IN")}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "10px", color: "var(--tx3)" }}>Times Booked</div>
                <div style={{ fontSize: "18px", fontWeight: 600, color: "var(--tx)", marginTop: "4px" }}>
                  {selectedVendor.timesUsed}
                </div>
              </div>
            </div>

            {/* Booking History Timeline */}
            <div>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: 600 }}>
                📅 Job History Logs ({vendorHistory.length})
              </h4>
              {historyLoading ? (
                <div style={{ fontSize: "11px", color: "var(--tx3)", fontStyle: "italic" }}>
                  Analyzing historical rental worksheets...
                </div>
              ) : timelineItems.length === 0 ? (
                <div style={{ fontSize: "11.5px", color: "var(--tx3)", fontStyle: "italic", background: "var(--alt2)", padding: "10px", borderRadius: "4px" }}>
                  No historical bookings found for this vendor.
                </div>
              ) : (
                <div style={{ maxHeight: "250px", overflowY: "auto", paddingRight: "4px" }}>
                  <Timeline items={timelineItems} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- ADD VENDOR MODAL --- */}
      {showAddModal && (
        <div className="modal-backdrop" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="modal-content card" style={{ width: "480px", padding: "20px", position: "relative" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: 600 }}>Add New Rental Vendor</h3>
            
            {formError && (
              <div style={{ background: "var(--rd-bg)", border: "1px solid var(--rd-bdr)", color: "var(--rd)", fontSize: "11.5px", padding: "8px 12px", borderRadius: "4px", marginBottom: "12px" }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: "11px", color: "var(--tx2)", display: "block", marginBottom: "4px" }}>Vendor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter supplier or freelancer name"
                    className="finp"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--tx2)", display: "block", marginBottom: "4px" }}>Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contact number"
                    className="finp"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--tx2)", display: "block", marginBottom: "4px" }}>Email</label>
                  <input
                    type="email"
                    placeholder="Email address"
                    className="finp"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--tx2)", display: "block", marginBottom: "4px" }}>Specialization</label>
                  <input
                    type="text"
                    placeholder="e.g. Red Camera, Sony Cine"
                    className="finp"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--tx2)", display: "block", marginBottom: "4px" }}>City</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai, Delhi"
                    className="finp"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: "11px", color: "var(--tx2)", display: "block", marginBottom: "4px" }}>GST Identification Number</label>
                  <input
                    type="text"
                    placeholder="15-char GSTIN (Optional)"
                    className="finp"
                    style={{ textTransform: "uppercase" }}
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                  />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: "11px", color: "var(--tx2)", display: "block", marginBottom: "4px" }}>Internal Remarks / Notes</label>
                  <textarea
                    placeholder="Log hardware quality, response speeds, etc."
                    className="finp"
                    style={{ height: "60px", resize: "vertical" }}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
                <button type="button" className="btn" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT VENDOR MODAL --- */}
      {showEditModal && editFormData && (
        <div className="modal-backdrop" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="modal-content card" style={{ width: "480px", padding: "20px", position: "relative" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: 600 }}>Edit Vendor Credentials</h3>
            
            {formError && (
              <div style={{ background: "var(--rd-bg)", border: "1px solid var(--rd-bdr)", color: "var(--rd)", fontSize: "11.5px", padding: "8px 12px", borderRadius: "4px", marginBottom: "12px" }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: "11px", color: "var(--tx2)", display: "block", marginBottom: "4px" }}>Vendor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter supplier or freelancer name"
                    className="finp"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--tx2)", display: "block", marginBottom: "4px" }}>Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contact number"
                    className="finp"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--tx2)", display: "block", marginBottom: "4px" }}>Email</label>
                  <input
                    type="email"
                    placeholder="Email address"
                    className="finp"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--tx2)", display: "block", marginBottom: "4px" }}>Specialization</label>
                  <input
                    type="text"
                    placeholder="e.g. Red Camera, Sony Cine"
                    className="finp"
                    value={editFormData.specialization}
                    onChange={(e) => setEditFormData({ ...editFormData, specialization: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--tx2)", display: "block", marginBottom: "4px" }}>City</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai, Delhi"
                    className="finp"
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: "11px", color: "var(--tx2)", display: "block", marginBottom: "4px" }}>GST Identification Number</label>
                  <input
                    type="text"
                    placeholder="15-char GSTIN (Optional)"
                    className="finp"
                    style={{ textTransform: "uppercase" }}
                    value={editFormData.gstNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, gstNumber: e.target.value })}
                  />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: "11px", color: "var(--tx2)", display: "block", marginBottom: "4px" }}>Internal Remarks / Notes</label>
                  <textarea
                    placeholder="Log hardware quality, response speeds, etc."
                    className="finp"
                    style={{ height: "60px", resize: "vertical" }}
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 500 }}>
                    <input
                      type="checkbox"
                      checked={editFormData.isActive}
                      onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                    />
                    Is Active & Available
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
                <button type="button" className="btn" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Toast notification --- */}
      {toast.show && (
        <div
          className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-[13px] font-medium shadow-lg"
          style={{
            background: "var(--sem-gr-bg)",
            border: "1px solid var(--sem-gr-bdr)",
            color: "var(--sem-gr-tx)",
          }}
        >
          <span>✓</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </>
  );
}
