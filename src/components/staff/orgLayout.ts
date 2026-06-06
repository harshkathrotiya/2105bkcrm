/**
 * Computes React Flow nodes + edges for the staff org explorer given the org
 * tree and the current set of expanded node ids. Only children of expanded
 * nodes are materialised, giving the "progressive drill-down" behaviour — the
 * canvas never renders the whole company at once.
 *
 * Layout is a classic tidy top-down tree: leaves are packed left-to-right and
 * each parent is centred over its visible children.
 */

import type { Node, Edge } from "@xyflow/react";
import type { OrgNode } from "@/lib/staff-hierarchy";

export interface OrgNodeData extends Record<string, unknown> {
  node: OrgNode;
  expanded: boolean;
  hasChildren: boolean;
  dimmed: boolean;
  matched: boolean;
  onToggle: (id: string) => void;
  onOpen: (node: OrgNode) => void;
}

const NODE_W = 230;
const H_GAP = 26; // horizontal gap between sibling departments
const V_GAP = 150; // vertical distance between the top (director/department) levels
const COL_V_GAP = 16; // vertical gap between stacked items inside a department column
const COL_INDENT = 34; // how far roles/people indent right of their parent (rail width)

/** Rendered card heights per kind — drives vertical stacking so cards never overlap. */
function cardHeight(node: OrgNode): number {
  switch (node.kind) {
    case "department":
      // header + stat row (free / on event / total)
      return node.counts && node.counts.total > 0 ? 112 : 74;
    case "role":
      return 66;
    case "person":
      return 60;
    default:
      return 74;
  }
}

interface Built {
  rfNodes: Node<OrgNodeData>[];
  rfEdges: Edge[];
}

export function buildFlow(
  root: OrgNode,
  expanded: Set<string>,
  opts: {
    matchedIds: Set<string> | null; // null = no active search
    onToggle: (id: string) => void;
    onOpen: (node: OrgNode) => void;
  }
): Built {
  const rfNodes: Node<OrgNodeData>[] = [];
  const rfEdges: Edge[] = [];

  // Absolute x/y assigned per node. Top two levels (Director, Department) flow
  // top-down/horizontal; everything BELOW a department stacks vertically into a
  // single column (Videographer below Photographer, people below their role).
  const positions = new Map<string, { x: number; y: number }>();

  /**
   * Lay out a department's subtree as a vertical column starting at (x, y).
   * Roles and their people are listed top-to-bottom; people sit indented under
   * their role. Returns the y just past the bottom of the column.
   */
  function layoutColumn(node: OrgNode, x: number, y: number): number {
    positions.set(node.id, { x, y });
    let cursorY = y + cardHeight(node) + COL_V_GAP;
    if (expanded.has(node.id)) {
      for (const child of node.children) {
        cursorY = layoutColumn(child, x + COL_INDENT, cursorY);
      }
    }
    return cursorY;
  }

  // Horizontal packing for the top levels: leaves (collapsed/childless) take a
  // slot; expanded departments reserve the width their column needs.
  let cursorX = 0;

  function layoutTop(node: OrgNode, depth: number): number {
    const isExpanded = expanded.has(node.id);

    // Departments: render their subtree as a vertical column.
    if (node.kind === "department") {
      const x = cursorX;
      // reserve width for the deepest indent (dept → role → person = 2 levels)
      // plus a comfortable gutter so adjacent department columns never overlap.
      cursorX += NODE_W + COL_INDENT * 2 + H_GAP * 2;
      layoutColumn(node, x, depth * V_GAP);
      return x;
    }

    const kids = isExpanded ? node.children : [];
    let x: number;
    if (kids.length === 0) {
      x = cursorX;
      cursorX += NODE_W + H_GAP;
    } else {
      const childXs = kids.map((k) => layoutTop(k, depth + 1));
      x = (childXs[0] + childXs[childXs.length - 1]) / 2;
    }
    positions.set(node.id, { x, y: depth * V_GAP });
    return x;
  }

  layoutTop(root, 0);

  const matched = opts.matchedIds;

  function emit(node: OrgNode) {
    const pos = positions.get(node.id)!;
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children.length > 0;
    const isMatch = matched ? matched.has(node.id) : false;
    const dimmed = matched ? !isMatch : false;

    rfNodes.push({
      id: node.id,
      type: "org",
      position: { x: pos.x, y: pos.y },
      data: {
        node,
        expanded: isExpanded,
        hasChildren,
        dimmed,
        matched: isMatch,
        onToggle: opts.onToggle,
        onOpen: opts.onOpen,
      },
      draggable: false,
    });

    if (isExpanded) {
      for (const child of node.children) {
        const childInColumn = child.kind === "role" || child.kind === "person";
        rfEdges.push({
          id: `${node.id}->${child.id}`,
          source: node.id,
          target: child.id,
          // Column children hang off the parent's bottom-LEFT corner so all
          // siblings share one vertical spine, then branch right into each
          // child's left edge — a clean ├─ / └─ indented-tree rail.
          sourceHandle: childInColumn ? "bl" : undefined,
          targetHandle: childInColumn ? "l" : undefined,
          type: childInColumn ? "column" : "smoothstep",
          animated: child.kind === "person" && child.staff?.status === "Deployed",
          style: {
            stroke: dimmed ? "var(--b1)" : "var(--b2)",
            strokeWidth: 1.5,
            opacity: dimmed ? 0.35 : 1,
          },
        });
        emit(child);
      }
    }
  }

  emit(root);
  return { rfNodes, rfEdges };
}
