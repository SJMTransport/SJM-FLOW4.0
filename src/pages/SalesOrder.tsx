import React, { useState, useMemo, useRef, useEffect } from "react";
import Papa from "papaparse";
import { C, STATUS_SO, STATUS_COLOR, STATUS_BG } from "../constants";
import { fmt, fmtShort, filterByPeriod, today } from "@/src/utils";
import { Card, SectionHeader, StatCard, useConfirm, PeriodFilter, Icon, EmptyState, useToast, statusBadge, Stepper, ModalShell, FeedbackButton, PageShell, KPIGrid, ActionBar } from "@/src/components/SJMComponents";
import { CurrencyInput } from "@/src/components/SJMModals";
import { api } from "@/src/api";
import { Loader2 } from "lucide-react";

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
      const s = String(val).replace(/[^0-9.-]/g, "");
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
      logAction(`Import Sales Order Masal: ${previewData.length} baris`, { count: previewData.length });
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
                         <tr key={i} className="hover:bg-slate-50/50 transition-colors">
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

const genSONo = (last: string | undefined) => {
  const yr = new Date().getFullYear().toString().slice(-2);
  if (!last) return `SJM.ID-0.001.${yr}`;
  const m = last.match(/SJM\.ID-0\.(\d+)\./);
  const num = m ? parseInt(m[1]) + 1 : 1;
  return `SJM.ID-0.${String(num).padStart(3, "0")}.${yr}`;
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
  
  const emptyForm = {
    order_id: "", no_invoice: "", kode_invoice: "", laporan_keuangan: "",
    tgl_order: today(), tgl_muat: today(), jam_muat: "08:00",
    lokasi_muat: "", lokasi_bongkar: "", status_muatan: "Order Confirmed",
    customer: "", pic_cust: "", no_pic: "",
    no_polisi: "", nama_sopir: "", nama_vendor: "", muatan: "", unit_muatan: "",
    harga_asuransi: "", pajak: "", nilai_pajak: "",
    harga_pengiriman: "", total_harga: 0, total_harga_pajak: 0,
    is_posted: false, bukti_muatan: "", surat_jalan: "", keterangan: "",
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
    // Pajak 1,1% hanya berlaku mulai Feb 2026
    const pajakApply = isPajakApply(f.tgl_order);
    const tax = pajakApply ? Math.round((pengiriman + ins) * 0.011) : 0;
    const totalPajak = total + tax;
    return { total_harga: total, total_harga_pajak: totalPajak, nilai_pajak: tax };
  };

  const handleNumChange = (k: string, v: any) => {
    const updated = { ...form, [k]: v };
    const { total_harga, total_harga_pajak, nilai_pajak } = calcTotal(updated);
    setForm({ ...updated, total_harga, total_harga_pajak, nilai_pajak });
  };

  const [selected, setSelected] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  
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

  const openNew = () => {
    setForm(emptyForm);
    setEditItem(null); setErr(""); setTab("form");
  };

  const openDuplicate = (s: any) => {
    const { id: _id, order_id: _oid, created_at: _ca, is_posted: _ip, ...rest } = s;
    setForm({ ...rest, order_id: "", is_posted: false, tgl_order: today(), tgl_muat: today() });
    setEditItem(null); setErr(""); setTab("form");
    showToast("Data disalin (Order ID dikosongkan untuk pendaftaran baru)", "info");
  };

  const openEdit = (s: any) => {
      setEditItem(s);
      setForm(s);
      setErr("");
      setTab("form");
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
          logAction(`Hapus Sales Order: ${item?.order_id || id}`, { id });
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
        const last = await api.getLastSONo();
        finalOrderId = genSONo(last[0]?.order_id);
      }

      const payload = { ...form, order_id: finalOrderId, is_posted: posted };
      if (editItem) {
        await api.updateSO(editItem.id, payload);
        setSo((s: any[]) => s.map(x => x.id === editItem.id ? { ...x, ...payload } : x));
        logAction(`Update Sales Order: ${payload.order_id}`, { id: editItem.id });
      } else {
        const res = await api.addSO(payload);
        setSo((s: any[]) => [res[0], ...s]);
        logAction(`Create Sales Order: ${payload.order_id}`, { id: res[0].id });
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
    return filterByPeriod(so, period, "tgl_muat").filter((s: any) =>
      !search ||
      s.order_id?.toLowerCase().includes(search.toLowerCase()) ||
      s.customer?.toLowerCase().includes(search.toLowerCase())
    ).sort((a: any, b: any) => (b.order_id || "").localeCompare(a.order_id || ""));
  }, [so, period, search]);

  const statusCount: any = { "Order Confirmed": 0, Loading: 0, "On Going": 0, Arrived: 0, Completed: 0, Cancelled: 0 };
  filtered.forEach((x: any) => { if (statusCount[x.status_muatan] !== undefined) statusCount[x.status_muatan]++; });

  return (
    <PageShell>
      <ConfirmModalUI />
      <ToastUI />
      <SectionHeader title="Sales Order" sub={`${so.length} SO tersimpan`}
        action={canEdit && <button className="btn-primary" onClick={openNew}><Icon name="Plus" size={16} /> SO Baru</button>} />

      <div className="flex gap-2 border-b border-border-main mb-3 overflow-x-auto pb-px">
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
                <button className="btn-ghost !h-8 !px-3 border-red-brand/20 text-red-brand hover:bg-red-brand-light" onClick={deleteBulk} disabled={processing}>
                  <Icon name="Trash2" size={12} /> Hapus
                </button>
                <button className="btn-primary !h-8 !px-3" onClick={approveBulk} disabled={processing}>
                  <Icon name="Send" size={12} /> Posting
                </button>
              </div>
            )}
          />

          <KPIGrid cols={3}>
            <StatCard label="Total SO" value={filtered.length} color="var(--color-accent)" icon="Package" />
            <StatCard label="Completed" value={statusCount.Completed || 0} color="var(--color-green-brand)" icon="CheckCircle" />
            <StatCard label="Cancelled" value={statusCount.Cancelled || 0} color="var(--color-red-brand)" icon="XCircle" />
          </KPIGrid>

          <div className="table-container max-h-[calc(100vh-340px)]">
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
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Tgl Muat</th>
                    <th className="py-3 px-4">Rute</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Unit / Sopir</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main/20">
                  {filtered.length === 0 ? <EmptyState colSpan={8} /> : 
                    filtered.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors group" onClick={(e) => {
                        if ((e.target as HTMLElement).tagName === "BUTTON" || (e.target as HTMLElement).tagName === "INPUT") return;
                        onSOClick && onSOClick(s.order_id);
                      }}>
                        {canEdit && (
                          <td className="py-3 px-4">
                            <input 
                              type="checkbox" 
                              className="w-3.5 h-3.5 rounded border-border-main text-accent focus:ring-accent"
                              checked={selected.includes(s.id)} 
                              onChange={(e) => toggleSelect(s.id, e as any)} 
                            />
                          </td>
                        )}
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4 tabular-nums text-[11px] font-bold text-text-med italic">
                          <div className="flex items-center gap-2">
                            {jurnal.some((j: any) => j.no_so?.includes(s.order_id)) && (
                              <div className="w-1.5 h-1.5 rounded-full bg-green-brand animate-pulse" title="Terhubung Jurnal" />
                            )}
                            {s.tgl_muat}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-[200px]">
                          <div className="text-[12px] font-bold text-text-main truncate group-hover:text-blue-brand transition-colors" title={s.lokasi_muat}>{s.lokasi_muat}</div>
                          <div className="text-[10px] font-medium text-text-light opacity-70 italic truncate" title={s.lokasi_bongkar}>to {s.lokasi_bongkar}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-[12px] font-bold text-text-main group-hover:text-blue-brand transition-colors">{s.customer}</div>
                          <div className={`badge text-[8px] mt-1 ${s.is_posted ? "bg-green-brand-light text-green-brand" : "bg-slate-100 text-slate-500"}`}>
                            {s.is_posted ? "Posted" : "Draft"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                           <button
                             className="text-[12px] font-black text-accent hover:underline tabular-nums tracking-tight"
                             onClick={(e) => { e.stopPropagation(); onArmadaClick && onArmadaClick(s.no_polisi); }}
                           >{s.no_polisi}</button>
                           <div className="text-[10px] text-text-light font-medium">{s.nama_sopir}</div>
                        </td>
                        <td className="py-3 px-4">{statusBadge(s.status_muatan)}</td>
                        <td className="py-3 px-4">
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
                    <td colSpan={canEdit ? 6 : 5} className="py-3 px-4 text-right italic text-[9px] opacity-60 uppercase tracking-widest">Total Muatan Terfilter</td>
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
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Customer & Tanggal</label>
                <div className="flex gap-2">
                  <select className="input-field h-9 flex-1 text-[11px] font-bold" value={form.customer || ""} onChange={e => setForm((f: any) => ({ ...f, customer: e.target.value }))}>
                    <option value="">Pilih Customer</option>
                    {customer.map((c: any) => <option key={c.id} value={c.nama}>{c.nama}</option>)}
                  </select>
                  <input type="date" className="input-field h-9 w-36 text-[11px] font-bold" value={form.tgl_order || ""} onChange={e => setForm((f: any) => ({ ...f, tgl_order: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-light px-1 opacity-60 italic">
               <Icon name="Truck" size={12} className="text-accent" /> Logistik & Rute
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Unit Armada</label>
                <input list="armada-list" className="input-field h-9 text-[11px] font-bold" value={form.no_polisi || ""} onChange={e => setForm((f: any) => ({ ...f, no_polisi: e.target.value }))} placeholder="Cari No Polisi..." />
                <datalist id="armada-list">{armada.map((a: any) => <option key={a.id} value={a.no_polisi} />)}</datalist>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Nama Sopir</label>
                <input list="sopir-list" className="input-field h-9 text-[11px] font-bold" value={form.nama_sopir || ""} onChange={e => setForm((f: any) => ({ ...f, nama_sopir: e.target.value }))} placeholder="Cari Sopir..." />
                <datalist id="sopir-list">{sopir.map((s: any) => <option key={s.id} value={s.nama} />)}</datalist>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Expedisi Pelaksana</label>
                <input className="input-field h-9 text-[11px] font-bold" value={form.nama_vendor || ""} onChange={e => setForm((f: any) => ({ ...f, nama_vendor: e.target.value }))} placeholder="..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Muatan / Volume</label>
                <div className="flex gap-2">
                  <input className="input-field h-9 flex-1 text-[11px] font-bold" value={form.muatan || ""} onChange={e => setForm((f: any) => ({ ...f, muatan: e.target.value }))} placeholder="Jenis" />
                  <input className="input-field h-9 w-20 text-[11px] font-bold" value={form.unit_muatan || ""} onChange={e => setForm((f: any) => ({ ...f, unit_muatan: e.target.value }))} placeholder="20" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Titik Muat</label>
                <input className="input-field h-9 text-[11px] font-bold" value={form.lokasi_muat || ""} onChange={e => setForm((f: any) => ({ ...f, lokasi_muat: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Titik Bongkar</label>
                <input className="input-field h-9 text-[11px] font-bold" value={form.lokasi_bongkar || ""} onChange={e => setForm((f: any) => ({ ...f, lokasi_bongkar: e.target.value }))} />
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
                <label className="text-[11px] font-black text-text-main px-1 uppercase tracking-tight">Harga Pengiriman</label>
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
                   {isPajakApply(form.tgl_order) ? "Taxable (1.1%)" : "Non-Taxable"}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
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
    </PageShell>
  );
};
