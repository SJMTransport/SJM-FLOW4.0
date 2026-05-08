import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { terbilang } from './terbilang';
import { SJM_LOGO_B64 } from './sjmLogo';

const ORANGE: [number, number, number] = [245, 166, 35];
const BLACK:  [number, number, number] = [0,   0,   0];
const WHITE:  [number, number, number] = [255, 255, 255];
const DARK:   [number, number, number] = [40,  40,  40];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function groupDigits(n: number, sep: string): string {
  const s = Math.round(Math.abs(n)).toString();
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out.push(sep);
    out.push(s[i]);
  }
  return out.join('');
}

// Row cells: Rp3,461,919.00
function fmtRow(n: number): string {
  return 'Rp' + groupDigits(n, ',') + '.00';
}

// Footer totals: Rp.13.847.676,00
function fmtTotal(n: number): string {
  return 'Rp.' + groupDigits(n, '.') + ',00';
}

// Date: 14-Apr-2026
function fmtDate(d: string | null | undefined): string {
  if (!d) return '-';
  const dt = new Date(d.includes('T') ? d : d + 'T00:00:00');
  if (isNaN(dt.getTime())) return String(d);
  return `${String(dt.getDate()).padStart(2, '0')}-${MONTHS[dt.getMonth()]}-${dt.getFullYear()}`;
}

export interface SOItem {
  order_id?: string;
  lokasi_muat?: string;
  lokasi_bongkar?: string;
  jenis_truk?: string;
  no_polisi?: string;
  tgl_muat?: string;
  tgl_bongkar?: string;
  muatan?: string;
  unit_muatan?: string;
  harga_pengiriman?: number;
  harga_asuransi?: number;
  total_harga?: number;
  nilai_pajak?: number;
  total_harga_pajak?: number;
  sn?: string;
}

