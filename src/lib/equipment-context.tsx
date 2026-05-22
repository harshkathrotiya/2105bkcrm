"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Equipment } from "./types";
import * as api from "./api";

// ── State ────────────────────────────────────────────────────────────────────
interface EquipmentState {
  items: Equipment[];
  total: number;
  page: number;
  limit: number;
  categoryCounts: Record<string, number>;
  loading: boolean;
  assetSummary: api.EquipmentSummary | null;
}

const initialState: EquipmentState = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
  categoryCounts: {
    ALL: 0,
    CAMERA: 0,
    VIDEO_MIXER: 0,
    VIDEO_RECORDER: 0,
    AUDIO_MIXER: 0,
    WIRELESS_TX: 0,
    UPS: 0,
    ACCESSORY: 0,
  },
  loading: true,
  assetSummary: null,
};

// ── Actions ──────────────────────────────────────────────────────────────────
type EquipmentAction =
  | { type: "SET_RESULT"; payload: api.EquipmentFetchResult }
  | { type: "SET_SUMMARY"; payload: api.EquipmentSummary }
  | { type: "SET_LOADING"; payload: boolean };

function reducer(state: EquipmentState, action: EquipmentAction): EquipmentState {
  switch (action.type) {
    case "SET_RESULT":
      return {
        ...state,
        items: action.payload.items,
        total: action.payload.total,
        page: action.payload.page,
        limit: action.payload.limit,
        categoryCounts: action.payload.categoryCounts,
        loading: false,
      };
    case "SET_SUMMARY":
      return { ...state, assetSummary: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

// ── Context shape ────────────────────────────────────────────────────────────
interface EquipmentContextValue {
  equipment: Equipment[];
  total: number;
  page: number;
  limit: number;
  categoryCounts: Record<string, number>;
  loading: boolean;
  assetSummary: api.EquipmentSummary | null;
  refreshEquipment: (filters?: {
    category?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;
  refreshAssetSummary: () => Promise<void>;
  dispatchEquipment: (action: {
    type: "ADD_EQUIPMENT" | "UPDATE_EQUIPMENT" | "DELETE_EQUIPMENT" | "IMPORT_CSV";
    payload: any;
  }) => Promise<any>;
}

const EquipmentContext = createContext<EquipmentContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function EquipmentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Fetch equipment list
  const refreshEquipment = useCallback(async (filters?: {
    category?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await api.fetchEquipment(filters);
      dispatch({ type: "SET_RESULT", payload: data });
    } catch (err) {
      console.error("fetchEquipment error:", err);
      dispatch({
        type: "SET_RESULT",
        payload: {
          items: [],
          total: 0,
          page: filters?.page ?? 1,
          limit: filters?.limit ?? 20,
          categoryCounts: initialState.categoryCounts,
        },
      });
    }
  }, []);

  // Fetch asset summary
  const refreshAssetSummary = useCallback(async () => {
    try {
      const summary = await api.fetchAssetSummary();
      dispatch({ type: "SET_SUMMARY", payload: summary });
    } catch (err) {
      console.error("fetchAssetSummary error:", err);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    refreshEquipment();
    refreshAssetSummary();
  }, [refreshEquipment, refreshAssetSummary]);

  // Dispatch actions
  const dispatchEquipment = useCallback(
    async (action: {
      type: "ADD_EQUIPMENT" | "UPDATE_EQUIPMENT" | "DELETE_EQUIPMENT" | "IMPORT_CSV";
      payload: any;
    }) => {
      let result = null;
      try {
        switch (action.type) {
          case "ADD_EQUIPMENT":
            result = await api.createEquipment(action.payload);
            break;
          case "UPDATE_EQUIPMENT":
            result = await api.updateEquipment(action.payload.id, action.payload);
            break;
          case "DELETE_EQUIPMENT":
            result = await api.deleteEquipment(action.payload);
            break;
          case "IMPORT_CSV":
            result = await api.importEquipmentCSV(action.payload);
            break;
        }
        // Refresh items and summary
        await refreshEquipment();
        await refreshAssetSummary();
      } catch (err) {
        console.error("dispatchEquipment error:", err);
        throw err;
      }
      return result;
    },
    [refreshEquipment, refreshAssetSummary]
  );

  return (
    <EquipmentContext.Provider
      value={{
        equipment: state.items,
        total: state.total,
        page: state.page,
        limit: state.limit,
        categoryCounts: state.categoryCounts,
        loading: state.loading,
        assetSummary: state.assetSummary,
        refreshEquipment,
        refreshAssetSummary,
        dispatchEquipment,
      }}
    >
      {children}
    </EquipmentContext.Provider>
  );
}

export function useEquipment() {
  const ctx = useContext(EquipmentContext);
  if (!ctx) throw new Error("useEquipment must be used inside EquipmentProvider");
  return ctx;
}
