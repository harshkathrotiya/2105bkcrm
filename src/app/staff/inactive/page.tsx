"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SectionHeader from "@/components/ui/SectionHeader";
import ScreenFrame from "@/components/ui/ScreenFrame";
import Badge from "@/components/ui/Badge";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import * as api from "@/lib/api";
import { useStaff } from "@/lib/store";
import type { Staff } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export default function InactiveStaffPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { refreshStaff } = useStaff();
  const [inactiveStaff, setInactiveStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactivating, setReactivating] = useState<number | null>(null);

  const loadInactive = async () => {
    setLoading(true);
    try {
      const data = await api.fetchInactiveStaff();
      setInactiveStaff(data);
    } catch (err) {
      console.error("Failed to load inactive staff:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInactive();
  }, []);

  const handleReactivate = async (id: number, name: string) => {
    const ok = await confirm({
      message: `Reactivate ${name}? They will appear in the staff list again.`,
      confirmLabel: "Reactivate",
    });
    if (!ok) return;
    setReactivating(id);
    try {
      await api.reactivateStaff(id);
      await refreshStaff();
      await loadInactive();
      toast.success(`${name} has been reactivated.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to reactivate staff");
    } finally {
      setReactivating(null);
    }
  };

  const getAvatarInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <SectionHeader
        title={<>Inactive <strong>Staff</strong></>}
        description="View deactivated staff members and restore them to the active roster if needed."
      />

      <ScreenFrame
        breadcrumb="Staff › Inactive"
        actions={
          <Link href="/staff" className="btn">← Back to Staff List</Link>
        }
      >
        {loading ? (
          <LoadingSkeleton rows={6} message="Loading inactive staff..." />
        ) : inactiveStaff.length === 0 ? (
          <div className="text-center py-12 text-tx3" style={{ fontStyle: "italic" }}>
            No deactivated staff members found.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, border: "none" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: "42px" }}></th>
                  <th>Name</th>
                  <th style={{ width: "100px" }}>Type</th>
                  <th style={{ width: "140px" }}>Role</th>
                  <th style={{ width: "150px" }}>Payment</th>
                  <th style={{ width: "110px" }}>With Equip.</th>
                  <th style={{ width: "120px" }} className="tc">Action</th>
                </tr>
              </thead>
              <tbody>
                {inactiveStaff.map((s) => (
                  <tr key={s.id} onClick={() => router.push(`/staff/${s.id}`)} style={{ opacity: 0.75, cursor: "pointer" }}>
                    <td>
                      <div
                        className="avatar-sm"
                        style={{
                          background: "#2a2a2a",
                          color: "var(--tx3)",
                          fontWeight: 600,
                        }}
                      >
                        {getAvatarInitials(s.name)}
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: "var(--tx2)", fontSize: "13px" }}>{s.name}</strong>
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
                    <td className="tc" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleReactivate(s.id, s.name)}
                        className="btn btn-success"
                        style={{ fontSize: "10.5px", padding: "3px 10px" }}
                        disabled={reactivating === s.id}
                      >
                        {reactivating === s.id ? "..." : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ScreenFrame>
    </>
  );
}
