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
const H_GAP = 26; // gap between sibling subtrees
const V_GAP = 150; // vertical distance between levels

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

  // First pass: assign x by packing leaves, track subtree widths.
  let cursor = 0;
  const positions = new Map<string, { x: number; depth: number }>();

  function layout(node: OrgNode, depth: number): number {
    const isExpanded = expanded.has(node.id);
    const kids = isExpanded ? node.children : [];

    let x: number;
    if (kids.length === 0) {
      x = cursor;
      cursor += NODE_W + H_GAP;
    } else {
      const childXs = kids.map((k) => layout(k, depth + 1));
      x = (childXs[0] + childXs[childXs.length - 1]) / 2;
    }
    positions.set(node.id, { x, depth });
    return x;
  }

  layout(root, 0);

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
      position: { x: pos.x, y: pos.depth * V_GAP },
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
        rfEdges.push({
          id: `${node.id}->${child.id}`,
          source: node.id,
          target: child.id,
          type: "smoothstep",
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
