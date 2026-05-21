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
const YELLOW = [249, 172, 61]  as [number, number, number];
const BLACK  = [0, 0, 0]       as [number, number, number];
const WHITE  = [255, 255, 255] as [number, number, number];

const PAD_TOP  = 2.5;
const PAD_BODY = 3.0;   // L/R padding cols 0–2
const PAD_WIDE = 2.0;   // L/R padding cols 3–6 (Deskripsi + currency)
const FONT_PT  = 9;
// Must match jspdf-autotable internal line-height: 1.15×9/2.8346 ≈ 3.65 mm
const LH = 3.65;

async function loadImageAsDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateInvoicePDF(data: InvoiceData): Promise<jsPDF> {
  const logoDataUrl = await loadImageAsDataUrl('/logo-sjm.png');

  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const mL = 5;
  const mR = 5;
  let y = 14;

  // ── LOGO ──
  doc.addImage(logoDataUrl, 'PNG', mL, y, 32, 32);

  // ── COMPANY INFO ──
  doc.setTextColor(...YELLOW);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SUGIARTO JAYA MANDIRI TRANSPORT', mL + 36, y + 8);
  doc.setTextColor(...BLACK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Jl Raya Kemang Parung No.168A Kab.Bogor', mL + 36, y + 14);
  doc.text('Phone  : 0811751027',                     mL + 36, y + 19);
  doc.text('Email   : sugiartojayamandiri@gmail.com', mL + 36, y + 24);

  // ── INVOICE BADGE ──
  doc.setFillColor(...YELLOW);
  doc.rect(pageW - mR - 32, y, 32, 13, 'F');
  doc.setTextColor(...BLACK);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageW - mR - 16, y + 9, { align: 'center' });

  y += 34;

  // ── SEPARATOR LINES ──
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(1.2);
  doc.line(mL, y, pageW - mR, y);
  y += 2;
  doc.setDrawColor(...YELLOW);
  doc.setLineWidth(1.5);
  doc.line(pageW - mR - 60, y, pageW - mR, y);
  y += 7;

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
    y += 5.5;
  });
  y += 3;

  // ── TABLE BODY (7 columns — No SO & Armada merged) ──
  // Col 3 (Deskripsi): rendered WHITE for height calc; didDrawCell redraws
  // with bold labels + normal values.
  const body = data.items.map(item => {
    // Merged: SO number, blank gap, then vehicle type + plate
    const soArmada = item.noSO
      + '\n\n'
      + item.armada
      + (item.noPol && item.noPol !== '-' ? '\n(' + item.noPol + ')' : '');

    const desk = [
      'Muatan :\n'        + (item.muatan       || '-'),
      item.sn ? 'SN :\n' + item.sn : null,
      'Lokasi Muat :\n'   + (item.lokasiMuat   || '-'),
      'Lokasi Tujuan :\n' + (item.lokasiTujuan || '-'),
    ].filter(Boolean).join('\n');

    const asuransi = item.hargaAsuransi
      ? fRp(item.hargaAsuransi)
      : 'Tidak termasuk\nasuransi';

    return [
      String(item.rowNo),                                    // 0 No.
      item.tglMuat + (item.tglTiba && item.tglTiba !== '-'  // 1 Tanggal
        ? '\n—\n' + item.tglTiba : ''),
      soArmada,                                              // 2 No SO / Armada
      { content: desk, styles: { textColor: WHITE } },       // 3 Deskripsi
      fRp(item.hargaPengiriman),                            // 4 Biaya Pengiriman
      asuransi,                                              // 5 Biaya Asuransi
      fRp(item.total),                                       // 6 Jumlah
    ];
  });

  // ── TABLE FOOT ──
  // Catatan spans cols 0–4 (5 cols) across 3 rows; Sub Total/PPN/Total in cols 5–6
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
      { content: fRp(data.ppn),  styles: { halign: 'right', fontSize: 9 } },
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

  // Table width = 200 mm  (mL=5, mR=5)
  // No.(10) + Tgl(16) + NoSO/Armada(32) + Deskripsi(46) + BiayaKirim(29) + Asuransi(29) + Jumlah(38) = 200
  autoTable(doc, {
    startY: y,
    head: [[
      { content: 'No.',              styles: { halign: 'center' } },
      { content: 'Tanggal',          styles: { halign: 'center' } },
      { content: 'No SO / Armada',   styles: { halign: 'center' } },
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
      cellPadding: { top: PAD_TOP, right: PAD_BODY, bottom: PAD_TOP, left: PAD_BODY },
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
      cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
    },
    footStyles: {
      fillColor: WHITE,
      textColor: BLACK,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 32 },
      3: {
        cellWidth: 46,
        cellPadding: { top: PAD_TOP, right: PAD_WIDE, bottom: PAD_TOP, left: PAD_WIDE },
      },
      4: {
        cellWidth: 29,
        halign: 'right',
        cellPadding: { top: PAD_TOP, right: PAD_WIDE, bottom: PAD_TOP, left: PAD_WIDE },
      },
      5: {
        cellWidth: 29,
        halign: 'center',
        cellPadding: { top: PAD_TOP, right: PAD_WIDE, bottom: PAD_TOP, left: PAD_WIDE },
      },
      6: {
        cellWidth: 38,
        halign: 'right',
        cellPadding: { top: PAD_TOP, right: PAD_WIDE, bottom: PAD_TOP, left: PAD_WIDE },
      },
    },
    margin: { left: mL, right: mR, top: 18, bottom: 55 },
    showFoot: 'lastPage',
    rowPageBreak: 'avoid',

    // Re-draw Deskripsi (col 3) with bold labels + normal values
    didDrawCell: (hookData) => {
      if (hookData.section !== 'body' || hookData.column.index !== 3) return;
      const item = data.items[hookData.row.index];
      if (!item) return;

      const { x, y: cellY, width, height } = hookData.cell;
      const maxW = width - PAD_WIDE * 2;
      let ty = cellY + PAD_TOP + FONT_PT * 0.3528 * 0.8;
      const maxY = cellY + height - 1;

      doc.setFontSize(FONT_PT);
      doc.setTextColor(...BLACK);

      const parts: Array<{ label: string; value: string }> = [
        { label: 'Muatan :',        value: item.muatan       || '-' },
        ...(item.sn ? [{ label: 'SN :', value: item.sn }]   : []),
        { label: 'Lokasi Muat :',   value: item.lokasiMuat   || '-' },
        { label: 'Lokasi Tujuan :', value: item.lokasiTujuan || '-' },
      ];

      for (const { label, value } of parts) {
        if (ty > maxY) break;
        doc.setFont('helvetica', 'bold');
        doc.text(label, x + PAD_WIDE, ty);
        ty += LH;
        doc.setFont('helvetica', 'normal');
        for (const line of doc.splitTextToSize(value, maxW)) {
          if (ty > maxY) break;
          doc.text(line, x + PAD_WIDE, ty);
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
  doc.line(ttdCX - 32, finalY + 44, ttdCX + 32, finalY + 44);
  doc.text('(Muhammad Naufal Sugiarto)', ttdCX, finalY + 49, { align: 'center' });

  // Pembayaran — placed just below TTD, highlighted with yellow left accent
  const payY = finalY + 61;
  doc.setFillColor(...YELLOW);
  doc.rect(mL, payY - 4, 2, 14, 'F');                       // amber left bar
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text('Pembayaran:', mL + 5, payY + 2);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Mandiri  1330026272567  —  a/n PT Sugiarto Jaya Mandiri', mL + 5, payY + 9);

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
