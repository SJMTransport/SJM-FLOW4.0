import jsPDF from 'jspdf';

const fRp = (n: number) => 'Rp.' + Math.round(n).toLocaleString('id-ID') + ',00';

function terbilang(n: number): string {
  const s = ['','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan',
             'Sembilan','Sepuluh','Sebelas'];
  if (n < 12) return s[Math.round(n)];
  if (n < 20) return (terbilang(n - 10) + ' Belas').trim();
  if (n < 100) return (terbilang(Math.floor(n / 10)) + ' Puluh ' + terbilang(n % 10)).trim();
  if (n < 200) return ('Seratus ' + terbilang(n - 100)).trim();
  if (n < 1000) return (terbilang(Math.floor(n / 100)) + ' Ratus ' + terbilang(n % 100)).trim();
  if (n < 2000) return ('Seribu ' + terbilang(n - 1000)).trim();
  if (n < 1e6) return (terbilang(Math.floor(n / 1000)) + ' Ribu ' + terbilang(n % 1000)).trim();
  if (n < 1e9) return (terbilang(Math.floor(n / 1e6)) + ' Juta ' + terbilang(n % 1e6)).trim();
  return '';
}

const AMBER = [249, 172, 61]  as [number, number, number];
const BLACK = [0, 0, 0]       as [number, number, number];
const WHITE = [255, 255, 255] as [number, number, number];
const DGRAY = [80, 80, 80]    as [number, number, number];

export interface QuotationData {
  noQuotation: string;
  tglQuotation: string;
  customer: string;
  pic: string;
  noTlp: string;
  jenisKendaraan: string;
  muatan: string;
  lokasiMuat: string;
  lokasiTujuan: string;
  harga: number;
  keterangan?: string;
  termOfPayment?: string;
  includePph: boolean;
  includeAsuransi: boolean;
}

async function loadLogoDataUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const MAX = 200;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject;
    img.src = '/logo-sjm.png';
  });
}

