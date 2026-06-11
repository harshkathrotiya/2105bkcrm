"use client";

import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface ScreenFrameProps {
  breadcrumb?: React.ReactNode;
  breadcrumbs?: BreadcrumbSegment[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function ScreenFrame({
  breadcrumb,
  breadcrumbs,
  actions,
  children,
}: ScreenFrameProps) {
  const router = useRouter();

  // Find the parent href — second-to-last breadcrumb with an href
  const backHref = breadcrumbs
    ? breadcrumbs.slice(0, -1).reverse().find((s) => s.href)?.href
    : undefined;

  return (
    <div className="sf">
      {(breadcrumb || breadcrumbs) && (
        <div className="tb">
          <div className="flex items-center gap-2 text-[12px] text-tx3">
            {/* Back button — only on detail/form pages (2+ breadcrumb segments) */}
            {breadcrumbs && breadcrumbs.length >= 2 && (
              <>
                <button
                  onClick={() => backHref ? router.push(backHref) : router.back()}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--b1)", background: "var(--s1)", color: "var(--tx2)", cursor: "pointer", fontSize: 12, fontWeight: 500, flexShrink: 0 }}
                >
                  <ArrowLeft size={13} /> Back
                </button>
                <span style={{ color: "var(--b2)" }}>|</span>
              </>
            )}

            {breadcrumbs ? (
              breadcrumbs.map((seg, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight size={12} className="text-tx3 opacity-50" />}
                  {seg.href ? (
                    <Link href={seg.href} className="hover:text-tx transition-colors hover:underline underline-offset-2">
                      {seg.label}
                    </Link>
                  ) : (
                    <span className="text-tx2">{seg.label}</span>
                  )}
                </span>
              ))
            ) : (
              <span>{breadcrumb}</span>
            )}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="cnt">{children}</div>
    </div>
  );
}
