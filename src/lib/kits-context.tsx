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
import type { Kit } from "./types";
import * as api from "./api";
import { useToast } from "@/components/ui/Toast";

// ── State ────────────────────────────────────────────────────────────────────
interface KitsState {
  kits: Kit[];
  loading: boolean;
}

const initialState: KitsState = { kits: [], loading: true };

// ── Actions ──────────────────────────────────────────────────────────────────
type KitsAction =
  | { type: "SET_KITS"; payload: Kit[] }
  | { type: "SET_LOADING"; payload: boolean };

function reducer(state: KitsState, action: KitsAction): KitsState {
  switch (action.type) {
    case "SET_KITS":
      return { ...state, kits: action.payload, loading: false };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

// ── Context shape ────────────────────────────────────────────────────────────
interface KitsContextValue {
  kits: Kit[];
  loading: boolean;
  refreshKits: (params?: { startDate?: string; endDate?: string }) => Promise<void>;
  dispatchKits: (action: {
    type: "ADD_KIT" | "UPDATE_KIT" | "DELETE_KIT" | "ADD_ITEM" | "REMOVE_ITEM";
    payload: any;
  }) => Promise<any>;
}

const KitsContext = createContext<KitsContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function KitsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toast = useToast();

  // Fetch all kits
  const refreshKits = useCallback(async (params?: { startDate?: string; endDate?: string }) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await api.fetchKits(params);
      dispatch({ type: "SET_KITS", payload: data });
    } catch (err) {
      console.error("fetchKits error:", err);
      dispatch({ type: "SET_KITS", payload: [] });
      toast.error("Couldn't load kits. Please refresh to try again.");
    }
  }, [toast]);

  // Load initial data
  useEffect(() => {
    refreshKits();
  }, [refreshKits]);

  // Dispatch actions
  const dispatchKits = useCallback(
    async (action: {
      type: "ADD_KIT" | "UPDATE_KIT" | "DELETE_KIT" | "ADD_ITEM" | "REMOVE_ITEM";
      payload: any;
    }) => {
      let result = null;
      try {
        switch (action.type) {
          case "ADD_KIT":
            result = await api.createKit(action.payload);
            break;
          case "UPDATE_KIT":
            result = await api.updateKit(action.payload.id, action.payload);
            break;
          case "DELETE_KIT":
            result = await api.deleteKit(action.payload);
            break;
          case "ADD_ITEM":
            result = await api.addItemToKit(action.payload.kitId, action.payload.equipmentId, action.payload.quantity);
            break;
          case "REMOVE_ITEM":
            result = await api.removeItemFromKit(action.payload.kitId, action.payload.equipmentId);
            break;
        }
        // Refresh kits list
        await refreshKits();
      } catch (err) {
        console.error("dispatchKits error:", err);
        throw err;
      }
      return result;
    },
    [refreshKits]
  );

  const value = useMemo(
    () => ({
      kits: state.kits,
      loading: state.loading,
      refreshKits,
      dispatchKits,
    }),
    [state.kits, state.loading, refreshKits, dispatchKits]
  );

  return (
    <KitsContext.Provider value={value}>
      {children}
    </KitsContext.Provider>
  );
}

export function useKits() {
  const ctx = useContext(KitsContext);
  if (!ctx) throw new Error("useKits must be used inside KitsProvider");
  return ctx;
}
