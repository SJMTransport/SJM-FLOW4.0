import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { generateInvoicePDF } from '../utils/generateInvoicePDF';
import type { InvoiceData } from '../utils/generateInvoicePDF';
import { showToast } from './SJMComponents';

interface InvoicePreviewModalProps {
  data: InvoiceData;
  invoiceNumber: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const GOLD = '#f9ac3d';

// Identik dengan fRp di generateInvoicePDF.ts
const fRp = (n: number) =>
  'Rp.' + Math.round(n || 0).toLocaleString('id-ID') + ',00';

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

const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  data, invoiceNumber, onClose, onConfirm,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleDownloadAndSave = async () => {
    setError(null);
    setDownloading(true);
    try {
      const doc = await generateInvoicePDF(data);
      const filename = `Invoice_${invoiceNumber.replace(/\//g, '_')}.pdf`;
      doc.save(filename);
      await onConfirm();
      showToast(`Invoice ${invoiceNumber} berhasil diunduh dan disimpan!`, 'success');
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err: any) {
      setError(err.message || 'Gagal generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const catatan = data.catatan || (data as any).keterangan || '';

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.72)',
      zIndex: 9999,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '24px 16px', overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: '860px' }}>

        {/* ── Action bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '12px',
        }}>
          <div style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>
            Preview Invoice — {invoiceNumber}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {error && <span style={{ color: '#f87171', fontSize: '11px' }}>{error}</span>}
            {success && <span style={{ color: '#4ade80', fontSize: '12px' }}>✅ Tersimpan!</span>}
            <button onClick={onClose} disabled={downloading}
              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #6b7280', color: '#d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
              Batal
            </button>
            <button onClick={handleDownloadAndSave} disabled={downloading || success}
              style={{ padding: '8px 20px', background: downloading ? '#374151' : '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', opacity: success ? 0.6 : 1 }}>
              {downloading ? 'Generating...' : '⬇ Download & Simpan'}
            </button>
          </div>
        </div>

        {/* ── Paper invoice ── */}
        <div style={{
          backgroundColor: '#fff', borderRadius: '8px',
          padding: '28px 24px', fontFamily: 'helvetica, Arial, sans-serif',
          fontSize: '9pt', color: '#000',
        }}>

