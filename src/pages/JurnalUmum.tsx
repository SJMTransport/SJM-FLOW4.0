import React, { useState, useMemo } from "react";
import { C, STATUS_SO } from "../constants";
import { fmt, genJUNo, today } from "@/src/utils";
import { Card, SectionHeader, Spinner, EmptyState, useConfirm, PeriodFilter, Icon, useToast, ModalShell, FeedbackButton, PageShell, ActionBar } from "@/src/components/SJMComponents";
import { CurrencyInput } from "@/src/components/SJMModals";
import { api, supabase } from "@/src/api";
import { Loader2 } from "lucide-react";
import { buildMeta } from "@/src/lib/activityLogger";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const filterByPeriod = (items: any[], period: any) => {
  if (period.mode === "all") return items;
  return items.filter(j => {
    const dateStr = (j.tanggal || "").slice(0, 10);
    if (!dateStr) return true;
    if (period.mode === "day") return dateStr === (period.day || "");
    if (period.mode === "month") {
      const d = new Date(j.tanggal);
      return d.getMonth() === period.month && d.getFullYear() === period.year;
    }
    if (period.mode === "year") return new Date(j.tanggal).getFullYear() === period.year;
    if (period.mode === "range") {
      if (period.rangeFrom && dateStr < period.rangeFrom) return false;
      if (period.rangeTo && dateStr > period.rangeTo) return false;
      return true;
    }
    return true;
  });
};

