import React, { useState, useMemo, useRef, useEffect } from "react";
import Papa from "papaparse";
import { C, STATUS_SO, STATUS_COLOR, STATUS_BG } from "../constants";
import { fmt, fmtShort, filterByPeriod, today } from "@/src/utils";
import { Card, SectionHeader, StatCard, useConfirm, PeriodFilter, Icon, EmptyState, useToast, statusBadge, Stepper, ModalShell, FeedbackButton, PageShell, KPIGrid, ActionBar } from "@/src/components/SJMComponents";
import { CurrencyInput } from "@/src/components/SJMModals";
import { api } from "@/src/api";
import { Loader2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { buildMeta } from "@/src/lib/activityLogger";
import { generateInvoiceNo } from "@/src/utils/invoiceGenerator";
import InvoicePreviewModal from "@/src/components/InvoicePreviewModal";
import type { InvoiceTemplateProps } from "@/src/components/InvoiceTemplate";

const SO_IMPORT_FIELDS = [
  { key: "order_id", label: "Order ID", required: true },
  { key: "customer", label: "Customer", required: true },
  { key: "tgl_order", label: "Tanggal Order", required: true },
  { key: "tgl_muat", label: "Tanggal Muat", required: true },
  { key: "lokasi_muat", label: "Lokasi Muat", required: true },
  { key: "lokasi_bongkar", label: "Lokasi Bongkar", required: true },
  { key: "nama_sopir", label: "Nama Sopir", required: true },
  { key: "no_polisi", label: "No Polisi", required: true },
  { key: "nama_vendor", label: "Nama Expedisi" },
  { key: "muatan", label: "Muatan" },
  { key: "unit_muatan", label: "Unit Muatan", required: true },
  { key: "total_harga", label: "Total Harga" },
  { key: "total_harga_pajak", label: "Total Harga + Pajak" },
  { key: "base_harga", label: "Base Harga" },
  { key: "status_muatan", label: "Status Muatan" },
  { key: "no_invoice", label: "No Invoice" },
  { key: "sn", label: "SN" },
  { key: "spk", label: "SPK" },
  { key: "keterangan", label: "Keterangan" },
];

const BulkImportSO = ({ onComplete, onCancel, showToast, logAction }: any) => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<any>({});
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        if (results.meta.fields) {
          setCsvHeaders(results.meta.fields);
          // Auto map
          const newMap: any = {};
          SO_IMPORT_FIELDS.forEach(sf => {
             const match = results.meta.fields?.find(cf => {
               if (!cf) return false;
               const normalizedCf = cf.toString().toLowerCase().replace(/[^a-z]/g, "");
               const normalizedSfLabel = sf.label.toLowerCase().replace(/[^a-z]/g, "");
               const normalizedSfKey = sf.key.toLowerCase();
               return normalizedCf === normalizedSfLabel || cf.toString().toLowerCase() === normalizedSfKey;
             });
             if (match) newMap[sf.key] = match;
          });
          setMapping(newMap);
        }
        setStep(2);
      }
    });
  };

  const handleContinuePreview = () => {
    const csvOrderIdKey = mapping["order_id"];
    // Filter only rows that have an Order ID
    const validRows = csvData.filter(row => {
      const idVal = row[csvOrderIdKey];
      return idVal && idVal.toString().trim() !== "";
    });

    const parseDateSafe = (val: any) => {
      if (!val) return today();
      const s = String(val).trim();
      if (!s || s === "-" || s === "" || s === "0" || s === "1900-01-00") return today();
      
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        // Handle years that are too old or too weird
        if (d.getFullYear() < 1970) return today();
        return d.toISOString().split("T")[0];
      }
      return today();
    };

    const parseNumSafe = (val: any) => {
      if (!val) return 0;
      let s = String(val).trim().replace(/[^0-9.,]/g, "");
      if (!s) return 0;
      // Indonesian format: titik = ribuan, koma = desimal → "16.000.000,50"
      if (s.includes(",")) return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
      // Multiple titik = pemisah ribuan → "16.000.000"
      if ((s.match(/\./g) || []).length > 1) return parseFloat(s.replace(/\./g, "")) || 0;
      return parseFloat(s) || 0;
    };

    const data = validRows.map(row => {
      const obj: any = { is_posted: false, status_muatan: "Order Confirmed" };
      SO_IMPORT_FIELDS.forEach(sf => {
        const csvKey = mapping[sf.key];
        let val = csvKey ? row[csvKey] : null;

        if (sf.key === "tgl_order" || sf.key === "tgl_muat") {
          val = parseDateSafe(val);
        } else if (sf.key.includes("harga") || sf.key === "pajak") {
          val = parseNumSafe(val);
        }

        if (csvKey) obj[sf.key] = val;
      });
      return obj;
    });
    setPreviewData(data);
    setStep(3);
  };

  const handleImport = async () => {
    setUploading(true);
    try {
      await api.addSOBulk(previewData);
      showToast(`${previewData.length} data SO berhasil diimport.`);
      logAction(`Import Sales Order Masal: ${previewData.length} baris`, buildMeta({ module: 'so', action_type: 'IMPORT', after_data: { count: previewData.length } }));
      onComplete();
    } catch (e: any) {
      showToast("Gagal import: " + e.message, "error");
    }
    setUploading(false);
  };

  return (
    <div className="animate-fade-up">
      <Stepper 
        steps={["Upload File", "Mapping Kolom", "Preview & Import"]} 
        currentStep={step} 
      />

      <Card className="min-h-[400px] flex flex-col justify-center">
        {step === 1 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-[2.5rem] bg-slate-50 flex items-center justify-center mx-auto mb-6 shadow-inner text-text-light/40">
               <Icon name="UploadCloud" size={40} />
            </div>
            <div className="text-lg font-black text-text-main mb-2 tracking-tight">Upload Sales Order csv</div>
            <div className="max-w-xs mx-auto text-[12px] font-medium text-text-med leading-relaxed mb-10 opacity-70">
              Gunakan file CSV standar SJM FLOW.<br/>Mendukung hingga 1000 baris data per sesi.
            </div>
            <input type="file" hidden ref={fileRef} accept=".csv" onChange={handleFileUpload} />
            <button className="btn-primary h-12 px-10 shadow-xl shadow-accent/30" onClick={() => fileRef.current?.click()}>Pilih File csv</button>
          </div>
        )}

        {step === 2 && (
          <div className="p-2">
            <div className="flex justify-between items-end mb-8 pb-6 border-b border-border-main/50">
               <div>
                  <div className="text-lg font-black text-text-main tracking-tight">Konfigurasi Mapping</div>
                  <div className="text-[11px] font-bold text-text-light mt-2 italic">
                    <span className="text-accent">{csvData.length} Baris Terdeteksi</span> · Pasangkan kolom data Anda
                  </div>
               </div>
               <button className="btn-primary" onClick={handleContinuePreview}>Pratinjau Data <Icon name="ArrowRight" size={16} className="inline ml-1" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {SO_IMPORT_FIELDS.map(f => (
                  <div key={f.key} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${mapping[f.key] ? "border-green-brand/35 bg-green-brand-light/20" : "border-border-main bg-white"}`}>
                    <span className="text-[12px] font-bold text-text-main flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${mapping[f.key] ? "bg-green-brand" : "bg-slate-300"}`} />
                      {f.label} {f.required && <span className="text-red-brand">*</span>}
                    </span>
                    <select 
                      className="input-field max-w-[200px] h-9 text-[11px] font-bold" 
                      value={mapping[f.key] || ""} 
                      onChange={e => setMapping({ ...mapping, [f.key]: e.target.value })}
                    >
                      <option value="">— Abaikan —</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
               ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-2">
            <div className="flex justify-between items-end mb-8 pb-6 border-b border-border-main/50">
               <div>
                  <div className="text-lg font-black text-text-main tracking-tight">Final Pratinjau</div>
                  <div className="text-[11px] font-bold text-text-light mt-2">
                    {previewData.length} Sales Order siap diproses
                  </div>
               </div>
               <div className="flex gap-3">
                  <button className="btn-ghost" onClick={() => setStep(2)}>Peta Ulang</button>
                  <button className="btn-primary h-11 bg-green-brand hover:bg-green-brand/90 shadow-green-brand/20" onClick={handleImport} disabled={uploading}>
                    {uploading ? <Loader2 className="animate-spin" size={18} /> : `Eksekusi Import`}
                  </button>
               </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border-main shadow-inner">
               <div className="overflow-auto max-h-[450px] no-scrollbar">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr>
                        {SO_IMPORT_FIELDS.slice(0, 8).map(f => <th key={f.key} className="py-4">{f.label}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main/30">
                       {previewData.map((d, i) => (
                         <tr key={i} className="transition-colors">
                           {SO_IMPORT_FIELDS.slice(0, 8).map(f => (
                             <td key={f.key} className={`py-4 text-[11px] font-bold ${d[f.key] ? "text-text-main" : "text-red-brand italic"}`}>
                                {d[f.key] || "Null"}
                             </td>
                           ))}
                         </tr>
                       ))}
                    </tbody>
                  </table>
               </div>
            </div>
          </div>
        )}
      </Card>
      <div className="mt-8 text-center">
         <button className="text-[11px] font-black text-text-light hover:text-red-brand transition-colors flex items-center justify-center gap-2 mx-auto" onClick={onCancel}>
            <Icon name="X" size={14} /> Batalkan Import
         </button>
      </div>
    </div>
  );
};

const genSONo = (allSOs: any[]): string => {
  const yr = new Date().getFullYear().toString().slice(-2);
  const re = /SJM\.ID-(?:\d+\.)*(\d+)\.(\d{2})$/;
  let maxNum = 0;
  (allSOs || []).forEach((s: any) => {
    const m = (s.order_id || "").match(re);
    if (m && m[2] === yr) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  });
  return `SJM.ID-${String(maxNum + 1).padStart(4, "0")}.${yr}`;
};

export const SalesOrderPage = ({ so, setSo, jurnal, customer, connected, currentUser, onSOClick, onArmadaClick, armada, sopir, logAction, pendingEditSO, setPendingEditSO }: any) => {
  const { confirm: confirmModal, Modal: ConfirmModalUI } = useConfirm();
  const { showToast, ToastUI } = useToast();
  const canEdit = ["Admin", "Operasional"].includes(currentUser?.role);
  const [tab, setTab] = useState("list");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState({ mode: "all", month: new Date().getMonth(), year: new Date().getFullYear() });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [err, setErr] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [localCustomers, setLocalCustomers] = useState<string[]>([]);
  
  const emptyForm = {
    order_id: "", no_invoice: "", kode_invoice: "", laporan_keuangan: "",
    tgl_order: today(), tgl_muat: today(), tgl_bongkar: "", jam_muat: "08:00",
    lokasi_muat: "", lokasi_bongkar: "", status_muatan: "Order Confirmed",
    customer: "", pic_cust: "", no_pic: "",
    no_polisi: "", jenis_truk: "", nama_sopir: "", nama_vendor: "", muatan: "", unit_muatan: "", sn: "",
    harga_asuransi: "", pajak: "", nilai_pajak: "", nilai_asuransi: "",
    harga_pengiriman: "", total_harga: 0, total_harga_pajak: 0,
    is_posted: false, bukti_muatan: "", surat_jalan: "", spk: "", keterangan: "",
    modal_legs: [],
  };
  const [form, setForm] = useState<any>(emptyForm);

  const isPajakApply = (tgl_order: string) => {
    if (!tgl_order) return false;
    const d = new Date(tgl_order);
    if (isNaN(d.getTime())) return false;
    // Januari 2026 ke bawah = tidak kena pajak
    if (d.getFullYear() < 2026) return false;
    if (d.getFullYear() === 2026 && d.getMonth() === 0) return false; // bulan 0 = Januari
    return true;
  };

  const calcTotal = (f: any) => {
    const ins = parseFloat(f.harga_asuransi) || 0;
    const pengiriman = parseFloat(f.harga_pengiriman) || 0;
    // base_harga adalah modal internal, tidak masuk total customer
    const total = ins + pengiriman;
    // Pajak 11% hanya berlaku mulai Feb 2026
    const pajakApply = isPajakApply(f.tgl_order);
    const tax = pajakApply ? Math.round((pengiriman + ins) * 0.011) : 0;
    const totalPajak = total + tax;
    return { total_harga: total, total_harga_pajak: totalPajak, nilai_pajak: tax, nilai_asuransi: ins };
  };

  const handleNumChange = (k: string, v: any) => {
    const updated = { ...form, [k]: v };
    const { total_harga, total_harga_pajak, nilai_pajak, nilai_asuransi } = calcTotal(updated);
    setForm({ ...updated, total_harga, total_harga_pajak, nilai_pajak, nilai_asuransi });
  };

  const [selected, setSelected] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [previewData, setPreviewData] = useState<InvoiceTemplateProps | null>(null);
  const [pendingInvoiceNo, setPendingInvoiceNo] = useState('');
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'uninvoiced' | 'invoiced'>('all');
  const [invoiceValidationError, setInvoiceValidationError] = useState<{
    title: string;
    subtitle: string;
    issues: Array<{ label: string; detail: string[]; hint?: string }>;
  } | null>(null);
  const [sortKey, setSortKey] = useState<'order_id' | 'tgl_muat'>('order_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: 'order_id' | 'tgl_muat') => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  
  const handleTabChange = (t: string) => { 
    setTab(t); setErr(""); 
    if (t === "list") setSelected([]);
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selected.length === filtered.length && filtered.length > 0) setSelected([]);
    else setSelected(filtered.map((s: any) => s.id));
  };

  const approveBulk = async () => {
    const toPost = selected.filter(id => {
      const item = so.find((x:any) => x.id === id);
      return item && !item.is_posted;
    });
    if (toPost.length === 0) return alert("Pilih minimal satu SO berstatus DRAFT untuk diposting.");
    
    confirmModal({
      title: "Posting Masal",
      msg: `Apakah Anda yakin ingin melakukan posting pada ${toPost.length} Sales Order terpilih?`,
      confirmLabel: "Posting",
      confirmColor: C.blue,
      onConfirm: async () => {
        setProcessing(true);
        try {
          await api.bulkPostSO(toPost);
          setSo((prev: any[]) => prev.map(s => toPost.includes(s.id) ? { ...s, is_posted: true } : s));
          showToast(`${toPost.length} SO berhasil diposting.`);
          setSelected([]);
        } catch (e: any) { showToast("Gagal posting: " + e.message, "error"); }
        setProcessing(false);
      }
    });
  };

  const deleteBulk = async () => {
    if (selected.length === 0) return;
    confirmModal({
      title: "Hapus Masal",
      msg: `Apakah Anda yakin ingin menghapus ${selected.length} Sales Order terpilih secara PERMANEN?`,
      onConfirm: async () => {
        setProcessing(true);
        try {
          await api.bulkDeleteSO(selected);
          setSo((prev: any[]) => prev.filter(s => !selected.includes(s.id)));
          showToast(`${selected.length} Sales Order berhasil dihapus.`);
          setSelected([]);
        } catch (e: any) { showToast("Gagal hapus masal: " + e.message, "error"); }
        setProcessing(false);
      }
    });
  };

  const handleOpenInvoiceModal = () => {
    if (selected.length === 0) {
      showToast("Pilih minimal 1 Sales Order untuk membuat invoice.", "error");
      return;
    }
    const items = so.filter((x: any) => selected.includes(x.id));
    const issues: Array<{ label: string; detail: string[] }> = [];

    // Validasi 1 – semua SO harus dari customer yang sama
    const customers = [...new Set<string>(items.map((x: any) => x.customer).filter(Boolean))];
    if (customers.length > 1) {
      issues.push({
        label: `Invoice harus dari 1 customer yang sama — ditemukan ${customers.length} customer berbeda`,
        detail: customers.map(c => `• ${c}`),
      });
    }

    // Validasi 2 – SO tidak boleh sudah punya invoice
    const alreadyInvoiced = items.filter((x: any) => x.no_invoice);
    if (alreadyInvoiced.length > 0) {
      issues.push({
        label: `${alreadyInvoiced.length} SO sudah memiliki nomor invoice — tidak bisa diinvoice ulang`,
        detail: alreadyInvoiced.map((x: any) => `• ${x.order_id}  →  ${x.no_invoice}`),
      });
    }

    // Validasi 3 – semua SO harus berstatus Completed
    const notCompleted = items.filter((x: any) => x.status_muatan !== 'Completed');
    if (notCompleted.length > 0) {
      issues.push({
        label: `${notCompleted.length} SO belum berstatus "Completed" — ubah status terlebih dahulu`,
        detail: notCompleted.map((x: any) => `• ${x.order_id}  →  Status saat ini: ${x.status_muatan || '(belum diset)'}`),
      });
    }

    if (issues.length > 0) {
      setInvoiceValidationError({
        title: 'Invoice Tidak Bisa Dibuat',
        subtitle: issues.length > 1
          ? `${issues.length} masalah ditemukan — perbaiki semua sebelum generate invoice`
          : 'Perbaiki masalah berikut sebelum generate invoice',
        issues,
      });
      return;
    }
    setShowInvoiceModal(true);
  };

  // Classify DB error messages into actionable hints (shared by both prepare + confirm)
  const classifyDbError = (raw: string): { label: string; hint: string } => {
    const m = raw.toLowerCase();
    if (m.includes('invoices') && (m.includes('does not exist') || m.includes('relation') || m.includes('not found')) && !m.includes('column') && !m.includes('schema cache')) {
      return { label: 'Tabel "invoices" belum dibuat di database', hint: 'Jalankan SQL ini di Supabase → SQL Editor:\n\nCREATE TABLE invoices (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  no_invoice text,\n  tgl_invoice date,\n  customer text,\n  so_ids text[],\n  total_sebelum_pajak numeric DEFAULT 0,\n  ppn numeric DEFAULT 0,\n  total_setelah_pajak numeric DEFAULT 0,\n  created_at timestamptz DEFAULT now()\n);' };
    }
    if (m.includes('no_invoice') && m.includes('invoices')) {
      return { label: 'Kolom "no_invoice" belum ada di tabel invoices', hint: 'Jalankan SQL ini di Supabase → SQL Editor:\n\nALTER TABLE invoices\n  ADD COLUMN IF NOT EXISTS no_invoice text;\n\nSELECT pg_notify(\'pgrst\', \'reload schema\');' };
    }
    if (m.includes('no_invoice') && (m.includes('sales_order') || m.includes('column') || m.includes('does not exist'))) {
      return { label: 'Kolom "no_invoice" belum ada di tabel sales_order', hint: 'Jalankan SQL ini di Supabase → SQL Editor:\n\nALTER TABLE sales_order\n  ADD COLUMN IF NOT EXISTS no_invoice text;' };
    }
    if (m.includes('so_ids') || (m.includes('column') && m.includes('invoices'))) {
      return { label: 'Struktur tabel "invoices" tidak sesuai schema', hint: 'Jalankan SQL ini di Supabase → SQL Editor:\n\nALTER TABLE invoices\n  ADD COLUMN IF NOT EXISTS no_invoice text,\n  ADD COLUMN IF NOT EXISTS so_ids text[],\n  ADD COLUMN IF NOT EXISTS tgl_invoice date,\n  ADD COLUMN IF NOT EXISTS customer text,\n  ADD COLUMN IF NOT EXISTS total_sebelum_pajak numeric DEFAULT 0,\n  ADD COLUMN IF NOT EXISTS ppn numeric DEFAULT 0,\n  ADD COLUMN IF NOT EXISTS total_setelah_pajak numeric DEFAULT 0;\n\nSELECT pg_notify(\'pgrst\', \'reload schema\');' };
    }
    if (m.includes('jwt') || m.includes('auth') || m.includes('unauthorized') || m.includes('403')) {
      return { label: 'Akses database ditolak (autentikasi gagal)', hint: 'Coba logout lalu login kembali. Jika masih gagal, periksa Row-Level Security (RLS) di Supabase.' };
    }
    return { label: 'Error database tidak dikenali', hint: 'Periksa koneksi internet, coba refresh halaman, atau lihat Supabase logs untuk detail.' };
  };

  // ── Step 1: Validate + get invoice number + open preview ──────────────────
  const handlePrepareInvoice = async () => {
    if (selected.length === 0) return;
    const items = so.filter((x: any) => selected.includes(x.id));

    const date = new Date(invoiceDate || today());
    if (isNaN(date.getTime())) {
      setShowInvoiceModal(false);
      setInvoiceValidationError({
        title: 'Gagal Generate Invoice',
        subtitle: 'Terjadi kesalahan saat proses generate — lihat detail di bawah',
        issues: [{ label: 'Tanggal invoice tidak valid', detail: [`Nilai: "${invoiceDate || '(kosong)'}"`], hint: 'Pilih tanggal yang valid dari date picker.' }],
      });
      return;
    }

    setGeneratingInvoice(true);
    try {
      const invoiceNo = await generateInvoiceNo(date);
      setPendingInvoiceNo(invoiceNo);

      const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
      const invDateStr = `${String(date.getDate()).padStart(2,'0')}-${MONTHS[date.getMonth()]}-${date.getFullYear()}`;
      const fmtDate = (d: string) => {
        if (!d) return '-';
        const dt = new Date(d.includes('T') ? d : d + 'T00:00:00');
        return isNaN(dt.getTime()) ? d : `${String(dt.getDate()).padStart(2,'0')}-${MONTHS[dt.getMonth()]}-${dt.getFullYear()}`;
      };

      const templateItems = items.map((s: any, idx: number) => ({
        rowNo: idx + 1,
        tglMuat: fmtDate(s.tgl_muat),
        tglTiba: fmtDate(s.tgl_bongkar),
        noSO: s.order_id || '-',
        armada: s.jenis_truk || '-',
        noPol: s.no_polisi || '-',
        muatan: s.muatan || '',
        sn: s.sn || '',
        lokasiMuat: s.lokasi_muat || '-',
        lokasiTujuan: s.lokasi_bongkar || '-',
        hargaPengiriman: Number(s.harga_pengiriman)  || 0,
        nilaiPajak:      Number(s.nilai_pajak)       || 0,
        hargaAsuransi:   (Number(s.harga_asuransi) || Number(s.nilai_asuransi)) > 0
                           ? (Number(s.harga_asuransi) || Number(s.nilai_asuransi))
                           : null,
        total:           Number(s.total_harga_pajak) || 0,
      }));

      const subTotal   = items.reduce((s: number, x: any) => s + (Number(x.harga_pengiriman) || 0), 0);
      const ppn        = items.reduce((s: number, x: any) => s + (Number(x.nilai_pajak)      || 0), 0);
      const grandTotal = items.reduce((s: number, x: any) => s + (Number(x.total_harga_pajak)|| 0), 0);

      setPreviewData({
        invoiceNumber: invoiceNo,
        invoiceDate: invDateStr,
        customer: items[0]?.customer || '-',
        picCust: [items[0]?.pic_cust, items[0]?.no_pic].filter(Boolean).join(' '),
        items: templateItems,
        subTotal,
        ppn,
        total: grandTotal,
      });

      setShowInvoiceModal(false);
      setShowInvoicePreview(true);
    } catch (e: any) {
      setShowInvoiceModal(false);
      setInvoiceValidationError({
        title: 'Gagal Generate Invoice',
        subtitle: 'Terjadi kesalahan saat proses generate — lihat detail di bawah',
        issues: [{ label: 'Gagal membaca nomor invoice', detail: [`Error: ${e.message || String(e)}`], hint: 'Pastikan koneksi internet aktif dan Supabase dapat dijangkau.' }],
      });
    } finally {
      setGeneratingInvoice(false);
    }
  };

  // ── Step 2: Save to DB after PDF downloaded ───────────────────────────────
  const handleConfirmInvoice = async () => {
    if (!previewData || !pendingInvoiceNo) return;
    const items = so.filter((x: any) => selected.includes(x.id));
    try {
      await api.addInvoice({
        no_invoice:          pendingInvoiceNo,
        tgl_invoice:         invoiceDate || today(),
        customer:            previewData.customer,
        pic_cust:            previewData.picCust,
        so_ids:              selected,
        total_sebelum_pajak: previewData.subTotal,
        ppn:                 previewData.ppn,
        total_setelah_pajak: previewData.total,
      });
      await api.updateSOInvoiceNo(selected, pendingInvoiceNo);
      setSo((prev: any[]) => prev.map(s => selected.includes(s.id) ? { ...s, no_invoice: pendingInvoiceNo } : s));

      logAction(`Generate Invoice: ${pendingInvoiceNo}`, buildMeta({
        module: 'so', action_type: 'CREATE',
        record_id: pendingInvoiceNo,
        after_data: { customer: previewData.customer, total: previewData.total, so_count: selected.length },
      }));
      showToast(`Invoice ${pendingInvoiceNo} berhasil dibuat.`);
      setShowInvoicePreview(false);
      setPreviewData(null);
      setPendingInvoiceNo('');
      setSelected([]);
    } catch (dbErr: any) {
      const { label, hint } = classifyDbError(dbErr.message || '');
      setShowInvoicePreview(false);
      setInvoiceValidationError({
        title: 'PDF Diunduh — Database Gagal Disimpan',
        subtitle: 'File PDF sudah berhasil diunduh ke komputer Anda. Namun data invoice gagal tersimpan ke database.',
        issues: [{
          label,
          detail: ['✓ PDF invoice sudah diunduh ke komputer Anda.', `✗ Error: ${dbErr.message || 'Unknown error'}`],
          hint,
        }],
      });
      setSelected([]);
    }
  };

  const resetCustomerCombo = (name = "") => { setCustomerQuery(name); setCustomerOpen(false); };

  const openNew = () => {
    setForm(emptyForm);
    setEditItem(null); setErr(""); setTab("form");
    resetCustomerCombo();
  };

  const openDuplicate = (s: any) => {
    const { id: _id, order_id: _oid, created_at: _ca, is_posted: _ip, ...rest } = s;
    setForm({ ...rest, order_id: "", is_posted: false, tgl_order: today(), tgl_muat: today() });
    setEditItem(null); setErr(""); setTab("form");
    resetCustomerCombo(s.customer || "");
    showToast("Data disalin (Order ID dikosongkan untuk pendaftaran baru)", "info");
  };

  const openEdit = (s: any) => {
      setEditItem(s);
      setForm(s);
      setErr("");
      setTab("form");
      resetCustomerCombo(s.customer || "");
  };

  useEffect(() => {
    if (pendingEditSO && so?.length > 0) {
      const item = so.find((s: any) => s.order_id === pendingEditSO);
      if (item) {
        openEdit(item);
      }
      setPendingEditSO(null);
    }
  }, [pendingEditSO, so]);

  const handleDelete = async (id: string) => {
    confirmModal({
      title: "Hapus Sales Order",
      msg: "Apakah Anda yakin ingin menghapus Sales Order ini? Tindakan ini tidak dapat dibatalkan.",
      onConfirm: async () => {
        try {
          const item = so.find((x: any) => x.id === id);
          await api.deleteSO(id);
          setSo((prev: any[]) => prev.filter(x => x.id !== id));
          logAction(`Hapus Sales Order: ${item?.order_id || id}`, buildMeta({
            module: 'so', action_type: 'DELETE', record_id: item?.order_id || id,
            before_data: item ? { order_id: item.order_id, customer: item.customer, tgl_muat: item.tgl_muat, status_muatan: item.status_muatan, total_harga: item.total_harga } : { id },
          }));
        } catch (e: any) { alert("Gagal hapus: " + e.message); }
      }
    });
  };

  const submit = async (posted = false) => {
    setErr("");
    if (!form.customer) return setErr("Customer wajib diisi");
    if (!form.lokasi_muat) return setErr("Lokasi muat wajib diisi");
    if (!form.lokasi_bongkar) return setErr("Lokasi bongkar wajib diisi");
    
    setSaving(true);
    setSaveError(false);
    setSaveSuccess(false);
    try {
      let finalOrderId = form.order_id?.trim() || "";
      if (posted && !finalOrderId) {
        finalOrderId = genSONo(so);
      }

      const payload = { ...form, order_id: finalOrderId, is_posted: posted };
      const afterSnap = { order_id: finalOrderId, customer: payload.customer, tgl_muat: payload.tgl_muat, status_muatan: payload.status_muatan, total_harga: payload.total_harga };
      if (editItem) {
        await api.updateSO(editItem.id, payload);
        setSo((s: any[]) => s.map(x => x.id === editItem.id ? { ...x, ...payload } : x));
        logAction(`Update Sales Order: ${payload.order_id}`, buildMeta({
          module: 'so', action_type: 'UPDATE', record_id: payload.order_id,
          before_data: { order_id: editItem.order_id, customer: editItem.customer, tgl_muat: editItem.tgl_muat, status_muatan: editItem.status_muatan, total_harga: editItem.total_harga },
          after_data: afterSnap,
        }));
      } else {
        await api.addSO(payload);
        const updated = await api.getSO();
        setSo(updated);
        logAction(`Buat Sales Order: ${payload.order_id}`, buildMeta({
          module: 'so', action_type: 'CREATE', record_id: payload.order_id,
          after_data: afterSnap,
        }));
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setTab("list"); setEditItem(null);
        setSaveSuccess(false);
      }, 1000);
    } catch (e: any) { 
        setErr("Gagal simpan: " + e.message); 
        setSaveError(true);
        setTimeout(() => setSaveError(false), 2000);
    }
    setSaving(false);
  };

  const filtered = useMemo(() => {
    const base = filterByPeriod(so, period, "tgl_muat")
      .filter((s: any) => {
        if (invoiceFilter === 'uninvoiced') return !s.no_invoice;
        if (invoiceFilter === 'invoiced') return !!s.no_invoice;
        return true;
      })
      .filter((s: any) =>
        !search ||
        s.order_id?.toLowerCase().includes(search.toLowerCase()) ||
        s.customer?.toLowerCase().includes(search.toLowerCase())
      );
    return [...base].sort((a: any, b: any) => {
      const aVal = sortKey === 'tgl_muat' ? (a.tgl_muat || '') : (a.order_id || '');
      const bVal = sortKey === 'tgl_muat' ? (b.tgl_muat || '') : (b.order_id || '');
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [so, period, search, sortKey, sortDir, invoiceFilter]);

  const statusCount: any = { "Order Confirmed": 0, Loading: 0, "On Going": 0, Arrived: 0, Completed: 0, Cancelled: 0 };
  filtered.forEach((x: any) => { if (statusCount[x.status_muatan] !== undefined) statusCount[x.status_muatan]++; });

  return (
    <PageShell>
      <ConfirmModalUI />
      <ToastUI />
      <SectionHeader title="Sales Order" sub={`${so.length} SO tersimpan`}
        action={canEdit && <button className="btn-primary" onClick={openNew}><Icon name="Plus" size={16} /> SO Baru</button>} />

      <div className="tab-bar">
        {[
           ["list", "Daftar SO"],
           canEdit && ["form", editItem ? "Edit SO" : "Input SO"],
           canEdit && ["import", "Import CSV"]
        ].filter(Boolean).map(([k, l]: any) => (
          <button
            key={k}
            className={`tab-btn ${tab === k ? "active" : ""}`}
            onClick={() => handleTabChange(k)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === "import" && (
        <BulkImportSO 
           showToast={showToast}
           logAction={logAction}
           onComplete={async () => {
              const updated = await api.getSO();
              setSo(updated);
              setTab("list");
           }}
           onCancel={() => setTab("list")}
        />
      )}

      {(tab === "list" || tab === "form") && (
        <div>
          <ActionBar
            left={<PeriodFilter period={period} setPeriod={setPeriod} search={search} setSearch={setSearch} onAdd={canEdit ? openNew : null} />}
            right={canEdit && selected.length > 0 && (
              <div className="flex items-center gap-2 px-3 h-10 bg-slate-50 border border-border-main rounded-xl">
                <span className="text-[10px] font-bold text-text-med italic">{selected.length} Selected</span>
                <button className="btn-ghost !px-3 border-red-brand/20 text-red-brand hover:bg-red-brand-light" onClick={deleteBulk} disabled={processing}>
                  <Icon name="Trash2" size={12} /> Hapus
                </button>
                <button className="btn-primary !px-3" onClick={approveBulk} disabled={processing}>
                  <Icon name="Send" size={12} /> Posting
                </button>
                <button className="btn-primary !px-3 !bg-emerald-600 hover:!bg-emerald-700" onClick={handleOpenInvoiceModal} disabled={processing}>
                  <Icon name="FileText" size={12} /> Invoice
                </button>
              </div>
            )}
          />

          <KPIGrid cols={3}>
            <StatCard label="Total SO" value={filtered.length} color="var(--color-accent)" icon="Package" />
            <StatCard label="Completed" value={statusCount.Completed || 0} color="var(--color-green-brand)" icon="CheckCircle" />
            <StatCard label="Cancelled" value={statusCount.Cancelled || 0} color="var(--color-red-brand)" icon="XCircle" />
          </KPIGrid>

          <div className="flex items-center gap-2 px-1 pb-2">
            {([
              { key: 'all', label: 'Semua SO', count: so.length },
              { key: 'uninvoiced', label: 'Belum Invoice', count: so.filter((s: any) => !s.no_invoice).length },
              { key: 'invoiced', label: 'Sudah Invoice', count: so.filter((s: any) => !!s.no_invoice).length },
            ] as const).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setInvoiceFilter(key)}
                className={`flex items-center gap-1.5 h-7 px-3 rounded-full text-[10px] font-bold border transition-colors ${
                  invoiceFilter === key
                    ? key === 'uninvoiced' ? 'bg-emerald-600 text-white border-emerald-600' : key === 'invoiced' ? 'bg-blue-brand text-white border-blue-brand' : 'bg-accent text-white border-accent'
                    : 'bg-white text-text-med border-border-main hover:border-accent'
                }`}
              >
                {label}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${invoiceFilter === key ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>
              </button>
            ))}
          </div>

          <div className="table-container max-h-[calc(100vh-380px)]">
            <table className="w-full border-collapse">
              <thead>
                  <tr>
                    {canEdit && (
                      <th className="w-10">
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 rounded border-border-main text-accent focus:ring-accent"
                          checked={selected.length > 0 && selected.length === filtered.length} 
                          onChange={toggleAll} 
                        />
                      </th>
                    )}
                    <th
                      className="cursor-pointer select-none transition-colors"
                      style={{ background: sortKey === 'order_id' ? '#e2e8f0' : undefined }}
                      onClick={() => toggleSort('order_id')}
                    >
                      <span className="flex items-center gap-1 pointer-events-none">
                        Order ID
                        {sortKey !== 'order_id' && <ArrowUpDown size={10} className="opacity-30" />}
                        {sortKey === 'order_id' && sortDir === 'asc' && <ArrowUp size={10} className="text-accent" />}
                        {sortKey === 'order_id' && sortDir === 'desc' && <ArrowDown size={10} className="text-accent" />}
                      </span>
                    </th>
                    <th
                      className="cursor-pointer select-none transition-colors"
                      style={{ background: sortKey === 'tgl_muat' ? '#e2e8f0' : undefined }}
                      onClick={() => toggleSort('tgl_muat')}
                    >
                      <span className="flex items-center gap-1 pointer-events-none">
                        Tgl Muat
                        {sortKey !== 'tgl_muat' && <ArrowUpDown size={10} className="opacity-30" />}
                        {sortKey === 'tgl_muat' && sortDir === 'asc' && <ArrowUp size={10} className="text-accent" />}
                        {sortKey === 'tgl_muat' && sortDir === 'desc' && <ArrowDown size={10} className="text-accent" />}
                      </span>
                    </th>
                    <th>Rute</th>
                    <th>Customer</th>
                    <th>Unit / Sopir</th>
                    <th>Status</th>
                    <th>Invoice</th>
                    <th className="text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody key={`${sortKey}-${sortDir}`} className="divide-y divide-border-main/20">
                  {filtered.length === 0 ? <EmptyState colSpan={9} /> :
                    filtered.map((s: any) => (
                      <tr key={s.id} className="cursor-pointer transition-colors group" onClick={(e) => {
                        if ((e.target as HTMLElement).tagName === "BUTTON" || (e.target as HTMLElement).tagName === "INPUT") return;
                        onSOClick && onSOClick(s.order_id);
                      }}>
                        {canEdit && (
                          <td>
                            <input
                              type="checkbox"
                              className="w-3.5 h-3.5 rounded border-border-main text-accent focus:ring-accent"
                              checked={selected.includes(s.id)}
                              onChange={(e) => toggleSelect(s.id, e as any)}
                            />
                          </td>
                        )}
                        <td>
                          <button
                             onClick={(e) => {
                               if (!canEdit) return;
                               e.stopPropagation();
                               openEdit(s);
                             }}
                             className="text-[11px] font-black text-accent hover:underline uppercase tracking-tight"
                           >
                             {s.order_id || "(Draft)"}
                           </button>
                        </td>
                        <td className="tabular-nums text-[11px] font-bold text-text-med italic">
                          <div className="flex items-center gap-2">
                            {jurnal.some((j: any) => j.no_so?.includes(s.order_id)) && (
                              <div className="w-1.5 h-1.5 rounded-full bg-green-brand animate-pulse" title="Terhubung Jurnal" />
                            )}
                            {s.tgl_muat}
                          </div>
                        </td>
                        <td className="max-w-[200px]">
                          <div className="text-[12px] font-bold text-text-main truncate group-hover:text-blue-brand transition-colors" title={s.lokasi_muat}>{s.lokasi_muat}</div>
                          <div className="text-[10px] font-medium text-text-light opacity-70 italic truncate" title={s.lokasi_bongkar}>to {s.lokasi_bongkar}</div>
                        </td>
                        <td>
                          <div className="text-[12px] font-bold text-text-main group-hover:text-blue-brand transition-colors">{s.customer}</div>
                          <div className={`badge text-[8px] mt-1 ${s.is_posted ? "bg-green-brand-light text-green-brand" : "bg-slate-100 text-slate-500"}`}>
                            {s.is_posted ? "Posted" : "Draft"}
                          </div>
                        </td>
                        <td>
                           <button
                             className="text-[12px] font-black text-accent hover:underline tabular-nums tracking-tight"
                             onClick={(e) => { e.stopPropagation(); onArmadaClick && onArmadaClick(s.no_polisi); }}
                           >{s.no_polisi}</button>
                           <div className="text-[10px] text-text-light font-medium">{s.nama_sopir}</div>
                        </td>
                        <td>{statusBadge(s.status_muatan)}</td>
                        <td>
                          {s.no_invoice ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold rounded-lg whitespace-nowrap">
                              <Icon name="CheckCircle" size={9} /> {s.no_invoice}
                            </span>
                          ) : (
                            <span className="text-[9px] text-text-light italic opacity-50">—</span>
                          )}
                        </td>
                        <td>
                          {canEdit && (
                            <div className="flex gap-0.5 justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                              <button className="p-1.5 rounded-lg hover:bg-slate-100 text-text-med transition-colors" onClick={(e) => { e.stopPropagation(); openEdit(s); }} title="Edit">
                                <Icon name="Edit3" size={12} />
                              </button>
                              <button className="p-1.5 rounded-lg hover:bg-blue-brand/10 text-blue-brand transition-colors" onClick={(e) => { e.stopPropagation(); openDuplicate(s); }} title="Duplikat">
                                <Icon name="Copy" size={12} />
                              </button>
                              <button className="p-1.5 rounded-lg hover:bg-red-brand/10 text-red-brand transition-colors" onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} title="Hapus">
                                <Icon name="Trash2" size={12} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 text-text-main font-black border-t-2 border-border-main">
                    <td colSpan={canEdit ? 7 : 6} className="py-3 px-4 text-right italic text-[9px] opacity-60 uppercase tracking-widest">Total Muatan Terfilter</td>
                    <td colSpan={2} className="py-3 px-4 text-center text-[12px] font-black text-accent">{filtered.length} Records</td>
                  </tr>
                </tfoot>
              </table>
            </div>
        </div>
      )}

      <ModalShell isOpen={tab === "form"} onClose={() => setTab("list")}>
        <div className="p-4 border-b border-border-main flex justify-between items-center bg-white sticky top-0 z-20">
           <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-brand/10 text-blue-brand flex items-center justify-center">
                <Icon name="FilePlus2" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-text-main tracking-tight leading-none">{editItem ? "Update Sales Order" : "Input SO Baru"}</h3>
                <p className="text-[9px] font-bold text-text-light mt-1 opacity-60 italic">Rincian pengiriman armada</p>
              </div>
           </div>
           <button className="p-2 rounded-full hover:bg-slate-100 transition-colors" onClick={() => setTab("list")}>
              <Icon name="X" size={20} className="text-text-main" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 no-scrollbar space-y-8 bg-white">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-light px-1 opacity-60 italic">
               <Icon name="Hash" size={12} className="text-accent" /> Identitas Order
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Order ID</label>
                <input 
                  className="input-field h-9 text-[11px] font-bold" 
                  value={form.order_id || ""} 
                  onChange={e => setForm((f: any) => ({ ...f, order_id: e.target.value }))} 
                  placeholder={form.is_posted ? "Wajib diisi" : "Auto-Generate"}
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Customer <span className="text-red-brand">*</span> & Tanggal</label>
                <div className="flex gap-2">
                  {(() => {
                    const allNames: string[] = [
                      ...customer.map((c: any) => c.nama as string),
                      ...localCustomers.filter((n: string) => !customer.some((c: any) => c.nama === n)),
                    ];
                    const q = customerQuery.toLowerCase().trim();
                    const matches = q ? allNames.filter(n => n.toLowerCase().includes(q)) : allNames;
                    const isNew = customerQuery.trim() && !allNames.some(n => n.toLowerCase() === customerQuery.toLowerCase().trim());
                    const confirmNew = () => {
                      const name = customerQuery.trim();
                      if (!name) return;
                      setLocalCustomers(prev => prev.includes(name) ? prev : [...prev, name]);
                      setForm((f: any) => ({ ...f, customer: name }));
                      setCustomerOpen(false);
                    };
                    return (
                      <div className="relative flex-1">
                        <input
                          className="input-field h-9 w-full text-[11px] font-bold"
                          placeholder="Cari atau ketik nama customer..."
                          value={customerQuery}
                          onChange={e => { setCustomerQuery(e.target.value); setForm((f: any) => ({ ...f, customer: e.target.value })); setCustomerOpen(true); }}
                          onFocus={() => setCustomerOpen(true)}
                          onBlur={() => setTimeout(() => setCustomerOpen(false), 150)}
                          onKeyDown={e => {
                            if (e.key === 'Escape') setCustomerOpen(false);
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (matches.length > 0) { setCustomerQuery(matches[0]); setForm((f: any) => ({ ...f, customer: matches[0] })); setCustomerOpen(false); }
                              else confirmNew();
                            }
                          }}
                        />
                        {customerOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border-main rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto">
                            {matches.map((name, i) => (
                              <button key={i} type="button"
                                className="w-full text-left px-3 py-2 text-[11px] font-bold hover:bg-slate-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                                onMouseDown={e => { e.preventDefault(); setCustomerQuery(name); setForm((f: any) => ({ ...f, customer: name })); setCustomerOpen(false); }}>
                                {name}
                              </button>
                            ))}
                            {isNew && (
                              <button type="button"
                                className="w-full text-left px-3 py-2 text-[11px] font-black text-accent hover:bg-accent/5 transition-colors flex items-center gap-2 border-t border-border-main/30"
                                onMouseDown={e => { e.preventDefault(); confirmNew(); }}>
                                <Icon name="Plus" size={11} /> Tambah &ldquo;{customerQuery.trim()}&rdquo;
                              </button>
                            )}
                            {matches.length === 0 && !isNew && (
                              <div className="px-3 py-2 text-[11px] text-text-light italic opacity-50">Tidak ada hasil</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <input type="date" className="input-field h-9 w-36 text-[11px] font-bold" value={form.tgl_order || ""} onChange={e => setForm((f: any) => ({ ...f, tgl_order: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">PIC Customer <span className="text-red-brand">*</span></label>
                <input
                  className="input-field h-9 text-[11px] font-bold"
                  value={form.pic_cust || ""}
                  onChange={e => setForm((f: any) => ({ ...f, pic_cust: e.target.value }))}
                  placeholder="Nama PIC / Contact Person..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">No. Telepon PIC <span className="text-red-brand">*</span></label>
                <input
                  className="input-field h-9 text-[11px] font-bold"
                  value={form.no_pic || ""}
                  onChange={e => setForm((f: any) => ({ ...f, no_pic: e.target.value }))}
                  placeholder="08xx-xxxx-xxxx"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-light px-1 opacity-60 italic">
               <Icon name="Truck" size={12} className="text-accent" /> Logistik & Rute
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Row 1: Jenis Truk | No. Polisi */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Jenis Truk <span className="text-red-brand">*</span></label>
                <select
                  className="input-field h-9 text-[11px] font-bold"
                  value={form.jenis_truk || ''}
                  onChange={e => setForm((f: any) => ({ ...f, jenis_truk: e.target.value }))}
                >
                  <option value="">Pilih Jenis Truk</option>
                  <option value="Selfloader">Selfloader</option>
                  <option value="Selfloader Kecil">Selfloader Kecil</option>
                  <option value="Towing">Towing</option>
                  <option value="Lowbed">Lowbed</option>
                  <option value="Dolly">Dolly</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">No. Polisi <span className="text-red-brand">*</span></label>
                <input list="armada-list" className="input-field h-9 text-[11px] font-bold" value={form.no_polisi || ""} onChange={e => setForm((f: any) => ({ ...f, no_polisi: e.target.value }))} placeholder="Cari No Polisi..." />
                <datalist id="armada-list">{armada.map((a: any) => <option key={a.id} value={a.no_polisi} />)}</datalist>
              </div>
              {/* Row 2: Nama Sopir | Expedisi */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Nama Sopir</label>
                <input list="sopir-list" className="input-field h-9 text-[11px] font-bold" value={form.nama_sopir || ""} onChange={e => setForm((f: any) => ({ ...f, nama_sopir: e.target.value }))} placeholder="Cari Sopir..." />
                <datalist id="sopir-list">{sopir.map((s: any) => <option key={s.id} value={s.nama} />)}</datalist>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Expedisi Pelaksana</label>
                <input className="input-field h-9 text-[11px] font-bold" value={form.nama_vendor || ""} onChange={e => setForm((f: any) => ({ ...f, nama_vendor: e.target.value }))} placeholder="..." />
              </div>
              {/* Row 3: Lokasi Muat | Lokasi Tujuan */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Lokasi Muat <span className="text-red-brand">*</span></label>
                <input className="input-field h-9 text-[11px] font-bold" value={form.lokasi_muat || ""} onChange={e => setForm((f: any) => ({ ...f, lokasi_muat: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Lokasi Tujuan <span className="text-red-brand">*</span></label>
                <input className="input-field h-9 text-[11px] font-bold" value={form.lokasi_bongkar || ""} onChange={e => setForm((f: any) => ({ ...f, lokasi_bongkar: e.target.value }))} />
              </div>
              {/* Row 4: Tgl Muat | Tgl Bongkar */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Tgl Muat <span className="text-red-brand">*</span></label>
                <input type="date" className="input-field h-9 text-[11px] font-bold" value={form.tgl_muat || ""} onChange={e => setForm((f: any) => ({ ...f, tgl_muat: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Tgl Bongkar</label>
                <input type="date" className="input-field h-9 text-[11px] font-bold" value={form.tgl_bongkar || ""} onChange={e => setForm((f: any) => ({ ...f, tgl_bongkar: e.target.value }))} />
              </div>
              {/* Row 5: Muatan / Volume | SN */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Muatan / Volume</label>
                <div className="flex gap-2">
                  <input className="input-field h-9 flex-1 text-[11px] font-bold" value={form.muatan || ""} onChange={e => setForm((f: any) => ({ ...f, muatan: e.target.value }))} placeholder="Jenis" />
                  <input className="input-field h-9 w-20 text-[11px] font-bold" value={form.unit_muatan || ""} onChange={e => setForm((f: any) => ({ ...f, unit_muatan: e.target.value }))} placeholder="Unit" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">SN / No. Seri</label>
                <input className="input-field h-9 text-[11px] font-bold" value={form.sn || ""} onChange={e => setForm((f: any) => ({ ...f, sn: e.target.value }))} placeholder="Serial number muatan..." />
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5 bg-slate-50/50 rounded-2xl border border-border-main/50 relative overflow-hidden ring-1 ring-black/[0.02]">
            <div className="flex items-center gap-2 text-[11px] font-black text-navy uppercase tracking-widest px-1 italic">
               <div className="w-1 h-3 bg-accent rounded-full" />
               <Icon name="DollarSign" size={13} className="text-accent" /> Biaya & Keuangan
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-text-main px-1 uppercase tracking-tight">Harga Pengiriman <span className="text-red-brand">*</span></label>
                <CurrencyInput value={form.harga_pengiriman} onChange={(v: any) => handleNumChange("harga_pengiriman", v)} className="h-11 text-[13px] font-black bg-white shadow-sm border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-text-main px-1 uppercase tracking-tight">Asuransi Trip</label>
                <CurrencyInput value={form.harga_asuransi} onChange={(v: any) => handleNumChange("harga_asuransi", v)} className="h-11 text-[13px] font-black bg-white shadow-sm border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-text-main px-1 uppercase tracking-tight">PPN (1,1%)</label>
                <CurrencyInput value={form.nilai_pajak} readOnly className="h-11 text-[13px] font-black bg-slate-100/50 border-slate-200" />
              </div>

              <div className="md:col-span-3 p-5 bg-navy border border-white/10 rounded-xl flex items-center justify-between gap-4 shadow-xl overflow-hidden relative mt-2 group">
                <div className="absolute top-0 right-0 w-32 h-full bg-white/5 -skew-x-12 translate-x-8 transition-transform group-hover:translate-x-4" />
                <div className="flex flex-col gap-0 relative z-10">
                   <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest italic">Total Billable Amount</span>
                   <span className="text-2xl font-black text-white tabular-nums tracking-tighter">{fmt(form.total_harga_pajak)}</span>
                </div>
                <div className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 relative z-10 shadow-sm ${isPajakApply(form.tgl_order) ? "bg-accent text-white" : "bg-white/10 text-white/40"}`}>
                   <Icon name={isPajakApply(form.tgl_order) ? "ShieldCheck" : "ShieldAlert"} size={12} strokeWidth={3} />
                   {isPajakApply(form.tgl_order) ? "Taxable (1,1%)" : "Non-Taxable"}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-light px-1 opacity-60 italic">
               <Icon name="Paperclip" size={12} className="text-accent" /> Dokumen
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Bukti Muat (GDrive)</label>
                <div className="relative">
                  <Icon name="Link" size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
                  <input className="input-field h-9 pl-9 text-[11px] font-bold" value={form.bukti_muatan || ""} onChange={e => setForm((f: any) => ({ ...f, bukti_muatan: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Surat Jalan (GDrive)</label>
                <div className="relative">
                  <Icon name="FileText" size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
                  <input className="input-field h-9 pl-9 text-[11px] font-bold" value={form.surat_jalan || ""} onChange={e => setForm((f: any) => ({ ...f, surat_jalan: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">No. SPK</label>
                <input className="input-field h-9 text-[11px] font-bold" value={form.spk || ""} onChange={e => setForm((f: any) => ({ ...f, spk: e.target.value }))} placeholder="Nomor SPK / Work Order..." />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Catatan Internal</label>
                <textarea className="input-field h-16 pt-2 text-[11px] resize-none font-bold" value={form.keterangan || ""} onChange={e => setForm((f: any) => ({ ...f, keterangan: e.target.value }))} placeholder="..." />
              </div>
            </div>
          </div>

          {err && (
            <div className="flex items-center gap-2 p-3 bg-red-brand-light text-red-brand rounded-xl border border-red-brand/10 font-black text-[10px] tracking-tight">
              <Icon name="AlertCircle" size={14} /> {err}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border-main bg-slate-50/50 flex flex-col sm:flex-row gap-3">
          <FeedbackButton 
            className="flex-1 h-10 text-[10px] uppercase font-black tracking-widest gap-2 flex items-center justify-center order-2 sm:order-1" 
            onClick={() => submit(true)} 
            loading={saving}
            success={saveSuccess}
            error={saveError}
          >
            <Icon name="Zap" size={14} />
            {editItem ? "Update & Posting" : "Simpan & Posting"}
          </FeedbackButton>
          <button className="btn-ghost flex-1 h-10 text-[10px] uppercase font-black tracking-widest order-3 sm:order-2" onClick={() => submit(false)} disabled={saving || saveSuccess}>
            Simpan Draft
          </button>
          <button className="h-10 px-6 rounded-xl text-text-light font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-colors order-1 sm:order-3" onClick={() => setTab("list")}>
            Batal
          </button>
        </div>
      </ModalShell>

      <ModalShell isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)}>
        {(() => {
          const invoiceItems = so.filter((x: any) => selected.includes(x.id));
          const invoiceCustomer = invoiceItems[0]?.customer || '-';
          const invoicePic = invoiceItems[0]?.pic_cust || '';
          const totalDPP = invoiceItems.reduce((s: number, x: any) => s + (Number(x.harga_pengiriman) || 0), 0);
          const totalPPN = invoiceItems.reduce((s: number, x: any) => s + (x.nilai_pajak || 0), 0);
          const grandTotal = invoiceItems.reduce((s: number, x: any) => s + (x.total_harga_pajak || x.total_harga || 0), 0);
          return (
            <>
              <div className="p-5 border-b border-border-main flex items-start gap-4 bg-white sticky top-0 z-10">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Icon name="FileText" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[13px] font-black text-text-dark uppercase tracking-widest">Generate Invoice PDF</h2>
                  <p className="text-[11px] font-bold text-emerald-600 mt-0.5">{invoiceCustomer}{invoicePic ? <span className="text-text-light font-medium"> · {invoicePic}</span> : null}</p>
                  <p className="text-[10px] text-text-light mt-0.5">{selected.length} Sales Order akan digabung dalam 1 invoice</p>
                </div>
              </div>

              <div className="p-5 space-y-4 max-h-[55vh] overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Tanggal Invoice</label>
                  <input
                    type="date"
                    className="input-field h-9 text-[11px] font-bold"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                  />
                </div>

                <div className="rounded-xl border border-border-main overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 border-b border-border-main">
                    <span className="text-[10px] font-bold text-text-light uppercase tracking-widest">Daftar SO</span>
                  </div>
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-border-main/40">
                        <th className="text-left px-3 py-2 font-bold text-text-light">Order ID</th>
                        <th className="text-left px-3 py-2 font-bold text-text-light">Tgl Muat</th>
                        <th className="text-left px-3 py-2 font-bold text-text-light">Rute</th>
                        <th className="text-left px-3 py-2 font-bold text-text-light">Muatan</th>
                        <th className="text-right px-3 py-2 font-bold text-text-light">DPP</th>
                        <th className="text-right px-3 py-2 font-bold text-text-light">PPN</th>
                        <th className="text-right px-3 py-2 font-bold text-text-light">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((s: any, i: number) => (
                        <tr key={s.id} className={`border-b border-border-main/20 last:border-0 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                          <td className="px-3 py-2 font-bold text-accent">{s.order_id || '-'}</td>
                          <td className="px-3 py-2 text-text-med tabular-nums">{s.tgl_muat || '-'}</td>
                          <td className="px-3 py-2 text-text-light max-w-[150px] truncate" title={[s.lokasi_muat, s.lokasi_bongkar].join(' → ')}>{[s.lokasi_muat, s.lokasi_bongkar].filter(Boolean).join(' → ') || '-'}</td>
                          <td className="px-3 py-2 text-text-light">{s.muatan || '-'}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-bold text-text-dark">{(Number(s.harga_pengiriman) || 0).toLocaleString('id-ID')}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-text-med">{(s.nilai_pajak || 0).toLocaleString('id-ID')}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-black text-text-dark">{(s.total_harga_pajak || s.total_harga || 0).toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-border-main overflow-hidden">
                  <div className="flex justify-between px-4 py-2.5 border-b border-border-main/30">
                    <span className="text-[10px] text-text-light font-bold">DPP (Dasar Pengenaan Pajak)</span>
                    <span className="text-[11px] font-bold text-text-dark tabular-nums">Rp {totalDPP.toLocaleString('id-ID')}</span>
                  </div>
                  {totalPPN > 0 && (
                    <div className="flex justify-between px-4 py-2.5 border-b border-border-main/30">
                      <span className="text-[10px] text-text-light font-bold">PPN (1,1%)</span>
                      <span className="text-[11px] font-bold text-text-dark tabular-nums">Rp {totalPPN.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-4 py-3 bg-emerald-50">
                    <span className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">Total Tagihan</span>
                    <span className="text-[14px] font-black text-emerald-700 tabular-nums">Rp {grandTotal.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-border-main bg-slate-50/50 flex gap-3 justify-end">
                <button className="h-10 px-6 rounded-xl text-text-light font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-colors" onClick={() => setShowInvoiceModal(false)}>
                  Batal
                </button>
                <button
                  className="btn-primary h-10 !px-6 !bg-emerald-600 hover:!bg-emerald-700 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                  onClick={handlePrepareInvoice}
                  disabled={generatingInvoice}
                >
                  {generatingInvoice
                    ? <><Icon name="Loader2" size={14} className="animate-spin" /> Memproses...</>
                    : <><Icon name="Eye" size={14} /> Preview Invoice</>}
                </button>
              </div>
            </>
          );
        })()}
      </ModalShell>

      {/* ── Invoice Error Modal ──────────────────────────────────────────── */}
      <ModalShell isOpen={invoiceValidationError !== null} onClose={() => setInvoiceValidationError(null)}>
        <div className="p-5 border-b border-border-main flex items-start gap-4 bg-white sticky top-0 z-10">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
            <Icon name="AlertCircle" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[13px] font-black text-red-600 uppercase tracking-widest">
              {invoiceValidationError?.title ?? 'Error'}
            </h2>
            <p className="text-[11px] text-text-light mt-1 leading-relaxed">
              {invoiceValidationError?.subtitle}
            </p>
          </div>
        </div>

        <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
          {(invoiceValidationError?.issues ?? []).map((issue, i) => (
            <div key={i} className="rounded-xl border border-red-200 overflow-hidden">
              {/* Issue header */}
              <div className="px-4 py-2.5 bg-red-100 border-b border-red-200 flex items-start gap-2">
                <Icon name="XCircle" size={13} className="text-red-500 shrink-0 mt-0.5" />
                <span className="text-[11px] font-black text-red-700 leading-snug">{issue.label}</span>
              </div>
              {/* Detail lines */}
              <div className="px-4 py-3 bg-red-50 space-y-1">
                {issue.detail.map((d, j) => (
                  <p key={j} className="text-[11px] font-mono text-red-700 leading-relaxed">{d}</p>
                ))}
              </div>
              {/* Hint / cara memperbaiki */}
              {issue.hint && (
                <div className="px-4 py-3 bg-amber-50 border-t border-amber-200">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">
                    Cara Memperbaiki
                  </p>
                  <pre className="text-[10px] font-mono text-amber-900 whitespace-pre-wrap break-all leading-relaxed">
                    {issue.hint}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="px-5 pb-5">
          <button
            className="w-full h-10 rounded-xl bg-slate-100 text-text-main font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
            onClick={() => setInvoiceValidationError(null)}
          >
            Tutup
          </button>
        </div>
      </ModalShell>

      {/* ── Invoice Preview Modal ───────────────────────────────────────── */}
      {showInvoicePreview && previewData && (
        <InvoicePreviewModal
          data={previewData}
          invoiceNumber={pendingInvoiceNo}
          onClose={() => {
            setShowInvoicePreview(false);
            setShowInvoiceModal(true);
          }}
          onConfirm={handleConfirmInvoice}
        />
      )}

    </PageShell>
  );
};
