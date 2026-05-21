import React, { useState } from 'react';
import { generateInvoicePDF } from '../utils/generateInvoicePDF';
import type { InvoiceData } from '../utils/generateInvoicePDF';
import { showToast } from './SJMComponents';

interface InvoicePreviewModalProps {
  data: InvoiceData;
  invoiceNumber: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
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
      setTimeout(onClose, 2000);
    } catch (err: any) {
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
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        backgroundColor: '#1f2937', borderRadius: '12px',
        padding: '32px', maxWidth: '440px', width: '90%', textAlign: 'center',
      }}>
        <div style={{ color: '#fff', fontSize: '15px', fontWeight: 'bold', marginBottom: '6px' }}>
          Generate Invoice PDF
        </div>
        <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '20px' }}>
          {invoiceNumber}
        </div>
        <div style={{ color: '#d1d5db', fontSize: '12px', marginBottom: '20px' }}>
          PDF akan di-generate dan diunduh langsung.<br />
          Invoice tersimpan otomatis setelah berhasil.
        </div>
        {error && <div style={{ color: '#f87171', fontSize: '11px', marginBottom: '12px' }}>{error}</div>}
        {success && <div style={{ color: '#4ade80', fontSize: '13px', marginBottom: '12px' }}>✅ Berhasil disimpan!</div>}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={onClose} disabled={downloading}
            style={{ padding: '9px 18px', background: 'transparent', border: '1px solid #4b5563', color: '#d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
            Batal
          </button>
          <button onClick={handleDownloadAndSave} disabled={downloading || success}
            style={{ padding: '9px 22px', background: downloading ? '#374151' : '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
            {downloading ? 'Generating...' : '⬇ Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreviewModal;
