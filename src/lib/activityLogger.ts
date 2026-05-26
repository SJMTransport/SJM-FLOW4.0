export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'IMPORT' | 'SYNC' | 'APPROVE' | 'REJECT' | 'LOGIN' | 'LOGOUT';
export type ModuleKey = 'jurnal' | 'so' | 'laporan' | 'armada' | 'kontak' | 'coa' | 'auth' | 'posisi' | 'invoice' | 'quotation';

export interface ActivityMeta {
  module: ModuleKey;
  action_type: ActionType;
  record_id?: string | null;
  before_data?: Record<string, any> | null;
  after_data?: Record<string, any> | null;
}

export function buildMeta(payload: ActivityMeta): ActivityMeta {
  return payload;
}

export const ACTION_LABELS: Record<ActionType, string> = {
  CREATE: 'Tambah', UPDATE: 'Ubah', DELETE: 'Hapus', EXPORT: 'Export',
  IMPORT: 'Import', SYNC: 'Sinkron', APPROVE: 'Setuju', REJECT: 'Tolak',
  LOGIN: 'Login', LOGOUT: 'Logout',
};

// Hex colors — dipakai di LogAktivitasPage (badge inline style)
export const ACTION_HEX: Record<ActionType, string> = {
  CREATE: '#6B8E23',   // --color-success
  UPDATE: '#4A6FA5',   // --color-info
  DELETE: '#B85450',   // --color-error
  EXPORT: '#C4914A',   // --color-warning
  IMPORT: '#C4914A',   // --color-warning
  SYNC: '#4A6FA5',     // --color-info
  APPROVE: '#6B8E23',  // --color-success
  REJECT: '#B85450',   // --color-error
  LOGIN: '#6B6862',    // --color-text-light
  LOGOUT: '#6B6862',   // --color-text-light
};

// Dipertahankan untuk backward compat (Laporan.tsx)
export const ACTION_COLORS: Record<ActionType, string> = {
  CREATE: 'bg-green-brand/10 text-green-brand',
  UPDATE: 'bg-blue-brand/10 text-blue-brand',
  DELETE: 'bg-red-brand/10 text-red-brand',
  EXPORT: 'bg-purple-500/10 text-purple-600',
  IMPORT: 'bg-amber-500/10 text-amber-600',
  SYNC: 'bg-cyan-500/10 text-cyan-600',
  APPROVE: 'bg-emerald-500/10 text-emerald-600',
  REJECT: 'bg-rose-500/10 text-rose-600',
  LOGIN: 'bg-slate-200/80 text-text-light',
  LOGOUT: 'bg-slate-200/80 text-text-light',
};

export const MODULE_LABELS: Record<ModuleKey, string> = {
  jurnal: 'Jurnal',
  so: 'Sales Order',
  laporan: 'Laporan',
  armada: 'Armada',
  kontak: 'Kontak',
  coa: 'COA',
  auth: 'Auth',
  posisi: 'Posisi Armada',
  invoice: 'Invoice',
  quotation: 'Quotation',
};
