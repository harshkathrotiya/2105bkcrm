"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import { useStaff } from "@/lib/store";
import type { Staff } from "@/lib/types";

export default function Screen20StaffList() {
  const router = useRouter();
  const { staff, loading } = useStaff();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarFilter, setSidebarFilter] = useState<"ALL" | "INHOUSE" | "EXTERNAL" | "MONTHLY" | "PER_DAY" | "AVAILABLE" | "DEPLOYED">("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Compute Sidebar counts
  const counts = useMemo(() => {
    const total = staff.length;
    const inHouse = staff.filter((s) => s.staffType === "INHOUSE").length;
    const external = staff.filter((s) => s.staffType === "EXTERNAL").length;
    const monthly = staff.filter((s) => s.paymentType === "MONTHLY").length;
    const perDay = staff.filter((s) => s.paymentType === "PER_DAY").length;
    const available = staff.filter((s) => s.status === "Available").length;
    const deployed = staff.filter((s) => s.status === "Deployed").length;
    return { total, inHouse, external, monthly, perDay, available, deployed };
  }, [staff]);

  // Compute total pending payment for all visible/unfiltered staff
  const pendingPaymentsDue = useMemo(() => {
    return staff.reduce((acc, s) => acc + (s.pendingPayment || 0), 0);
  }, [staff]);

  // Filter staff list
  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      // Search term match
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery);

      // Top dropdown filters match
      const matchesTypeDropdown = typeFilter === "ALL" || s.staffType === typeFilter;
      const matchesPaymentDropdown = paymentFilter === "ALL" || s.paymentType === paymentFilter;

      // Sidebar filter match
      let matchesSidebar = true;
      if (sidebarFilter === "INHOUSE") matchesSidebar = s.staffType === "INHOUSE";
      else if (sidebarFilter === "EXTERNAL") matchesSidebar = s.staffType === "EXTERNAL";
      else if (sidebarFilter === "MONTHLY") matchesSidebar = s.paymentType === "MONTHLY";
      else if (sidebarFilter === "PER_DAY") matchesSidebar = s.paymentType === "PER_DAY";
      else if (sidebarFilter === "AVAILABLE") matchesSidebar = s.status === "Available";
      else if (sidebarFilter === "DEPLOYED") matchesSidebar = s.status === "Deployed";

      return matchesSearch && matchesTypeDropdown && matchesPaymentDropdown && matchesSidebar;
    });
  }, [staff, searchQuery, typeFilter, paymentFilter, sidebarFilter]);

  // Paginate list
  const paginatedStaff = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStaff.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStaff, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / itemsPerPage));

  // Export to CSV helper
  const handleExportCSV = () => {
    const headers = ["Name", "Phone", "Type", "Role", "Payment Type", "Rate/Salary", "With Equipment", "Equipment Description", "Status", "Pending Payment"];
    const rows = filteredStaff.map((s) => [
      s.name,
      s.phone,
      s.staffType,
      s.role,
      s.paymentType,
      s.paymentType === "PER_DAY" ? s.ratePerDay : s.monthlySalary,
      s.withEquipment ? "Yes" : "No",
      s.equipmentDesc || "",
      s.status,
      s.pendingPayment || 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bk_media_staff_list_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF via browser print
  const handleExportPDF = () => {
    window.print();
  };

  // Avatar Initials + color helper
  const getAvatarInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarStyle = (index: number) => {
    const colors = [
      { bg: "#EEEDFE", fg: "#3C3489" },
      { bg: "#E1F5EE", fg: "#085041" },
      { bg: "#FAECE7", fg: "#712B13" },
      { bg: "#E6F1FB", fg: "#0C447C" },
      { bg: "#FAEEDA", fg: "#633806" },
      { bg: "#F1EFE8", fg: "#444441" },
      { bg: "#FCEBEB", fg: "#791F1F" },
      { bg: "#FBEAF0", fg: "#72243E" },
    ];
    return colors[index % colors.length];
  };

  return (
    <>
      <SectionHeader
        title={<>Staff <strong>Directory</strong></>}
        description="Manage in-house employees, external contractors, assign positions, check availability and record payments."
      />

      {/* Top metrics cards */}
      <div className="metrics" style={{ marginBottom: "20px" }}>
        <div className="met">
          <div className="met-l">Total Staff</div>
          <div className="met-v">{counts.total}</div>
        </div>
        <div className="met">
          <div className="met-l">Available</div>
          <div className="met-v g">{counts.available}</div>
        </div>
        <div className="met">
          <div className="met-l">Deployed</div>
          <div className="met-v b">{counts.deployed}</div>
        </div>
        <div className="met">
          <div className="met-l">Pending Payment</div>
          <div className="met-v a">₹{pendingPaymentsDue.toLocaleString("en-IN")}</div>
        </div>
      </div>

      <ScreenFrame
        breadcrumb="Staff › List"
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn" onClick={handleExportCSV}>Export CSV</button>
            <button className="btn" onClick={handleExportPDF}>Export PDF</button>
            <Link href="/staff/new" className="btn btn-primary">+ Add Staff</Link>
          </div>
        }
      >
        <div style={{ display: "flex", border: "1px solid var(--b1)", borderRadius: "12px", overflow: "hidden", background: "var(--s1)" }}>
          
          {/* Sidebar Filters */}
          <div
            style={{
              width: "185px",
              background: "var(--s2)",
              borderRight: "1px solid var(--b1)",
              padding: "12px 0",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ padding: "6px 14px 2px", fontSize: "9px", color: "var(--tx3)", letterSpacing: ".1em", textTransform: "uppercase" }}>
              Filter by type
            </div>
            <div
              onClick={() => { setSidebarFilter("ALL"); setCurrentPage(1); }}
              style={{
                padding: "8px 14px",
                fontSize: "12px",
                color: sidebarFilter === "ALL" ? "var(--tx)" : "var(--tx3)",
                background: sidebarFilter === "ALL" ? "var(--s1)" : "transparent",
                borderLeft: `2px solid ${sidebarFilter === "ALL" ? "var(--acc)" : "transparent"}`,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: sidebarFilter === "ALL" ? 500 : 400,
              }}
            >
              <span>All Staff</span>
              <span style={{ fontSize: "10px", color: "var(--tx3)" }}>{counts.total}</span>
            </div>
            <div
              onClick={() => { setSidebarFilter("INHOUSE"); setCurrentPage(1); }}
              style={{
                padding: "8px 14px",
                fontSize: "12px",
                color: sidebarFilter === "INHOUSE" ? "var(--tx)" : "var(--tx3)",
                background: sidebarFilter === "INHOUSE" ? "var(--s1)" : "transparent",
                borderLeft: `2px solid ${sidebarFilter === "INHOUSE" ? "var(--acc)" : "transparent"}`,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: sidebarFilter === "INHOUSE" ? 500 : 400,
              }}
            >
              <span>In-house</span>
              <span style={{ fontSize: "10px", color: "var(--tx3)" }}>{counts.inHouse}</span>
            </div>
            <div
              onClick={() => { setSidebarFilter("EXTERNAL"); setCurrentPage(1); }}
              style={{
                padding: "8px 14px",
                fontSize: "12px",
                color: sidebarFilter === "EXTERNAL" ? "var(--tx)" : "var(--tx3)",
                background: sidebarFilter === "EXTERNAL" ? "var(--s1)" : "transparent",
                borderLeft: `2px solid ${sidebarFilter === "EXTERNAL" ? "var(--acc)" : "transparent"}`,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: sidebarFilter === "EXTERNAL" ? 500 : 400,
              }}
            >
              <span>External</span>
              <span style={{ fontSize: "10px", color: "var(--tx3)" }}>{counts.external}</span>
            </div>

            <div style={{ height: "1px", background: "var(--b1)", margin: "8px 14px" }} />

            <div style={{ padding: "6px 14px 2px", fontSize: "9px", color: "var(--tx3)", letterSpacing: ".1em", textTransform: "uppercase" }}>
              Payment type
            </div>
            <div
              onClick={() => { setSidebarFilter("MONTHLY"); setCurrentPage(1); }}
              style={{
                padding: "8px 14px",
                fontSize: "12px",
                color: sidebarFilter === "MONTHLY" ? "var(--tx)" : "var(--tx3)",
                background: sidebarFilter === "MONTHLY" ? "var(--s1)" : "transparent",
                borderLeft: `2px solid ${sidebarFilter === "MONTHLY" ? "var(--acc)" : "transparent"}`,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: sidebarFilter === "MONTHLY" ? 500 : 400,
              }}
            >
              <span>Monthly salary</span>
              <span style={{ fontSize: "10px", color: "var(--tx3)" }}>{counts.monthly}</span>
            </div>
            <div
              onClick={() => { setSidebarFilter("PER_DAY"); setCurrentPage(1); }}
              style={{
                padding: "8px 14px",
                fontSize: "12px",
                color: sidebarFilter === "PER_DAY" ? "var(--tx)" : "var(--tx3)",
                background: sidebarFilter === "PER_DAY" ? "var(--s1)" : "transparent",
                borderLeft: `2px solid ${sidebarFilter === "PER_DAY" ? "var(--acc)" : "transparent"}`,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: sidebarFilter === "PER_DAY" ? 500 : 400,
              }}
            >
              <span>Per day</span>
              <span style={{ fontSize: "10px", color: "var(--tx3)" }}>{counts.perDay}</span>
            </div>

            <div style={{ height: "1px", background: "var(--b1)", margin: "8px 14px" }} />

            <div style={{ padding: "6px 14px 2px", fontSize: "9px", color: "var(--tx3)", letterSpacing: ".1em", textTransform: "uppercase" }}>
              Status
            </div>
            <div
              onClick={() => { setSidebarFilter("AVAILABLE"); setCurrentPage(1); }}
              style={{
                padding: "8px 14px",
                fontSize: "12px",
                color: sidebarFilter === "AVAILABLE" ? "var(--tx)" : "var(--tx3)",
                background: sidebarFilter === "AVAILABLE" ? "var(--s1)" : "transparent",
                borderLeft: `2px solid ${sidebarFilter === "AVAILABLE" ? "var(--acc)" : "transparent"}`,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: sidebarFilter === "AVAILABLE" ? 500 : 400,
              }}
            >
              <span>Available</span>
              <span style={{ fontSize: "10px", color: "var(--tx3)" }}>{counts.available}</span>
            </div>
            <div
              onClick={() => { setSidebarFilter("DEPLOYED"); setCurrentPage(1); }}
              style={{
                padding: "8px 14px",
                fontSize: "12px",
                color: sidebarFilter === "DEPLOYED" ? "var(--tx)" : "var(--tx3)",
                background: sidebarFilter === "DEPLOYED" ? "var(--s1)" : "transparent",
                borderLeft: `2px solid ${sidebarFilter === "DEPLOYED" ? "var(--acc)" : "transparent"}`,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: sidebarFilter === "DEPLOYED" ? 500 : 400,
              }}
            >
              <span>Deployed</span>
              <span style={{ fontSize: "10px", color: "var(--tx3)" }}>{counts.deployed}</span>
            </div>

            <div style={{ height: "1px", background: "var(--b1)", margin: "8px 14px" }} />

            <div style={{ padding: "8px 14px" }}>
              <div style={{ fontSize: "10px", color: "var(--tx3)", marginBottom: "3px" }}>Total pending pay</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--acc)" }}>₹{pendingPaymentsDue.toLocaleString("en-IN")}</div>
            </div>

            <div style={{ height: "1px", background: "var(--b1)", margin: "8px 14px" }} />

            <Link
              href="/staff/inactive"
              style={{
                padding: "8px 14px",
                fontSize: "12px",
                color: "var(--tx3)",
                display: "block",
                textDecoration: "none",
              }}
            >
              Inactive Staff →
            </Link>
          </div>

          {/* Main Grid Content */}
          <div style={{ flex: 1, padding: "16px", background: "var(--cnt-bg)", minHeight: "480px" }}>
            
            {/* Search and Dropdowns Filter */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <input
                type="text"
                placeholder="Search staff by name, role, mobile number..."
                className="finp"
                style={{ flex: 1, fontSize: "12px" }}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
              <select
                className="fsel"
                style={{ width: "135px", fontSize: "12px" }}
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="ALL">All Types</option>
                <option value="INHOUSE">In-house</option>
                <option value="EXTERNAL">External</option>
              </select>
              <select
                className="fsel"
                style={{ width: "135px", fontSize: "12px" }}
                value={paymentFilter}
                onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="ALL">All Payments</option>
                <option value="PER_DAY">Per Day</option>
                <option value="MONTHLY">Monthly Fixed</option>
              </select>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, border: "none" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: "42px" }}></th>
                    <th>Name</th>
                    <th style={{ width: "100px" }}>Type</th>
                    <th style={{ width: "140px" }}>Role</th>
                    <th style={{ width: "140px" }}>Payment</th>
                    <th style={{ width: "110px" }}>With Equip.</th>
                    <th style={{ width: "100px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStaff.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-tx3" style={{ fontStyle: "italic" }}>
                        No staff members found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedStaff.map((s, idx) => {
                      const avatarColors = getAvatarStyle(s.id);
                      return (
                        <tr
                          key={s.id}
                          onClick={() => router.push(`/staff/${s.id}`)}
                          style={{ cursor: "pointer" }}
                        >
                          <td>
                            <div
                              className="avatar-sm"
                              style={{
                                background: avatarColors.bg,
                                color: avatarColors.fg,
                                fontWeight: 600,
                              }}
                            >
                              {getAvatarInitials(s.name)}
                            </div>
                          </td>
                          <td>
                            <strong style={{ color: "var(--tx)", fontSize: "13px" }}>{s.name}</strong>
                            <div style={{ fontSize: "10px", color: "var(--tx3)", marginTop: "2px", fontFamily: "var(--font-mono)" }}>
                              {s.phone.replace(/(\d{5})(\d{5})/, "$1 $2")}
                            </div>
                          </td>
                          <td>
                            <Badge variant={s.staffType === "INHOUSE" ? "gr" : "am"}>
                              {s.staffType === "INHOUSE" ? "In-house" : "External"}
                            </Badge>
                          </td>
                          <td>
                            <span style={{ fontSize: "12.5px" }}>{s.role}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                              {s.paymentType === "PER_DAY"
                                ? `₹${(s.ratePerDay || 0).toLocaleString("en-IN")}/day`
                                : `₹${(s.monthlySalary || 0).toLocaleString("en-IN")}/mo`}
                            </span>
                          </td>
                          <td>
                            {s.withEquipment ? (
                              <Badge variant="bl">
                                {s.equipmentDesc ? `+${s.equipmentDesc.split(",")[0]}` : "Yes"}
                              </Badge>
                            ) : (
                              <span style={{ color: "var(--tx3)", fontSize: "12px" }}>No</span>
                            )}
                          </td>
                          <td>
                            <Badge variant={s.status === "Available" ? "gr" : "bl"}>
                              {s.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination controls */}
              {filteredStaff.length > itemsPerPage && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderTop: "1px solid var(--tbl-line)", fontSize: "11px", color: "var(--tx3)" }}>
                  <span>
                    Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredStaff.length)} of {filteredStaff.length} staff
                  </span>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      className="btn"
                      style={{ padding: "4px 8px", fontSize: "11px" }}
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }).map((_, pageIdx) => (
                      <button
                        key={pageIdx}
                        className={`btn ${currentPage === pageIdx + 1 ? "btn-primary" : ""}`}
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                        onClick={() => setCurrentPage(pageIdx + 1)}
                      >
                        {pageIdx + 1}
                      </button>
                    ))}
                    <button
                      className="btn"
                      style={{ padding: "4px 8px", fontSize: "11px" }}
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </ScreenFrame>

      {/* Print-only PDF layout — hidden on screen, shown when printing */}
      <div className="staff-print-only" style={{ display: "none", padding: "20px", color: "#000", background: "#fff" }}>
        <div style={{ borderBottom: "2px solid #000", paddingBottom: "10px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>BK MEDIA CRM</h1>
            <div style={{ fontSize: "12px", color: "#666" }}>Staff Directory</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "13px", fontWeight: "bold" }}>
              {sidebarFilter !== "ALL" ? `Filter: ${sidebarFilter}` : "All Staff"}
              {searchQuery ? ` — Search: "${searchQuery}"` : ""}
            </div>
            <div style={{ fontSize: "11px", color: "#666" }}>
              Printed on: {new Date().toLocaleDateString("en-IN")} · {filteredStaff.length} staff member(s)
            </div>
          </div>
        </div>

        {/* Summary row */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
          {[
            { label: "Total", value: counts.total },
            { label: "In-house", value: counts.inHouse },
            { label: "External", value: counts.external },
            { label: "Available", value: counts.available },
            { label: "Deployed", value: counts.deployed },
            { label: "Pending Pay", value: `₹${pendingPaymentsDue.toLocaleString("en-IN")}` },
          ].map((m) => (
            <div key={m.label} style={{ border: "1px solid #ddd", borderRadius: "4px", padding: "8px 12px", flex: 1 }}>
              <div style={{ fontSize: "9px", color: "#888", textTransform: "uppercase" }}>{m.label}</div>
              <div style={{ fontSize: "15px", fontWeight: "bold" }}>{m.value}</div>
            </div>
          ))}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #000", background: "#f5f5f5" }}>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Name</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Phone</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Type</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Role</th>
              <th style={{ textAlign: "right", padding: "6px 8px" }}>Rate / Salary</th>
              <th style={{ textAlign: "center", padding: "6px 8px" }}>Equipment</th>
              <th style={{ textAlign: "center", padding: "6px 8px" }}>Status</th>
              <th style={{ textAlign: "right", padding: "6px 8px" }}>Pending Pay</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map((s, idx) => (
              <tr key={s.id} style={{ borderBottom: "1px solid #eee", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "5px 8px", fontWeight: 500 }}>{s.name}</td>
                <td style={{ padding: "5px 8px", fontFamily: "monospace" }}>{s.phone}</td>
                <td style={{ padding: "5px 8px" }}>{s.staffType === "INHOUSE" ? "In-house" : "External"}</td>
                <td style={{ padding: "5px 8px" }}>{s.role}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace" }}>
                  {s.paymentType === "PER_DAY"
                    ? `₹${(s.ratePerDay || 0).toLocaleString("en-IN")}/day`
                    : `₹${(s.monthlySalary || 0).toLocaleString("en-IN")}/mo`}
                </td>
                <td style={{ padding: "5px 8px", textAlign: "center" }}>
                  {s.withEquipment ? (s.equipmentDesc ? s.equipmentDesc.split(",")[0] : "Yes") : "No"}
                </td>
                <td style={{ padding: "5px 8px", textAlign: "center" }}>{s.status}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace" }}>
                  {(s.pendingPayment || 0) > 0 ? `₹${(s.pendingPayment || 0).toLocaleString("en-IN")}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid #000", fontWeight: "bold" }}>
              <td colSpan={7} style={{ padding: "6px 8px", textAlign: "right" }}>Total Pending Payment:</td>
              <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace" }}>
                ₹{pendingPaymentsDue.toLocaleString("en-IN")}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <style jsx global>{`
        @media print {
          .no-print, header, nav, footer, .sidebar-wrapper, .breadcrumb-wrapper {
            display: none !important;
          }
          .staff-print-only {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
