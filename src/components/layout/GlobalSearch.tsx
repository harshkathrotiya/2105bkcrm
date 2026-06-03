"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  useClients,
  useInquiries,
  useQuotations,
  useInvoices,
  useStaff,
  useEquipment,
} from "@/lib/store";

interface Result {
  label: string;
  sub: string;
  group: string;
  href: string;
}

/**
 * GlobalSearch — header search across all major records.
 * Press "/" to focus, arrow keys to navigate, Enter to open, Esc to close.
 */
export default function GlobalSearch() {
  const router = useRouter();
  const { clients } = useClients();
  const { inquiries } = useInquiries();
  const { quotations } = useQuotations();
  const { invoices } = useInvoices();
  const { staff } = useStaff();
  const { equipment } = useEquipment();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // "/" focuses search (unless typing in a field already)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click outside closes
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: Result[] = [];
    const hit = (s?: string | null) => (s || "").toLowerCase().includes(q);

    for (const c of clients) {
      if (hit(c.name) || hit(c.contact) || hit(c.mobile) || hit(c.email)) {
        out.push({ label: c.name, sub: c.contact || c.mobile || "Client", group: "Clients", href: `/clients/${c.id}` });
      }
    }
    for (const i of inquiries) {
      const cn = clients.find((c) => c.id === i.clientId)?.name;
      if (hit(i.eventName) || hit(i.eventType) || hit(i.venue) || hit(cn)) {
        out.push({ label: i.eventName || i.eventType || "Inquiry", sub: `${cn || ""} · ${i.startDate}`, group: "Inquiries", href: `/inquiries/new?id=${i.id}` });
      }
    }
    for (const qt of quotations) {
      if (hit(qt.quoteNo) || hit(qt.clientName) || hit(qt.eventName)) {
        out.push({ label: qt.quoteNo || qt.eventName, sub: `${qt.clientName} · ${qt.status}`, group: "Quotations", href: `/quotations/${qt.id}/approval` });
      }
    }
    for (const inv of invoices) {
      if (hit(inv.invoiceNo) || hit(inv.clientName) || hit(inv.eventName)) {
        out.push({ label: inv.invoiceNo || inv.eventName, sub: `${inv.clientName} · ${inv.status}`, group: "Invoices", href: `/invoices/${inv.id}` });
      }
    }
    for (const s of staff) {
      if (hit(s.name) || hit(s.role) || hit(s.phone)) {
        out.push({ label: s.name, sub: `${s.role} · ${s.staffType}`, group: "Staff", href: `/staff/${s.id}` });
      }
    }
    for (const e of equipment) {
      if (hit(e.productName) || hit(e.serialNumber)) {
        out.push({ label: e.productName, sub: `${e.category}${e.serialNumber ? ` · ${e.serialNumber}` : ""}`, group: "Equipment", href: `/equipment/${e.id}` });
      }
    }
    return out.slice(0, 12);
  }, [query, clients, inquiries, quotations, invoices, staff, equipment]);

  useEffect(() => { setActive(0); }, [query]);

  const go = (r: Result) => {
    setOpen(false);
    setQuery("");
    router.push(r.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active]); }
    else if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
  };

  return (
    <div ref={boxRef} style={{ position: "relative", flex: 1, maxWidth: 420 }}>
      <div style={{ position: "relative" }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--tx3)", pointerEvents: "none" }} />
        <input
          ref={inputRef}
          className="finp"
          style={{ paddingLeft: 30, height: 32, fontSize: 12 }}
          placeholder="Search clients, inquiries, quotes, staff…  ( / )"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
            background: "var(--s1)", border: "1px solid var(--b2)", borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)", maxHeight: 380, overflowY: "auto",
          }}
        >
          {results.length === 0 ? (
            <div style={{ padding: "14px", fontSize: 12, color: "var(--tx3)", textAlign: "center" }}>No matches.</div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.href}-${i}`}
                onClick={() => go(r)}
                onMouseEnter={() => setActive(i)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
                  padding: "8px 12px", border: "none", cursor: "pointer", textAlign: "left",
                  background: i === active ? "var(--s2)" : "transparent",
                }}
              >
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 12, color: "var(--tx)" }}>{r.label}</span>
                  <span style={{ fontSize: 10, color: "var(--tx3)" }}>{r.sub}</span>
                </span>
                <span style={{ fontSize: 9, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 0.5 }}>{r.group}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
