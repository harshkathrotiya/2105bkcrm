"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Network, ArrowUpRight, ArrowRight } from "lucide-react";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import LoadingSkeleton, { ShimmerBar } from "../ui/LoadingSkeleton";
import Pagination from "../ui/Pagination";
import { useStaff } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import { getAvatarStyle } from "@/lib/constants";
import type { Staff } from "@/lib/types";

export default function Screen20StaffList() {
  const router = useRouter();
  const { can } = useCurrentUser();
  const canCreate = can("staff.create");
  const { staff, loading } = useStaff();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarFilter, setSidebarFilter] = useState<"ALL" | "INHOUSE" | "EXTERNAL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Available" | "Deployed">("ALL");
  const [paymentFilter, setPaymentFilter] = useState<"ALL" | "PER_DAY" | "MONTHLY">("ALL");

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

      // Dropdown status match
      const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;

      // Dropdown payment match
      const matchesPayment = paymentFilter === "ALL" || s.paymentType === paymentFilter;

      // Sidebar type match
      const matchesType = sidebarFilter === "ALL" || s.staffType === sidebarFilter;

      return matchesSearch && matchesStatus && matchesPayment && matchesType;
    });
  }, [staff, searchQuery, statusFilter, paymentFilter, sidebarFilter]);

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


  if (loading) {
    return (
      <>
        <div className="no-print">
          <SectionHeader
            title={<>Staff <strong>Directory</strong></>}
            description="Manage in-house employees, external contractors, assign positions, check availability and record payments."
          />

          {/* Metrics Loading State */}
          <div className="metrics" style={{ marginBottom: "20px" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="met" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <ShimmerBar width="50%" height="10px" style={{ opacity: 0.6, animationDelay: `${i * 40}ms` }} />
                <ShimmerBar width="25%" height="24px" style={{ animationDelay: `${i * 40 + 20}ms` }} />
              </div>
            ))}
          </div>

          <ScreenFrame
            breadcrumbs={[{ label: "Staff" }]}
            actions={
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <ShimmerBar width="110px" height="30px" radius="6px" style={{ animationDelay: "100ms" }} />
                <ShimmerBar width="120px" height="30px" radius="6px" style={{ animationDelay: "130ms" }} />
                <ShimmerBar width="160px" height="30px" radius="6px" style={{ animationDelay: "160ms" }} />
                <ShimmerBar width="110px" height="30px" radius="6px" style={{ animationDelay: "190ms" }} />
                <ShimmerBar width="90px" height="30px" radius="6px" style={{ animationDelay: "220ms" }} />
              </div>
            }
          >
            <div>
              <div className="card !p-3" style={{ marginBottom: "0px" }}>
                {/* Search & filters Loading State */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                  <ShimmerBar width="100%" height="38px" radius="8px" style={{ flex: 1, animationDelay: "250ms" }} />
                  <ShimmerBar width="135px" height="38px" radius="8px" style={{ flex: "0 0 135px", animationDelay: "280ms" }} />
                  <ShimmerBar width="135px" height="38px" radius="8px" style={{ flex: "0 0 135px", animationDelay: "310ms" }} />
                </div>

                {/* Table Loading State */}
                <div className="tbl-scroll">
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
                      {Array.from({ length: 8 }).map((_, ri) => (
                        <tr key={ri} style={{ cursor: "default" }}>
                          <td>
                            <ShimmerBar width="32px" height="32px" radius="50%" style={{ animationDelay: `${ri * 60 + 350}ms` }} />
                          </td>
                          <td>
                            <ShimmerBar width="140px" height="13px" style={{ animationDelay: `${ri * 60 + 360}ms`, marginBottom: "4px" }} />
                            <ShimmerBar width="90px" height="9px" style={{ animationDelay: `${ri * 60 + 375}ms` }} />
                          </td>
                          <td>
                            <ShimmerBar width="60px" height="18px" radius="4px" style={{ animationDelay: `${ri * 60 + 370}ms` }} />
                          </td>
                          <td>
                            <ShimmerBar width="100px" height="12px" style={{ animationDelay: `${ri * 60 + 380}ms` }} />
                          </td>
                          <td>
                            <ShimmerBar width="80px" height="12px" style={{ animationDelay: `${ri * 60 + 390}ms` }} />
                          </td>
                          <td>
                            <ShimmerBar width="50px" height="18px" radius="4px" style={{ animationDelay: `${ri * 60 + 400}ms` }} />
                          </td>
                          <td>
                            <ShimmerBar width="65px" height="18px" radius="4px" style={{ animationDelay: `${ri * 60 + 410}ms` }} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Loading State */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
                  <ShimmerBar width="120px" height="12px" style={{ opacity: 0.6 }} />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <ShimmerBar width="32px" height="32px" radius="6px" />
                    <ShimmerBar width="32px" height="32px" radius="6px" />
                    <ShimmerBar width="32px" height="32px" radius="6px" />
                  </div>
                </div>
              </div>
            </div>
          </ScreenFrame>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="no-print">
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
        breadcrumbs={[{ label: "Staff" }]}
        actions={
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Link href="/staff/explorer" className="btn">
              <Network size={13} /> Org Explorer
            </Link>
            <select
              className="fsel"
              style={{ fontSize: "12px" }}
              value={sidebarFilter}
              onChange={(e) => { setSidebarFilter(e.target.value as any); setCurrentPage(1); }}
            >
              <option value="ALL">All Staff ({counts.total})</option>
              <option value="INHOUSE">In-house ({counts.inHouse})</option>
              <option value="EXTERNAL">External ({counts.external})</option>
            </select>
            <Link href="/staff/reports" className="btn btn-primary">Salary Reports & Payroll <ArrowUpRight size={12} /></Link>
            <Link href="/staff/inactive" className="btn">Inactive Staff <ArrowRight size={12} /></Link>
            <button className="btn" onClick={handleExportCSV}>Export CSV</button>
            <button className="btn" onClick={handleExportPDF}>Export PDF</button>
            {canCreate && <Link href="/staff/new" className="btn btn-primary">+ Add Staff</Link>}
          </div>
        }
      >
          {/* Main Grid Content */}
          <div>
            <div className="card !p-3" style={{ marginBottom: "0px" }}>
              
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
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Available">Available</option>
                  <option value="Deployed">Deployed</option>
                </select>
                <select
                  className="fsel"
                  style={{ width: "135px", fontSize: "12px" }}
                  value={paymentFilter}
                  onChange={(e) => { setPaymentFilter(e.target.value as any); setCurrentPage(1); }}
                >
                  <option value="ALL">All Payments</option>
                  <option value="PER_DAY">Per Day</option>
                  <option value="MONTHLY">Monthly Fixed</option>
                </select>
              </div>

                <>
                  {/* Table */}
                  <div className="tbl-scroll">
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
                              className="cursor-pointer"
                              onClick={() => router.push(`/staff/${s.id}`)}
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
                                <Badge variant={s.status === "Available" ? "gr" : "pu"}>
                                  {s.status}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  </div>

                  <Pagination
                    page={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredStaff.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                  />
                </>
            </div>
          </div>
      </ScreenFrame>
      </div>

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
