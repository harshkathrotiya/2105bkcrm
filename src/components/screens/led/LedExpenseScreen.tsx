"use client";

import { useState, useEffect } from "react";
import { Edit2, Check, X, Plus, Trash2 } from "lucide-react";
import * as api from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import ScreenFrame from "@/components/ui/ScreenFrame";
import SectionHeader from "@/components/ui/SectionHeader";
import type { LedExpensePnL, LedExpense, LedExpenseCategory } from "@/lib/types";

const fmt = (n: number) => n.toLocaleString("en-IN");

const STD_CATEGORIES: { cat: LedExpenseCategory; label: string }[] = [
  { cat: "TRANSPORT", label: "Transport" },
  { cat: "FOOD", label: "Food & Refreshments" },
  { cat: "MISC", label: "Miscellaneous" },
];

export default function LedExpenseScreen({ inquiryId }: { inquiryId: string }) {
  const { success, error } = useToast();
  const [data, setData] = useState<LedExpensePnL | null>(null);
  const [loading, setLoading] = useState(true);
  // Editing state for standard categories: cat -> { editing, value }
  const [editing, setEditing] = useState<Record<string, { active: boolean; value: number }>>({});
  // Custom expense form
  const [customLabel, setCustomLabel] = useState("");
  const [customAmount, setCustomAmount] = useState(0);
  const [addingCustom, setAddingCustom] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const d = await api.fetchLedExpenses(inquiryId);
      setData(d);
    } catch {
      error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [inquiryId]);

  function getStdExpense(cat: LedExpenseCategory): LedExpense | undefined {
    return data?.expenses.find((e) => e.category === cat);
  }

  function getStdAmount(cat: LedExpenseCategory): number {
    return getStdExpense(cat)?.amount ?? 0;
  }

  function startEdit(cat: LedExpenseCategory) {
    setEditing((p) => ({ ...p, [cat]: { active: true, value: getStdAmount(cat) } }));
  }

  function cancelEdit(cat: LedExpenseCategory) {
    setEditing((p) => ({ ...p, [cat]: { active: false, value: 0 } }));
  }

  async function saveEdit(cat: LedExpenseCategory) {
    const val = editing[cat]?.value ?? 0;
    setSaving(true);
    try {
      const existing = getStdExpense(cat);
      if (existing) {
        await api.updateLedExpense(inquiryId, existing.id, { amount: val });
      } else {
        await api.createLedExpense(inquiryId, { category: cat, label: cat.charAt(0) + cat.slice(1).toLowerCase(), amount: val });
      }
      success("Expense saved");
      cancelEdit(cat);
      load();
    } catch (e: unknown) {
      error(e instanceof Error ? e.message : "Failed to save expense");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExpense(expId: number) {
    if (!confirm("Delete this expense?")) return;
    try {
      await api.deleteLedExpense(inquiryId, expId);
      success("Expense deleted");
      load();
    } catch {
      error("Failed to delete expense");
    }
  }

  async function handleAddCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!customLabel.trim()) { error("Label required"); return; }
    if (customAmount <= 0) { error("Amount must be > 0"); return; }
    setAddingCustom(true);
    try {
      await api.createLedExpense(inquiryId, { category: "CUSTOM", label: customLabel.trim(), amount: customAmount });
      success("Custom expense added");
      setCustomLabel("");
      setCustomAmount(0);
      load();
    } catch (e: unknown) {
      error(e instanceof Error ? e.message : "Failed to add expense");
    } finally {
      setAddingCustom(false);
    }
  }

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    fontSize: 13,
    padding: "6px 10px",
    border: "1px solid var(--b1)",
    borderRadius: 6,
    background: "var(--s1)",
    color: "var(--tx)",
    outline: "none",
    ...style,
  });

  if (loading && !data) {
    return (
      <>
        <SectionHeader title="Expense Report" description="Loading…" />
        <ScreenFrame breadcrumbs={[{ label: "LED Inquiries", href: "/led/inquiries" }, { label: "Expenses" }]}>
          <div style={{ padding: 40, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Loading expense data…</div>
        </ScreenFrame>
      </>
    );
  }

  if (!data) return null;

  const customExpenses = data.expenses.filter((e) => e.category === "CUSTOM");
  const marginPct = data.profitMargin;
  const marginColor = marginPct >= 30 ? "#16A34A" : marginPct >= 10 ? "#D97706" : "#DC2626";

  return (
    <>
      <SectionHeader title="Expense Report" description="Internal P&L view" />
      <ScreenFrame breadcrumbs={[
        { label: "LED Inquiries", href: "/led/inquiries" },
        { label: inquiryId, href: `/led/inquiries/${inquiryId}` },
        { label: "Expenses" },
      ]}>
        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Client Billing", value: `₹${fmt(data.clientBilling)}`, color: "#16A34A" },
            { label: "Total Expenses", value: `₹${fmt(data.totalExpenses)}`, color: "#DC2626" },
            { label: "Net Profit", value: `₹${fmt(data.netProfit)}`, color: data.netProfit >= 0 ? "#16A34A" : "#DC2626" },
            { label: "Margin %", value: `${marginPct.toFixed(1)}%`, color: marginColor },
          ].map((k) => (
            <div key={k.label} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
          {/* Left — expense management */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Standard categories */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 14 }}>Standard Expenses</div>
              {STD_CATEGORIES.map(({ cat, label }) => {
                const amt = getStdAmount(cat);
                const isEditing = editing[cat]?.active;
                return (
                  <div key={cat} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F1F5F9", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{label}</div>
                    </div>
                    {isEditing ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, color: "#64748B" }}>₹</span>
                        <input
                          type="number"
                          style={inp({ width: 100 })}
                          value={editing[cat].value}
                          onChange={(e) => setEditing((p) => ({ ...p, [cat]: { ...p[cat], value: Number(e.target.value) } }))}
                          autoFocus
                        />
                        <button onClick={() => saveEdit(cat)} disabled={saving}
                          style={{ padding: "4px 6px", background: "#16A34A", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer" }}>
                          <Check size={13} />
                        </button>
                        <button onClick={() => cancelEdit(cat)}
                          style={{ padding: "4px 6px", background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 5, cursor: "pointer" }}>
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>₹{fmt(amt)}</span>
                        <button onClick={() => startEdit(cat)}
                          style={{ padding: "4px 8px", border: "1px solid #E2E8F0", borderRadius: 5, background: "#F8FAFC", color: "#475569", cursor: "pointer" }}>
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Custom expenses */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 14 }}>Custom Expenses</div>
              {customExpenses.length === 0 ? (
                <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 12 }}>No custom expenses added.</div>
              ) : (
                <div style={{ marginBottom: 14 }}>
                  {customExpenses.map((exp) => (
                    <div key={exp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F8FAFC" }}>
                      <span style={{ fontSize: 13, color: "#0F172A" }}>{exp.label}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>₹{fmt(exp.amount)}</span>
                        <button onClick={() => handleDeleteExpense(exp.id)}
                          style={{ padding: "3px 5px", border: "1px solid #FEE2E2", borderRadius: 5, background: "#FFF5F5", color: "#DC2626", cursor: "pointer" }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 8 }}>Add Custom Expense</div>
              <form onSubmit={handleAddCustom} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <input style={inp({ width: "100%" })} placeholder="Label"
                    value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
                </div>
                <div>
                  <input type="number" style={inp({ width: 100 })} placeholder="Amount"
                    value={customAmount || ""} onChange={(e) => setCustomAmount(Number(e.target.value))} />
                </div>
                <button type="submit" disabled={addingCustom}
                  style={{ padding: "7px 12px", background: "#3B82F6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500 }}>
                  <Plus size={13} /> Add
                </button>
              </form>
            </div>
          </div>

          {/* Right column — P&L summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Dark P&L card */}
            <div style={{ background: "#0F172A", borderRadius: 14, padding: "20px 22px", color: "#F8FAFC" }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>P&L Summary</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#94A3B8" }}>Client Billing</span>
                  <span style={{ color: "#4ADE80", fontWeight: 600 }}>+ ₹{fmt(data.clientBilling)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#94A3B8" }}>Staff Cost</span>
                  <span style={{ color: "#F87171" }}>− ₹{fmt(data.staffCost)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#94A3B8" }}>Vendor Cost</span>
                  <span style={{ color: "#F87171" }}>− ₹{fmt(data.vendorCost)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#94A3B8" }}>Transport</span>
                  <span style={{ color: "#F87171" }}>− ₹{fmt(data.transport)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#94A3B8" }}>Food & Misc</span>
                  <span style={{ color: "#F87171" }}>− ₹{fmt(data.food + data.misc)}</span>
                </div>
                {data.extraTotal > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#94A3B8" }}>Other Custom</span>
                    <span style={{ color: "#F87171" }}>− ₹{fmt(data.extraTotal)}</span>
                  </div>
                )}
                <div style={{ borderTop: "1px solid #334155", paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748B" }}>
                  <span>Total Expenses</span>
                  <span>₹{fmt(data.totalExpenses)}</span>
                </div>
                <div style={{ borderTop: "1px solid #334155", paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9" }}>Net Profit</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: data.netProfit >= 0 ? "#4ADE80" : "#F87171" }}>
                    ₹{fmt(data.netProfit)}
                  </span>
                </div>
              </div>

              {/* Margin progress bar */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94A3B8", marginBottom: 6 }}>
                  <span>Profit Margin</span>
                  <span style={{ fontWeight: 600, color: marginColor }}>{marginPct.toFixed(1)}%</span>
                </div>
                <div style={{ height: 6, background: "#1E293B", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(Math.max(marginPct, 0), 100)}%`, background: marginColor, borderRadius: 999 }} />
                </div>
              </div>
            </div>

            {/* Expense breakdown card */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 14 }}>Expense Breakdown</div>
              {[
                { label: "Vendor",    pct: data.expenseBreakdown.vendorPct,    color: "#D97706" },
                { label: "Staff",     pct: data.expenseBreakdown.staffPct,     color: "#3B82F6" },
                { label: "Transport", pct: data.expenseBreakdown.transportPct, color: "#0891B2" },
                { label: "Food",      pct: data.expenseBreakdown.foodPct,      color: "#16A34A" },
                { label: "Misc",      pct: data.expenseBreakdown.miscPct,      color: "#7C3AED" },
                { label: "Extra",     pct: data.expenseBreakdown.extraPct,     color: "#DC2626" },
              ].map(({ label, pct, color }) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569", marginBottom: 4 }}>
                    <span>{label}</span>
                    <span style={{ fontWeight: 600 }}>{pct.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 6, background: "#F1F5F9", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", fontSize: 11, color: "#92400E" }}>
              Vendor rates are internal — not shown on client invoices.
            </div>
          </div>
        </div>
      </ScreenFrame>
    </>
  );
}