export function generateInvoicePDF(
  invoiceNo: string,
  invoiceDate: Date,
  customer: string,
  picCust: string,
  noPic: string,
  items: SOItem[],
  fileName?: string
): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const W  = doc.internal.pageSize.getWidth();  // 210 mm
  const H  = doc.internal.pageSize.getHeight(); // 297 mm
  const ML = 10;
  const MR = 10;

  // Logo dimensions (square, left side)
  const LX = 11, LY = 8, LS = 28;
  const HEADER_BOTTOM = LY + LS + 6; // ~42 mm

  // Footer height — payment info strip at very bottom of every page
  const FOOTER_H  = 16;
  const FOOTER_Y  = H - FOOTER_H - 4; // ~277 mm

  // ── drawHeader ────────────────────────────────────────────────────────────
  const drawHeader = () => {
    // Real SJM logo image
    doc.addImage(SJM_LOGO_B64, 'JPEG', LX, LY, LS, LS);

    // Company name (orange bold)
    const TX = LX + LS + 5; // x ≈ 44
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...ORANGE);
    doc.text('SUGIARTO JAYA MANDIRI TRANSPORT', TX, LY + 7);

    // Address / contact lines
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text('Jl Raya Kemang Parung No.168A Kab.Bogor',  TX, LY + 13);
    doc.text('Phone  : 0811751027',                      TX, LY + 18.5);
    doc.text('Email    : sugiartojayamandiri@gmail.com',  TX, LY + 24);

    // INVOICE badge (top-right)
    const BX = W - MR - 34, BY = LY, BW = 34, BH = 11;
    doc.setFillColor(...ORANGE);
    doc.rect(BX, BY, BW, BH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text('INVOICE', BX + BW / 2, BY + 7.5, { align: 'center' });

    // Thick black separator (full width)
    const SEP = LY + LS + 2;
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.7);
    doc.line(ML, SEP, W - MR, SEP);

    // Short orange accent bar (right-aligned, below separator)
    doc.setFillColor(...ORANGE);
    doc.rect(W - MR - 65, SEP + 1.5, 65, 2.5, 'F');
  };

  // ── drawFooter ────────────────────────────────────────────────────────────
  // Runs on EVERY page via didDrawPage
  const drawFooter = () => {
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.4);
    doc.line(ML, FOOTER_Y - 2, W - MR, FOOTER_Y - 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text('Pembayaran:', ML, FOOTER_Y + 4);

    doc.setFont('helvetica', 'normal');
    doc.text('Mandiri  1330026272567  -  a/n PT Sugiarto Jaya Mandiri', ML, FOOTER_Y + 9.5);
  };

  // Draw header & footer for page 1
  drawHeader();
  drawFooter();

  // ── Invoice info (page 1 only) ────────────────────────────────────────────
  const IY  = HEADER_BOTTOM + 6;
  const LBX = ML + 2;
  const CX  = LBX + 22;
  const VX  = CX + 3;

  const invDateFmt = `${String(invoiceDate.getDate()).padStart(2, '0')}-${MONTHS[invoiceDate.getMonth()]}-${invoiceDate.getFullYear()}`;
  const telepon    = [picCust, noPic].filter(Boolean).join(' ');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);

  [
    ['No Invoice', invoiceNo],
    ['Tgl Invoice', invDateFmt],
    ['Penyewa',     customer || '-'],
    ['Telepon',     telepon  || '-'],
  ].forEach(([lbl, val], i) => {
    const y = IY + i * 5.8;
    doc.text(lbl, LBX, y);
    doc.text(':',  CX,  y);
    doc.text(val,  VX,  y);
  });

  // ── Table ─────────────────────────────────────────────────────────────────
  const TABLE_Y = IY + 4 * 5.8 + 5;

  // Data rows
  const dataRows = items.map((s, i) => {
    const dm = fmtDate(s.tgl_muat);
    const db = fmtDate(s.tgl_bongkar);
    const tanggal = `${dm}\n-\n${db !== '-' ? db : dm}`;
    const armada  = [s.jenis_truk, s.no_polisi ? `(${s.no_polisi})` : ''].filter(Boolean).join('\n');

    const descParts: string[] = [];
    if (s.muatan)         descParts.push(`Muatan :\n${s.muatan}${s.unit_muatan ? ' ' + s.unit_muatan : ''}`);
    if (s.sn)             descParts.push(`SN :\n${s.sn}`);
    if (s.lokasi_muat)    descParts.push(`Lokasi Muat :\n${s.lokasi_muat}`);
    if (s.lokasi_bongkar) descParts.push(`Lokasi Tujuan :\n${s.lokasi_bongkar}`);

    const asuransi = (s.harga_asuransi || 0) > 0
      ? fmtRow(s.harga_asuransi!)
      : 'Tidak termasuk\nasuransi';

    return [
      String(i + 1),
      tanggal,
      s.order_id || '-',
      armada || '-',
      descParts.join('\n\n') || '-',
      fmtRow(s.harga_pengiriman || 0),
      asuransi,
      fmtRow(s.total_harga || 0),
    ];
  });

  // Totals
  const totalDPP   = items.reduce((s, x) => s + (x.total_harga             || 0), 0);
  const totalPPN   = items.reduce((s, x) => s + (x.nilai_pajak              || 0), 0);
  const grandTotal = items.reduce((s, x) => s + (x.total_harga_pajak || x.total_harga || 0), 0);

  // Summary rows appended to table body
  const summaryRows: any[] = [
    [
      { content: 'Catatan :', colSpan: 6, styles: { fontStyle: 'bold', halign: 'left' as const } },
      { content: 'Sub Total', styles: { fontStyle: 'bold', halign: 'right' as const } },
      { content: fmtTotal(totalDPP), styles: { halign: 'right' as const } },
    ],
  ];

  if (totalPPN > 0) {
    summaryRows.push([
      { content: '', colSpan: 6 },
      { content: 'PPN (1,1%)', styles: { fontStyle: 'bold', halign: 'right' as const } },
      { content: fmtTotal(totalPPN), styles: { halign: 'right' as const } },
    ]);
  }

  summaryRows.push([
    { content: '', colSpan: 6 },
    { content: 'Total', styles: { fontStyle: 'bold', halign: 'right' as const } },
    { content: fmtTotal(grandTotal), styles: { fontStyle: 'bold', halign: 'right' as const } },
  ]);

  summaryRows.push([
    {
      content: `Terbilang: ${terbilang(grandTotal)}`,
      colSpan: 8,
      styles: { fontStyle: 'bold', halign: 'left' as const },
    },
  ]);

  // Column widths sum: 8+22+26+22+44+26+20+22 = 190 = W - ML - MR ✓
  autoTable(doc, {
    head: [['No.', 'Tanggal', 'No SO', 'Armada', 'Deskripsi', 'Biaya Pengiriman', 'Biaya Asuransi', 'Jumlah']],
    body: [...dataRows, ...summaryRows],
    startY: TABLE_Y,
    margin: { left: ML, right: MR, top: HEADER_BOTTOM + 2, bottom: FOOTER_H + 8 },
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
      lineWidth: 0.2,
      lineColor: BLACK,
      textColor: DARK,
      valign: 'top',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: ORANGE,
      textColor: DARK,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles:         { fillColor: WHITE },
    alternateRowStyles: { fillColor: WHITE },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8  },
      1: { halign: 'center', cellWidth: 22 },
      2: { cellWidth: 26 },
      3: { cellWidth: 22 },
      4: { cellWidth: 44 },
      5: { halign: 'right',  cellWidth: 26 },
      6: { halign: 'right',  cellWidth: 20 },
      7: { halign: 'right',  cellWidth: 22 },
    },
    showHead: 'everyPage',
    didDrawPage: (data) => {
      if (data.pageNumber > 1) drawHeader();
      drawFooter();
    },
  });

  // ── Signature (last page, after table) ────────────────────────────────────
  const finalY = (doc as any).lastAutoTable.finalY;
  const SX = W / 2 + 15;
  const SY = finalY + 12;

  // Only draw signature if it fits above the footer
  if (SY + 30 < FOOTER_Y - 5) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.text('Hormat Kami,', SX, SY);
    doc.text('(Muhammad Naufal Sugiarto)', SX, SY + 28);
  }

  doc.save(fileName ?? `Invoice_${invoiceNo.replace(/\//g, '_')}.pdf`);
}
