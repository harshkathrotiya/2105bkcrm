"use client";

import React, { useId } from "react";

interface BaseFieldProps {
  label?: string;
  /** Marks the field visually + sets aria-required. */
  required?: boolean;
  /** Inline error message; sets aria-invalid and red border. */
  error?: string;
  /** Helper text shown below the control when there's no error. */
  hint?: string;
  className?: string;
}

/* ---- shared label + error wiring ---------------------------------------- */

function FieldShell({
  id,
  label,
  required,
  error,
  hint,
  className = "",
  children,
}: BaseFieldProps & { id: string; children: React.ReactNode }) {
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`field ${className}`.trim()}>
      {label && (
        <label className="flbl" htmlFor={id}>
          {label}
          {required && (
            <span className="text-rd" aria-hidden="true">
              {" "}*
            </span>
          )}
        </label>
      )}
      {/* clone to inject a11y wiring into whatever control is passed */}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id,
            "aria-invalid": error ? true : undefined,
            "aria-required": required || undefined,
            "aria-describedby": describedBy,
          })
        : children}
      {error ? (
        <span id={`${id}-err`} role="alert" className="text-[11px] text-rd">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="text-[11px] text-tx3">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/* ---- TextField ---------------------------------------------------------- */

interface TextFieldProps
  extends BaseFieldProps,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {}

export function TextField({ label, required, error, hint, className, ...input }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint} className={className}>
      <input className="finp" style={error ? { borderColor: "var(--rd)" } : undefined} {...input} />
    </FieldShell>
  );
}

/* ---- TextAreaField ------------------------------------------------------ */

interface TextAreaFieldProps
  extends BaseFieldProps,
    Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {}

export function TextAreaField({ label, required, error, hint, className, ...area }: TextAreaFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint} className={className}>
      <textarea className="ftxt" style={error ? { borderColor: "var(--rd)" } : undefined} {...area} />
    </FieldShell>
  );
}

/* ---- SelectField -------------------------------------------------------- */

interface SelectFieldProps
  extends BaseFieldProps,
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  children: React.ReactNode;
}

export function SelectField({ label, required, error, hint, className, children, ...select }: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint} className={className}>
      <select className="fsel" style={error ? { borderColor: "var(--rd)" } : undefined} {...select}>
        {children}
      </select>
    </FieldShell>
  );
}
