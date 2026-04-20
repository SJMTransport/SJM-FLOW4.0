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

export const I = {
  dashboard: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  operasional: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  keuangan: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  laporan: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  armada: "M18.36 6.64a9 9 0 1 1-12.73 0",
  master: "M12 15V3m0 12l-4-4m4 4l4-4",
  alert: "M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  warning: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01",
  info: "M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  search: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z",
  plus: "M12 5v14M5 12h14",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  check: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3",
  x: "M18 6L6 18M6 6l12 12",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
  trendingUp: "M23 6l-9.5 9.5-5-5L1 18",
  trendingDown: "M23 18l-9.5-9.5-5 5L1 6",
  dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  box: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
};

export const DOC_TYPES = [
    { key: "surat_jalan", label: "Surat Jalan", icon: I.file, wajib: true },
    { key: "invoice_vendor", label: "Invoice Vendor", icon: I.dollar, wajib: false },
    { key: "foto_muatan", label: "Foto Muatan", icon: I.box, wajib: false },
    { key: "lainnya", label: "Lainnya", icon: I.list, wajib: false }
];
