"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Inquiry } from "./types";
import * as api from "./api";

// ── State ────────────────────────────────────────────────────────────────────
interface InquiriesState {
  inquiries: Inquiry[];
  loading: boolean;
}

const initialState: InquiriesState = { inquiries: [], loading: true };

// ── Actions ──────────────────────────────────────────────────────────────────
type InquiriesAction =
  | { type: "SET_INQUIRIES"; payload: Inquiry[] }
  | { type: "SET_LOADING"; payload: boolean };

function reducer(state: InquiriesState, action: InquiriesAction): InquiriesState {
  switch (action.type) {
    case "SET_INQUIRIES":
      return { ...state, inquiries: action.payload, loading: false };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

// ── Context shape ─────────────────────────────────────────────────────────────
interface InquiriesContextValue {
  inquiries: Inquiry[];
  loading: boolean;
  dispatchInquiries: (action: {
    type: "ADD_INQUIRY" | "UPDATE_INQUIRY" | "DELETE_INQUIRY";
    payload: any;
  }) => void;
  getInquiries: () => Inquiry[];
}

const InquiriesContext = createContext<InquiriesContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function InquiriesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const load = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await api.fetchInquiries();
      dispatch({ type: "SET_INQUIRIES", payload: data });
    } catch {
      dispatch({ type: "SET_INQUIRIES", payload: [] });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dispatchInquiries = useCallback(
    async (action: {
      type: "ADD_INQUIRY" | "UPDATE_INQUIRY" | "DELETE_INQUIRY";
      payload: any;
    }) => {
      try {
        switch (action.type) {
          case "ADD_INQUIRY":
            await api.createInquiry(action.payload);
            break;
          case "UPDATE_INQUIRY":
            await api.updateInquiry(action.payload.id, action.payload);
            break;
          case "DELETE_INQUIRY":
            await api.deleteInquiry(action.payload);
            break;
        }
        await load();
      } catch (err) {
        console.error("dispatchInquiries error:", err);
      }
    },
    [load]
  );

  const getInquiries = useCallback(() => state.inquiries, [state.inquiries]);

  return (
    <InquiriesContext.Provider
      value={{ inquiries: state.inquiries, loading: state.loading, dispatchInquiries, getInquiries }}
    >
      {children}
    </InquiriesContext.Provider>
  );
}

export function useInquiries() {
  const ctx = useContext(InquiriesContext);
  if (!ctx) throw new Error("useInquiries must be used inside InquiriesProvider");
  return ctx;
}
