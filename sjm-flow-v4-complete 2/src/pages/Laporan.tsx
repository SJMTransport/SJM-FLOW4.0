import React, { useMemo, useState } from "react";
import { C } from "@/src/constants";
import { fmt, filterByPeriod } from "@/src/utils";
import { Card, SectionHeader, EmptyState, PeriodFilter } from "@/src/components/SJMComponents";

export const LaporanPage = ({ activeSub, jurnal, coa, so, armada }: any) => {
  const [period, setPeriod] = useState({ mode: "year", year: new Date().getFullYear(), month: new Date().getMonth() });
  const [selectedCoa, setSelectedCoa] = useState("");

  const filteredJurnal = useMemo(() => filterByPeriod(jurnal, period), [jurnal, period]);

  // --- TRAL BALANCE (NERACA SALDO) ---
  const trialBalance = useMemo(() => {
    const balances: Record<string, number> = {};
    coa.forEach((c: any) => { balances[c.kode] = 0; });
    filteredJurnal.forEach((j: any) => {
      (j.jurnal_detail || []).forEach((d: any) => {
        if (balances[d.coa_kode] !== undefined) {
          balances[d.coa_kode] += Number(d.debit || 0) - Number(d.kredit || 0);
        }
      });
    });
    return coa.map((c: any) => ({ ...c, saldo: balances[c.kode] || 0 }));
  }, [coa, filteredJurnal]);

  const groups = [
    { title: "ASET", range: ["1"] },
    { title: "LIABILITAS", range: ["2"] },
    { title: "EKUITAS", range: ["3"] },
    { title: "PENDAPATAN", range: ["4"] },
    { title: "BEBAN", range: ["5", "6", "7", "8", "9"] }
  ];

  if (activeSub === "neraca") {
    const totalAset = trialBalance.filter((c: any) => c.kode.startsWith("1")).reduce((s, c) => s + c.saldo, 0);
    const totalLiab = trialBalance.filter((c: any) => c.kode.startsWith("2")).reduce((s, c) => s + Math.abs(c.saldo), 0);
    const totalEkuitas = trialBalance.filter((c: any) => c.kode.startsWith("3")).reduce((s, c) => s + Math.abs(c.saldo), 0);
    const selisih = totalAset - (totalLiab + totalEkuitas);

    return (
      <div className="fade-up">
        <SectionHeader title="Neraca Saldo" sub="Laporan posisi keuangan (Trial Balance)" />
        <PeriodFilter period={period} setPeriod={setPeriod} />
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
            <Card style={{ borderLeft: `4px solid ${C.blue}` }}>
               <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600, marginBottom: 8 }}>TOTAL ASET</div>
               <div style={{ fontSize: 20, fontWeight: 800, color: C.blue }}>{fmt(totalAset)}</div>
            </Card>
            <Card style={{ borderLeft: `4px solid ${C.red}` }}>
               <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600, marginBottom: 8 }}>LIABILITAS + EKUITAS</div>
               <div style={{ fontSize: 20, fontWeight: 800, color: C.red }}>{fmt(totalLiab + totalEkuitas)}</div>
            </Card>
            <Card style={{ borderLeft: `4px solid ${Math.abs(selisih) < 0.1 ? C.green : C.red}` }}>
               <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600, marginBottom: 8 }}>SELISIH (BALANCE)</div>
               <div style={{ fontSize: 20, fontWeight: 800, color: Math.abs(selisih) < 0.1 ? C.green : C.red }}>{fmt(selisih)}</div>
               <div style={{ fontSize: 11, color: C.textMed, marginTop: 4 }}>{Math.abs(selisih) < 0.1 ? "✓ Seimbang" : "✕ Tidak Seimbang"}</div>
            </Card>
        </div>

        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>COA</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>NAMA AKUN</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>SUB KELOMPOK</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>SALDO</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => {
                const rows = trialBalance.filter(c => g.range.some(r => c.kode.startsWith(r)));
                if (rows.length === 0) return null;
                const total = rows.reduce((s, r) => s + r.saldo, 0);
                return (
                  <React.Fragment key={g.title}>
                    <tr style={{ background: "#F9FAFB" }}>
                      <td colSpan={4} style={{ padding: "10px 16px", fontWeight: 700, fontSize: 11, color: C.textMed }}>{g.title}</td>
                    </tr>
                    {rows.map(r => (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }} className="row-hover">
                        <td style={{ padding: "10px 16px", color: C.accent, fontWeight: 600 }}>{r.kode}</td>
                        <td style={{ padding: "10px 16px" }}>{r.nama}</td>
                        <td style={{ padding: "10px 16px", color: C.textLight }}>{r.sub_kelompok}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: r.saldo < 0 ? C.red : C.text }}>{fmt(r.saldo)}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 700, background: "#fff" }}>
                      <td colSpan={3} style={{ padding: "10px 16px", textAlign: "right", fontSize: 11 }}>Total {g.title}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right" }}>{fmt(total)}</td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  if (activeSub === "labarugi") {
    const pnd = trialBalance.filter(c => c.kode.startsWith("4"));
    const bbp = trialBalance.filter(c => c.kode.startsWith("5"));
    const bop = trialBalance.filter(c => c.kode.startsWith("6"));
    const lain = trialBalance.filter(c => ["7", "8", "9"].some(p => c.kode.startsWith(p)));

    const totPnd = pnd.reduce((s, c) => s + Math.abs(c.saldo), 0);
    const totBbp = bbp.reduce((s, c) => s + Math.abs(c.saldo), 0);
    const totBop = bop.reduce((s, c) => s + Math.abs(c.saldo), 0);
    const totLain = lain.reduce((s, c) => s + (Number(c.saldo || 0) * -1), 0);

    const labaKotor = totPnd - totBbp;
    const labaOp = labaKotor - totBop;
    const labaBersih = labaOp + totLain;

    const Row = ({ label, value, bold = false, indent = false, color }: any) => (
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        padding: "10px 0", 
        borderBottom: `1px solid ${C.border}`,
        fontWeight: bold ? 700 : 400,
        paddingLeft: indent ? 24 : 0,
        fontSize: bold ? 14 : 13
      }}>
        <span style={{ color: bold ? C.text : C.textMed }}>{label}</span>
        <span style={{ color: color || (bold ? C.text : C.text) }}>{fmt(value)}</span>
      </div>
    );

    return (
      <div className="fade-up">
        <SectionHeader title="Laporan Laba Rugi" sub="Format Standar Akuntansi" />
        <PeriodFilter period={period} setPeriod={setPeriod} />
        <Card style={{ maxWidth: 700, margin: "0 auto", padding: "32px 40px" }}>
            <div style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 800, color: C.accent, marginBottom: 12, fontSize: 11, letterSpacing: "1px" }}>PENDAPATAN USAHA</div>
                {pnd.map(p => <Row key={p.id} label={p.nama} value={Math.abs(p.saldo)} indent />)}
                <Row label="TOTAL PENDAPATAN USAHA" value={totPnd} bold color={C.green} />
            </div>

            <div style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 800, color: C.accent, marginBottom: 12, fontSize: 11, letterSpacing: "1px" }}>BEBAN POKOK PENDAPATAN (COGS)</div>
                {bbp.map(p => <Row key={p.id} label={p.nama} value={Math.abs(p.saldo)} indent />)}
                <Row label="TOTAL BEBAN POKOK PENDAPATAN" value={totBbp} bold color={C.red} />
            </div>

            <div style={{ marginBottom: 32, background: C.bg, padding: "4px 16px", borderRadius: 8 }}>
                <Row label="LABA KOTOR (GROSS PROFIT)" value={labaKotor} bold color={labaKotor >= 0 ? C.green : C.red} />
            </div>

            <div style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 800, color: C.accent, marginBottom: 12, fontSize: 11, letterSpacing: "1px" }}>BEBAN OPERASIONAL (OPEX)</div>
                {bop.map(p => <Row key={p.id} label={p.nama} value={Math.abs(p.saldo)} indent />)}
                <Row label="TOTAL BEBAN OPERASIONAL" value={totBop} bold color={C.red} />
            </div>

            <div style={{ marginBottom: 32, background: C.bg, padding: "4px 16px", borderRadius: 8 }}>
                <Row label="LABA USAHA (OPERATING INCOME)" value={labaOp} bold color={labaOp >= 0 ? C.green : C.red} />
            </div>

            <div style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 800, color: C.accent, marginBottom: 12, fontSize: 11, letterSpacing: "1px" }}>PENDAPATAN & BEBAN NON-OPERASIONAL</div>
                {lain.length === 0 && <div style={{ fontSize: 12, color: C.textLight, padding: "8px 0" }}>Tidak ada transaksi</div>}
                {lain.map(p => <Row key={p.id} label={p.nama} value={Number(p.saldo) * -1} indent />)}
                <Row label="TOTAL NON-OPERASIONAL NET" value={totLain} bold />
            </div>

            <div style={{ marginTop: 40, background: C.accent, color: "#fff", padding: "20px 32px", borderRadius: 12, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ opacity: 0.9, fontSize: 14, fontWeight: 600 }}>LABA BERSIH (NET INCOME)</div>
                    <div style={{ fontWeight: 900, fontSize: 28 }}>{fmt(labaBersih)}</div>
                </div>
            </div>
        </Card>
      </div>
    );
  }

  if (activeSub === "bukubesar") {
    const activeCoa = selectedCoa || (coa && coa[0]?.kode);
    const coaData = coa.find((c: any) => c.kode === activeCoa);
    const ledgerLines = filteredJurnal.flatMap((j: any) => 
      (j.jurnal_detail || [])
        .filter((d: any) => d.coa_kode === activeCoa)
        .map((d: any) => ({ ...d, tanggal: j.tanggal, keterangan: j.keterangan, no_jurnal: j.no_jurnal }))
    ).sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    let runningSaldo = 0;

    return (
      <div className="fade-up">
        <SectionHeader title="Buku Besar" sub="Rincian mutasi per akun" />
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
           <PeriodFilter period={period} setPeriod={setPeriod} />
        </div>
        <div style={{ marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
           <span style={{ fontSize: 13, fontWeight: 600 }}>Pilih Akun:</span>
           <select className="input-field" value={activeCoa} onChange={e => setSelectedCoa(e.target.value)} style={{ width: 300 }}>
              {coa.map((c: any) => <option key={c.id} value={c.kode}>{c.kode} - {c.nama}</option>)}
           </select>
        </div>

        {coaData && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
             <Card>
                <div style={{ fontSize: 11, color: C.textLight }}>NAMA AKUN</div>
                <div style={{ fontWeight: 700 }}>{coaData.nama}</div>
             </Card>
             <Card>
                <div style={{ fontSize: 11, color: C.textLight }}>KELOMPOK</div>
                <div style={{ fontWeight: 700 }}>{coaData.kelompok}</div>
             </Card>
             <Card style={{ background: C.accentLight }}>
                <div style={{ fontSize: 11, color: C.accent }}>SALDO AKHIR PERIODE</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: C.accent }}>{fmt(ledgerLines.reduce((s, l) => s + (l.debit - l.kredit), 0))}</div>
             </Card>
          </div>
        )}

        <Card style={{ padding: 0, overflow: "hidden" }}>
           <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
             <thead>
               <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                 <th style={{ padding: "10px 16px", textAlign: "left" }}>TANGGAL</th>
                 <th style={{ padding: "10px 16px", textAlign: "left" }}>REF</th>
                 <th style={{ padding: "10px 16px", textAlign: "left" }}>KETERANGAN</th>
                 <th style={{ padding: "10px 16px", textAlign: "right" }}>DEBIT</th>
                 <th style={{ padding: "10px 16px", textAlign: "right" }}>KREDIT</th>
                 <th style={{ padding: "10px 16px", textAlign: "right" }}>SALDO</th>
               </tr>
             </thead>
             <tbody>
               {ledgerLines.length === 0 && <EmptyState colSpan={6} />}
               {ledgerLines.map((l, i) => {
                 runningSaldo += (l.debit - l.kredit);
                 return (
                   <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }} className="row-hover">
                     <td style={{ padding: "10px 16px" }}>{l.tanggal}</td>
                     <td style={{ padding: "10px 16px", color: C.accent, fontWeight: 600 }}>{l.no_jurnal}</td>
                     <td style={{ padding: "10px 16px" }}>{l.keterangan}</td>
                     <td style={{ padding: "10px 16px", textAlign: "right" }}>{l.debit > 0 ? fmt(l.debit) : "-"}</td>
                     <td style={{ padding: "10px 16px", textAlign: "right" }}>{l.kredit > 0 ? fmt(l.kredit) : "-"}</td>
                     <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700 }}>{fmt(runningSaldo)}</td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
        </Card>
      </div>
    );
  }

  if (activeSub === "profit") {
    const profitData = (so || []).map((s: any) => {
      // Find related journals for this SO
      const relatedJurnal = jurnal.filter((j: any) => (j.keterangan || "").includes(s.order_id));
      const revenue = s.total_harga || 0;
      const expense = relatedJurnal.reduce((sum: number, j: any) => {
        return sum + (j.jurnal_detail || [])
          .filter((d: any) => d.coa_kode.startsWith("5") || d.coa_kode.startsWith("6")) // Expense COAs
          .reduce((innerSum: number, d: any) => innerSum + (d.debit - d.kredit), 0);
      }, 0);
      return { ...s, revenue, expense, profit: revenue - expense };
    });

    const totalRev = profitData.reduce((sum, p) => sum + p.revenue, 0);
    const totalExp = profitData.reduce((sum, p) => sum + p.expense, 0);

    return (
      <div className="fade-up">
        <SectionHeader title="Profitabilitas" sub="Analisis keuntungan per Sales Order" />
        <PeriodFilter period={period} setPeriod={setPeriod} />
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
           <Card style={{ background: C.blueLight }}>
              <div style={{ fontSize: 11, color: C.blue, fontWeight: 700 }}>REVENUE</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.blue }}>{fmt(totalRev)}</div>
           </Card>
           <Card style={{ background: C.redLight }}>
              <div style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>EXPENSE (COGS/OPEX)</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.red }}>{fmt(totalExp)}</div>
           </Card>
           <Card style={{ background: C.greenLight }}>
              <div style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>GP (GROSS PROFIT)</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.green }}>{fmt(totalRev - totalExp)}</div>
           </Card>
        </div>

        <Card style={{ padding: 0, overflow: "hidden" }}>
           <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
             <thead>
               <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                 <th style={{ padding: "10px 16px", textAlign: "left" }}>ORDER ID</th>
                 <th style={{ padding: "10px 16px", textAlign: "left" }}>CUSTOMER</th>
                 <th style={{ padding: "10px 16px", textAlign: "right" }}>PENDAPATAN</th>
                 <th style={{ padding: "10px 16px", textAlign: "right" }}>BIAYA</th>
                 <th style={{ padding: "10px 16px", textAlign: "right" }}>PROFIT</th>
                 <th style={{ padding: "10px 16px", textAlign: "right" }}>%</th>
               </tr>
             </thead>
             <tbody>
               {profitData.map((p: any) => (
                 <tr key={p.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                   <td style={{ padding: "10px 16px", fontWeight: 600 }}>{p.order_id}</td>
                   <td style={{ padding: "10px 16px" }}>{p.customer}</td>
                   <td style={{ padding: "10px 16px", textAlign: "right" }}>{fmt(p.revenue)}</td>
                   <td style={{ padding: "10px 16px", textAlign: "right", color: C.red }}>{fmt(p.expense)}</td>
                   <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: p.profit >= 0 ? C.green : C.red }}>{fmt(p.profit)}</td>
                   <td style={{ padding: "10px 16px", textAlign: "right" }}>
                      {p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) + "%" : "0%"}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </Card>
      </div>
    );
  }

  if (activeSub === "perunit") {
    const unitStats = (armada || []).map((a: any) => {
        const unitSO = (so || []).filter((s: any) => s.no_polisi === a.no_polisi);
        const revenue = unitSO.reduce((sum: number, s: any) => sum + (s.total_harga || 0), 0);
        const costs = filteredJurnal.reduce((sum: number, j: any) => {
            if ((j.keterangan || "").includes(a.no_polisi)) {
                return sum + (j.jurnal_detail || [])
                    .filter((d: any) => d.coa_kode.startsWith("5") || d.coa_kode.startsWith("6"))
                    .reduce((innerSum: number, d: any) => innerSum + (d.debit - d.kredit), 0);
            }
            return sum;
        }, 0);
        return { ...a, revenue, costs, profit: revenue - costs, tripCount: unitSO.length };
    });

    return (
        <div className="fade-up">
            <SectionHeader title="Analisis Per Unit" sub="Produktivitas dan margin per armada" />
            <Card style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                            <th style={{ padding: "12px 16px", textAlign: "left" }}>NO POLISI</th>
                            <th style={{ padding: "12px 16px", textAlign: "left" }}>MERK / JENIS</th>
                            <th style={{ padding: "12px 16px", textAlign: "center" }}>TOTAL TRIP</th>
                            <th style={{ padding: "12px 16px", textAlign: "right" }}>REVENUE</th>
                            <th style={{ padding: "12px 16px", textAlign: "right" }}>BIAYA</th>
                            <th style={{ padding: "12px 16px", textAlign: "right" }}>PROFIT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {unitStats.map((u: any) => (
                            <tr key={u.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                                <td style={{ padding: "12px 16px", fontWeight: 700 }}>{u.no_polisi}</td>
                                <td style={{ padding: "12px 16px" }}>{u.merk} {u.jenis}</td>
                                <td style={{ padding: "12px 16px", textAlign: "center" }}>{u.tripCount}</td>
                                <td style={{ padding: "12px 16px", textAlign: "right" }}>{fmt(u.revenue)}</td>
                                <td style={{ padding: "12px 16px", textAlign: "right", color: C.red }}>{fmt(u.costs)}</td>
                                <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: u.profit >= 0 ? C.green : C.red }}>{fmt(u.profit)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
  }

  if (activeSub === "export") {
    return (
        <div className="fade-up">
            <SectionHeader title="Export Data" sub="Download laporan dalam format Excel/CSV" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
                {["Laporan Jurnal", "Laporan Piutang", "Rekap Sales Order", "Data Armada"].map(label => (
                    <Card key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: 600 }}>{label}</div>
                        <button className="btn-ghost" style={{ fontSize: 11 }}>Download CSV ↓</button>
                    </Card>
                ))}
            </div>
        </div>
    );
  }

  return <div className="fade-up" style={{ padding: 40, textAlign: "center", color: C.textLight }}>Halaman {activeSub} masih dalam tahap pengembangan</div>;
};
