import Link from "next/link";
import { ChevronRight } from "lucide-react";

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
  return (
    <div className="sf">
      {(breadcrumb || breadcrumbs) && (
        <div className="tb">
          <div className="flex items-center gap-1 text-[12px] text-tx3">
            {breadcrumbs ? (
              breadcrumbs.map((seg, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight size={12} className="text-tx3 opacity-50" />}
                  {seg.href ? (
                    <Link
                      href={seg.href}
                      className="hover:text-tx transition-colors hover:underline underline-offset-2"
                    >
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
