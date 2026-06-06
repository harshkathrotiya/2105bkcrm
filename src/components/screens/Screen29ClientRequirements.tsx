"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Printer, ArrowLeft } from "lucide-react";
import SectionHeader from "../ui/SectionHeader";
import ScreenFrame from "../ui/ScreenFrame";
import Badge from "../ui/Badge";
import LoadingSkeleton from "../ui/LoadingSkeleton";
import { useToast } from "../ui/Toast";
import * as api from "@/lib/api";
import { useCurrentUser } from "@/lib/use-current-user";

interface Props {
  inquiryId: string;
}

export default function Screen29ClientRequirements({ inquiryId }: Props) {
  const router = useRouter();
  const toastApi = useToast();
  const { can } = useCurrentUser();
  const canEdit = can("inquiries.edit");
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
        const json = await api.fetchClientRequirements(inquiryId);
        if (active) {
          setData(json);
          setPower((json.powerRequirements as string) || "");
          setTables((json.tablesSpace as string) || "");
          setOther((json.otherRequirements as string) || "");
        }
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load requirements");
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
      const json = await api.saveClientRequirements(inquiryId, {
        powerRequirements: power.trim(),
        tablesSpace: tables.trim(),
        otherRequirements: other.trim(),
      });
      setData(json);
      setToast(true);
      setTimeout(() => setToast(false), 2000);
    } catch (err: unknown) {
      toastApi.error(err instanceof Error ? err.message : "Failed to save client requirements");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenFrame breadcrumb="Reports › Client Requirements › Loading...">
        <LoadingSkeleton rows={6} />
      </ScreenFrame>
    );
  }

  if (error || !data) {
    return (
      <ScreenFrame breadcrumb="Reports › Client Requirements › Error">
        <div className="text-center py-12 text-tx3">
          {error || "Could not retrieve client requirements."}
          <div className="mt-4">
            <button className="btn" onClick={() => router.back()}><ArrowLeft size={13} /> Go Back</button>
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
            <button className="btn" onClick={() => window.print()}><Printer size={13} /> Print / Save PDF</button>
            {canEdit && (
              <button className="btn btn-success" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : <><Check size={13} strokeWidth={3} /> Save Requirements</>}
              </button>
            )}
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
              <fieldset disabled={!canEdit} style={{ border: "none", padding: 0, margin: 0, minInlineSize: "auto", display: "flex", flexDirection: "column", gap: "14px" }}>

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

              </fieldset>
            </div>
          </div>

        </div>

        {/* Toast Alert */}
        {toast && (
          <div
            className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-[13px] font-medium shadow-lg"
            style={{ background: "var(--sem-gr-bg)", border: "1px solid var(--sem-gr-bdr)", color: "var(--sem-gr-tx)" }}
          >
            <Check size={15} strokeWidth={3} />
            <span>Client requirements updated successfully!</span>
          </div>
        )}
      </ScreenFrame>
    </>
  );
}
