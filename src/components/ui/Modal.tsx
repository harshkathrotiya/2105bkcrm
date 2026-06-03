"use client";

import React, { useEffect, useId, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Max width of the dialog; defaults to a phone-safe clamp. */
  width?: number;
  children: React.ReactNode;
  /** Footer actions (buttons). */
  footer?: React.ReactNode;
}

/**
 * Modal — accessible dialog: focus-trapped, Esc-to-close, backdrop click,
 * aria-modal, responsive width via min(92vw, width). Replaces ad-hoc
 * position:fixed overlays with hardcoded pixel widths.
 */
export default function Modal({ open, onClose, title, width = 420, children, footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    // focus the panel on open
    const t = setTimeout(() => panelRef.current?.focus(), 0);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: "var(--modal-overlay)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className="sf outline-none w-full"
        style={{ width: `min(92vw, ${width}px)`, maxHeight: "90vh", overflowY: "auto" }}
      >
        {title && (
          <div className="tb">
            <h2 id={titleId} className="text-[13px] font-medium text-tx">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="text-tx3 hover:text-tx text-[16px] leading-none"
            >
              ×
            </button>
          </div>
        )}
        <div className="cnt !min-h-0">{children}</div>
        {footer && (
          <div className="tb !justify-end gap-2" style={{ borderTop: "1px solid var(--b1)", borderBottom: "none" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
