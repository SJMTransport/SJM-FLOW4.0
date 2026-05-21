import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoiceItem {
  rowNo: number;
  tglMuat: string;
  tglTiba: string;
  noSO: string;
  armada: string;
  noPol: string;
  muatan: string;
  sn: string;
  lokasiMuat: string;
  lokasiTujuan: string;
  hargaPengiriman: number;
  nilaiPajak: number;
  hargaAsuransi: number | null;
  total: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  customer: string;
  picCust: string;
  items: InvoiceItem[];
  subTotal: number;
  ppn: number;
  total: number;
  catatan?: string;
}

const fRp = (n: number) =>
  'Rp.' + Math.round(n).toLocaleString('id-ID') + ',00';

const AMBER  = [255, 143, 0]   as [number, number, number];
const YELLOW = [255, 200, 64]  as [number, number, number];
const BLACK  = [0, 0, 0]       as [number, number, number];
const WHITE  = [255, 255, 255] as [number, number, number];
const DGRAY  = [80, 80, 80]    as [number, number, number];

async function loadImageAsDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const MAX = 200;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateInvoicePDF(data: InvoiceData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const mL = 10;
  const mR = 10;
  let y = 14;

  // ── LOGO ──
  try {
    const logoDataUrl = await loadImageAsDataUrl('/logo-sjm.png');
    doc.addImage(logoDataUrl, 'JPEG', mL, y, 26, 26);
  } catch {
    // Fallback box jika logo tidak tersedia
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

  // ── INVOICE BADGE ──
  doc.setFillColor(...AMBER);
  doc.rect(pageW - mR - 32, y, 32, 13, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageW - mR - 16, y + 9, { align: 'center' });

  y += 30;

  // ── GARIS HEADER ──
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(1.2);
  doc.line(mL, y, pageW - mR, y);
  y += 2;
  doc.setDrawColor(...YELLOW);
  doc.setLineWidth(1.5);
  doc.line(pageW - mR - 60, y, pageW - mR, y);
  y += 8;

  // ── INVOICE INFO ──
  doc.setTextColor(...BLACK);
  doc.setFontSize(10);
  const info: [string, string, boolean][] = [
    ['No Invoice',  data.invoiceNumber,  true],
    ['Tgl Invoice', data.invoiceDate,    false],
    ['Penyewa',     data.customer,       false],
    ['Telepon',     data.picCust || '-', false],
  ];
  info.forEach(([label, val, bold]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, mL, y);
    doc.text(':', mL + 26, y);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(val, mL + 29, y);
    y += 6;
  });
  y += 4;

  // ── TABLE ──
  // 7 kolom: No | Tanggal | No SO & Armada | Deskripsi | Biaya Pengiriman | Biaya Asuransi | Jumlah
  // Total content width = 210 - 10 - 10 = 190mm
  // No(8) + Tgl(20) + SO(30) + Desk(auto) + HP(28) + Asm(24) + Jml(28) = 138 fixed, Desk = 52

  const body = data.items.map(item => {
    const tgl = item.tglMuat +
      (item.tglTiba && item.tglTiba !== '-' ? '\n—\n' + item.tglTiba : '');

    const soArmada = item.noSO + '\n' +
      item.armada +
      (item.noPol && item.noPol !== '-' ? '\n(' + item.noPol + ')' : '');

    const desk = [
      'Muatan : ' + (item.muatan || '-'),
      item.sn ? 'SN : ' + item.sn : null,
      'Lokasi Muat : ' + (item.lokasiMuat || '-'),
      'Lokasi Tujuan : ' + (item.lokasiTujuan || '-'),
    ].filter(Boolean).join('\n');

    const asuransi = item.hargaAsuransi
      ? fRp(item.hargaAsuransi)
      : 'Tidak termasuk\nasuransi';

    return [
      String(item.rowNo),
      tgl,
      soArmada,
      desk,
      fRp(item.hargaPengiriman),
      asuransi,
      fRp(item.total),
    ];
  });

  const foot: any[] = [
    [
      {
        content: data.catatan ? 'Catatan : ' + data.catatan : 'Catatan :',
        colSpan: 5,
        rowSpan: 3,
        styles: { valign: 'top', fontSize: 9 },
      },
      { content: 'Sub Total', styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
      { content: fRp(data.subTotal), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
    ],
    [
      { content: 'PPN (1,1%)', styles: { halign: 'right', fontSize: 9 } },
      { content: fRp(data.ppn), styles: { halign: 'right', fontSize: 9 } },
    ],
    [
      { content: 'Total', styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
      { content: fRp(data.total), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
    ],
    [{
      content: 'Terbilang: ' + terbilang(data.total) + ' Rupiah',
      colSpan: 7,
      styles: { fontStyle: 'bold', fontSize: 9 },
    }],
  ];

  autoTable(doc, {
    startY: y,
    head: [[
      { content: 'No.',              styles: { halign: 'center' } },
      { content: 'Tanggal',          styles: { halign: 'center' } },
      { content: 'No SO & Armada',   styles: { halign: 'center' } },
      { content: 'Deskripsi',        styles: { halign: 'center' } },
      { content: 'Biaya Pengiriman', styles: { halign: 'center' } },
      { content: 'Biaya Asuransi',   styles: { halign: 'center' } },
      { content: 'Jumlah',           styles: { halign: 'center' } },
    ]],
    body,
    foot,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
      lineColor: BLACK,
      lineWidth: 0.3,
      textColor: BLACK,
      valign: 'top',
      overflow: 'linebreak',
      font: 'helvetica',
    },
    headStyles: {
      fillColor: YELLOW,
      textColor: BLACK,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
    },
    footStyles: {
      fillColor: WHITE,
      textColor: BLACK,
    },
    columnStyles: {
      0: { cellWidth: 8,  halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 30 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 24, halign: 'center' },
      6: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: mL, right: mR, top: 18, bottom: 55 },
    showFoot: 'lastPage',
    rowPageBreak: 'avoid',
    // TIDAK ADA didDrawCell — deskripsi dirender langsung oleh autoTable
  });

  // ── NOMOR HALAMAN ──
  const totalPages = doc.getNumberOfPages();
  if (totalPages > 1) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BLACK);
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.text(`Halaman ${i} / ${totalPages}`, pageW - mR, 292, { align: 'right' });
    }
  }

  // ── FOOTER: halaman terakhir saja ──
  doc.setPage(doc.getNumberOfPages());
  const finalY = (doc as any).lastAutoTable.finalY;

  // TTD kanan
  const ttdCX = pageW - mR - 32;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BLACK);
  doc.text('Hormat Kami,', ttdCX, finalY + 8, { align: 'center' });
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.line(ttdCX - 32, finalY + 30, ttdCX + 32, finalY + 30);
  doc.text('(Muhammad Naufal Sugiarto)', ttdCX, finalY + 35, { align: 'center' });

  // Pembayaran kiri — di bawah TTD, tidak sejajar
  const payY = finalY + 44;
  doc.setFillColor(...YELLOW);
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
