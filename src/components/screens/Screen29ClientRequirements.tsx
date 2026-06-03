"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import { useToast } from "../ui/Toast";

interface Props {
  inquiryId: string;
}

export default function Screen29ClientRequirements({ inquiryId }: Props) {
  const router = useRouter();
  const toastApi = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(false);

  // Editable fields
  const [power, setPower] = useState("");
  const [tables, setTables] = useState("");
  const [other, setOther] = useState("");

  useEffect(() => {
    if (!inquiryId) return;

    let active = true;
    async function loadRequirements() {
      try {
        setLoading(true);
        const res = await fetch(`/api/reports/client-requirements?inquiryId=${inquiryId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load requirements");
        
        if (active) {
          setData(json);
          setPower(json.powerRequirements || "");
          setTables(json.tablesSpace || "");
          setOther(json.otherRequirements || "");
        }
      } catch (err: any) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRequirements();
    return () => { active = false; };
  }, [inquiryId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/reports/client-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId,
          powerRequirements: power.trim(),
          tablesSpace: tables.trim(),
          otherRequirements: other.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save requirements");
      
      setData(json);
      setToast(true);
      setTimeout(() => setToast(false), 2000);
    } catch (err: any) {
      toastApi.error(err.message || "Failed to save client requirements");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenFrame breadcrumb="Reports › Client Requirements › Loading...">
        <LoadingSkeleton rows={6} message="Compiling crew roster details, state ID logs, and physical space requirements..." />
      </ScreenFrame>
    );
  }

  if (error || !data) {
    return (
      <ScreenFrame breadcrumb="Reports › Client Requirements › Error">
        <div className="text-center py-12 text-tx3">
          {error || "Could not retrieve client requirements."}
          <div className="mt-4">
            <button className="btn" onClick={() => router.back()}>← Go Back</button>
          </div>
        </div>
      </ScreenFrame>
    );
  }

  const { inquiry, staffRoster } = data;

  return (
    <>
      <SectionHeader
        title={<>Client Requirements <strong>Roster</strong></>}
        description={` Roster sheet containing crew listings, state IDs, and logistical requirements.`}
      />
      <ScreenFrame
        breadcrumb={
          <>
            <span className="text-tx2">Inquiries</span> › {inquiryId} › Client Requirements
          </>
        }
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn" onClick={() => window.print()}>⎙ Print / Save PDF</button>
            <button className="btn btn-success" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "✓ Save Requirements"}
            </button>
            <Link href={`/inquiries`} className="btn">Back to List</Link>
          </div>
        }
      >
        <div className="two-col" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
          
          {/* Left Column: Crew Roster */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="card" style={{ padding: "16px", marginBottom: 0 }}>
              <div className="card-t">On-Site Operator Crew Roster</div>
              {staffRoster.length === 0 ? (
                <div className="text-center py-6 text-tx3 italic">No crew assigned to this event roster.</div>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Name / Role</th>
                      <th>Assigned Position</th>
                      <th>Arrival Time</th>
                      <th>Aadhar (State ID)</th>
                      <th style={{ textAlign: "center" }}>Aadhar Front/Back</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffRoster.map((c: any, idx: number) => (
                      <tr key={idx}>
                        <td>
                          <strong className="text-tx">{c.name}</strong>
                          <div className="text-[10px] text-tx3">{c.role}</div>
                        </td>
                        <td>
                          <Badge variant="bl">{c.position || "Operator"}</Badge>
                        </td>
                        <td className="font-mono text-[11.5px]">{c.reportingTime || "09:00 AM"}</td>
                        <td className="font-mono text-[11.5px]">{c.aadharNumber}</td>
                        <td style={{ textAlign: "center" }}>
                          <Badge variant={c.aadharUploaded ? "gr" : "rd"}>
                            {c.aadharUploaded ? "Uploaded" : "Missing"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right Column: Physical & Logistical Requirements */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="card" style={{ padding: "16px", marginBottom: 0 }}>
              <div className="card-t">Logistics &amp; Infrastructure Inputs</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                
                <div className="field">
                  <label className="flbl">Power Requirements</label>
                  <textarea
                    className="ftxt"
                    style={{ minHeight: "68px" }}
                    placeholder="e.g. 3x 15A single-phase clean power points inside control room"
                    value={power}
                    onChange={(e) => setPower(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="flbl">Tables &amp; Space Requirements</label>
                  <textarea
                    className="ftxt"
                    style={{ minHeight: "68px" }}
                    placeholder="e.g. 2x IBM tables (6ft x 3ft) with black table frills for control desk"
                    value={tables}
                    onChange={(e) => setTables(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="flbl">Other Requirements</label>
                  <textarea
                    className="ftxt"
                    style={{ minHeight: "68px" }}
                    placeholder="e.g. Meals and mineral water bottle arrangements for 8 crew members"
                    value={other}
                    onChange={(e) => setOther(e.target.value)}
                  />
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Toast Alert */}
        {toast && (
          <div
            className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-[13px] font-medium shadow-lg"
            style={{ background: "var(--sem-gr-bg)", border: "1px solid var(--sem-gr-bdr)", color: "var(--sem-gr-tx)" }}
          >
            <span>✓</span>
            <span>Client requirements updated successfully!</span>
          </div>
        )}
      </ScreenFrame>
    </>
  );
}
