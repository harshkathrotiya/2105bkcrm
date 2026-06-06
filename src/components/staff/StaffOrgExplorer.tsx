"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Search, Maximize2, X } from "lucide-react";
import { buildOrgTree, type OrgNode, type StaffWithStatus } from "@/lib/staff-hierarchy";
import { buildFlow } from "./orgLayout";
import OrgNodeCard from "./OrgNodeCard";
import ColumnEdge from "./ColumnEdge";
import StaffDetailDrawer from "./StaffDetailDrawer";

const nodeTypes: NodeTypes = { org: OrgNodeCard };
const edgeTypes: EdgeTypes = { column: ColumnEdge };

/** Walk the tree collecting ids of nodes that match the query + all their ancestors. */
function searchTree(root: OrgNode, query: string): { matched: Set<string>; expand: Set<string> } {
  const q = query.trim().toLowerCase();
  const matched = new Set<string>();
  const expand = new Set<string>();
  if (!q) return { matched, expand };

  function visit(node: OrgNode, ancestors: string[]): boolean {
    const hit =
      node.label.toLowerCase().includes(q) ||
      (node.kind === "person" && node.staff?.phone.includes(q)) ||
      (node.sub?.toLowerCase().includes(q) ?? false);

    let childHit = false;
    for (const child of node.children) {
      if (visit(child, [...ancestors, node.id])) childHit = true;
    }

    if (hit || childHit) {
      if (hit) matched.add(node.id);
      // expand every ancestor + this node so the match is visible
      ancestors.forEach((a) => expand.add(a));
      if (childHit) expand.add(node.id);
      return true;
    }
    return false;
  }

  visit(root, []);
  return { matched, expand };
}

export default function StaffOrgExplorer({ staff }: { staff: StaffWithStatus[] }) {
  const tree = useMemo(() => buildOrgTree(staff), [staff]);

  // start fully fanned out: director + live departments + their role groups,
  // so the big visual hierarchy is visible immediately on load
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const init = new Set<string>(["director"]);
    tree.children.forEach((d) => {
      if (d.counts && d.counts.total > 0) {
        init.add(d.id);
        d.children.forEach((role) => init.add(role.id));
      }
    });
    return init;
  });

  const [query, setQuery] = useState("");
  const [drawerStaff, setDrawerStaff] = useState<StaffWithStatus | null>(null);

  const { matched, expand: searchExpand } = useMemo(() => searchTree(tree, query), [tree, query]);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openPerson = useCallback((node: OrgNode) => {
    if (node.staff) setDrawerStaff(node.staff);
  }, []);

  // Single source of truth for node clicks (React Flow's own handler — robust
  // against pointer-event quirks of custom-node inner onClick).
  const onNodeClick = useCallback(
    (_e: React.MouseEvent, rfNode: { data: unknown }) => {
      const node = (rfNode.data as { node: OrgNode }).node;
      if (node.kind === "person") {
        if (node.staff) setDrawerStaff(node.staff);
      } else {
        toggle(node.id);
      }
    },
    [toggle]
  );

  // effective expansion = manual ∪ search-forced
  const effectiveExpanded = useMemo(() => {
    if (!query.trim()) return expanded;
    return new Set([...expanded, ...searchExpand]);
  }, [expanded, searchExpand, query]);

  const { rfNodes, rfEdges } = useMemo(
    () =>
      buildFlow(tree, effectiveExpanded, {
        matchedIds: query.trim() ? matched : null,
        onToggle: toggle,
        onOpen: openPerson,
      }),
    [tree, effectiveExpanded, matched, query, toggle, openPerson]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  // keep React Flow state in sync when the derived graph changes
  useEffect(() => {
    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [rfNodes, rfEdges, setNodes, setEdges]);

  const expandAll = () => {
    const all = new Set<string>();
    const walk = (n: OrgNode) => {
      if (n.children.length) all.add(n.id);
      n.children.forEach(walk);
    };
    walk(tree);
    setExpanded(all);
  };

  const collapseAll = () => setExpanded(new Set(["director"]));

  return (
    <>
      {/* Full-bleed canvas — the graph IS the page */}
      <div
        style={{
          height: "calc(100vh - 150px)",
          minHeight: 480,
          borderRadius: 14,
          border: "1px solid var(--b1)",
          overflow: "hidden",
          background: "var(--alt)",
          position: "relative",
          boxShadow: "var(--shadow)",
        }}
        className="org-flow-wrap"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
          minZoom={0.2}
          maxZoom={1.75}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          panOnScroll
          zoomOnDoubleClick={false}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1.4} color="var(--b2)" />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>

        {/* Floating control bar — search + expand/collapse, overlaid on the canvas */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            zIndex: 6,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "min(340px, 60vw)",
              pointerEvents: "auto",
              boxShadow: "var(--shadow)",
              borderRadius: 8,
            }}
          >
            <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--tx3)" }} />
            <input
              className="finp"
              placeholder="Search employee, role or department…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: 32, paddingRight: query ? 32 : 12, fontSize: 12.5 }}
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--tx3)", display: "flex" }}>
                <X size={14} />
              </button>
            )}
          </div>
          <button className="btn" onClick={expandAll} style={{ pointerEvents: "auto", boxShadow: "var(--shadow)" }}>
            <Maximize2 size={13} /> Expand all
          </button>
          <button className="btn" onClick={collapseAll} style={{ pointerEvents: "auto", boxShadow: "var(--shadow)" }}>
            Collapse
          </button>
          {query.trim() && (
            <span
              style={{
                pointerEvents: "auto",
                fontSize: 11,
                color: matched.size ? "var(--tx2)" : "var(--rd)",
                background: "var(--s1)",
                border: "1px solid var(--b1)",
                borderRadius: 8,
                padding: "6px 10px",
                boxShadow: "var(--shadow)",
              }}
            >
              {matched.size > 0 ? `${matched.size} match${matched.size === 1 ? "" : "es"}` : "No matches"}
            </span>
          )}
        </div>

        {/* legend */}
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            background: "var(--s1)",
            border: "1px solid var(--b1)",
            borderRadius: 10,
            padding: "8px 11px",
            display: "flex",
            gap: 14,
            fontSize: 10.5,
            color: "var(--tx3)",
            boxShadow: "var(--shadow)",
            zIndex: 5,
          }}
        >
          <LegendDot color="var(--gr)" label="Available" />
          <LegendDot color="var(--bl)" label="On event" />
          <span style={{ color: "var(--tx3)" }}>Click to drill down · click a person for details</span>
        </div>
      </div>

      <StaffDetailDrawer staff={drawerStaff} onClose={() => setDrawerStaff(null)} />
    </>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      {label}
    </span>
  );
}
