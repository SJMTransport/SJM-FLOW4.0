"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";

const navItems = [
  { href: "/dashboard", label: "Dashboard", emoji: "🏠" },
  { href: "/ideas", label: "Idea Inbox", emoji: "💡" },
  { href: "/content", label: "Content Studio", emoji: "📝" },
  { href: "/series", label: "Series", emoji: "🎬" },
  { href: "/calendar", label: "Calendar", emoji: "📅" },
  { href: "/analytics", label: "Analytics", emoji: "📊" },
  { href: "/references", label: "Reference Bank", emoji: "🔗" },
];

const settingsItems = [
  { href: "/accounts", label: "Accounts", emoji: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-[240px] bg-surface border-r border-border flex flex-col z-40">
        {/* Logo */}
        <div className="px-5 pt-6 pb-4">
          <span className="font-display text-[22px] text-text">Creatix</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all",
                isActive(item.href)
                  ? "bg-primary text-white font-medium"
                  : "text-subtle hover:text-text hover:bg-border/50",
              ].join(" ")}
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </Link>
          ))}

          {/* Divider */}
          <div className="my-2 mx-4 border-t border-border" />

          {settingsItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all",
                isActive(item.href)
                  ? "bg-primary text-white font-medium"
                  : "text-subtle hover:text-text hover:bg-border/50",
              ].join(" ")}
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Quick Add */}
        <div className="p-4">
          <button
            onClick={() => setQuickAddOpen(true)}
            className="w-full bg-primary text-white text-sm font-medium py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <span className="text-lg leading-none">+</span>
            Quick Add
          </button>
        </div>
      </aside>

      <Modal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        title="Tambah Cepat"
      >
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              setQuickAddOpen(false);
              router.push("/content/new");
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <span className="text-2xl">📝</span>
            <div>
              <p className="text-sm font-medium text-text">Konten Baru</p>
              <p className="text-xs text-subtle mt-0.5">Buat konten dari awal</p>
            </div>
          </button>
          <button
            onClick={() => {
              setQuickAddOpen(false);
              router.push("/ideas?quickadd=true");
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <span className="text-2xl">💡</span>
            <div>
              <p className="text-sm font-medium text-text">Tambah Ide</p>
              <p className="text-xs text-subtle mt-0.5">Simpan ide baru dengan cepat</p>
            </div>
          </button>
        </div>
      </Modal>
    </>
  );
}
