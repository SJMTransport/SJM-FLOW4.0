"use client";

import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-white hover:opacity-90",
  secondary:
    "border border-primary text-primary bg-transparent hover:bg-primary/10",
  ghost: "text-subtle hover:text-text hover:bg-surface",
  danger: "text-red-500 border border-red-300 hover:bg-red-50",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-sm px-6 py-2.5",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-full font-medium transition-all inline-flex items-center justify-center gap-2",
        variantClasses[variant],
        sizeClasses[size],
        disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
