import React, { useMemo, useState } from "react";
import { C } from "@/src/constants";
import { fmt, filterByPeriod } from "@/src/utils";
import { Card, SectionHeader, EmptyState, StatCard, PeriodFilter, Icon } from "@/src/components/SJMComponents";

export const KeuanganPage = ({ activeSub, jurnal, coa, so, connected }: any) => {
  const [period, setPeriod] = useState({ mode: "all", month: new Date().getMonth(), year: new Date().getFullYear() });
  const [search, setSearch] = useState("");

  const vendorRows = useMemo(() => {
    const rows: any[] = [];
    filterByPeriod(jurnal || [], period).flatMap((j: any) => (j.jurnal_detail || [])
      .filter((d: any) => d.coa_kode.startsWith("211")) // Sub-accounts of Account Payable or the main one
      .map((d: any) => ({ ...d, tanggal: j.tanggal, no_jurnal: j.no_jurnal, keterangan: j.keterangan }))
    ).filter((r: any) => 
      !search || 
      r.keterangan?.toLowerCase().includes(search.toLowerCase()) || 
      coa.find((c: any) => c.kode === r.coa_kode)?.nama?.toLowerCase().includes(search.toLowerCase())
    ).forEach((l: any) => {
        rows.push(l);
    });
    return rows;
  }, [jurnal, period, search, coa]);

  const ujData = useMemo(() => (so || [])
    .filter((s: any) => s.status_muatan !== "Cancelled")
    .filter((s: any) => !search || s.order_id?.toLowerCase().includes(search.toLowerCase()) || s.no_polisi?.toLowerCase().includes(search.toLowerCase()) || s.nama_sopir?.toLowerCase().includes(search.toLowerCase()))
    .map((s: any) => {
      // Improved logic for UJ (Uang Jalan) - 511 is default but ideally we should check COA group
      const relatedUJ = ((jurnal || []).filter((j: any) => s.order_id && (j.keterangan || "").includes(s.order_id))
        .flatMap((j: any) => (j.jurnal_detail || []))
        .filter((d: any) => d.coa_kode === "511" || d.nama_akun?.toLowerCase().includes("uang jalan"))
        .reduce((sum: number, d: any) => sum + (Number(d.debit) - Number(d.kredit)), 0));
      return { ...s, uj: relatedUJ };
  }), [so, jurnal, search]);

  if (activeSub === "hutangvendor") {
      return (
        <div className="fade-up space-y-4">
            <SectionHeader title="Hutang Vendor" sub="Rincian tagihan dari supplier/vendor" />
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
              <div className="flex-1 w-full lg:max-w-2xl">
                <PeriodFilter period={period} setPeriod={setPeriod} search={search} setSearch={setSearch} />
              </div>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-auto max-h-[calc(100vh-340px)]">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="py-3 px-4">Tanggal</th>
                            <th className="py-3 px-4">Vendor (COA)</th>
                            <th className="py-3 px-4">Ref</th>
                            <th className="py-3 px-4">Keterangan</th>
                            <th className="py-3 px-4 text-right">Debit</th>
                            <th className="py-3 px-4 text-right">Kredit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main/20">
                        {vendorRows.length === 0 ? <EmptyState colSpan={6} /> : 
                          vendorRows.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="py-3 px-4 text-[11px] font-bold text-text-med italic tabular-nums">{r.tanggal}</td>
                                <td className="py-3 px-4">
                                  <div className="text-[12px] font-bold text-text-main group-hover:text-blue-brand transition-colors">{coa.find((c: any) => c.kode === r.coa_kode)?.nama || r.coa_kode}</div>
                                  <div className="text-[10px] font-bold text-text-light opacity-60 italic">{r.coa_kode}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-[11px] font-black text-accent tracking-tighter">{r.no_jurnal}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-[12px] font-medium text-text-med max-w-xs truncate" title={r.keterangan}>{r.keterangan}</div>
                                </td>
                                <td className="py-3 px-4 text-right tabular-nums text-[12px] font-bold text-text-main">
                                  {r.debit > 0 ? fmt(r.debit) : "-"}
                                </td>
                                <td className="py-3 px-4 text-right tabular-nums text-[12px] font-black text-red-brand">
                                  {r.kredit > 0 ? fmt(r.kredit) : "-"}
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

  if (activeSub === "cicilan") {
      return (
        <div className="fade-up space-y-4">
            <SectionHeader title="Cicilan & Pinjaman" sub="Monitoring kewajiban bank/leasing" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-5">
                    <div className="flex items-center gap-3 mb-6">
                       <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                         <Icon name="CreditCard" size={16} />
                       </div>
                       <div>
                          <h3 className="text-sm font-black tracking-tight leading-none">Pinjaman Aktif</h3>
                          <p className="text-[10px] font-bold text-text-light mt-0.5 opacity-60">Status Kewajiban Perusahaan</p>
                       </div>
                    </div>
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 bg-slate-50/50 border border-dashed border-border-main rounded-2xl">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                           <Icon name="Search" size={20} />
                        </div>
                        <p className="text-[11px] font-bold text-text-light opacity-60 italic">Belum ada data terdaftar</p>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-3 mb-6">
                       <div className="w-8 h-8 rounded-xl bg-green-50 text-green-brand flex items-center justify-center">
                         <Icon name="CheckCircle" size={16} />
                       </div>
                       <div>
                          <h3 className="text-sm font-black tracking-tight leading-none">Jadwal Bayar</h3>
                          <p className="text-[10px] font-bold text-text-light mt-0.5 opacity-60">Listing Pembayaran Terdekat</p>
                       </div>
                    </div>
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 bg-slate-50/50 border border-dashed border-border-main rounded-2xl">
                        <div className="w-10 h-10 rounded-full bg-green-brand-light flex items-center justify-center text-green-brand">
                           <Icon name="ShieldCheck" size={20} />
                        </div>
                        <p className="text-[11px] font-bold text-text-light opacity-60 italic">Semua cicilan bulan ini lunas</p>
                    </div>
                </Card>
            </div>
        </div>
      );
  }

  if (activeSub === "rekapuj") {
      return (
        <div className="fade-up space-y-4">
            <SectionHeader title="Rekap Uang Jalan" sub="Monitoring pengeluaran operasional per unit" />
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
               <div className="relative w-full max-w-sm">
                 <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light opacity-50" />
                 <input className="input-field h-10 pl-11 text-[12px] font-bold" placeholder="Cari SO, unit, atau sopir..." value={search || ""} onChange={e => setSearch(e.target.value)} />
               </div>
            </div>
            
            <Card className="p-0 overflow-hidden">
                <div className="overflow-auto max-h-[calc(100vh-340px)]">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="py-3 px-4">Tgl Muat</th>
                            <th className="py-3 px-4">Order ID</th>
                            <th className="py-3 px-4">Unit (Nopol)</th>
                            <th className="py-3 px-4">Sopir</th>
                            <th className="py-3 px-4 text-right">Uang Jalan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main/20">
                        {ujData.length === 0 ? <EmptyState colSpan={5} /> : 
                          ujData.map((r: any) => (
                            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="py-3 px-4 text-[11px] font-bold text-text-med italic tabular-nums">{r.tgl_muat}</td>
                                <td className="py-3 px-4">
                                  <div className="text-[11px] font-black text-accent uppercase tracking-tighter">{r.order_id}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-[12px] font-black text-text-main uppercase">{r.no_polisi}</div>
                                </td>
                                <td className="py-3 px-4 font-bold text-[12px] text-text-med">{r.nama_sopir}</td>
                                <td className="py-3 px-4 text-right tabular-nums text-[13px] font-black text-blue-brand">{fmt(r.uj)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </Card>
        </div>
      );
  }

  return <div className="fade-up py-20 flex flex-col items-center justify-center text-center space-y-4">
    <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-300">
      <Icon name="Construction" size={32} />
    </div>
    <p className="text-text-light font-bold italic text-[11px]">Fitur {activeSub} dalam pengembangan</p>
  </div>;
};
