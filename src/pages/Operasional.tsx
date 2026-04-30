import React, { useMemo } from "react";
import { C } from "@/src/constants";
import { fmt } from "@/src/utils";
import { Card, SectionHeader, EmptyState, statusBadge, Icon, PageShell, ActionBar } from "@/src/components/SJMComponents";

export const OperasionalPage = ({ activeSub, so }: any) => {
    const [search, setSearch] = React.useState("");

    const searchInput = (placeholder: string) => (
        <div className="relative">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light opacity-50" />
            <input
                className="input-field h-10 pl-9 w-72 text-[12px]"
                placeholder={placeholder}
                value={search || ""}
                onChange={e => setSearch(e.target.value)}
            />
        </div>
    );

    if (activeSub === "quotation") {
        const quotes = (so || []).filter((s: any) => (s.status_muatan === "Draft" || s.order_id?.startsWith("QT")))
          .filter((s: any) => !search || s.customer?.toLowerCase().includes(search.toLowerCase()) || s.order_id?.toLowerCase().includes(search.toLowerCase()));

        return (
            <PageShell>
                <SectionHeader
                    title="Quotation"
                    sub="Penawaran harga kepada customer potensial"
                    action={<button className="btn-primary"><Icon name="Plus" size={16} /> Buat Penawaran</button>}
                />

                <ActionBar left={searchInput("Cari ID quotation atau customer...")} />

                <Card className="p-0 overflow-hidden border-border-main/40 shadow-sm">
                    <div className="overflow-auto max-h-[calc(100vh-360px)]">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th>Tgl Order</th>
                                    <th>ID Quotation</th>
                                    <th>Customer</th>
                                    <th>Rute</th>
                                    <th className="text-right">Estimasi</th>
                                    <th className="text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotes.length === 0 ? <EmptyState colSpan={6} /> :
                                    quotes.map((r: any) => (
                                        <tr key={r.id} className="group transition-colors">
                                            <td className="tabular-nums text-[11px] font-bold text-text-med italic">{r.tgl_order}</td>
                                            <td>
                                                <div className="text-[11px] font-black text-accent uppercase tracking-tight">{r.order_id}</div>
                                            </td>
                                            <td className="font-bold text-[12px] text-text-main">{r.customer}</td>
                                            <td>
                                                <div className="flex items-center gap-2 text-[12px] font-bold text-text-med">
                                                    {r.lokasi_muat} <Icon name="ArrowRight" size={10} className="text-text-light opacity-30" /> {r.lokasi_bongkar}
                                                </div>
                                            </td>
                                            <td className="text-right font-black tabular-nums text-[13px] text-text-main">{fmt(r.total_harga || 0)}</td>
                                            <td className="text-center">{statusBadge(r.status_muatan)}</td>
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

                <ActionBar left={searchInput("Cari no invoice, customer, atau SO...")} />

                <Card className="p-0 overflow-hidden border-border-main/40 shadow-sm">
                    <div className="overflow-auto max-h-[calc(100vh-360px)]">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th>No Invoice</th>
                                    <th>Tanggal</th>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th className="text-right">Jumlah</th>
                                    <th className="text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoiced.length === 0 ? <EmptyState colSpan={6} /> :
                                    invoiced.map((r: any) => (
                                        <tr key={r.id} className="group transition-colors">
                                            <td className="font-black text-[12px] text-text-main tabular-nums underline decoration-border-main hover:decoration-accent transition-all cursor-pointer">{r.no_invoice}</td>
                                            <td className="tabular-nums text-[11px] font-bold text-text-med italic">{r.tgl_order}</td>
                                            <td>
                                                <div className="text-[11px] font-black text-accent uppercase tracking-tight">{r.order_id}</div>
                                            </td>
                                            <td className="font-bold text-[12px] text-text-main">{r.customer}</td>
                                            <td className="text-right font-black tabular-nums text-[13px] text-text-main">
                                                {fmt(r.total_harga_pajak || r.total_harga || 0)}
                                            </td>
                                            <td className="text-center">
                                                <button className="btn-ghost !h-8 !px-3 mx-auto">
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
            <SectionHeader title="Operasional" sub="Halaman ini sedang dalam pengembangan" />
        </PageShell>
    );
};
