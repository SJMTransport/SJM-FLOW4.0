// ─── DOMAIN MODELS ──────────────────────────────────────────────────────────

export type Role = "Admin" | "Operasional" | "Manager" | "Staff";

export interface UserProfile {
  id: string;
  username: string;
  nama: string;
  role: Role;
  status: "Aktif" | "Nonaktif";
  email?: string;
}

export interface COA {
  id: string;
  kode: string;
  nama: string;
  klasifikasi: string;
  kelompok: string;
  sub_kelompok: string;
  normal_balance: "Debit" | "Kredit";
  status: "Aktif" | "Nonaktif";
}

export interface Jurnal {
  id: string;
  no_jurnal: string;
  tanggal: string;
  no_bukti?: string;
  keterangan: string;
  no_so?: string; // Comma separated IDs
  so_values?: Record<string, number>;
  total_debit: number;
  total_kredit: number;
  status: "Pending" | "Approved" | "Rejected";
  created_by: string;
  jurnal_detail?: JurnalDetail[];
}

export interface JurnalDetail {
  id: string;
  jurnal_id: string;
  coa_kode: string;
  nama_akun: string;
  debit: number;
  kredit: number;
  no_so?: string;
}

export interface SalesOrder {
  id: string;
  order_id: string;
  no_invoice?: string;
  tgl_order: string;
  tgl_muat: string;
  jam_muat: string;
  lokasi_muat: string;
  lokasi_bongkar: string;
  customer: string;
  pic_cust?: string;
  no_pic?: string;
  no_polisi: string;
  nama_sopir: string;
  muatan: string;
  status_muatan: string;
  total_harga: number;
  total_harga_pajak: number;
  is_posted: boolean;
  posisi_terakhir?: string;
}

export interface Armada {
  id: string;
  no_polisi: string;
  nama_armada: string;
  merk: string;
  jenis: string;
  sopir_id?: string;
  status: "Aktif" | "Maintenance" | "Nonaktif";
  posisi_log?: ArmadaLog[];
}

export interface ArmadaLog {
  date: string;
  time: string;
  location: string;
  info: string;
  status: string;
}

export interface Sopir {
  id: string;
  nama: string;
  telepon: string;
  alamat: string;
  status: "Aktif" | "Nonaktif";
}

// ─── SYSTEM TYPES ────────────────────────────────────────────────────────────

export interface Period {
  mode: "all" | "month" | "year";
  month: number;
  year: number;
}
