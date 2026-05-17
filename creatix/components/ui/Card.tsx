import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className = "", onClick, hoverable }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        "bg-white border border-border rounded-xl p-4",
        hoverable ? "hover:shadow-md cursor-pointer transition-shadow" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
