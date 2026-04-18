export const APP_NAME = "SJM Flow";
export const APP_TAGLINE = "Sistem Operasional SJM";
export const APP_VERSION = "v3.1";
export const APP_COMPANY = "PT Sugiarto Jaya Mandiri";

export const C = {
  bg: "#F7F8FA", bgCard: "#FFFFFF", bgSide: "#FFFFFF", bgSideHover: "#F3F4F6",
  accent: "#FF8F00", accentLight: "#FFF8E7", accentDark: "#E67E00",
  blue: "#3B82F6", blueLight: "#EBF4FF",
  green: "#16A34A", greenLight: "#E6F6F0",
  red: "#DC2626", redLight: "#FDECEA",
  yellow: "#E67E00", yellowLight: "#FFF3CD",
  text: "#1A1A1A", textMed: "#4A4A4A", textLight: "#8A8A8A",
  border: "#E8E4DC", borderDark: "#C8C0B4",
  sideBorder: "#F0F0F0", sideText: "#374151", sideTextMuted: "#9CA3AF",
};

export const STATUS_SO = ["Order Confirmed", "Loading", "On Going", "Arrived", "Completed", "Cancelled"];
export const STATUS_COLOR: Record<string, string> = {
  "Order Confirmed": "#6B7280",
  "Loading": "#FF8F00",
  "On Going": "#3B82F6",
  "Arrived": "#16A34A",
  "Completed": "#16A34A",
  "Cancelled": "#DC2626",
};
export const STATUS_BG: Record<string, string> = {
  "Order Confirmed": "#F3F4F6",
  "Loading": "#FFF5E6",
  "On Going": "#EFF6FF",
  "Arrived": "#DCFCE7",
  "Completed": "#DCFCE7",
  "Cancelled": "#FEE2E2",
};

export const ROLE_COLOR: Record<string, string> = { Admin: "#FF8F00", Keuangan: "#3B82F6", Operasional: "#16A34A", Viewer: "#8A9BB0" };
export const ROLE_BG: Record<string, string> = { Admin: "#FFF8E7", Keuangan: "#EBF4FF", Operasional: "#E6F6F0", Viewer: "#F0F0F0" };

export const DOC_TYPES = [
    { key: "surat_jalan", label: "Surat Jalan", icon: "📄", wajib: true },
    { key: "invoice_vendor", label: "Invoice Vendor", icon: "🧾", wajib: false },
    { key: "foto_muatan", label: "Foto Muatan", icon: "📷", wajib: false },
    { key: "lainnya", label: "Lainnya", icon: "📁", wajib: false }
];
