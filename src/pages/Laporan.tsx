import React, { useMemo, useState } from "react";
import { C, I } from "../constants";
import { fmt, filterByPeriod, filterUpToPeriod } from "@/src/utils";
import { Card, SectionHeader, EmptyState, PeriodFilter, Icon } from "@/src/components/SJMComponents";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

export const LaporanPage = ({ activeSub, jurnal, coa, so, armada, onSOClick, onJurnalClick }: any) => {
  const [period, setPeriod] = useState({ mode: "year", year: new Date().getFullYear(), month: new Date().getMonth() });
  const [selectedCoa, setSelectedCoa] = useState("");
  // FIX #11: showExport adalah local state per-render, bukan shared di parent
  // Dipindah ke dalam masing-masing sub-component (lihat ExportButton di bawah)

  const filteredJurnal = useMemo(() => filterByPeriod(jurnal || [], period), [jurnal, period]);
  const cumulativeJurnal = useMemo(() => filterUpToPeriod(jurnal || [], period), [jurnal, period]);

  const exportExcel = (title: string, data: any[], columns: string[]) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title);
    XLSX.writeFile(wb, `${title}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPDF = (title: string, data: any[], columns: string[]) => {
    const doc = new jsPDF();
    doc.text(title, 14, 15);
    const body = data.map(row => columns.map(col => row[col]));
    (doc as any).autoTable({ head: [columns.map(c => c.toUpperCase())], body, startY: 20 });
    doc.save(`${title}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // FIX #11: ExportButton punya state sendiri — tidak shared antar sub-pages
  const ExportButton = ({ title, data, columns }: any) => {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button className="btn-ghost" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6 }} onClick={() => setOpen(true)}>
          <Icon d={I.file} size={14} /> Preview & Export
        </button>
        {open && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 2000, display: "flex", justifyContent: "center", alignItems: "center" }}
            onClick={() => setOpen(false)}>
            <div className="fade-up" style={{ width: "calc(100vw - 48px)", height: "calc(100vh - 48px)", background: "white", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ padding: 20, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Preview: {title}</div>
                  <div style={{ fontSize: 12, color: C.textLight }}>{data.length} baris data</div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn-primary" style={{ background: C.green, display: "flex", alignItems: "center", gap: 8 }} onClick={() => exportExcel(title, data, columns)}>
                    <Icon d={I.download} size={14} /> Export Excel
                  </button>
                  <button className="btn-primary" style={{ background: C.red, display: "flex", alignItems: "center", gap: 8 }} onClick={() => exportPDF(title, data, columns)}>
                    <Icon d={I.file} size={14} /> Export PDF
                  </button>
                  <button className="btn-ghost" onClick={() => setOpen(false)}>✕ Tutup</button>
                </div>
              </div>
              <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                      {columns.map((c: any) => <th key={c} style={{ padding: 10, textAlign: "left" }}>{c.toUpperCase().replace("_", " ")}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row: any, i: number) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                        {columns.map((c: any) => (
                          <td key={c} style={{ padding: 10 }}>
                            {typeof row[c] === "number" ? fmt(row[c]) : String(row[c] || "")}
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
      </div>
    );
  };

  const tbNeraca = useMemo(() => {
    const balances: Record<string, number> = {};
    (coa || []).forEach((c: any) => { balances[c.kode] = 0; });
    cumulativeJurnal.forEach((j: any) => {
      (j.jurnal_detail || []).forEach((d: any) => {
        if (balances[d.coa_kode] !== undefined)
          balances[d.coa_kode] += Number(d.debit || 0) - Number(d.kredit || 0);
      });
    });
    return (coa || []).map((c: any) => ({ ...c, saldo: balances[c.kode] || 0 }));
  }, [coa, cumulativeJurnal]);

  const tbLabaRugi = useMemo(() => {
    const balances: Record<string, number> = {};
    (coa || []).forEach((c: any) => { balances[c.kode] = 0; });
    filteredJurnal.forEach((j: any) => {
      (j.jurnal_detail || []).forEach((d: any) => {
        if (balances[d.coa_kode] !== undefined)
          balances[d.coa_kode] += Number(d.debit || 0) - Number(d.kredit || 0);
      });
    });
    return (coa || []).map((c: any) => ({ ...c, saldo: balances[c.kode] || 0 }));
  }, [coa, filteredJurnal]);

  const tbProfit = useMemo(() => {
    const periodSo = filterByPeriod(so || [], period, "tgl_muat");
    return periodSo.map((s: any) => {
      const relatedJurnal = (jurnal || []).filter((j: any) =>
        (j.no_so || "").includes(s.order_id) || (j.keterangan || "").includes(s.order_id)
      );
      const revenue = s.total_harga || 0;
      const expense = relatedJurnal.reduce((sum: number, j: any) =>
        sum + (j.jurnal_detail || [])
          .filter((d: any) => ["5", "6", "7", "8", "9"].some(p => d.coa_kode.startsWith(p)))
          .reduce((x: number, d: any) => x + (Number(d.debit) - Number(d.kredit)), 0),
        0);
      return { order_id: s.order_id, tgl: s.tgl_muat, customer: s.customer, revenue, expense, profit: revenue - expense };
    });
  }, [so, jurnal, period]);

  // FIX #12: Sparkline data untuk dashboard — dihitung dari jurnal historis nyata
  // (dipakai di Dashboard bukan Laporan, tapi computed di sini bisa diexport)

  // ─── BUKU BESAR ─────────────────────────────────────────────────────────
  const bukuBesarData = useMemo(() => {
    if (!selectedCoa) return [];
    const entries: any[] = [];
    let runningBalance = 0;
    const sorted = [...(filteredJurnal)].sort((a, b) => a.tanggal?.localeCompare(b.tanggal));
    sorted.forEach(j => {
      (j.jurnal_detail || []).forEach((d: any) => {
        if (d.coa_kode !== selectedCoa) return;
        const debit = Number(d.debit || 0);
        const kredit = Number(d.kredit || 0);
        runningBalance += debit - kredit;
        entries.push({
          tanggal: j.tanggal,
          no_jurnal: j.no_jurnal,
          keterangan: j.keterangan,
          debit,
          kredit,
          saldo: runningBalance,
        });
      });
    });
    return entries;
  }, [selectedCoa, filteredJurnal]);

  // ─── SUB PAGES ──────────────────────────────────────────────────────────

  if (activeSub === "neraca") {
    const totalAset = tbNeraca.filter(c => c.kode.startsWith("1")).reduce((s, c) => s + c.saldo, 0);
    const totalLiab = tbNeraca.filter(c => c.kode.startsWith("2")).reduce((s, c) => s + Math.abs(c.saldo), 0);
    const totalEkuitas = tbNeraca.filter(c => c.kode.startsWith("3")).reduce((s, c) => s + Math.abs(c.saldo), 0);
    const netIncome = tbNeraca.filter(c => ["4", "5", "6", "7", "8", "9"].some(p => c.kode.startsWith(p))).reduce((s, c) => s + (c.saldo * -1), 0);
    const selisih = totalAset - (totalLiab + totalEkuitas + netIncome);

    return (
      <div className="fade-up">
        <SectionHeader title="Laporan Neraca" sub="Posisi keuangan (akumulatif)" />
        <PeriodFilter period={period} setPeriod={setPeriod} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
          {[
            { label: "TOTAL ASET", value: totalAset, color: C.blue },
            { label: "LIABILITAS + EKUITAS", value: totalLiab + totalEkuitas, color: C.red },
            { label: "LABA BERJALAN", value: netIncome, color: C.green },
            { label: "BALANCE", value: selisih, color: Math.abs(selisih) < 100 ? C.green : C.red },
          ].map(({ label, value, color }) => (
            <Card key={label} style={{ borderLeft: `4px solid ${color}` }}>
              <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600, marginBottom: 8 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color }}>{fmt(value)}</div>
            </Card>
          ))}
        </div>

        <Card style={{ padding: 0 }}>
          <div style={{ maxHeight: "calc(100vh - 380px)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>ID AKUN</th>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>NAMA AKUN</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>SALDO</th>
                </tr>
              </thead>
              <tbody>
                {[["ASET", "1"], ["KEWAJIBAN", "2"], ["EKUITAS", "3"]].map(([title, range]) => {
                  const items = tbNeraca.filter(c => c.kode.startsWith(range));
                  if (items.length === 0) return null;
                  return (
                    <React.Fragment key={title}>
                      <tr style={{ background: C.bg }}>
                        <td colSpan={3} style={{ padding: "10px 16px", fontWeight: 700, fontSize: 11, color: C.textMed }}>{title}</td>
                      </tr>
                      {items.map(r => (
                        <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: "10px 16px", color: C.accent, fontWeight: 600 }}>{r.kode}</td>
                          <td style={{ padding: "10px 16px" }}>{r.nama}</td>
                          <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700 }}>{fmt(range === "1" ? r.saldo : r.saldo * -1)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  if (activeSub === "labarugi") {
    // ── PSAK format: Pendapatan → HPP → Laba Kotor → Beban Operasional → Laba Operasional → Non-Operasional → Laba Bersih
    const pnd  = tbLabaRugi.filter(c => c.kode.startsWith("4")).filter(c => Math.abs(c.saldo) > 0);
    const hpp  = tbLabaRugi.filter(c => c.kode.startsWith("5")).filter(c => Math.abs(c.saldo) > 0);
    const bop  = tbLabaRugi.filter(c => c.kode.startsWith("6")).filter(c => Math.abs(c.saldo) > 0);
    const nonOp = tbLabaRugi.filter(c => ["7","8"].some(p => c.kode.startsWith(p))).filter(c => Math.abs(c.saldo) > 0);
    const pajak = tbLabaRugi.filter(c => c.kode.startsWith("9")).filter(c => Math.abs(c.saldo) > 0);

    const totPnd   = pnd.reduce((s, c) => s + Math.abs(c.saldo), 0);
    const totHpp   = hpp.reduce((s, c) => s + Math.abs(c.saldo), 0);
    const labaKotor = totPnd - totHpp;
    const totBop   = bop.reduce((s, c) => s + Math.abs(c.saldo), 0);
    const labaOp   = labaKotor - totBop;
    const totNonOp = nonOp.reduce((s, c) => s + (c.saldo * -1), 0);
    const totPajak = pajak.reduce((s, c) => s + Math.abs(c.saldo), 0);
    const labaBersih = labaOp + totNonOp - totPajak;

    const LR_Row = ({ label, value, indent = 0, bold = false, topLine = false, bottomLine = false, color }: any) => (
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "7px 0",
        paddingLeft: indent * 20,
        borderTop: topLine ? `1px solid ${C.border}` : undefined,
        borderBottom: bottomLine ? `2px solid ${C.text}` : undefined,
        fontWeight: bold ? 700 : 400,
        fontSize: bold ? 13 : 12.5,
      }}>
        <span style={{ color: color || (bold ? C.text : C.textMed) }}>{label}</span>
        <span style={{ fontVariantNumeric: "tabular-nums", color: color || (value < 0 ? C.red : bold ? C.text : C.textMed) }}>
          {value !== undefined ? fmt(Math.abs(value)) : ""}
          {value !== undefined && value < 0 ? " (R)" : ""}
        </span>
      </div>
    );

    const Section = ({ title, items, total, totalLabel, emptyMsg }: any) => (
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.08em", padding: "10px 0 4px" }}>{title}</div>
        {items.length === 0
          ? <div style={{ fontSize: 12, color: C.textLight, padding: "4px 0 4px 20px" }}>{emptyMsg || "Belum ada data"}</div>
          : items.map((p: any) => <LR_Row key={p.id} label={`${p.kode} · ${p.nama}`} value={Math.abs(p.saldo)} indent={1} />)
        }
        <LR_Row label={totalLabel} value={total} bold topLine />
      </div>
    );

    return (
      <div className="fade-up">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <SectionHeader title="Laporan Laba Rugi" sub="Berdasarkan standar akuntansi (PSAK)" />
          <PeriodFilter period={period} setPeriod={setPeriod} />
        </div>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Pendapatan", value: totPnd, color: C.blue },
            { label: "Laba Kotor", value: labaKotor, color: labaKotor >= 0 ? C.green : C.red },
            { label: "Laba Operasional", value: labaOp, color: labaOp >= 0 ? C.green : C.red },
            { label: "Laba Bersih", value: labaBersih, color: labaBersih >= 0 ? C.green : C.red },
          ].map(({ label, value, color }) => (
            <Card key={label} style={{ borderLeft: `4px solid ${color}`, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color }}>{fmt(Math.abs(value))}</div>
              {value < 0 && <div style={{ fontSize: 10, color: C.red, marginTop: 2 }}>Defisit</div>}
            </Card>
          ))}
        </div>

        {/* Report body */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Left column */}
          <Card style={{ padding: "16px 24px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>PT Sugiarto Jaya Mandiri</div>
            <div style={{ fontSize: 12, color: C.textLight, marginBottom: 20 }}>
              Laporan Laba Rugi Komprehensif
              {period.mode === "month" && ` — ${["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][period.month]} ${period.year}`}
              {period.mode === "year" && ` — Tahun ${period.year}`}
              {period.mode === "all" && " — Semua Periode"}
            </div>

            <Section title="A. Pendapatan Usaha" items={pnd} total={totPnd} totalLabel="Total Pendapatan Usaha" emptyMsg="Belum ada pendapatan tercatat" />

            <Section title="B. Harga Pokok Penjualan (HPP)" items={hpp} total={totHpp} totalLabel="Total HPP" emptyMsg="Belum ada HPP tercatat" />

            <div style={{ padding: "10px 0", borderTop: `2px solid ${C.text}`, borderBottom: `2px solid ${C.text}`, marginBottom: 4 }}>
              <LR_Row label="LABA KOTOR" value={labaKotor} bold color={labaKotor >= 0 ? C.green : C.red} />
            </div>

            <Section title="C. Beban Operasional" items={bop} total={totBop} totalLabel="Total Beban Operasional" emptyMsg="Belum ada beban operasional" />

            <div style={{ padding: "10px 0", borderTop: `2px solid ${C.text}`, borderBottom: `2px solid ${C.text}`, marginBottom: 4 }}>
              <LR_Row label="LABA (RUGI) USAHA" value={labaOp} bold color={labaOp >= 0 ? C.green : C.red} />
            </div>

            {nonOp.length > 0 && (
              <>
                <Section title="D. Pendapatan / (Beban) Non-Operasional" items={nonOp} total={totNonOp} totalLabel="Total Non-Operasional" />
                <div style={{ padding: "10px 0", borderTop: `2px solid ${C.text}`, borderBottom: `2px solid ${C.text}`, marginBottom: 4 }}>
                  <LR_Row label="LABA (RUGI) SEBELUM PAJAK" value={labaOp + totNonOp} bold />
                </div>
              </>
            )}

            {pajak.length > 0 && (
              <Section title="E. Pajak Penghasilan" items={pajak} total={totPajak} totalLabel="Total Beban Pajak" />
            )}

            <div style={{ marginTop: 12, background: labaBersih >= 0 ? C.greenLight : C.redLight, border: `1px solid ${labaBersih >= 0 ? C.green : C.red}`, borderRadius: 8, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: labaBersih >= 0 ? C.green : C.red }}>LABA (RUGI) BERSIH</div>
                  <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>Setelah pajak</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: labaBersih >= 0 ? C.green : C.red }}>
                  {labaBersih < 0 && "("}Rp {Math.abs(labaBersih).toLocaleString("id-ID")}{labaBersih < 0 && ")"}
                </div>
              </div>
            </div>
          </Card>

          {/* Right column — rasio analisis */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Analisis Rasio</div>
              {[
                { label: "Gross Profit Margin", value: totPnd > 0 ? ((labaKotor / totPnd) * 100).toFixed(1) + "%" : "—", good: labaKotor > 0 },
                { label: "Operating Profit Margin", value: totPnd > 0 ? ((labaOp / totPnd) * 100).toFixed(1) + "%" : "—", good: labaOp > 0 },
                { label: "Net Profit Margin", value: totPnd > 0 ? ((labaBersih / totPnd) * 100).toFixed(1) + "%" : "—", good: labaBersih > 0 },
                { label: "Beban / Pendapatan", value: totPnd > 0 ? (((totHpp + totBop) / totPnd) * 100).toFixed(1) + "%" : "—", good: (totHpp + totBop) < totPnd },
              ].map(({ label, value, good }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                  <span style={{ color: C.textMed }}>{label}</span>
                  <span style={{ fontWeight: 700, color: value === "—" ? C.textLight : good ? C.green : C.red }}>{value}</span>
                </div>
              ))}
            </Card>

            <Card style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Ringkasan</div>
              {[
                { label: "Total Pendapatan", value: totPnd, color: C.blue },
                { label: "Total HPP", value: totHpp, color: C.textMed },
                { label: "Laba Kotor", value: labaKotor, color: labaKotor >= 0 ? C.green : C.red },
                { label: "Total Beban Operasional", value: totBop, color: C.textMed },
                { label: "Laba Operasional", value: labaOp, color: labaOp >= 0 ? C.green : C.red },
                ...(totNonOp !== 0 ? [{ label: "Non-Operasional", value: totNonOp, color: C.textMed }] : []),
                ...(totPajak > 0 ? [{ label: "Beban Pajak", value: -totPajak, color: C.textMed }] : []),
                { label: "Laba Bersih", value: labaBersih, color: labaBersih >= 0 ? C.green : C.red },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                  <span style={{ color: C.textMed }}>{label}</span>
                  <span style={{ fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>{fmt(value)}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (activeSub === "bukubesar") {
    const aktiveCoa = (coa || []).filter((c: any) => c.status === "Aktif");
    return (
      <div className="fade-up">
        <SectionHeader title="Buku Besar" sub="Mutasi per akun" />
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <select className="input-field" style={{ width: 280 }} value={selectedCoa} onChange={e => setSelectedCoa(e.target.value)}>
            <option value="">— Pilih Akun —</option>
            {aktiveCoa.map((c: any) => <option key={c.kode} value={c.kode}>{c.kode} · {c.nama}</option>)}
          </select>
          <PeriodFilter period={period} setPeriod={setPeriod} />
        </div>

        {!selectedCoa ? (
          <Card>
            <div style={{ textAlign: "center", padding: 40, color: C.textLight }}>
              <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>▤</div>
              Pilih akun untuk menampilkan mutasi
            </div>
          </Card>
        ) : (
          <Card style={{ padding: 0 }}>
            <div style={{ maxHeight: "calc(100vh - 320px)", overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
                    <th style={{ padding: "10px 14px", textAlign: "left" }}>TANGGAL</th>
                    <th style={{ padding: "10px 14px", textAlign: "left" }}>NO JURNAL</th>
                    <th style={{ padding: "10px 14px", textAlign: "left" }}>KETERANGAN</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>DEBIT</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>KREDIT</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>SALDO</th>
                  </tr>
                </thead>
                <tbody>
                  {bukuBesarData.length === 0 && <EmptyState colSpan={6} msg="Tidak ada mutasi untuk akun ini di periode ini" />}
                  {bukuBesarData.map((r: any, i: number) => (
                    <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "10px 14px" }}>{r.tanggal}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <button onClick={() => onJurnalClick && onJurnalClick(r.no_jurnal)}
                          style={{ background: C.accentLight, color: C.accent, border: "none", padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                          {r.no_jurnal}
                        </button>
                      </td>
                      <td style={{ padding: "10px 14px" }}>{r.keterangan}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: C.green }}>{r.debit > 0 ? fmt(r.debit) : "—"}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: C.red }}>{r.kredit > 0 ? fmt(r.kredit) : "—"}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: r.saldo >= 0 ? C.text : C.red }}>{fmt(r.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    );
  }

  if (activeSub === "profit") {
    const totalRevenue = tbProfit.reduce((s: number, p: any) => s + p.revenue, 0);
    const totalExpense = tbProfit.reduce((s: number, p: any) => s + p.expense, 0);
    const totalProfit = tbProfit.reduce((s: number, p: any) => s + p.profit, 0);
    return (
      <div className="fade-up">
        <SectionHeader title="Profitabilitas Muatan" sub="Analisis keuntungan per unit muatan" />
        <PeriodFilter period={period} setPeriod={setPeriod} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
          <Card style={{ borderLeft: `4px solid ${C.blue}` }}>
            <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600, marginBottom: 6 }}>TOTAL PENDAPATAN</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.blue }}>{fmt(totalRevenue)}</div>
          </Card>
          <Card style={{ borderLeft: `4px solid ${C.red}` }}>
            <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600, marginBottom: 6 }}>TOTAL BIAYA</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.red }}>{fmt(totalExpense)}</div>
          </Card>
          <Card style={{ borderLeft: `4px solid ${totalProfit >= 0 ? C.green : C.red}` }}>
            <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600, marginBottom: 6 }}>LABA BERSIH</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: totalProfit >= 0 ? C.green : C.red }}>{fmt(totalProfit)}</div>
          </Card>
        </div>

        <Card style={{ padding: 0 }}>
          <div style={{ maxHeight: "calc(100vh - 360px)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
                  <th style={{ padding: "10px 16px", textAlign: "left" }}>ORDER ID</th>
                  <th style={{ padding: "10px 16px", textAlign: "left" }}>CUSTOMER</th>
                  <th style={{ padding: "10px 16px", textAlign: "right" }}>PENDAPATAN</th>
                  <th style={{ padding: "10px 16px", textAlign: "right" }}>BIAYA</th>
                  <th style={{ padding: "10px 16px", textAlign: "right" }}>PROFIT</th>
                  <th style={{ padding: "10px 16px", textAlign: "right" }}>MARGIN</th>
                </tr>
              </thead>
              <tbody>
                {tbProfit.length === 0 ? <EmptyState colSpan={6} /> :
                  tbProfit.map((p: any, i: number) => (
                    <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                      onClick={() => onSOClick && onSOClick(p.order_id)}>
                      <td style={{ padding: "10px 16px", fontWeight: 700, color: C.accent }}>{p.order_id}</td>
                      <td style={{ padding: "10px 16px" }}>{p.customer}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right" }}>{fmt(p.revenue)}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right", color: C.red }}>{fmt(p.expense)}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: p.profit >= 0 ? C.green : C.red }}>{fmt(p.profit)}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right", color: C.textMed, fontSize: 11 }}>
                        {p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) + "%" : "—"}
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

  if (activeSub === "export") {
    return (
      <div className="fade-up">
        <SectionHeader title="Download & Export" sub="Download laporan dalam format Excel atau PDF" />
        <PeriodFilter period={period} setPeriod={setPeriod} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {[
            {
              label: "Neraca", color: C.blue, icon: I.dashboard,
              desc: "Laporan akumulasi saldo aset, kewajiban, dan ekuitas.",
              title: "Laporan_Neraca",
              data: tbNeraca.map(r => ({ kode: r.kode, nama: r.nama, saldo: r.saldo })),
              cols: ["kode", "nama", "saldo"]
            },
            {
              label: "Laba Rugi", color: C.green, icon: I.trendingUp,
              desc: "Ringkasan performa finansial (pendapatan vs biaya).",
              title: "Laporan_LabaRugi",
              data: tbLabaRugi.filter(c => ["4", "5", "6", "7", "8", "9"].some(p => c.kode.startsWith(p))).map(r => ({ kode: r.kode, nama: r.nama, saldo: r.saldo })),
              cols: ["kode", "nama", "saldo"]
            },
            {
              label: "Profitabilitas", color: C.accent, icon: I.dollar,
              desc: "Analisis keuntungan per unit muatan atau Sales Order.",
              title: "Profitabilitas_Muatan",
              data: tbProfit,
              cols: ["order_id", "customer", "revenue", "expense", "profit"]
            },
          ].map(({ label, color, icon, desc, title, data, cols }) => (
            <Card key={label} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: 180 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, color, marginBottom: 12 }}>
                  <Icon d={icon} size={20} />
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{label}</div>
                </div>
                <div style={{ fontSize: 12, color: C.textLight }}>{desc}</div>
              </div>
              <ExportButton title={title} data={data} columns={cols} />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up">
      <SectionHeader title="Laporan" sub="Pilih sub-laporan di menu atas" />
      <div style={{ padding: 60, textAlign: "center", color: C.textLight }}>
        <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.2 }}>▤</div>
        Pilih menu laporan di tab atas untuk melihat detail data.
      </div>
    </div>
  );
};
