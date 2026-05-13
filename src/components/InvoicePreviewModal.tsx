import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import InvoiceTemplate, { InvoiceTemplateProps } from './InvoiceTemplate';

interface InvoicePreviewModalProps {
  data: InvoiceTemplateProps;
  invoiceNumber: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

// FIX 7: Wait for all images inside an element to fully load
const waitForImages = (el: HTMLElement): Promise<void> => {
  const imgs = Array.from(el.querySelectorAll<HTMLImageElement>('img'));
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>(resolve => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // don't block PDF on broken image
      });
    })
  ).then(() => undefined);
};

const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  data,
  invoiceNumber,
  onClose,
  onConfirm,
}) => {
  const templateRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadAndSave = async () => {
    if (!templateRef.current) return;
    setError(null);
    setDownloading(true);

    try {
      // FIX 7: Wait for logo PNG conversion (set by InvoiceTemplate useEffect) to settle
      await waitForImages(templateRef.current);

      // Capture template as high-res canvas
      const canvas = await html2canvas(templateRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 794,
        height: templateRef.current.scrollHeight,
        imageTimeout: 15000,
        // FIX 7: Replace any still-broken images in the clone so html2canvas doesn't choke
        onclone: (_clonedDoc, clonedEl) => {
          const imgs = clonedEl.querySelectorAll<HTMLImageElement>('img');
          imgs.forEach(img => {
            if (!img.complete || img.naturalWidth === 0) {
              img.style.visibility = 'hidden';
            }
          });
        },
      });

      // Convert canvas → PDF (A4, points unit)
      const pdf = new jsPDF('portrait', 'pt', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const cW = canvas.width;
      const cH = canvas.height;
      const ratio = cW / pdfW;
      const totalPages = Math.ceil(cH / (pdfH * ratio));

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        const srcY = page * pdfH * ratio;
        const srcH = Math.min(pdfH * ratio, cH - srcY);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = cW;
        pageCanvas.height = srcH;
        pageCanvas.getContext('2d')!.drawImage(canvas, 0, srcY, cW, srcH, 0, 0, cW, srcH);

        pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, pdfW, srcH / ratio);
      }

      pdf.save(`Invoice_${invoiceNumber.replace(/\//g, '_')}.pdf`);

      // Save to database after PDF is downloaded
      await onConfirm();
    } catch (err: any) {
      console.error('PDF generation error:', err);
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

      {/* ── Preview area ── */}
      <div style={{
        backgroundColor: '#374151',
        width: '100%', maxWidth: '860px',
        padding: '24px',
        display: 'flex', justifyContent: 'center',
        minHeight: '600px',
      }}>
        <div style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <InvoiceTemplate ref={templateRef} {...data} />
        </div>
      </div>
    </div>
  );
};

export default InvoicePreviewModal;
