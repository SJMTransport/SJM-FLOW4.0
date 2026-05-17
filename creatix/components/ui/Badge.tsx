import React from "react";

type BadgeVariant = "stage" | "status" | "mood" | "platform" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  value: string;
  className?: string;
}

const stageClasses: Record<string, string> = {
  idea: "border border-subtle text-subtle",
  scripting: "border border-primary text-primary",
  recording: "border border-primary/60 text-primary/60",
  editing: "border border-secondary text-secondary",
  scheduling: "bg-secondary/20 text-secondary",
  published: "bg-secondary text-white",
  reviewed: "bg-text text-white",
};

const statusClasses: Record<string, string> = {
  draft: "border border-subtle text-subtle",
  scheduled: "border border-primary text-primary",
  posted: "bg-secondary text-white",
  failed: "border border-red-300 text-red-500",
};

const moodClasses: Record<string, string> = {
  educational: "bg-primary/10 text-primary",
  entertaining: "bg-secondary/10 text-secondary",
  promotional: "border border-primary text-primary",
  personal: "border border-subtle text-subtle",
  inspirational: "bg-secondary/20 text-secondary",
};

function getClasses(variant: BadgeVariant, value: string): string {
  const v = value.toLowerCase();
  if (variant === "stage") return stageClasses[v] ?? "border border-subtle text-subtle";
  if (variant === "status") return statusClasses[v] ?? "border border-subtle text-subtle";
  if (variant === "mood") return moodClasses[v] ?? "border border-subtle text-subtle";
  return "border border-border text-subtle";
}

export function Badge({ variant = "default", value, className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "text-xs font-medium px-2.5 py-0.5 rounded-full uppercase tracking-wide inline-block",
        getClasses(variant, value),
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {value}
    </span>
  );
}
