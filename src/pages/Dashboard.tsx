import React, { useState, useMemo } from "react";
import { C, I } from "../constants";
import { fmtShort, filterByPeriod } from "@/src/utils";
import { Card, StatCard, Spark, PeriodFilter, Icon } from "@/src/components/SJMComponents";

export const Dashboard = ({ jurnal, so, coa, piutang, armada = [], sopir = [], armadaDokumen = [], onNavigate, onSOClick, onJurnalClick }: any) => {
  const [period, setPeriod] = useState({ mode: "month", month: new Date().getMonth(), year: new Date().getFullYear() });
  const [expandedStatus, setExpandedStatus] = useState<string | null>(null);

  const jurnalBulan = useMemo(() => filterByPeriod(jurnal || [], period), [jurnal, period]);
  const soBulan = useMemo(() => filterByPeriod(so || [], period, "tgl_muat"), [so, period]);

  const coaPendapatan = useMemo(() => new Set((coa || []).filter((c: any) => c.kelompok === "Pendapatan").map((c: any) => c.kode)), [coa]);
  const coaBeban = useMemo(() => new Set((coa || []).filter((c: any) => c.kelompok === "Beban").map((c: any) => c.kode)), [coa]);
  
  const totalPendapatan = useMemo(() => jurnalBulan.reduce((s: number, j: any) => s + (j.jurnal_detail || []).filter((e: any) => coaPendapatan.has(e.coa_kode)).reduce((a: number, e: any) => a + Number(e.kredit), 0), 0), [jurnalBulan, coaPendapatan]);
  const totalBeban = useMemo(() => jurnalBulan.reduce((s: number, j: any) => s + (j.jurnal_detail || []).filter((e: any) => coaBeban.has(e.coa_kode)).reduce((a: number, e: any) => a + Number(e.debit), 0), 0), [jurnalBulan, coaBeban]);
  const labaRugi = totalPendapatan - totalBeban;
  const totalPiutang = useMemo(() => piutang.reduce((s: number, p: any) => s + Number(p.sisa_piutang || 0), 0), [piutang]);

  const soOngoing = useMemo(() => soBulan.filter((s: any) => ["On Going", "Loading", "Arrived"].includes(s.status_muatan)).length, [soBulan]);
  const soRevenue = useMemo(() => soBulan.reduce((s: number, o: any) => s + Number(o.total_harga_pajak || o.total_harga || 0), 0), [soBulan]);

  const kasAkun = useMemo(() => (coa || []).filter((c: any) =>
    c.kelompok === "Aset" && c.status === "Aktif" && (
      (c.sub_kelompok || "").toLowerCase().includes("kas") ||
      (c.sub_kelompok || "").toLowerCase().includes("bank") ||
      (c.nama || "").toLowerCase().includes("kas") ||
      (c.nama || "").toLowerCase().includes("bank")
    )
  ).sort((a: any, b: any) => a.kode.localeCompare(b.kode)), [coa]);

  const kasMap = useMemo(() => {
    const map: any = {};
    kasAkun.forEach((a: any) => { map[a.kode] = 0; });
    jurnal.forEach((j: any) => {
      (j.jurnal_detail || []).forEach((e: any) => {
        if (map.hasOwnProperty(e.coa_kode)) {
          map[e.coa_kode] += Number(e.debit || 0) - Number(e.kredit || 0);
        }
      });
    });
    return map;
  }, [kasAkun, jurnal]);

  const recentTx = useMemo(() => [...jurnal].slice(0, 8), [jurnal]);
  const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

  const chartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const jm = jurnal.filter((j: any) => j.tanggal?.startsWith(ym));
      const pen = jm.reduce((s: number, j: any) => s + (j.jurnal_detail || []).filter((e: any) => coaPendapatan.has(e.coa_kode)).reduce((a: number, e: any) => a + Number(e.kredit), 0), 0);
      const beb = jm.reduce((s: number, j: any) => s + (j.jurnal_detail || []).filter((e: any) => coaBeban.has(e.coa_kode)).reduce((a: number, e: any) => a + Number(e.debit), 0), 0);
      // FIX #12: soCount dari data SO nyata
      const soCount = (so || []).filter((s: any) => (s.tgl_muat || s.tgl_order || "").startsWith(ym)).length;
      return { label: MONTH_LABELS[d.getMonth()], pendapatan: pen, beban: beb, soCount };
    });
  }, [jurnal, coaPendapatan, coaBeban, so]);
  
  const maxChart = Math.max(...chartData.map(d => Math.max(d.pendapatan, d.beban)), 1);

  const earlyWarnings = useMemo(() => {
    const list = [];
    // 1. Armada Docs
    const today = new Date();
    (armadaDokumen || []).forEach((d: any) => {
      const exp = new Date(d.tgl_expired);
      const diff = (exp.getTime() - today.getTime()) / (1000 * 3600 * 24);
      if (diff < 0) list.push({ type: "danger", msg: `DOKUMEN EXPIRED: ${d.no_polisi} - ${d.jenis_dokumen}` });
      else if (diff < 30) list.push({ type: "warning", msg: `DOKUMEN AKAN HABIS: ${d.no_polisi} (${d.jenis_dokumen}) dlm ${Math.round(diff)} hari` });
    });
    // 2. Pending Jurnal
    const pendingJ = jurnal.filter((j: any) => j.status_approval === "Pending").length;
    if (pendingJ > 0) list.push({ type: "info", msg: `${pendingJ} Jurnal Umum menunggu persetujuan (acc)` });
    // 3. Draft SO
    const draftSO = so.filter((s: any) => s.is_posted === false).length;
    if (draftSO > 0) list.push({ type: "info", msg: `${draftSO} Sales Order masih berupa Draft (belum posting)` });
    return list;
  }, [armadaDokumen, jurnal, so]);

  const recentCargoActivity = useMemo(() => {
    const allLogs: any[] = [];
    (so || []).forEach((s: any) => {
      (s.posisi_log || []).forEach((l: any) => {
        allLogs.push({ ...l, order_id: s.order_id, customer: s.customer });
      });
    });
    return allLogs.sort((a, b) => {
      const ta = new Date(`${a.date} ${a.time}`).getTime();
      const tb = new Date(`${b.date} ${b.time}`).getTime();
      return tb - ta;
    }).slice(0, 10);
  }, [so]);

  return (
    <div className="fade-up">
      {earlyWarnings.length > 0 && (
        <div style={{ marginBottom: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
          {earlyWarnings.map((w, i) => (
            <div key={i} style={{ 
              padding: "10px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: w.type === "danger" ? "#FEE2E2" : w.type === "warning" ? "#FEF3C7" : "#E0F2FE",
              color: w.type === "danger" ? "#991B1B" : w.type === "warning" ? "#92400E" : "#075985",
              border: `1px solid ${w.type === "danger" ? "#FCA5A5" : w.type === "warning" ? "#FCD34D" : "#7DD3FC"}`,
              display: "flex", alignItems: "center", gap: 10
            }}>
              <Icon d={w.type === "danger" ? I.alert : w.type === "warning" ? I.warning : I.info} size={16} />
              {w.msg}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: C.text, letterSpacing: "-0.02em" }}>Ringkasan Bisnis</h2>
          <p style={{ fontSize: 13, color: C.textLight, marginTop: 3 }}>PT Sugiarto Jaya Mandiri</p>
        </div>
        <div style={{ width: 400 }}>
          <PeriodFilter period={period} setPeriod={setPeriod} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
        <StatCard label={`Pendapatan ${period.mode === "all" ? "Seluruh Waktu" : period.mode === "year" ? "Tahun Ini" : "Bulan Ini"}`} value={fmtShort(totalPendapatan)} color={C.green}
          sparkData={chartData.map(d => Math.round(d.pendapatan / 1e6))} />
        <StatCard label="Laba Bersih" value={fmtShort(Math.abs(labaRugi))} sub={labaRugi >= 0 ? "Surplus" : "Defisit"} color={labaRugi >= 0 ? C.green : C.red}
          sparkData={chartData.map(d => Math.round((d.pendapatan - d.beban) / 1e6))} />
        <StatCard label="Piutang Beredar" value={fmtShort(totalPiutang)} sub={`${piutang.filter((p: any) => Number(p.sisa_piutang) > 0 && p.status !== "Lunas").length} outstanding`} color={C.red}
          sparkData={chartData.map(d => Math.round(d.pendapatan / 1e6))} />
        <StatCard label={`SO ${period.mode === "all" ? "Seluruh Waktu" : period.mode === "year" ? "Tahun Ini" : "Bulan Ini"}`} value={soBulan.length} sub={`${soOngoing} berjalan`} color={C.accent}
          sparkData={chartData.map(d => d.soCount || 0)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon d={I.trendingUp} size={18} color={C.green} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>Arus Kas</div>
                <div style={{ fontSize: 11, color: C.textLight, marginTop: 1 }}>Pendapatan vs Beban</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.textLight }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: C.green, display: "inline-block" }} /> Pendapatan</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: C.red, display: "inline-block" }} /> Beban</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
            {chartData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ width: "100%", display: "flex", gap: 2, alignItems: "flex-end", height: 100 }}>
                  <div style={{ flex: 1, background: C.green, opacity: 0.85, borderRadius: "3px 3px 0 0", height: `${(d.pendapatan / maxChart) * 100}%`, minHeight: d.pendapatan > 0 ? 2 : 0, transition: "height 0.4s" }} />
                  <div style={{ flex: 1, background: C.red, opacity: 0.75, borderRadius: "3px 3px 0 0", height: `${(d.beban / maxChart) * 100}%`, minHeight: d.beban > 0 ? 2 : 0, transition: "height 0.4s" }} />
                </div>
                <div style={{ fontSize: 10, color: C.textLight }}>{d.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textLight }}>
            <span>Auto-update system</span>
            <span onClick={() => onNavigate && onNavigate("neraca")} style={{ color: C.blue, cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
               Lihat detail <Icon d={I.arrowRight} size={12} />
            </span>
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
             <Icon d={I.keuangan} size={18} color={C.blue} />
             <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>Daftar Akun Terpantau</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "6px 12px", alignItems: "center" }}>
            <div style={{ fontSize: 10, color: C.textLight, fontWeight: 600, letterSpacing: 0.07 * 11 + 'px' }}>AKUN</div>
            <div style={{ fontSize: 10, color: C.textLight, fontWeight: 600, letterSpacing: 0.07 * 11 + 'px', textAlign: "right" }}>BULAN INI</div>
            <div style={{ fontSize: 10, color: C.textLight, fontWeight: 600, letterSpacing: 0.07 * 11 + 'px', textAlign: "right" }}>TOTAL</div>
            {kasAkun.length === 0
              ? <div style={{ gridColumn: "span 3", fontSize: 12, color: C.textLight, padding: "8px 0" }}>Belum ada akun Kas/Bank di COA</div>
              : kasAkun.map((a: any) => {
                const saldoBulan = jurnalBulan.reduce((s: number, j: any) => {
                  return s + (j.jurnal_detail || []).filter((e: any) => e.coa_kode === a.kode).reduce((x: number, e: any) => x + Number(e.debit || 0) - Number(e.kredit || 0), 0);
                }, 0);
                const saldoTotal = kasMap[a.kode] || 0;
                return (
                  <React.Fragment key={a.kode}>
                    <div style={{ fontSize: 12, color: C.blue }}>{a.kode} · {a.nama}</div>
                    <div style={{ fontSize: 12, color: saldoBulan >= 0 ? C.green : C.red, textAlign: "right", fontWeight: 500 }}>{fmtShort(saldoBulan)}</div>
                    <div style={{ fontSize: 12, color: C.textMed, textAlign: "right" }}>{fmtShort(saldoTotal)}</div>
                  </React.Fragment>
                );
              })
            }
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
             <Icon d={I.list} size={16} color={C.textMed} />
             <div style={{ fontWeight: 600, fontSize: 13 }}>Transaksi Terbaru</div>
          </div>
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}`, position: "sticky", top: 0, zIndex: 5 }}>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>TGL</th>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>ID JURNAL</th>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>KETERANGAN</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>NOMINAL</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.length === 0
                  ? <tr><td colSpan={4} style={{ textAlign: "center", color: C.textLight, padding: 24, fontSize: 13 }}>Belum ada transaksi</td></tr>
                  : recentTx.map((j: any, i: number) => (
                    <tr key={j.id} className="row-hover" style={{ borderBottom: i < recentTx.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      <td style={{ padding: "12px 16px" }}>{j.tanggal}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <button onClick={() => onJurnalClick && onJurnalClick(j.no_jurnal)} style={{ background: C.accentLight, color: C.accent, border: "none", padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{j.no_jurnal}</button>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{j.keterangan}</div>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: (j.jurnal_detail || []).some((e: any) => e.coa_kode?.startsWith("4")) ? C.green : C.red }}>
                        {fmtShort(Number(j.total_debit))}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>

        {(() => {
          const periodeLabel = period.mode === "all" ? "Seluruh Waktu" : period.mode === "year" ? "Tahun Ini" : "Bulan Ini";
          const soRunning = (so || []).filter((s: any) => !["Completed", "Cancelled"].includes(s.status_muatan));
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card style={{ padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                   <Icon d={I.operasional} size={18} color={C.accent} />
                   <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>Aktivitas Muatan Terkini</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 315, overflow: "auto", paddingRight: 4 }}>
                  {recentCargoActivity.length === 0 ? (
                    <div style={{ textAlign: "center", color: C.textLight, fontSize: 12, padding: 20 }}>Belum ada aktivitas muatan</div>
                  ) : (
                    recentCargoActivity.map((l: any, i: number) => (
                      <div key={i} style={{ padding: "8px 0", borderBottom: i < recentCargoActivity.length - 1 ? `1px solid ${C.border}` : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                           <span style={{ fontWeight: 700, fontSize: 11, color: C.accent, cursor: "pointer" }} onClick={() => onSOClick(l.order_id)}>{l.order_id}</span>
                           <span style={{ fontSize: 9, color: C.textLight }}>{l.date} {l.time}</span>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 500, color: C.text }}>{l.location || "Lokasi tidak disebutkan"}</div>
                        <div style={{ fontSize: 10, color: C.textMed, marginTop: 2 }}>{l.info}</div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: C.text, marginBottom: 10 }}>Ringkasan SO {periodeLabel}</div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 10, color: C.textLight, marginBottom: 2 }}>Nilai</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>{fmtShort(soRevenue)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: C.textLight, marginBottom: 2 }}>Sedang Berjalan</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.accent }}>{soRunning.length} SO</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
