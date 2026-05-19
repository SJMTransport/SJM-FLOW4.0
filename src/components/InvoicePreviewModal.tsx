import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import InvoiceTemplate, { InvoiceTemplateProps } from './InvoiceTemplate';
import { showToast } from './SJMComponents';

interface InvoicePreviewModalProps {
  data: InvoiceTemplateProps;
  invoiceNumber: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  data,
  invoiceNumber,
  onClose,
  onConfirm,
}) => {
  const templateRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleDownloadAndSave = async () => {
    if (!templateRef.current) return;
    setError(null);
    setDownloading(true);

    try {
      console.log('📸 Starting html2canvas capture...');

      const captureEl = templateRef.current;
      const captureHeight = captureEl.scrollHeight;
      const canvasPromise = html2canvas(captureEl, {
        scale: 2,
        useCORS: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 794,
        height: captureHeight,
      });

      // Safety net: if html2canvas hangs for more than 20s, reject with a clear message
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('html2canvas timeout — coba refresh halaman dan coba lagi')), 20000)
      );

      const canvas = await Promise.race([canvasPromise, timeoutPromise]);

      console.log('✅ Canvas captured, size:', canvas.width, 'x', canvas.height);

      // Convert canvas → PDF (A4 in points)
      const pdf = new jsPDF('portrait', 'pt', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();   // 595.28 pt
      const pdfH = pdf.internal.pageSize.getHeight();  // 841.89 pt
      const cW = canvas.width;   // sudah di-scale 2x
      const cH = canvas.height;

      // Hitung tinggi konten dalam pt (bukan px)
      // canvas di-scale 2, jadi 1pt = 2px
      const contentHeightPt = (cH / cW) * pdfW;

      // Kalau konten muat dalam 1 halaman, tidak perlu pagination
      if (contentHeightPt <= pdfH * 1.05) {
        // Single page — fit seluruh konten
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pdfW, contentHeightPt);
      } else {
        // Multi page — potong per halaman
        const pageHeightPx = Math.floor((pdfH / pdfW) * cW);
        const totalPages = Math.ceil(cH / pageHeightPx);
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) pdf.addPage();
          const srcY = page * pageHeightPx;
          const srcH = Math.min(pageHeightPx, cH - srcY);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = cW;
          pageCanvas.height = srcH;
          pageCanvas.getContext('2d')!.drawImage(canvas, 0, srcY, cW, srcH, 0, 0, cW, srcH);
          const imgH = (srcH / cW) * pdfW;
          pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pdfW, imgH);
        }
      }

      const filename = `Invoice_${invoiceNumber.replace(/\//g, '_')}.pdf`;
      console.log('⬇️ Saving PDF:', filename);
      pdf.save(filename);
      console.log('✅ PDF saved successfully');

      // Save to database after PDF is downloaded
      await onConfirm();
      showToast(`Invoice ${invoiceNumber} berhasil diunduh dan disimpan!`, 'success');
      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch (err: any) {
      console.error('❌ PDF generation error:', err);
      setError(err.message || 'Gagal generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
      zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      overflowY: 'auto',
    }}>

      {/* ── Sticky action bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10000,
        backgroundColor: '#111827',
        width: '100%', maxWidth: '860px',
        padding: '12px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>
            Preview Invoice
          </span>
          <span style={{ color: '#9ca3af', fontSize: '11px', marginLeft: '12px' }}>
            {invoiceNumber}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {error && (
            <span style={{ color: '#f87171', fontSize: '11px', maxWidth: '240px' }}>
              {error}
            </span>
          )}

          <button
            onClick={onClose}
            disabled={downloading}
            style={{
              padding: '7px 14px',
              backgroundColor: 'transparent',
              border: '1px solid #4b5563',
              color: '#d1d5db',
              borderRadius: '6px',
              cursor: downloading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
            }}
          >
            Batal
          </button>

          <button
            onClick={handleDownloadAndSave}
            disabled={downloading}
            style={{
              padding: '7px 18px',
              backgroundColor: downloading ? '#374151' : '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: downloading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              display: 'flex', alignItems: 'center', gap: '7px',
            }}
          >
            {downloading ? '⏳ Generating...' : '⬇ Download & Simpan Invoice'}
          </button>
        </div>
      </div>

      {/* ── Success overlay ── */}
      {success && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 10001,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '16px',
        }}>
          <div style={{ fontSize: '56px', lineHeight: 1 }}>✅</div>
          <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '18px' }}>Invoice Berhasil Disimpan!</div>
          <div style={{ color: '#9ca3af', fontSize: '13px' }}>{invoiceNumber}</div>
        </div>
      )}

      {/* ── Preview area ── */}
      <div style={{
        backgroundColor: '#374151',
        width: '100%', maxWidth: '860px',
        padding: '24px',
        display: 'flex', justifyContent: 'center',
        minHeight: '600px',
        overflowX: 'auto',
      }}>
        <div style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)', flexShrink: 0 }}>
          <InvoiceTemplate ref={templateRef} {...data} />
        </div>
      </div>
    </div>
  );
};

export default InvoicePreviewModal;
