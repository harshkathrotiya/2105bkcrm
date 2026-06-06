"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ChevronDown, ChevronRight, Users, Building2, Crown } from "lucide-react";
import { departmentColor } from "@/lib/staff-hierarchy";
import type { OrgNodeData } from "./orgLayout";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const STATUS_DOT: Record<string, string> = {
  Available: "var(--gr)",
  Deployed: "var(--bl)",
};

function OrgNodeCardInner({ data }: NodeProps) {
  const d = data as OrgNodeData;
  const { node, expanded, hasChildren, dimmed, matched } = d;
  const accent = departmentColor(node.dept);
  const isFuture = node.sub === "Coming soon";

  const ring = matched ? `0 0 0 2px var(--acc), 0 0 0 5px var(--focus-shadow)` : "var(--shadow)";

  return (
    <div
      onClick={() => (node.kind === "person" ? d.onOpen(node) : d.onToggle(node.id))}
      style={{
        width: 230,
        cursor: "pointer",
        opacity: dimmed ? 0.32 : isFuture ? 0.6 : 1,
        transition: "opacity .25s ease, transform .15s ease, box-shadow .2s ease",
        transform: matched ? "scale(1.03)" : "scale(1)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = matched ? "scale(1.04)" : "scale(1.02)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = matched ? "scale(1.03)" : "scale(1)")}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />

      <div
        style={{
          position: "relative",
          background: "var(--s1)",
          border: `1px solid ${matched ? "var(--acc)" : "var(--b1)"}`,
          borderLeft: `3px solid ${accent}`,
          borderRadius: 12,
          padding: node.kind === "person" ? "10px 12px" : "12px 14px",
          boxShadow: ring,
          borderStyle: isFuture ? "dashed" : "solid",
        }}
      >
        {/* ── Director ── */}
        {node.kind === "director" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={badgeIcon(accent)}>
              <Crown size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={titleStyle}>{node.label}</div>
              <div style={subStyle}>{node.sub}</div>
            </div>
            {hasChildren && (expanded ? <ChevronDown size={16} color="var(--tx3)" /> : <ChevronRight size={16} color="var(--tx3)" />)}
          </div>
        )}

        {/* ── Department ── */}
        {node.kind === "department" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={badgeIcon(accent)}>
                <Building2 size={15} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={titleStyle}>{node.label}</div>
                <div style={subStyle}>{node.sub}</div>
              </div>
              {hasChildren && (expanded ? <ChevronDown size={15} color="var(--tx3)" /> : <ChevronRight size={15} color="var(--tx3)" />)}
            </div>
            {node.counts && node.counts.total > 0 && (
              <div style={statRow}>
                <Stat dot="var(--gr)" value={node.counts.available} label="free" />
                <Stat dot="var(--bl)" value={node.counts.deployed} label="on event" />
                <Stat dot="var(--tx3)" value={node.counts.total} label="total" />
              </div>
            )}
          </>
        )}

        {/* ── Role group ── */}
        {node.kind === "role" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ ...badgeIcon(accent), background: "var(--alt2)", color: accent }}>
              <Users size={14} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...titleStyle, fontSize: 13 }}>{node.label}</div>
              <div style={subStyle}>{node.sub}</div>
            </div>
            {hasChildren && (expanded ? <ChevronDown size={14} color="var(--tx3)" /> : <ChevronRight size={14} color="var(--tx3)" />)}
          </div>
        )}

        {/* ── Person ── */}
        {node.kind === "person" && node.staff && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: `${accent}1f`,
                color: accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              {initials(node.label)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...titleStyle, fontSize: 13 }}>{node.label}</div>
              <div style={{ ...subStyle, display: "flex", alignItems: "center", gap: 5 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: STATUS_DOT[node.staff.status] ?? "var(--tx3)",
                    boxShadow: node.staff.status === "Available" ? `0 0 0 3px ${STATUS_DOT.Available}22` : undefined,
                  }}
                />
                {node.staff.status}
                {node.staff.staffType === "EXTERNAL" && <span style={extTag}>EXT</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}

function Stat({ dot, value, label }: { dot: string; value: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot }} />
      <span style={{ fontWeight: 600, color: "var(--tx)", fontSize: 11 }}>{value}</span>
      <span style={{ color: "var(--tx3)", fontSize: 10 }}>{label}</span>
    </div>
  );
}

const titleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: "var(--tx)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  letterSpacing: "-0.01em",
};
const subStyle: React.CSSProperties = {
  fontSize: 10.5,
  color: "var(--tx3)",
  marginTop: 1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const statRow: React.CSSProperties = {
  display: "flex",
  gap: 12,
  marginTop: 10,
  paddingTop: 9,
  borderTop: "1px solid var(--b1)",
};
const extTag: React.CSSProperties = {
  fontSize: 8,
  fontWeight: 700,
  letterSpacing: "0.06em",
  color: "var(--sem-am-tx)",
  background: "var(--sem-am-bg)",
  border: "1px solid var(--sem-am-bdr)",
  borderRadius: 4,
  padding: "0 4px",
  marginLeft: 2,
};
function badgeIcon(color: string): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: 9,
    background: `${color}1f`,
    color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };
}

export default memo(OrgNodeCardInner);
