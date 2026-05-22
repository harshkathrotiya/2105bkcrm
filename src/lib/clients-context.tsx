"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Client } from "./types";
import * as api from "./api";

// ── State ────────────────────────────────────────────────────────────────────
interface ClientsState {
  clients: Client[];
  loading: boolean;
}

const initialState: ClientsState = { clients: [], loading: true };

// ── Actions ──────────────────────────────────────────────────────────────────
type ClientsAction =
  | { type: "SET_CLIENTS"; payload: Client[] }
  | { type: "SET_LOADING"; payload: boolean };

function reducer(state: ClientsState, action: ClientsAction): ClientsState {
  switch (action.type) {
    case "SET_CLIENTS":
      return { ...state, clients: action.payload, loading: false };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

// ── Context shape (backwards-compatible) ──────────────────────────────────────
interface ClientsContextValue {
  clients: Client[];
  loading: boolean;
  dispatchClients: (action: {
    type: "ADD_CLIENT" | "UPDATE_CLIENT" | "DELETE_CLIENT";
    payload: any;
  }) => void;
}

const ClientsContext = createContext<ClientsContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function ClientsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load on mount
  const load = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await api.fetchClients();
      dispatch({ type: "SET_CLIENTS", payload: data });
    } catch {
      dispatch({ type: "SET_CLIENTS", payload: [] });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dispatchClients = useCallback(
    async (action: {
      type: "ADD_CLIENT" | "UPDATE_CLIENT" | "DELETE_CLIENT";
      payload: any;
    }) => {
      try {
        switch (action.type) {
          case "ADD_CLIENT":
            await api.createClient(action.payload);
            break;
          case "UPDATE_CLIENT":
            await api.updateClient(action.payload.id, action.payload);
            break;
          case "DELETE_CLIENT":
            await api.deleteClient(action.payload);
            break;
        }
        // Reload from server after mutation
        await load();
      } catch (err) {
        console.error("dispatchClients error:", err);
      }
    },
    [load]
  );

  return (
    <ClientsContext.Provider
      value={{ clients: state.clients, loading: state.loading, dispatchClients }}
    >
      {children}
    </ClientsContext.Provider>
  );
}

export function useClients() {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error("useClients must be used inside ClientsProvider");
  return ctx;
}