export const JurnalUmum = ({ jurnal, setJurnal, coa, so, connected, currentUser, prefill, onPrefillUsed, onSOClick, onJurnalClick, logAction }: any) => {
  const { confirm: askConfirmJurnal, Modal: ConfirmJurnalModal } = useConfirm();
  const { showToast, ToastUI } = useToast();
  const [tab, setTab] = useState("list");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState({ mode: "month", month: new Date().getMonth(), year: new Date().getFullYear() });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [err, setErr] = useState("");
  const [editJurnalId, setEditJurnalId] = useState<string | null>(null);
  const [editJurnalSnap, setEditJurnalSnap] = useState<any>(null);
  const [form, setForm] = useState<any>({ tanggal: today(), noJurnal: "", noBukti: "", keterangan: "", noSO: [], soValues: {}, entries: [{ coa: "", akun: "", debit: "", kredit: "", no_so: "" }, { coa: "", akun: "", debit: "", kredit: "", no_so: "" }] });

  React.useEffect(() => {
    if (prefill) {
      setTab("input");
      setForm((f: any) => ({
        ...f,
        noSO: prefill.noSO ? (Array.isArray(prefill.noSO) ? prefill.noSO : [prefill.noSO]) : f.noSO,
        noBukti: prefill.noBukti || f.noBukti,
        keterangan: prefill.keterangan || f.keterangan,
      }));
      if (onPrefillUsed) onPrefillUsed();
    }
  }, [prefill]);

  const filtered = useMemo(() => {
    return filterByPeriod(jurnal, period).filter((j: any) =>
      j.keterangan?.toLowerCase().includes(search.toLowerCase()) ||
      j.no_jurnal?.toLowerCase().includes(search.toLowerCase()) ||
      (j.no_so || "").toLowerCase().includes(search.toLowerCase())
    ).sort((a: any, b: any) => (b.no_jurnal || "").localeCompare(a.no_jurnal || ""));
  }, [jurnal, period, search]);

  const totalD = form.entries.reduce((s: number, e: any) => s + (parseFloat(e.debit) || 0), 0);
  const totalK = form.entries.reduce((s: number, e: any) => s + (parseFloat(e.kredit) || 0), 0);
  const balanced = Math.abs(Math.round(totalD) - Math.round(totalK)) === 0 && totalD > 0;

  const updateEntry = (i: number, field: string, val: any) => {
    const entries = [...form.entries];
    if (field === "coa") {
      const found = coa.find((c: any) => c.kode === val);
      entries[i] = { ...entries[i], coa: val, akun: found ? found.nama : "" };
    } else {
      entries[i] = { ...entries[i], [field]: val };
    }
    setForm((f: any) => ({ ...f, entries }));
  };

  const handleDelete = async (id: string, no: string) => {
    const beforeSnap = (jurnal || []).find((j: any) => j.id === id);
    askConfirmJurnal({
        title: "Hapus Jurnal",
        msg: `Apakah Anda yakin ingin menghapus jurnal ${no}? Ini akan menghapus transaksi dan detailnya secara permanen.`,
        onConfirm: async () => {
            try {
                await supabase.from("jurnal_detail").delete().eq("jurnal_id", id);
                await api.deleteJurnal(id);
                showToast("Jurnal berhasil dihapus");
                logAction(`Hapus Jurnal Umum: ${no}`, buildMeta({
                  module: 'jurnal', action_type: 'DELETE', record_id: no,
                  before_data: beforeSnap ? { no_jurnal: beforeSnap.no_jurnal, tanggal: beforeSnap.tanggal, keterangan: beforeSnap.keterangan, total_debit: beforeSnap.total_debit } : { id },
                }));
                const updated = await api.getJurnal();
                setJurnal(updated);
            } catch (e: any) { alert("Gagal hapus: " + e.message); }
        }
    });
  };

  const openEdit = (j: any) => {
      setEditJurnalId(j.id);
      setEditJurnalSnap({ no_jurnal: j.no_jurnal, tanggal: j.tanggal, keterangan: j.keterangan, total_debit: j.total_debit, entries: j.jurnal_detail?.length });
      setForm({
          tanggal: j.tanggal,
          noJurnal: j.no_jurnal,
          noBukti: j.no_bukti,
          keterangan: j.keterangan,
          noSO: j.no_so ? (j.no_so as string).split(",").map(s => s.trim()) : [],
          soValues: j.so_values || {},
          entries: (j.jurnal_detail || []).map((d: any) => ({
              coa: d.coa_kode,
              akun: d.nama_akun,
              debit: d.debit,
              kredit: d.kredit,
              no_so: d.no_so
          }))
      });
      setTab("input");
      setErr("");
  };

  const moveRow = (i: number, dir: "up" | "down") => {
      const entries = [...form.entries];
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= entries.length) return;
      [entries[i], entries[j]] = [entries[j], entries[i]];
      setForm((f: any) => ({ ...f, entries }));
  };

  const submit = async () => {
    setErr("");
    if (!form.tanggal) return setErr("Tanggal wajib diisi");
    if (!form.keterangan.trim()) return setErr("Keterangan wajib diisi");
    if (form.entries.length < 2) return setErr("Minimal harus ada 2 baris transaksi");
    for (let e of form.entries) if (!e.coa) return setErr("Semua akun harus dipilih");
    if (!balanced) return setErr("Total debit & kredit harus seimbang");

    setSaving(true);
    setSaveError(false);
    setSaveSuccess(false);
    try {
      const t = form.tanggal;
      const nj = form.noJurnal || genJUNo(t, jurnal);
      
      // Derive SO list: header-level noSO takes precedence, supplemented by per-entry no_so
      const entrySOList = [...new Set(form.entries.map((e: any) => e.no_so).filter(Boolean))];
      const headerSOList = (form.noSO || []).filter(Boolean);
      const allSOList = [...new Set([...headerSOList, ...entrySOList])];
      const allSO = allSOList.join(", ");

      const jurnalData = {
        no_jurnal: nj, tanggal: t, no_bukti: form.noBukti, keterangan: form.keterangan,
        no_so: allSO,
        // Preserve so_values when multiple SOs present in header — prevents JSONB data loss on re-save
        so_values: allSOList.length > 1 ? (form.soValues || {}) : {},
        total_debit: totalD, total_kredit: totalK, status: "Pending",
        created_by: currentUser?.nama || "—"
      };
      let jurnalId;
      if (editJurnalId) {
        await api.updateJurnal(editJurnalId, jurnalData);
        await supabase.from("jurnal_detail").delete().eq("jurnal_id", editJurnalId);
        jurnalId = editJurnalId;
      } else {
        const res = await api.addJurnal(jurnalData);
        jurnalId = res[0].id;
      }
      await api.addJurnalDetail(form.entries.map((e: any) => ({
        jurnal_id: jurnalId, coa_kode: e.coa, nama_akun: e.akun,
        debit: parseFloat(e.debit) || 0, kredit: parseFloat(e.kredit) || 0,
        no_so: e.no_so || null
      })));
      const updated = await api.getJurnal();
      setJurnal(updated);
      const afterSnap = { no_jurnal: nj, tanggal: t, keterangan: form.keterangan, total_debit: totalD, entries: form.entries.length };
      logAction(editJurnalId ? `Update Jurnal Umum: ${nj}` : `Buat Jurnal Umum: ${nj}`, buildMeta({
        module: 'jurnal',
        action_type: editJurnalId ? 'UPDATE' : 'CREATE',
        record_id: nj,
        before_data: editJurnalId ? editJurnalSnap : null,
        after_data: afterSnap,
      }));
      setSaveSuccess(true);
      setTimeout(() => {
        setTab("list"); setEditJurnalId(null); setEditJurnalSnap(null);
        setSaveSuccess(false);
      }, 1000);
      showToast("Jurnal berhasil disimpan!");
    } catch (e: any) { 
        setErr("Gagal simpan: " + e.message); 
        setSaveError(true);
        setTimeout(() => setSaveError(false), 2000);
    }
    setSaving(false);
  };

  const [syncing, setSyncing] = useState(false);

  const syncSO = async () => {
    setSyncing(true);
    try {
      const orderIds = so.map((s: any) => s.order_id).filter((id: string) => id && id.length > 3);
      let linked = 0;
      // Filter journals that have missing NO SO but potentially have it in description
      const toLink = jurnal.filter((j: any) => !j.no_so || j.no_so.trim() === "");
      
      for (const j of toLink) {
          const desc = (j.keterangan || "").toUpperCase();
          const foundIds = orderIds.filter((id: string) => desc.includes(id.toUpperCase()));
          if (foundIds.length > 0) {
              const noSO = [...new Set(foundIds)].join(", ");
              await api.updateJurnal(j.id, { no_so: noSO });
              linked++;
          }
      }
      
      if (linked > 0) {
          showToast(`${linked} jurnal berhasil dihubungkan kembali dengan SO.`);
          logAction(`Sinkronisasi Jurnal ke SO: ${linked} jurnal dihubungkan`, buildMeta({ module: 'jurnal', action_type: 'SYNC', after_data: { linked_count: linked } }));
          const updated = await api.getJurnal();
          setJurnal(updated);
      } else {
          showToast("Tidak ada jurnal baru yang cocok dengan data SO.", "info");
      }
    } catch (e: any) {
      alert("Gagal sinkronisasi: " + e.message);
    }
    setSyncing(false);
  };

  const grandD = filtered.reduce((s: number, j: any) => s + Number(j.total_debit || 0), 0);
  const grandK = filtered.reduce((s: number, j: any) => s + Number(j.total_kredit || 0), 0);

  const getPeriodText = () => {
    if (period.mode === "day") return `Tanggal ${period.day || ""}`;
    if (period.mode === "year") return `Tahun ${period.year}`;
    return `Bulan ${["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][period.month]} ${period.year}`;
  };

  const exportExcel = () => {
    try {
      const data = filtered.flatMap((j: any) => 
        (j.jurnal_detail || []).map((e: any) => ({
          "Tanggal": j.tanggal || "—",
          "No Jurnal": j.no_jurnal || "—",
          "No SO": j.no_so || "—",
          "Keterangan": j.keterangan || "—",
          "Kode Akun": e.coa_kode || "—",
          "Nama Akun": e.nama_akun || "—",
          "Debit": Number(e.debit || 0),
          "Kredit": Number(e.kredit || 0)
        }))
      );

      if (data.length === 0) {
        showToast("Tidak ada data untuk di-export", "info");
        return;
      }

      const periodText = getPeriodText();
      const ws = XLSX.utils.json_to_sheet([]);
      // Add custom header
      XLSX.utils.sheet_add_aoa(ws, [
        [`Laporan Jurnal Umum PT Sugiarto Jaya Mandiri`],
        [`Periode ${periodText}`],
        []
      ]);
      XLSX.utils.sheet_add_json(ws, data, { origin: "A4" });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Jurnal");
      
      const fileName = `Jurnal_Umum_${period.mode === 'day' ? period.day : period.mode === 'month' ? `${period.year}-${period.month + 1}` : period.year}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast("Download Excel dimulai...");
    } catch (err: any) {
      console.error("Export XLS Error:", err);
      showToast("Gagal export Excel: " + err.message, "error");
    }
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const periodText = getPeriodText();

      doc.setFontSize(14);
      doc.text("Laporan Jurnal Umum PT Sugiarto Jaya Mandiri", 14, 15);
      doc.setFontSize(10);
      doc.text(`Periode ${periodText}`, 14, 22);
      
      const data = filtered.flatMap((j: any) => 
        (j.jurnal_detail || []).map((e: any, i: number) => [
          i === 0 ? j.tanggal : "",
          i === 0 ? j.no_jurnal : "",
          i === 0 ? (j.no_so || "—") : "",
          e.coa_kode + " - " + e.nama_akun,
          Number(e.debit || 0) > 0 ? fmt(e.debit) : "",
          Number(e.kredit || 0) > 0 ? fmt(e.kredit) : ""
        ])
      );

      if (data.length === 0) {
        showToast("Tidak ada data untuk di-export", "info");
        return;
      }

      autoTable(doc, {
        head: [["TANGGAL", "NO JURNAL", "NO SO", "AKUN", "DEBIT", "KREDIT"]],
        body: data,
        startY: 30,
        margin: { left: 10, right: 10, top: 10, bottom: 10 },
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] },
        bodyStyles: { lineWidth: 0.1, lineColor: [241, 245, 249] },
        columnStyles: {
            4: { halign: 'right' },
            5: { halign: 'right' }
        }
      });
      
      const fileName = `Jurnal_Umum_${period.mode === 'day' ? period.day : period.mode === 'month' ? `${period.year}-${period.month + 1}` : period.year}.pdf`;
      doc.save(fileName);
      showToast("Download PDF dimulai...");
    } catch (err: any) {
      console.error("Export PDF Error:", err);
      showToast("Gagal export PDF: " + err.message, "error");
    }
  };

  return (
    <PageShell>
      <ConfirmJurnalModal />
      <ToastUI />
      <SectionHeader title={`Jurnal Umum`} sub={`${filtered.length} Transaksi terfilter`}
        action={
          <div className="flex flex-wrap gap-2">
            <div className="flex bg-white shadow-sm border border-border-main rounded-lg overflow-hidden">
               <button className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-green-brand hover:bg-slate-50 border-r border-border-main transition-colors" onClick={exportExcel} title="Export Excel">
                  <Icon name="Download" size={14} /> XLS
               </button>
               <button className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-red-brand hover:bg-slate-50 transition-colors" onClick={exportPDF} title="Export PDF">
                  <Icon name="FileText" size={14} /> PDF
               </button>
            </div>
            <button 
              className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest" 
              onClick={syncSO} 
              disabled={syncing}
            >
              <Icon name="RefreshCw" size={12} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Linking..." : "Hubungkan SO"}
            </button>
          </div>
        } />

      <div className="tab-bar">
        {[["list", "Daftar Jurnal"], ["input", "Input Jurnal"]].map(([k, l]) => (
          <button 
            key={k} 
            className={`tab-btn ${tab === k ? "active" : ""}`} 
            onClick={() => {
              if (k === "input" && !editJurnalId) {
                setForm({ tanggal: today(), noJurnal: "", noBukti: "", keterangan: "", noSO: [], entries: [{ coa: "", akun: "", debit: "", kredit: "", no_so: "" }, { coa: "", akun: "", debit: "", kredit: "", no_so: "" }] });
              }
              setTab(k);
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === "list" ? (
        <div className="animate-fade-up">
          <ActionBar left={<PeriodFilter period={period} setPeriod={setPeriod} search={search} setSearch={setSearch} />} />
          
          <div className="table-container">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-border-main/40">
                  <th className="py-2 px-4 !static">Tanggal</th>
                  <th className="py-2 px-4 !static">No Jurnal</th>
                  <th className="py-2 px-4 !static">No SO</th>
                  <th className="py-2 px-4 !static">Keterangan / Akun</th>
                  <th className="py-2 px-4 !static text-right min-w-[160px]">Debit</th>
                  <th className="py-2 px-4 !static text-right min-w-[160px]">Kredit</th>
                  <th className="py-2 px-4 !static text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main/10 bg-white/40">
                  {filtered.length === 0 ? <EmptyState colSpan={7} msg="Belum ada jurnal" /> :
                    filtered.flatMap((j: any) => {
                      const details = j.jurnal_detail || [];
                      return details.map((e: any, ei: number) => (
          <tr key={`${j.id}-${ei}`} className="hover:bg-slate-50/50 transition-colors group border-b border-border-main/5">
            {ei === 0 && <>
              <td rowSpan={details.length} className="py-1.5 px-4 text-[10px] font-bold text-text-light align-top tabular-nums italic border-r border-border-main/5">{j.tanggal}</td>
              <td rowSpan={details.length} className="py-1.5 px-4 align-top border-r border-border-main/5">
                <div className="flex items-center gap-2">
                  <button onClick={() => onJurnalClick && onJurnalClick(j.no_jurnal)} className="text-[11px] font-black text-accent hover:underline tracking-tight">{j.no_jurnal}</button>
                  {Math.abs(Number(j.total_debit) - Number(j.total_kredit)) > 0.01 && <Icon name="AlertTriangle" size={12} className="text-red-brand animate-pulse" title="Jurnal tidak seimbang!" />}
                </div>
              </td>
              <td rowSpan={details.length} className="py-1.5 px-4 align-top space-y-1 border-r border-border-main/5">
                  {j.no_so ? (j.no_so as string).split(",").map(s => (
                      <span key={s} className="text-[9px] font-black text-blue-brand bg-blue-brand/5 px-1.5 py-0.5 rounded-sm hover:bg-blue-brand/10 cursor-pointer block w-fit italic truncate max-w-[80px]" onClick={() => onSOClick && onSOClick(s.trim())}>{s.trim()}</span>
                  )) : <span className="text-[9px] font-bold text-text-light opacity-20 italic">None</span>}
              </td>
            </>}
            <td className={`py-1.5 px-4 max-w-[260px] ${ei === details.length - 1 ? "pb-2" : ""}`} style={{ paddingLeft: Number(e.kredit) > 0 ? 32 : 16 }}>
              {ei === 0 && <div className="text-[9px] font-bold text-text-light mb-1 opacity-50 leading-tight italic truncate uppercase tracking-tight">{j.keterangan}</div>}
              <div className="flex items-center gap-2">
                 <span className={`text-[11px] ${Number(e.debit) > 0 ? "font-bold text-text-main" : "text-text-med font-medium opacity-80 italic"}`}>
                   {e.coa_kode} <span className="opacity-20 mx-1">·</span> {e.nama_akun}
                 </span>
              </div>
            </td>
            <td className={`py-1.5 px-4 tabular-nums text-right text-[11px] font-bold whitespace-nowrap ${Number(e.debit) > 0 ? "text-green-brand" : "text-transparent"}`}>{Number(e.debit) > 0 ? fmt(e.debit) : "—"}</td>
            <td className={`py-1.5 px-4 tabular-nums text-right text-[11px] font-bold whitespace-nowrap ${Number(e.kredit) > 0 ? "text-red-brand" : "text-transparent"}`}>{Number(e.kredit) > 0 ? fmt(e.kredit) : "—"}</td>
            {ei === 0 && (
               <td rowSpan={details.length} className="py-1.5 px-4 align-top text-center border-l border-border-main/5">
                  <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <button className="p-1 px-1.5 rounded-md hover:bg-slate-100 text-text-med transition-colors" onClick={() => openEdit(j)} title="Edit">
                        <Icon name="Edit3" size={13} />
                     </button>
                     <button className="p-1 px-1.5 rounded-md hover:bg-red-brand/10 text-red-brand transition-colors" onClick={() => handleDelete(j.id, j.no_jurnal)} title="Hapus">
                        <Icon name="Trash2" size={13} />
                     </button>
                  </div>
               </td>
            )}
          </tr>
                      ));
                    })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 text-text-main font-black border-t-2 border-border-main">
                    <td colSpan={4} className="py-3 px-4 text-right italic text-[9px] opacity-60 uppercase tracking-widest">Total Periode</td>
                    <td className="py-3 px-4 text-right tabular-nums text-green-brand text-[12px] whitespace-nowrap">{fmt(grandD)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-red-brand text-[12px] whitespace-nowrap">{fmt(grandK)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
      ) : (
        <Card className="p-0 overflow-hidden border-border-main/60 shadow-xl animate-fade-left bg-white">
          <div className="p-4 border-b border-border-main flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center shadow-lg shadow-accent/20">
                      <Icon name={editJurnalId ? "Edit" : "Plus"} size={18} />
                  </div>
                  <div>
                     <h3 className="text-sm font-black tracking-tight leading-none text-abyssal-blue uppercase">{editJurnalId ? "Perbarui Entri Jurnal" : "Input Jurnal Baru"}</h3>
                     <p className="text-[9px] font-bold text-text-light mt-1 opacity-60 italic uppercase tracking-wider">Pencatatan transaksi keuangan manual</p>
                  </div>
              </div>
              <button className="p-2 rounded-full hover:bg-slate-100 transition-colors" onClick={() => { setTab("list"); setEditJurnalId(null); }}>
                  <Icon name="X" size={20} className="text-text-main" />
              </button>
          </div>

          <div className="p-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-light px-1 opacity-60 uppercase tracking-widest">Tanggal Transaksi</label>
                  <input type="date" className="input-field h-10 text-[11px] font-bold bg-slate-50 border-transparent focus:bg-white focus:border-accent" value={form.tanggal || ""} onChange={e => setForm((f: any) => ({ ...f, tanggal: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-light px-1 opacity-60 uppercase tracking-widest">Nomor Jurnal</label>
                    <input className="input-field h-10 text-[11px] font-bold bg-slate-50 border-transparent focus:bg-white focus:border-accent" placeholder="Otomatis" value={form.noJurnal || ""} onChange={e => setForm((f: any) => ({ ...f, noJurnal: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-light px-1 opacity-60 uppercase tracking-widest">Referensi Bukti</label>
                    <input className="input-field h-10 text-[11px] font-bold bg-slate-50 border-transparent focus:bg-white focus:border-accent" placeholder="No. Invoice / Kwitansi" value={form.noBukti || ""} onChange={e => setForm((f: any) => ({ ...f, noBukti: e.target.value }))} />
                </div>
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-[10px] font-black text-text-light px-1 opacity-60 uppercase tracking-widest">Keterangan Utama</label>
                  <textarea 
                    className="input-field h-14 pt-2 text-[12px] resize-none font-bold bg-slate-50 border-transparent focus:bg-white focus:border-accent" 
                    placeholder="Contoh: Pembayaran muatan armada ke rek supplier..." 
                    value={form.keterangan || ""} 
                    onChange={e => setForm((f: any) => ({ ...f, keterangan: e.target.value }))} 
                  />
                </div>
              </div>

              {(() => {
                const uniqueSO = [...new Set(form.entries.map((e: any) => e.no_so).filter(Boolean))];
                if (uniqueSO.length <= 1) return null;
                return (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-border-main/50 space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-navy uppercase tracking-widest px-1 italic">
                       <Icon name="PieChart" size={13} className="text-accent" /> Distribusi Nilai per SO
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {uniqueSO.map((oid: any) => (
                        <div key={oid} className="space-y-1.5">
                          <label className="text-[10px] font-bold text-text-light px-1 opacity-60">{oid}</label>
                          <CurrencyInput 
                            value={form.soValues?.[oid] || ""} 
                            placeholder="Nilai SO ini"
                            onChange={(v: any) => setForm((f: any) => ({ ...f, soValues: { ...(f.soValues||{}), [oid]: v } }))}
                            className="h-9 text-[11px] font-bold bg-white"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="text-[9px] font-bold text-text-light italic opacity-60 px-1">
                      ℹ Isi nilai pendapatan/tagihan masing-masing SO untuk perhitungan margin profit yang akurat.
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-4">
                 <div className="flex items-center gap-2 text-[10px] font-black text-text-light px-1 opacity-60 mb-2 italic uppercase tracking-widest">
                    <Icon name="List" size={12} className="text-accent" /> Rincian Transaksi
                 </div>

                <div className="space-y-2">
                  {form.entries.map((e: any, i: number) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start bg-slate-50/30 p-3 rounded-xl border border-border-main/20 group hover:border-accent/40 hover:bg-white transition-all shadow-sm hover:shadow-md">
                      <div className="md:col-span-5 space-y-1">
                        <select className="input-field h-10 text-[11px] font-black uppercase" value={e.coa || ""} onChange={ev => updateEntry(i, "coa", ev.target.value)}>
                            <option value="">Pilih Akun</option>
                            {coa.map((c: any) => <option key={c.kode} value={c.kode}>{c.kode} · {c.nama}</option>)}
                        </select>
                        {e.akun && <div className="text-[9px] font-black text-accent px-2 uppercase tracking-widest opacity-80 italic">{e.akun}</div>}
                      </div>
                      <div className="md:col-span-2">
                         <select className="input-field h-10 text-[11px] font-bold" value={e.no_so || ""} onChange={ev => updateEntry(i, "no_so", ev.target.value)}>
                            <option value="">SO REF</option>
                            {(so || []).filter((s:any) => s.is_posted).sort((a: any, b: any) => (b.order_id || "").localeCompare(a.order_id || "")).map((s:any) => <option key={s.id} value={s.order_id}>{s.order_id}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <CurrencyInput value={e.debit} onChange={(v: any) => updateEntry(i, "debit", v)} color="#10B981" className="h-10 font-black text-[12px] bg-slate-50 border-transparent focus:bg-white focus:border-green-brand/30" />
                      </div>
                      <div className="md:col-span-2">
                        <CurrencyInput value={e.kredit} onChange={(v: any) => updateEntry(i, "kredit", v)} color="#EF4444" className="h-10 font-black text-[12px] bg-slate-50 border-transparent focus:bg-white focus:border-red-brand/30" />
                      </div>
                      <div className="md:col-span-1 flex items-center justify-center gap-1 h-10">
                         <div className="flex flex-col gap-0.5">
                            <button className="p-1 rounded bg-white border border-border-main/50 hover:bg-accent hover:text-white transition-colors text-text-light" onClick={() => moveRow(i, "up")} disabled={i === 0}><Icon name="ChevronUp" size={10} /></button>
                            <button className="p-1 rounded bg-white border border-border-main/50 hover:bg-accent hover:text-white transition-colors text-text-light" onClick={() => moveRow(i, "down")} disabled={i === form.entries.length-1}><Icon name="ChevronDown" size={10} /></button>
                         </div>
                         <button className="p-2 rounded-lg bg-red-brand/10 text-red-brand hover:bg-red-brand hover:text-white transition-all shadow-sm" onClick={() => setForm((f: any) => ({ ...f, entries: f.entries.filter((_: any, idx: number) => idx !== i) }))} title="Hapus Baris"><Icon name="X" size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  className="w-full py-3 border-2 border-dashed border-border-main shadow-inner rounded-xl text-[10px] font-black text-text-light uppercase tracking-widest hover:border-accent hover:text-accent hover:bg-accent/5 hover:scale-[1.005] active:scale-95 transition-all flex items-center justify-center gap-2 group" 
                  onClick={() => setForm((f: any) => ({ ...f, entries: [...f.entries, { coa: "", akun: "", debit: "", kredit: "", no_so: "" }] }))}
                >
                  <Icon name="PlusCircle" size={16} className="group-hover:rotate-90 transition-transform duration-500" /> Tambah Baris Transaksi
                </button>
              </div>

              <div className={`p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-6 transition-all border-2 ${balanced ? "bg-green-brand/5 border-green-brand/20 shadow-lg shadow-green-brand/5" : "bg-slate-50 border-border-main/30"}`}>
                <div className="flex gap-10">
                  <div className="flex flex-col gap-0.5">
                    <div className="text-[10px] font-black text-text-light opacity-60 uppercase tracking-widest italic">Total Debit</div>
                    <div className="text-xl font-black text-green-brand tabular-nums drop-shadow-sm">{fmt(totalD)}</div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="text-[10px] font-black text-text-light opacity-60 uppercase tracking-widest italic">Total Kredit</div>
                    <div className="text-xl font-black text-red-brand tabular-nums drop-shadow-sm">{fmt(totalK)}</div>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl flex items-center gap-2 font-black text-[11px] uppercase tracking-widest shadow-sm ${balanced ? "bg-green-brand text-white" : "bg-red-brand text-white"}`}>
                  <Icon name={balanced ? "ShieldCheck" : "ShieldAlert"} size={16} />
                  {balanced ? "Balanced" : "Unbalanced"}
                </div>
              </div>

              {err && (
                <div className="flex items-center gap-3 p-4 bg-red-brand-light text-red-brand rounded-2xl border border-red-brand/20 font-black text-[11px] uppercase tracking-tight shadow-md animate-shake">
                  <Icon name="AlertCircle" size={18} /> {err}
                </div>
              )}
          </div>

          <div className="p-6 border-t border-border-main bg-slate-50 flex flex-col sm:flex-row gap-4">
            <FeedbackButton 
              className="flex-1 h-12 text-[11px] font-black uppercase tracking-widest gap-2 flex items-center justify-center order-2 sm:order-1 shadow-2xl shadow-accent/20" 
              onClick={submit} 
              loading={saving}
              success={saveSuccess}
              error={saveError}
              disabled={!balanced}
            >
              <Icon name="CheckCircle2" size={18} />
              {editJurnalId ? "Simpan Perubahan Jurnal" : "Verifikasi & Posting Jurnal"}
            </FeedbackButton>
            <button className="h-12 px-10 rounded-xl text-text-light border border-border-main font-black uppercase tracking-widest text-[11px] hover:bg-white hover:text-red-brand hover:border-red-brand transition-all order-1 sm:order-2 active:scale-95" onClick={() => { setTab("list"); setEditJurnalId(null); }}>Batal</button>
          </div>
        </Card>
      )}
    </PageShell>
  );
};
