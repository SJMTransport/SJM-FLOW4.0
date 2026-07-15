import React from "react";
import { Card, Icon } from "@/src/components/SJMComponents";
import { fmt } from "@/src/utils";

// Helper functions
const fRp = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');

const fmtDate = (d: string) => {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

function terbilang(n: number): string {
  const s = ['','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan','Sembilan','Sepuluh','Sebelas'];
  if (n < 12)   return s[Math.round(n)];
  if (n < 20)   return (terbilang(n - 10) + ' Belas').trim();
  if (n < 100)  return (terbilang(Math.floor(n / 10)) + ' Puluh ' + terbilang(n % 10)).trim();
  if (n < 200)  return ('Seratus ' + terbilang(n - 100)).trim();
  if (n < 1000) return (terbilang(Math.floor(n / 100)) + ' Ratus ' + terbilang(n % 100)).trim();
  if (n < 2000) return ('Seribu ' + terbilang(n - 1000)).trim();
  if (n < 1e6)  return (terbilang(Math.floor(n / 1000)) + ' Ribu ' + terbilang(n % 1000)).trim();
  if (n < 1e9)  return (terbilang(Math.floor(n / 1e6)) + ' Juta ' + terbilang(n % 1e6)).trim();
  return '';
}

export const InvoiceDetailModal = ({ data, onClose, so, jurnal, invoices, onSOClick, onJurnalClick }: any) => {
  if (!data) return null;

  const inv = data;
  const getSjStatus = (soId: string) => {
    const sjRecord = (invoices || []).find((i: any) =>
      i.tipe === 'surat_jalan' && (i.so_order_ids || []).includes(soId)
    );
    return sjRecord ? (sjRecord.status_dokumen || 'Belum Dikirim') : 'Belum Dikirim';
  };
  const soOrderIds: string[] = inv.so_order_ids || [];
  const soDetails = soOrderIds.map((soId: string) => so.find((x: any) => x.order_id === soId) || { order_id: soId, _notFound: true });

  // Calculate payments list from general journals matching inv.no_invoice
  const relatedJurnalDetails = (jurnal || []).filter((j: any) =>
    (j.no_invoice === inv.no_invoice) || 
    (j.keterangan || "").toUpperCase().includes(inv.no_invoice.toUpperCase())
  ).flatMap((j: any) => (j.jurnal_detail || []).filter((d: any) => d.kredit > 0).map((d: any) => ({
    ...d,
    tanggal: j.tanggal,
    no_jurnal: j.no_jurnal,
    keterangan: j.keterangan
  })));

  const totalInvoiced = inv.total_setelah_pajak || 0;
  const totalPaid = relatedJurnalDetails.reduce((s: number, jr: any) => s + Number(jr.kredit || 0), 0);
  const totalRemaining = totalInvoiced - totalPaid;

  const getTrackingUrl = (ekspedisi: string, no_resi: string): string => {
    const e = (ekspedisi || '').toLowerCase().trim();
    const r = no_resi || '';
    if (e.includes('tiki'))     return `https://tiki.id/id/track/${r}`;
    if (e.includes('jne'))      return `https://www.jne.co.id/id/tracking/trace/${r}`;
    if (e.includes('sicepat'))  return `https://sicepat.com/checkAwb/${r}`;
    if (e.includes('anteraja')) return `https://anteraja.id/tracking/${r}`;
    if (e.includes('jnt') || e.includes('j&t')) return `https://www.jet.co.id/track/${r}`;
    if (e.includes('pos'))      return `https://www.posindonesia.co.id/id/tracking?noResi=${r}`;
    if (e.includes('wahana'))   return `https://www.wahana.com/tracking/${r}`;
    if (e.includes('ninja'))    return `https://www.ninjaxpress.co/id-id/tracking?id=${r}`;
    return `https://www.google.com/search?q=lacak+resi+${encodeURIComponent(ekspedisi)}+${r}`;
  };

  const sc = totalRemaining <= 0 && totalInvoiced > 0 ? '#22c55e'
    : totalPaid > 0 ? '#f59e0b'
    : '#ef4444';
  const payStatus = totalRemaining <= 0 && totalInvoiced > 0 ? 'Lunas'
    : totalPaid > 0 ? 'Parsial'
    : 'Belum Bayar';

  const printInvoice = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const invoiceEl = document.getElementById(`invoice-paper-${inv.id}`);
    if (!invoiceEl) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${inv.no_invoice}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Helvetica, Arial, sans-serif; font-size: 10pt; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
            th, td { border: 1px solid black; padding: 6px; text-align: left; font-size: 9pt; }
            .no-border td { border: none; }
            .bg-orange { background-color: #f9ac3d !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @media print {
              .bg-orange { background-color: #f9ac3d !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div style="max-width: 650px; margin: auto;">
            ${invoiceEl.innerHTML}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const INV_STATUS_HEX: Record<string, string> = {
    'Belum Bayar': '#ef4444',
    'Parsial': '#f59e0b',
    'Lunas': '#22c55e',
    'Lebih Bayar': '#3b82f6',
    'Perlu Verifikasi': '#8b5cf6',
  };

  return (
    <Card className="w-screen h-full flex flex-col p-0 border-none rounded-none bg-[#F5F4F1] overflow-hidden shadow-2xl animate-fade-left relative z-10" onClick={e => e.stopPropagation()}>
      
      {/* Header Sticky */}
      <div className="sticky top-0 z-20 bg-white border-b border-border-main px-6 py-3 flex items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors shrink-0">
            <Icon name="X" size={16} className="text-text-med" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-black text-text-light uppercase tracking-widest">Detail Invoice</span>
              <span className="text-[9px] text-text-light opacity-40">/</span>
              <span className="text-[11px] font-black text-accent italic tracking-tight">{inv.no_invoice}</span>
            </div>
            <div className="text-[15px] font-black text-text-main leading-tight truncate">{inv.customer}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`badge text-[8px] uppercase font-black ${inv.tipe === 'dp' ? 'bg-amber-100 text-amber-700' : inv.tipe === 'pelunasan' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{inv.tipe || 'Normal'}</span>
          <span className="badge text-[8px]" style={{ backgroundColor: sc + '20', color: sc }}>{payStatus}</span>
          <button onClick={printInvoice} className="h-8 px-3.5 bg-accent text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-accent/90 transition-all flex items-center gap-1.5">
            <Icon name="Download" size={11} /> Cetak / Print
          </button>
        </div>
      </div>

      {/* Body Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-full">
          
          {/* Left Column (7/12) - Invoice Preview Paper */}
          <div className="lg:col-span-7 p-6 bg-slate-100 border-r border-border-main/30 overflow-y-auto no-scrollbar">
            <div id={`invoice-paper-${inv.id}`} className="bg-white rounded-xl p-6 shadow-md border border-border-main/20 text-left mx-auto max-w-[650px]" style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '9pt', color: '#000', minHeight: '800px' }}>
              
              {/* Logo SJM & Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3 items-start">
                  <div className="w-12 h-12 rounded bg-[#f9ac3d] flex items-center justify-center text-white font-bold text-[16px] flex-shrink-0">SJM</div>
                  <div>
                    <div className="text-[#f9ac3d] font-bold text-[14px] leading-tight">SUGIARTO JAYA MANDIRI TRANSPORT</div>
                    <div className="text-[#505050] text-[9px] mt-1 leading-relaxed">
                      Jl Raya Kemang Parung No.168A Kab.Bogor<br />
                      Phone : 0811751027 | Email : sugiartojayamandiri@gmail.com
                    </div>
                  </div>
                </div>
                <div className="bg-[#f9ac3d] px-4 py-1 rounded text-white font-bold text-[15px]">INVOICE</div>
              </div>

              <div className="border-t-[1.5px] border-black mb-0.5" />
              <div className="border-t-[2px] border-[#f9ac3d] w-32 ml-auto mb-3" />

              {/* Metadata Table */}
              <table className="mb-4 text-[10px] text-left border-collapse">
                <tbody>
                  {[
                    ['No Invoice', inv.no_invoice, true],
                    ['Tgl Invoice', fmtDate(inv.tgl_invoice), false],
                    ['Penyewa', inv.customer, false],
                    ['Telepon', inv.pic_cust || '-', false],
                  ].map(([lbl, val, bold]) => (
                    <tr key={lbl as string}>
                      <td className="pr-2 pb-1 text-[#505050] whitespace-nowrap">{lbl}</td>
                      <td className="pr-2 pb-1 text-[#505050]">:</td>
                      <td className={`pb-1 ${bold ? 'font-bold text-black' : 'text-black'}`}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Items Table */}
              <table className="w-full border-collapse text-[9px] border border-black mb-4">
                <thead>
                  <tr className="bg-[#f9ac3d] text-black text-center font-bold">
                    <th className="border border-black p-1">No.</th>
                    <th className="border border-black p-1">Tanggal</th>
                    <th className="border border-black p-1">No SO / Armada</th>
                    <th className="border border-black p-1">Deskripsi</th>
                    <th className="border border-black p-1 text-right">Biaya Kirim</th>
                    <th className="border border-black p-1 text-center">Asuransi</th>
                    <th className="border border-black p-1 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const previewItems = soDetails.map((s: any, idx: number) => {
                      const subPrice = Number(s.harga_pengiriman) || Number(s.total_harga) || (inv.total_sebelum_pajak || 0) / (soOrderIds.length || 1);
                      const insurance = Number(s.harga_asuransi) > 0 ? Number(s.harga_asuransi) : 0;
                      const rowTotal = subPrice + insurance;
                      return {
                        no: idx + 1,
                        tgl: fmtDate(s.tgl_muat) + (s.tgl_bongkar ? `\n—\n${fmtDate(s.tgl_bongkar)}` : ''),
                        so_armada: s.order_id + '\n' + (s.jenis_truk || '-') + '\n' + (s.no_polisi ? `(${s.no_polisi})` : ''),
                        desc: `Muatan: ${s.muatan || '-'}${s.sn ? `\nSN: ${s.sn}` : ''}\nLokasi Muat: ${s.lokasi_muat || '-'}\nLokasi Tujuan: ${s.lokasi_bongkar || '-'}`,
                        shipCost: subPrice,
                        insCost: insurance,
                        total: rowTotal,
                      };
                    });

                    return previewItems.map((item, i) => (
                      <tr key={i} className="align-top border-b border-black">
                        <td className="border border-black p-1 text-center">{item.no}</td>
                        <td className="border border-black p-1 text-center whitespace-pre-line">{item.tgl}</td>
                        <td className="border border-black p-1 font-bold whitespace-pre-line">{item.so_armada}</td>
                        <td className="border border-black p-1 whitespace-pre-line text-[#333]">{item.desc}</td>
                        <td className="border border-black p-1 text-right whitespace-nowrap">{fRp(item.shipCost)}</td>
                        <td className="border border-black p-1 text-center text-[8px] whitespace-pre-line">
                          {item.insCost > 0 ? fRp(item.insCost) : 'Tidak termasuk\nasuransi'}
                        </td>
                        <td className="border border-black p-1 text-right whitespace-nowrap font-bold">{fRp(item.total)}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
                <tfoot>
                  <tr className="bg-white">
                    <td colSpan={5} rowSpan={3} className="border border-black p-1.5 text-left align-top max-w-[200px] text-[9px] text-[#444] leading-relaxed">
                      {inv.keterangan_invoice ? <><strong>Catatan:</strong><br />{inv.keterangan_invoice}</> : <strong>Catatan:</strong>}
                    </td>
                    <td className="border border-black p-1 text-right font-bold whitespace-nowrap">Sub Total</td>
                    <td className="border border-black p-1 text-right font-bold whitespace-nowrap">{fRp(inv.total_sebelum_pajak || 0)}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-black p-1 text-right whitespace-nowrap">PPN (1,1%)</td>
                    <td className="border border-black p-1 text-right whitespace-nowrap">{fRp(inv.ppn || 0)}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-black p-1 text-right font-bold whitespace-nowrap">Total</td>
                    <td className="border border-black p-1 text-right font-bold whitespace-nowrap font-black">{fRp(inv.total_setelah_pajak || 0)}</td>
                  </tr>
                  <tr className="bg-[#fafafa] text-left">
                    <td colSpan={7} className="border border-black p-1.5 font-bold">
                      Terbilang: {terbilang(inv.total_setelah_pajak || 0)} Rupiah
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="flex justify-between items-end mt-4">
                <div className="flex gap-2 items-start text-left">
                  <div className="w-1.5 h-8 bg-[#f9ac3d] rounded" />
                  <div>
                    <div className="font-bold text-[10px]">Pembayaran:</div>
                    <div className="text-[9px] text-[#333] mt-0.5">
                      Mandiri 1330026272567 — a/n PT Sugiarto Jaya Mandiri
                    </div>
                  </div>
                </div>
                <div className="text-center w-36">
                  <div className="text-[9px] mb-6">Hormat Kami,</div>
                  <div className="border-t border-black pt-0.5 text-[9px] font-bold">
                    (Muhammad Naufal Sugiarto)
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column (5/12) - Operational Actions and Information */}
          <div className="lg:col-span-5 p-5 bg-white flex flex-col gap-5 overflow-y-auto no-scrollbar text-left border-l border-l-border-main/30">
            
            {/* Financial Status Summary */}
            <div>
              <div className="text-[9px] font-black text-text-light uppercase tracking-widest opacity-60 mb-2">Ringkasan Pembayaran</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Total Invoice', value: fRp(totalInvoiced), color: 'text-text-main font-black' },
                  { label: 'Terbayar', value: fRp(totalPaid), color: 'text-green-600 font-black' },
                  { label: 'Sisa Tagihan', value: fRp(totalRemaining), color: totalRemaining > 0 ? 'text-red-500 font-black' : 'text-green-600 font-black' },
                  { label: 'DPP (Sub Total)', value: fRp(inv.total_sebelum_pajak || 0), color: 'text-text-med font-bold' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-3 rounded-xl border border-border-main bg-slate-50/50">
                    <div className="text-[8px] font-bold text-text-light uppercase tracking-widest mb-1">{label}</div>
                    <div className={`text-[12px] tabular-nums ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Linked Sales Orders */}
            <div>
              <div className="text-[9px] font-black text-text-light uppercase tracking-widest opacity-60 mb-2">
                Detail Sales Order ({soOrderIds.length} SO)
              </div>
              <div className="table-container max-h-[none]">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr>
                      <th className="w-[100px]">No SO</th>
                      <th>Rute</th>
                      <th className="text-right w-[90px]">Biaya</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-main/20">
                    {soDetails.length === 0 ? (
                      <tr><td colSpan={3} className="py-3 text-center text-text-light italic text-[10px]">Tidak ada data SO</td></tr>
                    ) : soDetails.map((s: any) => (
                      <tr key={s.order_id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5">
                          <div className="flex flex-col gap-1">
                            <button
                              className="text-[11px] font-black text-accent uppercase tracking-tight hover:underline text-left"
                              onClick={() => onSOClick && onSOClick(s.order_id)}
                            >
                              {s.order_id}
                            </button>
                            {(() => {
                              const statusSj = getSjStatus(s.order_id);
                              let badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
                              if (statusSj === 'Verified') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                              else if (statusSj === 'Diterima Kantor' || statusSj === 'Diterima') badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                              else if (statusSj === 'Sedang Dikirim') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';

                              return (
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[7.5px] font-black uppercase tracking-wider border self-start ${badgeColor}`}>
                                  SJ: {statusSj}
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        {s._notFound ? (
                          <td colSpan={2} className="text-text-light italic opacity-50 text-[9px]">Data tidak tersedia</td>
                        ) : (
                          <>
                            <td>
                              <div className="font-bold text-text-main truncate max-w-[120px]" title={s.lokasi_muat}>{s.lokasi_muat || '-'}</div>
                              <div className="text-[9px] text-text-light italic truncate" title={s.lokasi_bongkar}>→ {s.lokasi_bongkar || '-'}</div>
                            </td>
                            <td className="text-right font-bold tabular-nums text-text-main">{fRp(s.total_harga_pajak || s.total_harga || 0)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Riwayat Pembayaran (Jurnal) */}
            <div>
              <div className="text-[9px] font-black text-text-light uppercase tracking-widest opacity-60 mb-2">
                Riwayat Pembayaran Jurnal
              </div>
              {relatedJurnalDetails.length === 0 ? (
                <div className="text-[10px] text-text-light italic py-3 bg-slate-50 rounded-xl text-center border border-border-main/55">
                  Belum ada pembayaran tercatat di Jurnal
                </div>
              ) : (
                <div className="table-container max-h-[none]">
                  <table className="w-full border-collapse text-[10px]">
                    <thead>
                      <tr>
                        <th className="w-[100px]">No Jurnal</th>
                        <th>Keterangan</th>
                        <th className="text-right w-[95px]">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main/20">
                      {relatedJurnalDetails.map((jr: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td>
                            <button
                              onClick={() => onJurnalClick && onJurnalClick(jr.no_jurnal)}
                              className="text-[11px] font-black text-accent uppercase tracking-tight hover:underline text-left"
                            >
                              {jr.no_jurnal}
                            </button>
                            <div className="text-[8px] text-text-light opacity-50 tabular-nums mt-0.5">{fmtDate(jr.tanggal)}</div>
                          </td>
                          <td className="text-text-med leading-snug truncate max-w-[120px]" title={jr.keterangan}>{jr.keterangan}</td>
                          <td className="text-right font-black text-green-600 tabular-nums">{fRp(jr.kredit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Document Delivery Status */}
            {((inv.tipe !== 'masuk' && (inv.status_dokumen || inv.no_resi)) || inv.gdrive_url) && (
              <div className="border-t border-border-main/40 pt-4 space-y-3">
                <div className="text-[9px] font-black text-text-light uppercase tracking-widest opacity-60">Dokumen & Pengiriman</div>
                <div className="p-3 bg-[#F5F4F1]/60 rounded-xl border border-border-main/40 space-y-2 text-[11px] font-bold text-text-med">
                  {inv.tipe !== 'masuk' && inv.status_dokumen && (
                    <div className="flex items-center gap-2">
                      <span className="text-text-light w-16 shrink-0 font-medium">Status</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        inv.status_dokumen === 'Diterima Customer' ? 'bg-green-100 text-green-700' :
                        inv.status_dokumen === 'Terkirim' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                      }`}>{inv.status_dokumen}</span>
                    </div>
                  )}
                  {inv.gdrive_url && (
                    <div className="flex items-center gap-2">
                      <span className="text-text-light w-16 shrink-0 font-medium">Scan Invoice</span>
                      <a href={inv.gdrive_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline flex items-center gap-1">
                        <Icon name="FileText" size={10} /> Buka Drive <Icon name="ExternalLink" size={8} />
                      </a>
                    </div>
                  )}
                  {inv.tipe !== 'masuk' && inv.no_resi && (
                    <div className="flex items-center gap-2">
                      <span className="text-text-light w-16 shrink-0 font-medium">Ekspedisi</span>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono text-text-main truncate">{inv.ekspedisi} {inv.no_resi}</span>
                        <a href={getTrackingUrl(inv.ekspedisi || '', inv.no_resi)} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-accent text-white rounded text-[8px] font-black uppercase tracking-wider hover:bg-accent/80 transition-all shrink-0">Lacak</a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </Card>
  );
};
