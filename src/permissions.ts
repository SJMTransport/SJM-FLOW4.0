export type AccessLevel = "edit" | "lihat" | "hide";

export type ModuleKey =
  | "dashboard" | "so" | "invoice" | "quotation"
  | "jurnal" | "hutangpiutang" | "laporan"
  | "armada" | "master" | "users";

export type RolePermissions = Record<ModuleKey, AccessLevel>;

export const PERMISSIONS: Record<string, RolePermissions> = {
  Admin: {
    dashboard: "edit", so: "edit", invoice: "edit", quotation: "edit",
    jurnal: "edit", hutangpiutang: "edit", laporan: "edit",
    armada: "edit", master: "edit", users: "edit",
  },
  Keuangan: {
    dashboard: "lihat", so: "lihat", invoice: "edit", quotation: "lihat",
    jurnal: "edit", hutangpiutang: "edit", laporan: "edit",
    armada: "hide", master: "hide", users: "hide",
  },
  Operasional: {
    dashboard: "lihat", so: "edit", invoice: "edit", quotation: "edit",
    jurnal: "hide", hutangpiutang: "hide", laporan: "hide",
    armada: "edit", master: "hide", users: "hide",
  },
  Viewer: {
    dashboard: "lihat", so: "lihat", invoice: "lihat", quotation: "lihat",
    jurnal: "hide", hutangpiutang: "hide", laporan: "hide",
    armada: "lihat", master: "hide", users: "hide",
  },
};

export function getAccess(role: string, module: ModuleKey): AccessLevel {
  return PERMISSIONS[role]?.[module] ?? "hide";
}

export function canEdit(role: string, module: ModuleKey): boolean {
  return getAccess(role, module) === "edit";
}

export function canView(role: string, module: ModuleKey): boolean {
  return getAccess(role, module) !== "hide";
}
