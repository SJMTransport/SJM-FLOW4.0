import React, { useState, useMemo } from "react";
import { C, STATUS_SO } from "../constants";
import { fmt, genJUNo, today, filterByPeriod as filterByPeriodUtil } from "@/src/utils";
import { Card, SectionHeader, Spinner, EmptyState, useConfirm, PeriodFilter, Icon, useToast, ModalShell, FeedbackButton, PageShell, ActionBar } from "@/src/components/SJMComponents";
import { CurrencyInput } from "@/src/components/SJMModals";
import { api } from "@/src/api";
import { Loader2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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
  const [sortKey, setSortKey] = useState<'no_jurnal' | 'tanggal'>('no_jurnal');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

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
    const base = filterByPeriod(jurnal, period).filter((j: any) =>
      j.keterangan?.toLowerCase().includes(search.toLowerCase()) ||
      j.no_jurnal?.toLowerCase().includes(search.toLowerCase()) ||
      (j.no_so || "").toLowerCase().includes(search.toLowerCase())
    );
    return [...base].sort((a: any, b: any) => {
      const aVal = sortKey === 'tanggal' ? (a.tanggal || '') : (a.no_jurnal || '');
      const bVal = sortKey === 'tanggal' ? (b.tanggal || '') : (b.no_jurnal || '');
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [jurnal, period, search, sortKey, sortDir]);

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
        total_debit: totalD, total_kredit: totalK, status: "Draft",
        created_by: currentUser?.nama || "—"
      };
      const details = form.entries.map((e: any) => ({
        coa_kode: e.coa, nama_akun: e.akun,
        debit: parseFloat(e.debit) || 0, kredit: parseFloat(e.kredit) || 0,
        no_so: e.no_so || null,
      }));
      if (editJurnalId) {
        await api.updateJurnalWithDetails(editJurnalId, jurnalData, details);
      } else {
        await api.createJurnalWithDetails(jurnalData, details);
      }
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

  const toggleSort = (key: 'no_jurnal' | 'tanggal') => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

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

  const grandD = filtered.reduce((sum: number, j: any) => {
    return sum + (j.jurnal_detail || []).reduce((s: number, d: any) => s + Number(d.debit || 0), 0);
  }, 0);
  const grandK = filtered.reduce((sum: number, j: any) => {
    return sum + (j.jurnal_detail || []).reduce((s: number, d: any) => s + Number(d.kredit || 0), 0);
  }, 0);

  const getPeriodText = () => {
    if (period.mode === "day") return `Tanggal ${period.day || ""}`;
    if (period.mode === "year") return `Tahun ${period.year}`;
    return `Bulan ${["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][period.month]} ${period.year}`;
  };

  const exportExcel = () => {
    try {
      const periodText = getPeriodText();
      const now = new Date();
      const tsStr = `Dicetak: ${now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} pukul ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

      const wsRows: any[][] = [
        ['PT Sugiarto Jaya Mandiri — Laporan Jurnal Umum', '', '', '', '', '', '', ''],
        [`Periode: ${periodText}`, '', '', '', '', '', '', ''],
        [''],
        ['Tanggal', 'No Jurnal', 'No SO', 'Keterangan', 'Kode Akun', 'Nama Akun', 'Debit', 'Kredit'],
      ];
      const dataStartRow = wsRows.length;

      filtered.forEach((j: any) => {
        (j.jurnal_detail || []).forEach((e: any, i: number) => {
          wsRows.push([
            i === 0 ? (j.tanggal || '') : '',
            i === 0 ? (j.no_jurnal || '') : '',
            i === 0 ? (j.no_so || '') : '',
            i === 0 ? (j.keterangan || '') : '',
            e.coa_kode || '',
            e.nama_akun || '',
            Number(e.debit || 0),
            Number(e.kredit || 0),
          ]);
        });
      });

      if (wsRows.length === dataStartRow) {
        showToast("Tidak ada data untuk di-export", "info");
        return;
      }

      wsRows.push(['']);
      wsRows.push([tsStr, '', '', '', '', '', '', '']);
      const footerRowIdx = wsRows.length - 1;

      const ws = XLSX.utils.aoa_to_sheet(wsRows);

      ws['!cols'] = [
        { wch: 14 },
        { wch: 18 },
        { wch: 18 },
        { wch: 40 },
        { wch: 12 },
        { wch: 30 },
        { wch: 18 },
        { wch: 18 },
      ];

      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
        { s: { r: footerRowIdx, c: 0 }, e: { r: footerRowIdx, c: 7 } },
      ];

      for (let i = dataStartRow; i < footerRowIdx - 1; i++) {
        const dr = XLSX.utils.encode_cell({ r: i, c: 6 });
        const kr = XLSX.utils.encode_cell({ r: i, c: 7 });
        if (ws[dr]) ws[dr].z = '#,##0.00';
        if (ws[kr]) ws[kr].z = '#,##0.00';
      }

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
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const periodText = getPeriodText();
      const now = new Date();
      const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const footerTS = `Dicetak: ${dateStr} pukul ${timeStr}`;

      // Navy header
      doc.setFillColor(30, 58, 95);
      doc.rect(0, 0, pageW, 26, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('PT Sugiarto Jaya Mandiri', 14, 10);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Laporan Jurnal Umum', 14, 17);
      doc.setFontSize(7.5);
      doc.text('SJM Flow · Sistem Manajemen Keuangan & Logistik', pageW - 14, 10, { align: 'right' });

      // Orange period bar
      doc.setFillColor(249, 172, 61);
      doc.rect(0, 26, pageW, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 58, 95);
      doc.text(`Periode: ${periodText}`, 14, 31.5);
      doc.setTextColor(0, 0, 0);

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
        startY: 38,
        margin: { left: 10, right: 10, top: 10, bottom: 14 },
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        bodyStyles: { lineWidth: 0.1, lineColor: [226, 232, 240] },
        columnStyles: {
          4: { halign: 'right' },
          5: { halign: 'right' }
        },
        didDrawPage: () => {
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(150, 150, 150);
          doc.text('PT Sugiarto Jaya Mandiri · SJM Flow', 14, pageH - 6);
          doc.text(footerTS, pageW - 14, pageH - 6, { align: 'right' });
          doc.setTextColor(0, 0, 0);
        },
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
            <div className="btn-export-group">
               <button className="flex items-center gap-1.5 px-4 text-[10px] font-bold text-green-brand hover:bg-grey-50 border-r border-border-main transition-colors" onClick={exportExcel} title="Export Excel">
                  <Icon name="Download" size={14} /> XLS
               </button>
               <button className="flex items-center gap-1.5 px-4 text-[10px] font-bold text-red-brand hover:bg-grey-50 transition-colors" onClick={exportPDF} title="Export PDF">
                  <Icon name="FileText" size={14} /> PDF
               </button>
            </div>
            <button
              className="btn-ghost"
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
          
          <div className="table-container max-h-[calc(100vh-340px)] overflow-y-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th
                    className="cursor-pointer select-none transition-colors"
                    style={{ background: sortKey === 'tanggal' ? '#e2e8f0' : undefined }}
                    onClick={() => toggleSort('tanggal')}
                  >
                    <span className="flex items-center gap-1 pointer-events-none">
                      Tanggal
                      {sortKey !== 'tanggal' && <ArrowUpDown size={10} className="opacity-30" />}
                      {sortKey === 'tanggal' && sortDir === 'asc' && <ArrowUp size={10} className="text-accent" />}
                      {sortKey === 'tanggal' && sortDir === 'desc' && <ArrowDown size={10} className="text-accent" />}
                    </span>
                  </th>
                  <th
                    className="cursor-pointer select-none transition-colors"
                    style={{ background: sortKey === 'no_jurnal' ? '#e2e8f0' : undefined }}
                    onClick={() => toggleSort('no_jurnal')}
                  >
                    <span className="flex items-center gap-1 pointer-events-none">
                      No Jurnal
                      {sortKey !== 'no_jurnal' && <ArrowUpDown size={10} className="opacity-30" />}
                      {sortKey === 'no_jurnal' && sortDir === 'asc' && <ArrowUp size={10} className="text-accent" />}
                      {sortKey === 'no_jurnal' && sortDir === 'desc' && <ArrowDown size={10} className="text-accent" />}
                    </span>
                  </th>
                  <th>No SO</th>
                  <th>Keterangan / Akun</th>
                  <th className="text-right min-w-[160px]">Debit</th>
                  <th className="text-right min-w-[160px]">Kredit</th>
                  <th className="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody key={`${sortKey}-${sortDir}`} className="divide-y divide-border-main/10 bg-white/40">
                  {filtered.length === 0 ? <EmptyState colSpan={7} msg="Belum ada jurnal" /> :
                    filtered.flatMap((j: any) => {
                      const details = j.jurnal_detail || [];
                      return details.map((e: any, ei: number) => (
          <tr key={`${j.id}-${ei}`} className="group transition-colors border-b border-border-main/5">
            {ei === 0 && <>
              <td rowSpan={details.length} className="py-1.5 px-4 text-[10px] font-bold text-text-light align-top tabular-nums italic border-r border-border-main/5">{j.tanggal}</td>
              <td rowSpan={details.length} className="py-1.5 px-4 align-top border-r border-border-main/5">
                <div className="flex items-center gap-2">
                  <button onClick={() => onJurnalClick && onJurnalClick(j.no_jurnal)} className="text-[11px] font-black text-accent hover:underline tracking-tight">{j.no_jurnal}</button>
                  {Math.abs(Number(j.total_debit) - Number(j.total_kredit)) > 0.01 && <Icon name="AlertTriangle" size={12} className="text-red-brand animate-pulse" title="Jurnal tidak seimbang!" />}
                </div>
              </td>
              <td rowSpan={details.length} className="py-1.5 px-4 align-top space-y-1 border-r border-border-main/5 min-w-[130px]">
                  {j.no_so ? (j.no_so as string).split(",").map(s => (
                      <span key={s} className="text-[9px] font-black text-blue-brand bg-blue-brand/5 px-1.5 py-0.5 rounded-sm hover:bg-blue-brand/10 cursor-pointer block w-fit italic" onClick={() => onSOClick && onSOClick(s.trim())}>{s.trim()}</span>
                  )) : <span className="text-[9px] font-bold text-text-light opacity-20 italic">—</span>}
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
        <Card className="p-0 overflow-hidden border-border-main/40 shadow-sm animate-fade-left bg-white">

          {/* ── FORM BODY ─────────────────────────────────────────────── */}
          <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-220px)]">

            {/* Title */}
            <h2 className="text-xl font-black tracking-tight text-text-main">
              {editJurnalId ? "Edit Jurnal" : "Buat Jurnal Baru"}
            </h2>

            {/* NO JURNAL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-0.5">
                <label className="text-[10px] font-black text-text-light uppercase tracking-widest">NO JURNAL *</label>
                <span className="text-[9px] font-medium text-text-light opacity-40 italic">otomatis dari tanggal · bisa diedit</span>
              </div>
              <input
                className="input-field h-10 font-black text-[13px] tracking-tight"
                placeholder={genJUNo(form.tanggal, jurnal)}
                value={form.noJurnal || ""}
                onChange={e => setForm((f: any) => ({ ...f, noJurnal: e.target.value }))}
              />
            </div>

            {/* TANGGAL | NO BUKTI */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-light uppercase tracking-widest px-0.5">TANGGAL *</label>
                <input type="date" className="input-field h-10 text-[12px] font-bold" value={form.tanggal || ""} onChange={e => setForm((f: any) => ({ ...f, tanggal: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-light uppercase tracking-widest px-0.5">NO BUKTI</label>
                <input className="input-field h-10 text-[12px] font-bold" placeholder="No. Invoice / Kwitansi" value={form.noBukti || ""} onChange={e => setForm((f: any) => ({ ...f, noBukti: e.target.value }))} />
              </div>
            </div>

            {/* KETERANGAN */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-light uppercase tracking-widest px-0.5">KETERANGAN *</label>
              <textarea
                className="input-field pt-2.5 text-[13px] resize-none font-medium leading-snug"
                rows={2}
                placeholder="Contoh: Order PT. Berca Mandiri Perkasa — SJM.ID-0017.26"
                value={form.keterangan || ""}
                onChange={e => setForm((f: any) => ({ ...f, keterangan: e.target.value }))}
              />
            </div>

            {/* SO chips — click to auto-fill keterangan */}
            {(form.noSO || []).length > 0 && (() => {
              const chips = (form.noSO as string[]).map(id => (so || []).find((s: any) => s.order_id === id)).filter(Boolean);
              return chips.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {chips.map((s: any) => (
                    <button
                      key={s.order_id}
                      type="button"
                      title="Klik untuk isi keterangan"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-brand/10 border border-green-brand/20 text-green-brand rounded-lg text-[11px] font-black hover:bg-green-brand hover:text-white transition-all"
                      onClick={() => setForm((f: any) => ({ ...f, keterangan: `Order ${s.customer} — ${s.order_id}` }))}
                    >
                      <Icon name="Truck" size={12} />
                      {s.no_polisi} · {s.nama_sopir}
                      <span className="opacity-50 font-medium ml-1">↑ klik untuk isi keterangan</span>
                    </button>
                  ))}
                </div>
              ) : null;
            })()}

            {/* NO SO selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-light uppercase tracking-widest px-0.5">
                NO SO <span className="normal-case font-medium opacity-50">(opsional · bisa pilih banyak)</span>
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 min-h-[40px] border border-border-main rounded-xl bg-white items-center">
                {(form.noSO || []).map((id: string) => (
                  <span key={id} className="flex items-center gap-1 px-2 py-0.5 bg-accent text-white rounded-md text-[11px] font-black">
                    {id}
                    <button
                      type="button"
                      className="ml-0.5 hover:opacity-70 transition-opacity"
                      onClick={() => {
                        const next = (form.noSO as string[]).filter((x: string) => x !== id);
                        setForm((f: any) => ({
                          ...f,
                          noSO: next,
                          entries: f.entries.map((e: any) => e.no_so === id && next.length === 0 ? { ...e, no_so: "" } : e)
                        }));
                      }}
                    >×</button>
                  </span>
                ))}
                <select
                  className="flex-1 min-w-[160px] bg-transparent text-[11px] font-bold border-none outline-none cursor-pointer text-text-light"
                  value=""
                  onChange={e => {
                    const id = e.target.value;
                    if (!id || (form.noSO || []).includes(id)) return;
                    const next = [...(form.noSO || []), id];
                    setForm((f: any) => ({
                      ...f,
                      noSO: next,
                      entries: f.entries.map((entry: any) => entry.no_so ? entry : { ...entry, no_so: id })
                    }));
                  }}
                >
                  <option value="">+ Tambah SO referensi...</option>
                  {(so || [])
                    .filter((s: any) => s.is_posted && !(form.noSO || []).includes(s.order_id))
                    .sort((a: any, b: any) => (b.order_id || "").localeCompare(a.order_id || ""))
                    .map((s: any) => (
                      <option key={s.id} value={s.order_id}>{s.order_id} — {s.customer}</option>
                    ))}
                </select>
              </div>

              {/* SO info card */}
              {(form.noSO || []).length > 0 && (() => {
                const soList = (form.noSO as string[]).map(id => (so || []).find((s: any) => s.order_id === id)).filter(Boolean);
                if (soList.length === 0) return null;
                const totalVal = soList.reduce((s: number, x: any) => s + Number(x.total_harga_pajak || x.total_harga || 0), 0);
                return (
                  <div className="mt-2 p-3 bg-blue-brand/5 border border-blue-brand/20 rounded-xl space-y-1">
                    {soList.map((s: any) => (
                      <div key={s.order_id} className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-text-med">
                          <span className="font-black text-text-main">{s.customer}</span>
                          {s.lokasi_muat && s.lokasi_bongkar && <span className="opacity-60"> · {s.lokasi_muat} → {s.lokasi_bongkar}</span>}
                        </span>
                        <span className="font-black text-blue-brand tabular-nums">{fmt(s.total_harga_pajak || s.total_harga || 0)}</span>
                      </div>
                    ))}
                    {soList.length > 1 && (
                      <div className="flex items-center justify-between pt-1 border-t border-blue-brand/10 text-[11px]">
                        <span className="font-black text-text-light opacity-60">Total {soList.length} SO</span>
                        <span className="font-black text-accent tabular-nums">{fmt(totalVal)}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Multi-SO distribution */}
            {(() => {
              const allSOs = [...new Set([...(form.noSO || []), ...form.entries.map((e: any) => e.no_so).filter(Boolean)])];
              if (allSOs.length <= 1) return null;
              return (
                <div className="p-4 bg-slate-50 rounded-xl border border-border-main/50 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black text-navy uppercase tracking-widest italic">
                    <Icon name="PieChart" size={13} className="text-accent" /> Distribusi Nilai per SO
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allSOs.map((oid: any) => (
                      <div key={oid} className="space-y-1">
                        <label className="text-[10px] font-bold text-text-light px-1 opacity-60">{oid}</label>
                        <CurrencyInput
                          value={form.soValues?.[oid] || ""}
                          placeholder="Nilai SO ini"
                          onChange={(v: any) => setForm((f: any) => ({ ...f, soValues: { ...(f.soValues || {}), [oid]: v } }))}
                          className="h-9 text-[11px] font-bold bg-white"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] font-bold text-text-light italic opacity-50">ℹ Isi nilai per SO untuk perhitungan margin profit yang akurat.</p>
                </div>
              );
            })()}

            {/* Entry table */}
            <div className="space-y-0">
              <div className="overflow-x-auto rounded-xl border border-border-main/50 shadow-sm">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border-main/40">
                      <th className="text-left py-2 px-3 text-[9px] font-black text-text-light uppercase tracking-widest opacity-60 w-[38%]">AKUN COA</th>
                      <th className="text-left py-2 px-3 text-[9px] font-black text-text-light uppercase tracking-widest opacity-60 w-[14%]">NAMA AKUN</th>
                      <th className="text-right py-2 px-3 text-[9px] font-black text-text-light uppercase tracking-widest opacity-60 w-[16%]">DEBIT (RP)</th>
                      <th className="text-right py-2 px-3 text-[9px] font-black text-text-light uppercase tracking-widest opacity-60 w-[16%]">KREDIT (RP)</th>
                      <th className="text-left py-2 px-3 text-[9px] font-black text-text-light uppercase tracking-widest opacity-60 w-[14%]">NO SO</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-main/10">
                    {form.entries.map((e: any, i: number) => (
                      <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-2 px-3">
                          <select
                            className="w-full bg-transparent text-[11px] font-black border-none outline-none cursor-pointer hover:text-accent transition-colors appearance-none"
                            value={e.coa || ""}
                            onChange={ev => updateEntry(i, "coa", ev.target.value)}
                          >
                            <option value="">Pilih Akun COA</option>
                            {coa.map((c: any) => <option key={c.kode} value={c.kode}>{c.kode} – {c.nama}</option>)}
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            className="w-full bg-transparent text-[11px] font-bold border-none outline-none text-text-med"
                            value={e.akun || ""}
                            placeholder="—"
                            onChange={ev => updateEntry(i, "akun", ev.target.value)}
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <CurrencyInput
                            value={e.debit}
                            onChange={(v: any) => updateEntry(i, "debit", v)}
                            color="#10B981"
                            className="h-8 text-right font-black text-[12px] border-none bg-transparent focus:bg-white focus:border-green-brand/30 px-1"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <CurrencyInput
                            value={e.kredit}
                            onChange={(v: any) => updateEntry(i, "kredit", v)}
                            color="#EF4444"
                            className="h-8 text-right font-black text-[12px] border-none bg-transparent focus:bg-white focus:border-red-brand/30 px-1"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            className="w-full bg-transparent text-[11px] font-bold border-none outline-none cursor-pointer appearance-none"
                            value={e.no_so || ""}
                            onChange={ev => updateEntry(i, "no_so", ev.target.value)}
                          >
                            <option value="">—</option>
                            {(so || [])
                              .filter((s: any) => s.is_posted)
                              .sort((a: any, b: any) => (b.order_id || "").localeCompare(a.order_id || ""))
                              .map((s: any) => <option key={s.id} value={s.order_id}>{s.order_id}</option>)}
                          </select>
                        </td>
                        <td className="py-2 px-1 text-center">
                          <button
                            className="w-6 h-6 rounded flex items-center justify-center text-text-light hover:bg-red-brand/10 hover:text-red-brand transition-colors opacity-0 group-hover:opacity-100"
                            onClick={() => setForm((f: any) => ({ ...f, entries: f.entries.filter((_: any, idx: number) => idx !== i) }))}
                          >
                            <Icon name="X" size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                className="w-full py-2.5 border border-dashed border-border-main rounded-xl text-[11px] font-black text-text-light uppercase tracking-widest hover:border-accent hover:text-accent hover:bg-accent/5 transition-all flex items-center justify-center gap-2 mt-2"
                onClick={() => {
                  const defaultSO = (form.noSO || []).length === 1 ? form.noSO[0] : "";
                  setForm((f: any) => ({ ...f, entries: [...f.entries, { coa: "", akun: "", debit: "", kredit: "", no_so: defaultSO }] }));
                }}
              >
                <Icon name="Plus" size={14} /> Tambah Baris
              </button>
            </div>

            {/* Totals row */}
            <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${balanced ? "bg-green-brand/5 border-green-brand/20" : "bg-red-brand/5 border-red-brand/20"}`}>
              <div className="flex gap-10">
                <div>
                  <div className="text-[9px] font-black text-text-light opacity-50 uppercase tracking-widest mb-0.5">TOTAL DEBIT</div>
                  <div className="text-lg font-black text-green-brand tabular-nums">{fmt(totalD)}</div>
                </div>
                <div>
                  <div className="text-[9px] font-black text-text-light opacity-50 uppercase tracking-widest mb-0.5">TOTAL KREDIT</div>
                  <div className="text-lg font-black text-red-brand tabular-nums">{fmt(totalK)}</div>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black ${balanced ? "text-green-brand" : "text-red-brand"}`}>
                <Icon name={balanced ? "CheckCircle2" : "AlertCircle"} size={16} />
                {balanced ? "✓ Seimbang" : "Belum Seimbang"}
              </div>
            </div>

            {err && (
              <div className="flex items-center gap-2 p-3 bg-red-brand/5 text-red-brand rounded-lg border border-red-brand/20 text-[11px] font-bold">
                <Icon name="AlertCircle" size={14} /> {err}
              </div>
            )}
          </div>

          {/* ── FOOTER ────────────────────────────────────────────────── */}
          <div className="p-4 border-t border-border-main bg-white flex gap-3 sticky bottom-0">
            <FeedbackButton
              className="flex-1 h-11 text-[12px] font-black gap-2 flex items-center justify-center shadow-lg shadow-accent/20"
              onClick={submit}
              loading={saving}
              success={saveSuccess}
              error={saveError}
              disabled={!balanced}
            >
              Simpan ke Supabase
            </FeedbackButton>
            <button
              className="h-11 px-8 rounded-xl border border-border-main text-text-med font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all"
              onClick={() => { setTab("list"); setEditJurnalId(null); }}
            >
              Batal
            </button>
          </div>
        </Card>
      )}
    </PageShell>
  );
};
