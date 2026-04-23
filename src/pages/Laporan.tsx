import React, { useMemo, useState } from "react";
import { C } from "../constants";
import { fmt, fmtShort, filterByPeriod, filterUpToPeriod } from "@/src/utils";
import { Card, SectionHeader, EmptyState, PeriodFilter, Icon } from "@/src/components/SJMComponents";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const LaporanPage = ({ activeSub, jurnal, coa, so, armada, auditLogs, saldoAwal, onSOClick, onJurnalClick }: any) => {
  const [period, setPeriod] = useState({ mode: "year", year: new Date().getFullYear(), month: new Date().getMonth() });
  const [selectedCoa, setSelectedCoa] = useState("");
  const [search, setSearch] = useState("");
  const filteredJurnal = useMemo(() => filterByPeriod(jurnal || [], period), [jurnal, period]);
  const cumulativeJurnal = useMemo(() => filterUpToPeriod(jurnal || [], period), [jurnal, period]);

  const getPeriodText = () => {
    return period.mode === "year" ? `Tahun ${period.year}` : `Bulan ${["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][period.month]} ${period.year}`;
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

  const StatCardLocal = ({ label, value, color, icon, subLabel }: any) => (
    <Card className="flex flex-col justify-center p-4 border-l-4 shadow-sm" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold text-text-light opacity-60 italic">{label}</span>
        {icon && <Icon name={icon} size={14} style={{ color }} className="opacity-30" />}
      </div>
      <div className="text-xl font-black tabular-nums tracking-tight text-text-main">{value}</div>
      {subLabel && <div className="text-[9px] font-bold text-text-light mt-1.5 flex items-center gap-1.5 opacity-60 underline decoration-border-main">{subLabel}</div>}
    </Card>
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
    // ─── MAPPING SUB_KELOMPOK → SEKSI (from user snippet) ───────────────────
    const SEKSI_MAP: Record<string, string> = {
      // Pendapatan
      "Jasa Angkutan":       "pendapatanJasa",
      "Pendapatan Mobil SJM":"pendapatanJasa",
      "Lainnya":             "pendapatanLain",
      // Beban
      "BPP":                 "bpp",
      "Asuransi":            "bpp",
      "Operasional Kendaraan":"kendaraan",
      "Operasional":         "operasional",
      "Keuangan":            "keuangan",
      "Pajak":               "pajak",
    };

    const sum = (arr: any[]) => arr.reduce((s, c) => s + (c.saldo || 0), 0);

    const pendapatan = tbLabaRugi.filter(c => c.kelompok === "Pendapatan");
    const pndJasa = pendapatan.filter(c => SEKSI_MAP[c.sub_kelompok] === "pendapatanJasa");
    const pndLain = pendapatan.filter(c => SEKSI_MAP[c.sub_kelompok] === "pendapatanLain" || !SEKSI_MAP[c.sub_kelompok]);

    const beban = tbLabaRugi.filter(c => c.kelompok === "Beban");
    const bpp = beban.filter(c => SEKSI_MAP[c.sub_kelompok] === "bpp");
    const kend = beban.filter(c => SEKSI_MAP[c.sub_kelompok] === "kendaraan");
    const opr = beban.filter(c => SEKSI_MAP[c.sub_kelompok] === "operasional");
    const fin = beban.filter(c => SEKSI_MAP[c.sub_kelompok] === "keuangan");
    const tax = beban.filter(c => SEKSI_MAP[c.sub_kelompok] === "pajak");

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
    const map: any = {};
    (jurnal || []).forEach((j: any) => {
      const headerSOs = (j.no_so || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      const soVals = j.so_values || {};
      const totalSoVals = Object.values(soVals).reduce((s: number, v: any) => s + Number(v || 0), 0);
      const nHeader = headerSOs.length;

      (j.jurnal_detail || []).forEach((d: any) => {
        const kode = d.coa_kode || "";
        const targets = d.no_so ? [d.no_so] : headerSOs;
        if (!targets.length) return;

        targets.forEach((orderId: string) => {
          if (!map[orderId]) map[orderId] = {
            pendapatan: 0, modal: 0, harga_pengiriman: 0, base_harga: 0, total_harga: 0,
            revenue: 0, expense: 0 // ALIAS for report
          };
          const factor = d.no_so ? 1
            : nHeader === 1 ? 1
            : (soVals[orderId] && Number(totalSoVals) > 0)
              ? Number(soVals[orderId]) / Number(totalSoVals)
              : 1 / nHeader;

          if (kode === "112" && Number(d.debit) > 0)
            map[orderId].harga_pengiriman += Number(d.debit) * factor;

          if (kode.startsWith("4") && Number(d.kredit) > 0) {
            let pendVal: number;
            if (d.no_so) {
              pendVal = Number(d.kredit);
            } else if (soVals[orderId] && Number(totalSoVals) > 0) {
              pendVal = Number(soVals[orderId]);
            } else {
              // Sisa revenue setelah dikurangi soVals yang terdeklarasi dibagi rata ke SO tanpa nilai
              const sosWithoutVals = targets.filter((id: string) => !soVals[id]);
              const remaining = Math.max(0, Number(d.kredit) - Number(totalSoVals));
              pendVal = sosWithoutVals.length > 0 ? remaining / sosWithoutVals.length : Number(d.kredit) / nHeader;
            }
            map[orderId].revenue += pendVal;
          }

          if (kode.startsWith("5") && kode !== "553" && (Number(d.debit) > 0 || Number(d.kredit) > 0)) {
            const bebanVal = (Number(d.debit) || Number(d.kredit)) * factor;
            map[orderId].expense += bebanVal;
          }
        });
      });
    });

    const periodSo = filterByPeriod(so || [], period, "tgl_muat");
    return periodSo.map((s: any) => {
      const fin = map[s.order_id];
      const revenue = fin ? fin.revenue : (Number(s.total_harga || 0) - Number(s.nilai_pajak || 0));
      const expense = fin ? fin.expense : (Number(s.base_harga || 0));
      const profit = revenue - expense;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return { order_id: s.order_id, tgl: s.tgl_muat, customer: s.customer, revenue, expense, profit, margin };
    });
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

    const totalAset = aset.reduce((s, c) => s + c.saldo, 0);
    const totalLiab = liab.reduce((s, c) => s + (c.saldo * -1), 0);
    const totalEku = eku.reduce((s, c) => s + (c.saldo * -1), 0);
    const totalPnd = pnd.reduce((s, c) => s + (c.saldo * -1), 0);
    const totalBbn = bbn.reduce((s, c) => s + c.saldo, 0);

    const netIncome = totalPnd - totalBbn;
    const totalPassiva = totalLiab + totalEku + netIncome;
    const selisih = totalAset - totalPassiva;
    const balanced = Math.abs(selisih) < 1;

    const periodLabel = period.mode === "year" ? `Tahun ${period.year}` : `${["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][period.month]} ${period.year}`;

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
        addSection("Liabilitas", liab, -1);
        addSection("Ekuitas", eku, -1);
        addSection("Pendapatan", pnd, -1);
        addSection("Beban", bbn, 1);
        
        rows.push({ kode: "", nama: "RINGKASAN", kelompok: "", saldo: "" });
        rows.push({ kode: "", nama: "Total Aset", kelompok: "", saldo: fmt(totalAset) });
        rows.push({ kode: "", nama: "Total Liab + Eku + L/R", kelompok: "", saldo: fmt(totalPassiva) });
        rows.push({ kode: "", nama: balanced ? "SEIMBANG" : "SELISIH", kelompok: "", saldo: fmt(selisih) });

        mode === 'pdf' ? exportPDF("Neraca Saldo", rows, ["kode", "nama", "kelompok", "saldo"]) : exportExcel("Neraca Saldo", rows, ["kode", "nama", "kelompok", "saldo"]);
    };

    const CategoryTable = ({ label, items, factor = 1 }: any) => {
        if (items.length === 0) return null;
        const subtotal = items.reduce((s: number, c: any) => s + (c.saldo * factor), 0);
        return (
            <>
                <tr className="bg-slate-50/30">
                    <td colSpan={4} className="px-4 py-2 font-bold text-text-light text-[10px] opacity-60 italic">{label}</td>
                </tr>
                {items.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors border-b border-border-main/10 group">
                        <td className="px-4 py-2 text-[11px] tabular-nums font-bold text-text-light opacity-50">{r.kode}</td>
                        <td className="px-4 py-2 text-[11px] font-bold text-text-main group-hover:text-accent transition-colors italic tracking-tight">{r.nama}</td>
                        <td className="px-4 py-2 text-[10px] text-text-light font-medium italic opacity-40">{r.kelompok}</td>
                        <td className="px-4 py-2 text-right text-[12px] tabular-nums font-bold text-text-main">{fmt(r.saldo * factor)}</td>
                    </tr>
                ))}
                <tr className="bg-white border-b border-border-main/20">
                    <td colSpan={3} className="px-4 py-2 text-right text-[10px] font-bold text-text-light italic opacity-60">Total {label}</td>
                    <td className="px-4 py-2 text-right text-[13px] font-black text-accent tabular-nums">{fmt(subtotal)}</td>
                </tr>
                <tr className="h-2"></tr>
            </>
        );
    };

    return (
      <div className="fade-up max-w-[1700px] mx-auto space-y-4 pb-8">
        <SectionHeader title="Posisi Keuangan" sub={`Trial Balance / Neraca Saldo per ${periodLabel}`} />
        
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="flex items-center gap-2">
             <button className="btn-primary flex items-center gap-2 px-6 py-1.5 text-[10px] bg-green-brand shadow-xl shadow-green-brand/10 border-none" onClick={() => handleExportNeraca('xlsx')}>
                <Icon name="Download" size={14} /> Excel
             </button>
             <button className="btn-primary flex items-center gap-2 px-6 py-1.5 text-[10px] bg-red-brand shadow-xl shadow-red-brand/10 border-none" onClick={() => handleExportNeraca('pdf')}>
                <Icon name="FileText" size={14} /> PDF
             </button>
             <div className={`ml-2 flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 font-bold text-[10px] ${balanced ? "bg-green-brand/5 border-green-brand/20 text-green-brand shadow-sm shadow-green-brand/10" : "bg-red-brand/5 border-red-brand/20 text-red-brand shadow-sm shadow-red-brand/10"}`}>
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${balanced ? "bg-green-brand" : "bg-red-brand"}`}></div>
                {balanced ? "Balanced" : "Unbalanced"}
             </div>
          </div>
          <PeriodFilter period={period} setPeriod={setPeriod} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <StatCardLocal label="Total Aset (Aktiva)" value={fmt(totalAset)} color="var(--color-blue-brand)" icon="Briefcase" />
           <StatCardLocal label="Total Passiva" value={fmt(totalPassiva)} color="var(--color-red-brand)" icon="Scale" subLabel={`Incl. Net Profit: ${fmt(netIncome)}`} />
           <StatCardLocal label="Selisih Neraca" value={fmt(selisih)} color={balanced ? "var(--color-green-brand)" : "var(--color-red-brand)"} icon="Activity" subLabel={balanced ? "Struktur Data Stabil" : "Data Tidak Seimbang / Periksa Jurnal"} />
        </div>
        
        <Card className="p-0 border-border-main/40 overflow-hidden shadow-sm">
          <div className="overflow-auto max-h-[calc(100vh-420px)]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="py-3 px-4 w-24">Kode</th>
                <th className="py-3 px-4">Akun COA</th>
                <th className="py-3 px-4 w-32">Kategori</th>
                <th className="py-3 px-4 text-right w-44">Saldo (Rp)</th>
              </tr>
            </thead>
            <tbody>
                <CategoryTable label="Aset" items={aset} factor={1} />
                <CategoryTable label="Liabilitas" items={liab} factor={-1} />
                <CategoryTable label="Ekuitas" items={eku} factor={-1} />
                <CategoryTable label="Pendapatan" items={pnd} factor={-1} />
                <CategoryTable label="Beban" items={bbn} factor={1} />
            </tbody>
            <tfoot>
              <tr className="bg-slate-50/80 border-t border-border-main/40">
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
      </div>
    );
  }

  if (activeSub === "labarugi") {
    const { 
        pndJasa, pndLain, bpp, kend, opr, fin, tax,
        totPnd, totBpp, labaKotor, totKend, labaSetKend, totOpr, labaUsaha, totFin, labaSebPajak, totTax, labaBersih 
    } = calcLabaRugi;

    const SectionHeaderRow = ({ label }: any) => (
       <tr className="bg-slate-50/50">
          <td />
          <td colSpan={2} className="py-2 px-4 text-[10px] font-bold text-text-light italic opacity-60">{label}</td>
       </tr>
    );

    const ItemRow = ({ kode, nama, val, indent = false }: any) => (
       <tr className="hover:bg-slate-50/50 transition-colors border-b border-border-main/10 group">
          <td className="py-2 px-4 text-[10px] text-text-light tabular-nums font-bold opacity-50 w-24">{kode}</td>
          <td className={`py-2 px-4 text-[11px] font-bold text-text-main group-hover:text-accent transition-colors italic tracking-tight ${indent ? "pl-8" : "pl-4"}`}>{nama}</td>
          <td className="py-2 px-4 text-right tabular-nums text-[12px] font-bold text-text-main">{fmt(val)}</td>
       </tr>
    );

    const SummaryRow = ({ label, val, highlight = false }: any) => (
       <tr className={highlight ? "bg-accent/5 border-b border-accent/20" : "border-b border-border-main/10"}>
          <td />
          <td className={`py-2 px-4 font-bold text-text-main ${highlight ? "text-[11px] bg-accent/5" : "text-[10px] text-text-light opacity-60 italic"}`}>{label}</td>
          <td className={`py-2 px-4 text-right tabular-nums font-bold ${highlight ? "text-[14px] text-accent" : "text-[12px] text-text-med"}`}>{fmt(val)}</td>
       </tr>
    );

    const periodLabel = period.mode === "year" ? `Tahun ${period.year}` : `${["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][period.month]} ${period.year}`;

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
    };

    return (
      <div className="fade-up max-w-[1700px] mx-auto space-y-4 pb-8">
        <SectionHeader title="Kinerja Operasional" sub={`Laporan Laba Rugi periode ${periodLabel}`} />

        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="flex items-center gap-2">
             <button className="btn-primary flex items-center gap-2 px-6 py-1.5 text-[10px] bg-green-brand shadow-xl shadow-green-brand/10 border-none" onClick={() => handleExportLR('xlsx')}>
                <Icon name="Download" size={14} /> Excel
             </button>
             <button className="btn-primary flex items-center gap-2 px-6 py-1.5 text-[10px] bg-red-brand shadow-xl shadow-red-brand/10 border-none" onClick={() => handleExportLR('pdf')}>
                <Icon name="FileText" size={14} /> PDF
             </button>
          </div>
          <PeriodFilter period={period} setPeriod={setPeriod} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <StatCardLocal label="Total Pendapatan" value={fmt(totPnd)} color="var(--color-blue-brand)" icon="TrendingUp" />
           <StatCardLocal label="Total Seluruh Beban" value={fmt(totBpp + totKend + totOpr + totFin + totTax)} color="var(--color-red-brand)" icon="TrendingDown" />
           <StatCardLocal label="Laba Rugi Bersih" value={fmt(labaBersih)} color={labaBersih >= 0 ? "var(--color-green-brand)" : "var(--color-red-brand)"} icon="CheckCircle" />
        </div>

        <Card className="p-0 border-border-main/40 overflow-hidden shadow-sm">
          <div className="overflow-auto max-h-[calc(100vh-420px)]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="py-3 px-4 w-24">KODE</th>
                <th className="py-3 px-4">RINCIAN POS KEUANGAN</th>
                <th className="py-3 px-4 text-right w-56">JUMLAH (RP)</th>
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
      </div>
    );
  }

  if (activeSub === "profit") {
    const totalRevenue = tbProfit.reduce((s, p) => s + p.revenue, 0);
    const totalExpense = tbProfit.reduce((s, p) => s + p.expense, 0);
    const totalProfit = totalRevenue - totalExpense;

    return (
      <div className="fade-up max-w-[1700px] mx-auto space-y-4 pb-8">
        <SectionHeader title="Analisis Profit Muatan" sub="Pemantauan margin keuntungan real-time per order" />
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
           <div className="flex items-center gap-2">
              <button className="btn-primary flex items-center gap-2 px-6 py-1.5 text-[10px] uppercase tracking-widest bg-green-brand shadow-xl shadow-green-brand/10 border-none" onClick={() => exportExcel("Profitabilitas_Muatan", tbProfit, ["order_id", "customer", "revenue", "expense", "profit"])}>
                 <Icon name="Download" size={14} /> Excel
              </button>
              <button className="btn-primary flex items-center gap-2 px-6 py-1.5 text-[10px] uppercase tracking-widest bg-red-brand shadow-xl shadow-red-brand/10 border-none" onClick={() => exportPDF("Profitabilitas Muatan", tbProfit, ["order_id", "tgl", "customer", "revenue", "expense", "profit"])}>
                 <Icon name="FileText" size={14} /> PDF
              </button>
           </div>
           <PeriodFilter period={period} setPeriod={setPeriod} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <StatCardLocal label="Nilai Muatan (Revenue)" value={fmt(totalRevenue)} color="var(--color-blue-brand)" icon="TrendingUp" />
           <StatCardLocal label="Beban Muatan (Expense)" value={fmt(totalExpense)} color="var(--color-red-brand)" icon="TrendingDown" />
           <StatCardLocal label="Profit Bruto" value={fmt(totalProfit)} color={totalProfit >= 0 ? "var(--color-green-brand)" : "var(--color-red-brand)"} icon="PieChart" subLabel={`Berdasarkan analisis ${tbProfit.length} order muatan`} />
        </div>

        <Card className="p-0 border-border-main/40 overflow-hidden shadow-sm">
          <div className="overflow-auto max-h-[calc(100vh-420px)] border-b border-border-main/10">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="py-3 px-4">ORDER ID</th>
                  <th className="py-3 px-4">MITRA CUSTOMER</th>
                  <th className="py-3 px-4 text-right">REVENUE</th>
                  <th className="py-3 px-4 text-right">EXPENSE</th>
                  <th className="py-3 px-4 text-right">PROFIT</th>
                  <th className="py-3 px-4 text-right w-32">MARGIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main/10">
                {tbProfit.length === 0 ? <EmptyState colSpan={6} /> :
                 tbProfit.map((p: any, i:number) => (
                   <tr key={i} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => onSOClick && onSOClick(p.order_id)}>
                      <td className="py-3 px-4 text-[11px] font-black text-accent group-hover:underline underline-offset-4 decoration-accent/30">{p.order_id}</td>
                      <td className="py-3 px-4 text-[11px] font-bold text-text-main uppercase tracking-tight">{p.customer}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-[11px] font-medium">{fmt(p.revenue)}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-[11px] font-medium text-red-brand/70">{fmt(p.expense)}</td>
                      <td className={`py-3 px-4 text-right tabular-nums text-[12px] font-black ${p.profit >= 0 ? "text-green-brand" : "text-red-brand"}`}>{fmt(p.profit)}</td>
                      <td className="py-3 px-4 text-right">
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
      </div>
    );
  }

  if (activeSub === "audit") {
    const filteredLogs = (auditLogs || []).filter((l: any) => 
      !search || 
      l.user_name?.toLowerCase().includes(search.toLowerCase()) || 
      l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      l.action?.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="fade-up max-w-[1700px] mx-auto space-y-4 pb-8">
        <SectionHeader title="Log Aktivitas User" sub="Catatan riwayat penggunaan dan mutasi data aplikasi" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
           <div className="w-full sm:max-w-md relative group">
              <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-accent transition-all duration-300 opacity-50" />
              <input 
                className="input-field pl-11 bg-slate-50 border-transparent focus:bg-white focus:border-accent" 
                placeholder="Cari user atau aktivitas..." 
                value={search || ""} 
                onChange={e => setSearch(e.target.value)} 
              />
           </div>
           <button className="btn-ghost px-6 uppercase tracking-widest text-[9px] font-black" onClick={() => setSearch("")}>Reset Filter</button>
        </div>

        <Card className="p-0 border-border-main/40 overflow-hidden shadow-sm">
           <div className="overflow-auto max-h-[calc(100vh-380px)]">
           <table className="w-full border-collapse">
              <thead>
                 <tr>
                    <th className="py-3 px-4 w-44">WAKTU SISTEM</th>
                    <th className="py-3 px-4 w-64">PELAKSANA</th>
                    <th className="py-3 px-4">AKSI / AKTIVITAS</th>
                    <th className="py-3 px-4 border-l border-border-main/10">METADATA</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-border-main/10">
                 {filteredLogs.length === 0 ? <EmptyState colSpan={4} /> : 
                  filteredLogs.map((log: any, idx: number) => (
                    <tr key={log.id || idx} className="hover:bg-slate-50/50 transition-colors group">
                       <td className="py-3 px-4 text-[10px] text-text-light tabular-nums font-medium opacity-60">
                          {new Date(log.timestamp || log.created_at).toLocaleString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                       </td>
                       <td className="py-3 px-4">
                          <div className="font-black text-text-main text-[11px] leading-tight uppercase">{log.user_name}</div>
                          <div className="text-[9px] font-bold text-text-light tracking-widest uppercase mt-0.5 opacity-40">{log.user_email}</div>
                       </td>
                       <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                             <span className={`shrink-0 inline-flex items-center justify-center px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase ${
                               log.action?.includes("Hapus") ? "bg-red-brand/10 text-red-brand" : 
                               log.action?.includes("Simpan") || log.action?.includes("Create") ? "bg-green-brand/10 text-green-brand" : 
                               "bg-slate-100/80 text-text-light"
                             }`}>
                                {log.action?.includes("Hapus") ? "DELETE" : log.action?.includes("Simpan") || log.action?.includes("Create") || log.action?.includes("Add") ? "SAVE" : "INFO"}
                             </span>
                             <span className="font-bold text-text-med text-[11px] truncate max-w-xs">{log.action}</span>
                          </div>
                       </td>
                       <td className="py-3 px-4">
                          {log.metadata ? (
                            <div className="max-h-20 overflow-auto whitespace-pre-wrap text-[9px] font-medium text-text-light bg-slate-50/50 p-2.5 rounded-lg border border-border-main/20 leading-relaxed italic opacity-70 group-hover:opacity-100 transition-opacity">
                               {log.metadata}
                            </div>
                          ) : <span className="text-text-light text-[10px] italic opacity-30">—</span>}
                       </td>
                    </tr>
                  ))
                 }
              </tbody>
           </table>
           </div>
        </Card>
      </div>
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
      const jDate = j.tanggal;
      const isBefore = period.mode === "month" 
        ? (new Date(jDate).getFullYear() < period.year || (new Date(jDate).getFullYear() === period.year && new Date(jDate).getMonth() < period.month))
        : period.mode === "year" 
          ? new Date(jDate).getFullYear() < period.year
          : false;

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
    ).sort((a: any, b: any) => a.tanggal.localeCompare(b.tanggal));

    // 3. Compute running balance
    let currentBalance = openingBalance;
    const rowsWithBalance = mutations.map((m: any) => {
      const val = m.debit - m.kredit;
      currentBalance += isDebitAccount ? val : -val;
      return { ...m, saldo: currentBalance };
    });

    return (
      <div className="fade-up max-w-[1700px] mx-auto space-y-4 pb-8">
        <SectionHeader title="Rincian Buku Besar" sub="Laporan mutasi transaksi mendalam per akun COA" />
        
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
           <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <button className="btn-primary flex items-center gap-2 px-6 py-1.5 text-[10px] uppercase tracking-widest bg-green-brand shadow-xl shadow-green-brand/10 border-none" onClick={() => exportExcel(`BukuBesar_${activeCoa?.kode}`, rowsWithBalance, ["tanggal", "noJurnal", "keterangan", "debit", "kredit", "saldo"])}>
                 <Icon name="Download" size={14} /> Excel
              </button>
              <button className="btn-primary flex items-center gap-2 px-6 py-1.5 text-[10px] uppercase tracking-widest bg-red-brand shadow-xl shadow-red-brand/10 border-none" onClick={() => exportPDF(`Buku Besar ${activeCoa?.kode}`, rowsWithBalance, ["tanggal", "noJurnal", "keterangan", "debit", "kredit", "saldo"])}>
                 <Icon name="FileText" size={14} /> PDF
              </button>
              
              <div className="w-full sm:min-w-[320px] sm:w-[320px]">
                 <select className="input-field h-10 font-black text-[11px] uppercase tracking-widest bg-slate-50 border-border-main/40" value={selectedCoa || ""} onChange={e => setSelectedCoa(e.target.value)}>
                    <option value="">— PILIH AKUN COA —</option>
                    {coa.map((c: any) => <option key={c.kode} value={c.kode}>{c.kode} — {c.nama.toUpperCase()}</option>)}
                 </select>
              </div>
           </div>
           <PeriodFilter period={period} setPeriod={setPeriod} hideSearch />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <StatCardLocal label="Saldo Awal Periode" value={fmt(openingBalance)} color="var(--color-blue-brand)" icon="Database" />
           <StatCardLocal label="Mutasi Berjalan" value={fmt(currentBalance - openingBalance)} color="var(--color-accent)" icon="Activity" subLabel={`Analisis mutasi pada ${rowsWithBalance.length} transaksi`} />
           <StatCardLocal label="Saldo Akhir Buku" value={fmt(currentBalance)} color="var(--color-green-brand)" icon="CheckCircle" />
        </div>

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
                      <th className="py-3 px-4 w-28">TANGGAL</th>
                      <th className="py-3 px-4 w-32">NO. JURNAL</th>
                      <th className="py-3 px-4">KETERANGAN TRANSAKSI</th>
                      <th className="py-3 px-4 text-right w-36">DEBIT</th>
                      <th className="py-3 px-4 text-right w-36">KREDIT</th>
                      <th className="py-3 px-4 text-right w-44 font-black">SALDO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-main/10 text-[11px]">
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
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="py-2 px-4 text-text-light tabular-nums font-medium opacity-60">{m.tanggal}</td>
                          <td className="py-2 px-4">
                             <button 
                               onClick={() => onJurnalClick && onJurnalClick(m.noJurnal)}
                               className="px-2 py-0.5 bg-accent/5 text-accent hover:bg-accent hover:text-white transition-all rounded text-[9px] font-black tracking-widest uppercase border border-accent/20"
                             >
                               #{m.noJurnal}
                             </button>
                          </td>
                          <td className="py-2 px-4 font-bold text-text-main leading-tight uppercase tracking-tight">{m.keterangan}</td>
                          <td className={`py-2 px-4 text-right tabular-nums font-bold ${m.debit > 0 ? "text-green-brand" : "text-text-light opacity-30"}`}>
                             {m.debit > 0 ? fmt(m.debit) : "—"}
                          </td>
                          <td className={`py-2 px-4 text-right tabular-nums font-bold ${m.kredit > 0 ? "text-red-brand" : "text-text-light opacity-30"}`}>
                             {m.kredit > 0 ? fmt(m.kredit) : "—"}
                          </td>
                          <td className="py-2 px-4 text-right font-black tabular-nums border-l border-border-main/10 text-text-main">{fmt(m.saldo)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50/50 border-t border-border-main/40">
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
      </div>
    );
  }

  return (
    <div className="fade-up max-w-[1700px] mx-auto space-y-4">
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
    </div>
  );
};
