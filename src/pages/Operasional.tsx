import React, { useMemo } from "react";
import { C } from "@/src/constants";
import { fmt } from "@/src/utils";
import { Card, SectionHeader, EmptyState, statusBadge } from "@/src/components/SJMComponents";

export const OperasionalPage = ({ activeSub, so }: any) => {
    const [search, setSearch] = React.useState("");

    if (activeSub === "quotation") {
        // Quotation could be a separate table, but often just SOs with status "Draft" or "Quotation"
        const quotes = (so || []).filter((s: any) => (s.status_muatan === "Draft" || s.order_id?.startsWith("QT")))
          .filter((s: any) => !search || s.customer?.toLowerCase().includes(search.toLowerCase()) || s.order_id?.toLowerCase().includes(search.toLowerCase()));
        return (
            <div className="fade-up">
                <SectionHeader title="Quotation" sub="Penawaran harga ke customer" action={<button className="btn-primary">+ Buat Penawaran</button>} />
                <div style={{ marginBottom: 16 }}>
                    <input className="input-field" placeholder="○ Cari customer atau ID quotation..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Card style={{ padding: 0, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                                <th style={{ padding: "12px 16px", textAlign: "left" }}>TGL PINDAH</th>
                                <th style={{ padding: "12px 16px", textAlign: "left" }}>ID QUOTATION</th>
                                <th style={{ padding: "12px 16px", textAlign: "left" }}>CUSTOMER</th>
                                <th style={{ padding: "12px 16px", textAlign: "left" }}>RUTE</th>
                                <th style={{ padding: "12px 16px", textAlign: "right" }}>ESTIMASI HARGA</th>
                                <th style={{ padding: "12px 16px", textAlign: "center" }}>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotes.length === 0 && <EmptyState colSpan={6} />}
                            {quotes.map((r: any) => (
                                <tr key={r.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                                    <td style={{ padding: "12px 16px" }}>{r.tgl_order}</td>
                                    <td style={{ padding: "12px 16px", fontWeight: 700, color: C.accent }}>{r.order_id}</td>
                                    <td style={{ padding: "12px 16px" }}>{r.customer}</td>
                                    <td style={{ padding: "12px 16px" }}>{r.lokasi_muat} → {r.lokasi_bongkar}</td>
                                    <td style={{ padding: "12px 16px", textAlign: "right" }}>{fmt(r.total_harga)}</td>
                                    <td style={{ padding: "12px 16px", textAlign: "center" }}>{statusBadge(r.status_muatan)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            </div>
        );
    }

    if (activeSub === "invoice") {
        const invoiced = (so || []).filter((s: any) => s.no_invoice)
          .filter((s: any) => !search || s.customer?.toLowerCase().includes(search.toLowerCase()) || s.no_invoice?.toLowerCase().includes(search.toLowerCase()) || s.order_id?.toLowerCase().includes(search.toLowerCase()));
        return (
            <div className="fade-up">
                <SectionHeader title="Invoice" sub="Tagihan pengiriman ke customer" />
                <div style={{ marginBottom: 16 }}>
                    <input className="input-field" placeholder="○ Cari invoice, customer, atau SO..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Card style={{ padding: 0, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                                <th style={{ padding: "12px 16px", textAlign: "left" }}>NO INVOICE</th>
                                <th style={{ padding: "12px 16px", textAlign: "left" }}>TANGGAL</th>
                                <th style={{ padding: "12px 16px", textAlign: "left" }}>ORDER ID</th>
                                <th style={{ padding: "12px 16px", textAlign: "left" }}>CUSTOMER</th>
                                <th style={{ padding: "12px 16px", textAlign: "right" }}>JUMLAH</th>
                                <th style={{ padding: "12px 16px", textAlign: "center" }}>AKSI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoiced.length === 0 && <EmptyState colSpan={6} />}
                            {invoiced.map((r: any) => (
                                <tr key={r.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                                    <td style={{ padding: "12px 16px", fontWeight: 700 }}>{r.no_invoice}</td>
                                    <td style={{ padding: "12px 16px" }}>{r.tgl_order}</td>
                                    <td style={{ padding: "12px 16px", color: C.accent }}>{r.order_id}</td>
                                    <td style={{ padding: "12px 16px" }}>{r.customer}</td>
                                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700 }}>{fmt(r.total_harga_pajak || r.total_harga)}</td>
                                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                        <button className="btn-ghost" style={{ fontSize: 11 }}>Cetak PDF</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            </div>
        );
    }

    return <div className="fade-up" style={{ padding: 40, textAlign: "center", color: C.textLight }}>Fitur {activeSub} dalam pengembangan</div>;
};