export async function generateQuotationPDF(data: QuotationData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const mL = 20;
  const mR = 20;
  let y = 16;

  // ── LOGO ──
  try {
    const logoDataUrl = await loadLogoDataUrl();
    doc.addImage(logoDataUrl, 'JPEG', mL, y, 26, 26);
  } catch {
    doc.setFillColor(...AMBER);
    doc.roundedRect(mL, y, 26, 26, 2, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SJM', mL + 13, y + 17, { align: 'center' });
  }

  // ── COMPANY INFO ──
  doc.setTextColor(...AMBER);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SUGIARTO JAYA MANDIRI TRANSPORT', mL + 30, y + 8);
  doc.setTextColor(...DGRAY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Jl Raya Kemang Parung No.168A Kab.Bogor', mL + 30, y + 14);
  doc.text('Phone  : 0811751027', mL + 30, y + 19);
  doc.text('Email   : sugiartojayamandiri@gmail.com', mL + 30, y + 24);

  // ── QUOTATION BADGE ──
  doc.setFillColor(...AMBER);
  doc.rect(pageW - mR - 36, y, 36, 13, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION', pageW - mR - 18, y + 9, { align: 'center' });

  y += 30;

  // ── GARIS ──
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(1.2);
  doc.line(mL, y, pageW - mR, y);
  y += 2;
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(1.5);
  doc.line(pageW - mR - 60, y, pageW - mR, y);
  y += 8;

  // ── QUOTATION INFO ──
  doc.setTextColor(...BLACK);
  doc.setFontSize(10);
  const info: [string, string, boolean][] = [
    ['No Quotation', data.noQuotation,  true],
    ['Tgl Quotation', data.tglQuotation, false],
    ['Penyewa',       data.customer,     false],
    ['PIC',           data.pic || '-',   false],
    ['No Tlp',        data.noTlp || '-', false],
  ];
  info.forEach(([label, val, bold]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, mL, y);
    doc.text(':', mL + 30, y);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(val, mL + 34, y);
    y += 6;
  });
  y += 4;

  // ── TABEL ──
  const contentW = pageW - mL - mR;
  const col1W = contentW * 0.55;
  const col2W = contentW * 0.225;
  const col3W = contentW * 0.225;

  // Header
  doc.setFillColor(...AMBER);
  doc.rect(mL, y, contentW, 10, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DESKRIPSI', mL + col1W / 2, y + 7, { align: 'center' });
  doc.text('Harga / Unit', mL + col1W + col2W / 2, y + 7, { align: 'center' });
  doc.text('Total', mL + col1W + col2W + col3W / 2, y + 7, { align: 'center' });
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.rect(mL, y, contentW, 10, 'S');
  doc.line(mL + col1W, y, mL + col1W, y + 10);
  doc.line(mL + col1W + col2W, y, mL + col1W + col2W, y + 10);
  y += 10;

  // Body deskripsi
  const deskLines: string[] = [
    'Mobilisasi :',
    `Jenis Kendaraan : ${data.jenisKendaraan || '-'}`,
    '',
    'Muatan :',
    data.muatan || '-',
    '',
    'Lokasi Penjemputan :',
    data.lokasiMuat || '-',
    '',
    'Tujuan :',
    data.lokasiTujuan || '-',
  ];

  const rowH = deskLines.length * 5 + 8;
  doc.setFillColor(...WHITE);
  doc.rect(mL, y, contentW, rowH, 'F');
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.rect(mL, y, contentW, rowH, 'S');
  doc.line(mL + col1W, y, mL + col1W, y + rowH);
  doc.line(mL + col1W + col2W, y, mL + col1W + col2W, y + rowH);

  doc.setTextColor(...BLACK);
  doc.setFontSize(9);
  let ty = y + 6;
  deskLines.forEach((line, i) => {
    if (line) {
      const isBold = i === 0 || i === 3 || i === 6 || i === 9;
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.text(line, mL + 3, ty);
    }
    ty += 5;
  });

  // Harga & Total di tengah vertikal
  const midY = y + rowH / 2 + 1.5;
  doc.setFont('helvetica', 'normal');
  doc.text(fRp(data.harga), mL + col1W + col2W / 2, midY, { align: 'center' });
  doc.text(fRp(data.harga), mL + col1W + col2W + col3W / 2, midY, { align: 'center' });

  y += rowH;

  // ── SUMMARY ROWS ──
  const drawSummaryRow = (label: string, value: string, bold = false, fillColor?: [number, number, number]) => {
    const rh = 8;
    if (fillColor) {
      doc.setFillColor(...fillColor);
      doc.rect(mL, y, contentW, rh, 'F');
    }
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.4);
    doc.rect(mL, y, contentW, rh, 'S');
    doc.line(mL + col1W, y, mL + col1W, y + rh);
    doc.line(mL + col1W + col2W, y, mL + col1W + col2W, y + rh);
    doc.setTextColor(...BLACK);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.text(label, mL + col1W - 3, y + 5.5, { align: 'right' });
    doc.text(value, mL + col1W + col2W + col3W / 2, y + 5.5, { align: 'center' });
    y += rh;
  };

  const ppn = Math.round(data.harga * 0.011);
  const grandTotal = data.harga + ppn;

  drawSummaryRow('Sub Total', fRp(data.harga));
  drawSummaryRow('PPN (1,1%)', fRp(ppn));
  drawSummaryRow('Total', fRp(grandTotal), true, [245, 245, 245]);

  // ── ASURANSI NOTE ──
  if (data.includeAsuransi) {
    y += 2;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...DGRAY);
    doc.text('* Harga belum termasuk biaya asuransi pengiriman.', mL, y + 4);
    y += 8;
  }

  // ── PPH NOTE ──
  if (data.includePph) {
    y += 2;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...DGRAY);
    doc.text('* Harga belum termasuk PPh pasal 23 (2%).', mL, y + 4);
    y += 8;
  }

  // ── TERBILANG ──
  y += 4;
  doc.setFillColor(250, 250, 240);
  doc.rect(mL, y, contentW, 9, 'F');
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.rect(mL, y, contentW, 9, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text('Terbilang: ' + terbilang(grandTotal) + ' Rupiah', mL + 3, y + 6);
  y += 12;

  // ── TERM OF PAYMENT ──
  if (data.termOfPayment) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text('Term of Payment :', mL, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.termOfPayment, mL + 36, y);
    y += 8;
  }

  // ── KETERANGAN ──
  if (data.keterangan) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text('Keterangan :', mL, y);
    doc.setFont('helvetica', 'normal');
    const wrapped = doc.splitTextToSize(data.keterangan, contentW - 36);
    doc.text(wrapped, mL + 36, y);
    y += wrapped.length * 5 + 3;
  }

  // ── TTD ──
  y += 10;
  const ttdCX = pageW - mR - 30;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BLACK);
  doc.text('Hormat Kami,', ttdCX, y, { align: 'center' });
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.line(ttdCX - 30, y + 28, ttdCX + 30, y + 28);
  doc.text('(Muhammad Naufal Sugiarto)', ttdCX, y + 33, { align: 'center' });

  // ── PEMBAYARAN ──
  const payY = y + 44;
  doc.setFillColor(...AMBER);
  doc.rect(mL, payY - 3, 2, 12, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text('Pembayaran:', mL + 5, payY + 2);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Mandiri  1330026272567  —  a/n PT Sugiarto Jaya Mandiri', mL + 5, payY + 8);

  return doc;
}