          {/* ── HEADER ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            {/* Logo placeholder + company */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '4px',
                background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 'bold', fontSize: '14pt', flexShrink: 0,
              }}>SJM</div>
              <div>
                <div style={{ color: GOLD, fontWeight: 'bold', fontSize: '13pt', lineHeight: 1.2 }}>
                  SUGIARTO JAYA MANDIRI TRANSPORT
                </div>
                <div style={{ color: '#505050', fontSize: '8pt', marginTop: '4px', lineHeight: 1.7 }}>
                  Jl Raya Kemang Parung No.168A Kab.Bogor<br />
                  Phone  : 0811751027<br />
                  Email   : sugiartojayamandiri@gmail.com
                </div>
              </div>
            </div>
            {/* INVOICE badge */}
            <div style={{
              background: GOLD, padding: '6px 20px', borderRadius: '2px',
              color: '#fff', fontWeight: 'bold', fontSize: '14pt',
            }}>
              INVOICE
            </div>
          </div>

          {/* ── GARIS ── */}
          <div style={{ borderTop: '1.5px solid #000', marginBottom: '2px' }} />
          <div style={{ borderTop: '2px solid ' + GOLD, width: '160px', marginLeft: 'auto', marginBottom: '10px' }} />

          {/* ── INFO BLOCK ── */}
          <table style={{ borderCollapse: 'collapse', marginBottom: '14px', fontSize: '9pt' }}>
            <tbody>
              {[
                ['No Invoice',  data.invoiceNumber, true],
                ['Tgl Invoice', data.invoiceDate,   false],
                ['Penyewa',     data.customer,      false],
                ['Telepon',     data.picCust || '-', false],
              ].map(([label, val, bold]) => (
                <tr key={label as string}>
                  <td style={{ paddingRight: '6px', paddingBottom: '3px', color: '#000', whiteSpace: 'nowrap' }}>{label}</td>
                  <td style={{ paddingRight: '6px', paddingBottom: '3px' }}>:</td>
                  <td style={{ paddingBottom: '3px', fontWeight: bold ? 'bold' : 'normal' }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── TABLE ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
            <thead>
              <tr style={{ background: GOLD, color: '#000' }}>
                {['No.', 'Tanggal', 'No SO / Armada', 'Deskripsi', 'Biaya Pengiriman', 'Biaya Asuransi', 'Jumlah'].map(h => (
                  <th key={h} style={{
                    border: '0.3px solid #000', padding: '4px 4px',
                    fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => {
                const bgRow = i % 2 === 1 ? '#fafaf8' : '#fff';
                return (
                  <tr key={i} style={{ background: bgRow, verticalAlign: 'top' }}>
                    <td style={{ border: '0.3px solid #000', padding: '4px', textAlign: 'center' }}>{item.rowNo}</td>
                    <td style={{ border: '0.3px solid #000', padding: '4px', textAlign: 'center', whiteSpace: 'pre-line' }}>
                      {item.tglMuat}
                      {item.tglTiba && item.tglTiba !== '-' ? `\n—\n${item.tglTiba}` : ''}
                    </td>
                    <td style={{ border: '0.3px solid #000', padding: '4px' }}>
                      <div style={{ fontWeight: 'bold' }}>{item.noSO}</div>
                      <div>{item.armada}</div>
                      {item.noPol && item.noPol !== '-' && <div style={{ color: '#505050' }}>({item.noPol})</div>}
                    </td>
                    <td style={{ border: '0.3px solid #000', padding: '4px' }}>
                      <span style={{ fontWeight: 'bold' }}>Muatan : </span>{item.muatan || '-'}
                      {item.sn ? <><br /><span style={{ fontWeight: 'bold' }}>SN : </span>{item.sn}</> : null}
                      <br /><span style={{ fontWeight: 'bold' }}>Lokasi Muat : </span>{item.lokasiMuat || '-'}
                      <br /><span style={{ fontWeight: 'bold' }}>Lokasi Tujuan : </span>{item.lokasiTujuan || '-'}
                    </td>
                    <td style={{ border: '0.3px solid #000', padding: '4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {fRp(item.hargaPengiriman)}
                    </td>
                    <td style={{ border: '0.3px solid #000', padding: '4px', textAlign: 'center', whiteSpace: 'pre-line' }}>
                      {item.hargaAsuransi ? fRp(item.hargaAsuransi) : 'Tidak termasuk\nasuransi'}
                    </td>
                    <td style={{ border: '0.3px solid #000', padding: '4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {fRp(item.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* ── FOOT: Catatan + Totals ── */}
            <tfoot>
              <tr style={{ verticalAlign: 'top', background: '#fff' }}>
                <td colSpan={5} rowSpan={3} style={{ border: '0.3px solid #000', padding: '4px', fontSize: '8.5pt' }}>
                  {catatan ? <><strong>Catatan : </strong>{catatan}</> : <strong>Catatan :</strong>}
                </td>
                <td style={{ border: '0.3px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Sub Total</td>
                <td style={{ border: '0.3px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{fRp(data.subTotal)}</td>
              </tr>
              <tr style={{ background: '#fff' }}>
                <td style={{ border: '0.3px solid #000', padding: '4px', textAlign: 'right', whiteSpace: 'nowrap' }}>PPN (1,1%)</td>
                <td style={{ border: '0.3px solid #000', padding: '4px', textAlign: 'right', whiteSpace: 'nowrap' }}>{fRp(data.ppn)}</td>
              </tr>
              <tr style={{ background: '#fff' }}>
                <td style={{ border: '0.3px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Total</td>
                <td style={{ border: '0.3px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{fRp(data.total)}</td>
              </tr>
              <tr style={{ background: '#fff' }}>
                <td colSpan={7} style={{ border: '0.3px solid #000', padding: '4px', fontWeight: 'bold', fontSize: '8.5pt' }}>
                  Terbilang: {terbilang(data.total)} Rupiah
                </td>
              </tr>
            </tfoot>
          </table>

          {/* ── FOOTER: TTD + Pembayaran ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '24px' }}>
            {/* Pembayaran kiri */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: '3px', height: '40px', background: GOLD, borderRadius: '1px', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '9.5pt' }}>Pembayaran:</div>
                <div style={{ fontSize: '8.5pt', marginTop: '4px', color: '#303030' }}>
                  Mandiri  1330026272567  —  a/n PT Sugiarto Jaya Mandiri
                </div>
              </div>
            </div>
            {/* TTD kanan */}
            <div style={{ textAlign: 'center', minWidth: '140px' }}>
              <div style={{ fontSize: '8.5pt', marginBottom: '32px' }}>Hormat Kami,</div>
              <div style={{ borderTop: '0.5px solid #000', paddingTop: '4px', fontSize: '8.5pt' }}>
                (Muhammad Naufal Sugiarto)
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};

export default InvoicePreviewModal;
