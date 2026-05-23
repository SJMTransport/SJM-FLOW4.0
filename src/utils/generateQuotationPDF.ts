import jsPDF from 'jspdf';

const fRp = (n: number) => 'Rp.' + Math.round(n).toLocaleString('id-ID') + ',00';

function terbilang(n: number): string {
  const s = ['','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan',
             'Sembilan','Sepuluh','Sebelas'];
  if (n < 12) return s[Math.round(n)];
  if (n < 20) return (terbilang(n-10)+' Belas').trim();
  if (n < 100) return (terbilang(Math.floor(n/10))+' Puluh '+terbilang(n%10)).trim();
  if (n < 200) return ('Seratus '+terbilang(n-100)).trim();
  if (n < 1000) return (terbilang(Math.floor(n/100))+' Ratus '+terbilang(n%100)).trim();
  if (n < 2000) return ('Seribu '+terbilang(n-1000)).trim();
  if (n < 1e6) return (terbilang(Math.floor(n/1000))+' Ribu '+terbilang(n%1000)).trim();
  if (n < 1e9) return (terbilang(Math.floor(n/1e6))+' Juta '+terbilang(n%1e6)).trim();
  return '';
}

const AMBER  = [255, 143, 0]  as [number, number, number];
const YELLOW = [255, 200, 64] as [number, number, number];
const BLACK  = [0, 0, 0]      as [number, number, number];
const WHITE  = [255, 255, 255] as [number, number, number];
const DGRAY  = [80, 80, 80]   as [number, number, number];

async function loadImageAsDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = src;
  });
}

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

