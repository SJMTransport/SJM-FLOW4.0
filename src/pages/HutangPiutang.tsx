import React, { useState, useMemo, useEffect } from "react";
import { C } from "@/src/constants";
import { fmt, fmtShort } from "@/src/utils";
import { Card, SectionHeader, StatCard, useConfirm, statusBadge, PeriodFilter, EmptyState, Icon, PageShell, KPIGrid } from "@/src/components/SJMComponents";

export const HutangPiutangPage = ({ jurnal, coa, so, armada, connected, onSOClick, onJurnalClick, piutang = [], onGoToJurnal, prefill, onPrefillUsed }: any) => {
  const [tab, setTab] = useState("piutang");
  const [period, setPeriod] = useState({ mode: "all", month: new Date().getMonth(), year: new Date().getFullYear() });
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [notifDays, setNotifDays] = useState(30);

  // Prefill logic
  const [showPrefillBanner, setShowPrefillBanner] = useState(false);
  const [prefillData, setPrefillData] = useState<any>(null);

  useEffect(() => {
    if (prefill) {
      setTab("piutang");
      setPrefillData(prefill);
      setShowPrefillBanner(true);
      if (onPrefillUsed) onPrefillUsed();
    }
  }, [prefill]);

  // Create lookup for Armada (Plate -> Name)
  const fleetMap = useMemo(() => {
    const map: any = {};
    (armada || []).forEach((a: any) => {
      if (a.no_polisi) map[a.no_polisi.trim().toUpperCase()] = a.jenis; // types from armada
    });
    return map;
  }, [armada]);

  // Create lookup for SO to get customer and vendor/armada
  const soMap = useMemo(() => {
    const map: any = {};
    (so || []).forEach((s: any) => {
      const plate = (s.no_polisi || "").trim().toUpperCase();
      const fleetName = fleetMap[plate] || s.nama_vendor;
      map[s.order_id] = { 
        customer: s.customer, 
        vendor: fleetName || s.no_polisi || "Internal" 
      };
    });
    return map;
  }, [so, fleetMap]);

  const piutangRows = useMemo(() => {
    const map: any = {};
    const piutangCoas = (coa || []).filter((c: any) => c.sub_kelompok === "Piutang Usaha" || c.kode === "112").map((c: any) => c.kode);

    // BUG #5 fix: COA 112 adalah balance sheet account — harus kumulatif dari semua waktu.
    // Pakai semua jurnal (bukan filterByPeriod) agar piutang lama yang belum lunas tetap muncul.
    (jurnal || []).forEach((j: any) => {
      const headerSOs = j.no_so ? j.no_so.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
      const legacySO  = headerSOs.length === 1 ? headerSOs[0] : "";

      (j.jurnal_detail || []).forEach((d: any) => {
        if (!piutangCoas.includes(d.coa_kode)) return;
        const detailSO = d.no_so || legacySO || "";
        const key = detailSO || j.id;
        const soData = soMap[detailSO] || {};
        if (!map[key]) {
          map[key] = {
            key, no_so: detailSO,
            tanggal: j.tanggal, keterangan: j.keterangan || j.no_jurnal,
            customer: soData.customer || j.keterangan || "—",
            debit: 0, kredit: 0, no_jurnal_list: []
          };
        }
        if (j.no_jurnal && !map[key].no_jurnal_list.includes(j.no_jurnal))
          map[key].no_jurnal_list.push(j.no_jurnal);
        map[key].debit += Number(d.debit);
        map[key].kredit += Number(d.kredit);
      });
    });
    return Object.values(map).map((r: any) => ({
      ...r,
      saldo: r.debit - r.kredit,
      status: (r.debit - r.kredit) <= 0 ? "Lunas" : r.kredit > 0 ? "Parsial" : "Belum Lunas"
    }));
  }, [jurnal, coa, soMap]);

  const hutangRows = useMemo(() => {
    const map: any = {};
    const hutangCoas = (coa || []).filter((c: any) => c.kelompok === "Liabilitas").map((c: any) => c.kode);

    // BUG #5 fix: COA 2xx (Liabilitas) adalah balance sheet account — harus kumulatif.
    // Pakai semua jurnal agar hutang lama yang belum lunas tetap muncul di outstanding.
    // Key = coa_kode + '-' + no_so agar 1 SO yang punya hutang di 211 dan 214 tidak merge.
    (jurnal || []).forEach((j: any) => {
      const headerSOs = j.no_so ? j.no_so.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
      const legacySO  = headerSOs.length === 1 ? headerSOs[0] : "";

      (j.jurnal_detail || []).forEach((d: any) => {
        if (!hutangCoas.includes(d.coa_kode)) return;
        const detailSO = d.no_so || legacySO || "";
        const key = `${d.coa_kode}-${detailSO || j.id}`;
        const soData = soMap[detailSO] || {};
        if (!map[key]) {
          map[key] = {
            key, no_so: detailSO,
            tanggal: j.tanggal, keterangan: j.keterangan || j.no_jurnal,
            customer: soData.customer || "—",
            vendor: soData.vendor || "—",
            debit: 0, kredit: 0, no_jurnal_list: []
          };
        }
        if (j.no_jurnal && !map[key].no_jurnal_list.includes(j.no_jurnal))
          map[key].no_jurnal_list.push(j.no_jurnal);
        map[key].debit += Number(d.debit);
        map[key].kredit += Number(d.kredit);
      });
    });
    return Object.values(map).map((r: any) => ({
      ...r,
      saldo: r.kredit - r.debit,
      status: (r.kredit - r.debit) <= 0 ? "Lunas" : r.debit > 0 ? "Parsial" : "Belum Lunas"
    }));
  }, [jurnal, coa, soMap]);

  // Aging Logic
  const piutangOutstanding = useMemo(() => {
    const todayDate = new Date();
    if (piutang.length > 0) {
      return piutang
        .filter((p: any) => Number(p.sisa_piutang || 0) > 0 && p.status !== "Lunas")
        .map((p: any) => {
          const tgl = new Date(p.tgl_invoice || p.tgl_so || p.created_at);
          const umur = Math.floor((todayDate.getTime() - tgl.getTime()) / (1000 * 60 * 60 * 24));
          return { key: p.id, tanggal: p.tgl_invoice || p.tgl_so, nama: p.customer, no_ref: p.no_so || p.no_invoice, saldo: Number(p.sisa_piutang || 0), umur };
        })
        .sort((a: any, b: any) => b.umur - a.umur);
    }
    const map: any = {};
    jurnal.forEach((j: any) => {
      (j.jurnal_detail || []).forEach((d: any) => {
        if (d.coa_kode === "112") {
          const key = j.no_so || j.no_bukti || j.id;
          if (!map[key]) {
            const soRef = (so || []).find((s: any) => s.order_id === j.no_so || s.no_invoice === j.no_bukti);
            map[key] = { key, tanggal: j.tanggal, nama: soRef?.customer || j.keterangan || "—", no_ref: j.no_so || j.no_bukti, debit: 0, kredit: 0 };
          }
          map[key].debit += Number(d.debit);
          map[key].kredit += Number(d.kredit);
        }
      });
    });
    return Object.values(map).map((r: any) => {
      const saldo = r.debit - r.kredit;
      const tgl = new Date(r.tanggal);
      const umur = Math.floor((todayDate.getTime() - tgl.getTime()) / (1000 * 60 * 60 * 24));
      return { ...r, saldo, umur };
    }).filter((r: any) => r.saldo > 0).sort((a: any, b: any) => b.umur - a.umur);
  }, [jurnal, piutang, so]);

  const hutangVendorOutstanding = useMemo(() => {
    const todayDate = new Date();
    const result: any[] = [];
    (so || []).forEach((s: any) => {
      const legs = s.modal_legs || [];
      legs.forEach((leg: any, idx: number) => {
        const biaya = parseFloat(leg.biaya) || 0;
        if (biaya <= 0 || !leg.vendor?.trim()) return;
        // Check if already in journal as expense/liability
        const dicatat = (jurnal || []).some((j: any) =>
          (j.no_so || "").includes(s.order_id) &&
          (j.jurnal_detail || []).some((d: any) => (d.coa_kode === "211" || d.coa_kode === "212") && Number(d.kredit) > 0)
        );
        if (dicatat) return;
        const tglStr = s.tgl_muat || s.tgl_order || "";
        const tgl = new Date(tglStr);
        const umur = tglStr ? Math.floor((todayDate.getTime() - tgl.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        result.push({
          key: `${s.id}-${idx}`,
          tanggal: tglStr,
          nama: leg.vendor,
          no_ref: s.order_id,
          customer: s.customer || "—",
          jenis: leg.jenis || "Truk",
          saldo: biaya,
          umur,
        });
      });
    });
    return result.sort((a, b) => b.umur - a.umur);
  }, [so, jurnal]);

  const AgingPanel = ({ items, jatuhTempo, type }: any) => {
    const overdue = items.filter((r: any) => r.umur > jatuhTempo);
    const warning = items.filter((r: any) => r.umur > Math.floor(jatuhTempo * 0.7) && r.umur <= jatuhTempo);
    const normal = items.filter((r: any) => r.umur <= Math.floor(jatuhTempo * 0.7));
    const totalO = overdue.reduce((s: number, r: any) => s + r.saldo, 0);
    const totalW = warning.reduce((s: number, r: any) => s + r.saldo, 0);
    const totalN = normal.reduce((s: number, r: any) => s + r.saldo, 0);

    const AgingGroup = ({ groupItems, color, label, icon }: any) => {
      if (!groupItems.length) return null;
      return (
        <div className="mb-6 animate-fade-up">
          <div className="flex items-center gap-2 mb-3 px-1">
             <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px]" style={{ background: color }}>
                <Icon name={icon} size={12} />
             </div>
             <span className="text-[11px] font-black uppercase tracking-widest" style={{ color }}>{label}</span>
             <div className="ml-auto text-[11px] font-black" style={{ color}}>{fmtShort(groupItems.reduce((s:number,r:any)=>s+r.saldo,0))}</div>
          </div>
          <div className="space-y-2">
            {groupItems.map((r: any, i: number) => (
              <div key={r.key || i} className="flex justify-between items-center p-3 rounded-xl border transition-all hover:shadow-md" style={{ background: color + "08", borderColor: color + "20" }}>
                <div className="min-w-0">
                  <div className="font-bold text-text-main text-[12px] truncate">{r.nama}</div>
                  <div className="text-[10px] font-bold text-text-light opacity-60 mt-0.5 flex flex-wrap gap-2">
                    <span className="text-accent uppercase">{r.no_ref}</span>
                    {r.customer && r.customer !== r.nama && <span>• {r.customer}</span>}
                    {r.tanggal && <span className="italic">📅 {r.tanggal}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div className="font-black text-text-main text-[13px] tabular-nums">{fmt(r.saldo)}</div>
                  <div className="text-[10px] font-black uppercase mt-0.5" style={{ color }}>{r.umur} HARI</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <KPIGrid cols={3}>
          <StatCard label="Lewat Jatuh Tempo" value={overdue.length} sub={fmtShort(totalO)} color="var(--color-red-brand)" icon="AlertTriangle" />
          <StatCard label="Mendekati Tempo" value={warning.length} sub={fmtShort(totalW)} color="var(--color-accent)" icon="Clock" />
          <StatCard label="Dalam Tempo" value={normal.length} sub={fmtShort(totalN)} color="var(--color-green-brand)" icon="CheckCircle" />
        </KPIGrid>
        {items.length === 0 ? (
          <Card className="py-20 flex flex-col items-center justify-center text-center opacity-40">
             <Icon name="CheckCircle" size={48} className="text-green-brand mb-4" />
             <div className="text-sm font-bold text-text-main">Semua {type === "piutang" ? "Tagihan" : "Hutang"} Lancar</div>
             <p className="text-[11px] font-medium mt-1">Tidak ada saldo outstanding yang perlu ditindaklanjuti</p>
          </Card>
        ) : (
          <Card className="p-6">
            <AgingGroup groupItems={overdue} color="#EF4444" label={`Lewat Jatuh Tempo (> ${jatuhTempo} Hari)`} icon="AlertTriangle" />
            <AgingGroup groupItems={warning} color="#F59E0B" label={`Mendekati Jatuh Tempo (${Math.floor(jatuhTempo*0.7)}-${jatuhTempo} Hari)`} icon="Clock" />
            <AgingGroup groupItems={normal} color="#10B981" label={`Normal (< ${Math.floor(jatuhTempo*0.7)} Hari)`} icon="ShieldCheck" />
          </Card>
        )}
      </div>
    );
  };

  const rows = tab === "piutang" ? piutangRows : hutangRows;
  const customers = useMemo(() => ["all", ...new Set(rows.map((r: any) => r.customer).filter(Boolean))], [rows]);
  const vendors = useMemo(() => ["all", ...new Set(rows.map((r: any) => r.vendor).filter(Boolean))], [rows]);

  const filtered = rows.filter((r: any) => {
    const matchesSearch = !search || r.keterangan?.toLowerCase().includes(search.toLowerCase()) || r.no_so?.toLowerCase().includes(search.toLowerCase());
    const matchesCustomer = customerFilter === "all" || r.customer === customerFilter;
    const matchesVendor = vendorFilter === "all" || r.vendor === vendorFilter;
    return matchesSearch && matchesCustomer && matchesVendor;
  });

  const totalTagih = filtered.reduce((s, r: any) => s + (tab === "piutang" ? r.debit : r.kredit), 0);
  const totalBayar = filtered.reduce((s, r: any) => s + (tab === "piutang" ? r.kredit : r.debit), 0);
  const totalSaldo = filtered.reduce((s, r: any) => s + r.saldo, 0);

  const isNotifTab = tab.startsWith("notif");

  return (
    <PageShell>
      <SectionHeader title="Hutang & Piutang" sub="Monitoring saldo outstanding mitra & customer" />

      {showPrefillBanner && prefillData && (
        <div className="p-4 bg-green-brand-light/30 border border-green-brand/20 rounded-2xl flex justify-between items-center animate-fade-down">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-brand text-white flex items-center justify-center">
                 <Icon name="ArrowRight" size={18} />
              </div>
              <div>
                 <div className="text-[12px] font-black text-text-main">Piutang Baru Terdeteksi • {prefillData.noSO}</div>
                 <p className="text-[10px] font-bold text-text-light opacity-70">Silakan buat jurnal penagihan untuk mengaktifkan saldo piutang ini.</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <button 
                onClick={() => { onGoToJurnal?.({ noSO: prefillData.noSO, noBukti: prefillData.noInvoice || "", keterangan: prefillData.keterangan }); }}
                className="btn-primary"
              >
                Buat Jurnal
              </button>
              <button onClick={() => { setShowPrefillBanner(false); setPrefillData(null); }} className="text-text-light p-2 hover:text-red-brand transition-colors"><Icon name="X" size={18} /></button>
           </div>
        </div>
      )}
      
      <div className="tab-bar">
        {[
          ["piutang", "Piutang Usaha"], 
          ["hutang", "Hutang Usaha"],
          ["notif_piutang", `Notif Piutang (${piutangOutstanding.filter(r=>r.umur>notifDays).length})`],
          ["notif_hutang", `Notif Hutang (${hutangVendorOutstanding.filter(r=>r.umur>notifDays).length})`]
        ].map(([k, l]) => (
          <button 
            key={k} 
            className={`tab-btn uppercase tracking-widest ${tab === k ? "active" : ""}`} 
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>

      {isNotifTab ? (
        <div className="space-y-4">
           <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-[11px] font-bold text-text-light italic opacity-60 uppercase tracking-widest">
                 {tab === "notif_piutang" ? "Monitoring Faktur Outstanding" : "Monitoring Beban Vendor Belum Tercatat"}
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-bold text-text-light uppercase tracking-tight">Threshold Jatuh Tempo:</span>
                 <select className="input-field h-10 w-28 text-[11px] font-bold" value={notifDays} onChange={e => setNotifDays(+e.target.value)}>
                    {[14, 30, 45, 60].map(d => <option key={d} value={d}>{d} Hari</option>)}
                 </select>
              </div>
           </div>
           {tab === "notif_piutang" ? (
             <AgingPanel items={piutangOutstanding} jatuhTempo={notifDays} type="piutang" />
           ) : (
             <AgingPanel items={hutangVendorOutstanding} jatuhTempo={notifDays} type="hutang" />
           )}
        </div>
      ) : (
        <>
          <div className="flex flex-col lg:flex-row gap-3 mb-6 items-start lg:items-center">
            <div className="flex-1 w-full">
              <PeriodFilter period={period} setPeriod={setPeriod} search={search} setSearch={setSearch} />
            </div>
            <div className="flex gap-2 w-full lg:w-auto">
                <select className="input-field h-10 lg:w-48 text-[11px] font-bold" value={customerFilter || "all"} onChange={e => setCustomerFilter(e.target.value)}>
                    <option value="all">Semua Customer</option>
                    {customers.filter(c => c !== "all").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="input-field h-10 lg:w-48 text-[11px] font-bold" value={vendorFilter || "all"} onChange={e => setVendorFilter(e.target.value)}>
                    <option value="all">Semua Armada</option>
                    {vendors.filter(v => v !== "all").map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </div>
          </div>

          <KPIGrid cols={3}>
            <StatCard label={`Total ${tab === 'piutang' ? 'Tagihan' : 'Hutang'}`} value={fmtShort(totalTagih)} color="var(--color-accent)" icon="TrendingUp" />
            <StatCard label="Sudah Dibayar" value={fmtShort(totalBayar)} color="var(--color-green-brand)" icon="CheckCircle" />
            <StatCard label="Sisa Outstanding" value={fmtShort(totalSaldo)} color="var(--color-red-brand)" icon="AlertCircle" />
          </KPIGrid>

          <div className="table-container max-h-[calc(100vh-340px)]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>No SO / Jurnal</th>
                  <th>{tab === "piutang" ? "Customer" : "Vendor/Armada"}</th>
                  <th>Keterangan</th>
                  <th className="text-right min-w-[160px]">Jumlah</th>
                  <th className="text-right min-w-[160px]">Sisa</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main/20">
                  {filtered.length === 0 ? <EmptyState colSpan={7} /> : 
                    filtered.map((r: any, i: number) => (
                      <tr key={i} className="group transition-colors">
                        <td className="text-[11px] font-bold text-text-med italic tabular-nums">{r.tanggal}</td>
                        <td className="space-y-1">
                          {r.no_so ? (
                            <span className="block text-[11px] font-bold text-accent hover:underline cursor-pointer italic tracking-tight" onClick={() => onSOClick && onSOClick(r.no_so)}>
                              {r.no_so}
                            </span>
                          ) : <span className="block opacity-20 text-[10px]">None</span>}
                          <div className="flex flex-wrap gap-1">
                            {(r.no_jurnal_list || []).map((nj: string) => (
                              <button
                                key={nj}
                                onClick={() => onJurnalClick && onJurnalClick(nj)}
                                className="badge bg-slate-50 border border-border-main/40 text-[9px] text-text-light font-black hover:bg-accent hover:text-white hover:border-accent transition-all active:scale-95"
                              >
                                {nj}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="font-bold text-[12px] text-text-main group-hover:text-blue-brand transition-colors">
                           {tab === "piutang" ? r.customer : r.vendor}
                           {tab === "hutang" && r.customer && <p className="text-[10px] font-bold text-text-light opacity-50 italic mt-0.5">{r.customer}</p>}
                        </td>
                        <td>
                          <div className="text-[11px] font-medium text-text-med max-w-xs truncate" title={r.keterangan}>{r.keterangan}</div>
                        </td>
                        <td className="text-right tabular-nums text-[12px] font-bold text-text-main whitespace-nowrap">{fmt(tab === "piutang" ? r.debit : r.kredit)}</td>
                        <td className={`text-right tabular-nums text-[12px] font-black whitespace-nowrap ${r.saldo > 0 ? "text-red-brand" : "text-green-brand"}`}>{fmt(r.saldo)}</td>
                        <td className="text-center">{statusBadge(r.status)}</td>
                      </tr>
                    ))
                  }
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 text-text-main font-black border-t-2 border-border-main">
                    <td colSpan={4} className="py-3 px-4 text-right italic text-[9px] opacity-60 uppercase tracking-widest">Total Outcome & Outstanding</td>
                    <td className="py-3 px-4 text-right tabular-nums text-text-main text-[12px] whitespace-nowrap">{fmt(totalBayar)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-red-brand text-[12px] whitespace-nowrap">{fmt(totalSaldo)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
        </>
      )}
    </PageShell>
  );
};
