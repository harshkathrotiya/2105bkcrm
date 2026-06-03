"use client";

import React from "react";

type Variant = "default" | "primary" | "success" | "warning" | "danger";

const variantClass: Record<Variant, string> = {
  default: "btn",
  primary: "btn btn-primary",
  success: "btn btn-success",
  warning: "btn btn-warning",
  danger: "btn btn-danger",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
}

/**
 * Button — thin wrapper over the existing `.btn` token classes so every
 * call site gets consistent styling, a focus-visible ring (from globals.css),
 * and a built-in loading state. Replaces ad-hoc `<button className="btn ...">`.
 */
export default function Button({
  variant = "default",
  loading = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${variantClass[variant]} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span
          className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
