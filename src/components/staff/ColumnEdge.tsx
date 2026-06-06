"use client";

import { BaseEdge, type EdgeProps } from "@xyflow/react";

/**
 * A crisp indented-tree connector for the vertical department columns:
 * drops straight down from the parent's bottom-left rail, then turns with a
 * small rounded corner into the child's left edge — the classic └─ branch.
 *
 * Unlike the built-in smoothstep, the vertical segment is pinned to the
 * source X so every sibling shares the same visual spine.
 */
export default function ColumnEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
}: EdgeProps) {
  const r = Math.min(8, Math.abs(targetX - sourceX) / 2, Math.abs(targetY - sourceY) / 2);
  const turnY = targetY - r;

  // down the spine, rounded corner, then right into the target handle
  const path = `M ${sourceX} ${sourceY} L ${sourceX} ${turnY} Q ${sourceX} ${targetY} ${sourceX + r} ${targetY} L ${targetX} ${targetY}`;

  return <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />;
}
