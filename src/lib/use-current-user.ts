"use client";

import { useState, useEffect, createContext, useContext } from "react";
import type { Permission } from "./permissions";

export interface CurrentUser {
  id: string;
  username: string;
  name: string;
  role: string;
  department: string;
  staffId: number | null;
  permissions: Permission[];
}

interface CurrentUserContextValue {
  user: CurrentUser | null;
  loading: boolean;
  can: (permission: Permission) => boolean;
  refresh: () => void;
}

export const CurrentUserContext = createContext<CurrentUserContextValue>({
  user: null,
  loading: true,
  can: () => false,
  refresh: () => {},
});

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}

export function useCurrentUserState(): CurrentUserContextValue {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) { setUser(data ?? null); setLoading(false); }
      })
      .catch(() => {
        if (!cancelled) { setUser(null); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [rev]);

  const can = (permission: Permission) => !!user?.permissions.includes(permission);
  const refresh = () => setRev((v) => v + 1);

  return { user, loading, can, refresh };
}
