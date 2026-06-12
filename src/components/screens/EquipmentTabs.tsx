"use client";

import { useState } from "react";
import { Wrench, Monitor } from "lucide-react";
import Screen13EquipmentList from "./Screen13EquipmentList";
import LedStockScreen from "./led/LedStockScreen";

const TABS = [
  { key: "equipment", label: "Equipment", icon: Wrench },
  { key: "led",       label: "LED Stock",  icon: Monitor },
] as const;

type Tab = typeof TABS[number]["key"];

export default function EquipmentTabs() {
  const [tab, setTab] = useState<Tab>("equipment");

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: "flex",
        gap: 4,
        padding: "12px 32px 0",
        borderBottom: "1px solid var(--b1)",
        background: "var(--s1)",
      }}>
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? "var(--acc)" : "var(--tx2)",
                background: "none",
                border: "none",
                borderBottom: active ? "2px solid var(--acc)" : "2px solid transparent",
                marginBottom: -1,
                cursor: "pointer",
                transition: "all 0.15s",
                borderRadius: "4px 4px 0 0",
              }}
            >
              <Icon size={14} strokeWidth={1.8} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "equipment" && <Screen13EquipmentList />}
      {tab === "led"       && <LedStockScreen />}
    </div>
  );
}
