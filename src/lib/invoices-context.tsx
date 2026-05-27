"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Invoice } from "./types";
import * as api from "./api";

// ── State ────────────────────────────────────────────────────────────────────
interface InvoicesState {
  invoices: Invoice[];
  loading: boolean;
}

const initialState: InvoicesState = { invoices: [], loading: true };

// ── Actions ──────────────────────────────────────────────────────────────────
type InvoicesAction =
  | { type: "SET_INVOICES"; payload: Invoice[] }
  | { type: "SET_LOADING"; payload: boolean };

function reducer(state: InvoicesState, action: InvoicesAction): InvoicesState {
  switch (action.type) {
    case "SET_INVOICES":
      return { ...state, invoices: action.payload, loading: false };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

// ── Context shape (backwards-compatible) ──────────────────────────────────────
interface InvoicesContextType {
  invoices: Invoice[];
  loading: boolean;
  dispatchInvoices: (action: {
    type: "ADD_INVOICE" | "UPDATE_INVOICE" | "DELETE_INVOICE";
    payload: any;
  }) => Promise<void>;
  getInvoice: (id: string) => Invoice | undefined;
}

const InvoicesContext = createContext<InvoicesContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function InvoicesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load on mount
  const load = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await api.fetchInvoices();
      dispatch({ type: "SET_INVOICES", payload: data });
    } catch {
      dispatch({ type: "SET_INVOICES", payload: [] });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dispatchInvoices = useCallback(
    async (action: {
      type: "ADD_INVOICE" | "UPDATE_INVOICE" | "DELETE_INVOICE";
      payload: any;
    }) => {
      try {
        switch (action.type) {
          case "ADD_INVOICE":
            await api.createInvoice(action.payload);
            break;
          case "UPDATE_INVOICE":
            await api.updateInvoice(action.payload.id, action.payload);
            break;
          case "DELETE_INVOICE":
            await api.deleteInvoice(action.payload);
            break;
        }
        // Reload from server after mutation
        await load();
      } catch (err) {
        console.error("dispatchInvoices error:", err);
      }
    },
    [load]
  );

  const getInvoice = useCallback(
    (id: string) => state.invoices.find((inv) => inv.id === id),
    [state.invoices]
  );

  return (
    <InvoicesContext.Provider
      value={{
        invoices: state.invoices,
        loading: state.loading,
        dispatchInvoices,
        getInvoice,
      }}
    >
      {children}
    </InvoicesContext.Provider>
  );
}

export function useInvoices() {
  const ctx = useContext(InvoicesContext);
  if (!ctx) throw new Error("useInvoices must be used within InvoicesProvider");
  return ctx;
}
