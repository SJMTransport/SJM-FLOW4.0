import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { terbilang } from './terbilang';

const NAVY: [number, number, number] = [30, 58, 95];
const ORANGE: [number, number, number] = [249, 172, 61];
const WHITE: [number, number, number] = [255, 255, 255];
const LIGHT_GRAY: [number, number, number] = [248, 250, 252];
const BORDER_COLOR: [number, number, number] = [226, 232, 240];

function fmt(n: number): string {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
  const W = doc.internal.pageSize.getWidth();

  // ── HEADER ────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 30, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('PT Sugiarto Jaya Mandiri', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Jasa Pengiriman & Ekspedisi', 14, 17);
  doc.text('Telp: (021) 000-0000  |  Email: info@sjmtransport.co.id', 14, 22);
  doc.text('NPWP: 00.000.000.0-000.000', 14, 27);

  // Title on right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('INVOICE', W - 14, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('FAKTUR PAJAK', W - 14, 20, { align: 'right' });

  // ── ORANGE BAR ────────────────────────────────────────────────────────────
  doc.setFillColor(...ORANGE);
  doc.rect(0, 30, W, 0.8, 'F');

  // ── INFO BLOCK ────────────────────────────────────────────────────────────
  const infoY = 38;

  // Left: Bill To
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('KEPADA YTH:', 14, infoY);

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(customer || '-', 14, infoY + 5);

  if (picCust) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Attn: ${picCust}`, 14, infoY + 10);
  }
  if (noPic) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Telp: ${noPic}`, 14, infoY + 15);
  }

  // Right: Invoice details box
  const boxX = W / 2 + 10;
  const boxW = W / 2 - 20;
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, infoY - 4, boxW, 28, 2, 2, 'S');

  doc.setFillColor(...NAVY);
  doc.roundedRect(boxX, infoY - 4, boxW, 7, 2, 2, 'F');
  doc.rect(boxX, infoY, boxW, 3, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('DETAIL INVOICE', boxX + boxW / 2, infoY, { align: 'center' });

  const lineH = 6;
  const col1 = boxX + 4;
  const col2 = boxX + boxW - 4;
  let ry = infoY + 7;

  const drawRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(label, col1, ry);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(value, col2, ry, { align: 'right' });
    ry += lineH;
  };

  drawRow('No Invoice', invoiceNo);
  drawRow('Tanggal', fmtDate(invoiceDate.toISOString().split('T')[0]));
  drawRow('Jumlah SO', `${items.length} item`);

  // ── TABLE ─────────────────────────────────────────────────────────────────
  const tableY = infoY + 28;

  const rows = items.map((s, i) => [
    String(i + 1),
    s.order_id || '-',
    [s.lokasi_muat || '', s.lokasi_bongkar || ''].filter(Boolean).join(' → ') || '-',
    [s.jenis_truk || '', s.no_polisi || ''].filter(Boolean).join('\n') || '-',
    s.muatan ? `${s.muatan}${s.unit_muatan ? ' ' + s.unit_muatan : ''}` : '-',
    fmtDate(s.tgl_muat),
    fmt(s.harga_pengiriman || 0),
    fmt(s.harga_asuransi || 0),
    fmt(s.total_harga || 0),
  ]);

  autoTable(doc, {
    head: [['No', 'Order ID', 'Rute', 'Truk / Pol', 'Muatan', 'Tgl Muat', 'Harga Kirim', 'Asuransi', 'Subtotal']],
    body: rows,
    startY: tableY,
    margin: { left: 10, right: 10 },
    styles: { fontSize: 7, cellPadding: 2, lineWidth: 0.1, lineColor: BORDER_COLOR },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 22 },
      2: { cellWidth: 36 },
      3: { cellWidth: 26 },
      4: { cellWidth: 20 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 22 },
      7: { halign: 'right', cellWidth: 22 },
      8: { halign: 'right', cellWidth: 22 },
    },
  });

  // ── TOTALS ────────────────────────────────────────────────────────────────
  const totalDPP = items.reduce((s, x) => s + (x.total_harga || 0), 0);
  const totalPPN = items.reduce((s, x) => s + (x.nilai_pajak || 0), 0);
  const grandTotal = items.reduce((s, x) => s + (x.total_harga_pajak || (x.total_harga || 0)), 0);

  const finalY = (doc as any).lastAutoTable.finalY + 4;
  const totX = W - 90;
  const totW = 80;

  const drawTotal = (label: string, value: string, bold = false, highlight = false) => {
    if (highlight) {
      doc.setFillColor(...NAVY);
      doc.rect(totX, finalY + (drawTotal as any)._y - 4, totW, 8, 'F');
      doc.setTextColor(...WHITE);
    } else {
      doc.setTextColor(50, 50, 50);
    }
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.text(label, totX + 2, finalY + (drawTotal as any)._y);
    doc.text(value, totX + totW - 2, finalY + (drawTotal as any)._y, { align: 'right' });
    (drawTotal as any)._y += 7;
    doc.setTextColor(50, 50, 50);
  };
  (drawTotal as any)._y = 2;

  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.rect(totX, finalY - 2, totW, totalPPN > 0 ? 27 : 20, 'S');

  drawTotal('DPP (Dasar Pengenaan Pajak)', fmt(totalDPP), false);
  if (totalPPN > 0) drawTotal('PPN 11%', fmt(totalPPN), false);
  drawTotal('TOTAL TAGIHAN', fmt(grandTotal), true, true);

  // ── TERBILANG ─────────────────────────────────────────────────────────────
  const terbY = finalY + (totalPPN > 0 ? 32 : 25);
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(10, terbY, W - 20, 11, 2, 2, 'F');
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(10, terbY, W - 20, 11, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Terbilang:', 14, terbY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(30, 30, 30);
  const terbWords = terbilang(grandTotal);
  const wrappedTerb = doc.splitTextToSize(terbWords, W - 50);
  doc.text(wrappedTerb[0] || terbWords, 35, terbY + 4.5);

  // ── SIGNATURE ─────────────────────────────────────────────────────────────
  const sigY = terbY + 18;
  const sigX = W - 70;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Hormat Kami,', sigX, sigY);
  doc.setFont('helvetica', 'bold');
  doc.text('PT Sugiarto Jaya Mandiri', sigX, sigY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('_________________________', sigX, sigY + 22);
  doc.text('(                              )', sigX, sigY + 27);

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...ORANGE);
  doc.rect(0, pageH - 8, W, 8, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...NAVY);
  doc.text('PT Sugiarto Jaya Mandiri · SJM Flow', 14, pageH - 3.5);
  const nowStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Dicetak: ${nowStr}`, W - 14, pageH - 3.5, { align: 'right' });

  const name = fileName || `Invoice_${invoiceNo.replace(/\//g, '_')}.pdf`;
  doc.save(name);
}
