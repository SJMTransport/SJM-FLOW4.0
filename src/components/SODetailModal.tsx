import React, { useMemo } from "react";
import { Card, Icon, statusBadge } from "@/src/components/SJMComponents";
import { fmt } from "@/src/utils";

// Helper functions
const fRp = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');

const fmtDate = (d: string) => {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

export const SODetailModal = ({ data, onClose, coa, jurnal, invoices, currentUser, handleNav, setPendingEditSO, onJurnalClick, onArmadaClick, onInvoiceClick }: any) => {
  if (!data) return null;

  const relatedJurnals = (jurnal || []).filter((j: any) =>
    String(j.no_so || "").split(",").map((s: string) => s.trim()).includes(data.order_id)
  );
  
  const relatedInvoices = (invoices || []).filter((inv: any) =>
    (inv.so_order_ids || []).includes(data.order_id)
  );

  // Split invoices into Customer (Keluar) and Vendor (Masuk)
  const customerInvoices = useMemo(() =>
    relatedInvoices.filter((inv: any) => inv.tipe !== 'masuk' && inv.tipe !== 'surat_jalan'),
    [relatedInvoices]
  );
  const vendorInvoices = useMemo(() =>
    relatedInvoices.filter((inv: any) => inv.tipe === 'masuk'),
    [relatedInvoices]
  );

  // ── Piutang: kalkulasi dari jurnal_detail ──
  const piutangCoas = useMemo(() =>
    (coa || []).filter((c: any) => c.sub_kelompok === "Piutang Usaha" || c.kode === "112").map((c: any) => c.kode),
    [coa]
  );

  const { totalPiutang, totalTerbayar } = useMemo(() => {
    let tp = 0, tt = 0;
    (jurnal || []).forEach((j: any) => {
      const headerSOs = j.no_so ? j.no_so.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
      const legacySO = headerSOs.length === 1 ? headerSOs[0] : "";
      (j.jurnal_detail || []).forEach((d: any) => {
        if (!piutangCoas.includes(d.coa_kode)) return;
        const detailSO = d.no_so || legacySO || "";
        if (detailSO !== data.order_id) return;
        tp += Number(d.debit || 0);
        tt += Number(d.kredit || 0);
      });
    });
    return { totalPiutang: tp, totalTerbayar: tt };
  }, [jurnal, piutangCoas, data.order_id]);

  const sisaPiutang = Math.max(0, totalPiutang - totalTerbayar);
  const payPct = totalPiutang > 0 ? Math.min(100, Math.round((totalTerbayar / totalPiutang) * 100)) : 0;
  const payStatus = sisaPiutang <= 0 && totalPiutang > 0 ? "Lunas"
    : totalTerbayar > 0 ? "Parsial"
    : totalPiutang > 0 ? "Belum Bayar"
    : "Belum Ditagih";
  const PAY_HEX: Record<string, string> = {
    "Lunas": "#6B8E23", "Parsial": "#C4914A", "Belum Bayar": "#B85450", "Belum Ditagih": "#6B6862",
  };
  const payColor = PAY_HEX[payStatus] || "#6B6862";

  // ── Aging: dihitung dari tgl_invoice terlama ──
  const earliestInvDate = [...(relatedInvoices || [])].map((inv: any) => inv.tgl_invoice).filter(Boolean).sort()[0];
  const aging = earliestInvDate ? Math.floor((Date.now() - new Date(earliestInvDate).getTime()) / 86400000) : 0;
  const agingColor = !earliestInvDate ? "#6B6862" : aging <= 30 ? "#6B8E23" : aging <= 60 ? "#C4914A" : "#B85450";

  // ── Durasi trip ──
  const durationDays = data.tgl_muat && data.tgl_bongkar
    ? Math.max(0, Math.floor((new Date(data.tgl_bongkar).getTime() - new Date(data.tgl_muat).getTime()) / 86400000))
    : null;

  const nilaiSO = data.total_harga_pajak || data.total_harga || data.harga_pengiriman || 0;
  const canEdit = ["Admin", "Operasional"].includes(currentUser?.role ?? "");
  const canFinance = ["Admin", "Keuangan"].includes(currentUser?.role ?? "");

  const INV_STATUS_HEX: Record<string, string> = {
    'Belum Bayar': '#B85450', 'Parsial': '#C4914A', 'Lunas': '#6B8E23',
    'Lebih Bayar': '#4A6FA5', 'Perlu Verifikasi': '#8b5cf6',
  };

  const getWhatsAppUrl = (phone: string, text: string) => {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  };

  return (
    <Card className="w-screen h-full flex flex-col p-0 border-none rounded-none bg-[#F5F4F1] overflow-hidden shadow-2xl animate-fade-left relative z-10" onClick={e => e.stopPropagation()}>

      {/* ── HEADER STICKY ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-border-main px-6 py-3 flex items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors shrink-0">
            <Icon name="X" size={16} className="text-text-med" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-black text-text-light uppercase tracking-widest">Sales Order</span>
              <span className="text-[9px] text-text-light opacity-40">/</span>
              <span className="text-[11px] font-black text-accent italic tracking-tight">{data.order_id}</span>
              {data.tgl_order && (
                <>
                  <span className="text-[9px] text-text-light opacity-40">/</span>
                  <span className="text-[10px] font-bold text-text-med bg-slate-100 px-2 py-0.5 rounded">Dibuat: {fmtDate(data.tgl_order)}</span>
                </>
              )}
            </div>
            <div className="text-[16px] font-black text-text-main leading-tight truncate">{data.customer}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusBadge(data.status_muatan)}
          <span className="px-2.5 py-1 rounded-full text-[9px] font-black" style={{ backgroundColor: payColor + "18", color: payColor }}>
            {payStatus}
          </span>
          {canEdit && (
            <button
              onClick={() => { handleNav("operasional", "so"); setPendingEditSO(data.order_id); onClose(); }}
              className="h-8 px-4 bg-accent text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-accent/90 transition-colors"
            >
              Edit SO
            </button>
          )}
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-white border-b border-border-main shrink-0">
        {[
          {
            label: "Nilai SO", value: fmt(nilaiSO),
            sub: data.nilai_pajak > 0 ? "inc. PPN 1.1%" : "Non-Taxable",
            color: "#252422",
          },
          {
            label: "Terbayar", value: fmt(totalTerbayar),
            sub: "dari jurnal piutang",
            color: totalTerbayar > 0 ? "#6B8E23" : "#6B6862",
          },
          {
            label: "Sisa Piutang", value: fmt(sisaPiutang),
            sub: sisaPiutang <= 0 && totalPiutang > 0 ? "Lunas ✓" : payPct > 0 ? `${payPct}% terbayar` : totalPiutang === 0 ? "Belum ada jurnal" : "—",
            color: sisaPiutang > 0 ? "#B85450" : "#6B8E23",
          },
          {
            label: "Aging Piutang", value: earliestInvDate ? `${aging} hari` : "—",
            sub: earliestInvDate
              ? `sejak ${fmtDate(earliestInvDate)}`
              : "Belum ada invoice",
            color: agingColor,
          },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#F5F4F1] rounded-xl p-4 border border-border-main/50">
            <div className="text-[9px] font-black text-text-light uppercase tracking-widest mb-1.5">{kpi.label}</div>
            <div className="text-[18px] font-black tabular-nums leading-none" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-[9px] text-text-light mt-1 opacity-70">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ── BODY 3-KOLOM ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-[#F5F4F1]">
        <div className="grid grid-cols-12 min-h-full divide-y lg:divide-y-0 lg:divide-x divide-border-main/30">

          {/* ─── Kolom Kiri (4/12): Operasional & Logistik ─── */}
          <div className="col-span-12 lg:col-span-4 p-6 space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-border-main/30">
              <div className="w-1.5 h-3 bg-accent rounded-full" />
              <h4 className="text-[10px] font-black text-text-light uppercase tracking-widest">Logistik & Armada</h4>
            </div>

            {/* Kartu Customer */}
            <div className="bg-white rounded-xl border border-border-main/60 p-5 space-y-3.5 shadow-sm">
              <div>
                <div className="text-[8px] font-bold text-text-light uppercase tracking-widest mb-0.5">Customer</div>
                <div className="text-[14px] font-black text-text-main leading-tight">{data.customer}</div>
              </div>
              {(data.pic_cust || data.no_pic) && (
                <div className="pt-2 border-t border-border-main/20">
                  <div className="text-[8px] font-bold text-text-light uppercase tracking-widest mb-0.5">PIC / Kontak</div>
                  <div className="text-[12.5px] font-bold text-text-main">{data.pic_cust || "—"}</div>
                  {data.no_pic && (
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[10.5px] text-text-med font-mono">{data.no_pic}</span>
                      <a
                        href={getWhatsAppUrl(data.no_pic, `Halo ${data.pic_cust || 'Bapak/Ibu'}, kami ingin mengonfirmasi terkait Sales Order *${data.order_id}*...`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded border border-emerald-200 text-[8.5px] font-black uppercase tracking-wider transition-all"
                      >
                        <Icon name="MessageSquare" size={10} /> Chat WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Kartu Armada & Sopir */}
            <div className="bg-white rounded-xl border border-border-main/60 p-5 space-y-3.5 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[8px] font-bold text-text-light uppercase tracking-widest mb-0.5">No Polisi</div>
                  <button
                    onClick={() => data.no_polisi && onArmadaClick && onArmadaClick(data.no_polisi)}
                    className="text-[13px] font-black text-accent hover:underline uppercase tracking-tight block text-left font-mono"
                  >
                    {data.no_polisi || "—"}
                  </button>
                  {data.jenis_truk && <div className="text-[9px] text-text-light mt-0.5">{data.jenis_truk}</div>}
                </div>
                <div>
                  <div className="text-[8px] font-bold text-text-light uppercase tracking-widest mb-0.5">Nama Sopir</div>
                  <div className="text-[13px] font-bold text-text-main">{data.nama_sopir || "—"}</div>
                </div>
              </div>
              
              {/* Driver Phone & WhatsApp */}
              {data.no_supir && (
                <div className="pt-2 border-t border-border-main/20 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[8px] font-bold text-text-light uppercase tracking-widest mb-0.5">No HP Sopir</div>
                    <div className="text-[11px] font-mono text-text-med font-bold">{data.no_supir}</div>
                  </div>
                  <a
                    href={getWhatsAppUrl(data.no_supir, `Halo Pak ${data.nama_sopir || 'Sopir'}, mohon update posisi armada Anda saat ini untuk SO *${data.order_id}*...`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded border border-emerald-200 text-[8px] font-black uppercase tracking-wider transition-all"
                  >
                    <Icon name="MessageSquare" size={10} /> Chat WhatsApp
                  </a>
                </div>
              )}

              <div className="pt-2 border-t border-border-main/20">
                <div className="text-[8px] font-bold text-text-light uppercase tracking-widest mb-0.5">Ekspedisi / Vendor</div>
                <div className="text-[12.5px] font-bold text-[#C4914A] uppercase tracking-tight">{data.nama_vendor || "SJM (Internal)"}</div>
              </div>
            </div>

            {/* Kartu Detail Muatan */}
            <div className="bg-white rounded-xl border border-border-main/60 p-5 space-y-3.5 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[8px] font-bold text-text-light uppercase tracking-widest mb-0.5">Barang / Muatan</div>
                  <div className="text-[13px] font-black text-text-main leading-snug">{data.muatan || "—"}</div>
                </div>
                <div>
                  <div className="text-[8px] font-bold text-text-light uppercase tracking-widest mb-0.5">Kuantitas / Tonase</div>
                  <div className="text-[13px] font-bold text-text-main leading-snug">{data.unit_muatan || (data.tonase ? `${data.tonase} ton` : "—")}</div>
                </div>
              </div>
              {data.sn && (
                <div className="pt-2 border-t border-border-main/20">
                  <div className="text-[8px] font-bold text-text-light uppercase tracking-widest mb-1">Serial Number (SN)</div>
                  <div className="text-[10px] font-mono font-bold text-text-main bg-slate-50 px-2 py-0.5 rounded border border-border-main/30 w-fit">{data.sn}</div>
                </div>
              )}
            </div>

            {/* Keterangan SO */}
            {data.keterangan && (
              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/50">
                <div className="text-[8px] font-bold text-amber-800 uppercase tracking-widest mb-1.5">Catatan Khusus</div>
                <div className="text-[11px] font-medium text-amber-900 italic leading-relaxed">{data.keterangan}</div>
              </div>
            )}
          </div>

          {/* ─── Kolom Tengah (4/12): Perjalanan & File Drive ─── */}
          <div className="col-span-12 lg:col-span-4 p-6 space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-border-main/30">
              <div className="w-1.5 h-3 bg-[#4A6FA5] rounded-full" />
              <h4 className="text-[10px] font-black text-text-light uppercase tracking-widest">Rute & File Perjalanan</h4>
            </div>

            {/* Rute Visual */}
            <div className="bg-white rounded-xl border border-border-main/60 p-5 space-y-3.5 shadow-sm">
              <div className="text-[8px] font-bold text-text-light uppercase tracking-widest opacity-60">Rute Pengiriman</div>
              <div className="flex items-start gap-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-black text-text-main leading-tight truncate" title={data.lokasi_muat}>{data.lokasi_muat || "—"}</div>
                  {data.sharelok_muat && (
                    <a href={data.sharelok_muat} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[8.5px] text-accent hover:underline font-black mt-1 uppercase tracking-wider">
                      <Icon name="MapPin" size={8} /> Google Maps
                    </a>
                  )}
                </div>
                <Icon name="ArrowRight" size={14} className="text-accent/40 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-[12px] font-black text-text-main leading-tight truncate" title={data.lokasi_bongkar}>{data.lokasi_bongkar || "—"}</div>
                  {data.sharelok_bongkar && (
                    <a href={data.sharelok_bongkar} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[8.5px] text-accent hover:underline font-black mt-1 uppercase tracking-wider">
                      Google Maps <Icon name="MapPin" size={8} />
                    </a>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2.5 border-t border-border-main/20">
                <div>
                  <div className="text-[8px] font-bold text-text-light uppercase tracking-widest mb-0.5">Tanggal Muat</div>
                  <div className="text-[11.5px] font-bold text-text-main tabular-nums">{data.tgl_muat || "—"} {data.jam_muat && `@ ${data.jam_muat}`}</div>
                </div>
                <div>
                  <div className="text-[8px] font-bold text-text-light uppercase tracking-widest mb-0.5">Tanggal Bongkar</div>
                  <div className="text-[11.5px] font-bold text-text-main tabular-nums">
                    {data.tgl_bongkar || "—"}
                    {durationDays !== null && <span className="text-[9px] text-text-light ml-1 font-medium">({durationDays}h)</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Pelacakan Surat Jalan (POD) Status Card */}
            {(() => {
              const sjRecord = (invoices || []).find((inv: any) =>
                inv.tipe === 'surat_jalan' && (inv.so_order_ids || []).includes(data.order_id)
              );
              const rawStatus = sjRecord ? (sjRecord.status_dokumen || 'Belum Diterima') : 'Belum Diterima';
              let statusSj = 'Surat jalan belum diterima';
              let badgeColor = 'bg-red-brand-light text-red-brand border-red-brand/20';

              if (rawStatus === 'Verified') {
                statusSj = 'Verified';
                badgeColor = 'bg-green-brand-light text-green-brand border-green-brand/20';
              } else if (rawStatus.startsWith('Diterima oleh') || rawStatus === 'Diterima Kantor') {
                statusSj = rawStatus;
                badgeColor = 'bg-blue-brand-light text-blue-brand border-blue-brand/20';
              } else if (rawStatus === 'Terkirim ke Customer' || rawStatus === 'Sudah dikirim ke Customer') {
                statusSj = 'Sudah dikirim ke Customer';
                badgeColor = 'bg-yellow-brand-light text-yellow-brand border-yellow-brand/20';
              }

              const resiSj = sjRecord ? (sjRecord.no_resi || '') : '';
              const ekspedisiSj = sjRecord ? (sjRecord.ekspedisi || '') : '';
              const tglKirimSj = sjRecord ? (sjRecord.tgl_kirim || '') : '';

              return (
                <div className="bg-white rounded-xl border border-border-main/60 p-5 space-y-3 shadow-sm animate-fade-in">
                  <div className="flex justify-between items-center text-[8px] font-bold text-text-light uppercase tracking-widest opacity-60">
                    <span>Pelacakan Surat Jalan (POD)</span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${badgeColor}`}>
                      {statusSj}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px] pt-1">
                    <div>
                      <span className="text-text-light block text-[9px] uppercase tracking-wider font-bold mb-0.5">No Resi / Keterangan</span>
                      <span className="font-bold text-text-main">{resiSj || '—'}</span>
                    </div>
                    <div>
                      <span className="text-text-light block text-[9px] uppercase tracking-wider font-bold mb-0.5">Ekspedisi / Kurir</span>
                      <span className="font-bold text-text-main">{ekspedisiSj || '—'}</span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-border-main/20 flex justify-between items-center">
                      <div>
                        <span className="text-text-light block text-[9px] uppercase tracking-wider font-bold mb-0.5">Tanggal Kirim / Terima</span>
                        <span className="font-bold text-text-main">
                          {tglKirimSj ? fmtDate(tglKirimSj) : '—'}
                        </span>
                      </div>
                      {data.surat_jalan && (
                        <a href={data.surat_jalan} target="_blank" rel="noopener noreferrer" className="btn-primary h-7 px-3 text-[9px] uppercase tracking-widest flex items-center gap-1.5 shadow-sm rounded-lg">
                          Lihat Scan SJ <Icon name="ExternalLink" size={8} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Dokumentasi File Drive */}
            {(() => {
              const allDocs = [
                ...(data.foto_muat       ? [{ label: "Foto Muat (Loading)",  url: data.foto_muat,        type: "img" }] : []),
                ...(data.foto_bongkar    ? [{ label: "Foto Bongkar (POD)",   url: data.foto_bongkar,     type: "img" }] : []),
                ...(data.surat_jalan     ? [{ label: "Surat Jalan",          url: data.surat_jalan,      type: "pdf" }] : []),
                ...(data.spk             ? [{ label: "SPK Kontrak",          url: data.spk,              type: "pdf" }] : []),
                ...(data.scan_invoice    ? [{ label: "Scan Invoice",         url: data.scan_invoice,     type: "pdf" }] : []),
                ...(data.invoice_vendor  ? [{ label: "Invoice Vendor",       url: data.invoice_vendor,   type: "pdf" }] : []),
                ...(data.dokumen_asuransi? [{ label: "Polis Asuransi",       url: data.dokumen_asuransi, type: "shield" }] : []),
                ...(data.potong_pajak    ? [{ label: "Bukti Potong Pajak",   url: data.potong_pajak,     type: "pdf" }] : []),
                ...(data.bukti_muatan    ? [{ label: "Bukti Muatan Lama",    url: data.bukti_muatan,     type: "img" }] : []),
              ];
              if (allDocs.length === 0) return null;
              return (
                <div className="bg-white rounded-xl border border-border-main/60 p-5 space-y-3 shadow-sm">
                  <div className="flex justify-between items-center text-[8px] font-bold text-text-light uppercase tracking-widest opacity-60">
                    <span>Dokumentasi Berkas</span>
                    <span>{allDocs.length} file</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {allDocs.map((doc, idx) => {
                      const iconName = doc.type === 'shield' ? 'Shield' : doc.type === 'img' ? 'Image' : 'FileText';
                      const colorHex = doc.type === 'shield' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : doc.type === 'img' ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-blue-600 bg-blue-50 border-blue-100';
                      return (
                        <div key={idx} className={`p-2.5 rounded-lg border ${colorHex} flex items-center justify-between gap-2`}>
                          <div className="min-w-0 flex items-center gap-1.5">
                            <Icon name={iconName as any} size={11} className="shrink-0" />
                            <span className="text-[10px] font-bold truncate leading-tight">{doc.label}</span>
                          </div>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-black/5 rounded text-accent transition-colors shrink-0">
                            <Icon name="ExternalLink" size={10} />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Log Perjalanan ( Timeline ) */}
            <div className="bg-white rounded-xl border border-border-main/60 p-5 space-y-3.5 shadow-sm">
              <div className="flex justify-between items-center text-[8px] font-bold text-text-light uppercase tracking-widest opacity-60">
                <span>Log Perjalanan</span>
                <span>{(data.posisi_log || []).length} Event</span>
              </div>
              {(!data.posisi_log || data.posisi_log.length === 0) ? (
                <div className="text-center py-4 text-text-light opacity-50 text-[10px] italic">Belum ada log update</div>
              ) : (
                <div className="border-l border-border-main/40 ml-1.5 space-y-3.5 text-left">
                  {(data.posisi_log || []).map((log: any, idx: number) => {
                    const dotColor = idx === 0 ? "#4A6FA5"
                      : log.status === "Completed" ? "#6B8E23"
                      : log.status === "Loading"   ? "#C4914A"
                      : log.status === "On Going"  ? "#EB5E28"
                      : "#E8E4DC";
                    return (
                      <div key={idx} className="relative pl-4 last:pb-0">
                        <div className="absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full border border-white shadow-sm" style={{ backgroundColor: dotColor }} />
                        <div className="text-[10.5px] font-black text-text-main flex items-center gap-1.5 leading-none">
                          <span>{log.location || log.status}</span>
                          {log.status && <span className="text-[7.5px] font-black px-1.5 py-0.5 rounded uppercase" style={{ backgroundColor: dotColor + "15", color: dotColor }}>{log.status}</span>}
                        </div>
                        {log.info && !log.info.includes("Status diperbarui via Stepper") && <div className="text-[9.5px] text-text-med leading-snug mt-1">{log.info}</div>}
                        <div className="text-[8px] font-bold text-text-light opacity-40 tabular-nums mt-0.5">{log.date} {log.time && `@ ${log.time}`}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ─── Kolom Kanan (4/12): Keuangan & Invoice ─── */}
          <div className="col-span-12 lg:col-span-4 p-6 space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-border-main/30">
              <div className="w-1.5 h-3 bg-[#6B8E23] rounded-full" />
              <h4 className="text-[10px] font-black text-text-light uppercase tracking-widest">Keuangan & Invoice</h4>
            </div>

            {/* Rincian Biaya */}
            <div className="bg-white rounded-xl border border-border-main/60 p-5 space-y-3 shadow-sm">
              <div className="text-[8px] font-bold text-text-light uppercase tracking-widest opacity-60">Rincian Biaya & Pajak</div>
              <div className="space-y-2 text-[11.5px] font-bold text-text-med">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-text-light">Harga Pengiriman</span>
                  <span className="font-bold text-text-main tabular-nums">{fmt(data.harga_pengiriman || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-text-light">Asuransi Trip</span>
                  <span className="font-bold text-text-main tabular-nums">{fmt(data.harga_asuransi || 0)}</span>
                </div>
                {data.nilai_pajak > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-text-light">PPN (1.1%)</span>
                    <span className="font-bold text-text-main tabular-nums">{fmt(data.nilai_pajak)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 mt-1 border-t border-border-main/30">
                  <span className="text-[11.5px] font-black text-text-main uppercase tracking-wide">Total Billable</span>
                  <span className="text-[15px] font-black text-text-main tabular-nums">{fmt(nilaiSO)}</span>
                </div>
              </div>
            </div>

            {/* Status Keuangan & Progress */}
            <div className="bg-white rounded-xl border border-border-main/60 p-5 space-y-3.5 shadow-sm">
              <div className="flex justify-between items-center text-[8px] font-bold text-text-light uppercase tracking-widest opacity-60">
                <span>Pembayaran Piutang</span>
                <span className="px-2 py-0.5 rounded-full text-[8px] font-black" style={{ backgroundColor: payColor + "15", color: payColor }}>{payStatus}</span>
              </div>
              {totalPiutang > 0 && (
                <div>
                  <div className="flex justify-between text-[9.5px] text-text-light mb-1.5 font-bold">
                    <span>Progress Pembayaran</span>
                    <span className="font-black text-text-main">{payPct}%</span>
                  </div>
                  <div className="h-1.5 bg-[#F5F4F1] rounded-full overflow-hidden border border-border-main/20">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${payPct}%`, backgroundColor: payColor }} />
                  </div>
                </div>
              )}
              <div className="space-y-2 text-[11.5px] font-bold text-text-med">
                {totalPiutang > 0 ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-text-light">Total Tagihan Jurnal</span>
                      <span className="font-black text-text-main tabular-nums">{fmt(totalPiutang)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-text-light">Terbayar</span>
                      <span className="font-black text-green-600 tabular-nums">{fmt(totalTerbayar)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-border-main/20">
                      <span className="font-bold text-text-main">Sisa Piutang</span>
                      <span className="text-[14px] font-black tabular-nums" style={{ color: payColor }}>{fmt(sisaPiutang)}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-[10px] text-text-light text-center py-1.5 italic opacity-60">Belum ada jurnal piutang tercatat</div>
                )}
                {aging > 0 && sisaPiutang > 0 && (
                  <div className="flex items-center gap-1.5 mt-1 p-2 rounded-lg bg-red-50 text-[9px] font-bold text-red-600 border border-red-100">
                    <Icon name="Clock" size={10} />
                    <span>Tagihan tertunggak {aging} hari sejak invoice</span>
                  </div>
                )}
              </div>
            </div>

            {/* Asuransi Policy Details */}
            {(data.no_asuransi || data.nilai_tanggungan || data.spk) && (
              <div className="bg-white rounded-xl border border-border-main/60 p-5 space-y-2.5 shadow-sm">
                <div className="text-[8px] font-bold text-text-light uppercase tracking-widest opacity-60">Asuransi & Kontrak SPK</div>
                <div className="space-y-2 text-[11.5px] font-bold text-text-med">
                  {data.no_asuransi && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-text-light">Polis Asuransi</span>
                      <span className="font-bold text-text-main">{data.no_asuransi}</span>
                    </div>
                  )}
                  {data.nilai_tanggungan > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-text-light">Nilai Pertanggungan</span>
                      <span className="font-black text-text-main tabular-nums">{fmt(data.nilai_tanggungan)}</span>
                    </div>
                  )}
                  {data.spk && (
                    <div className="flex justify-between items-center pt-2 border-t border-border-main/20">
                      <span className="font-medium text-text-light">No. Kontrak SPK</span>
                      <span className="font-bold text-text-main font-mono">{data.spk}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Invoice Keluar (Customer Invoices) */}
            <div className="bg-white rounded-xl border border-border-main/60 p-5 space-y-3 shadow-sm">
              <div className="flex justify-between items-center text-[8px] font-bold text-text-light uppercase tracking-widest opacity-60">
                <span>Invoice Keluar (Customer)</span>
                <span>{customerInvoices.length} Invoice</span>
              </div>
              {customerInvoices.length === 0 ? (
                <div className="rounded-xl bg-amber-50/50 border border-amber-200/50 p-3 text-center">
                  <div className="text-[10px] font-bold text-amber-700">Belum Ada Invoice Keluar</div>
                  <div className="text-[8px] text-amber-600 opacity-80 mt-0.5 mb-2">SO ini belum diterbitkan tagihannya ke customer</div>
                  {data.status_muatan === 'Completed' && (
                    <button
                      onClick={() => { handleNav("operasional", "invoice"); onClose(); }}
                      className="h-7 px-3 bg-accent text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-accent/90 transition-all w-full flex items-center justify-center gap-1"
                    >
                      <Icon name="Plus" size={9} /> Buat Invoice Baru
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {customerInvoices.map((inv: any) => {
                    const sc = INV_STATUS_HEX[inv.status_bayar || 'Belum Bayar'] || '#666';
                    return (
                      <div key={inv.id} className="p-2.5 rounded-lg border border-border-main/60 flex items-center justify-between gap-3 hover:bg-slate-50 transition-all">
                        <div className="min-w-0">
                          <button
                            onClick={() => onInvoiceClick && onInvoiceClick(inv)}
                            className="text-[10.5px] font-black text-accent uppercase tracking-tight hover:underline text-left block truncate max-w-[170px]"
                          >
                            {inv.no_invoice}
                          </button>
                          <div className="text-[8px] text-text-light opacity-50 mt-0.5">{fmtDate(inv.tgl_invoice)}</div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end">
                          <div className="text-[10.5px] font-black text-text-main tabular-nums">{fmt(inv.total_setelah_pajak || 0)}</div>
                          <span className="text-[7.5px] font-black px-1.5 py-0.5 rounded-full uppercase mt-0.5" style={{ backgroundColor: sc + '15', color: sc }}>{inv.status_bayar || 'Belum Bayar'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Invoice Vendor (Invoice Masuk) */}
            <div className="bg-white rounded-xl border border-border-main/60 p-5 space-y-3 shadow-sm">
              <div className="flex justify-between items-center text-[8px] font-bold text-text-light uppercase tracking-widest opacity-60">
                <span>Invoice Vendor (Masuk)</span>
                <span>{vendorInvoices.length} Invoice</span>
              </div>
              {vendorInvoices.length === 0 && !data.invoice_vendor ? (
                <div className="text-[10px] text-text-light text-center py-3 bg-slate-50 rounded-xl border border-dashed border-border-main/40 italic">
                  Belum ada invoice vendor tercatat
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Direct GDrive Document Link from SO if available */}
                  {data.invoice_vendor && (
                    <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/30 flex items-center justify-between gap-3 hover:bg-amber-50/50 transition-all">
                      <div className="min-w-0">
                        <div className="text-[10.5px] font-black text-amber-800 uppercase tracking-tight">Dokumen Invoice Vendor</div>
                        <div className="text-[8.5px] text-amber-600 opacity-85 mt-0.5">Tautan Langsung Google Drive</div>
                      </div>
                      <a
                        href={data.invoice_vendor}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-7 px-2.5 rounded-lg text-[9px] font-black text-amber-800 bg-amber-100 hover:bg-amber-200 transition-colors flex items-center gap-1 shrink-0"
                      >
                        <Icon name="ExternalLink" size={10} /> Buka Drive
                      </a>
                    </div>
                  )}

                  {/* System Invoice Masuk */}
                  {vendorInvoices.map((inv: any) => {
                    const sc = INV_STATUS_HEX[inv.status_bayar || 'Belum Bayar'] || '#666';
                    return (
                      <div key={inv.id} className="p-2.5 rounded-lg border border-border-main/60 flex items-center justify-between gap-3 hover:bg-slate-50 transition-all">
                        <div className="min-w-0">
                          <button
                            onClick={() => onInvoiceClick && onInvoiceClick(inv)}
                            className="text-[10.5px] font-black text-accent uppercase tracking-tight hover:underline text-left block truncate max-w-[170px]"
                          >
                            {inv.no_invoice}
                          </button>
                          <div className="text-[8px] text-text-light opacity-50 mt-0.5">
                            {fmtDate(inv.tgl_invoice)} · Vendor: {inv.customer || '—'}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end">
                          <div className="text-[10.5px] font-black text-text-main tabular-nums">{fmt(inv.total_setelah_pajak || 0)}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[7.5px] font-black px-1.5 py-0.5 rounded-full uppercase" style={{ backgroundColor: sc + '15', color: sc }}>
                              {inv.status_bayar || 'Belum Bayar'}
                            </span>
                            {inv.gdrive_url && (
                              <a
                                href={inv.gdrive_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-0.5 text-text-light hover:text-accent transition-colors"
                                title="Buka Scan Invoice"
                              >
                                <Icon name="FileText" size={10} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Jurnal Terkait */}
            {relatedJurnals.length > 0 && (
              <div className="bg-white rounded-xl border border-border-main/60 p-5 space-y-3 shadow-sm">
                <div className="flex justify-between items-center text-[8px] font-bold text-text-light uppercase tracking-widest opacity-60">
                  <span>Jurnal Terkait</span>
                  <span>{relatedJurnals.length} Jurnal</span>
                </div>
                <div className="space-y-2">
                  {relatedJurnals.map((j: any) => (
                    <div key={j.id} onClick={() => onJurnalClick && onJurnalClick(j.no_jurnal)} className="p-2.5 rounded-lg border border-border-main/60 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between gap-2 group">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10.5px] font-black text-accent uppercase tracking-wide group-hover:underline block">{j.no_jurnal}</span>
                        <span className="text-[9.5px] text-text-med truncate block w-full mt-0.5">{j.keterangan}</span>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end">
                        <span className="text-[11px] font-black text-text-main tabular-nums">{fmt(j.total_debit)}</span>
                        <span className="text-[8px] text-text-light opacity-50 mt-0.5 block">{fmtDate(j.tanggal)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aksi Cepat */}
            <div className="bg-white rounded-xl border border-border-main/60 p-5 space-y-2 shadow-sm">
              <div className="text-[8px] font-bold text-text-light uppercase tracking-widest opacity-60 mb-2">Aksi Cepat</div>
              {canEdit && (
                <button
                  onClick={() => { handleNav("operasional", "so"); setPendingEditSO(data.order_id); onClose(); }}
                  className="w-full h-8 rounded-lg border border-border-main text-[9.5px] font-black text-text-med uppercase tracking-widest hover:border-accent hover:text-accent hover:bg-accent/5 transition-all flex items-center justify-center gap-1.5"
                >
                  <Icon name="Edit2" size={10} /> Edit Sales Order
                </button>
              )}
              {data.status_muatan === 'Completed' && customerInvoices.length === 0 && (
                <button
                  onClick={() => { handleNav("operasional", "invoice"); onClose(); }}
                  className="w-full h-8 rounded-lg bg-accent text-white text-[9.5px] font-black uppercase tracking-widest hover:bg-accent/90 transition-all flex items-center justify-center gap-1.5"
                >
                  <Icon name="FileText" size={10} /> Buat Invoice Keluar
                </button>
              )}
              {(canEdit || canFinance) && (
                <button
                  onClick={() => { handleNav("keuangan", "jurnal"); onClose(); }}
                  className="w-full h-8 rounded-lg border border-border-main text-[9.5px] font-black text-text-med uppercase tracking-widest hover:border-accent hover:text-accent hover:bg-accent/5 transition-all flex items-center justify-center gap-1.5"
                >
                  <Icon name="BookOpen" size={10} /> Input Jurnal Baru
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full h-8 rounded-lg border border-border-main/40 text-[9.5px] font-medium text-text-light uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Tutup Panel
              </button>
            </div>
          </div>

        </div>
      </div>
    </Card>
  );
};
