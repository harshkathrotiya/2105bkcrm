"use client";

import { useState, useEffect, useRef } from "react";

interface Option {
  value: string;
  label: string;
  group?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  placement?: "top" | "bottom";
  disabled?: boolean;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  className = "",
  style,
  placement = "bottom",
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  const selectedOption = options.find(o => o.value === value);
  const selectedLabel = selectedOption?.label || value;

  const hasGroups = options.some(o => o.group);
  const groupedFiltered = hasGroups
    ? Array.from(new Set(filtered.map(o => o.group || "")))
        .map(group => ({ group, items: filtered.filter(o => (o.group || "") === group) }))
        .filter(g => g.items.length > 0)
    : null;

  return (
    <div className={`relative ${className}`} ref={containerRef} style={style}>
      <div
        className={`fsel cursor-pointer flex justify-between items-center bg-s1 ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        onClick={() => { if (!disabled) { setOpen(!open); setSearch(""); } }}
      >
        <span className={`flex-1 min-w-0 text-left whitespace-nowrap overflow-hidden text-ellipsis ${value ? "" : "text-tx3"}`}>
          {value ? selectedLabel : placeholder}
        </span>
        <span className="text-[10px] text-tx3 opacity-50 ml-2 shrink-0">▼</span>
      </div>
      
      {open && !disabled && (
        <div 
          className="absolute z-[999] left-0 w-full bg-s1 border border-b1 rounded-md shadow-lg flex flex-col min-w-[200px]" 
          style={{ 
            ...(placement === "top" ? { bottom: "100%", marginBottom: "4px" } : { top: "100%", marginTop: "4px" }),
            overflow: "hidden", 
            maxHeight: "260px" 
          }}
        >
          <div className="border-b border-b1 shrink-0 bg-s1" style={{ padding: "8px" }}>
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              className="w-full text-[11px] outline-none border border-b1 rounded bg-s1"
              style={{ padding: "6px 8px" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div style={{ overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div className="text-center text-tx3 text-[10px]" style={{ padding: "12px" }}>No results</div>
            ) : groupedFiltered ? (
              groupedFiltered.map(({ group, items }) => (
                <div key={group}>
                  <div style={{
                    padding: "5px 12px 3px",
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--tx3)",
                    background: "var(--alt2)",
                    borderBottom: "1px solid var(--b1)",
                  }}>
                    {group}
                  </div>
                  {items.map((opt) => (
                    <div
                      key={opt.value}
                      className={`text-[11px] cursor-pointer transition-colors ${opt.value === value ? "bg-bl/[0.05] text-bl font-medium" : "text-tx hover:bg-s2"}`}
                      style={{ padding: "7px 14px" }}
                      onClick={() => { onChange(opt.value); setOpen(false); }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              filtered.map((opt) => (
                <div
                  key={opt.value}
                  className={`text-[11px] cursor-pointer transition-colors ${opt.value === value ? "bg-bl/[0.05] text-bl font-medium" : "text-tx hover:bg-s2"}`}
                  style={{ padding: "8px 12px" }}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
