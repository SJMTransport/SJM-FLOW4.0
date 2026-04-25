export const APP_NAME = "SJM Flow";
export const APP_TAGLINE = "Sistem Operasional SJM";
export const APP_VERSION = "v3.1";
export const APP_COMPANY = "PT Sugiarto Jaya Mandiri";

export const C = {
  bg: "#F2F4F7", bgCard: "#FFFFFF", bgSide: "#FFFFFF", bgSideHover: "#F9FAFB",
  accent: "#FF8F00", accentLight: "#FFF8E7", accentDark: "#E67E00",
  blue: "#3B82F6", blueLight: "#EBF4FF",
  green: "#16A34A", greenLight: "#E6F6F0",
  red: "#DC2626", redLight: "#FDECEA",
  yellow: "#E67E00", yellowLight: "#FFF3CD",
  text: "#1A1A1A", textMed: "#4A4A4A", textLight: "#8A8A8A",
  border: "#E1E4E8", borderDark: "#D1D5DB",
  sideBorder: "#F3F4F6", sideText: "#374151", sideTextMuted: "#9CA3AF",
};

export const STATUS_SO = ["Order Confirmed", "Loading", "On Going", "Arrived", "Completed", "Cancelled"];
export const STATUS_COLOR: Record<string, string> = {
  "Order Confirmed": "#6B6862",   /* grey-500 — neutral pending */
  "Loading":         "#C4914A",   /* yellow-brand — warm amber */
  "On Going":        "#4A6FA5",   /* blue-brand — active */
  "Arrived":         "#6B8E23",   /* green-brand — reached destination */
  "Completed":       "#4D7A28",   /* profit — fully done */
  "Cancelled":       "#B85450",   /* red-brand — brick red */
};
export const STATUS_BG: Record<string, string> = {
  "Order Confirmed": "#F5F4F1",   /* grey-100 */
  "Loading":         "#F5EDE0",   /* yellow-brand-light */
  "On Going":        "#E3EAF2",   /* blue-brand-light */
  "Arrived":         "#EAF2DC",   /* green-brand-light */
  "Completed":       "#DCF0C8",   /* deeper green-brand-light */
  "Cancelled":       "#F5E8E7",   /* red-brand-light */
};

export const ROLE_COLOR: Record<string, string> = { Admin: "#F97316", Keuangan: "#3B82F6", Operasional: "#10B981", Viewer: "#64748B" };
export const ROLE_BG: Record<string, string> = { Admin: "#FFF7ED", Keuangan: "#EFF6FF", Operasional: "#ECFDF5", Viewer: "#F8FAFC" };

export const DOC_TYPES = [
    { key: "surat_jalan", label: "Surat Jalan", icon: "FileText", wajib: true },
    { key: "invoice_vendor", label: "Invoice Vendor", icon: "DollarSign", wajib: false },
    { key: "foto_muatan", label: "Foto Muatan", icon: "Box", wajib: false },
    { key: "lainnya", label: "Lainnya", icon: "Layers", wajib: false }
];