export async function generateQuotationPDF(data: QuotationData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const mL = 20;
  const mR = 20;
  let y = 16;

  // LOGO
  try {
    const logoDataUrl = await loadImageAsDataUrl('/logo-sjm.png');
    doc.addImage(logoDataUrl, 'JPEG', mL, y, 26, 26);
  } catch {
    doc.setFillColor(...AMBER);
    doc.roundedRect(mL, y, 26, 26, 2, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('PT. SUGIARTO', mL + 13, y + 8, { align: 'center' });
    doc.text('JAYA MANDIRI', mL + 13, y + 12, { align: 'center' });
    doc.setFontSize(13);
    doc.text('SJM', mL + 13, y + 21, { align: 'center' });
  }

  // COMPANY INFO
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

  y += 30;

  // GARIS
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(1.2);
  doc.line(mL, y, pageW - mR, y);
  y += 2;
  doc.setDrawColor(...YELLOW);
  doc.setLineWidth(1.5);
  doc.line(pageW - mR - 60, y, pageW - mR, y);
  y += 8;

  // QUOTATION INFO
  doc.setTextColor(...BLACK);
  doc.setFontSize(10);
  const info: [string, string][] = [
    ['No Quotation', data.noQuotation],
    ['Tgl Quotation', data.tglQuotation],
    ['Penyewa',       data.customer],
    ['PIC',           data.pic || '-'],
    ['No Tlp',        data.noTlp || '-'],
  ];
  info.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, mL, y);
    doc.text(':', mL + 30, y);
    doc.setFont('helvetica', label === 'No Quotation' ? 'bold' : 'normal');
    doc.text(val, mL + 34, y);
    y += 6;
  });
  y += 4;

  // TABEL
  const contentW = pageW - mL - mR;
  const col1W = contentW * 0.55;
  const col2W = contentW * 0.225;
  const col3W = contentW * 0.225;

  // Header tabel
  doc.setFillColor(...AMBER);
  doc.rect(mL, y, contentW, 10, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DESKRIPSI', mL + col1W/2, y + 7, { align: 'center' });
  doc.text('Harga / Unit', mL + col1W + col2W/2, y + 7, { align: 'center' });
  doc.text('Total', mL + col1W + col2W + col3W/2, y + 7, { align: 'center' });
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.rect(mL, y, contentW, 10, 'S');
  doc.line(mL + col1W, y, mL + col1W, y + 10);
  doc.line(mL + col1W + col2W, y, mL + col1W + col2W, y + 10);
  y += 10;

  // Body tabel
  const descParts = [
    { label: 'Mobilisasi :', value: `Jenis Kendaraan : ${data.jenisKendaraan || '-'}` },
    { label: 'Muatan :', value: data.muatan || '-' },
    { label: 'Lokasi Penjemputan :', value: data.lokasiMuat || '-' },
    { label: 'Lokasi Tujuan :', value: data.lokasiTujuan || '-' },
  ];

  const lineH = 4.5;
  const rowH = descParts.length * lineH * 2 + 8;

  doc.setFillColor(...WHITE);
  doc.rect(mL, y, contentW, rowH, 'F');
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.rect(mL, y, contentW, rowH, 'S');
  doc.line(mL + col1W, y, mL + col1W, y + rowH);
  doc.line(mL + col1W + col2W, y, mL + col1W + col2W, y + rowH);

  let ty = y + 5;
  descParts.forEach(({ label, value }) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    doc.text(label, mL + 3, ty);
    ty += lineH;
    doc.setFont('helvetica', 'normal');
    doc.text(value, mL + 3, ty);
    ty += lineH + 1;
  });

  const midY = y + rowH / 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(fRp(data.harga), mL + col1W + col2W/2, midY, { align: 'center' });
  doc.text(fRp(data.harga), mL + col1W + col2W + col3W/2, midY, { align: 'center' });
  y += rowH;

  // Footer tabel — Total
  doc.setFillColor(250, 250, 250);
  doc.rect(mL, y, contentW, 10, 'F');
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.rect(mL, y, contentW, 10, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Total', mL + col1W + col2W - 3, y + 7, { align: 'right' });
  doc.text(fRp(data.harga), mL + col1W + col2W + col3W/2, y + 7, { align: 'center' });
  y += 10;

  // Terbilang
  doc.setFillColor(250, 250, 250);
  doc.rect(mL, y, contentW, 10, 'F');
  doc.setDrawColor(...BLACK);
  doc.rect(mL, y, contentW, 10, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Terbilang : ${terbilang(data.harga)} Rupiah`, mL + 3, y + 7);
  y += 10;

  // Keterangan / Term of Payment
  const notes: string[] = [];
  if (data.termOfPayment) notes.push(`Term of Payment : ${data.termOfPayment}`);
  if (!data.includePph) notes.push('Belum Termasuk PPh');
  if (!data.includeAsuransi) notes.push('Belum Termasuk Asuransi');
  if (data.keterangan) notes.push(data.keterangan);

  if (notes.length > 0) {
    const notesH = notes.length * 6 + 8;
    doc.setFillColor(250, 250, 250);
    doc.rect(mL, y, contentW, notesH, 'F');
    doc.setDrawColor(...BLACK);
    doc.rect(mL, y, contentW, notesH, 'S');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    let ny = y + 6;
    notes.forEach(note => {
      doc.text(note, mL + 3, ny);
      ny += 6;
    });
    y += notesH;
  }

  y += 10;

  // TTD
  const ttdCX = pageW - mR - 35;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Hormat Kami,', ttdCX, y, { align: 'center' });
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.line(ttdCX - 35, y + 30, ttdCX + 35, y + 30);
  doc.text('(Muhammad Naufal Sugiarto)', ttdCX, y + 35, { align: 'center' });

  // Pembayaran
  const payY = y + 44;
  doc.setFillColor(...YELLOW);
  doc.rect(mL, payY - 3, 2, 12, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Pembayaran:', mL + 5, payY + 2);
  doc.setFont('helvetica', 'normal');
  doc.text('Mandiri  1330026272567  —  a/n PT Sugiarto Jaya Mandiri', mL + 5, payY + 8);

  return doc;
}
