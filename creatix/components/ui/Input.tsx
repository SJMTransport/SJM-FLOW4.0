"use client";

import React from "react";

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  hint?: string;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  className?: string;
}

const baseInputClasses =
  "w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-subtle focus:outline-none focus:border-primary transition-colors";

export function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  error,
  hint,
  multiline,
  rows = 4,
  disabled,
  className = "",
}: InputProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-text">{label}</label>
      )}
      {multiline ? (
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          disabled={disabled}
          className={[
            baseInputClasses,
            error ? "border-red-300" : "",
            disabled ? "opacity-50 cursor-not-allowed" : "",
            "resize-none",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={[
            baseInputClasses,
            error ? "border-red-300" : "",
            disabled ? "opacity-50 cursor-not-allowed" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-subtle">{hint}</p>}
    </div>
  );
}
