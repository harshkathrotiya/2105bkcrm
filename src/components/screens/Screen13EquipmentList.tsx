"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import Pagination from "../ui/Pagination";
import { useEquipment } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-current-user";
import { useToast } from "../ui/Toast";

export default function Screen13EquipmentList() {
  const router = useRouter();
  const { can } = useCurrentUser();
  const canCreate = can("equipment.create");
  const toast = useToast();
  const {
    equipment,
    total,
    categoryCounts,
    loading,
    assetSummary,
    refreshEquipment,
    dispatchEquipment,
  } = useEquipment();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deptFilter, setDeptFilter] = useState<"" | "VIDEO" | "LED">("");
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const equipmentAssetsValue = assetSummary ? (
    (assetSummary.categories?.VIDEO_MIXER?.value || 0) +
    (assetSummary.categories?.VIDEO_RECORDER?.value || 0) +
    (assetSummary.categories?.AUDIO_MIXER?.value || 0) +
    (assetSummary.categories?.WIRELESS_TX?.value || 0) +
    (assetSummary.categories?.UPS?.value || 0)
  ) : 0;

  // Trigger query when filters or page changes
  useEffect(() => {
    refreshEquipment({
      category: categoryFilter,
      status: statusFilter || undefined,
      search: search || undefined,
      page: currentPage,
      limit: 20,
      department: deptFilter || undefined,
    });
  }, [categoryFilter, statusFilter, search, currentPage, deptFilter, refreshEquipment]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  // ── CSV Export ──────────────────────────────────────────────────────────
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      // Fetch ALL equipment ignoring current page filters
      const result = await import("@/lib/api").then((api) =>
        api.fetchEquipment({ limit: 9999 })
      );
      const items = result.items;

      const headers = [
        "id",
        "product_name",
        "category",
        "quantity",
        "serial_number",
        "body_name",
        "kit_id",
        "resp_person",
        "purchase_date",
        "purchase_from",
        "bill_number",
        "purchase_price",
        "status",
        "notes",
      ];

      const escapeCell = (val: string | number | null | undefined) => {
        if (val === null || val === undefined) return "";
        const str = String(val);
        // Wrap in quotes if contains comma, quote, or newline
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = items.map((eq) => [
        escapeCell(eq.id),
        escapeCell(eq.productName),
        escapeCell(eq.category),
        escapeCell(eq.quantity),
        escapeCell(eq.serialNumber),
        escapeCell(eq.bodyName),
        escapeCell(eq.kitId),
        escapeCell(eq.respPerson),
        escapeCell(eq.purchaseDate),
        escapeCell(eq.purchaseFrom),
        escapeCell(eq.billNumber),
        escapeCell(eq.purchasePrice),
        escapeCell(eq.status),
        escapeCell(eq.notes),
      ].join(","));

      // UTF-8 BOM prefix so Excel opens it correctly
      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `bk-equipment-${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("CSV export failed:", err);
      toast.error("Export failed: " + (err.message || "Unknown error"));
    } finally {
      setExporting(false);
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) {
      setCsvError("CSV text cannot be empty");
      return;
    }
    setImporting(true);
    setCsvError("");
    setCsvSuccess("");

    try {
      const res = await dispatchEquipment({
        type: "IMPORT_CSV",
        payload: csvText,
      });
      setCsvSuccess(`Successfully imported ${res.count} equipment items!`);
      setCsvText("");
      setTimeout(() => {
        setShowCsvModal(false);
        setCsvSuccess("");
      }, 2000);
    } catch (err: any) {
      setCsvError(err.message || "Failed to import CSV");
    } finally {
      setImporting(false);
    }
  };

  const categoriesList = [
    { key: "ALL", label: "All Items" },
    { key: "CAMERA", label: "Cameras" },
    { key: "VIDEO_MIXER", label: "Video Mixers" },
    { key: "VIDEO_RECORDER", label: "Video Recorders" },
    { key: "AUDIO_MIXER", label: "Audio Mixers" },
    { key: "WIRELESS_TX", label: "Wireless TX" },
    { key: "UPS", label: "UPS Systems" },
    { key: "ACCESSORY", label: "Accessories" },
  ];

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

  // Safe division helper
  const getPercentage = (value: number) => {
    if (!assetSummary || !assetSummary.totalValue) return 0;
    return Math.min(100, Math.round((value / assetSummary.totalValue) * 100));
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "CAMERA": return "var(--gr)";
      case "VIDEO_MIXER": return "var(--bl)";
      case "VIDEO_RECORDER": return "var(--yl)";
      case "AUDIO_MIXER": return "var(--rd)";
      case "WIRELESS_TX": return "var(--acc)";
      case "UPS": return "var(--tx3)";
      case "ACCESSORY": return "var(--tx2)";
      default: return "var(--b2)";
    }
  };

  return (
    <>
      <SectionHeader
        title={<>Equipment <strong>Master List</strong></>}
        description="View and manage the BK Media inventory, including category metrics, statuses, kits, and asset valuations."
      />

      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <div style={{ flex: 1 }}>
          <div className="metrics">
            <div className="met">
              <div className="met-l">Total Items</div>
              <div className="met-v">{assetSummary?.totalCount || 0}</div>
            </div>
            <div className="met">
              <div className="met-l">Total Asset Value</div>
              <div className="met-v g">₹{(assetSummary?.totalValue || 0).toLocaleString("en-IN")}</div>
            </div>
            <div className="met">
              <div className="met-l">Camera Assets</div>
              <div className="met-v b">₹{(assetSummary?.categories?.CAMERA?.value || 0).toLocaleString("en-IN")}</div>
            </div>
            <div className="met">
              <div className="met-l">Equipment Assets</div>
              <div className="met-v a">₹{equipmentAssetsValue.toLocaleString("en-IN")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Asset breakdown bar chart */}
      {assetSummary && (
        <div className="card" style={{ marginBottom: "20px" }}>
          <div className="card-t">Asset Value Breakdown by Category</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {Object.keys(assetSummary.categories).map((catKey) => {
              const catData = assetSummary.categories[catKey];
              const pct = getPercentage(catData.value);
              const color = getCategoryColor(catKey);
              return (
                <div key={catKey} style={{ display: "grid", gridTemplateColumns: "130px 1fr 180px", alignItems: "center", gap: "15px" }}>
                  <div style={{ fontWeight: 500, fontSize: "12px", textTransform: "capitalize" }}>
                    {catKey.toLowerCase().replace(/_/g, " ")}
                  </div>
                  <div style={{ background: "var(--b1)", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: "4px", transition: "width 0.3s ease" }}></div>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--tx2)", display: "flex", justifyContent: "space-between" }}>
                    <span>{catData.count} items</span>
                    <span style={{ fontWeight: 600, color: "var(--tx)" }}>₹{catData.value.toLocaleString("en-IN")} ({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ScreenFrame
        breadcrumbs={[{ label: "Equipment" }]}
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn"
              onClick={handleExportCsv}
              disabled={exporting}
              title="Download all equipment as a CSV file"
            >
              {exporting ? "Exporting…" : "↑ Export CSV"}
            </button>
            {canCreate && (
              <button className="btn" onClick={() => setShowCsvModal(true)}>
                ↓ Import CSV
              </button>
            )}
            <Link href="/reports/assets/pdf" className="btn">
              ▤ Asset Report (PDF)
            </Link>
            {canCreate && (
              <Link href="/equipment/new" className="btn btn-primary">
                + Add Equipment
              </Link>
            )}
          </div>
        }
      >
        <div className="two-col" style={{ gridTemplateColumns: "180px 1fr" }}>
          {/* Categories Sidebar */}
          <aside className="sf" style={{ background: "var(--alt2)", borderRight: "1px solid var(--b1)", alignSelf: "start" }}>
            <div className="tb" style={{ padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: "var(--tx3)" }}>
              CATEGORIES
            </div>
            <div style={{ padding: "6px" }}>
              {categoriesList.map((cat) => {
                const isActive = categoryFilter === cat.key;
                const count = categoryCounts[cat.key] || 0;
                return (
                  <button
                    key={cat.key}
                    onClick={() => { setCategoryFilter(cat.key); setCurrentPage(1); }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "7px 10px",
                      borderRadius: "6px",
                      background: isActive ? "var(--sidebar-active)" : "transparent",
                      color: isActive ? "var(--tx)" : "var(--tx2)",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: isActive ? 600 : 400,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "2px",
                    }}
                  >
                    <span>{cat.label}</span>
                    <span className="badge bdg-gy" style={{ padding: "1px 6px", fontSize: "9px" }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main equipment table */}
          <div>
            <div className="card !p-3" style={{ marginBottom: "0px" }}>
              {/* Dept tabs */}
              <div className="flex gap-1" style={{ marginBottom: "12px" }}>
                {([["", "All"], ["VIDEO", "Video"], ["LED", "LED"]] as const).map(([val, label]) => (
                  <button
                    key={val}
                    className={`btn text-[10px] px-3 ${deptFilter === val ? "btn-primary" : ""}`}
                    onClick={() => { setDeptFilter(val); setCurrentPage(1); }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <input
                  type="text"
                  placeholder="Search by product name, serial number, responsible..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="finp"
                  style={{ flex: "1" }}
                />
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="fsel"
                  style={{ flex: "0 0 160px" }}
                >
                  <option value="">All Statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="IN_USE">In Use</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="SOLD">Sold</option>
                  <option value="RETIRED">Retired</option>
                </select>
              </div>

              {loading ? (
                <LoadingSkeleton rows={6} message="Querying equipment..." />
              ) : (
                <>
                  <div className="tbl-scroll">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th style={{ width: "30px" }}>No.</th>
                        <th>Product name</th>
                        <th style={{ width: "95px" }}>Category</th>
                        <th style={{ width: "100px" }}>Body / Kit</th>
                        <th style={{ width: "90px" }}>Serial no.</th>
                        <th style={{ width: "100px", textAlign: "right" }}>Purchase price</th>
                        <th style={{ width: "75px" }}>Status</th>
                        <th style={{ width: "70px" }}>Resp.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipment.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-6 text-tx3">
                            No equipment items matching filters
                          </td>
                        </tr>
                      ) : (
                        equipment.map((item) => (
                          <tr
                            key={item.id}
                            className="cursor-pointer"
                            onClick={() => router.push(`/equipment/${item.id}`)}
                          >
                            <td>{item.id}</td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontWeight: 500, color: "var(--tx)" }}>{item.productName}</span>
                                {item.ownershipType === "VENDOR" && (
                                  <Badge variant="am">
                                    Vendor: {item.vendorName || "Outsourced"}
                                  </Badge>
                                )}
                              </div>
                              {item.bodyName && (
                                <div style={{ fontSize: "10px", color: "var(--tx3)", marginTop: "1px" }}>
                                  Main Body: {item.bodyName}
                                </div>
                              )}
                            </td>
                            <td>
                              <Badge variant={getCategoryBadgeVariant(item.category)}>
                                {item.category.replace(/_/g, " ")}
                              </Badge>
                            </td>
                            <td>{item.kitName || <span style={{ color: "var(--tx3)" }}>—</span>}</td>
                            <td className="font-mono text-[11px]" style={{ wordBreak: "break-all" }}>
                              {item.serialNumber || <span style={{ color: "var(--tx3)" }}>—</span>}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {item.purchasePrice !== null && item.purchasePrice !== undefined ? (
                                <span style={{ fontWeight: 500 }}>₹{item.purchasePrice.toLocaleString("en-IN")}</span>
                              ) : (
                                <span style={{ color: "var(--tx3)", fontStyle: "italic" }}>Not entered</span>
                              )}
                            </td>
                            <td>
                              <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
                            </td>
                            <td>{item.respPerson || <span style={{ color: "var(--tx3)" }}>—</span>}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  </div>

                  <Pagination
                    page={currentPage}
                    totalPages={totalPages}
                    totalItems={total}
                    itemsPerPage={20}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </ScreenFrame>

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "var(--modal-overlay)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1000, padding: "20px"
        }}>
          <div className="sf" style={{ width: "100%", maxWidth: "600px", background: "var(--s1)" }}>
            <div className="tb">
              <span style={{ fontWeight: 600, color: "var(--tx)" }}>Import Equipment from CSV</span>
              <button className="btn" style={{ padding: "4px 8px" }} onClick={() => setShowCsvModal(false)}>✕</button>
            </div>
            <form onSubmit={handleImportCsv} style={{ padding: "20px" }}>
              <p style={{ color: "var(--tx2)", fontSize: "11.5px", marginBottom: "12px", lineHeight: "1.5" }}>
                Paste CSV text with column headers. The headers <strong>product_name</strong> and <strong>category</strong> are required.
                Supported categories: <code>CAMERA, VIDEO_MIXER, VIDEO_RECORDER, AUDIO_MIXER, WIRELESS_TX, UPS, ACCESSORY</code>.
              </p>
              
              <div style={{ marginBottom: "15px" }}>
                <textarea
                  className="ftxt"
                  style={{ minHeight: "180px", fontFamily: "var(--font-mono)", fontSize: "11px" }}
                  placeholder="product_name,category,quantity,serial_number,purchase_price,resp_person,notes&#10;Sony FX6,CAMERA,1,7000701,450000,Vikram,Excellent condition&#10;Generic HDMI Cable,ACCESSORY,5,ACC-S-1050,500,Priya,Extra spare cables"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  disabled={importing}
                />
              </div>

              {csvError && <div style={{ color: "var(--rd)", background: "var(--sem-rd-bg)", border: "1px solid var(--sem-rd-bdr)", borderRadius: "6px", padding: "10px", marginBottom: "15px", fontSize: "11.5px" }}>{csvError}</div>}
              {csvSuccess && <div style={{ color: "var(--gr)", background: "var(--sem-gr-bg)", border: "1px solid var(--sem-gr-bdr)", borderRadius: "6px", padding: "10px", marginBottom: "15px", fontSize: "11.5px" }}>{csvSuccess}</div>}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" className="btn" onClick={() => setShowCsvModal(false)} disabled={importing}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={importing}>
                  {importing ? "Importing..." : "Start Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
