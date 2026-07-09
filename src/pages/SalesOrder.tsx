import React, { useState, useMemo, useRef, useEffect } from "react";
import Papa from "papaparse";
import { C, STATUS_SO, STATUS_COLOR, STATUS_BG } from "../constants";
import { fmt, fmtShort, filterByPeriod, today } from "@/src/utils";
import { Card, SectionHeader, StatCard, useConfirm, PeriodFilter, Icon, EmptyState, useToast, statusBadge, Stepper, ModalShell, FeedbackButton, PageShell, KPIGrid, ActionBar, PageHeader } from "@/src/components/SJMComponents";
import { CurrencyInput } from "@/src/components/SJMModals";
import { api } from "@/src/api";
import { Loader2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { buildMeta } from "@/src/lib/activityLogger";
import * as XLSX from "xlsx";

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
  const [importMode, setImportMode] = useState<'insert' | 'upsert'>('upsert');
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
      if (importMode === 'upsert') {
        // Mode: Update & Tambah — hanya patch field yang ada di CSV
        const mappedKeys = SO_IMPORT_FIELDS
          .filter(f => mapping[f.key])
          .map(f => f.key);
        const { stats } = await api.upsertSOBulk(previewData, mappedKeys);
        showToast(
          `Selesai! ${stats.updated} SO diperbarui, ${stats.inserted} SO baru ditambahkan.`,
          'success'
        );
        logAction(
          `Bulk Upsert SO: ${stats.updated} update, ${stats.inserted} insert`,
          buildMeta({ module: 'so', action_type: 'IMPORT', after_data: stats })
        );
      } else {
        // Mode: Tambah Baru Saja — insert only, skip existing order_ids
        await api.addSOBulk(previewData);
        showToast(`${previewData.length} data SO baru berhasil diimport.`, 'success');
        logAction(
          `Import SO Baru: ${previewData.length} baris`,
          buildMeta({ module: 'so', action_type: 'IMPORT', after_data: { count: previewData.length } })
        );
      }
      onComplete();
    } catch (e: any) {
      showToast('Gagal import: ' + e.message, 'error');
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
          <div className="py-10 px-6">
            {/* Mode Selection */}
            <div className="mb-8">
              <div className="text-[11px] font-black text-text-light uppercase tracking-widest mb-3">Pilih Mode Import</div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setImportMode('upsert')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    importMode === 'upsert'
                      ? 'border-accent bg-accent/5'
                      : 'border-border-main bg-white hover:border-accent/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      importMode === 'upsert' ? 'border-accent' : 'border-border-main'
                    }`}>
                      {importMode === 'upsert' && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                    </div>
                    <span className="text-[12px] font-black text-text-main">Update & Tambah</span>
                    <span className="ml-auto px-2 py-0.5 rounded-full text-[8px] font-black bg-accent text-white">RECOMMENDED</span>
                  </div>
                  <p className="text-[10px] text-text-light leading-relaxed pl-5">
                    SO yang sudah ada → diperbarui (hanya field di CSV).<br/>
                    SO baru → ditambahkan.<br/>
                    <span className="text-green-600 font-bold">Data lama yang tidak ada di CSV tetap aman.</span>
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode('insert')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    importMode === 'insert'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-border-main bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      importMode === 'insert' ? 'border-blue-500' : 'border-border-main'
                    }`}>
                      {importMode === 'insert' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    </div>
                    <span className="text-[12px] font-black text-text-main">Tambah Baru Saja</span>
                  </div>
                  <p className="text-[10px] text-text-light leading-relaxed pl-5">
                    Hanya tambah SO yang belum ada.<br/>
                    SO yang sudah ada di sistem → dilewati.<br/>
                    <span className="text-blue-600 font-bold">Cocok untuk data historis baru.</span>
                  </p>
                </button>
              </div>
            </div>

            {/* Upload File */}
            <div className="text-center pt-6 border-t border-border-main/40">
              <div className="w-16 h-16 rounded-[2rem] bg-slate-50 flex items-center justify-center mx-auto mb-4 shadow-inner text-text-light/40">
                <Icon name="UploadCloud" size={32} />
              </div>
              <div className="text-base font-black text-text-main mb-1 tracking-tight">Upload File CSV</div>
              <div className="text-[11px] font-medium text-text-med mb-6 opacity-70">
                Format CSV standar SJM FLOW · Maks. 1000 baris
              </div>
              <input type="file" hidden ref={fileRef} accept=".csv" onChange={handleFileUpload} />
              <button className="btn-primary h-12 px-10 shadow-xl shadow-accent/30" onClick={() => fileRef.current?.click()}>
                <Icon name="Upload" size={15} className="inline mr-2" />Pilih File CSV
              </button>
            </div>
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
                  <button
                    className={`btn-primary h-11 shadow-lg ${
                      importMode === 'upsert'
                        ? 'bg-accent hover:bg-accent/90 shadow-accent/20'
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                    }`}
                    onClick={handleImport}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <><Loader2 className="animate-spin inline mr-2" size={16} />Memproses...</>
                    ) : importMode === 'upsert' ? (
                      <><Icon name="RefreshCw" size={14} className="inline mr-2" />Update & Tambah</>
                    ) : (
                      <><Icon name="Plus" size={14} className="inline mr-2" />Tambah Baru Saja</>
                    )}
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

const getFriendlyError = (err: any): string => {
  const msg = err?.message || '';
  if (msg.includes('duplicate key') || msg.includes('unique')) return 'Data ini sudah ada. Gunakan nomor/kode yang berbeda.';
  if (msg.includes('foreign key') || msg.includes('violates')) return 'Data tidak dapat disimpan karena terkait dengan data lain.';
  if (msg.includes('network') || msg.includes('fetch')) return 'Koneksi terputus. Periksa internet dan coba lagi.';
  if (msg.includes('timeout')) return 'Server terlalu lama merespons. Coba lagi.';
  if (msg.includes('permission') || msg.includes('not authorized')) return 'Anda tidak memiliki akses untuk melakukan tindakan ini.';
  if (msg.includes('JWT') || msg.includes('token') || msg.includes('expired')) return 'Sesi Anda telah berakhir. Silakan login kembali.';
  return 'Terjadi kesalahan. Coba lagi atau hubungi admin.';
};

