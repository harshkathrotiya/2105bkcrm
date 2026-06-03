"use client";

import { useState, useEffect, useRef, useId, useMemo } from "react";

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
  /** Accessible name for the control when there's no visible <label>. */
  "aria-label"?: string;
  /** id of a visible label element associated with this control. */
  "aria-labelledby"?: string;
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
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase())),
    [options, search],
  );
  const selectedOption = options.find((o) => o.value === value);
  const selectedLabel = selectedOption?.label || value;

  const hasGroups = options.some((o) => o.group);
  const groupedFiltered = hasGroups
    ? Array.from(new Set(filtered.map((o) => o.group || "")))
        .map((group) => ({ group, items: filtered.filter((o) => (o.group || "") === group) }))
        .filter((g) => g.items.length > 0)
    : null;

  // Flat order of options as rendered, so arrow keys traverse groups correctly.
  const flatOptions = groupedFiltered ? groupedFiltered.flatMap((g) => g.items) : filtered;

  // Reset highlight whenever the visible set changes.
  useEffect(() => {
    setActiveIndex(flatOptions.length > 0 ? 0 : -1);
  }, [search, open, flatOptions.length]);

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-opt-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function openMenu() {
    if (disabled) return;
    setOpen(true);
    setSearch("");
  }

  function selectAt(index: number) {
    const opt = flatOptions[index];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
  }

  function onSearchKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatOptions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0) selectAt(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  const activeId = activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;

  // renders a single option row; idx is the position in flatOptions
  const renderOption = (opt: Option, idx: number, padding: string) => (
    <div
      key={opt.value}
      id={`${listboxId}-opt-${idx}`}
      data-opt-index={idx}
      role="option"
      aria-selected={opt.value === value}
      className={`text-[11px] cursor-pointer transition-colors ${
        idx === activeIndex ? "bg-s2" : ""
      } ${opt.value === value ? "bg-bl/[0.05] text-bl font-medium" : "text-tx hover:bg-s2"}`}
      style={{ padding }}
      onMouseEnter={() => setActiveIndex(idx)}
      onClick={() => selectAt(idx)}
    >
      {opt.label}
    </div>
  );

  return (
    <div className={`relative ${className}`} ref={containerRef} style={style}>
      <div
        ref={triggerRef}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        className={`fsel cursor-pointer flex justify-between items-center bg-s1 ${
          disabled ? "opacity-50 pointer-events-none" : ""
        }`}
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            setSearch("");
          }
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span
          className={`flex-1 min-w-0 text-left whitespace-nowrap overflow-hidden text-ellipsis ${
            value ? "" : "text-tx3"
          }`}
        >
          {value ? selectedLabel : placeholder}
        </span>
        <span className="text-[10px] text-tx3 opacity-50 ml-2 shrink-0" aria-hidden="true">
          ▼
        </span>
      </div>

      {open && !disabled && (
        <div
          className="absolute z-[999] left-0 w-full bg-s1 border border-b1 rounded-md shadow-lg flex flex-col min-w-[200px]"
          style={{
            ...(placement === "top" ? { bottom: "100%", marginBottom: "4px" } : { top: "100%", marginTop: "4px" }),
            overflow: "hidden",
            maxHeight: "260px",
          }}
        >
          <div className="border-b border-b1 shrink-0 bg-s1" style={{ padding: "8px" }}>
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              role="combobox"
              aria-expanded
              aria-controls={listboxId}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              aria-label="Search options"
              className="w-full text-[11px] outline-none border border-b1 rounded bg-s1"
              style={{ padding: "6px 8px" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={onSearchKeyDown}
            />
          </div>
          <div style={{ overflowY: "auto" }} ref={listRef} role="listbox" id={listboxId}>
            {flatOptions.length === 0 ? (
              <div className="text-center text-tx3 text-[10px]" style={{ padding: "12px" }} role="status">
                No results
              </div>
            ) : groupedFiltered ? (
              (() => {
                let running = -1;
                return groupedFiltered.map(({ group, items }) => (
                  <div key={group} role="group" aria-label={group}>
                    <div
                      style={{
                        padding: "5px 12px 3px",
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--tx3)",
                        background: "var(--alt2)",
                        borderBottom: "1px solid var(--b1)",
                      }}
                    >
                      {group}
                    </div>
                    {items.map((opt) => {
                      running += 1;
                      return renderOption(opt, running, "7px 14px");
                    })}
                  </div>
                ));
              })()
            ) : (
              filtered.map((opt, idx) => renderOption(opt, idx, "8px 12px"))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
