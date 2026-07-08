import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { generateQuotationPDF } from '../utils/generateQuotationPDF';
import type { QuotationData } from '../utils/generateQuotationPDF';
import { showToast } from './SJMComponents';

interface QuotationPreviewModalProps {
  data: QuotationData;
  quotationNumber: string;
  onClose: () => void;
  onConfirm?: () => Promise<void>;
}

const GOLD = '#f9ac3d';

const fRp = (n: number) =>
  'Rp' + Math.round(n || 0).toLocaleString('id-ID') + '.00';

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

const QuotationPreviewModal: React.FC<QuotationPreviewModalProps> = ({
  data, quotationNumber, onClose, onConfirm,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleDownloadAndSave = async () => {
    setError(null);
    setDownloading(true);
    try {
      const doc = await generateQuotationPDF(data);
      const filename = `Quotation_${quotationNumber.replace(/\//g, '_')}.pdf`;
      doc.save(filename);
      if (onConfirm) {
        await onConfirm();
        setSuccess(true);
        setTimeout(onClose, 1500);
      } else {
        showToast(`Quotation ${quotationNumber} berhasil diunduh!`, 'success');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Gagal generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const hasAsuransi = (data.nilaiAsuransi || 0) > 0;
  const grandTotal = data.harga + (data.nilaiAsuransi || 0);

  const notes: string[] = [];
  if (data.termOfPayment) notes.push(data.termOfPayment);
  notes.push(data.includePpn ? 'Sudah Termasuk PPN' : 'Belum Termasuk PPN');
  notes.push(data.includePph ? 'Sudah Termasuk PPh' : 'Belum Termasuk PPh');
  notes.push(hasAsuransi ? 'Sudah Termasuk Asuransi' : 'Belum Termasuk Asuransi');
  if (data.keterangan) notes.push(data.keterangan);

  const modalJSX = (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.72)',
      zIndex: 9999,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '40px 16px', overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: '860px' }}>

        {/* ── Action bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '12px',
        }}>
          <div style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>
            Preview Quotation — {quotationNumber}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {error && <span style={{ color: '#f87171', fontSize: '11px' }}>{error}</span>}
            {success && <span style={{ color: '#4ade80', fontSize: '12px' }}>✅ Tersimpan!</span>}
            <button onClick={onClose} disabled={downloading}
              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #6b7280', color: '#d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
              {onConfirm ? 'Batal' : 'Tutup'}
            </button>
            <button onClick={handleDownloadAndSave} disabled={downloading || success}
              style={{ padding: '8px 20px', background: downloading ? '#374151' : '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', opacity: success ? 0.6 : 1 }}>
              {downloading ? 'Generating...' : onConfirm ? '⬇ Download & Simpan' : '⬇ Download PDF'}
            </button>
          </div>
        </div>

        {/* ── Paper quotation ── */}
        <div style={{
          backgroundColor: '#fff', borderRadius: '4px',
          padding: '40px 32px', fontFamily: 'helvetica, Arial, sans-serif',
          fontSize: '9.5pt', color: '#000', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}>

          {/* ── HEADER ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '4px',
                background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 'bold', fontSize: '14pt', flexShrink: 0,
              }}>SJM</div>
              <div>
                <div style={{ color: GOLD, fontWeight: 'bold', fontSize: '13.5pt', lineHeight: 1.2 }}>
                  SUGIARTO JAYA MANDIRI TRANSPORT
                </div>
                <div style={{ color: '#000', fontSize: '8pt', marginTop: '4px', lineHeight: 1.7 }}>
                  Jl Raya Kemang Parung No.168A Kab.Bogor<br />
                  Phone  : 0811751027<br />
                  Email   : sugiartojayamandiri@gmail.com
                </div>
              </div>
            </div>
          </div>

          {/* ── GARIS ── */}
          <div style={{ borderTop: '1.5px solid #000', marginBottom: '2px' }} />
          <div style={{ borderTop: '2.5px solid ' + GOLD, width: '160px', marginLeft: 'auto', marginBottom: '16px' }} />

          {/* ── INFO BLOCK ── */}
          <table style={{ borderCollapse: 'collapse', marginBottom: '18px', fontSize: '9.5pt' }}>
            <tbody>
              {[
                ['No Quotation',  data.noQuotation, true],
                ['Tgl Quotation', data.tglQuotation,   false],
                ['Penyewa',     data.customer,      false],
                ['PIC',         data.pic || '-',    false],
                ['No Hp',      data.noTlp || '-',  false],
              ].map(([label, val, bold]) => (
                <tr key={label as string}>
                  <td style={{ paddingRight: '12px', paddingBottom: '4px', color: '#000', width: '110px', whiteSpace: 'nowrap' }}>{label}</td>
                  <td style={{ paddingRight: '12px', paddingBottom: '4px', color: '#000' }}>:</td>
                  <td style={{ paddingBottom: '4px', fontWeight: bold ? 'bold' : 'normal', color: '#000' }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── TABLE ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '18px' }}>
            <thead>
              <tr style={{ background: GOLD, color: '#000', border: '1px solid #000' }}>
                <th style={{ padding: '8px 8px', borderRight: '1px solid #000', fontWeight: 'bold', textAlign: 'center', width: '50%' }}>DESKRIPSI</th>
                <th style={{ padding: '8px 8px', borderRight: '1px solid #000', fontWeight: 'bold', textAlign: 'center', width: '18%' }}>Harga/ Unit</th>
                <th style={{ padding: '8px 8px', borderRight: '1px solid #000', fontWeight: 'bold', textAlign: 'center', width: '16%' }}>Asuransi</th>
                <th style={{ padding: '8px 8px', fontWeight: 'bold', textAlign: 'center', width: '16%' }}>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ border: '1px solid #000' }}>
                <td style={{ padding: '12px 10px', borderRight: '1px solid #000', verticalAlign: 'top', lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 'bold' }}>Mobilisasi :</div>
                  <div style={{ marginLeft: '4px', marginBottom: '6px', color: '#000' }}>Jenis Kendaraan : {data.jenisKendaraan || '-'}</div>
                  
                  <div style={{ fontWeight: 'bold' }}>Muatan :</div>
                  <div style={{ marginLeft: '4px', marginBottom: '6px', color: '#000' }}>{data.muatan || '-'}</div>
                  
                  <div style={{ fontWeight: 'bold' }}>Lokasi Penjemputan :</div>
                  <div style={{ marginLeft: '4px', marginBottom: '6px', color: '#000' }}>{data.lokasiMuat || '-'}</div>
                  
                  <div style={{ fontWeight: 'bold' }}>Tujuan :</div>
                  <div style={{ marginLeft: '4px', color: '#000' }}>{data.lokasiTujuan || '-'}</div>
                </td>
                <td style={{ padding: '12px 8px', borderRight: '1px solid #000', verticalAlign: 'top', textAlign: 'center', color: '#000' }}>
                  {fRp(data.harga)}
                </td>
                <td style={{ padding: '12px 8px', borderRight: '1px solid #000', verticalAlign: 'top', textAlign: 'center', color: '#000', whiteSpace: 'pre-line' }}>
                  {hasAsuransi ? fRp(data.nilaiAsuransi) : 'Belum Termasuk\nAsuransi'}
                </td>
                <td style={{ padding: '12px 8px', verticalAlign: 'top', textAlign: 'center', fontWeight: 'bold', color: '#000' }}>
                  {fRp(grandTotal)}
                </td>
              </tr>
              
              {/* Summary Breakdown Rows */}
              {hasAsuransi ? (
                <>
                  <tr style={{ border: '1px solid #000' }}>
                    <td colSpan={3} style={{ padding: '6px 12px', borderRight: '1px solid #000', textAlign: 'right', color: '#000' }}>
                      Harga Unit
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', color: '#000' }}>
                      {fRp(data.harga)}
                    </td>
                  </tr>
                  <tr style={{ border: '1px solid #000' }}>
                    <td colSpan={3} style={{ padding: '6px 12px', borderRight: '1px solid #000', textAlign: 'right', color: '#000' }}>
                      Asuransi
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', color: '#000' }}>
                      {fRp(data.nilaiAsuransi)}
                    </td>
                  </tr>
                  <tr style={{ border: '1px solid #000' }}>
                    <td colSpan={3} style={{ padding: '8px 12px', borderRight: '1px solid #000', textAlign: 'right', fontWeight: 'bold', color: '#000' }}>
                      Total
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 'bold', color: '#000' }}>
                      {fRp(grandTotal)}
                    </td>
                  </tr>
                </>
              ) : (
                <tr style={{ border: '1px solid #000' }}>
                  <td colSpan={3} style={{ padding: '8px 12px', borderRight: '1px solid #000', textAlign: 'right', fontWeight: 'bold', color: '#000' }}>
                    Total
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 'bold', color: '#000' }}>
                    {fRp(data.harga)}
                  </td>
                </tr>
              )}

              {/* Terbilang row */}
              <tr style={{ border: '1px solid #000' }}>
                <td colSpan={4} style={{ padding: '8px 10px', color: '#000' }}>
                  <strong>Terbilang :</strong> {terbilang(grandTotal)} Rupiah
                </td>
              </tr>

              {/* Notes / Term of Payment row */}
              <tr style={{ border: '1px solid #000' }}>
                <td colSpan={4} style={{ padding: '10px 12px', lineHeight: 1.7, color: '#000' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Term of Payment :</div>
                  {notes.map((note, idx) => (
                    <div key={idx} style={{ marginLeft: '4px' }}>{note}</div>
                  ))}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── SIGNATURES ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingRight: '10px' }}>
            <div style={{ textAlign: 'center', width: '240px' }}>
              <div style={{ marginBottom: '55px', fontSize: '9.5pt' }}>Hormat Kami,</div>
              <div style={{ borderTop: '0.8px solid #000', width: '100%', margin: '0 auto 4px auto' }} />
              <div style={{ fontWeight: 'bold', fontSize: '9.5pt' }}>(Muhammad Naufal Sugiarto)</div>
            </div>
          </div>

          {/* ── PAYMENT INFO ── */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '28px', alignItems: 'flex-start' }}>
            <div style={{ width: '4px', height: '36px', background: GOLD, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '9.5pt' }}>Pembayaran:</div>
              <div style={{ fontSize: '9pt', color: '#000', marginTop: '2px' }}>
                Mandiri 1330026272567 — a/n PT Sugiarto Jaya Mandiri
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
};

export default QuotationPreviewModal;
