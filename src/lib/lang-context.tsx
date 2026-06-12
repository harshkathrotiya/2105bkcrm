"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { type Lang, type TranslationKey, t as translate } from "./i18n";

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("bk-crm-lang") as Lang | null;
  if (stored === "en" || stored === "gu" || stored === "hi" || stored === "sa") return stored;
  return "en";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    setLangState(getInitialLang());
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("bk-crm-lang", l);
  }, []);

  const t = useCallback((key: TranslationKey) => translate(key, lang), [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within a LangProvider");
  return ctx;
}
