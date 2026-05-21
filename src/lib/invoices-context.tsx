"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
  type Dispatch,
} from "react";
import type { Invoice } from "./types";

const STORAGE_KEY = "bk-crm-invoices";

interface InvoicesState {
  invoices: Invoice[];
}

function loadOrSeed(): Invoice[] {
  if (typeof window === "undefined") return seedData();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  const seed = seedData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function persist(state: InvoicesState) {
  if (typeof window !== "undefined") {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.invoices)); } catch {}
  }
}

function seedData(): Invoice[] {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  const d = (day: number) => `${y}-${m}-${String(day).padStart(2, "0")}`;
  return [
    {
      id: "inv-1",
      quotationId: "quote-1",
      invoiceNo: "BKM-INV-26-27/05/08",
      clientName: "Adani Group",
      eventName: "Annual Conference",
      startDate: d(10),
      endDate: d(12),
      venue: "Grand Bhagwati, Ahmedabad",
      videographyAmount: 180000,
      photographyAmount: 39000,
      advance: 129210,
      balance: 129210,
      status: "Partial paid",
      advanceReceived: true,
      advanceReceivedAt: d(11),
      advanceRef: "UPI123456",
      advanceMethod: "UPI",
      balanceReceived: false,
      balanceReceivedAt: null,
      balanceRef: "",
      balanceMethod: "",
      hddDelivered: false,
      createdAt: d(13),
      dueDate: d(20),
    },
  ];
}

const initialState: InvoicesState = { invoices: typeof window === "undefined" ? seedData() : loadOrSeed() };

type InvoicesAction =
  | { type: "ADD_INVOICE"; payload: Invoice }
  | { type: "UPDATE_INVOICE"; payload: Partial<Invoice> & { id: string } }
  | { type: "DELETE_INVOICE"; payload: string };

function invoicesReducer(state: InvoicesState, action: InvoicesAction): InvoicesState {
  let next: InvoicesState;
  switch (action.type) {
    case "ADD_INVOICE":
      next = { ...state, invoices: [...state.invoices, action.payload] };
      break;
    case "UPDATE_INVOICE":
      next = {
        ...state,
        invoices: state.invoices.map((inv) =>
          inv.id === action.payload.id ? { ...inv, ...action.payload } : inv
        ),
      };
      break;
    case "DELETE_INVOICE":
      next = {
        ...state,
        invoices: state.invoices.filter((inv) => inv.id !== action.payload),
      };
      break;
    default:
      return state;
  }
  persist(next);
  return next;
}

interface InvoicesContextType {
  invoices: Invoice[];
  dispatchInvoices: Dispatch<InvoicesAction>;
  getInvoice: (id: string) => Invoice | undefined;
}

const InvoicesContext = createContext<InvoicesContextType | null>(null);

export function InvoicesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(invoicesReducer, initialState);

  const getInvoice = useCallback(
    (id: string) => state.invoices.find((inv) => inv.id === id),
    [state.invoices]
  );

  return (
    <InvoicesContext.Provider
      value={{ invoices: state.invoices, dispatchInvoices: dispatch, getInvoice }}
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
