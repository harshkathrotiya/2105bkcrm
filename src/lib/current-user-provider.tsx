"use client";

import { type ReactNode } from "react";
import { CurrentUserContext, useCurrentUserState } from "./use-current-user";

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const value = useCurrentUserState();
  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}
