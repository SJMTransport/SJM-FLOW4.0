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
const DGRAY  = [51, 51, 51]    as [number, number, number];

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 215.9;
  const mL = 20, mR = 20;
  let y = 20;

  // LOGO BOX
  doc.setFillColor(...AMBER);
  doc.roundedRect(mL, y, 22, 22, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('PT. SUGIARTO', mL + 11, y + 6, { align: 'center' });
  doc.text('JAYA MANDIRI', mL + 11, y + 9, { align: 'center' });
  doc.setFontSize(11);
  doc.text('SJM', mL + 11, y + 17, { align: 'center' });

  // COMPANY INFO
  doc.setTextColor(...AMBER);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SUGIARTO JAYA MANDIRI TRANSPORT', mL + 26, y + 6);
  doc.setTextColor(...DGRAY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Jl Raya Kemang Parung No.168A Kab.Bogor', mL + 26, y + 11);
  doc.text('Phone  : 0811751027', mL + 26, y + 15);
  doc.text('Email   : sugiartojayamandiri@gmail.com', mL + 26, y + 19);

  // INVOICE BADGE
  doc.setFillColor(...AMBER);
  doc.rect(pageW - mR - 28, y, 28, 10, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageW - mR - 14, y + 7, { align: 'center' });

  y += 24;

  // DOUBLE LINES
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(1.0);
  doc.line(mL, y, pageW - mR, y);
  y += 1.5;
  doc.setDrawColor(...YELLOW);
  doc.setLineWidth(0.5);
  doc.line(pageW - mR - 50, y, pageW - mR, y);
  y += 7;

  // INVOICE INFO
  doc.setTextColor(...BLACK);
  doc.setFontSize(9);
  const info: [string, string, boolean][] = [
    ['No Invoice',  data.invoiceNumber, true],
    ['Tgl Invoice', data.invoiceDate,   false],
    ['Penyewa',     data.customer,      false],
    ['Telepon',     data.picCust || '-', false],
  ];
  info.forEach(([label, val, bold]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(String(label), mL, y);
    doc.text(':', mL + 22, y);
    doc.text(String(val), mL + 25, y);
    y += 5;
  });
  y += 3;

  // TABLE BODY
  const body = data.items.map(item => {
    const tgl = item.tglMuat + (item.tglTiba && item.tglTiba !== '-' ? '\n—\n' + item.tglTiba : '');
    const armada = item.armada + (item.noPol && item.noPol !== '-' ? '\n(' + item.noPol + ')' : '');
    const desk = [
      'Muatan :\n' + (item.muatan || '-'),
      item.sn ? 'SN :\n' + item.sn : '',
      'Lokasi Muat :\n' + (item.lokasiMuat || '-'),
      'Lokasi Tujuan :\n' + (item.lokasiTujuan || '-'),
    ].filter(Boolean).join('\n');
    return [
      String(item.rowNo), tgl, item.noSO, armada, desk,
      fRp(item.hargaPengiriman),
      item.hargaAsuransi ? fRp(item.hargaAsuransi) : 'Tidak termasuk\nasuransi',
      fRp(item.total),
    ];
  });

  const foot: any[] = [
    ['', '', '', '', '', '', 'Sub Total', fRp(data.subTotal)],
    ['', '', '', '', '', '', 'PPN (1,1%)', fRp(data.ppn)],
    ['', '', '', '', '', '', 'Total', fRp(data.total)],
    [{ content: 'Terbilang: ' + terbilang(data.total) + ' Rupiah', colSpan: 8, styles: { fontStyle: 'bold', fontSize: 8 } }],
  ];

  autoTable(doc, {
    startY: y,
    head: [[
      { content: 'No.',              styles: { halign: 'center' } },
      { content: 'Tanggal',          styles: { halign: 'center' } },
      { content: 'No SO',            styles: { halign: 'center' } },
      { content: 'Armada',           styles: { halign: 'center' } },
      { content: 'Deskripsi',        styles: { halign: 'center' } },
      { content: 'Biaya Pengiriman', styles: { halign: 'center' } },
      { content: 'Biaya Asuransi',   styles: { halign: 'center' } },
      { content: 'Jumlah',           styles: { halign: 'center' } },
    ]],
    body,
    foot,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, lineColor: BLACK, lineWidth: 0.3, textColor: BLACK, valign: 'top' },
    headStyles: { fillColor: YELLOW, textColor: BLACK, fontStyle: 'bold', fontSize: 8, halign: 'center' },
    footStyles: { fillColor: WHITE, textColor: BLACK, fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 8,      halign: 'center' },
      1: { cellWidth: 22,     halign: 'center' },
      2: { cellWidth: 28 },
      3: { cellWidth: 22 },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 28,     halign: 'right' },
      6: { cellWidth: 25,     halign: 'center' },
      7: { cellWidth: 28,     halign: 'right' },
    },
    margin: { left: mL, right: mR, bottom: 45 },
    showFoot: 'lastPage',
    didDrawPage: () => {
      const pageH = doc.internal.pageSize.getHeight();
      const footerY = pageH - 35;

      // Garis pemisah footer
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(mL, footerY, pageW - mR, footerY);

      // TTD kanan
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BLACK);
      doc.text('Hormat Kami,', pageW - mR - 22, footerY + 5, { align: 'center' });
      doc.setDrawColor(...BLACK);
      doc.setLineWidth(0.3);
      doc.line(pageW - mR - 45, footerY + 20, pageW - mR, footerY + 20);
      doc.text('(Muhammad Naufal Sugiarto)', pageW - mR - 22, footerY + 24, { align: 'center' });

      // Pembayaran kiri
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Pembayaran:', mL, footerY + 5);
      doc.setFont('helvetica', 'normal');
      doc.text('Mandiri  1330026272567  —  a/n PT Sugiarto Jaya Mandiri', mL, footerY + 10);
    },
  });

  return doc;
}

function terbilang(n: number): string {
  const s = ['','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan','Sembilan','Sepuluh','Sebelas'];
  if (n < 12)   return s[Math.round(n)];
  if (n < 20)   return (terbilang(n - 10) + ' Belas').trim();
  if (n < 100)  return (terbilang(Math.floor(n/10)) + ' Puluh ' + terbilang(n%10)).trim();
  if (n < 200)  return ('Seratus ' + terbilang(n-100)).trim();
  if (n < 1000) return (terbilang(Math.floor(n/100)) + ' Ratus ' + terbilang(n%100)).trim();
  if (n < 2000) return ('Seribu ' + terbilang(n-1000)).trim();
  if (n < 1e6)  return (terbilang(Math.floor(n/1000)) + ' Ribu ' + terbilang(n%1000)).trim();
  if (n < 1e9)  return (terbilang(Math.floor(n/1e6)) + ' Juta ' + terbilang(n%1e6)).trim();
  return '';
}
