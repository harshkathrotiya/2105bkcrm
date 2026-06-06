"use client";

import Link from "next/link";
import { List as ListIcon } from "lucide-react";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import StaffOrgExplorer from "../staff/StaffOrgExplorer";
import { useStaff } from "@/lib/store";

export default function Screen23StaffExplorer() {
  const { staff, loading } = useStaff();

  if (loading) {
    return (
      <div style={{ padding: "8px" }}>
        <LoadingSkeleton rows={10} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Minimal top bar: title + back to list */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 600, color: "var(--tx)", letterSpacing: "-0.02em" }}>
          Organization Explorer
        </h1>
        <Link href="/staff" className="btn">
          <ListIcon size={13} /> List View
        </Link>
      </div>

      <StaffOrgExplorer staff={staff} />
    </div>
  );
}
