import React from 'react';
import { terbilang } from '../utils/terbilang';

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
  hargaPengiriman: number;  // DPP (harga_pengiriman)
  nilaiPajak: number;       // PPN per row (nilai_pajak)
  hargaAsuransi: number | null;
  total: number;            // total_harga_pajak (DPP + PPN)
}

export interface InvoiceTemplateProps {
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

const fRp = (n: number): string =>
  'Rp.' + Math.round(n).toLocaleString('id-ID') + ',00';

// FIX 6: Updated th with correct font size, color, vertical align, padding
const th: React.CSSProperties = {
  backgroundColor: '#FFC840',
  border: '1px solid #000',
  padding: '6px 4px',
  textAlign: 'center',
  fontWeight: 'bold',
  fontSize: '8.5px',
  color: '#000',
  verticalAlign: 'middle',
};

const td: React.CSSProperties = {
  border: '1px solid #000',
  padding: '5px 4px',
  verticalAlign: 'top',
  fontSize: '9px',
};

const tdC: React.CSSProperties = { ...td, textAlign: 'center' };
const tdR: React.CSSProperties = { ...td, textAlign: 'right' };

const InvoiceTemplate = React.forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ invoiceNumber, invoiceDate, customer, picCust, items, subTotal, ppn, total, catatan = '' }, ref) => (
      <div ref={ref} style={{
        width: '794px',
        padding: '36px 40px',
        paddingBottom: '0',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '10px',
        color: '#000',
        backgroundColor: '#fff',
        boxSizing: 'border-box',
        position: 'relative',
      }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>

          {/* Logo + company info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Pure-HTML logo box — no SVG/img so html2canvas never hangs */}
            <div style={{
              width: '70px', height: '70px', flexShrink: 0,
              backgroundColor: '#FF8F00', borderRadius: '6px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontFamily: 'Arial, Helvetica, sans-serif',
              fontWeight: 'bold', textAlign: 'center', lineHeight: 1.25,
            }}>
              <div style={{ fontSize: '7px' }}>PT. SUGIARTO</div>
              <div style={{ fontSize: '7px' }}>JAYA MANDIRI</div>
              <div style={{ fontSize: '18px', letterSpacing: '1px' }}>SJM</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#FF8F00', letterSpacing: '0.3px' }}>
                SUGIARTO JAYA MANDIRI TRANSPORT
              </div>
              <div style={{ fontSize: '8.5px', color: '#333', lineHeight: 1.5 }}>
                Jl Raya Kemang Parung No.168A Kab.Bogor
              </div>
              <div style={{ fontSize: '8.5px', color: '#333', lineHeight: 1.5 }}>
                Phone &nbsp;: 0811751027
              </div>
              <div style={{ fontSize: '8.5px', color: '#333', lineHeight: 1.5 }}>
                Email &nbsp;&nbsp;: sugiartojayamandiri@gmail.com
              </div>
            </div>
          </div>

          {/* INVOICE badge */}
          <div style={{
            backgroundColor: '#FF8F00', color: '#fff',
            padding: '8px 20px', fontSize: '13px',
            fontWeight: 'bold', letterSpacing: '2px',
            alignSelf: 'flex-start',
          }}>
            INVOICE
          </div>
        </div>

        {/* Garis header: hitam tebal full-width + kuning tipis right-aligned */}
        <div style={{ height: '3px', backgroundColor: '#000', width: '100%', marginTop: '8px' }} />
        <div style={{ height: '2px', backgroundColor: '#FFC840', width: '200px', marginLeft: 'auto', marginTop: '2px', marginBottom: '14px' }} />

        {/* ── INVOICE INFO ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '88px 10px 1fr',
          gap: '4px 0',
          marginBottom: '14px',
          fontSize: '10px',
        }}>
          {[
            ['No Invoice',  invoiceNumber, true],
            ['Tgl Invoice', invoiceDate,   false],
            ['Penyewa',     customer,      false],
            ['Telepon',     picCust || '-',false],
          ].map(([label, val, bold]) => (
            <React.Fragment key={label as string}>
              <span>{label as string}</span>
              <span>:</span>
              <span style={{ fontWeight: bold ? 'bold' : 'normal' }}>{val as string}</span>
            </React.Fragment>
          ))}
        </div>

        {/* ── ITEMS TABLE ── */}
        {/* FIX 5: Updated column widths */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', border: '2px solid #000' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: '28px' }}>No.</th>
              <th style={{ ...th, width: '70px' }}>Tanggal</th>
              <th style={{ ...th, width: '85px' }}>No SO</th>
              <th style={{ ...th, width: '75px' }}>Armada</th>
              <th style={th}>Deskripsi</th>
              <th style={{ ...th, width: '90px' }}>Biaya Pengiriman</th>
              <th style={{ ...th, width: '80px' }}>Biaya Asuransi</th>
              <th style={{ ...th, width: '85px' }}>Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.rowNo}>
                <td style={tdC}>{item.rowNo}</td>
                <td style={tdC}>
                  {item.tglMuat}<br />—<br />{item.tglTiba && item.tglTiba !== '-' ? item.tglTiba : item.tglMuat}
                </td>
                <td style={td}>{item.noSO}</td>
                <td style={td}>
                  <div>{item.armada}</div>
                  {item.noPol && item.noPol !== '-' && <div>({item.noPol})</div>}
                </td>
                <td style={td}>
                  {item.muatan && (
                    <div style={{ marginBottom: '6px' }}>
                      <strong>Muatan :</strong>
                      <div>{item.muatan}</div>
                    </div>
                  )}
                  {item.sn && (
                    <div style={{ marginBottom: '6px' }}>
                      <strong>SN :</strong>
                      <div>{item.sn}</div>
                    </div>
                  )}
                  <div style={{ marginBottom: '6px' }}>
                    <strong>Lokasi Muat :</strong>
                    <div>{item.lokasiMuat || '-'}</div>
                  </div>
                  <div>
                    <strong>Lokasi Tujuan :</strong>
                    <div>{item.lokasiTujuan || '-'}</div>
                  </div>
                </td>
                <td style={tdR}>{fRp(item.hargaPengiriman)}</td>
                <td style={{ ...tdC, whiteSpace: 'pre-line' as const }}>
                  {item.hargaAsuransi ? fRp(item.hargaAsuransi) : 'Tidak termasuk\nasuransi'}
                </td>
                <td style={tdR}>{fRp(item.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} style={{ ...td, fontSize: '9px' }}>
                {catatan ? <>Catatan : {catatan}</> : 'Catatan :'}
              </td>
              <td colSpan={2} style={{ ...tdR, fontWeight: 'bold' }}>Sub Total</td>
              <td style={tdR}><strong>{fRp(subTotal)}</strong></td>
            </tr>
            <tr>
              <td colSpan={5} style={{ border: '1px solid #000' }} />
              <td colSpan={2} style={tdR}>PPN (1,1%)</td>
              <td style={tdR}>{fRp(ppn)}</td>
            </tr>
            <tr>
              <td colSpan={5} style={{ border: '1px solid #000' }} />
              <td colSpan={2} style={{ ...tdR, fontWeight: 'bold' }}>Total</td>
              <td style={tdR}><strong>{fRp(total)}</strong></td>
            </tr>
            {/* FIX 7: Terbilang inside tfoot */}
            <tr>
              <td colSpan={8} style={{ border: '1px solid #000', borderTop: 'none', padding: '5px 8px', fontSize: '9px' }}>
                <strong>Terbilang:</strong> {terbilang(total)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* FOOTER */}
        <div style={{ marginTop: '20px' }}>
          {/* TTD block — kanan */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <div style={{ textAlign: 'center', fontSize: '10px', minWidth: '160px' }}>
              <div>Hormat Kami,</div>
              <div style={{ marginTop: '70px', borderTop: '1px solid #000', paddingTop: '4px' }}>
                (Muhammad Naufal Sugiarto)
              </div>
            </div>
          </div>
          {/* Garis pemisah */}
          <div style={{ borderTop: '1px solid #ccc', marginTop: '8px', paddingTop: '8px' }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '2px' }}>Pembayaran:</div>
            <div style={{ fontSize: '9px' }}>Mandiri &nbsp;1330026272567 &nbsp;— &nbsp;a/n PT Sugiarto Jaya Mandiri</div>
          </div>
        </div>
      </div>
  )
);

InvoiceTemplate.displayName = 'InvoiceTemplate';
export default InvoiceTemplate;
