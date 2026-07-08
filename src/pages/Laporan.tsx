import React, { useMemo, useState } from "react";
import { C } from "../constants";
import { fmt, fmtShort, filterByPeriod, filterUpToPeriod } from "@/src/utils";
import { Card, SectionHeader, EmptyState, PeriodFilter, Icon, PageShell, KPIGrid, ActionBar, showToast } from "@/src/components/SJMComponents";
import { ACTION_COLORS, ACTION_LABELS, MODULE_LABELS, type ActionType, type ModuleKey } from "@/src/lib/activityLogger";
import { buildMeta } from "@/src/lib/activityLogger";

import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export const LaporanPage = ({ activeSub, jurnal, coa, so, armada, auditLogs, saldoAwal, onSOClick, onJurnalClick, logAction }: any) => {
  const [period, setPeriod] = useState({ mode: "year", year: new Date().getFullYear(), month: new Date().getMonth() });
  const [selectedCoa, setSelectedCoa] = useState("");
  const [search, setSearch] = useState("");
  const [auditDetailLog, setAuditDetailLog] = useState<any>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const filteredJurnal = useMemo(() => filterByPeriod(jurnal || [], period), [jurnal, period]);
  const cumulativeJurnal = useMemo(() => filterUpToPeriod(jurnal || [], period), [jurnal, period]);

  const getPeriodText = () => {
    if (period.mode === "day") return `Tanggal ${period.day || ""}`;
    if (period.mode === "year") return `Tahun ${period.year}`;
    if (period.mode === "all") return "Semua Periode";
    if (period.mode === "range") return `${period.rangeFrom || "..."} s/d ${period.rangeTo || "..."}`;
    return `Bulan ${MONTH_NAMES[period.month]} ${period.year}`;
  };

  const exportExcel = async (title: string, data: any[], columns: string[]) => {
    if (exporting) return;
    setExporting('excel');
    try {
    const periodText = getPeriodText();
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const footerTS = `Dicetak: ${dateStr} pukul ${timeStr}`;
    const ncols = columns.length;
    const lastCol = String.fromCharCode(64 + ncols);

    const wb = new ExcelJS.Workbook();
    (wb as any).properties = {
      title: 'Sales Order Report',
      creator: 'SJM Flow',
      subject: 'Logistics Management',
      keywords: 'Logistics, Transportation, Heavy Equipment, SJM Flow',
      company: 'PT Sugiarto Jaya Mandiri',
      author: 'SJM Flow',
      lastModifiedBy: 'SJM Flow'
    };
    const ws = wb.addWorksheet(title.substring(0, 31));

    const addMR = (text: string, opts: any = {}) => {
      const r = ws.addRow([text, ...Array(ncols - 1).fill('')]);
      ws.mergeCells(`A${r.number}:${lastCol}${r.number}`);
      r.font = { bold: opts.bold, size: opts.size, color: opts.color ? { argb: opts.color } : undefined, italic: opts.italic };
      if (opts.align) r.getCell(1).alignment = { horizontal: opts.align };
      return r;
    };
    addMR('PT SUGIARTO JAYA MANDIRI', { bold: true, size: 14, color: 'FFFF8F00' });
    addMR(title, { bold: true, size: 12 });
    addMR(`Periode: ${periodText}`, { size: 10 });
    ws.addRow([]);

    const hdr = ws.addRow(columns.map(c => c.replace('_', ' ').toUpperCase()));
    hdr.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8F00' } };
    hdr.eachCell(c => {
      c.border = { top:{style:'thin'}, bottom:{style:'thin'}, left:{style:'thin'}, right:{style:'thin'} };
      c.alignment = { horizontal: 'center' };
    });

    data.forEach(row => {
      const vals = columns.map(col => row[col]);
      const r = ws.addRow(vals);
      r.eachCell({ includeEmpty: true }, (c, ci) => {
        c.border = { top:{style:'hair'}, bottom:{style:'hair'}, left:{style:'hair'}, right:{style:'hair'} };
        if (typeof vals[ci - 1] === 'number') { c.numFmt = '#,##0.00'; c.alignment = { horizontal: 'right' }; }
      });
    });

    ws.addRow([]);
    const tsRow = ws.addRow([footerTS, ...Array(ncols - 1).fill('')]);
    ws.mergeCells(`A${tsRow.number}:${lastCol}${tsRow.number}`);
    tsRow.font = { italic: true, size: 9, color: { argb: 'FF888888' } };
    tsRow.getCell(1).alignment = { horizontal: 'right' };

    columns.forEach((_, i) => { ws.getColumn(i + 1).width = i === 3 ? 40 : 18; });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${title}_${now.toISOString().slice(0,10)}.xlsx`;
    a.click(); URL.revokeObjectURL(url);
    showToast('File Excel berhasil diunduh!', 'success');
    } catch (err: any) {
      console.error('Export Excel error:', err);
      showToast('Gagal mengunduh Excel. Coba lagi.', 'error');
    } finally {
      setExporting(null);
    }
  };

  const exportPDF = (title: string, data: any[], columns: string[]) => {
    if (exporting) return;
    setExporting('pdf');
    try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setProperties({
      title: 'Sales Order Report',
      author: 'SJM Flow',
      company: 'PT Sugiarto Jaya Mandiri',
      creator: 'SJM Flow',
      producer: 'SJM Flow',
      subject: 'Logistics Management',
      keywords: 'Logistics, Transportation, Heavy Equipment, SJM Flow'
    } as any);
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const ML = 10, MR = 10;
    const EORANGE: [number,number,number] = [255,143,0];
    const EWHITE:  [number,number,number] = [255,255,255];
    const EBLACK:  [number,number,number] = [0,0,0];
    const periodText = getPeriodText();
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const footerTS = `Dicetak: ${dateStr} pukul ${timeStr}`;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...EORANGE);
    doc.text('PT SUGIARTO JAYA MANDIRI', ML, 12);
    doc.setFontSize(11); doc.setTextColor(40,40,40);
    doc.text(title, ML, 20);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(40,40,40);
    doc.text(`Periode: ${periodText}`, ML, 26);
    doc.setDrawColor(...EORANGE); doc.setLineWidth(0.8);
    doc.line(ML, 30, pageW - MR, 30);

    const body = data.map(row => columns.map(col => {
      const v = row[col];
      return typeof v === 'number' ? fmt(v) : String(v ?? '');
    }));
    autoTable(doc, {
      head: [columns.map(c => c.replace('_', ' ').toUpperCase())],
      body,
      startY: 35,
      margin: { left: ML, right: MR, top: 10, bottom: 14 },
      styles: { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }, lineWidth: 0.2, lineColor: EBLACK, textColor: [40,40,40] },
      headStyles: { fillColor: EORANGE, textColor: EWHITE, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [252,252,252] },
      didDrawPage: () => {
        const pg = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setDrawColor(...EORANGE); doc.setLineWidth(0.4);
        doc.line(ML, pageH - 9, pageW - MR, pageH - 9);
        doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(150,150,150);
        doc.text('PT Sugiarto Jaya Mandiri · SJM Flow', ML, pageH - 5);
        doc.text(`Halaman ${pg}`, pageW / 2, pageH - 5, { align: 'center' });
        doc.text(footerTS, pageW - MR, pageH - 5, { align: 'right' });
        doc.setTextColor(0,0,0);
      },
    });
    doc.save(`${title}_${now.toISOString().slice(0,10)}.pdf`);
    showToast('File PDF berhasil diunduh!', 'success');
    } catch (err: any) {
      console.error('Export PDF error:', err);
      showToast('Gagal mengunduh PDF. Coba lagi.', 'error');
    } finally {
      setExporting(null);
    }
  };

  const RenderExportActions = ({ title, data, columns }: any) => {
    const [showExport, setShowExport] = useState(false);
    return (
      <div className="flex gap-3 mt-3">
         <button className="btn-ghost text-xs flex items-center gap-2 group" onClick={() => setShowExport(true)}>
            <Icon name="FileText" size={14} className="group-hover:scale-110 transition-transform" /> 
            Preview & Export
         </button>
         {showExport && (
           <div className="fixed inset-0 bg-white/40 backdrop-blur-sm z-[2000] flex justify-center items-center p-4 md:p-10">
              <div className="fade-up w-full h-full max-w-6xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border-main">
                 <div className="p-6 border-b border-border-main bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                       <h3 className="text-lg font-black text-text-main tracking-tight uppercase leading-none">Preview: {title}</h3>
                       <p className="text-[11px] font-bold text-text-light mt-1 tracking-widest uppercase">{data.length} records found</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                       <button className="btn-primary bg-green-brand flex-1 sm:flex-none flex items-center justify-center gap-2" onClick={() => exportExcel(title, data, columns)} disabled={exporting !== null || data.length === 0}>
                          <Icon name="Download" size={16} /> {exporting === 'excel' ? '⏳ Mengunduh...' : 'Excel'}
                       </button>
                       <button className="btn-primary bg-red-brand flex-1 sm:flex-none flex items-center justify-center gap-2" onClick={() => exportPDF(title, data, columns)} disabled={exporting !== null || data.length === 0}>
                          <Icon name="FileText" size={16} /> {exporting === 'pdf' ? '⏳ Mengunduh...' : 'PDF'}
                       </button>
                       <button className="h-[42px] px-6 rounded-xl border border-border-main text-text-med font-black hover:bg-slate-50 transition-all uppercase tracking-widest text-[11px]" onClick={() => setShowExport(false)}>✕ Close</button>
                    </div>
                 </div>
                 <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
                    <div className="table-container max-h-[70vh]">
                    <table className="w-full border-collapse">
                       <thead>
                          <tr>
                             {columns.map((c: any) => <th key={c} className="px-4 py-3">{c.replace("_", " ")}</th>)}
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-border-main/30">
                          {data.length === 0 ? <EmptyState colSpan={columns.length} /> :
                            data.map((row: any, i: number) => (
                              <tr key={i} className="hover:bg-white transition-colors">
                                 {columns.map((c: any) => (
                                    <td key={c} className="px-4 py-3 text-[12px] text-text-med">
                                      {typeof row[c] === 'number' ? fmt(row[c]) : String(row[c] || "")}
                                    </td>
                                 ))}
                              </tr>
                            ))
                          }
                       </tbody>
                    </table>
                    </div>
                 </div>
              </div>
           </div>
         )}
      </div>
    );
  };

  const StatCardLocal = ({ label, value, color, icon, subLabel, variant = "" }: any) => (
    <div className={`kpi-card ${variant} fade-up`}>
      <div className="flex items-start justify-between gap-2">
        <div className="kpi-card-label">{label}</div>
        {icon && (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${color}18`, color }}>
            <Icon name={icon} size={16} />
          </div>
        )}
      </div>
      <div className="kpi-card-value">{value}</div>
      {subLabel && <div className="kpi-card-sub">{subLabel}</div>}
    </div>
  );

  const tbNeraca = useMemo(() => {
    const balances: Record<string, number> = {};
    (coa || []).forEach((c: any) => { balances[c.kode] = 0; });
    
    // Add Saldo Awal - Aligned with provided snippet logic
    (saldoAwal || []).forEach((s: any) => {
      const c = (coa || []).find((x: any) => x.kode === s.coa_kode);
      if (c && balances[s.coa_kode] !== undefined) {
        const isD = c.normal_balance === "Debit";
        balances[s.coa_kode] += isD ? (Number(s.debit || 0) - Number(s.kredit || 0)) : (Number(s.kredit || 0) - Number(s.debit || 0));
      }
    });

    cumulativeJurnal.forEach((j: any) => {
      (j.jurnal_detail || []).forEach((d: any) => {
        const c = (coa || []).find((x: any) => x.kode === d.coa_kode);
        if (c && balances[d.coa_kode] !== undefined) {
           const isD = c.normal_balance === "Debit";
           balances[d.coa_kode] += isD ? (Number(d.debit || 0) - Number(d.kredit || 0)) : (Number(d.kredit || 0) - Number(d.debit || 0));
        }
      });
    });
    return (coa || []).map((c: any) => ({ ...c, saldo: balances[c.kode] || 0 }));
  }, [coa, cumulativeJurnal, saldoAwal]);

  const tbLabaRugi = useMemo(() => {
    const balances: Record<string, number> = {};
    (coa || []).forEach((c: any) => { balances[c.kode] = 0; });

    // For Laba Rugi, use activity within the filtered period.
    filteredJurnal.forEach((j: any) => {
      (j.jurnal_detail || []).forEach((d: any) => {
        const c = (coa || []).find((x: any) => x.kode === d.coa_kode);
        if (c && balances[d.coa_kode] !== undefined) {
           // Standard P&L balance calculation: Credit - Debit for Income, Debit - Credit for Expense
           const isBeban = c.kelompok === "Beban";
           balances[d.coa_kode] += isBeban ? (Number(d.debit || 0) - Number(d.kredit || 0)) : (Number(d.kredit || 0) - Number(d.debit || 0));
        }
      });
    });
    return (coa || []).map((c: any) => ({ ...c, saldo: balances[c.kode] || 0 }));
  }, [coa, filteredJurnal]);

  const calcLabaRugi = useMemo(() => {
    // Keys stored lowercase for case-insensitive matching (BUG #1 fix)
    const SEKSI_MAP: Record<string, string> = {
      "jasa angkutan":        "pendapatanJasa",
      "pendapatan mobil sjm": "pendapatanJasa",
      "lainnya":              "pendapatanLain",
      "bpp":                  "bpp",
      "asuransi":             "bpp",
      "operasional kendaraan":"kendaraan",
      "operasional":          "operasional",
      "keuangan":             "keuangan",
      "pajak":                "pajak",
    };

    // Normalize sub_kelompok before lookup: trim + lowercase
    const getSeksi = (subKel: string | undefined): string | undefined =>
      SEKSI_MAP[(subKel || "").trim().toLowerCase()];

    const sum = (arr: any[]) => arr.reduce((s, c) => s + (c.saldo || 0), 0);

    const pendapatan = tbLabaRugi.filter(c => c.kelompok === "Pendapatan");
    const pndJasa = pendapatan.filter(c => getSeksi(c.sub_kelompok) === "pendapatanJasa");
    // Unmapped pendapatan falls into pndLain (original behaviour preserved)
    const pndLain = pendapatan.filter(c => getSeksi(c.sub_kelompok) === "pendapatanLain" || !getSeksi(c.sub_kelompok));

    const beban = tbLabaRugi.filter(c => c.kelompok === "Beban");
    const bpp  = beban.filter(c => getSeksi(c.sub_kelompok) === "bpp");
    const kend = beban.filter(c => getSeksi(c.sub_kelompok) === "kendaraan");
    const fin  = beban.filter(c => getSeksi(c.sub_kelompok) === "keuangan");
    const tax  = beban.filter(c => getSeksi(c.sub_kelompok) === "pajak");
    // BUG #2 fix: explicit "operasional" + fallback — any beban not claimed by
    // bpp/kendaraan/keuangan/pajak lands here (mirrors SJM Akuntansi fallback)
    const BEBAN_CLAIMED = new Set(["bpp", "kendaraan", "keuangan", "pajak"]);
    const opr  = beban.filter(c => {
      const s = getSeksi(c.sub_kelompok);
      return s === "operasional" || !BEBAN_CLAIMED.has(s as string);
    });

    const totPnd = sum(pndJasa) + sum(pndLain);
    const totBpp = sum(bpp);
    const labaKotor = totPnd - totBpp;
    const totKend = sum(kend);
    const labaSetKend = labaKotor - totKend;
    const totOpr = sum(opr);
    const labaUsaha = labaSetKend - totOpr;
    const totFin = sum(fin);
    const labaSebPajak = labaUsaha - totFin;
    const totTax = sum(tax);
    const labaBersih = labaSebPajak - totTax;

    return {
        pndJasa, pndLain, bpp, kend, opr, fin, tax,
        totPnd, totBpp, labaKotor, totKend, labaSetKend, totOpr, labaUsaha, totFin, labaSebPajak, totTax, labaBersih
    };
  }, [tbLabaRugi]);

  const tbProfit = useMemo(() => {
    const map: Record<string, { revenue: number; expense: number }> = {};

    // Gunakan jurnal yang sudah difilter per periode agar KPI berubah sesuai filter
    filterByPeriod(jurnal || [], period).forEach((j: any) => {
      const headerSOs = (j.no_so || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      const soVals = j.so_values || {};
      const totalSoVals = Object.values(soVals).reduce((s: number, v: any) => s + Number(v || 0), 0);
      const nHeader = headerSOs.length;

      (j.jurnal_detail || []).forEach((d: any) => {
        const kode = d.coa_kode || "";
        const targets = d.no_so ? [d.no_so] : headerSOs;
        if (!targets.length) return;

        targets.forEach((orderId: string) => {
          if (!map[orderId]) map[orderId] = { revenue: 0, expense: 0 };
          const factor = d.no_so ? 1
            : nHeader === 1 ? 1
            : (soVals[orderId] && Number(totalSoVals) > 0)
              ? Number(soVals[orderId]) / Number(totalSoVals)
              : 1 / nHeader;

          // Pendapatan: akun 4xx, ambil kredit bersih
          if (kode.startsWith("4") && Number(d.kredit) > 0) {
            const pendVal = (!d.no_so && soVals[orderId] && Number(totalSoVals) > 0)
              ? Number(soVals[orderId])
              : Number(d.kredit) * factor;
            map[orderId].revenue += pendVal;
          }

          // Beban operasional (5xx, kecuali PPN 553) — gunakan debit-kredit agar reversal benar
          if (kode.startsWith("5") && kode !== "553") {
            const bVal = (Number(d.debit || 0) - Number(d.kredit || 0)) * factor;
            map[orderId].expense += bVal;
          }

          // Beban asuransi (67x)
          if (kode.startsWith("67")) {
            const bVal = (Number(d.debit || 0) - Number(d.kredit || 0)) * factor;
            map[orderId].expense += bVal;
          }
        });
      });
    });

    // Build a lookup for SO metadata (tgl, customer) by order_id
    const soLookup = Object.fromEntries((so || []).map((s: any) => [s.order_id, s]));

    // Only show SOs that have actual journal activity in the selected period
    return (Object.entries(map) as [string, { revenue: number; expense: number }][]).map(([orderId, fin]) => {
      const s = soLookup[orderId];
      const profit = fin.revenue - fin.expense;
      const margin = fin.revenue > 0 ? (profit / fin.revenue) * 100 : 0;
      return { order_id: orderId, tgl: s?.tgl_muat || "", customer: s?.customer || orderId, revenue: fin.revenue, expense: fin.expense, profit, margin };
    }).sort((a, b) => (b.tgl || "").localeCompare(a.tgl || ""));
  }, [so, jurnal, period]);

  const tbPerUnit = useMemo(() => {
    const units = ["SJM01", "SJM02", "SJM03", "SJM04", "SJM05", "SJM06", "SJM07", "SJM08", "SJM09", "SJM10", "SJM11"];
    const filtered = filterByPeriod(jurnal || [], period);
    
    return units.map(unit => {
        let revenue = 0, expense = 0;
        filtered.forEach(j => {
            (j.jurnal_detail || []).forEach(d => {
                const coaRef = (coa || []).find(c => c.kode === d.coa_kode);
                if (coaRef?.nama?.toUpperCase().includes(unit)) {
                    if (coaRef.kelompok === "Pendapatan") revenue += (Number(d.kredit) - Number(d.debit));
                    if (coaRef.kelompok === "Beban") expense += (Number(d.debit) - Number(d.kredit));
                }
            });
        });
        return { unit, revenue, expense, profit: revenue - expense };
    });
  }, [jurnal, coa, period]);  if (activeSub === "neraca") {
    const activeItems = tbNeraca.filter((c: any) => Math.abs(c.saldo) > 0.1);
    
    // Grouping
    const aset = activeItems.filter(c => c.kelompok === "Aset");
    const liab = activeItems.filter(c => c.kelompok === "Liabilitas");
    const eku = activeItems.filter(c => c.kelompok === "Ekuitas");
    const pnd = activeItems.filter(c => c.kelompok === "Pendapatan");
    const bbn = activeItems.filter(c => c.kelompok === "Beban");

    // tbNeraca sudah menyimpan saldo positif untuk semua kelompok akun:
    // - Aset/Beban (normal Debit):  saldo = debit - kredit  → positif = ada saldo
    // - Liab/Eku/Pnd (normal Kredit): saldo = kredit - debit → positif = ada saldo
    // Mengalikan dengan -1 DI SINI adalah SALAH — itu menyebabkan totalPassiva negatif.
    const totalAset   = aset.reduce((s, c) => s + c.saldo, 0);
    const totalLiab   = liab.reduce((s, c) => s + c.saldo, 0);
    const totalEku    = eku.reduce((s, c) => s + c.saldo, 0);

    // Compute netLR directly from cumulative journal details using coa_kode patterns.
    // Uses cumulativeJurnal (same base as tbNeraca) so the accounting equation
    // totalAset = totalLiab + totalEku + netLR holds for balanced books → selisih ≈ 0.
    // Avoids dependency on COA kelompok label matching.
    const _cumDetails = cumulativeJurnal.flatMap((j: any) => j.jurnal_detail || []);
    const totalPnd = _cumDetails
      .filter((d: any) => (d.coa_kode || "").startsWith("4"))
      .reduce((s: number, d: any) => s + Number(d.kredit || 0) - Number(d.debit || 0), 0);
    const totalBbn = _cumDetails
      .filter((d: any) => { const k = d.coa_kode || ""; return k.startsWith("5") || k.startsWith("6"); })
      .reduce((s: number, d: any) => s + Number(d.debit || 0) - Number(d.kredit || 0), 0);
    const netLR = totalPnd - totalBbn;

    const totalPassiva = totalLiab + totalEku + netLR;
    const selisih = totalAset - totalPassiva;

    const balanced = Math.abs(selisih) < 1;

    const periodLabel = getPeriodText();

    const handleExportNeraca = async (mode: 'pdf' | 'xlsx') => {
        if (exporting) return;
        setExporting(mode === 'xlsx' ? 'excel' : 'pdf');
        try {
        type NRowType = 'section' | 'item' | 'subtotal' | 'summary' | 'balance' | 'blank';
        const tableRows: [string, string, string, number | string][] = [];
        const rowMeta: NRowType[] = [];

        const addSec  = (label: string)                                       => { tableRows.push(['', label, '', '']);                                rowMeta.push('section'); };
        const addItem = (kode: string, nama: string, kelompok: string, v: number) => { tableRows.push([kode, `  ${nama}`, kelompok, v]);              rowMeta.push('item'); };
        const addSub  = (label: string, v: number)                            => { tableRows.push(['', label, '', v]);                                rowMeta.push('subtotal'); };
        const addBlank= ()                                                     => { tableRows.push(['', '', '', '']);                                   rowMeta.push('blank'); };
        const addBal  = (label: string, v: number | string)                   => { tableRows.push(['', label, '', typeof v === 'number' ? v : 0]);    rowMeta.push('balance'); };

        const buildSection = (label: string, items: any[], factor = 1) => {
            if (items.length === 0) return;
            addSec(label);
            items.forEach(c => addItem(c.kode, c.nama, c.kelompok, c.saldo * factor));
            addSub(`Total ${label}`, items.reduce((s: number, c: any) => s + c.saldo * factor, 0));
            addBlank();
        };

        buildSection("ASET", aset);
        buildSection("LIABILITAS", liab);
        buildSection("EKUITAS", eku);
        buildSection("PENDAPATAN", pnd);
        buildSection("BEBAN", bbn);

        addSec("RINGKASAN");
        addBal("Total Aset", totalAset);
        addBal("Total Liab + Eku + Laba Rugi", totalPassiva);
        addBal(balanced ? "✓ SEIMBANG" : "SELISIH", selisih);

        // ── PDF ───────────────────────────────────────────────────────────
        if (mode === 'pdf') {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            doc.setProperties({
              title: 'Sales Order Report',
              author: 'SJM Flow',
              company: 'PT Sugiarto Jaya Mandiri',
              creator: 'SJM Flow',
              producer: 'SJM Flow',
              subject: 'Logistics Management',
              keywords: 'Logistics, Transportation, Heavy Equipment, SJM Flow'
            } as any);
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const ML = 10, MR = 10;
            const EORANGE: [number,number,number] = [255,143,0];
            const EDARK:   [number,number,number] = [40,40,40];
            const EWHITE:  [number,number,number] = [255,255,255];
            const EBLACK:  [number,number,number] = [0,0,0];

            const now = new Date();
            const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const footerTS = `Dicetak: ${dateStr} pukul ${timeStr}`;

            // BB-style header: orange company name, dark title, orange separator
            doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...EORANGE);
            doc.text('PT SUGIARTO JAYA MANDIRI', ML, 12);
            doc.setFontSize(11); doc.setTextColor(...EDARK);
            doc.text('NERACA SALDO', ML, 20);
            doc.setFontSize(8); doc.setFont('helvetica', 'normal');
            doc.text(`Periode: ${periodLabel}`, ML, 26);
            doc.setDrawColor(...EORANGE); doc.setLineWidth(0.8);
            doc.line(ML, 30, pageW - MR, 30);

            // KPI boxes
            const kpiY = 34, kpiH = 14, kpiW = (pageW - ML - MR - 8) / 3;
            ([
                { label: 'TOTAL ASET',    value: fmt(totalAset),    fill: [240,248,255] as [number,number,number], stroke: [70,130,180]  as [number,number,number], tx: [70,130,180]  as [number,number,number] },
                { label: 'TOTAL PASSIVA', value: fmt(totalPassiva), fill: [240,255,240] as [number,number,number], stroke: [34,139,34]   as [number,number,number], tx: [34,139,34]   as [number,number,number] },
                { label: balanced ? '✓ SEIMBANG' : '! SELISIH', value: fmt(Math.abs(selisih)), fill: balanced ? [240,255,240] as [number,number,number] : [255,235,235] as [number,number,number], stroke: balanced ? [34,139,34] as [number,number,number] : [200,0,0] as [number,number,number], tx: balanced ? [34,139,34] as [number,number,number] : [200,0,0] as [number,number,number] },
            ]).forEach((b, i) => {
                const x = ML + i * (kpiW + 4);
                doc.setFillColor(...b.fill); doc.setDrawColor(...b.stroke); doc.setLineWidth(0.3);
                doc.rect(x, kpiY, kpiW, kpiH, 'FD');
                doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.setTextColor(...b.tx);
                doc.text(b.label, x + kpiW / 2, kpiY + 4.5, { align: 'center' });
                doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...EDARK);
                doc.text(b.value, x + kpiW / 2, kpiY + 11, { align: 'center' });
            });

            autoTable(doc, {
                startY: kpiY + kpiH + 5,
                head: [['KODE', 'NAMA AKUN', 'KELOMPOK', 'SALDO (RP)']],
                body: tableRows.map(r => [r[0], r[1], r[2], typeof r[3] === 'number' ? fmt(r[3]) : r[3]]),
                theme: 'grid',
                headStyles: { fillColor: EORANGE, textColor: EWHITE, fontStyle: 'bold', fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 18, fontSize: 8, textColor: [120,120,120] },
                    1: { cellWidth: 80 },
                    2: { cellWidth: 34, fontSize: 8 },
                    3: { cellWidth: 45, halign: 'right' },
                },
                styles: { fontSize: 8.5, cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }, lineWidth: 0.2, lineColor: EBLACK, textColor: EDARK },
                margin: { left: ML, right: MR, top: 10, bottom: 14 },
                didDrawPage: () => {
                    const pg = (doc as any).internal.getCurrentPageInfo().pageNumber;
                    doc.setDrawColor(...EORANGE); doc.setLineWidth(0.4);
                    doc.line(ML, pageH - 9, pageW - MR, pageH - 9);
                    doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(150,150,150);
                    doc.text('PT Sugiarto Jaya Mandiri · SJM Flow', ML, pageH - 5);
                    doc.text(`Halaman ${pg}`, pageW / 2, pageH - 5, { align: 'center' });
                    doc.text(footerTS, pageW - MR, pageH - 5, { align: 'right' });
                    doc.setTextColor(0,0,0);
                },
                didParseCell: (data) => {
                    const type = rowMeta[data.row.index];
                    if (!type) return;
                    if (type === 'section') {
                        data.cell.styles.fillColor = [255,243,205];
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fontSize = 9;
                        data.cell.styles.textColor = [130,80,0];
                    } else if (type === 'subtotal') {
                        data.cell.styles.fillColor = [245,245,245];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (type === 'balance') {
                        data.cell.styles.fillColor = EORANGE;
                        data.cell.styles.textColor = EWHITE;
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fontSize = 9;
                        data.cell.styles.cellPadding = 4;
                    } else if (type === 'blank') {
                        data.cell.styles.minCellHeight = 2;
                    }
                },
            });

            doc.save(`NeracaSaldo_${periodLabel.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
        }

        // ── Excel ─────────────────────────────────────────────────────────
        if (mode === 'xlsx') {
            const now = new Date();
            const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const footerTS = `Dicetak: ${dateStr} pukul ${timeStr}`;

            const wb = new ExcelJS.Workbook();
            (wb as any).properties = {
              title: 'Sales Order Report',
              creator: 'SJM Flow',
              subject: 'Logistics Management',
              keywords: 'Logistics, Transportation, Heavy Equipment, SJM Flow',
              company: 'PT Sugiarto Jaya Mandiri',
              author: 'SJM Flow',
              lastModifiedBy: 'SJM Flow'
            };
            const ws = wb.addWorksheet('Neraca Saldo');

            const addMR = (text: string, opts: any = {}) => {
                const r = ws.addRow([text, '', '', '']);
                ws.mergeCells(`A${r.number}:D${r.number}`);
                r.font = { bold: opts.bold, size: opts.size, color: opts.color ? { argb: opts.color } : undefined, italic: opts.italic };
                if (opts.align) r.getCell(1).alignment = { horizontal: opts.align };
                return r;
            };
            addMR('PT SUGIARTO JAYA MANDIRI', { bold: true, size: 14, color: 'FFFF8F00' });
            addMR('NERACA SALDO', { bold: true, size: 12 });
            addMR(`Periode: ${periodLabel}`, { size: 10 });
            ws.addRow([]);

            const hdr = ws.addRow(['KODE', 'NAMA AKUN', 'KELOMPOK', 'SALDO (RP)']);
            hdr.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            hdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8F00' } };
            hdr.eachCell(c => {
                c.border = { top:{style:'thin'}, bottom:{style:'thin'}, left:{style:'thin'}, right:{style:'thin'} };
                c.alignment = { horizontal: 'center' };
            });

            tableRows.forEach(([kode, nama, kelompok, val], i) => {
                const type = rowMeta[i];
                const v = typeof val === 'number' ? Math.round((val as number) * 100) / 100 : val;
                const row = ws.addRow([kode, nama, kelompok, v]);
                if (type === 'section') {
                    row.font = { bold: true, color: { argb: 'FF7B4500' } };
                    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
                } else if (type === 'subtotal') {
                    row.font = { bold: true };
                    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
                } else if (type === 'balance') {
                    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8F00' } };
                } else if (type === 'blank') {
                    row.height = 5;
                }
                if (type !== 'blank') {
                    row.eachCell({ includeEmpty: true }, c => {
                        c.border = { top:{style:'hair'}, bottom:{style:'hair'}, left:{style:'hair'}, right:{style:'hair'} };
                    });
                }
                if (typeof val === 'number') {
                    const c = row.getCell(4);
                    c.numFmt = '#,##0.00';
                    c.alignment = { horizontal: 'right' };
                }
            });

            ws.addRow([]);
            const tsRow = ws.addRow([footerTS, '', '', '']);
            ws.mergeCells(`A${tsRow.number}:D${tsRow.number}`);
            tsRow.font = { italic: true, size: 9, color: { argb: 'FF888888' } };
            tsRow.getCell(1).alignment = { horizontal: 'right' };

            ws.getColumn(1).width = 12;
            ws.getColumn(2).width = 42;
            ws.getColumn(3).width = 16;
            ws.getColumn(4).width = 22;

            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            a.download = `NeracaSaldo_${periodLabel.replace(/\s/g, '_')}_${now.toISOString().slice(0, 10)}.xlsx`;
            a.click(); URL.revokeObjectURL(url);
        }

        if (logAction) logAction(`Export Neraca Saldo: ${periodLabel} (${mode.toUpperCase()})`, buildMeta({ module: 'laporan', action_type: 'EXPORT', record_id: `neraca-${periodLabel}`, after_data: { format: mode, period: periodLabel } }));
        showToast(`File ${mode === 'xlsx' ? 'Excel' : 'PDF'} berhasil diunduh!`, 'success');
        } catch (err: any) {
          console.error('Export Neraca error:', err);
          showToast('Gagal mengunduh laporan. Coba lagi.', 'error');
        } finally {
          setExporting(null);
        }
    };

    const CategoryTable = ({ label, items, factor = 1 }: any) => {
        if (items.length === 0) return null;
        const subtotal = items.reduce((s: number, c: any) => s + (c.saldo * factor), 0);
        return (
            <>
                <tr className="bg-grey-100">
                    <td colSpan={4} className="px-4 py-2 font-black text-text-med text-[10px] uppercase tracking-widest">{label}</td>
                </tr>
                {items.map((r: any) => (
                    <tr key={r.id} className="hover:bg-grey-50 transition-colors group">
                        <td className="text-[11px] tabular-nums font-bold text-text-light opacity-50">{r.kode}</td>
                        <td className="text-[11px] font-bold text-text-main group-hover:text-accent transition-colors italic tracking-tight">{r.nama}</td>
                        <td className="text-[10px] text-text-light font-medium italic opacity-40">{r.kelompok}</td>
                        <td className="text-right text-[12px] tabular-nums font-bold text-text-main whitespace-nowrap">{fmt(r.saldo * factor)}</td>
                    </tr>
                ))}
                <tr>
                    <td colSpan={3} className="text-right text-[10px] font-bold text-text-light italic opacity-60">Total {label}</td>
                    <td className="text-right text-[13px] font-black text-accent tabular-nums whitespace-nowrap">{fmt(subtotal)}</td>
                </tr>
                <tr className="h-2"><td colSpan={4} className="border-b-0 bg-transparent p-0"></td></tr>
            </>
        );
    };

    return (
      <PageShell>
        <SectionHeader
          title="Posisi Keuangan"
          sub={`Trial Balance / Neraca Saldo per ${periodLabel}`}
          action={
            <div className="flex items-center gap-2">
              <div className="btn-export-group">
                <button className="text-green-brand" onClick={() => handleExportNeraca('xlsx')} disabled={exporting !== null}>
                  <Icon name="Download" size={13} /> {exporting === 'excel' ? '⏳' : 'Excel'}
                </button>
                <button className="text-red-brand" onClick={() => handleExportNeraca('pdf')} disabled={exporting !== null}>
                  <Icon name="FileText" size={13} /> {exporting === 'pdf' ? '⏳' : 'PDF'}
                </button>
              </div>
              <div className={`status-badge ${balanced ? "balanced" : "unbalanced"}`}>
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${balanced ? "bg-green-brand" : "bg-red-brand"}`}></div>
                {balanced ? "Balanced" : "Unbalanced"}
             </div>
          </div>
          }
        />
        <ActionBar left={<PeriodFilter period={period} setPeriod={setPeriod} />} />

        <KPIGrid cols={3}>
           <StatCardLocal label="Total Aset (Aktiva)" value={fmt(totalAset)} color="var(--color-blue-brand)" icon="Briefcase" />
           <StatCardLocal label="Total Passiva" value={fmt(totalPassiva)} color="var(--color-red-brand)" icon="Scale" subLabel={`Incl. Net L/R: ${fmt(netLR)}`} />
           <StatCardLocal label="Selisih Neraca" value={fmt(selisih)} color={balanced ? "var(--color-green-brand)" : "var(--color-red-brand)"} icon="Activity" subLabel={balanced ? "Struktur Data Stabil" : "Data Tidak Seimbang / Periksa Jurnal"} />
        </KPIGrid>
        
        <div className="table-container max-h-[calc(100vh-420px)]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-24">Kode</th>
                <th>Akun COA</th>
                <th className="w-32">Kategori</th>
                <th className="text-right w-44">Saldo (Rp)</th>
              </tr>
            </thead>
            <tbody>
                <CategoryTable label="Aset" items={aset} factor={1} />
                <CategoryTable label="Liabilitas" items={liab} factor={1} />
                <CategoryTable label="Ekuitas" items={eku} factor={1} />
                <CategoryTable label="Pendapatan" items={pnd} factor={1} />
                <CategoryTable label="Beban" items={bbn} factor={1} />
            </tbody>
            <tfoot>
              <tr className="bg-grey-100 border-t border-border-main/50">
                <td className="px-4 py-4" colSpan={3}>
                   <div className="flex items-center gap-2 text-[10px] font-bold text-text-light italic">
                     <Icon name="Info" size={14} className="text-accent opacity-50" />
                     Data historis dari Saldo Awal dan mutasi Jurnal Umum PT SJM
                   </div>
                </td>
                <td className="px-4 py-4 text-right">
                   <div className="flex items-center justify-end gap-2 text-[10px] font-black tracking-widest">
                      <div className={`w-2 h-2 rounded-full ${balanced ? "bg-green-brand" : "bg-red-brand"}`}></div>
                      <span className={balanced ? "text-green-brand" : "text-red-brand"}>{balanced ? "NERACA SEIMBANG" : "NERACA SELISIH"}</span>
                   </div>
                </td>
              </tr>
            </tfoot>
          </table>
          </div>
      </PageShell>
    );
  }

  if (activeSub === "labarugi") {
    const { 
        pndJasa, pndLain, bpp, kend, opr, fin, tax,
        totPnd, totBpp, labaKotor, totKend, labaSetKend, totOpr, labaUsaha, totFin, labaSebPajak, totTax, labaBersih 
    } = calcLabaRugi;

    const SectionHeaderRow = ({ label }: any) => (
       <tr className="bg-grey-100">
          <td />
          <td colSpan={2} className="py-2 font-black text-text-med text-[10px] uppercase tracking-widest">{label}</td>
       </tr>
    );

    const ItemRow = ({ kode, nama, val, indent = false }: any) => (
       <tr className="hover:bg-grey-50 transition-colors group">
          <td className="text-[10px] text-text-light tabular-nums font-bold opacity-50 w-24">{kode}</td>
          <td className={`text-[11px] font-bold text-text-main group-hover:text-accent transition-colors italic tracking-tight ${indent ? "pl-8" : ""}`}>{nama}</td>
          <td className="text-right tabular-nums text-[12px] font-bold text-text-main whitespace-nowrap">{fmt(val)}</td>
       </tr>
    );

    const SummaryRow = ({ label, val, highlight = false }: any) => (
       <tr className={highlight ? "bg-accent/5" : ""}>
          <td />
          <td className={`font-bold text-text-main ${highlight ? "text-[11px]" : "text-[10px] text-text-light opacity-60 italic"}`}>{label}</td>
          <td className={`text-right tabular-nums font-bold whitespace-nowrap ${highlight ? "text-[14px] text-accent" : "text-[12px] text-text-med"}`}>{fmt(val)}</td>
       </tr>
    );

    const periodLabel = getPeriodText();

    const handleExportLR = async (mode: 'pdf' | 'xlsx') => {
        if (exporting) return;
        setExporting(mode === 'xlsx' ? 'excel' : 'pdf');
        try {
        // ── shared data builder ───────────────────────────────────────────
        type RowType = 'section' | 'item' | 'subtotal' | 'highlight' | 'total' | 'blank';
        const tableRows: [string, string, number | string][] = [];
        const rowMeta:   RowType[] = [];

        const addSection  = (label: string)                    => { tableRows.push(['', label, '']);                      rowMeta.push('section'); };
        const addItem     = (kode: string, nama: string, v: number) => { tableRows.push([kode, `  ${nama}`, v]);          rowMeta.push('item'); };
        const addSubtotal = (label: string, v: number)         => { tableRows.push(['', label, v]);                       rowMeta.push('subtotal'); };
        const addHighlight= (label: string, v: number)         => { tableRows.push(['', label, v]);                       rowMeta.push('highlight'); };
        const addBlank    = ()                                  => { tableRows.push(['', '', '']);                         rowMeta.push('blank'); };
        const addTotal    = (label: string, v: number)         => { tableRows.push(['', label, v]);                       rowMeta.push('total'); };

        addSection('PENDAPATAN OPERASIONAL');
        pndJasa.forEach(c => addItem(c.kode, c.nama, Math.abs(c.saldo)));
        pndLain.forEach(c => addItem(c.kode, c.nama, Math.abs(c.saldo)));
        addSubtotal('Total Pendapatan Operasional', totPnd);
        addBlank();

        addSection('BEBAN POKOK PENDAPATAN (BPP)');
        bpp.forEach(c => addItem(c.kode, c.nama, Math.abs(c.saldo)));
        addSubtotal('Total Beban Pokok', totBpp);
        addHighlight('LABA KOTOR (GROSS PROFIT)', labaKotor);
        addBlank();

        addSection('BIAYA OPERASIONAL KENDARAAN');
        kend.forEach(c => addItem(c.kode, c.nama, Math.abs(c.saldo)));
        addSubtotal('Total Biaya Armada', totKend);
        addHighlight('LABA SETELAH BIAYA KENDARAAN', labaSetKend);
        addBlank();

        addSection('BEBAN UMUM & ADMINISTRASI');
        opr.forEach(c => addItem(c.kode, c.nama, Math.abs(c.saldo)));
        addSubtotal('Total Beban Umum', totOpr);
        addHighlight('LABA USAHA (EBIT)', labaUsaha);
        addBlank();

        if (fin.length > 0) {
            addSection('BEBAN KEUANGAN & BUNGA');
            fin.forEach(c => addItem(c.kode, c.nama, Math.abs(c.saldo)));
            addSubtotal('Total Beban Keuangan', totFin);
            addBlank();
        }
        addSubtotal('LABA SEBELUM PAJAK', labaSebPajak);

        if (tax.length > 0) {
            addBlank();
            addSection('ESTIMASI PAJAK');
            tax.forEach(c => addItem(c.kode, c.nama, Math.abs(c.saldo)));
            addSubtotal('Total Beban Pajak', totTax);
        }

        addBlank();
        addTotal('LABA BERSIH PERIODE BERJALAN', labaBersih);

        // ── PDF ───────────────────────────────────────────────────────────
        if (mode === 'pdf') {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            doc.setProperties({
              title: 'Sales Order Report',
              author: 'SJM Flow',
              company: 'PT Sugiarto Jaya Mandiri',
              creator: 'SJM Flow',
              producer: 'SJM Flow',
              subject: 'Logistics Management',
              keywords: 'Logistics, Transportation, Heavy Equipment, SJM Flow'
            } as any);
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const ML = 10, MR = 10;
            const EORANGE: [number,number,number] = [255,143,0];
            const EWHITE:  [number,number,number] = [255,255,255];
            const EBLACK:  [number,number,number] = [0,0,0];

            const now = new Date();
            const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const footerTS = `Dicetak: ${dateStr} pukul ${timeStr}`;

            // BB-style header
            doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...EORANGE);
            doc.text('PT SUGIARTO JAYA MANDIRI', ML, 12);
            doc.setFontSize(11); doc.setTextColor(40,40,40);
            doc.text('LAPORAN LABA RUGI', ML, 20);
            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(40,40,40);
            doc.text(`Periode: ${periodLabel}`, ML, 26);
            doc.setDrawColor(...EORANGE); doc.setLineWidth(0.8);
            doc.line(ML, 30, pageW - MR, 30);

            // KPI boxes
            const kpiY = 34, kpiH = 14, kpiW = (pageW - ML - MR - 8) / 3;
            ([
                { label: 'TOTAL PENDAPATAN', value: fmt(totPnd),      fill: [240,248,255] as [number,number,number], stroke: [70,130,180] as [number,number,number], tx: [70,130,180] as [number,number,number] },
                { label: 'TOTAL BEBAN',      value: fmt(totBpp+totKend+totOpr+totFin+totTax), fill: [255,235,235] as [number,number,number], stroke: [180,0,0] as [number,number,number], tx: [180,0,0] as [number,number,number] },
                { label: 'LABA BERSIH',      value: fmt(labaBersih),  fill: labaBersih >= 0 ? [240,255,240] as [number,number,number] : [255,235,235] as [number,number,number], stroke: labaBersih >= 0 ? [34,139,34] as [number,number,number] : [200,0,0] as [number,number,number], tx: labaBersih >= 0 ? [34,139,34] as [number,number,number] : [200,0,0] as [number,number,number] },
            ]).forEach((b, i) => {
                const x = ML + i * (kpiW + 4);
                doc.setFillColor(...b.fill); doc.setDrawColor(...b.stroke); doc.setLineWidth(0.3);
                doc.rect(x, kpiY, kpiW, kpiH, 'FD');
                doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.setTextColor(...b.tx);
                doc.text(b.label, x + kpiW / 2, kpiY + 4.5, { align: 'center' });
                doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...EBLACK);
                doc.text(b.value, x + kpiW / 2, kpiY + 11, { align: 'center' });
            });

            autoTable(doc, {
                startY: kpiY + kpiH + 5,
                head: [['KODE', 'NAMA AKUN / POS KEUANGAN', 'JUMLAH (RP)']],
                body: tableRows.map(r => [r[0], r[1], typeof r[2] === 'number' ? fmt(r[2]) : r[2]]),
                theme: 'grid',
                headStyles: { fillColor: EORANGE, textColor: EWHITE, fontStyle: 'bold', fontSize: 9, cellPadding: { top:3, bottom:3, left:4, right:4 }, halign: 'left' },
                columnStyles: {
                    0: { cellWidth: 20, fontSize: 8, textColor: [120,120,120] },
                    1: { cellWidth: 120 },
                    2: { cellWidth: 42, halign: 'right' },
                },
                styles: { fontSize: 8.5, cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }, lineWidth: 0.2, lineColor: EBLACK, textColor: [40,40,40] },
                margin: { left: ML, right: MR, top: 10, bottom: 14 },
                didDrawPage: () => {
                    const pg = (doc as any).internal.getCurrentPageInfo().pageNumber;
                    doc.setDrawColor(...EORANGE); doc.setLineWidth(0.4);
                    doc.line(ML, pageH - 9, pageW - MR, pageH - 9);
                    doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(150,150,150);
                    doc.text('PT Sugiarto Jaya Mandiri · SJM Flow', ML, pageH - 5);
                    doc.text(`Halaman ${pg}`, pageW / 2, pageH - 5, { align: 'center' });
                    doc.text(footerTS, pageW - MR, pageH - 5, { align: 'right' });
                    doc.setTextColor(0,0,0);
                },
                didParseCell: (data) => {
                    const type = rowMeta[data.row.index];
                    if (!type) return;
                    if (type === 'section') {
                        data.cell.styles.fillColor = [255,243,205];
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fontSize = 9;
                        data.cell.styles.textColor = [130,80,0];
                    } else if (type === 'subtotal') {
                        data.cell.styles.fillColor = [245,245,245];
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.textColor = [60,60,60];
                    } else if (type === 'highlight') {
                        data.cell.styles.fillColor = [232,245,233];
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.textColor = [27,94,32];
                        data.cell.styles.fontSize = 9;
                    } else if (type === 'total') {
                        data.cell.styles.fillColor = EORANGE;
                        data.cell.styles.textColor = EWHITE;
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fontSize = 11;
                        data.cell.styles.cellPadding = 5;
                    } else if (type === 'blank') {
                        data.cell.styles.fillColor = [255,255,255];
                        data.cell.styles.minCellHeight = 2;
                    }
                },
            });

            doc.save(`LabaRugi_${periodLabel.replace(/\s/g, '_')}_${now.toISOString().slice(0, 10)}.pdf`);
        }

        // ── Excel ─────────────────────────────────────────────────────────
        if (mode === 'xlsx') {
            const now = new Date();
            const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const footerTS = `Dicetak: ${dateStr} pukul ${timeStr}`;

            const wb = new ExcelJS.Workbook();
            (wb as any).properties = {
              title: 'Sales Order Report',
              creator: 'SJM Flow',
              subject: 'Logistics Management',
              keywords: 'Logistics, Transportation, Heavy Equipment, SJM Flow',
              company: 'PT Sugiarto Jaya Mandiri',
              author: 'SJM Flow',
              lastModifiedBy: 'SJM Flow'
            };
            const ws = wb.addWorksheet('Laba Rugi');

            const addMR = (text: string, opts: any = {}) => {
                const r = ws.addRow([text, '', '']);
                ws.mergeCells(`A${r.number}:C${r.number}`);
                r.font = { bold: opts.bold, size: opts.size, color: opts.color ? { argb: opts.color } : undefined, italic: opts.italic };
                if (opts.align) r.getCell(1).alignment = { horizontal: opts.align };
                return r;
            };
            addMR('PT SUGIARTO JAYA MANDIRI', { bold: true, size: 14, color: 'FFFF8F00' });
            addMR('LAPORAN LABA RUGI', { bold: true, size: 12 });
            addMR(`Periode: ${periodLabel}`, { size: 10 });
            ws.addRow([]);

            const hdr = ws.addRow(['KODE', 'NAMA AKUN / POS KEUANGAN', 'JUMLAH (RP)']);
            hdr.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            hdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8F00' } };
            hdr.eachCell(c => {
                c.border = { top:{style:'thin'}, bottom:{style:'thin'}, left:{style:'thin'}, right:{style:'thin'} };
                c.alignment = { horizontal: 'center' };
            });

            tableRows.forEach(([kode, nama, val], i) => {
                const type = rowMeta[i];
                const v = typeof val === 'number' ? Math.round((val as number) * 100) / 100 : val;
                const row = ws.addRow([kode, nama, v]);
                if (type === 'section') {
                    row.font = { bold: true, color: { argb: 'FF7B4500' } };
                    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
                } else if (type === 'subtotal') {
                    row.font = { bold: true };
                    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
                } else if (type === 'highlight') {
                    row.font = { bold: true, color: { argb: 'FF1B5E20' } };
                    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
                } else if (type === 'total') {
                    row.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
                    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8F00' } };
                    row.height = 20;
                } else if (type === 'blank') {
                    row.height = 5;
                }
                if (type !== 'blank') {
                    row.eachCell({ includeEmpty: true }, c => {
                        c.border = { top:{style:'hair'}, bottom:{style:'hair'}, left:{style:'hair'}, right:{style:'hair'} };
                    });
                }
                if (typeof val === 'number') {
                    const c = row.getCell(3);
                    c.numFmt = '#,##0.00';
                    c.alignment = { horizontal: 'right' };
                }
            });

            ws.addRow([]);
            const tsRow = ws.addRow([footerTS, '', '']);
            ws.mergeCells(`A${tsRow.number}:C${tsRow.number}`);
            tsRow.font = { italic: true, size: 9, color: { argb: 'FF888888' } };
            tsRow.getCell(1).alignment = { horizontal: 'right' };

            ws.getColumn(1).width = 12;
            ws.getColumn(2).width = 50;
            ws.getColumn(3).width = 22;

            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            a.download = `LabaRugi_${periodLabel.replace(/\s/g, '_')}_${now.toISOString().slice(0, 10)}.xlsx`;
            a.click(); URL.revokeObjectURL(url);
        }

        if (logAction) logAction(`Export Laba Rugi: ${periodLabel} (${mode.toUpperCase()})`, buildMeta({ module: 'laporan', action_type: 'EXPORT', record_id: `labarugi-${periodLabel}`, after_data: { format: mode, period: periodLabel } }));
        showToast(`File ${mode === 'xlsx' ? 'Excel' : 'PDF'} berhasil diunduh!`, 'success');
        } catch (err: any) {
          console.error('Export LabaRugi error:', err);
          showToast('Gagal mengunduh laporan. Coba lagi.', 'error');
        } finally {
          setExporting(null);
        }
    };

    return (
      <PageShell>
        <SectionHeader
          title="Kinerja Operasional"
          sub={`Laporan Laba Rugi periode ${periodLabel}`}
          action={
            <div className="btn-export-group">
              <button className="text-green-brand" onClick={() => handleExportLR('xlsx')} disabled={exporting !== null}>
                <Icon name="Download" size={13} /> {exporting === 'excel' ? '⏳' : 'Excel'}
              </button>
              <button className="text-red-brand" onClick={() => handleExportLR('pdf')} disabled={exporting !== null}>
                <Icon name="FileText" size={13} /> {exporting === 'pdf' ? '⏳' : 'PDF'}
              </button>
            </div>
          }
        />
        <ActionBar left={<PeriodFilter period={period} setPeriod={setPeriod} />} />

        <KPIGrid cols={3}>
           <StatCardLocal label="Total Pendapatan" value={fmt(totPnd)} color="var(--color-blue-brand)" icon="TrendingUp" variant="asset" />
           <StatCardLocal label="Total Seluruh Beban" value={fmt(totBpp + totKend + totOpr + totFin + totTax)} color="var(--color-red-brand)" icon="TrendingDown" variant="liability" />
           <StatCardLocal label="Laba Rugi Bersih" value={fmt(labaBersih)} color={labaBersih >= 0 ? "var(--color-green-brand)" : "var(--color-red-brand)"} icon="CheckCircle" variant={labaBersih >= 0 ? "balance-positive" : "balance-negative"} />
        </KPIGrid>

        <div className="table-container max-h-[calc(100vh-420px)]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-24">KODE</th>
                <th>RINCIAN POS KEUANGAN</th>
                <th className="text-right w-56">JUMLAH (RP)</th>
              </tr>
            </thead>
            <tbody>
              <SectionHeaderRow label="PENDAPATAN" />
              {pndJasa.map(c => <ItemRow key={c.id} kode={c.kode} nama={c.nama} val={Math.abs(c.saldo)} indent />)}
              {pndLain.map(c => <ItemRow key={c.id} kode={c.kode} nama={c.nama} val={Math.abs(c.saldo)} indent />)}
              <SummaryRow label="Total Pendapatan Operasional" val={totPnd} />

              <SectionHeaderRow label="BEBAN POKOK PENDAPATAN (BPP)" />
              {bpp.map(c => <ItemRow key={c.id} kode={c.kode} nama={c.nama} val={Math.abs(c.saldo)} />)}
              <SummaryRow label="Total Beban Pokok" val={totBpp} />
              <SummaryRow label="LABA KOTOR (GROSS PROFIT)" val={labaKotor} highlight />

              <SectionHeaderRow label="BIAYA OPERASIONAL KENDARAAN" />
              {kend.map(c => <ItemRow key={c.id} kode={c.kode} nama={c.nama} val={Math.abs(c.saldo)} />)}
              <SummaryRow label="Total Biaya Armada" val={totKend} />
              <SummaryRow label="LABA SETELAH BIAYA KENDARAAN" val={labaSetKend} highlight />

              <SectionHeaderRow label="BEBAN UMUM & ADMINISTRASI" />
              {opr.map(c => <ItemRow key={c.id} kode={c.kode} nama={c.nama} val={Math.abs(c.saldo)} />)}
              <SummaryRow label="Total Beban Umum" val={totOpr} />
              <SummaryRow label="LABA USAHA (EBIT)" val={labaUsaha} highlight />

              {fin.length > 0 && <SectionHeaderRow label="BEBAN KEUANGAN & BUNGA" />}
              {fin.map(c => <ItemRow key={c.id} kode={c.kode} nama={c.nama} val={Math.abs(c.saldo)} />)}
              {fin.length > 0 && <SummaryRow label="Total Beban Keuangan" val={totFin} />}
              <SummaryRow label="LABA SEBELUM PAJAK" val={labaSebPajak} highlight />

              {tax.length > 0 && <SectionHeaderRow label="ESTIMASI PAJAK" />}
              {tax.map(c => <ItemRow key={c.id} kode={c.kode} nama={c.nama} val={Math.abs(c.saldo)} />)}
              {tax.length > 0 && <SummaryRow label="Total Beban Pajak" val={totTax} />}

              <tr className="bg-accent shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)]">
                <td />
                <td className="py-4 px-4 text-[12px] font-bold text-white italic">Laba Bersih Periode Berjalan</td>
                <td className="py-4 px-4 text-right text-[18px] font-black text-white tabular-nums">{fmt(labaBersih)}</td>
              </tr>
            </tbody>
          </table>
          </div>
      </PageShell>
    );
  }

  if (activeSub === "profit") {
    const totalRevenue = tbProfit.reduce((s, p) => s + p.revenue, 0);
    const totalExpense = tbProfit.reduce((s, p) => s + p.expense, 0);
    const totalProfit = totalRevenue - totalExpense;

    return (
      <PageShell>
        <SectionHeader
          title="Analisis Profit Muatan"
          sub="Pemantauan margin keuntungan real-time per order"
          action={
            <div className="btn-export-group">
              <button className="text-green-brand" onClick={() => exportExcel("Profitabilitas_Muatan", tbProfit, ["order_id", "customer", "revenue", "expense", "profit"])} disabled={exporting !== null}>
                <Icon name="Download" size={13} /> {exporting === 'excel' ? '⏳' : 'Excel'}
              </button>
              <button className="text-red-brand" onClick={() => exportPDF("Profitabilitas Muatan", tbProfit, ["order_id", "tgl", "customer", "revenue", "expense", "profit"])} disabled={exporting !== null}>
                <Icon name="FileText" size={13} /> {exporting === 'pdf' ? '⏳' : 'PDF'}
              </button>
            </div>
          }
        />
        <ActionBar left={<PeriodFilter period={period} setPeriod={setPeriod} />} />

        <KPIGrid cols={3}>
           <StatCardLocal label="Nilai Muatan (Revenue)" value={fmt(totalRevenue)} color="var(--color-blue-brand)" icon="TrendingUp" variant="asset" />
           <StatCardLocal label="Beban Muatan (Expense)" value={fmt(totalExpense)} color="var(--color-red-brand)" icon="TrendingDown" variant="liability" />
           <StatCardLocal label="Profit Bruto" value={fmt(totalProfit)} color={totalProfit >= 0 ? "var(--color-green-brand)" : "var(--color-red-brand)"} icon="PieChart" subLabel={`Berdasarkan analisis ${tbProfit.length} order muatan`} variant={totalProfit >= 0 ? "balance-positive" : "balance-negative"} />
        </KPIGrid>

        <div className="table-container max-h-[calc(100vh-420px)]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th>ORDER ID</th>
                  <th>MITRA CUSTOMER</th>
                  <th className="text-right min-w-[160px]">REVENUE</th>
                  <th className="text-right min-w-[160px]">EXPENSE</th>
                  <th className="text-right min-w-[160px]">PROFIT</th>
                  <th className="text-right w-32">MARGIN</th>
                </tr>
              </thead>
              <tbody>
                {tbProfit.length === 0 ? <EmptyState colSpan={6} /> :
                 tbProfit.map((p: any, i:number) => (
                   <tr key={i} className="transition-colors cursor-pointer group" onClick={() => onSOClick && onSOClick(p.order_id)}>
                      <td className="text-[11px] font-black text-accent group-hover:underline underline-offset-4 decoration-accent/30">{p.order_id}</td>
                      <td className="text-[11px] font-bold text-text-main uppercase tracking-tight">{p.customer}</td>
                      <td className="text-right tabular-nums text-[11px] font-medium whitespace-nowrap">{fmt(p.revenue)}</td>
                      <td className="text-right tabular-nums text-[11px] font-medium text-red-brand/70 whitespace-nowrap">{fmt(p.expense)}</td>
                      <td className={`text-right tabular-nums text-[12px] font-black whitespace-nowrap ${p.profit >= 0 ? "text-green-brand" : "text-red-brand"}`}>{fmt(p.profit)}</td>
                      <td className="text-right">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest uppercase border ${p.margin >= 0 ? "bg-green-brand/5 text-green-brand border-green-brand/10" : "bg-red-brand/5 text-red-brand border-red-brand/10"}`}>
                           {Math.round(p.margin)}%
                        </span>
                      </td>
                   </tr>
                 ))}
              </tbody>
            </table>
          </div>
      </PageShell>
    );
  }

  if (activeSub === "audit") {
    const filteredLogs = (auditLogs || []).filter((l: any) => {
      const meta = (() => { try { return typeof l.metadata === 'string' ? JSON.parse(l.metadata) : (l.metadata || {}); } catch { return {}; } })();
      const q = search.toLowerCase();
      return !search ||
        l.user_name?.toLowerCase().includes(q) ||
        l.user_email?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q) ||
        meta.record_id?.toLowerCase().includes(q) ||
        meta.module?.toLowerCase().includes(q);
    });

    const parseMeta = (raw: any) => {
      try { return typeof raw === 'string' ? JSON.parse(raw) : (raw || {}); } catch { return {}; }
    };

    const detailMeta = auditDetailLog ? parseMeta(auditDetailLog.metadata) : null;

    return (
      <PageShell>
        {/* Before/After detail modal */}
        {auditDetailLog && detailMeta && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/40 backdrop-blur-sm" onClick={() => setAuditDetailLog(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-border-main flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-text-main tracking-tight">Detail Perubahan Data</h3>
                  <div className="text-[10px] font-bold text-accent tracking-widest mt-0.5">{auditDetailLog.action}</div>
                </div>
                <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors" onClick={() => setAuditDetailLog(null)}>
                  <Icon name="X" size={16} className="text-text-med" />
                </button>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4 max-h-[60vh] overflow-auto">
                <div>
                  <div className="text-[9px] font-black text-text-light uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-brand inline-block" />
                    SEBELUM
                  </div>
                  {detailMeta.before_data ? (
                    <pre className="text-[10px] font-mono text-text-med bg-red-brand/5 border border-red-brand/20 rounded-xl p-3 overflow-auto leading-relaxed whitespace-pre-wrap break-all">
                      {JSON.stringify(detailMeta.before_data, null, 2)}
                    </pre>
                  ) : (
                    <div className="flex items-center justify-center h-20 rounded-xl bg-slate-50 border border-dashed border-border-main text-text-light text-[10px] italic opacity-50">Record baru — tidak ada data sebelumnya</div>
                  )}
                </div>
                <div>
                  <div className="text-[9px] font-black text-text-light uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-brand inline-block" />
                    SESUDAH
                  </div>
                  {detailMeta.after_data ? (
                    <pre className="text-[10px] font-mono text-text-med bg-green-brand/5 border border-green-brand/20 rounded-xl p-3 overflow-auto leading-relaxed whitespace-pre-wrap break-all">
                      {JSON.stringify(detailMeta.after_data, null, 2)}
                    </pre>
                  ) : (
                    <div className="flex items-center justify-center h-20 rounded-xl bg-slate-50 border border-dashed border-border-main text-text-light text-[10px] italic opacity-50">Record dihapus — tidak ada data sesudah</div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-border-main bg-slate-50/50 flex justify-between items-center">
                <div className="text-[9px] font-bold text-text-light opacity-50">
                  {new Date(auditDetailLog.timestamp || auditDetailLog.created_at).toLocaleString("id-ID")} · {auditDetailLog.user_name}
                </div>
                <button className="btn-ghost text-[10px]" onClick={() => setAuditDetailLog(null)}>Tutup</button>
              </div>
            </div>
          </div>
        )}
        <SectionHeader title="Log Aktivitas User" sub="Catatan riwayat penggunaan dan mutasi data aplikasi" />
        <ActionBar
          left={
            <div className="relative">
              <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light opacity-50" />
              <input
                className="input-field h-10 pl-9 w-72 text-[12px]"
                placeholder="Cari user, aktivitas, atau record ID..."
                value={search || ""}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          }
          right={search ? (
            <button className="btn-ghost" onClick={() => setSearch("")}>
              <Icon name="X" size={12} /> Reset
            </button>
          ) : undefined}
        />

        <div className="table-container max-h-[calc(100vh-340px)]">
           <table className="w-full border-collapse">
              <thead>
                 <tr>
                    <th className="w-40">WAKTU</th>
                    <th className="w-48">PELAKSANA</th>
                    <th className="w-28">MODUL / TIPE</th>
                    <th>DESKRIPSI</th>
                    <th className="w-32">RECORD ID</th>
                    <th className="w-16 text-center">DETAIL</th>
                 </tr>
              </thead>
              <tbody>
                 {filteredLogs.length === 0 ? <EmptyState colSpan={6} /> :
                  filteredLogs.map((log: any, idx: number) => {
                    const meta = parseMeta(log.metadata);
                    const actionType = (meta.action_type || "") as ActionType;
                    const moduleKey = (meta.module || "") as ModuleKey;
                    const hasDetail = meta.before_data || meta.after_data;
                    return (
                      <tr key={log.id || idx} className="group transition-colors">
                         <td className="text-[10px] text-text-light tabular-nums font-medium opacity-60 whitespace-nowrap">
                            {new Date(log.timestamp || log.created_at).toLocaleString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                         </td>
                         <td>
                            <div className="font-black text-text-main text-[11px] leading-tight uppercase">{log.user_name}</div>
                            <div className="text-[9px] font-bold text-text-light tracking-widest uppercase mt-0.5 opacity-40">{log.user_email}</div>
                         </td>
                         <td>
                            <div className="flex flex-col gap-1">
                              {actionType ? (
                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase w-fit ${ACTION_COLORS[actionType] || 'bg-slate-100/80 text-text-light'}`}>
                                  {ACTION_LABELS[actionType] || actionType}
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase w-fit bg-slate-100/80 text-text-light">
                                  {log.action?.includes("Hapus") ? "DELETE" : log.action?.includes("Buat") || log.action?.includes("Create") ? "CREATE" : log.action?.includes("Update") ? "UPDATE" : "INFO"}
                                </span>
                              )}
                              {moduleKey && (
                                <span className="text-[8px] font-bold text-text-light opacity-50 uppercase tracking-widest">{MODULE_LABELS[moduleKey] || moduleKey}</span>
                              )}
                            </div>
                         </td>
                         <td>
                            <span className="font-bold text-text-med text-[11px] truncate max-w-xs block">{log.action}</span>
                         </td>
                         <td>
                            {meta.record_id ? (
                              <span className="text-[10px] font-black text-accent uppercase tracking-tight">{meta.record_id}</span>
                            ) : <span className="text-text-light text-[10px] italic opacity-30">—</span>}
                         </td>
                         <td className="text-center">
                            {hasDetail ? (
                              <button
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-accent hover:text-white flex items-center justify-center mx-auto transition-colors text-text-light"
                                onClick={() => setAuditDetailLog(log)}
                                title="Lihat Before/After"
                              >
                                <Icon name="Eye" size={12} />
                              </button>
                            ) : <span className="text-text-light text-[10px] italic opacity-30">—</span>}
                         </td>
                      </tr>
                    );
                  })
                 }
              </tbody>
           </table>
           </div>
      </PageShell>
    );
  }

  if (activeSub === "bukubesar") {
    const activeCoa = coa.find((c: any) => c.kode === selectedCoa) || coa[0];
    const isDebitAccount = activeCoa?.normal_balance === "Debit";
    
    // 1. Calculate Opening Balance (SB)
    // Start with Saldo Awal for this specific account
    const sa = (saldoAwal || []).find((s: any) => s.coa_kode === activeCoa?.kode);
    const baseSA = sa ? (isDebitAccount ? Number(sa.debit || 0) - Number(sa.kredit || 0) : Number(sa.kredit || 0) - Number(sa.debit || 0)) : 0;
    
    // Sum all mutations before the current period start
    const openingBalance = (jurnal || []).reduce((acc: number, j: any) => {
      const jDate = (j.tanggal || "").slice(0, 10);
      const isBefore =
        period.mode === "month"
          ? (new Date(jDate).getFullYear() < period.year ||
             (new Date(jDate).getFullYear() === period.year && new Date(jDate).getMonth() < period.month))
          : period.mode === "year"
            ? new Date(jDate).getFullYear() < period.year
            : period.mode === "day"
              ? jDate < (period.day || "")
              : period.mode === "range"
                ? jDate < (period.rangeFrom || "")
                : false; // "all" — tidak ada periode sebelumnya

      if (!isBefore) return acc;
      
      const details = (j.jurnal_detail || []).filter((d: any) => d.coa_kode === activeCoa?.kode);
      const delta = details.reduce((s: number, d: any) => {
          const change = Number(d.debit || 0) - Number(d.kredit || 0);
          return s + (isDebitAccount ? change : -change);
      }, 0);
      return acc + delta;
    }, baseSA);

    // 2. Filter current mutations
    const mutations = (filteredJurnal || []).flatMap((j: any) => 
      (j.jurnal_detail || [])
        .filter((d: any) => d.coa_kode === activeCoa?.kode)
        .map((d: any) => ({
          tanggal: j.tanggal,
          noJurnal: j.no_jurnal || j.id,
          keterangan: j.keterangan || d.keterangan,
          debit: Number(d.debit || 0),
          kredit: Number(d.kredit || 0)
        }))
    ).sort((a: any, b: any) =>
      a.tanggal.localeCompare(b.tanggal) || a.noJurnal.localeCompare(b.noJurnal)
    );

    // 3. Compute running balance
    let currentBalance = openingBalance;
    const rowsWithBalance = mutations.map((m: any) => {
      const val = m.debit - m.kredit;
      currentBalance += isDebitAccount ? val : -val;
      return { ...m, saldo: currentBalance };
    });

    // ── Buku Besar export helpers ────────────────────────────────────────────
    const bbTotalDebit  = rowsWithBalance.reduce((s: number, m: any) => s + (m.debit  || 0), 0);
    const bbTotalKredit = rowsWithBalance.reduce((s: number, m: any) => s + (m.kredit || 0), 0);

    // OPENING row + transaction rows for exports
    const bbTransactions = [
      { tanggal: null, noJurnal: 'OPENING', keterangan: 'Saldo Awal / Mutasi Kumulatif', debit: 0, kredit: 0, saldo: openingBalance },
      ...rowsWithBalance,
    ];

    const fRp = (n: number) => {
      if (!n || n === 0) return '-';
      return 'Rp. ' + (Math.round(n * 100) / 100).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const fRpOrDash = (n: number) => (!n || n === 0 ? '-' : fRp(n));

    const bbTimestamp = (d: Date) =>
      d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) +
      ' pukul ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const handleExportBukuBesarPDF = () => {
      if (exporting) return;
      setExporting('pdf');
      try {
      const doc = new jsPDF('landscape', 'pt', 'a4');
      doc.setProperties({
        title: 'Sales Order Report',
        author: 'SJM Flow',
        company: 'PT Sugiarto Jaya Mandiri',
        creator: 'SJM Flow',
        producer: 'SJM Flow',
        subject: 'Logistics Management',
        keywords: 'Logistics, Transportation, Heavy Equipment, SJM Flow'
      } as any);
      const PW = doc.internal.pageSize.width;
      const PH = doc.internal.pageSize.height;
      const ML = 30, MR = 30;
      const now = new Date();
      const ts = bbTimestamp(now);
      const periodLabel = getPeriodText();

      // Header
      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 143, 0);
      doc.text('PT SUGIARTO JAYA MANDIRI', PW / 2, 35, { align: 'center' });
      doc.setFontSize(12); doc.setTextColor(0, 0, 0);
      doc.text('BUKU BESAR', PW / 2, 52, { align: 'center' });
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      doc.text(`Akun: ${activeCoa?.kode || ''} — ${activeCoa?.nama || ''}`, PW / 2, 67, { align: 'center' });
      doc.text(`Periode: ${periodLabel}`, PW / 2, 80, { align: 'center' });
      doc.setDrawColor(255, 143, 0); doc.setLineWidth(1.5);
      doc.line(ML, 90, PW - MR, 90);

      // KPI boxes
      const kpiY = 105, kpiW = (PW - ML - MR - 20) / 3;
      const kpiBoxes = [
        { label: 'SALDO AWAL PERIODE',  value: fRp(openingBalance),  fill: [240,248,255] as [number,number,number], stroke: [70,130,180]  as [number,number,number], tx: [70,130,180]  as [number,number,number] },
        { label: 'NET MUTASI PERIODE',  value: fRp(bbTotalDebit - bbTotalKredit), fill: [240,255,240] as [number,number,number], stroke: [34,139,34]  as [number,number,number], tx: [34,139,34]  as [number,number,number] },
        { label: 'SALDO AKHIR PERIODE', value: fRp(currentBalance),  fill: [255,248,220] as [number,number,number], stroke: [218,165,32] as [number,number,number], tx: [218,165,32] as [number,number,number] },
      ];
      kpiBoxes.forEach((b, i) => {
        const x = ML + i * (kpiW + 10);
        doc.setFillColor(...b.fill); doc.setDrawColor(...b.stroke); doc.setLineWidth(0.5);
        doc.rect(x, kpiY, kpiW, 40, 'FD');
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...b.tx);
        doc.text(b.label, x + kpiW / 2, kpiY + 12, { align: 'center' });
        doc.setFontSize(10); doc.setTextColor(0, 0, 0);
        doc.text(b.value, x + kpiW / 2, kpiY + 28, { align: 'center' });
      });

      // Main table
      autoTable(doc, {
        startY: kpiY + 50,
        head: [['Tanggal', 'No. Jurnal', 'Keterangan Transaksi', 'Debit', 'Kredit', 'Saldo']],
        body: bbTransactions.map(t => [
          t.tanggal || '-',
          t.noJurnal || 'OPENING',
          t.keterangan || '-',
          fRpOrDash(t.debit),
          fRpOrDash(t.kredit),
          fRp(Math.round(t.saldo * 100) / 100),
        ]),
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 3, overflow: 'linebreak', lineColor: [200,200,200], lineWidth: 0.3, textColor: [0,0,0] },
        headStyles: { fillColor: [255,143,0], textColor: [255,255,255], fontStyle: 'bold', halign: 'center', fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 70,  halign: 'center' },
          1: { cellWidth: 110 },
          2: { cellWidth: 280 },
          3: { cellWidth: 100, halign: 'right' },
          4: { cellWidth: 100, halign: 'right' },
          5: { cellWidth: 110, halign: 'right', fontStyle: 'bold' },
        },
        alternateRowStyles: { fillColor: [250,250,250] },
        didParseCell: (data: any) => {
          if (data.row.index === 0 && data.section === 'body') {
            data.cell.styles.fillColor = [255,250,230];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [150,100,0];
          }
        },
        margin: { left: ML, right: MR, top: kpiY + 55 },
      });

      // Total summary table
      const finalY = (doc as any).lastAutoTable.finalY;
      autoTable(doc, {
        startY: finalY + 10,
        body: [['', '', 'TOTAL MUTASI', fRp(bbTotalDebit), fRp(bbTotalKredit), '']],
        theme: 'plain',
        styles: { fontSize: 8, fontStyle: 'bold', fillColor: [240,240,240], cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 70  },
          1: { cellWidth: 110 },
          2: { cellWidth: 280, halign: 'right' },
          3: { cellWidth: 100, halign: 'right', textColor: [0,150,0] },
          4: { cellWidth: 100, halign: 'right', textColor: [200,0,0] },
          5: { cellWidth: 110 },
        },
        margin: { left: ML, right: MR },
      });

      // Footer on every page
      const totalPages = (doc as any).internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(255,143,0); doc.setLineWidth(0.5);
        doc.line(ML, PH - 25, PW - MR, PH - 25);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(150,150,150);
        doc.text(`Halaman ${i} dari ${totalPages}`, PW / 2, PH - 15, { align: 'center' });
        doc.text(`Dicetak: ${ts}`, PW - MR, PH - 15, { align: 'right' });
      }

      doc.save(`BukuBesar_${activeCoa?.kode}_${now.toISOString().split('T')[0]}.pdf`);
      showToast('File PDF berhasil diunduh!', 'success');
      } catch (err: any) {
        console.error('Export BukuBesar PDF error:', err);
        showToast('Gagal mengunduh PDF. Coba lagi.', 'error');
      } finally {
        setExporting(null);
      }
    };

    const handleExportBukuBesarExcel = async () => {
      if (exporting) return;
      setExporting('excel');
      try {
      const now = new Date();
      const ts = bbTimestamp(now);
      const periodLabel = getPeriodText();

      const wb = new ExcelJS.Workbook();
      (wb as any).properties = {
        title: 'Sales Order Report',
        creator: 'SJM Flow',
        subject: 'Logistics Management',
        keywords: 'Logistics, Transportation, Heavy Equipment, SJM Flow',
        company: 'PT Sugiarto Jaya Mandiri',
        author: 'SJM Flow',
        lastModifiedBy: 'SJM Flow'
      };
      const ws = wb.addWorksheet('Buku Besar');

      // Header rows
      ws.mergeCells('A1:F1');
      const r1 = ws.getCell('A1');
      r1.value = 'PT SUGIARTO JAYA MANDIRI';
      r1.font = { bold: true, size: 16, color: { argb: 'FFFF8F00' } };
      r1.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 28;

      ws.mergeCells('A2:F2');
      const r2 = ws.getCell('A2');
      r2.value = 'BUKU BESAR';
      r2.font = { bold: true, size: 14 };
      r2.alignment = { horizontal: 'center' };
      ws.getRow(2).height = 22;

      ws.mergeCells('A3:F3');
      ws.getCell('A3').value = `Akun: ${activeCoa?.kode} — ${activeCoa?.nama}`;
      ws.getCell('A3').font = { size: 11 };
      ws.getCell('A3').alignment = { horizontal: 'center' };

      ws.mergeCells('A4:F4');
      ws.getCell('A4').value = `Periode: ${periodLabel}`;
      ws.getCell('A4').font = { size: 10 };
      ws.getCell('A4').alignment = { horizontal: 'center' };

      ws.getRow(5).height = 8;

      // KPI row
      const kpiData = [
        { col: 1, label: 'SALDO AWAL PERIODE', value: Math.round(openingBalance * 100) / 100, fill: 'FFE8F4FD' },
        { col: 3, label: 'NET MUTASI PERIODE',  value: Math.round((bbTotalDebit - bbTotalKredit) * 100) / 100, fill: 'FFE8F8E8' },
        { col: 5, label: 'SALDO AKHIR PERIODE', value: Math.round(currentBalance * 100) / 100, fill: 'FFFFF8DC' },
      ];
      kpiData.forEach(k => {
        const lc = ws.getRow(6).getCell(k.col);
        lc.value = k.label;
        lc.font = { bold: true, size: 9 };
        lc.alignment = { horizontal: 'center' };
        const vc = ws.getRow(7).getCell(k.col);
        vc.value = k.value;
        vc.numFmt = '#,##0.00';
        vc.font = { bold: true, size: 11 };
        vc.alignment = { horizontal: 'center' };
        vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: k.fill } };
      });
      ws.getRow(7).height = 24;
      ws.getRow(8).height = 8;

      // Table header
      const headers = ['Tanggal', 'No. Jurnal', 'Keterangan Transaksi', 'Debit', 'Kredit', 'Saldo'];
      const hr = ws.getRow(9);
      headers.forEach((h, i) => {
        const c = hr.getCell(i + 1);
        c.value = h;
        c.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8F00' } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });
      hr.height = 22;

      // Data rows
      let rowIdx = 10;
      bbTransactions.forEach((t, idx) => {
        const row = ws.getRow(rowIdx);
        const isOpening = !t.tanggal || t.noJurnal === 'OPENING';

        row.getCell(1).value = t.tanggal || '-';
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(2).value = t.noJurnal || 'OPENING';
        row.getCell(3).value = t.keterangan || 'Saldo Awal / Mutasi Kumulatif';

        if (t.debit > 0) {
          row.getCell(4).value = Math.round(t.debit * 100) / 100;
          row.getCell(4).numFmt = '#,##0.00';
          row.getCell(4).font = { color: { argb: 'FF006600' } };
        } else {
          row.getCell(4).value = '-';
        }
        row.getCell(4).alignment = { horizontal: 'right' };

        if (t.kredit > 0) {
          row.getCell(5).value = Math.round(t.kredit * 100) / 100;
          row.getCell(5).numFmt = '#,##0.00';
          row.getCell(5).font = { color: { argb: 'FFCC0000' } };
        } else {
          row.getCell(5).value = '-';
        }
        row.getCell(5).alignment = { horizontal: 'right' };

        row.getCell(6).value = Math.round(t.saldo * 100) / 100;
        row.getCell(6).numFmt = '#,##0.00';
        row.getCell(6).font = { bold: true };
        row.getCell(6).alignment = { horizontal: 'right' };

        const rowFill = isOpening ? 'FFFFF3CD' : (idx % 2 === 0 ? 'FFF8F8F8' : 'FFFFFFFF');
        for (let c = 1; c <= 6; c++) {
          const cell = row.getCell(c);
          if (isOpening) cell.font = { ...(cell.font as any || {}), bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } };
          cell.border = { top: { style: 'hair' }, bottom: { style: 'hair' }, left: { style: 'thin' }, right: { style: 'thin' } };
        }
        rowIdx++;
      });

      // Total row
      rowIdx++;
      const totalRow = ws.getRow(rowIdx);
      ws.mergeCells(`A${rowIdx}:C${rowIdx}`);
      totalRow.getCell(1).value = 'TOTAL MUTASI PERIODE';
      totalRow.getCell(1).font = { bold: true, size: 10 };
      totalRow.getCell(1).alignment = { horizontal: 'right' };
      totalRow.getCell(4).value = Math.round(bbTotalDebit  * 100) / 100;
      totalRow.getCell(4).numFmt = '#,##0.00';
      totalRow.getCell(4).font = { bold: true, color: { argb: 'FF006600' } };
      totalRow.getCell(4).alignment = { horizontal: 'right' };
      totalRow.getCell(5).value = Math.round(bbTotalKredit * 100) / 100;
      totalRow.getCell(5).numFmt = '#,##0.00';
      totalRow.getCell(5).font = { bold: true, color: { argb: 'FFCC0000' } };
      totalRow.getCell(5).alignment = { horizontal: 'right' };
      for (let c = 1; c <= 6; c++) {
        totalRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        totalRow.getCell(c).border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
      }
      totalRow.height = 20;

      // Timestamp
      rowIdx += 2;
      ws.mergeCells(`A${rowIdx}:F${rowIdx}`);
      const tsCell = ws.getCell(`A${rowIdx}`);
      tsCell.value = `Dicetak: ${ts}`;
      tsCell.font = { italic: true, size: 9, color: { argb: 'FF888888' } };
      tsCell.alignment = { horizontal: 'right' };

      // Column widths
      ws.getColumn(1).width = 14;
      ws.getColumn(2).width = 22;
      ws.getColumn(3).width = 50;
      ws.getColumn(4).width = 20;
      ws.getColumn(5).width = 20;
      ws.getColumn(6).width = 22;

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BukuBesar_${activeCoa?.kode}_${now.toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('File Excel berhasil diunduh!', 'success');
      } catch (err: any) {
        console.error('Export BukuBesar Excel error:', err);
        showToast('Gagal mengunduh Excel. Coba lagi.', 'error');
      } finally {
        setExporting(null);
      }
    };

    return (
      <PageShell>
        <SectionHeader
          title="Rincian Buku Besar"
          sub="Laporan mutasi transaksi mendalam per akun COA"
          action={
            <div className="btn-export-group">
              <button className="text-green-brand" onClick={handleExportBukuBesarExcel} disabled={exporting !== null}>
                <Icon name="Download" size={13} /> {exporting === 'excel' ? '⏳' : 'Excel'}
              </button>
              <button className="text-red-brand" onClick={handleExportBukuBesarPDF} disabled={exporting !== null}>
                <Icon name="FileText" size={13} /> {exporting === 'pdf' ? '⏳' : 'PDF'}
              </button>
            </div>
          }
        />
        <ActionBar
          left={
            <div className="flex items-center gap-3">
              <select className="input-field h-10 min-w-[280px] font-black text-[11px] uppercase tracking-widest bg-grey-50 border-border-main/40" value={selectedCoa || ""} onChange={e => setSelectedCoa(e.target.value)}>
                <option value="">— PILIH AKUN COA —</option>
                {coa.map((c: any) => <option key={c.kode} value={c.kode}>{c.kode} — {c.nama.toUpperCase()}</option>)}
              </select>
              <PeriodFilter period={period} setPeriod={setPeriod} hideSearch />
            </div>
          }
        />

        <KPIGrid cols={3}>
           <StatCardLocal label="Saldo Awal Periode" value={fmt(openingBalance)} color="var(--color-blue-brand)" icon="Database" variant="asset" />
           <StatCardLocal label="Mutasi Berjalan" value={fmt(currentBalance - openingBalance)} color="var(--color-accent)" icon="Activity" subLabel={`Analisis mutasi pada ${rowsWithBalance.length} transaksi`} />
           <StatCardLocal label="Saldo Akhir Buku" value={fmt(currentBalance)} color="var(--color-green-brand)" icon="CheckCircle" variant="balance-positive" />
        </KPIGrid>

        {activeCoa && (
          <div className="fade-up space-y-3">
            <h4 className="px-4 font-black text-text-main text-sm uppercase tracking-widest flex items-center gap-3">
               <span className="text-accent underline underline-offset-4 decoration-2">{activeCoa.kode}</span>
               <span className="opacity-20">/</span>
               <span>{activeCoa.nama}</span>
            </h4>
            <div className="table-container max-h-[calc(100vh-450px)]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="w-28">TANGGAL</th>
                      <th className="w-32">NO. JURNAL</th>
                      <th>KETERANGAN TRANSAKSI</th>
                      <th className="text-right w-36">DEBIT</th>
                      <th className="text-right w-36">KREDIT</th>
                      <th className="text-right w-44 font-black">SALDO</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px]">
                    <tr className="bg-amber-50/20 italic group border-b border-border-main/10">
                      <td className="py-2 px-4 text-text-light opacity-50 font-bold">—</td>
                      <td className="py-2 px-4">
                         <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded text-[8px] font-black tracking-widest uppercase border border-amber-500/10">OPENING</span>
                      </td>
                      <td className="py-2 px-4 font-bold text-text-med opacity-60">Saldo Awal / Mutasi Kumulatif Sebelumnya</td>
                      <td className="py-2 px-4 text-right text-text-light opacity-30">—</td>
                      <td className="py-2 px-4 text-right text-text-light opacity-30">—</td>
                      <td className="py-2 px-4 text-right font-black text-text-main group-hover:text-amber-600 transition-colors">{fmt(openingBalance)}</td>
                    </tr>
                    {rowsWithBalance.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="text-text-light/40 flex flex-col items-center gap-2 italic text-[11px] font-black tracking-widest uppercase opacity-60">
                            <Icon name="SearchX" size={32} strokeWidth={1} className="opacity-20" />
                            Tidak ada mutasi pada periode ini
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rowsWithBalance.map((m: any, i: number) => (
                        <tr key={i} className="transition-colors group">
                          <td className="py-2 px-4 text-text-light tabular-nums font-medium opacity-60">{m.tanggal}</td>
                          <td className="py-2 px-4">
                             <button 
                               onClick={() => onJurnalClick && onJurnalClick(m.noJurnal)}
                               className="px-2 py-0.5 bg-accent/5 text-accent hover:bg-accent hover:text-white transition-all rounded text-[9px] font-black tracking-widest uppercase border border-accent/20"
                             >
                               #{m.noJurnal}
                             </button>
                          </td>
                          <td className="py-2 px-4 max-w-[200px]">
                            <div className="font-bold text-text-main leading-tight uppercase tracking-tight text-[11px] truncate" title={m.keterangan}>{m.keterangan}</div>
                          </td>
                          <td className={`py-2 px-4 text-right tabular-nums font-bold whitespace-nowrap ${m.debit > 0 ? "text-green-brand" : "text-text-light opacity-30"}`}>
                             {m.debit > 0 ? fmt(m.debit) : "—"}
                          </td>
                          <td className={`py-2 px-4 text-right tabular-nums font-bold whitespace-nowrap ${m.kredit > 0 ? "text-red-brand" : "text-text-light opacity-30"}`}>
                             {m.kredit > 0 ? fmt(m.kredit) : "—"}
                          </td>
                          <td className="py-2 px-4 text-right font-black tabular-nums border-l border-border-main/10 text-text-main whitespace-nowrap">{fmt(m.saldo)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-grey-100 border-t border-border-main/50">
                     <tr>
                        <td colSpan={5} className="py-3 px-4 text-right text-[9px] font-black text-text-light uppercase tracking-widest opacity-60">Saldo Akhir Kumulatif</td>
                        <td className="py-3 px-4 text-right text-[13px] font-black text-accent tabular-nums bg-accent/5 shadow-[inset_0_0_10px_rgba(0,0,0,0.02)]">{fmt(currentBalance)}</td>
                     </tr>
                  </tfoot>
                </table>
            </div>

            {/* Summary Footer */}
            <div className="mt-2 pt-3 border-t border-border-main/30">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-green-brand/5 border border-green-brand/20 rounded-xl p-3">
                  <p className="text-[9px] text-green-brand font-black uppercase tracking-widest mb-1">Total Debit</p>
                  <p className="text-sm font-black text-green-brand tabular-nums">{fmt(bbTotalDebit)}</p>
                </div>
                <div className="bg-red-brand/5 border border-red-brand/20 rounded-xl p-3">
                  <p className="text-[9px] text-red-brand font-black uppercase tracking-widest mb-1">Total Kredit</p>
                  <p className="text-sm font-black text-red-brand tabular-nums">{fmt(bbTotalKredit)}</p>
                </div>
                <div className={`border rounded-xl p-3 ${(bbTotalDebit - bbTotalKredit) >= 0 ? 'bg-blue-brand/5 border-blue-brand/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                  <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${(bbTotalDebit - bbTotalKredit) >= 0 ? 'text-blue-brand' : 'text-amber-600'}`}>Net Mutasi</p>
                  <p className={`text-sm font-black tabular-nums ${(bbTotalDebit - bbTotalKredit) >= 0 ? 'text-blue-brand' : 'text-amber-600'}`}>
                    {(bbTotalDebit - bbTotalKredit) >= 0 ? '+' : ''}{fmt(bbTotalDebit - bbTotalKredit)}
                  </p>
                </div>
              </div>
              <div className="bg-grey-50/60 border border-border-main/20 rounded-lg px-4 py-2.5 flex justify-between items-center">
                <span className="text-[10px] font-black text-text-light uppercase tracking-widest">
                  {rowsWithBalance.length} transaksi pada periode ini
                </span>
                <div className="flex gap-5 text-[10px] tabular-nums">
                  <span className="font-bold text-text-light">Debit: <span className="text-green-brand font-black">{fmt(bbTotalDebit)}</span></span>
                  <span className="font-bold text-text-light">Kredit: <span className="text-red-brand font-black">{fmt(bbTotalKredit)}</span></span>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageShell>
    );
  }

  return (
    <PageShell>
      <SectionHeader title="Laporan & Analitik" sub="Laporan performa finansial, operasional, dan audit sistem" />
      <Card className="flex flex-col items-center justify-center p-20 text-center bg-slate-50/20 border-dashed border-2 border-border-main/40 rounded-3xl min-h-[400px]">
         <div className="w-16 h-16 rounded-2xl bg-white shadow-xl shadow-accent/5 flex items-center justify-center mb-6 border border-border-main/20">
            <Icon name="BarChart3" size={24} className="text-accent opacity-20" />
         </div>
         <h3 className="text-sm font-black text-text-main uppercase tracking-widest opacity-60">Pilih Sub-Laporan</h3>
         <p className="text-[11px] font-bold text-text-light mt-3 max-w-[280px] tracking-wide uppercase leading-relaxed">
           Gunakan menu navigasi di atas untuk mengakses data laporan spesifik mulai dari Neraca hingga Log Aktivitas.
         </p>
      </Card>
    </PageShell>
  );
};
