import React, { useMemo } from "react";
import { C } from "@/src/constants";
import { fmt } from "@/src/utils";
import { Card, SectionHeader, EmptyState, statusBadge, Icon, PageShell } from "@/src/components/SJMComponents";

export const OperasionalPage = ({ activeSub, so }: any) => {
    const [search, setSearch] = React.useState("");

    if (activeSub === "quotation") {
        const quotes = (so || []).filter((s: any) => (s.status_muatan === "Draft" || s.order_id?.startsWith("QT")))
          .filter((s: any) => !search || s.customer?.toLowerCase().includes(search.toLowerCase()) || s.order_id?.toLowerCase().includes(search.toLowerCase()));
        
        return (
            <PageShell>
                <SectionHeader 
                    title="Quotation" 
                    sub="Penawaran harga kepada customer potensial" 
                    action={<button className="btn-primary flex items-center gap-2"><Icon name="Plus" size={16} /> Buat Penawaran</button>} 
                />
                
        <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="w-full md:w-96 relative group">
                <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-accent transition-all duration-300 opacity-50" />
                <input 
                    className="input-field pl-11 bg-slate-50 border-transparent focus:bg-white focus:border-accent" 
                    placeholder="Cari ID quotation atau customer..." 
                    value={search || ""} 
                    onChange={e => setSearch(e.target.value)} 
                />
            </div>
        </div>

                <Card className="p-0 overflow-hidden border-border-main/40">
                    <div className="overflow-auto max-h-[calc(100vh-340px)]">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="py-3 px-4">Tgl Order</th>
                                    <th className="py-3 px-4">ID Quotation</th>
                                    <th className="py-3 px-4">Customer</th>
                                    <th className="py-3 px-4">Rute</th>
                                    <th className="py-3 px-4 text-right">Estimasi</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-main/20">
                                {quotes.length === 0 ? <EmptyState colSpan={6} /> :
                                    quotes.map((r: any) => (
                                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="py-3 px-4 tabular-nums text-[11px] font-bold text-text-med italic">{r.tgl_order}</td>
                                            <td className="py-3 px-4">
                                                <div className="text-[11px] font-black text-accent uppercase tracking-tight">{r.order_id}</div>
                                            </td>
                                            <td className="py-3 px-4 font-bold text-[12px] text-text-main">{r.customer}</td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2 text-[12px] font-bold text-text-med">
                                                    {r.lokasi_muat} <Icon name="ArrowRight" size={10} className="text-text-light opacity-30" /> {r.lokasi_bongkar}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right font-black tabular-nums text-[13px] text-text-main">{fmt(r.total_harga || 0)}</td>
                                            <td className="py-3 px-4 text-center">{statusBadge(r.status_muatan)}</td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                </Card>
            </PageShell>
        );
    }

    if (activeSub === "invoice") {
        const invoiced = (so || []).filter((s: any) => s.no_invoice)
          .filter((s: any) => !search || s.customer?.toLowerCase().includes(search.toLowerCase()) || s.no_invoice?.toLowerCase().includes(search.toLowerCase()) || s.order_id?.toLowerCase().includes(search.toLowerCase()));
        
        return (
            <PageShell>
                <SectionHeader title="Invoice" sub="Daftar tagihan pengiriman yang telah diterbitkan" />
                
        <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="w-full md:w-96 relative group">
                <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-accent transition-all duration-300 opacity-50" />
                <input 
                    className="input-field pl-11 bg-slate-50 border-transparent focus:bg-white focus:border-accent" 
                    placeholder="Cari no invoice, customer, atau SO..." 
                    value={search || ""} 
                    onChange={e => setSearch(e.target.value)} 
                />
            </div>
        </div>

                <Card className="p-0 overflow-hidden border-border-main/40">
                    <div className="overflow-auto max-h-[calc(100vh-340px)]">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="py-3 px-4">No Invoice</th>
                                    <th className="py-3 px-4">Tanggal</th>
                                    <th className="py-3 px-4">Order ID</th>
                                    <th className="py-3 px-4">Customer</th>
                                    <th className="py-3 px-4 text-right">Jumlah</th>
                                    <th className="py-3 px-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-main/20">
                                {invoiced.length === 0 ? <EmptyState colSpan={6} /> :
                                    invoiced.map((r: any) => (
                                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="py-3 px-4 font-black text-[12px] text-text-main tabular-nums underline decoration-border-main hover:decoration-accent transition-all cursor-pointer">{r.no_invoice}</td>
                                            <td className="py-3 px-4 tabular-nums text-[11px] font-bold text-text-med italic">{r.tgl_order}</td>
                                            <td className="py-3 px-4">
                                                <div className="text-[11px] font-black text-accent uppercase tracking-tight">{r.order_id}</div>
                                            </td>
                                            <td className="py-3 px-4 font-bold text-[12px] text-text-main">{r.customer}</td>
                                            <td className="py-3 px-4 text-right font-black tabular-nums text-[13px] text-text-main">
                                                {fmt(r.total_harga_pajak || r.total_harga || 0)}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <button className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-accent border border-accent/20 hover:bg-accent hover:text-white transition-all italic flex items-center gap-1.5 mx-auto">
                                                    <Icon name="Printer" size={12} /> Cetak
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                </Card>
            </PageShell>
        );
    }

    return (
        <PageShell>
            <SectionHeader title="Operasional" sub={`Menu ${activeSub}`} />
            <Card className="flex flex-col items-center justify-center p-20 text-center bg-slate-50/50 border-dashed border-2 border-border-main/50">
                <div className="w-20 h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center mb-6 border border-border-main/30">
                    <Icon name="Construction" size={32} className="text-text-light opacity-20" />
                </div>
                <h3 className="text-lg font-black text-text-main uppercase tracking-tight">Tahap Pengembangan</h3>
                <p className="text-sm font-bold text-text-light mt-2 max-w-sm tracking-wide">
                    Fitur kontainer <span className="text-accent uppercase">{activeSub}</span> sedang dalam proses integrasi sistem dan akan segera tersedia.
                </p>
            </Card>
        </PageShell>
    );
};

