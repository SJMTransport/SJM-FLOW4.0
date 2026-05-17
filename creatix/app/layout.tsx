import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Creatix",
  description: "Content management for creators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSerifDisplay.variable} ${dmSans.variable} font-body antialiased`}
      >
        {/* Sidebar: desktop only */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* BottomNav: mobile only */}
        <div className="flex md:hidden">
          <BottomNav />
        </div>

        {/* Main content */}
        <main className="ml-0 md:ml-[240px] min-h-screen bg-bg px-4 md:px-8 py-6 pb-24 md:pb-6">
          {children}
        </main>
      </body>
    </html>
  );
}
