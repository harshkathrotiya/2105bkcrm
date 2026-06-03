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
import type { Vendor } from "./types";
import * as api from "./api";
import { useToast } from "@/components/ui/Toast";

// ── State ────────────────────────────────────────────────────────────────────
interface VendorsState {
  vendors: (Vendor & { timesUsed: number })[];
  loading: boolean;
}

const initialState: VendorsState = { vendors: [], loading: true };

// ── Actions ──────────────────────────────────────────────────────────────────
type VendorsAction =
  | { type: "SET_VENDORS"; payload: (Vendor & { timesUsed: number })[] }
  | { type: "SET_LOADING"; payload: boolean };

function reducer(state: VendorsState, action: VendorsAction): VendorsState {
  switch (action.type) {
    case "SET_VENDORS":
      return { ...state, vendors: action.payload, loading: false };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

// ── Context shape ────────────────────────────────────────────────────────────
interface VendorsContextValue {
  vendors: (Vendor & { timesUsed: number })[];
  loading: boolean;
  refreshVendors: () => Promise<void>;
  dispatchVendors: (action: {
    type: "ADD_VENDOR" | "UPDATE_VENDOR";
    payload: any;
  }) => Promise<any>;
}

const VendorsContext = createContext<VendorsContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function VendorsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toast = useToast();

  // Fetch all vendors
  const refreshVendors = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await api.fetchVendors();
      dispatch({ type: "SET_VENDORS", payload: data });
    } catch (err) {
      console.error("fetchVendors error:", err);
      dispatch({ type: "SET_VENDORS", payload: [] });
      toast.error("Couldn't load vendors. Please refresh to try again.");
    }
  }, [toast]);

  // Load initial data
  useEffect(() => {
    refreshVendors();
  }, [refreshVendors]);

  // Dispatch actions
  const dispatchVendors = useCallback(
    async (action: {
      type: "ADD_VENDOR" | "UPDATE_VENDOR";
      payload: any;
    }) => {
      let result = null;
      try {
        switch (action.type) {
          case "ADD_VENDOR":
            result = await api.createVendor(action.payload);
            break;
          case "UPDATE_VENDOR":
            result = await api.updateVendor(action.payload.id, action.payload);
            break;
        }
        // Refresh vendors list
        await refreshVendors();
      } catch (err: any) {
        console.error("dispatchVendors error:", err);
        toast.error(err?.message || "Action failed");
        throw err; // let the calling screen abort its success flow
      }
      return result;
    },
    [refreshVendors, toast]
  );

  const value = useMemo(
    () => ({
      vendors: state.vendors,
      loading: state.loading,
      refreshVendors,
      dispatchVendors,
    }),
    [state.vendors, state.loading, refreshVendors, dispatchVendors]
  );

  return (
    <VendorsContext.Provider value={value}>
      {children}
    </VendorsContext.Provider>
  );
}

export function useVendors() {
  const ctx = useContext(VendorsContext);
  if (!ctx) throw new Error("useVendors must be used inside VendorsProvider");
  return ctx;
}
