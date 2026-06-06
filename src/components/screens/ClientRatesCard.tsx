"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import * as api from "@/lib/api";
import type { Equipment } from "@/lib/types";
import { useToast } from "../ui/Toast";

/**
 * ClientRatesCard — manage per-client equipment rate overrides.
 *
 * Shows every priced equipment item with its default rate and lets the user set
 * a client-specific rate. Clearing an override reverts the client to the default.
 */
export default function ClientRatesCard({ clientId }: { clientId: string }) {
  const toast = useToast();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [overrides, setOverrides] = useState<Record<number, number>>({});
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const [eqRes, rates] = await Promise.all([
          api.fetchEquipment({ limit: 200 }),
          api.fetchClientRates(clientId),
        ]);
        if (!active) return;
        setEquipment(eqRes.items);
        const map: Record<number, number> = {};
        for (const r of rates) map[r.equipmentId] = r.rate;
        setOverrides(map);
      } catch (err) {
        console.error("Failed to load client rates:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [clientId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? equipment.filter((e) => e.productName.toLowerCase().includes(q))
      : equipment;
    // Items with an override first, then by name
    return [...list].sort((a, b) => {
      const ao = overrides[a.id] != null ? 0 : 1;
      const bo = overrides[b.id] != null ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return a.productName.localeCompare(b.productName);
    });
  }, [equipment, search, overrides]);

  const saveRate = async (eq: Equipment) => {
    const raw = drafts[eq.id];
    if (raw === undefined || raw === "") return;
    const rate = parseFloat(raw);
    if (isNaN(rate) || rate < 0) return;
    setSavingId(eq.id);
    try {
      await api.saveClientRate(clientId, eq.id, rate);
      setOverrides((prev) => ({ ...prev, [eq.id]: rate }));
      setDrafts((prev) => { const n = { ...prev }; delete n[eq.id]; return n; });
    } catch (err: any) {
      toast.error(err.message || "Failed to save rate");
    } finally {
      setSavingId(null);
    }
  };

  const clearRate = async (eq: Equipment) => {
    setSavingId(eq.id);
    try {
      await api.deleteClientRate(clientId, eq.id);
      setOverrides((prev) => { const n = { ...prev }; delete n[eq.id]; return n; });
      setDrafts((prev) => { const n = { ...prev }; delete n[eq.id]; return n; });
    } catch (err: any) {
      toast.error(err.message || "Failed to clear rate");
    } finally {
      setSavingId(null);
    }
  };

  const overrideCount = Object.keys(overrides).length;

  return (
    <div className="card">
      <div className="card-t" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Client equipment rates</span>
        {overrideCount > 0 && (
          <span style={{ fontSize: 10, color: "var(--tx3)" }}>{overrideCount} custom rate{overrideCount === 1 ? "" : "s"}</span>
        )}
      </div>
      <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 10 }}>
        Set a per-day rate this client pays for specific equipment. No custom rate → the item&apos;s default rate is used.
      </div>

      <input
        className="finp"
        placeholder="Search equipment…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 10 }}
      />

      {loading ? (
        <div style={{ fontSize: 12, color: "var(--tx3)", padding: "12px 0" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--tx3)", padding: "12px 0" }}>No equipment found.</div>
      ) : (
        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          <table className="tbl" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Equipment</th>
                <th style={{ textAlign: "right" }}>Default</th>
                <th style={{ textAlign: "right" }}>This client</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((eq) => {
                const hasOverride = overrides[eq.id] != null;
                const draft = drafts[eq.id];
                const placeholder = eq.defaultRate != null ? String(eq.defaultRate) : "—";
                return (
                  <tr key={eq.id}>
                    <td style={{ fontSize: 11 }}>{eq.productName}</td>
                    <td style={{ textAlign: "right", fontSize: 11, color: "var(--tx3)", fontFamily: "monospace" }}>
                      {eq.defaultRate != null ? `₹${eq.defaultRate.toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <input
                        className="finp text-[11px] text-right"
                        type="number"
                        min={0}
                        style={{ width: 90 }}
                        placeholder={placeholder}
                        value={draft !== undefined ? draft : (hasOverride ? String(overrides[eq.id]) : "")}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [eq.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") saveRate(eq); }}
                      />
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        className="btn btn-primary text-[10px]"
                        disabled={savingId === eq.id || draft === undefined || draft === ""}
                        onClick={() => saveRate(eq)}
                      >
                        Save
                      </button>
                      {hasOverride && (
                        <button
                          className="btn text-[10px]"
                          style={{ marginLeft: 4 }}
                          disabled={savingId === eq.id}
                          onClick={() => clearRate(eq)}
                          title="Revert to default rate"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
