import React, { useState, useMemo } from "react";
import { C } from "../constants";
import { fmtShort, filterByPeriod } from "@/src/utils";
import { Card, StatCard, Spark, PeriodFilter, Icon, EmptyState, PageShell, PageHeader, KPIGrid } from "@/src/components/SJMComponents";

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
      return { label: MONTH_LABELS[d.getMonth()], pendapatan: pen, beban: beb };
    });
  }, [jurnal, coaPendapatan, coaBeban]);
  
  const piutangHistory = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      // Calculate closing balance for that month
      const jUpTo = jurnal.filter((j: any) => new Date(j.tanggal) <= new Date(d.getFullYear(), d.getMonth() + 1, 0));
      const bal = jUpTo.reduce((s: number, j: any) => {
          return s + (j.jurnal_detail || []).filter((e: any) => e.coa_kode?.startsWith("112")).reduce((a: number, e: any) => a + Number(e.debit) - Number(e.kredit), 0);
      }, 0);
      return Math.round(bal / 1e6);
    });
  }, [jurnal]);

  const soHistory = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const count = so.filter((s: any) => s.tgl_muat?.startsWith(ym)).length;
      return count;
    });
  }, [so]);

  const maxChart = Math.max(...(chartData || []).map(d => Math.max(d.pendapatan || 0, d.beban || 0)), 1);

  const earlyWarnings = useMemo(() => {
    const list: any[] = [];
    const today = new Date();
    (armadaDokumen || []).forEach((d: any) => {
      const exp = new Date(d.tgl_expired);
      const diff = (exp.getTime() - today.getTime()) / (1000 * 3600 * 24);
      if (diff < 0) list.push({ type: "danger", msg: `Dokumen expired: ${d.no_polisi} - ${d.jenis_dokumen}`, icon: "AlertTriangle", action: () => onNavigate("armada", "dokumen") });
      else if (diff < 30) list.push({ type: "warning", msg: `Dokumen akan habis: ${d.no_polisi} (${d.jenis_dokumen}) dlm ${Math.round(diff)} hari`, icon: "AlertCircle", action: () => onNavigate("armada", "dokumen") });
    });
    
    const pendingJ = (jurnal || []).filter((j: any) => j.status === "Pending").length;
    if (pendingJ > 0) list.push({ type: "info", msg: `${pendingJ} Jurnal Umum menunggu persetujuan (acc)`, icon: "Info", action: () => onNavigate("keuangan", "persetujuan") });
    
    const draftSO = (so || []).filter((s: any) => s.is_posted === false).length;
    if (draftSO > 0) list.push({ type: "info", msg: `${draftSO} Sales Order masih berupa Draft`, icon: "FileText", action: () => onNavigate("operasional", "so") });
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
    <PageShell>
      <PageHeader
        title="Executive Overview"
        sub="Logistics Performance Dashboard"
        action={<PeriodFilter period={period} setPeriod={setPeriod} hideSearch />}
      />

      {earlyWarnings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 -mt-2 mb-6">
          {earlyWarnings.map((w, i) => (
            <div
              key={i}
              onClick={w.action}
              className={`p-3 rounded-xl flex items-center gap-3 transition-all duration-300 group shadow-sm ${
                w.type === "danger"
                  ? "bg-red-brand-light text-red-brand border border-red-brand/10 hover:border-red-brand/30"
                  : w.type === "warning"
                    ? "bg-yellow-brand-light text-yellow-brand border border-yellow-brand/10 hover:border-yellow-brand/30"
                    : "bg-blue-brand-light text-blue-brand border border-blue-brand/10 hover:border-blue-brand/30"
              } ${w.action ? "cursor-pointer hover:bg-white" : "cursor-default"}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                w.type === "danger" ? "bg-red-brand text-white" : w.type === "warning" ? "bg-yellow-brand text-white" : "bg-blue-brand text-white"
              }`}>
                <Icon name={w.icon || "Info"} size={14} />
              </div>
              <div className="flex-1 text-[11px] font-black leading-tight tracking-tight">{w.msg}</div>
              {w.action && <Icon name="ChevronRight" size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
          ))}
        </div>
      )}

      <KPIGrid cols={4}>
        <StatCard 
          label={`Omzet ${period.mode === "month" ? "Bulan Ini" : period.mode === "year" ? "Tahun Ini" : "Total"}`} 
          value={fmtShort(totalPendapatan)} 
          color="var(--color-green-brand)"
          icon="TrendingUp"
          sub={totalPendapatan >= 0 ? "Surplus Keuangan" : "Defisit"}
          sparkData={chartData.map(d => Math.round(d.pendapatan / 1e6))} 
        />
        <StatCard 
          label="Laba Bersih" 
          value={fmtShort(Math.abs(labaRugi))} 
          color={labaRugi >= 0 ? "var(--color-blue-brand)" : "var(--color-red-brand)"}
          icon="Wallet"
          sub={labaRugi >= 0 ? "Margin Positif" : "Defisit Operasional"}
          sparkData={chartData.map(d => Math.round((d.pendapatan - d.beban) / 1e6))} 
        />
        <StatCard 
          label="Piutang Beredar" 
          value={fmtShort(totalPiutang)} 
          color="var(--color-red-brand)"
          icon="CreditCard"
          sub={`${piutang.filter((p: any) => Number(p.sisa_piutang) > 0 && p.status !== "Lunas").length} Invoice Terbuka`}
          sparkData={piutangHistory} 
        />
        <StatCard 
          label="Trip Operasional" 
          value={soBulan.length} 
          icon="Package"
          color="var(--color-accent)"
          sub={`${soOngoing} Unit Aktif`}
          sparkData={soHistory} 
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <Card className="lg:col-span-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-brand/10 text-green-brand flex items-center justify-center">
                <Icon name="Activity" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight leading-none">Analisis Arus Kas</h3>
                <p className="text-[10px] font-bold text-text-light mt-0.5 opacity-60">Revenue vs Expense (6 Bulan)</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-sm bg-green-brand" />
                 <span className="text-[10px] font-bold text-text-light">Pendapatan</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-sm bg-red-brand" />
                 <span className="text-[10px] font-bold text-text-light">Beban</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-end gap-5 h-[180px] mb-6 pt-4 group">
            {(chartData || []).map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3">
                <div className="w-full flex gap-1 items-end h-[150px] relative">
                  <div 
                    className="flex-1 bg-green-brand rounded-t-lg transition-all duration-700 ease-out hover:opacity-100 group-hover:opacity-60 relative group/bar"
                    style={{ height: `${(d.pendapatan / maxChart) * 100}%`, minHeight: d.pendapatan > 0 ? 4 : 0 }}
                  >
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded-md opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {fmtShort(d.pendapatan)}
                    </div>
                  </div>
                  <div 
                    className="flex-1 bg-red-brand/80 rounded-t-lg transition-all duration-700 ease-out hover:opacity-100 group-hover:opacity-40 relative group/bar-red"
                    style={{ height: `${(d.beban / maxChart) * 100}%`, minHeight: d.beban > 0 ? 4 : 0 }}
                  >
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded-md opacity-0 group-hover/bar-red:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {fmtShort(d.beban)}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-text-light">{d.label}</div>
              </div>
            ))}
          </div>
          
          <div className="pt-4 border-t border-border-main flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-light opacity-60 italic">
               <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
               Realtime Update
            </div>
            <button 
              onClick={() => onNavigate && onNavigate("laporan")} 
              className="px-4 py-2 rounded-lg border border-border-main text-text-main text-[11px] font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              Laporan Lengkap <Icon name="ArrowRight" size={12} />
            </button>
          </div>
        </Card>

        <Card className="lg:col-span-2 flex flex-col shadow-sm">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-9 h-9 rounded-xl bg-blue-brand/10 text-blue-brand flex items-center justify-center">
               <Icon name="Landmark" size={18} />
             </div>
             <div>
                <h3 className="text-sm font-black tracking-tight leading-none">Saldo Account</h3>
                <p className="text-[10px] font-bold text-text-light mt-0.5 opacity-60">Utama & Tabungan</p>
             </div>
          </div>
          <div className="flex flex-col gap-1 flex-1 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-1 pb-2 mb-1 border-b border-border-main">
              <div className="col-span-6 text-[10px] font-bold text-text-light opacity-60 italic">Akun</div>
              <div className="col-span-6 text-[10px] font-bold text-text-light opacity-60 text-right italic">Saldo</div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
              {kasAkun.length === 0 ? (
                <div className="p-8 text-center text-[10px] font-bold text-text-light opacity-30 italic">Kosong</div>
              ) : (
                kasAkun.map((a: any) => {
                  const saldoBulan = (jurnalBulan || []).reduce((s: number, j: any) => {
                    return s + (j.jurnal_detail || []).filter((e: any) => e.coa_kode === a.kode).reduce((x: number, e: any) => x + Number(e.debit || 0) - Number(e.kredit || 0), 0);
                  }, 0);
                  const saldoTotal = kasMap[a.kode] || 0;
                  return (
                    <div key={a.kode} className="grid grid-cols-12 gap-4 px-1.5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                      <div className="col-span-6 flex flex-col">
                        <div className="text-[12px] font-bold text-text-main group-hover:text-blue-brand truncate tracking-tight">{a.nama}</div>
                        <div className="text-[10px] font-bold text-text-light tracking-tighter opacity-70 italic">{a.kode}</div>
                      </div>
                      <div className="col-span-6 text-right">
                        <div className="text-[13px] font-black text-text-main tabular-nums leading-none">{fmtShort(saldoTotal)}</div>
                        <div className={`text-[9px] font-bold leading-none mt-1 ${saldoBulan >= 0 ? "text-green-brand":"text-red-brand"}`}>
                           {saldoBulan >= 0 ? "+" : ""}{fmtShort(saldoBulan)} MoM
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3 p-0 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border-main/50 flex justify-between items-center bg-slate-50/50">
             <div className="flex items-center gap-3">
               <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                 <Icon name="ClipboardList" size={18} />
               </div>
               <div>
                  <h3 className="text-sm font-black tracking-tight leading-none">Posting Jurnal</h3>
                  <p className="text-[10px] font-bold text-text-light mt-0.5 opacity-60">Transaksi Terkini</p>
               </div>
             </div>
             <button onClick={() => onNavigate("keuangan", "jurnal")} className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-accent border border-accent/20 hover:bg-accent hover:text-white transition-all">Detail</button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th>Tgl</th>
                  <th>Nomor</th>
                  <th>Ket</th>
                  <th className="text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main/20">
                {(recentTx || []).length === 0 ? (
                  <EmptyState colSpan={4} />
                ) : (
                  recentTx.map((j: any) => (
                    <tr key={j.id} className="group transition-colors">
                      <td className="text-[11px] font-bold text-text-med tabular-nums whitespace-nowrap">{j.tanggal}</td>
                      <td>
                        <button
                         onClick={() => onJurnalClick && onJurnalClick(j.no_jurnal)}
                         className="text-[11px] font-black text-blue-brand hover:underline uppercase tracking-tight"
                        >
                          {j.no_jurnal}
                        </button>
                      </td>
                      <td className="wrap max-w-[200px]">
                        <div className="text-[12px] font-bold text-text-main line-clamp-1 opacity-90 group-hover:text-blue-brand transition-colors" title={j.keterangan}>{j.keterangan}</div>
                      </td>
                      <td className="text-right">
                        <span className={`text-[12px] font-black tracking-tight ${
                          (j.jurnal_detail || []).some((e: any) => String(e.coa_kode).startsWith("4")) ? "text-green-brand" : "text-text-main"
                        }`}>
                          {fmtShort(Number(j.total_debit))}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="lg:col-span-2 flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-3 mb-6">
               <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                 <Icon name="Navigation" size={18} />
               </div>
               <div>
                  <h3 className="text-sm font-black tracking-tight leading-none">Logistik Ops</h3>
                  <p className="text-[10px] font-bold text-text-light mt-0.5 opacity-60">Movement Terkini</p>
               </div>
            </div>
            
            <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1.5 custom-scrollbar">
              {(recentCargoActivity || []).length === 0 ? (
                <div className="p-10 text-center text-[10px] font-bold text-text-light italic border border-dashed border-slate-100 rounded-2xl">Kosong</div>
              ) : (
                recentCargoActivity.map((l: any, i: number) => (
                  <div key={i} className="relative pl-5 pb-5 border-l border-slate-100 last:border-0 last:pb-0 group">
                    <div className="absolute -left-[4.5px] top-0 w-2 h-2 rounded-full bg-white border-2 border-slate-200 group-hover:border-accent transition-all z-10" />
                    
                    <div className="flex justify-between items-start mb-1.5">
                       <button 
                        className="text-[10px] font-bold text-accent hover:underline italic" 
                        onClick={(e) => { e.preventDefault(); onSOClick?.(l.order_id); }}
                       >
                         {l.order_id || "Draft"}
                       </button>
                       <span className="text-[9px] font-bold text-text-light bg-slate-50 px-1.5 py-0.5 rounded border border-black/[0.03]">
                         {l.date} • {l.time}
                       </span>
                    </div>
                    
                    <div className="bg-slate-50/50 p-3 rounded-xl border border-border-main/50 group-hover:bg-white group-hover:shadow-sm transition-all">
                       <div className="text-[11px] font-bold text-text-main flex items-center gap-2 mb-0.5 tracking-tight">
                          <Icon name="MapPin" size={12} className="text-accent shrink-0" />
                          <span className="truncate">{l.location || "Transito"}</span>
                       </div>
                       <div className="text-[10px] font-medium text-text-med truncate opacity-80">{l.info}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="mt-auto bg-slate-900 rounded-3xl p-6 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/20 rounded-full blur-[40px] -mr-8 -mt-8" />
            
            <div className="text-[10px] font-bold text-white/40 mb-6 italic opacity-60">Summary Ops</div>
            
            <div className="grid grid-cols-2 gap-6 relative z-20">
              <div>
                <div className="text-[9px] font-bold text-white/30 mb-1">Total Nilai SO</div>
                <div className="text-xl font-black text-white tracking-tighter tabular-nums leading-none mb-1">{fmtShort(soRevenue)}</div>
                <div className="text-[9px] font-bold text-green-400 flex items-center gap-1 italic opacity-80">
                   <Icon name="ArrowUpRight" size={10} /> Proyeksi
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-white/30 mb-1">Unit Aktif</div>
                <div className="text-xl font-black text-accent tracking-tighter tabular-nums leading-none mb-1">
                   {(so || []).filter((s:any) => s.status_muatan === "On Going").length} 
                   <span className="text-[10px] ml-1 opacity-50">Unit</span>
                </div>
                <div className="text-[9px] font-bold text-white/20 italic flex items-center gap-1">
                   <Icon name="Navigation" size={10} /> Delivery
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
};
