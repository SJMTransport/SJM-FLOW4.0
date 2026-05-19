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
  const pageW = 210;
  const mL = 12;
  const mR = 12;
  let y = 14;

  // LOGO BOX
  doc.setFillColor(...AMBER);
  doc.roundedRect(mL, y, 26, 26, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('PT. SUGIARTO', mL + 13, y + 8, { align: 'center' });
  doc.text('JAYA MANDIRI', mL + 13, y + 12, { align: 'center' });
  doc.setFontSize(13);
  doc.text('SJM', mL + 13, y + 21, { align: 'center' });

  // COMPANY INFO
  doc.setTextColor(...AMBER);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SUGIARTO JAYA MANDIRI TRANSPORT', mL + 30, y + 7);
  doc.setTextColor(...DGRAY);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Jl Raya Kemang Parung No.168A Kab.Bogor', mL + 30, y + 13);
  doc.text('Phone  : 0811751027', mL + 30, y + 18);
  doc.text('Email   : sugiartojayamandiri@gmail.com', mL + 30, y + 23);

  // INVOICE BADGE
  doc.setFillColor(...AMBER);
  doc.rect(pageW - mR - 30, y, 30, 12, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageW - mR - 15, y + 8.5, { align: 'center' });

  y += 30;

  // DOUBLE LINES
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(1.2);
  doc.line(mL, y, pageW - mR, y);
  y += 2;
  doc.setDrawColor(...YELLOW);
  doc.setLineWidth(1.5);
  doc.line(pageW - mR - 55, y, pageW - mR, y);
  y += 8;

  // INVOICE INFO
  doc.setTextColor(...BLACK);
  doc.setFontSize(9.5);
  const info = [
    ['No Invoice',  data.invoiceNumber, true],
    ['Tgl Invoice', data.invoiceDate,   false],
    ['Penyewa',     data.customer,      false],
    ['Telepon',     data.picCust || '-', false],
  ];
  info.forEach(([label, val, bold]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(String(label), mL, y);
    doc.text(':', mL + 24, y);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(String(val), mL + 27, y);
    y += 5.5;
  });
  y += 4;

  // TABLE
  // deskripsiStructured dipakai di didDrawCell untuk render bold label + normal value
  const deskripsiStructured = data.items.map(item => {
    const parts: Array<{ label: string; value: string }> = [
      { label: 'Muatan :', value: item.muatan || '-' },
    ];
    if (item.sn) parts.push({ label: 'SN :', value: item.sn });
    parts.push({ label: 'Lokasi Muat :', value: item.lokasiMuat || '-' });
    parts.push({ label: 'Lokasi Tujuan :', value: item.lokasiTujuan || '-' });
    return parts;
  });

  const body = data.items.map((item, idx) => {
    const tgl = item.tglMuat + (item.tglTiba && item.tglTiba !== '-' ? '\n—\n' + item.tglTiba : '');
    const armada = item.armada + (item.noPol && item.noPol !== '-' ? '\n(' + item.noPol + ')' : '');
    // desk string menentukan tinggi baris — label di atas, nilai di bawah (sesuai render)
    const desk = deskripsiStructured[idx]
      .map(p => p.label + '\n' + p.value)
      .join('\n');
    return [
      String(item.rowNo),
      tgl,
      item.noSO,
      armada,
      desk,
      fRp(item.hargaPengiriman),
      item.hargaAsuransi ? fRp(item.hargaAsuransi) : 'Tidak termasuk asuransi',
      fRp(item.total),
    ];
  });

  const foot: any[] = [
    [
      { content: data.catatan ? 'Catatan : ' + data.catatan : 'Catatan :', rowSpan: 3, styles: { valign: 'top', fontSize: 8 }, colSpan: 6 },
      { content: 'Sub Total', styles: { halign: 'right', fontStyle: 'bold' } },
      { content: fRp(data.subTotal), styles: { halign: 'right', fontStyle: 'bold' } },
    ],
    [
      { content: 'PPN (1,1%)', styles: { halign: 'right' } },
      { content: fRp(data.ppn), styles: { halign: 'right' } },
    ],
    [
      { content: 'Total', styles: { halign: 'right', fontStyle: 'bold' } },
      { content: fRp(data.total), styles: { halign: 'right', fontStyle: 'bold' } },
    ],
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
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 2, right: 3, bottom: 2, left: 3 },
      lineColor: BLACK,
      lineWidth: 0.3,
      textColor: BLACK,
      valign: 'top',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: YELLOW,
      textColor: BLACK,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      cellPadding: 3,
    },
    footStyles: {
      fillColor: WHITE,
      textColor: BLACK,
      fontSize: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 8,   halign: 'center' },
      1: { cellWidth: 22,  halign: 'center' },
      2: { cellWidth: 27 },
      3: { cellWidth: 22 },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 30,  halign: 'right', overflow: 'visible' },
      6: { cellWidth: 26,  halign: 'center' },
      7: { cellWidth: 30,  halign: 'right', overflow: 'visible' },
    },
    margin: { left: mL, right: mR, bottom: 20 },
    showFoot: 'lastPage',
    didDrawCell: (hookData: any) => {
      if (hookData.section !== 'body' || hookData.column.index !== 4) return;
      const { cell, row } = hookData;
      const parts = deskripsiStructured[row.index];
      if (!parts) return;

      // Hapus teks yang sudah digambar autoTable, jaga border tetap
      doc.setFillColor(255, 255, 255);
      doc.rect(cell.x + 0.2, cell.y + 0.2, cell.width - 0.4, cell.height - 0.4, 'F');

      const pL = 3;
      const lineH = 4.2;
      const textX = cell.x + pL;
      let ty = cell.y + 3.5;
      const maxW = cell.width - pL * 2;

      doc.setFontSize(8.5);
      parts.forEach(({ label, value }, i) => {
        // Bold label
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(label, textX, ty);
        ty += lineH;
        // Normal value (wrap kalau panjang)
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(value, maxW);
        doc.text(lines, textX, ty);
        ty += lineH * lines.length + (i < parts.length - 1 ? 2 : 0);
      });
    },
  });

  // FOOTER — halaman terakhir saja
  doc.setPage(doc.getNumberOfPages());
  const finalY = (doc as any).lastAutoTable.finalY;

  // TTD kanan
  const ttdCenterX = pageW - mR - 30;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BLACK);
  doc.text('Hormat Kami,', ttdCenterX, finalY + 8, { align: 'center' });
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.line(ttdCenterX - 30, finalY + 30, ttdCenterX + 30, finalY + 30);
  doc.text('(Muhammad Naufal Sugiarto)', ttdCenterX, finalY + 34, { align: 'center' });

  // Pembayaran kiri — di bawah TTD
  const payY = finalY + 42;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(mL, payY - 2, pageW - mR, payY - 2);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text('Pembayaran:', mL, payY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text('Mandiri  1330026272567  —  a/n PT Sugiarto Jaya Mandiri', mL, payY + 9);

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