export const SalesOrderPage = ({ so, setSo, jurnal, customer, connected, currentUser, onSOClick, onArmadaClick, armada, sopir, logAction, pendingEditSO, setPendingEditSO }: any) => {
  const { confirm: confirmModal, Modal: ConfirmModalUI } = useConfirm();
  const { showToast, ToastUI } = useToast();
  const canEdit = ["Admin", "Operasional"].includes(currentUser?.role);
  const [tab, setTab] = useState("list");
  const [inputMode, setInputMode] = useState<'manual' | 'bulk'>('manual');
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState({ mode: "all", month: new Date().getMonth(), year: new Date().getFullYear() });
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [err, setErr] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [localCustomers, setLocalCustomers] = useState<string[]>([]);
  const [picOpen, setPicOpen] = useState(false);
  const [picQuery, setPicQuery] = useState("");
  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendorQuery, setVendorQuery] = useState("");
  
  const [openDropdown, setOpenDropdown] = useState<'status_muatan' | 'status_invoice' | 'date_range' | null>(null);
  const [tempRangeFrom, setTempRangeFrom] = useState(new Date().toISOString().slice(0, 10));
  const [tempRangeTo, setTempRangeTo] = useState(new Date().toISOString().slice(0, 10));
  
  const emptyForm = {
    order_id: "", no_invoice: "", kode_invoice: "", laporan_keuangan: "",
    tgl_order: today(), tgl_muat: today(), tgl_bongkar: "", jam_muat: "08:00",
    lokasi_muat: "", lokasi_bongkar: "", status_muatan: "Order Confirmed",
    customer: "", pic_cust: "", no_pic: "",
    no_polisi: "", jenis_truk: "", nama_sopir: "", nama_vendor: "", muatan: "", unit_muatan: "", sn: "",
    harga_asuransi: "", pajak: "", nilai_pajak: "", nilai_asuransi: "",
    harga_pengiriman: "", total_harga: 0, total_harga_pajak: 0,
    is_posted: false, bukti_muatan: "", surat_jalan: "", spk: "", keterangan: "",
    no_asuransi: "", nilai_tanggungan: "", dokumen_asuransi: "",
    foto_muat: "", foto_bongkar: "",
    scan_invoice: "", potong_pajak: "", invoice_vendor: "",
    modal_legs: [],
  };
  const [form, setForm] = useState<any>(emptyForm);


  // Unique PIC+phone pairs for the currently selected customer (most recent first)
  const customerPics = useMemo(() => {
    const cust = form.customer;
    if (!cust) return [];
    const seen = new Set<string>();
    const result: { pic: string; no: string }[] = [];

    // 1. Add current PIC from master customer database first
    const cDb = (customer || []).find((c: any) => c.nama === cust);
    if (cDb && cDb.pic) {
      seen.add(cDb.pic.toLowerCase().trim());
      result.push({ pic: cDb.pic, no: cDb.no_hp || "" });
    }

    // 2. Add historical PICs from SOs
    [...(so || [])].sort((a: any, b: any) => (b.tgl_order || '').localeCompare(a.tgl_order || ''))
      .forEach((s: any) => {
        if (s.customer === cust && s.pic_cust) {
          const key = s.pic_cust.toLowerCase().trim();
          if (!seen.has(key)) { seen.add(key); result.push({ pic: s.pic_cust, no: s.no_pic || '' }); }
        }
      });
    return result;
  }, [so, form.customer, customer]);

  // Unique ekspedisi (vendor) values from SO history
  const vendorOptions = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    (so || []).forEach((s: any) => {
      const v = (s.nama_vendor || '').trim();
      if (v && !seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); result.push(v); }
    });
    return result.sort();
  }, [so]);

  const isPajakApply = (tgl_muat: string, tgl_order?: string) => {
    const tgl = tgl_muat || tgl_order || "";
    if (!tgl) return false;
    const d = new Date(tgl);
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
    const pajakApply = isPajakApply(f.tgl_muat, f.tgl_order);
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
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'uninvoiced' | 'invoiced'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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
    if (toPost.length === 0) { showToast("Pilih minimal satu SO berstatus DRAFT untuk diposting.", "error"); return; }
    
    const toPostItems = toPost.map(id => so.find((x: any) => x.id === id)).filter(Boolean);
    const soList = toPostItems.slice(0, 5).map((x: any) => `• ${x.order_id}`).join('\n');
    const extra = toPostItems.length > 5 ? `\n• ... dan ${toPostItems.length - 5} lainnya` : '';
    confirmModal({
      title: "Posting Masal",
      msg: `Anda akan memposting ${toPost.length} Sales Order:\n\n${soList}${extra}\n\nLanjutkan?`,
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
  const resetCustomerCombo = (name = "") => { setCustomerQuery(name); setCustomerOpen(false); };
  const resetPicCombo = (name = "") => { setPicQuery(name); setPicOpen(false); };
  const resetVendorCombo = (name = "") => { setVendorQuery(name); setVendorOpen(false); };

  const openNew = () => {
    setForm(emptyForm);
    setEditItem(null); setErr(""); setTab("form");
    setInputMode("manual");
    resetCustomerCombo(); resetPicCombo(); resetVendorCombo();
  };

  const openDuplicate = (s: any) => {
    const { id: _id, order_id: _oid, created_at: _ca, is_posted: _ip, ...rest } = s;
    setForm({ ...rest, order_id: "", is_posted: false, tgl_order: today(), tgl_muat: today() });
    setEditItem(null); setErr(""); setTab("form");
    setInputMode("manual");
    resetCustomerCombo(s.customer || "");
    resetPicCombo(s.pic_cust || ""); resetVendorCombo(s.nama_vendor || "");
    showToast("Data disalin (Order ID dikosongkan untuk pendaftaran baru)", "info");
  };

  const openEdit = (s: any) => {
      setEditItem(s);
      setForm(s);
      setErr("");
      setTab("form");
      setInputMode("manual");
      resetCustomerCombo(s.customer || "");
      resetPicCombo(s.pic_cust || ""); resetVendorCombo(s.nama_vendor || "");
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
        } catch (e: any) { showToast("Gagal hapus: " + e.message, "error"); }
      }
    });
  };

  const doSave = async (posted: boolean) => {
    setSaving(true);
    setSaveError(false);
    setSaveSuccess(false);
    try {
      let finalOrderId = form.order_id?.trim() || "";
      if (posted && !finalOrderId) {
        finalOrderId = genSONo(so);
      }
      const { total_harga, total_harga_pajak, nilai_pajak, nilai_asuransi } = calcTotal(form);
      const payload = { 
        ...form, 
        order_id: finalOrderId, 
        is_posted: posted,
        total_harga,
        total_harga_pajak,
        nilai_pajak,
        nilai_asuransi,
        harga_asuransi: nilai_asuransi
      };
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
        setReloading(true);
        const updated = await api.getSO();
        setSo(updated);
        logAction(`Buat Sales Order: ${payload.order_id}`, buildMeta({
          module: 'so', action_type: 'CREATE', record_id: payload.order_id,
          after_data: afterSnap,
        }));
      }
      const idLabel = finalOrderId ? ` ${finalOrderId}` : '';
      showToast(editItem ? `Sales Order${idLabel} berhasil diperbarui!` : `Sales Order${idLabel} berhasil dibuat!`, 'success');
      setSaveSuccess(true);
      setTimeout(() => {
        setTab("list"); setEditItem(null);
        setSaveSuccess(false);
      }, 1000);
    } catch (e: any) {
        console.error('simpan SO error:', e);
        setErr(getFriendlyError(e));
        setSaveError(true);
        setTimeout(() => setSaveError(false), 2000);
    } finally {
      setSaving(false);
      setReloading(false);
    }
  };

  const submit = async (posted = false) => {
    setErr("");
    if (!form.customer) return setErr("Customer wajib diisi");
    if (!form.lokasi_muat) return setErr("Lokasi muat wajib diisi");
    if (!form.lokasi_bongkar) return setErr("Lokasi bongkar wajib diisi");

    const warnings: string[] = [];
    if (!form.no_polisi?.trim()) warnings.push('No. Polisi belum diisi — kolom Armada di invoice akan kosong');
    if (!form.jenis_truk?.trim()) warnings.push('Jenis Truk belum dipilih — kolom Armada di invoice akan kosong');
    if (!(parseFloat(String(form.harga_pengiriman || 0)) > 0)) warnings.push('Harga Pengiriman = Rp 0 — invoice akan bernilai nol');
    if (!form.pic_cust?.trim()) warnings.push('PIC Customer belum diisi — kolom Telepon di invoice akan kosong');

    if (warnings.length > 0) {
      confirmModal({
        title: "Perhatian — Data Belum Lengkap",
        msg: `Beberapa field penting belum diisi:\n• ${warnings.join('\n• ')}\n\nData tetap akan disimpan. Lanjutkan?`,
        confirmLabel: "Ya, Simpan",
        onConfirm: async () => { await doSave(posted); }
      });
      return;
    }
    await doSave(posted);
  };
  const formatRangeLabel = (p: any) => {
    if (p.mode === 'all') return 'Semua Periode';
    if (p.mode === 'day') return p.day || '';
    if (p.mode === 'month') return `Bulan ${p.month + 1} - ${p.year}`;
    if (p.mode === 'year') return `Tahun ${p.year}`;
    if (p.mode === 'range') {
      const fDate = (dStr: string) => {
        if (!dStr) return '';
        const d = new Date(dStr);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      };
      return `${fDate(p.rangeFrom)} - ${fDate(p.rangeTo)}`;
    }
    return 'Pilih Periode';
  };

  const handleExportExcel = () => {
    const dataToExport = filtered.map((s: any, idx: number) => ({
      'No.': idx + 1,
      'Order ID': s.order_id || '(Draft)',
      'Tgl Muat': s.tgl_muat || '',
      'Rute Dari': s.lokasi_muat || '',
      'Rute Ke': s.lokasi_bongkar || '',
      'Customer': s.customer || '',
      'Status': s.status_muatan || '',
      'No. Polisi': s.no_polisi || '',
      'Sopir': s.nama_sopir || '',
      'Biaya': s.total_harga || 0,
      'Invoice': s.no_invoice || '',
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    wb.Props = {
      Title: "Sales Order Report",
      Subject: "Logistics Management",
      Author: "SJM Flow",
      Company: "PT Sugiarto Jaya Mandiri",
      Creator: "SJM Flow",
      Keywords: "Logistics, Transportation, Heavy Equipment, SJM Flow"
    } as any;
    XLSX.utils.book_append_sheet(wb, ws, "Sales Orders");
    XLSX.writeFile(wb, `Sales_Orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("Berhasil mengunduh Excel Sales Order", "success");
  };
  const filtered = useMemo(() => {
    const base = filterByPeriod(so, period, "tgl_muat")
      .filter((s: any) => {
        if (invoiceFilter === 'uninvoiced') return s.status_muatan === 'Completed' && !s.no_invoice;
        if (invoiceFilter === 'invoiced') return !!s.no_invoice;
        return true;
      })
      .filter((s: any) => statusFilter === 'all' ? true : s.status_muatan === statusFilter)
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
  }, [so, period, search, sortKey, sortDir, invoiceFilter, statusFilter]);

  const statusCount: any = { "Order Confirmed": 0, Loading: 0, "On Going": 0, Arrived: 0, Completed: 0, Cancelled: 0 };
  filtered.forEach((x: any) => { if (statusCount[x.status_muatan] !== undefined) statusCount[x.status_muatan]++; });
  const totalBiaya = filtered.reduce((sum: number, s: any) => sum + (Number(s.total_harga_pajak) || Number(s.total_harga) || 0), 0);

  // KPI base counts — from period only, unaffected by statusFilter/invoiceFilter
  const periodBase = filterByPeriod(so, period, "tgl_muat");
  const kpiCount: any = { "On Going": 0, Loading: 0, Completed: 0, Cancelled: 0 };
  periodBase.forEach((x: any) => { if (kpiCount[x.status_muatan] !== undefined) kpiCount[x.status_muatan]++; });
  const kpiBelumInvoice = periodBase.filter((s: any) =>
    s.status_muatan === 'Completed' && !s.no_invoice
  ).length;
  const kpiMasihBerjalan = periodBase.filter((s: any) =>
    ['On Going', 'Loading', 'Order Confirmed'].includes(s.status_muatan)
  ).length;

  return (
    <PageShell>
      <ConfirmModalUI />
      <ToastUI />
      <PageHeader title="Sales Order" sub={`${so.length} SO tersimpan`}
        action={canEdit && <button className="btn-primary" onClick={openNew}><Icon name="Plus" size={16} /> SO Baru</button>} />

      <div className="tab-bar">
        {[
           ["list", "Daftar SO"],
           canEdit && ["form", editItem ? "Edit SO" : "Input SO"],
        ].filter(Boolean).map(([k, l]: any) => (
          <button
            key={k}
            className={`tab-btn ${tab === k ? "active" : ""}`}
            onClick={() => handleTabChange(k)}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "form" && !editItem && (
        <div className="flex bg-[#F5F4F1] p-1.5 rounded-xl gap-1.5 mb-4 max-w-xs border border-border-main/30">
          <button
            type="button"
            onClick={() => setInputMode("manual")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              inputMode === "manual"
                ? "bg-white text-accent shadow-sm border border-border-main/60"
                : "text-text-light hover:bg-white/50"
            }`}
          >
            <Icon name="FilePlus2" size={12} /> Input Manual
          </button>
          <button
            type="button"
            onClick={() => setInputMode("bulk")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              inputMode === "bulk"
                ? "bg-white text-accent shadow-sm border border-border-main/60"
                : "text-text-light hover:bg-white/50"
            }`}
          >
            <Icon name="UploadCloud" size={12} /> Import CSV
          </button>
        </div>
      )}

      {tab === "list" ? (
        <div>
          {/* KPI Cards */}
          <KPIGrid cols={6} className="mb-4">
            {([
              { key: 'all',       label: 'Total SO',      value: String(periodBase.length),                  color: 'var(--color-accent)',     icon: 'Database'    },
              { key: 'On Going',  label: 'On Going',      value: String(kpiCount['On Going']),               color: '#4A6FA5',                 icon: 'Navigation'  },
              { key: 'Loading',   label: 'Loading',       value: String(kpiCount['Loading']),                color: 'var(--color-warning)',    icon: 'Package'     },
              { key: 'Completed', label: 'Completed',     value: String(kpiCount['Completed']),              color: 'var(--color-success)',    icon: 'CheckCircle' },
              { key: 'Cancelled', label: 'Cancelled',     value: String(kpiCount['Cancelled']),              color: 'var(--color-error)',      icon: 'AlertTriangle' },
              { key: '__belum__', label: 'Belum Invoice', value: String(kpiBelumInvoice),                    color: 'var(--color-teal, #0d9488)', icon: 'FileText', sub: `+${kpiMasihBerjalan} SO masih berjalan` },
            ] as const).map(({ key, label, value, color, icon, ...extra }) => {
              const isActive =
                key === '__belum__'
                  ? invoiceFilter === 'uninvoiced'
                  : statusFilter === key;
              return (
                <StatCard
                  key={key}
                  label={label}
                  value={value}
                  icon={icon}
                  color={color}
                  sub={'sub' in extra ? extra.sub : undefined}
                  isActive={isActive}
                  onClick={() => {
                    if (key === '__belum__') {
                      setInvoiceFilter(invoiceFilter === 'uninvoiced' ? 'all' : 'uninvoiced');
                      setStatusFilter('all');
                    } else {
                      setStatusFilter(isActive ? 'all' : key);
                      setInvoiceFilter('all');
                    }
                  }}
                />
              );
            })}
          </KPIGrid>

          <ActionBar
            left={
              <div className="flex items-center gap-2 flex-wrap flex-1">
                {/* Search */}
                <div className="relative min-w-[200px]">
                  <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light opacity-60" />
                  <input
                    placeholder="Cari Sales Order..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="input-field pl-9 h-9 text-[12px] w-full"
                  />
                </div>

                {/* Status Muatan Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'status_muatan' ? null : 'status_muatan')}
                    className="input-field h-9 px-3 text-[11px] font-bold flex items-center gap-2 bg-white border border-border-main rounded-xl shadow-xs"
                  >
                    <Icon name="Truck" size={12} className="text-text-light opacity-80" />
                    <span>{statusFilter === 'all' ? 'Status Muatan' : statusFilter}</span>
                    <Icon name="ChevronDown" size={10} className="text-text-light ml-1" />
                  </button>
                  {openDropdown === 'status_muatan' && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setOpenDropdown(null)} />
                      <div className="absolute top-10 left-0 z-30 bg-white border border-border-main rounded-xl shadow-lg py-1.5 min-w-[170px] text-[11px] font-bold text-text-main">
                        <button
                          onClick={() => { setStatusFilter('all'); setOpenDropdown(null); }}
                          className="flex items-center justify-between w-full px-4 py-2 hover:bg-slate-50 text-left"
                        >
                          <span>Semua Status</span>
                          {statusFilter === 'all' && <Icon name="Check" size={11} className="text-accent" />}
                        </button>
                        {([
                          { key: 'On Going', color: '#3b82f6' },
                          { key: 'Loading', color: '#f97316' },
                          { key: 'Arrived', color: '#a855f7' },
                          { key: 'Completed', color: '#10b981' },
                          { key: 'Cancelled', color: '#ef4444' }
                        ] as const).map(({ key, color }) => (
                          <button
                            key={key}
                            onClick={() => { setStatusFilter(key); setInvoiceFilter('all'); setOpenDropdown(null); }}
                            className="flex items-center justify-between w-full px-4 py-2 hover:bg-slate-50 text-left"
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                              {key}
                            </span>
                            {statusFilter === key && <Icon name="Check" size={11} className="text-accent" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Status Invoice Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'status_invoice' ? null : 'status_invoice')}
                    className="input-field h-9 px-3 text-[11px] font-bold flex items-center gap-2 bg-white border border-border-main rounded-xl shadow-xs"
                  >
                    <Icon name="FileText" size={12} className="text-text-light opacity-80" />
                    <span>{invoiceFilter === 'all' ? 'Status Invoice' : invoiceFilter === 'uninvoiced' ? 'Belum Invoice' : 'Sudah Invoice'}</span>
                    <Icon name="ChevronDown" size={10} className="text-text-light ml-1" />
                  </button>
                  {openDropdown === 'status_invoice' && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setOpenDropdown(null)} />
                      <div className="absolute top-10 left-0 z-30 bg-white border border-border-main rounded-xl shadow-lg py-1.5 min-w-[170px] text-[11px] font-bold text-text-main">
                        <button
                          onClick={() => { setInvoiceFilter('all'); setOpenDropdown(null); }}
                          className="flex items-center justify-between w-full px-4 py-2 hover:bg-slate-50 text-left"
                        >
                          <span>Semua Invoice</span>
                          {invoiceFilter === 'all' && <Icon name="Check" size={11} className="text-accent" />}
                        </button>
                        <button
                          onClick={() => { setInvoiceFilter('uninvoiced'); setStatusFilter('all'); setOpenDropdown(null); }}
                          className="flex items-center justify-between w-full px-4 py-2 hover:bg-slate-50 text-left"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-yellow-500" />
                            Belum Invoice
                          </span>
                          {invoiceFilter === 'uninvoiced' && <Icon name="Check" size={11} className="text-accent" />}
                        </button>
                        <button
                          onClick={() => { setInvoiceFilter('invoiced'); setOpenDropdown(null); }}
                          className="flex items-center justify-between w-full px-4 py-2 hover:bg-slate-50 text-left"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500" />
                            Sudah Invoice
                          </span>
                          {invoiceFilter === 'invoiced' && <Icon name="Check" size={11} className="text-accent" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Period / Date Range Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      if (period.mode === 'range') {
                        setTempRangeFrom(period.rangeFrom || today());
                        setTempRangeTo(period.rangeTo || today());
                      }
                      setOpenDropdown(openDropdown === 'date_range' ? null : 'date_range');
                    }}
                    className="input-field h-9 px-3 text-[11px] font-bold flex items-center gap-2 bg-white border border-border-main rounded-xl shadow-xs"
                  >
                    <Icon name="Calendar" size={12} className="text-text-light opacity-80" />
                    <span>{formatRangeLabel(period)}</span>
                    <Icon name="ChevronDown" size={10} className="text-text-light ml-1" />
                  </button>
                  {openDropdown === 'date_range' && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setOpenDropdown(null)} />
                      <div className="absolute top-10 left-0 z-30 bg-white border border-border-main rounded-xl shadow-lg p-3 min-w-[280px] text-[11px] font-bold text-text-main flex flex-col gap-2.5">
                        <div className="text-[10px] uppercase tracking-widest text-text-light">Pilih Rentang Tanggal</div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-text-light font-medium">Dari Tanggal</label>
                          <input
                            type="date"
                            className="input-field h-9 px-2 text-[11px] tabular-nums w-full"
                            value={tempRangeFrom}
                            onChange={e => setTempRangeFrom(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-text-light font-medium">Sampai Tanggal</label>
                          <input
                            type="date"
                            className="input-field h-9 px-2 text-[11px] tabular-nums w-full"
                            value={tempRangeTo}
                            onChange={e => setTempRangeTo(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2 justify-end mt-1">
                          <button
                            onClick={() => {
                              setPeriod({ mode: 'all', month: new Date().getMonth(), year: new Date().getFullYear() });
                              setOpenDropdown(null);
                            }}
                            className="btn-ghost h-8 px-3 text-[10px]"
                          >
                            Reset
                          </button>
                          <button
                            onClick={() => {
                              setPeriod({ mode: 'range', rangeFrom: tempRangeFrom, rangeTo: tempRangeTo } as any);
                              setOpenDropdown(null);
                            }}
                            className="btn-primary h-8 px-3 text-[10px]"
                          >
                            Terapkan
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            }
            right={
              <div className="flex items-center gap-2">
                {/* Reset button if any filter is active */}
                {(search || statusFilter !== 'all' || invoiceFilter !== 'all' || period.mode !== 'all') && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                      setInvoiceFilter("all");
                      setPeriod({ mode: "all", month: new Date().getMonth(), year: new Date().getFullYear() });
                    }}
                    className="btn-ghost h-9 px-3 text-[12px] flex items-center gap-1.5 text-red-500 hover:bg-red-50 border-red-200"
                  >
                    <Icon name="X" size={13} /> Reset
                  </button>
                )}

                {/* Bulk Actions */}
                {canEdit && selected.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 h-9 bg-slate-50 border border-border-main rounded-xl shrink-0">
                    <span className="text-[9px] font-bold text-text-med italic">{selected.length} Selected</span>
                    <button className="btn-ghost !h-7 !px-2 border-red-brand/20 text-red-brand hover:bg-red-brand-light !text-[10px]" onClick={deleteBulk} disabled={processing}>
                      Hapus
                    </button>
                    <button className="btn-primary !h-7 !px-2.5 !text-[10px]" onClick={approveBulk} disabled={processing}>
                      Posting
                    </button>
                  </div>
                )}

                {/* Export Button */}
                <button
                  onClick={handleExportExcel}
                  className="btn-ghost h-9 px-3 text-[12px] flex items-center gap-1.5 border border-border-main"
                >
                  <Icon name="Download" size={13} /> Export
                </button>
              </div>
            }
          />

          {reloading && <div className="text-center py-2 text-[11px] text-text-light animate-pulse">🔄 Memperbarui data...</div>}
          <div className="table-container max-h-[calc(100vh-380px)]">
            <table className="w-full border-collapse table-fixed">
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
                      className={`w-[125px] cursor-pointer select-none transition-colors ${sortKey === 'order_id' ? '!bg-slate-100 !text-accent' : ''}`}
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
                      className={`w-[115px] cursor-pointer select-none transition-colors ${sortKey === 'tgl_muat' ? '!bg-slate-100 !text-accent' : ''}`}
                      onClick={() => toggleSort('tgl_muat')}
                    >
                      <span className="flex items-center gap-1 pointer-events-none">
                        Tgl Muat
                        {sortKey !== 'tgl_muat' && <ArrowUpDown size={10} className="opacity-30" />}
                        {sortKey === 'tgl_muat' && sortDir === 'asc' && <ArrowUp size={10} className="text-accent" />}
                        {sortKey === 'tgl_muat' && sortDir === 'desc' && <ArrowDown size={10} className="text-accent" />}
                      </span>
                    </th>
                    <th className="w-[160px]">Rute</th>
                    <th className="w-[180px]">Customer</th>
                    <th className="w-[130px]">Unit / Sopir</th>
                    <th className="w-[100px]">Status</th>
                    <th className="w-[110px] text-right">Biaya</th>
                    <th className="w-[150px]">Invoice</th>
                    <th className="w-[80px] text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody key={`${sortKey}-${sortDir}`} className="divide-y divide-border-main/20">
                  {filtered.length === 0 ? <EmptyState colSpan={canEdit ? 10 : 9} /> :
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
                        <td className="tabular-nums text-[11px] font-bold text-text-med italic whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {jurnal.some((j: any) => j.no_so?.includes(s.order_id)) && (
                              <div className="w-1.5 h-1.5 rounded-full bg-green-brand animate-pulse" title="Terhubung Jurnal" />
                            )}
                            {s.tgl_muat}
                          </div>
                        </td>
                        <td className="max-w-[150px]">
                          <div className="text-[12px] font-bold text-text-main truncate group-hover:text-blue-brand transition-colors" title={`Dari ${s.lokasi_muat} ke ${s.lokasi_bongkar}`}>{s.lokasi_muat}</div>
                          <div className="text-[10px] font-medium text-text-light opacity-70 italic truncate" title={`Dari ${s.lokasi_muat} ke ${s.lokasi_bongkar}`}>to {s.lokasi_bongkar}</div>
                        </td>
                        <td className="max-w-[180px]">
                          <div className="text-[12px] font-bold text-text-main group-hover:text-blue-brand transition-colors truncate" title={s.customer}>{s.customer}</div>
                        </td>
                        <td className="max-w-[120px]">
                           <button
                             className="text-[12px] font-black text-accent hover:underline tabular-nums tracking-tight truncate w-full text-left"
                             onClick={(e) => { e.stopPropagation(); onArmadaClick && onArmadaClick(s.no_polisi); }}
                             title={s.no_polisi}
                           >{s.no_polisi}</button>
                           <div className="text-[10px] text-text-light font-medium truncate" title={s.nama_sopir}>{s.nama_sopir}</div>
                           {s.nama_vendor && (
                             <div className="text-[9px] font-black truncate mt-0.5" style={{ color: '#C4914A' }} title={`Expedisi: ${s.nama_vendor}`}>
                               {s.nama_vendor}
                             </div>
                           )}
                        </td>
                        <td>{statusBadge(s.status_muatan)}</td>
                        <td className="text-right tabular-nums">
                          <div className="text-[11px] font-black text-text-main">{fmt(s.total_harga_pajak || s.total_harga || 0)}</div>
                          {Number(s.nilai_pajak) > 0 && (
                            <div className="text-[9px] text-text-light opacity-60 italic">+PPN {fmt(s.nilai_pajak)}</div>
                          )}
                        </td>
                        <td className="max-w-[140px]">
                          {s.no_invoice ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold rounded-lg truncate w-full" title={s.no_invoice}>
                              <Icon name="CheckCircle" size={9} className="shrink-0" /> <span className="truncate">{s.no_invoice}</span>
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
                    <td className="py-3 px-4 text-right text-[11px] font-black text-accent tabular-nums">{fmt(totalBiaya)}</td>
                    <td colSpan={2} className="py-3 px-4 text-center text-[12px] font-black text-accent">{filtered.length} Records</td>
                  </tr>
                </tfoot>
              </table>
            </div>
        </div>
      ) : inputMode === "bulk" && !editItem ? (
        <BulkImportSO
          onComplete={async () => {
            try {
              setReloading(true);
              const data = await api.getSO();
              setSo(data);
              setTab("list");
            } catch (e) {
              console.error(e);
            } finally {
              setReloading(false);
            }
          }}
          onCancel={() => setTab("list")}
          showToast={showToast}
          logAction={logAction}
        />
      ) : (
        <Card className="p-0 overflow-hidden border-border-main/40 shadow-sm animate-fade-left bg-white">
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

        <div className="p-6 space-y-8 overflow-y-auto max-h-[calc(100vh-270px)] no-scrollbar bg-white">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-widest px-1 italic">
               <Icon name="Hash" size={12} className="text-accent" /> Identitas Order
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Order ID</label>
                <input 
                  className="input-field h-9 text-[11px] font-bold" 
                  value={form.order_id || ""} 
                  onChange={e => setForm((f: any) => ({ ...f, order_id: e.target.value }))} 
                  placeholder={form.is_posted ? "Wajib diisi" : "Auto-Generate"}
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Customer <span className="text-red-brand">*</span> & Tanggal</label>
                <div className="flex gap-2">
                  {(() => {
                    const allNames: string[] = [
                      ...customer.map((c: any) => c.nama as string),
                      ...localCustomers.filter((n: string) => !customer.some((c: any) => c.nama === n)),
                    ];
                    const q = customerQuery.toLowerCase().trim();
                    const matches = q ? allNames.filter(n => n.toLowerCase().includes(q)) : allNames;
                    const isNew = customerQuery.trim() && !allNames.some(n => n.toLowerCase() === customerQuery.toLowerCase().trim());
                    const pickCustomer = (name: string) => {
                      setCustomerQuery(name);
                      setCustomerOpen(false);
                      const cDb = (customer || []).find((c: any) => c.nama === name);
                      if (cDb) {
                        setForm((f: any) => ({ ...f, customer: name, pic_cust: cDb.pic || "", no_pic: cDb.no_hp || "" }));
                        setPicQuery(cDb.pic || "");
                      } else {
                        const recent = [...(so || [])].sort((a: any, b: any) => (b.tgl_order || '').localeCompare(a.tgl_order || '')).find((s: any) => s.customer === name && s.pic_cust);
                        setForm((f: any) => ({ ...f, customer: name, pic_cust: recent?.pic_cust || f.pic_cust, no_pic: recent?.no_pic || f.no_pic }));
                        if (recent?.pic_cust) { setPicQuery(recent.pic_cust); }
                      }
                    };
                    const confirmNew = () => {
                      const name = customerQuery.trim();
                      if (!name) return;
                      setLocalCustomers(prev => prev.includes(name) ? prev : [...prev, name]);
                      pickCustomer(name);
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
                              if (matches.length > 0) { pickCustomer(matches[0]); }
                              else confirmNew();
                            }
                          }}
                        />
                        {customerOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border-main rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto">
                            {matches.map((name, i) => (
                              <button key={i} type="button"
                                className="w-full text-left px-3 py-2 text-[11px] font-bold hover:bg-slate-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                                onMouseDown={e => { e.preventDefault(); pickCustomer(name); }}>
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
              {/* PIC Customer — dropdown dari histori SO customer ini */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">PIC Customer <span className="text-red-brand">*</span></label>
                {(() => {
                  const q = picQuery.toLowerCase().trim();
                  const matches = q ? customerPics.filter(p => p.pic.toLowerCase().includes(q)) : customerPics;
                  const isNew = picQuery.trim() && !customerPics.some(p => p.pic.toLowerCase() === picQuery.toLowerCase().trim());
                  return (
                    <div className="relative">
                      <input
                        className="input-field h-9 w-full text-[11px] font-bold"
                        placeholder="Nama PIC / Contact Person..."
                        value={picQuery}
                        onChange={e => { setPicQuery(e.target.value); setForm((f: any) => ({ ...f, pic_cust: e.target.value })); setPicOpen(true); }}
                        onFocus={() => { if (customerPics.length > 0) setPicOpen(true); }}
                        onBlur={() => setTimeout(() => setPicOpen(false), 150)}
                        onKeyDown={e => {
                          if (e.key === 'Escape') setPicOpen(false);
                          if (e.key === 'Enter' && matches.length > 0) {
                            e.preventDefault();
                            const p = matches[0];
                            setPicQuery(p.pic); setForm((f: any) => ({ ...f, pic_cust: p.pic, no_pic: p.no })); setPicOpen(false);
                          }
                        }}
                      />
                      {picOpen && (matches.length > 0 || isNew) && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border-main rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                          {matches.map((p, i) => (
                            <button key={i} type="button"
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                              onMouseDown={e => { e.preventDefault(); setPicQuery(p.pic); setForm((f: any) => ({ ...f, pic_cust: p.pic, no_pic: p.no })); setPicOpen(false); }}>
                              <div className="text-[11px] font-bold text-text-main">{p.pic}</div>
                              {p.no && <div className="text-[10px] text-text-light opacity-70">{p.no}</div>}
                            </button>
                          ))}
                          {isNew && (
                            <button type="button"
                              className="w-full text-left px-3 py-2 text-[11px] font-black text-accent hover:bg-accent/5 transition-colors flex items-center gap-2 border-t border-border-main/30"
                              onMouseDown={e => { e.preventDefault(); setForm((f: any) => ({ ...f, pic_cust: picQuery.trim() })); setPicOpen(false); }}>
                              <Icon name="Plus" size={11} /> Tambah &ldquo;{picQuery.trim()}&rdquo;
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">No. Telepon PIC <span className="text-red-brand">*</span></label>
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
            <div className="flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-widest px-1 italic">
               <Icon name="Truck" size={12} className="text-accent" /> Logistik & Rute
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Row 1: Jenis Truk | No. Polisi */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Jenis Truk <span className="text-red-brand">*</span></label>
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
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">No. Polisi <span className="text-red-brand">*</span></label>
                <input list="armada-list" className="input-field h-9 text-[11px] font-bold" value={form.no_polisi || ""} onChange={e => setForm((f: any) => ({ ...f, no_polisi: e.target.value }))} placeholder="Cari No Polisi..." />
                <datalist id="armada-list">{armada.map((a: any) => <option key={a.id} value={a.no_polisi} />)}</datalist>
              </div>
              {/* Row 2: Nama Sopir | Expedisi */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Nama Sopir</label>
                <input list="sopir-list" className="input-field h-9 text-[11px] font-bold" value={form.nama_sopir || ""} onChange={e => setForm((f: any) => ({ ...f, nama_sopir: e.target.value }))} placeholder="Cari Sopir..." />
                <datalist id="sopir-list">{sopir.map((s: any) => <option key={s.id} value={s.nama} />)}</datalist>
              </div>
              {/* Ekspedisi Pelaksana — dropdown dari histori SO */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Expedisi Pelaksana</label>
                {(() => {
                  const q = vendorQuery.toLowerCase().trim();
                  const matches = q ? vendorOptions.filter(v => v.toLowerCase().includes(q)) : vendorOptions;
                  const isNew = vendorQuery.trim() && !vendorOptions.some(v => v.toLowerCase() === vendorQuery.toLowerCase().trim());
                  return (
                    <div className="relative">
                      <input
                        className="input-field h-9 w-full text-[11px] font-bold"
                        placeholder="Cari atau ketik ekspedisi..."
                        value={vendorQuery}
                        onChange={e => { setVendorQuery(e.target.value); setForm((f: any) => ({ ...f, nama_vendor: e.target.value })); setVendorOpen(true); }}
                        onFocus={() => { if (vendorOptions.length > 0) setVendorOpen(true); }}
                        onBlur={() => setTimeout(() => setVendorOpen(false), 150)}
                        onKeyDown={e => {
                          if (e.key === 'Escape') setVendorOpen(false);
                          if (e.key === 'Enter' && matches.length > 0) {
                            e.preventDefault();
                            setVendorQuery(matches[0]); setForm((f: any) => ({ ...f, nama_vendor: matches[0] })); setVendorOpen(false);
                          }
                        }}
                      />
                      {vendorOpen && (matches.length > 0 || isNew) && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border-main rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                          {matches.map((v, i) => (
                            <button key={i} type="button"
                              className="w-full text-left px-3 py-2 text-[11px] font-bold hover:bg-slate-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                              onMouseDown={e => { e.preventDefault(); setVendorQuery(v); setForm((f: any) => ({ ...f, nama_vendor: v })); setVendorOpen(false); }}>
                              {v}
                            </button>
                          ))}
                          {isNew && (
                            <button type="button"
                              className="w-full text-left px-3 py-2 text-[11px] font-black text-accent hover:bg-accent/5 transition-colors flex items-center gap-2 border-t border-border-main/30"
                              onMouseDown={e => { e.preventDefault(); setForm((f: any) => ({ ...f, nama_vendor: vendorQuery.trim() })); setVendorOpen(false); }}>
                              <Icon name="Plus" size={11} /> Tambah &ldquo;{vendorQuery.trim()}&rdquo;
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              {/* Row 3: Lokasi Muat | Lokasi Tujuan */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Lokasi Muat <span className="text-red-brand">*</span></label>
                <input className="input-field h-9 text-[11px] font-bold" value={form.lokasi_muat || ""} onChange={e => setForm((f: any) => ({ ...f, lokasi_muat: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Lokasi Tujuan <span className="text-red-brand">*</span></label>
                <input className="input-field h-9 text-[11px] font-bold" value={form.lokasi_bongkar || ""} onChange={e => setForm((f: any) => ({ ...f, lokasi_bongkar: e.target.value }))} />
              </div>
              {/* Row 4: Tgl Muat | Tgl Bongkar */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Tgl Muat <span className="text-red-brand">*</span></label>
                <input type="date" className="input-field h-9 text-[11px] font-bold" value={form.tgl_muat || ""} onChange={e => setForm((f: any) => ({ ...f, tgl_muat: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Tgl Bongkar</label>
                <input type="date" className="input-field h-9 text-[11px] font-bold" value={form.tgl_bongkar || ""} onChange={e => setForm((f: any) => ({ ...f, tgl_bongkar: e.target.value }))} />
              </div>
              {/* Row 5: Muatan / Volume | SN */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Muatan / Volume</label>
                <div className="flex gap-2">
                  <input className="input-field h-9 flex-1 text-[11px] font-bold" value={form.muatan || ""} onChange={e => setForm((f: any) => ({ ...f, muatan: e.target.value }))} placeholder="Jenis" />
                  <input className="input-field h-9 w-20 text-[11px] font-bold" value={form.unit_muatan || ""} onChange={e => setForm((f: any) => ({ ...f, unit_muatan: e.target.value }))} placeholder="Unit" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">SN / No. Seri</label>
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
                   <span className="text-2xl font-black text-white tabular-nums tracking-tighter">{fmt(form.total_harga_pajak || form.total_harga || 0)}</span>
                </div>
                <div className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 relative z-10 shadow-sm ${isPajakApply(form.tgl_muat, form.tgl_order) ? "bg-accent text-white" : "bg-white/10 text-white/40"}`}>
                   <Icon name={isPajakApply(form.tgl_muat, form.tgl_order) ? "ShieldCheck" : "ShieldAlert"} size={12} strokeWidth={3} />
                   {isPajakApply(form.tgl_muat, form.tgl_order) ? "Taxable (1,1%)" : "Non-Taxable"}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-widest px-1 italic">
               <Icon name="Paperclip" size={12} className="text-accent" /> Dokumen & Referensi
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Foto Muat & Bongkar */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Foto Muat (GDrive)</label>
                <div className="relative flex gap-1.5">
                  <Icon name="Camera" size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
                  <input className="input-field h-9 pl-9 text-[11px] font-bold flex-1" value={form.foto_muat || ""} onChange={e => setForm((f: any) => ({ ...f, foto_muat: e.target.value }))} placeholder="https://drive.google.com/..." />
                  {form.foto_muat && (
                    <a href={form.foto_muat} target="_blank" rel="noopener noreferrer" className="h-9 w-9 flex items-center justify-center rounded-lg border border-border-main text-text-light hover:text-accent hover:border-accent transition-colors shrink-0">
                      <Icon name="ExternalLink" size={11} />
                    </a>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Foto Bongkar / POD (GDrive)</label>
                <div className="relative flex gap-1.5">
                  <Icon name="Camera" size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
                  <input className="input-field h-9 pl-9 text-[11px] font-bold flex-1" value={form.foto_bongkar || ""} onChange={e => setForm((f: any) => ({ ...f, foto_bongkar: e.target.value }))} placeholder="https://drive.google.com/..." />
                  {form.foto_bongkar && (
                    <a href={form.foto_bongkar} target="_blank" rel="noopener noreferrer" className="h-9 w-9 flex items-center justify-center rounded-lg border border-border-main text-text-light hover:text-accent hover:border-accent transition-colors shrink-0">
                      <Icon name="ExternalLink" size={11} />
                    </a>
                  )}
                </div>
              </div>

              {/* Surat Jalan & SPK */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Surat Jalan (GDrive)</label>
                <div className="relative flex gap-1.5">
                  <Icon name="FileText" size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
                  <input className="input-field h-9 pl-9 text-[11px] font-bold flex-1" value={form.surat_jalan || ""} onChange={e => setForm((f: any) => ({ ...f, surat_jalan: e.target.value }))} placeholder="https://..." />
                  {form.surat_jalan && (
                    <a href={form.surat_jalan} target="_blank" rel="noopener noreferrer" className="h-9 w-9 flex items-center justify-center rounded-lg border border-border-main text-text-light hover:text-accent hover:border-accent transition-colors shrink-0">
                      <Icon name="ExternalLink" size={11} />
                    </a>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">No. SPK</label>
                <input className="input-field h-9 text-[11px] font-bold" value={form.spk || ""} onChange={e => setForm((f: any) => ({ ...f, spk: e.target.value }))} placeholder="Nomor SPK / Work Order..." />
              </div>

              {/* Asuransi */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">No. Asuransi</label>
                <input className="input-field h-9 text-[11px] font-bold" value={form.no_asuransi || ""} onChange={e => setForm((f: any) => ({ ...f, no_asuransi: e.target.value }))} placeholder="Nomor polis asuransi..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Dokumen Asuransi (GDrive)</label>
                <div className="relative flex gap-1.5">
                  <Icon name="Shield" size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
                  <input className="input-field h-9 pl-9 text-[11px] font-bold flex-1" value={form.dokumen_asuransi || ""} onChange={e => setForm((f: any) => ({ ...f, dokumen_asuransi: e.target.value }))} placeholder="https://drive.google.com/..." />
                  {form.dokumen_asuransi && (
                    <a href={form.dokumen_asuransi} target="_blank" rel="noopener noreferrer" className="h-9 w-9 flex items-center justify-center rounded-lg border border-border-main text-text-light hover:text-accent hover:border-accent transition-colors shrink-0">
                      <Icon name="ExternalLink" size={11} />
                    </a>
                  )}
                </div>
              </div>

              {/* Scan Invoice */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Scan Invoice (GDrive)</label>
                <div className="relative flex gap-1.5">
                  <Icon name="FileText" size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
                  <input className="input-field h-9 pl-9 text-[11px] font-bold flex-1" value={form.scan_invoice || ""} onChange={e => setForm((f: any) => ({ ...f, scan_invoice: e.target.value }))} placeholder="https://drive.google.com/..." />
                  {form.scan_invoice && (
                    <a href={form.scan_invoice} target="_blank" rel="noopener noreferrer" className="h-9 w-9 flex items-center justify-center rounded-lg border border-border-main text-text-light hover:text-accent hover:border-accent transition-colors shrink-0">
                      <Icon name="ExternalLink" size={11} />
                    </a>
                  )}
                </div>
              </div>

              {/* Potong Pajak */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Potong Pajak (GDrive)</label>
                <div className="relative flex gap-1.5">
                  <Icon name="Receipt" size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
                  <input className="input-field h-9 pl-9 text-[11px] font-bold flex-1" value={form.potong_pajak || ""} onChange={e => setForm((f: any) => ({ ...f, potong_pajak: e.target.value }))} placeholder="https://drive.google.com/..." />
                  {form.potong_pajak && (
                    <a href={form.potong_pajak} target="_blank" rel="noopener noreferrer" className="h-9 w-9 flex items-center justify-center rounded-lg border border-border-main text-text-light hover:text-accent hover:border-accent transition-colors shrink-0">
                      <Icon name="ExternalLink" size={11} />
                    </a>
                  )}
                </div>
              </div>

              {/* Invoice Vendor */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Invoice Vendor (GDrive)</label>
                <div className="relative flex gap-1.5">
                  <Icon name="Truck" size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
                  <input className="input-field h-9 pl-9 text-[11px] font-bold flex-1" value={form.invoice_vendor || ""} onChange={e => setForm((f: any) => ({ ...f, invoice_vendor: e.target.value }))} placeholder="https://drive.google.com/..." />
                  {form.invoice_vendor && (
                    <a href={form.invoice_vendor} target="_blank" rel="noopener noreferrer" className="h-9 w-9 flex items-center justify-center rounded-lg border border-border-main text-text-light hover:text-accent hover:border-accent transition-colors shrink-0">
                      <Icon name="ExternalLink" size={11} />
                    </a>
                  )}
                </div>
              </div>

              {/* Catatan */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Catatan Internal</label>
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
      </Card>
      )}
    </PageShell>
  );
};
