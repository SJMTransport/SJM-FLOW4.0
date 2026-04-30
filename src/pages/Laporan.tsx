import React, { useMemo, useState } from "react";
import { C } from "../constants";
import { fmt, fmtShort, filterByPeriod, filterUpToPeriod } from "@/src/utils";
import { Card, SectionHeader, EmptyState, PeriodFilter, Icon, PageShell, KPIGrid, ActionBar } from "@/src/components/SJMComponents";
import { ACTION_COLORS, ACTION_LABELS, MODULE_LABELS, type ActionType, type ModuleKey } from "@/src/lib/activityLogger";
import { buildMeta } from "@/src/lib/activityLogger";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export const LaporanPage = ({ activeSub, jurnal, coa, so, armada, auditLogs, saldoAwal, onSOClick, onJurnalClick, logAction }: any) => {
  const [period, setPeriod] = useState({ mode: "year", year: new Date().getFullYear(), month: new Date().getMonth() });
  const [selectedCoa, setSelectedCoa] = useState("");
  const [search, setSearch] = useState("");
  const [auditDetailLog, setAuditDetailLog] = useState<any>(null);
  const filteredJurnal = useMemo(() => filterByPeriod(jurnal || [], period), [jurnal, period]);
  const cumulativeJurnal = useMemo(() => filterUpToPeriod(jurnal || [], period), [jurnal, period]);

  const getPeriodText = () => {
    if (period.mode === "day") return `Tanggal ${period.day || ""}`;
    if (period.mode === "year") return `Tahun ${period.year}`;
    if (period.mode === "all") return "Semua Periode";
    if (period.mode === "range") return `${period.rangeFrom || "..."} s/d ${period.rangeTo || "..."}`;
    return `Bulan ${MONTH_NAMES[period.month]} ${period.year}`;
  };

  const exportExcel = (title: string, data: any[], columns: string[]) => {
    const periodText = getPeriodText();
    const ws = XLSX.utils.json_to_sheet([]);
    // Add custom header
    XLSX.utils.sheet_add_aoa(ws, [
      [`Laporan ${title} PT Sugiarto Jaya Mandiri`],
      [`Periode ${periodText}`],
      []
    ]);
    XLSX.utils.sheet_add_json(ws, data, { origin: "A4" });
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
    XLSX.writeFile(wb, `${title}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const exportPDF = (title: string, data: any[], columns: string[]) => {
    const doc = new jsPDF();
    const periodText = getPeriodText();
    
    doc.setFontSize(14);
    doc.text(`Laporan ${title} PT Sugiarto Jaya Mandiri`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Periode ${periodText}`, 14, 22);
    
    const body = data.map(row => columns.map(col => row[col]));
    autoTable(doc, { 
      head: [columns.map(c => c.toUpperCase())], 
      body, 
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [249, 172, 61] }
    });
    doc.save(`${title}_${new Date().toISOString().slice(0,10)}.pdf`);
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
           <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex justify-center items-center p-4 md:p-10">
              <div className="fade-up w-full h-full max-w-6xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border-main">
                 <div className="p-6 border-b border-border-main bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                       <h3 className="text-lg font-black text-text-main tracking-tight uppercase leading-none">Preview: {title}</h3>
                       <p className="text-[11px] font-bold text-text-light mt-1 tracking-widest uppercase">{data.length} records found</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                       <button className="btn-primary bg-green-brand flex-1 sm:flex-none flex items-center justify-center gap-2" onClick={() => exportExcel(title, data, columns)}>
                          <Icon name="Download" size={16} /> Excel
                       </button>
                       <button className="btn-primary bg-red-brand flex-1 sm:flex-none flex items-center justify-center gap-2" onClick={() => exportPDF(title, data, columns)}>
                          <Icon name="FileText" size={16} /> PDF
                       </button>
                       <button className="h-[42px] px-6 rounded-xl border border-border-main text-text-med font-black hover:bg-slate-50 transition-all uppercase tracking-widest text-[11px]" onClick={() => setShowExport(false)}>✕ Close</button>
                    </div>
                 </div>
                 <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
                    <Card className="p-0 overflow-hidden border-border-main/50 shadow-none">
                    <div className="overflow-auto max-h-[70vh]">
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
                    </Card>
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
    const netLR =
      _cumDetails
        .filter((d: any) => (d.coa_kode || "").startsWith("4"))
        .reduce((s: number, d: any) => s + Number(d.kredit || 0), 0)
      - _cumDetails
        .filter((d: any) => { const k = d.coa_kode || ""; return k.startsWith("5") || k.startsWith("6"); })
        .reduce((s: number, d: any) => s + Number(d.debit || 0), 0);

    const totalPassiva = totalLiab + totalEku + netLR;
    const selisih = totalAset - totalPassiva;
    const balanced = Math.abs(selisih) < 1;

    const periodLabel = getPeriodText();

    const handleExportNeraca = (mode: 'pdf' | 'xlsx') => {
        const rows: any[] = [];
        const addSection = (label: string, items: any[], factor = 1) => {
            if (items.length === 0) return;
            rows.push({ kode: "", nama: label, kelompok: "", saldo: "" });
            items.forEach(c => rows.push({ 
                kode: c.kode, 
                nama: c.nama, 
                kelompok: c.kelompok, 
                saldo: fmt(c.saldo * factor) 
            }));
            const total = items.reduce((s, c) => s + (c.saldo * factor), 0);
            rows.push({ kode: "", nama: `Total ${label}`, kelompok: "", saldo: fmt(total) });
            rows.push({ kode: "", nama: "", kelompok: "", saldo: "" });
        };

        addSection("Aset", aset, 1);
        addSection("Liabilitas", liab, 1);
        addSection("Ekuitas", eku, 1);
        addSection("Pendapatan", pnd, 1);
        addSection("Beban", bbn, 1);
        
        rows.push({ kode: "", nama: "RINGKASAN", kelompok: "", saldo: "" });
        rows.push({ kode: "", nama: "Total Aset", kelompok: "", saldo: fmt(totalAset) });
        rows.push({ kode: "", nama: "Total Liab + Eku + L/R", kelompok: "", saldo: fmt(totalPassiva) });
        rows.push({ kode: "", nama: balanced ? "SEIMBANG" : "SELISIH", kelompok: "", saldo: fmt(selisih) });

        mode === 'pdf' ? exportPDF("Neraca Saldo", rows, ["kode", "nama", "kelompok", "saldo"]) : exportExcel("Neraca Saldo", rows, ["kode", "nama", "kelompok", "saldo"]);
        if (logAction) logAction(`Export Neraca Saldo: ${periodLabel} (${mode.toUpperCase()})`, buildMeta({ module: 'laporan', action_type: 'EXPORT', record_id: `neraca-${periodLabel}`, after_data: { format: mode, period: periodLabel } }));
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
                <button className="text-green-brand" onClick={() => handleExportNeraca('xlsx')}>
                  <Icon name="Download" size={13} /> Excel
                </button>
                <button className="text-red-brand" onClick={() => handleExportNeraca('pdf')}>
                  <Icon name="FileText" size={13} /> PDF
                </button>
              </div>
              <div className={`status-badge ${balanced ? "balanced" : "unbalanced"}`}>
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${balanced ? "bg-green-brand" : "bg-red-brand"}`}></div>
                {balanced ? "Balanced" : "Unbalanced"}
             </div>
          </div>
          <PeriodFilter period={period} setPeriod={setPeriod} />
        </div>

        <KPIGrid cols={3}>
           <StatCardLocal label="Total Aset (Aktiva)" value={fmt(totalAset)} color="var(--color-blue-brand)" icon="Briefcase" />
           <StatCardLocal label="Total Passiva" value={fmt(totalPassiva)} color="var(--color-red-brand)" icon="Scale" subLabel={`Incl. Net L/R: ${fmt(netLR)}`} />
           <StatCardLocal label="Selisih Neraca" value={fmt(selisih)} color={balanced ? "var(--color-green-brand)" : "var(--color-red-brand)"} icon="Activity" subLabel={balanced ? "Struktur Data Stabil" : "Data Tidak Seimbang / Periksa Jurnal"} />
        </KPIGrid>
        
        <Card className="p-0 border-border-main/40 overflow-hidden shadow-sm">
          <div className="overflow-auto max-h-[calc(100vh-420px)]">
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
        </Card>
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

    const handleExportLR = (mode: 'pdf' | 'xlsx') => {
        const rows: any[] = [];
        const add = (k:string, n:string, s:string) => rows.push({ kode: k, nama: n, jumlah: s });
        
        add("", "PENDAPATAN", "");
        pndJasa.forEach(c => add(c.kode, c.nama, fmt(Math.abs(c.saldo))));
        pndLain.forEach(c => add(c.kode, c.nama, fmt(Math.abs(c.saldo))));
        add("", "Total Pendapatan", fmt(totPnd));
        
        add("", "BEBAN POKOK PENDAPATAN", "");
        bpp.forEach(c => add(c.kode, c.nama, fmt(Math.abs(c.saldo))));
        add("", "Total BPP", fmt(totBpp));
        add("", "LABA KOTOR", fmt(labaKotor));
        
        add("", "BEBAN OPERASIONAL KENDARAAN", "");
        kend.forEach(c => add(c.kode, c.nama, fmt(Math.abs(c.saldo))));
        add("", "Total Biaya Kendaraan", fmt(totKend));
        add("", "LABA SETELAH BIAYA KENDARAAN", fmt(labaSetKend));
        
        add("", "BEBAN OPERASIONAL", "");
        opr.forEach(c => add(c.kode, c.nama, fmt(Math.abs(c.saldo))));
        add("", "Total Beban Operasional", fmt(totOpr));
        add("", "LABA USAHA", fmt(labaUsaha));
        
        if (tax.length > 0) {
            add("", "PAJAK", "");
            tax.forEach(c => add(c.kode, c.nama, fmt(Math.abs(c.saldo))));
            add("", "Total Pajak", fmt(totTax));
        }

        add("", "LABA BERSIH", fmt(labaBersih));

        mode === 'pdf' ? exportPDF("Laporan Laba Rugi", rows, ["kode", "nama", "jumlah"]) : exportExcel("Laba Rugi", rows, ["kode", "nama", "jumlah"]);
        if (logAction) logAction(`Export Laba Rugi: ${periodLabel} (${mode.toUpperCase()})`, buildMeta({ module: 'laporan', action_type: 'EXPORT', record_id: `labarugi-${periodLabel}`, after_data: { format: mode, period: periodLabel } }));
    };

    return (
      <PageShell>
        <SectionHeader
          title="Kinerja Operasional"
          sub={`Laporan Laba Rugi periode ${periodLabel}`}
          action={
            <div className="btn-export-group">
              <button className="text-green-brand" onClick={() => handleExportLR('xlsx')}>
                <Icon name="Download" size={13} /> Excel
              </button>
              <button className="text-red-brand" onClick={() => handleExportLR('pdf')}>
                <Icon name="FileText" size={13} /> PDF
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

        <Card className="p-0 border-border-main/40 overflow-hidden shadow-sm">
          <div className="overflow-auto max-h-[calc(100vh-420px)]">
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
        </Card>
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
              <button className="text-green-brand" onClick={() => exportExcel("Profitabilitas_Muatan", tbProfit, ["order_id", "customer", "revenue", "expense", "profit"])}>
                <Icon name="Download" size={13} /> Excel
              </button>
              <button className="text-red-brand" onClick={() => exportPDF("Profitabilitas Muatan", tbProfit, ["order_id", "tgl", "customer", "revenue", "expense", "profit"])}>
                <Icon name="FileText" size={13} /> PDF
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

        <Card className="p-0 border-border-main/40 overflow-hidden shadow-sm">
          <div className="overflow-auto max-h-[calc(100vh-420px)] border-b border-border-main/10">
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
        </Card>
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setAuditDetailLog(null)}>
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

        <Card className="p-0 border-border-main/40 overflow-hidden shadow-sm">
           <div className="overflow-auto max-h-[calc(100vh-340px)]">
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
        </Card>
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

    return (
      <PageShell>
        <SectionHeader
          title="Rincian Buku Besar"
          sub="Laporan mutasi transaksi mendalam per akun COA"
          action={
            <div className="btn-export-group">
              <button className="text-green-brand" onClick={() => exportExcel(`BukuBesar_${activeCoa?.kode}`, rowsWithBalance, ["tanggal", "noJurnal", "keterangan", "debit", "kredit", "saldo"])}>
                <Icon name="Download" size={13} /> Excel
              </button>
              <button className="text-red-brand" onClick={() => exportPDF(`Buku Besar ${activeCoa?.kode}`, rowsWithBalance, ["tanggal", "noJurnal", "keterangan", "debit", "kredit", "saldo"])}>
                <Icon name="FileText" size={13} /> PDF
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
            <Card className="p-0 border-border-main/40 overflow-hidden shadow-sm">
              <div className="overflow-auto max-h-[calc(100vh-450px)]">
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
            </Card>
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
