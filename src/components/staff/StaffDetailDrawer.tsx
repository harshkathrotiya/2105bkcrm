"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, Phone, Briefcase, Building2, Wrench, CreditCard, ArrowUpRight } from "lucide-react";
import Badge from "../ui/Badge";
import { departmentColor, type StaffWithStatus } from "@/lib/staff-hierarchy";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function StaffDetailDrawer({
  staff,
  onClose,
}: {
  staff: StaffWithStatus | null;
  onClose: () => void;
}) {
  const open = !!staff;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const accent = staff ? departmentColor(staff.department) : "#6366f1";

  return (
    <>
      {/* overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--modal-overlay)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity .25s ease",
          zIndex: 200,
        }}
      />
      {/* drawer */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: "min(380px, 92vw)",
          background: "var(--s1)",
          borderLeft: "1px solid var(--b1)",
          boxShadow: "var(--shadow-lg)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform .3s cubic-bezier(.4,0,.2,1)",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {staff && (
          <>
            {/* header band */}
            <div style={{ background: `linear-gradient(135deg, ${accent}24, transparent)`, padding: "18px 18px 16px", borderBottom: "1px solid var(--b1)", position: "relative" }}>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{ position: "absolute", top: 14, right: 14, background: "var(--s2)", border: "1px solid var(--b1)", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--tx2)" }}
              >
                <X size={16} />
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${accent}2e`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20, flexShrink: 0 }}>
                  {initials(staff.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "var(--tx)", letterSpacing: "-0.02em" }}>{staff.name}</div>
                  <div style={{ fontSize: 12, color: "var(--tx3)", marginTop: 2 }}>{staff.role}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <Badge variant={staff.staffType === "INHOUSE" ? "gr" : "am"}>{staff.staffType === "INHOUSE" ? "In-house" : "External"}</Badge>
                    <Badge variant={staff.status === "Available" ? "gr" : "bl"}>{staff.status}</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 4 }}>
              <Row icon={<Phone size={14} />} label="Phone" value={staff.phone.replace(/(\d{5})(\d{5})/, "$1 $2")} mono />
              <Row icon={<Building2 size={14} />} label="Department" value={departmentLabel(staff.department)} />
              <Row icon={<Briefcase size={14} />} label="Designation" value={staff.role} />
              <Row
                icon={<CreditCard size={14} />}
                label="Payment"
                value={staff.paymentType === "PER_DAY" ? `₹${(staff.ratePerDay || 0).toLocaleString("en-IN")}/day` : `₹${(staff.monthlySalary || 0).toLocaleString("en-IN")}/mo`}
                mono
              />
              <Row icon={<Wrench size={14} />} label="With equipment" value={staff.withEquipment ? staff.equipmentDesc || "Yes" : "No"} />

              {staff.pendingPayment > 0 && (
                <div style={{ marginTop: 10, background: "var(--sem-am-bg)", border: "1px solid var(--sem-am-bdr)", borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11.5, color: "var(--sem-am-tx)", fontWeight: 500 }}>Pending payment</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--sem-am-tx)", fontFamily: "var(--font-mono)" }}>₹{staff.pendingPayment.toLocaleString("en-IN")}</span>
                </div>
              )}
            </div>

            {/* footer */}
            <div style={{ padding: "14px 18px", borderTop: "1px solid var(--b1)", display: "flex", gap: 8 }}>
              <Link href={`/staff/${staff.id}`} className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                Full Profile <ArrowUpRight size={14} />
              </Link>
              <a href={`tel:${staff.phone}`} className="btn" style={{ justifyContent: "center" }}>
                <Phone size={14} /> Call
              </a>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function Row({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--tbl-line)" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--tx3)" }}>
        <span style={{ color: "var(--tx3)" }}>{icon}</span>
        {label}
      </span>
      <span style={{ fontSize: 12.5, color: "var(--tx2)", fontWeight: 500, fontFamily: mono ? "var(--font-mono)" : undefined, textAlign: "right", maxWidth: "55%" }}>{value}</span>
    </div>
  );
}

function departmentLabel(dept?: string) {
  if (dept === "BOTH") return "Video + LED";
  if (dept === "VIDEO") return "Video Department";
  if (dept === "LED") return "LED Department";
  return "Unassigned";
}
