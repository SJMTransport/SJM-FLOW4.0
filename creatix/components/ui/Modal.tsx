"use client";

import React, { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-[20px] text-text">{title}</h2>
          <button
            onClick={onClose}
            className="text-subtle hover:text-text transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div>{children}</div>

        {footer && (
          <div className="flex justify-end gap-2 mt-6">{footer}</div>
        )}
      </div>
    </div>
  );
}
