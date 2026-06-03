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
import type { Staff, StaffAssignment, StaffPayment } from "./types";
import * as api from "./api";
import { useToast } from "@/components/ui/Toast";

// ── State ────────────────────────────────────────────────────────────────────
interface StaffState {
  staff: (Staff & { status: "Available" | "Deployed"; pendingPayment: number })[];
  loading: boolean;
}

const initialState: StaffState = { staff: [], loading: true };

// ── Actions ──────────────────────────────────────────────────────────────────
type StaffAction =
  | { type: "SET_STAFF"; payload: (Staff & { status: "Available" | "Deployed"; pendingPayment: number })[] }
  | { type: "SET_LOADING"; payload: boolean };

function reducer(state: StaffState, action: StaffAction): StaffState {
  switch (action.type) {
    case "SET_STAFF":
      return { ...state, staff: action.payload, loading: false };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

// ── Context shape ────────────────────────────────────────────────────────────
interface StaffContextValue {
  staff: (Staff & { status: "Available" | "Deployed"; pendingPayment: number })[];
  loading: boolean;
  refreshStaff: (params?: api.StaffFetchParams) => Promise<void>;
  dispatchStaff: (action: {
    type: "ADD_STAFF" | "UPDATE_STAFF" | "DELETE_STAFF" | "RECORD_PAYMENT" | "RECORD_BULK_PAYMENTS";
    payload: any;
  }) => Promise<any>;
}

const StaffContext = createContext<StaffContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function StaffProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toast = useToast();

  // Fetch all staff members
  const refreshStaff = useCallback(async (params?: api.StaffFetchParams) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await api.fetchStaff(params);
      dispatch({ type: "SET_STAFF", payload: data });
    } catch (err) {
      console.error("fetchStaff error:", err);
      dispatch({ type: "SET_STAFF", payload: [] });
      toast.error("Couldn't load staff. Please refresh to try again.");
    }
  }, [toast]);

  // Load initial data
  useEffect(() => {
    refreshStaff();
  }, [refreshStaff]);

  // Dispatch actions for modifications
  const dispatchStaff = useCallback(
    async (action: {
      type: "ADD_STAFF" | "UPDATE_STAFF" | "DELETE_STAFF" | "RECORD_PAYMENT" | "RECORD_BULK_PAYMENTS";
      payload: any;
    }) => {
      let result = null;
      try {
        switch (action.type) {
          case "ADD_STAFF":
            result = await api.createStaff(action.payload);
            break;
          case "UPDATE_STAFF":
            result = await api.updateStaff(action.payload.id, action.payload);
            break;
          case "DELETE_STAFF":
            result = await api.deleteStaff(action.payload);
            break;
          case "RECORD_PAYMENT":
            result = await api.recordStaffPayment(action.payload);
            break;
          case "RECORD_BULK_PAYMENTS":
            result = await api.recordBulkStaffPayments(action.payload);
            break;
        }
        // Refresh staff list
        await refreshStaff();
      } catch (err: any) {
        console.error("dispatchStaff error:", err);
        toast.error(err?.message || "Action failed");
        throw err; // let the calling screen abort its success flow
      }
      return result;
    },
    [refreshStaff, toast]
  );

  const value = useMemo(
    () => ({
      staff: state.staff,
      loading: state.loading,
      refreshStaff,
      dispatchStaff,
    }),
    [state.staff, state.loading, refreshStaff, dispatchStaff]
  );

  return (
    <StaffContext.Provider value={value}>
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error("useStaff must be used inside StaffProvider");
  return ctx;
}
