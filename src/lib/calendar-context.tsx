"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { CalendarEvent } from "./types";
import * as api from "./api";

// ── State ────────────────────────────────────────────────────────────────────
interface CalendarState {
  calendarEvents: CalendarEvent[];
  loading: boolean;
}

const initialState: CalendarState = { calendarEvents: [], loading: true };

// ── Actions ──────────────────────────────────────────────────────────────────
type CalendarAction =
  | { type: "SET_CALENDAR_EVENTS"; payload: CalendarEvent[] }
  | { type: "SET_LOADING"; payload: boolean };

function reducer(state: CalendarState, action: CalendarAction): CalendarState {
  switch (action.type) {
    case "SET_CALENDAR_EVENTS":
      return { ...state, calendarEvents: action.payload, loading: false };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

// ── Context shape ─────────────────────────────────────────────────────────────
interface CalendarContextValue {
  calendarEvents: CalendarEvent[];
  loading: boolean;
  dispatchCalendar: (action: {
    type: "ADD_CALENDAR_EVENT" | "DELETE_CALENDAR_EVENT" | "UPDATE_CALENDAR_EVENT" | "BULK_ADD_CALENDAR_EVENTS" | "BULK_DELETE_CALENDAR_EVENTS";
    payload: any;
  }) => void;
  getCalendarEvents: (month: number, year: number) => CalendarEvent[];
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function CalendarProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const load = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const data = await api.fetchCalendarEvents();
      dispatch({ type: "SET_CALENDAR_EVENTS", payload: data });
    } catch {
      dispatch({ type: "SET_CALENDAR_EVENTS", payload: [] });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dispatchCalendar = useCallback(
    async (action: {
      type: "ADD_CALENDAR_EVENT" | "DELETE_CALENDAR_EVENT" | "UPDATE_CALENDAR_EVENT" | "BULK_ADD_CALENDAR_EVENTS" | "BULK_DELETE_CALENDAR_EVENTS";
      payload: any;
    }) => {
      try {
        switch (action.type) {
          case "ADD_CALENDAR_EVENT":
            await api.createCalendarEvent(action.payload);
            break;
          case "DELETE_CALENDAR_EVENT":
            await api.deleteCalendarEvent(action.payload);
            break;
          case "UPDATE_CALENDAR_EVENT":
            // Calendar events don't have a PATCH endpoint, so delete + recreate
            await api.deleteCalendarEvent(action.payload.id);
            await api.createCalendarEvent(action.payload);
            break;
          case "BULK_ADD_CALENDAR_EVENTS":
            await api.createCalendarEventsBulk(action.payload);
            break;
          case "BULK_DELETE_CALENDAR_EVENTS":
            await api.deleteCalendarEventsBulk(action.payload);
            break;
        }
        await load();
      } catch (err) {
        console.error("dispatchCalendar error:", err);
      }
    },
    [load]
  );

  const getCalendarEvents = useCallback(
    (month: number, year: number) =>
      state.calendarEvents.filter(
        (e) => e.month === month && e.year === year
      ),
    [state.calendarEvents]
  );

  return (
    <CalendarContext.Provider
      value={{
        calendarEvents: state.calendarEvents,
        loading: state.loading,
        dispatchCalendar,
        getCalendarEvents,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error("useCalendar must be used inside CalendarProvider");
  return ctx;
}
