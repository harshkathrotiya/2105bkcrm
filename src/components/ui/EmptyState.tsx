"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * EmptyState — standardized "nothing here" / "no matches" block for list screens.
 * Use inside a table cell (colSpan) or a card body.
 */
export default function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--tx3)" }}>
      {icon && <div style={{ marginBottom: 8, display: "flex", justifyContent: "center", opacity: 0.7 }}>{icon}</div>}
      <div style={{ fontSize: 13, color: "var(--tx2)", fontWeight: 500 }}>{title}</div>
      {hint && <div style={{ fontSize: 11.5, marginTop: 4 }}>{hint}</div>}
      {action && (
        <div style={{ marginTop: 12 }}>
          {action.href ? (
            <Link href={action.href} className="btn btn-primary text-[12px]">{action.label}</Link>
          ) : (
            <button className="btn btn-primary text-[12px]" onClick={action.onClick}>{action.label}</button>
          )}
        </div>
      )}
    </div>
  );
}
