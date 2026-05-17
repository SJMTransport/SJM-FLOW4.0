import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface PageHeaderAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: PageHeaderAction;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-start mb-8">
      <div>
        <h1 className="font-display text-[32px] leading-tight text-text">{title}</h1>
        {subtitle && <p className="text-sm text-subtle mt-1">{subtitle}</p>}
      </div>
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button variant="primary" size="md">{action.label}</Button>
          </Link>
        ) : (
          <Button variant="primary" size="md" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}
