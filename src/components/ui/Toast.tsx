"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastKind = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  /** Show a toast. Returns immediately (non-blocking, unlike alert()). */
  toast: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const KIND_CLASS: Record<ToastKind, string> = {
  success: "bdg-gr",
  error: "bdg-rd",
  info: "bdg-bl",
  warning: "bdg-am",
};

const KIND_ICON: Record<ToastKind, string> = {
  success: "✓",
  error: "✕",
  info: "i",
  warning: "!",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = nextId.current++;
      setToasts((t) => [...t, { id, kind, message }]);
      // auto-dismiss; errors linger a little longer
      const ttl = kind === "error" ? 6000 : 4000;
      setTimeout(() => remove(id), ttl);
    },
    [remove],
  );

  const success = useCallback((m: string) => toast(m, "success"), [toast]);
  const error = useCallback((m: string) => toast(m, "error"), [toast]);

  // value is stable: toast/success/error are memoized callbacks
  const value = useMemo<ToastContextValue>(() => ({ toast, success, error }), [toast, success, error]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed z-[1000] bottom-4 right-4 flex flex-col gap-2 max-w-[min(92vw,360px)]"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            aria-live={t.kind === "error" ? "assertive" : "polite"}
            className="card !mb-0 !p-3 flex items-start gap-2.5 shadow-lg"
            style={{ animation: "toast-in 0.18s ease" }}
          >
            <span className={`badge ${KIND_CLASS[t.kind]} shrink-0`} aria-hidden="true">
              {KIND_ICON[t.kind]}
            </span>
            <span className="text-[12.5px] text-tx leading-snug flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              aria-label="Dismiss notification"
              className="text-tx3 hover:text-tx text-[14px] leading-none shrink-0"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a <ToastProvider>");
  return ctx;
}
