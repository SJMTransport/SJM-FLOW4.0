import React from "react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl mb-4">{icon}</span>
      <h3 className="font-display text-[20px] text-text">{title}</h3>
      {description && (
        <p className="text-sm text-subtle mt-2 max-w-xs mx-auto">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          <Button variant="primary" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
