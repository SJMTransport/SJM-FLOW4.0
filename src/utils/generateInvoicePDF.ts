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

// No trailing ",00" — keeps values short enough to fit in narrow columns
const fRp = (n: number) =>
  'Rp.' + Math.round(n).toLocaleString('id-ID');

const AMBER  = [255, 143, 0]   as [number, number, number];
const YELLOW = [255, 200, 64]  as [number, number, number];
const BLACK  = [0, 0, 0]       as [number, number, number];
const WHITE  = [255, 255, 255] as [number, number, number];

const PAD_TOP = 2.5;
const PAD_LR  = 3.0;
const FONT_PT = 9;
// Must match jspdf-autotable's internal line-height for 9pt:
//   lineHeightFactor(1.15) * fontSize(9) / scaleFactor(2.8346) ≈ 3.65 mm
const LH = 3.65;

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const mL = 10;
  const mR = 10;
  let y = 14;

  // ── LOGO BOX ──
  doc.setFillColor(...AMBER);
  doc.roundedRect(mL, y, 26, 26, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('PT. SUGIARTO', mL + 13, y + 8,  { align: 'center' });
  doc.text('JAYA MANDIRI', mL + 13, y + 12, { align: 'center' });
  doc.setFontSize(14);
  doc.text('SJM', mL + 13, y + 22, { align: 'center' });

  // ── COMPANY INFO ──
  doc.setTextColor(...AMBER);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SUGIARTO JAYA MANDIRI TRANSPORT', mL + 30, y + 8);
  doc.setTextColor(...BLACK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Jl Raya Kemang Parung No.168A Kab.Bogor', mL + 30, y + 14);
  doc.text('Phone  : 0811751027',                     mL + 30, y + 19);
  doc.text('Email   : sugiartojayamandiri@gmail.com', mL + 30, y + 24);

  // ── INVOICE BADGE ──
  doc.setFillColor(...AMBER);
  doc.rect(pageW - mR - 32, y, 32, 13, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageW - mR - 16, y + 9, { align: 'center' });

  y += 30;

  // ── SEPARATOR LINES ──
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

  // ── TABLE BODY ──
  // Desk content is rendered WHITE (invisible) so autoTable calculates row
  // height correctly, then didDrawCell re-draws with bold labels + normal values.
  const body = data.items.map(item => {
    const tgl = item.tglMuat
      + (item.tglTiba && item.tglTiba !== '-' ? '\n—\n' + item.tglTiba : '');
    const armada = item.armada
      + (item.noPol && item.noPol !== '-' ? '\n(' + item.noPol + ')' : '');
    const desk = [
      'Muatan :\n'       + (item.muatan       || '-'),
      item.sn ? 'SN :\n' + item.sn : null,
      'Lokasi Muat :\n'  + (item.lokasiMuat   || '-'),
      'Lokasi Tujuan :\n'+ (item.lokasiTujuan || '-'),
    ].filter(Boolean).join('\n');
    const asuransi = item.hargaAsuransi
      ? fRp(item.hargaAsuransi)
      : 'Tidak termasuk\nasuransi';
    return [
      String(item.rowNo),
      tgl,
      item.noSO,
      armada,
      { content: desk, styles: { textColor: WHITE } },
      fRp(item.hargaPengiriman),
      asuransi,
      fRp(item.total),
    ];
  });

  // ── TABLE FOOT ──
  const foot: any[] = [
    [
      {
        content: data.catatan ? 'Catatan : ' + data.catatan : 'Catatan :',
        colSpan: 6,
        rowSpan: 3,
        styles: { valign: 'top', fontSize: 9 },
      },
      { content: 'Sub Total', styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
      { content: fRp(data.subTotal), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
    ],
    [
      { content: 'PPN (1,1%)', styles: { halign: 'right', fontSize: 9 } },
      { content: fRp(data.ppn),  styles: { halign: 'right', fontSize: 9 } },
    ],
    [
      { content: 'Total', styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
      { content: fRp(data.total), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } },
    ],
    [{
      content: 'Terbilang: ' + terbilang(data.total) + ' Rupiah',
      colSpan: 8,
      styles: { fontStyle: 'bold', fontSize: 9 },
    }],
  ];

  // Column widths (fixed total = 152 mm → auto Deskripsi = 38 mm)
  //   No.(10) + Tgl(16) + NoSO(28) + Armada(18) + BiayaKirim(30) + Asuransi(20) + Jumlah(30)
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
      fontSize: FONT_PT,
      cellPadding: { top: PAD_TOP, right: PAD_LR, bottom: PAD_TOP, left: PAD_LR },
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
      fontSize: FONT_PT,
      halign: 'center',
      // 2 mm L/R padding so "No." (≈4.5 mm) fits in the 10 mm column
      cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
    },
    footStyles: {
      fillColor: WHITE,
      textColor: BLACK,
    },
    columnStyles: {
      0: { cellWidth: 10,  halign: 'center' },
      1: { cellWidth: 16,  halign: 'center' },
      2: { cellWidth: 28 },
      3: { cellWidth: 18 },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 30,  halign: 'right' },
      6: { cellWidth: 20,  halign: 'center' },
      7: { cellWidth: 30,  halign: 'right' },
    },
    // Reserve 70 mm at page bottom for signature block
    margin: { left: mL, right: mR, bottom: 70 },
    showFoot: 'lastPage',
    // Never split a row across pages — avoids didDrawCell double-render issues
    rowPageBreak: 'avoid',

    didDrawCell: (hookData) => {
      if (hookData.section !== 'body' || hookData.column.index !== 4) return;
      const item = data.items[hookData.row.index];
      if (!item) return;

      const { x, y: cellY, width, height } = hookData.cell;
      const maxW  = width - PAD_LR * 2;
      // Baseline of first line: top of cell + top-padding + ~80% of font-height (ascent)
      let ty = cellY + PAD_TOP + FONT_PT * 0.3528 * 0.8;
      // Hard floor: don't draw below the cell (safety net for edge cases)
      const maxY = cellY + height - 1;

      doc.setFontSize(FONT_PT);
      doc.setTextColor(...BLACK);

      const parts: Array<{ label: string; value: string }> = [
        { label: 'Muatan :',        value: item.muatan       || '-' },
        ...(item.sn ? [{ label: 'SN :',   value: item.sn }]  : []),
        { label: 'Lokasi Muat :',   value: item.lokasiMuat   || '-' },
        { label: 'Lokasi Tujuan :', value: item.lokasiTujuan || '-' },
      ];

      for (const { label, value } of parts) {
        if (ty > maxY) break;
        doc.setFont('helvetica', 'bold');
        doc.text(label, x + PAD_LR, ty);
        ty += LH;

        doc.setFont('helvetica', 'normal');
        for (const line of doc.splitTextToSize(value, maxW)) {
          if (ty > maxY) break;
          doc.text(line, x + PAD_LR, ty);
          ty += LH;
        }
      }
    },
  });

  // ── FOOTER: last page only ──
  doc.setPage(doc.getNumberOfPages());
  const finalY = (doc as any).lastAutoTable.finalY;

  // TTD block — right side
  const ttdCX = pageW - mR - 32;
  doc.setFontSize(FONT_PT);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BLACK);
  doc.text('Hormat Kami,', ttdCX, finalY + 8, { align: 'center' });
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.line(ttdCX - 32, finalY + 36, ttdCX + 32, finalY + 36);
  doc.text('(Muhammad Naufal Sugiarto)', ttdCX, finalY + 41, { align: 'center' });

  // Pembayaran — fixed near bottom of last page
  const payY = pageH - 22;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text('Pembayaran:', mL, payY);
  doc.setFont('helvetica', 'normal');
  doc.text('Mandiri  1330026272567  —  a/n PT Sugiarto Jaya Mandiri', mL, payY + 6);

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
