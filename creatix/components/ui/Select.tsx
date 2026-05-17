"use client";

import React from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  hint,
  disabled,
  className = "",
}: SelectProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-text">{label}</label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={[
          "w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer",
          error ? "border-red-300" : "",
          disabled ? "opacity-50 cursor-not-allowed" : "",
          !value ? "text-subtle" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-subtle">{hint}</p>}
    </div>
  );
}
