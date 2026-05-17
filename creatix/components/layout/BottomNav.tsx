"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const mainTabs = [
  { href: "/dashboard", label: "Home", emoji: "🏠" },
  { href: "/ideas", label: "Ideas", emoji: "💡" },
  { href: "/calendar", label: "Calendar", emoji: "📅" },
];

const morePanelLinks = [
  { href: "/analytics", label: "Analytics", emoji: "📊" },
  { href: "/series", label: "Series", emoji: "🎬" },
  { href: "/references", label: "References", emoji: "🔗" },
  { href: "/accounts", label: "Accounts", emoji: "⚙️" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-border flex items-center justify-around px-2 z-40">
        {/* Home */}
        <Link
          href={mainTabs[0].href}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
            isActive(mainTabs[0].href) ? "text-primary" : "text-subtle"
          }`}
        >
          <span className="text-xl">{mainTabs[0].emoji}</span>
          <span className="text-[10px]">{mainTabs[0].label}</span>
        </Link>

        {/* Ideas */}
        <Link
          href={mainTabs[1].href}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
            isActive(mainTabs[1].href) ? "text-primary" : "text-subtle"
          }`}
        >
          <span className="text-xl">{mainTabs[1].emoji}</span>
          <span className="text-[10px]">{mainTabs[1].label}</span>
        </Link>

        {/* Center + button */}
        <button
          onClick={() => router.push("/content/new")}
          className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-2xl -mt-6 shadow-lg hover:opacity-90 transition-opacity"
          aria-label="New content"
        >
          +
        </button>

        {/* Calendar */}
        <Link
          href={mainTabs[2].href}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
            isActive(mainTabs[2].href) ? "text-primary" : "text-subtle"
          }`}
        >
          <span className="text-xl">{mainTabs[2].emoji}</span>
          <span className="text-[10px]">{mainTabs[2].label}</span>
        </Link>

        {/* More */}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
            moreOpen ? "text-primary" : "text-subtle"
          }`}
        >
          <span className="text-xl">☰</span>
          <span className="text-[10px]">More</span>
        </button>
      </nav>

      {/* More bottom sheet */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-50"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 p-4 pb-8 shadow-xl">
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
            <p className="text-xs font-medium text-subtle uppercase tracking-wide px-2 mb-3">
              Lainnya
            </p>
            <div className="grid grid-cols-2 gap-2">
              {morePanelLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border hover:border-primary transition-all"
                >
                  <span className="text-xl">{link.emoji}</span>
                  <span className="text-sm text-text">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
