import React, { useMemo, useState } from "react";
import { C, I } from "@/src/constants";
import { fmt, today } from "@/src/utils";
import { Card, SectionHeader, EmptyState, statusBadge, Icon, useConfirm } from "@/src/components/SJMComponents";
import { api } from "@/src/api";
import jsPDF from "jspdf";
import "jspdf-autotable";

// ── Invoice PDF generator ─────────────────────────────────────────────────
const printInvoicePDF = (r: any) => {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("SUGIARTO JAYA MANDIRI TRANSPORT", pageW / 2, 18, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Jasa Pengiriman Alat Berat & Kendaraan", pageW / 2, 24, { align: "center" });

  // Invoice info
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", 14, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`No: ${r.no_invoice || "—"}`, 14, 44);
  doc.text(`Tanggal: ${r.tgl_order || "—"}`, 14, 49);
  doc.text(`Order ID: ${r.order_id || "—"}`, 14, 54);

  // Customer
  doc.text(`Customer: ${r.customer || "—"}`, pageW - 14, 44, { align: "right" });

  // Table
  (doc as any).autoTable({
    startY: 62,
    head: [["Deskripsi", "Rute", "Armada", "Jumlah"]],
    body: [[
      "Jasa Pengiriman",
      `${r.lokasi_muat || "—"} → ${r.lokasi_bongkar || "—"}`,
      `${r.no_polisi || "—"} / ${r.nama_sopir || "—"}`,
      `Rp ${Number(r.total_harga || 0).toLocaleString("id-ID")}`,
    ]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [249, 172, 61] },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Total
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", pageW - 60, finalY);
  doc.text(`Rp ${Number(r.total_harga_pajak || r.total_harga || 0).toLocaleString("id-ID")}`, pageW - 14, finalY, { align: "right" });

  // Bank info
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Bank Mandiri — A/N: Muhammad Naufal Sugiarto", 14, finalY + 14);
  doc.text("TTD: Muhammad Naufal Sugiarto", pageW - 14, finalY + 14, { align: "right" });

  doc.save(`Invoice_${r.no_invoice || r.order_id}_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const OperasionalPage = ({ activeSub, so, setSo, customer, armada = [], sopir = [] }: any) => {
  const [search, setSearch] = React.useState("");
  const [showQuotModal, setShowQuotModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState<any>({});
  const { confirm, Modal: ConfirmModal } = useConfirm();

  const F = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  // ─── QUOTATION ────────────────────────────────────────────────────────
  if (activeSub === "quotation") {
    const quotes = (so || [])
      .filter((s: any) => s.status_muatan === "Order Confirmed" || s.order_id?.startsWith("QT"))
      .filter((s: any) => !search ||
        s.customer?.toLowerCase().includes(search.toLowerCase()) ||
        s.order_id?.toLowerCase().includes(search.toLowerCase())
      );

    const openNew = () => {
      setForm({
        order_id: `QT-${Date.now()}`,
        tgl_order: today(),
        status_muatan: "Order Confirmed",
      });
      setErr("");
      setShowQuotModal(true);
    };

    const save = async () => {
      setErr("");
      if (!form.customer) return setErr("Customer wajib dipilih");
      if (!form.lokasi_muat?.trim()) return setErr("Lokasi muat wajib diisi");
      if (!form.lokasi_bongkar?.trim()) return setErr("Lokasi bongkar wajib diisi");
      setSaving(true);
      try {
        const res = await api.addSO({ ...form, is_posted: false });
        setSo?.((prev: any[]) => [res[0], ...prev]);
        setShowQuotModal(false);
      } catch (e: any) {
        setErr("Gagal simpan: " + e.message);
      }
      setSaving(false);
    };

    return (
      <div className="fade-up">
        <ConfirmModal />
        <SectionHeader title="Quotation" sub="Penawaran harga ke customer"
          action={<button className="btn-primary" onClick={openNew}>+ Buat Penawaran</button>} />
        <div style={{ marginBottom: 16 }}>
          <input className="input-field" placeholder="○ Cari customer atau ID quotation..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>TGL ORDER</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>ORDER ID</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>CUSTOMER</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>RUTE</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>ESTIMASI HARGA</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 && <EmptyState colSpan={6} msg="Belum ada penawaran" />}
              {quotes.map((r: any) => (
                <tr key={r.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 16px" }}>{r.tgl_order}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: C.accent }}>{r.order_id}</td>
                  <td style={{ padding: "12px 16px" }}>{r.customer}</td>
                  <td style={{ padding: "12px 16px", color: C.textMed, fontSize: 12 }}>
                    {r.lokasi_muat && r.lokasi_bongkar ? `${r.lokasi_muat} → ${r.lokasi_bongkar}` : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>{r.total_harga ? fmt(r.total_harga) : "—"}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>{statusBadge(r.status_muatan)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {showQuotModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setShowQuotModal(false)}>
            <div className="fade-up" style={{ width: 520, background: "#fff", borderRadius: 12, padding: 28, boxShadow: "0 8px 40px rgba(0,0,0,0.18)", maxHeight: "90vh", overflow: "auto" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Buat Penawaran Baru</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  ["Order ID", "order_id", "text"],
                  ["Tanggal", "tgl_order", "date"],
                ].map(([label, key, type]) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>{label}</label>
                    <input className="input-field" type={type} value={form[key] || ""} onChange={e => F(key, e.target.value)} />
                  </div>
                ))}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Customer *</label>
                  <select className="input-field" value={form.customer || ""} onChange={e => F("customer", e.target.value)}>
                    <option value="">— Pilih Customer —</option>
                    {(customer || []).map((c: any) => <option key={c.id} value={c.nama}>{c.nama}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Lokasi Muat *</label>
                  <input className="input-field" value={form.lokasi_muat || ""} onChange={e => F("lokasi_muat", e.target.value)} />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Lokasi Bongkar *</label>
                  <input className="input-field" value={form.lokasi_bongkar || ""} onChange={e => F("lokasi_bongkar", e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Estimasi Harga</label>
                  <input className="input-field" type="number" placeholder="0" value={form.total_harga || ""} onChange={e => F("total_harga", e.target.value)} style={{ textAlign: "right" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Keterangan</label>
                  <input className="input-field" value={form.keterangan || ""} onChange={e => F("keterangan", e.target.value)} />
                </div>
              </div>
              {err && <div style={{ color: C.red, fontSize: 12, marginTop: 12, padding: "8px 12px", background: C.redLight, borderRadius: 6 }}>{err}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <button className="btn-primary" onClick={save} disabled={saving} style={{ flex: 1 }}>
                  {saving ? "Menyimpan..." : "Simpan Penawaran"}
                </button>
                <button className="btn-ghost" onClick={() => setShowQuotModal(false)}>Batal</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── INVOICE ──────────────────────────────────────────────────────────
  if (activeSub === "invoice") {
    const invoiced = (so || [])
      .filter((s: any) => s.no_invoice)
      .filter((s: any) => !search ||
        s.customer?.toLowerCase().includes(search.toLowerCase()) ||
        s.no_invoice?.toLowerCase().includes(search.toLowerCase()) ||
        s.order_id?.toLowerCase().includes(search.toLowerCase())
      );

    const totalTagihan = invoiced.reduce((s: number, r: any) => s + Number(r.total_harga_pajak || r.total_harga || 0), 0);

    return (
      <div className="fade-up">
        <SectionHeader title="Invoice" sub={`${invoiced.length} invoice — Total: ${fmt(totalTagihan)}`} />
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
              {invoiced.length === 0 && <EmptyState colSpan={6} msg="Belum ada invoice" />}
              {invoiced.map((r: any) => (
                <tr key={r.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 16px", fontWeight: 700 }}>{r.no_invoice}</td>
                  <td style={{ padding: "12px 16px" }}>{r.tgl_order}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ color: C.accent, fontWeight: 600 }}>{r.order_id}</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>{r.customer}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700 }}>
                    {fmt(r.total_harga_pajak || r.total_harga || 0)}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
                      onClick={() => printInvoicePDF(r)}
                    >
                      <Icon d={I.file} size={12} /> Cetak PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ padding: 40, textAlign: "center", color: C.textLight }}>
      Fitur {activeSub} dalam pengembangan
    </div>
  );
};
