"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { Quotation } from "./types";
import * as api from "./api";
import { useToast } from "@/components/ui/Toast";

// ── State ────────────────────────────────────────────────────────────────────
interface QuotationsState {
  quotations: Quotation[];
  loading: boolean;
}

const initialState: QuotationsState = { quotations: [], loading: true };

// ── Actions ──────────────────────────────────────────────────────────────────
type QuotationsAction =
  | { type: "SET_QUOTATIONS"; payload: Quotation[] }
  | { type: "SET_LOADING"; payload: boolean };

function reducer(state: QuotationsState, action: QuotationsAction): QuotationsState {
  switch (action.type) {
    case "SET_QUOTATIONS":
      return { ...state, quotations: action.payload, loading: false };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

// ── Context shape ─────────────────────────────────────────────────────────────
interface QuotationsContextValue {
  quotations: Quotation[];
  loading: boolean;
  dispatchQuotations: (action: {
    type: "ADD_QUOTATION" | "UPDATE_QUOTATION" | "DELETE_QUOTATION";
    payload: any;
  }) => void;
}

const QuotationsContext = createContext<QuotationsContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function QuotationsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toast = useToast();

  const load = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await api.fetchQuotations();
      dispatch({ type: "SET_QUOTATIONS", payload: data });
    } catch {
      dispatch({ type: "SET_QUOTATIONS", payload: [] });
      toast.error("Couldn't load quotations. Please refresh to try again.");
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const dispatchQuotations = useCallback(
    async (action: {
      type: "ADD_QUOTATION" | "UPDATE_QUOTATION" | "DELETE_QUOTATION";
      payload: any;
    }) => {
      try {
        switch (action.type) {
          case "ADD_QUOTATION":
            await api.createQuotation(action.payload);
            break;
          case "UPDATE_QUOTATION":
            await api.updateQuotation(action.payload.id, action.payload);
            break;
          case "DELETE_QUOTATION":
            await api.deleteQuotation(action.payload);
            break;
        }
        await load();
      } catch (err: any) {
        console.error("dispatchQuotations error:", err);
        toast.error(err?.message || "Action failed");
        throw err; // let the calling screen abort its success flow
      }
    },
    [load, toast]
  );

  const value = useMemo(
    () => ({ quotations: state.quotations, loading: state.loading, dispatchQuotations }),
    [state.quotations, state.loading, dispatchQuotations]
  );

  return (
    <QuotationsContext.Provider value={value}>
      {children}
    </QuotationsContext.Provider>
  );
}

export function useQuotations() {
  const ctx = useContext(QuotationsContext);
  if (!ctx) throw new Error("useQuotations must be used inside QuotationsProvider");
  return ctx;
}
