import React from 'react';
import { terbilang } from '../utils/terbilang';
import { SJM_LOGO_B64 } from '../utils/sjmLogo';

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
  hargaAsuransi: number | null;
  total: number;
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

const th: React.CSSProperties = {
  backgroundColor: '#FFC840',
  border: '1px solid #000',
  padding: '5px 4px',
  textAlign: 'center',
  fontWeight: 'bold',
  fontSize: '9px',
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
      minHeight: '1123px',
      padding: '36px 40px',
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
          <img src={SJM_LOGO_B64} alt="SJM" style={{ width: '68px', height: '68px', objectFit: 'contain' }} />
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

      {/* Separator */}
      <div style={{ height: '2px', backgroundColor: '#000', margin: '6px 0 2px' }} />
      <div style={{ height: '2.5px', backgroundColor: '#FF8F00', marginBottom: '10px', width: '42%', marginLeft: 'auto' }} />

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
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
        <thead>
          <tr>
            <th style={{ ...th, width: '26px' }}>No.</th>
            <th style={{ ...th, width: '72px' }}>Tanggal</th>
            <th style={{ ...th, width: '88px' }}>No SO</th>
            <th style={{ ...th, width: '72px' }}>Armada</th>
            <th style={th}>Deskripsi</th>
            <th style={{ ...th, width: '92px' }}>Biaya Pengiriman</th>
            <th style={{ ...th, width: '84px' }}>Biaya Asuransi</th>
            <th style={{ ...th, width: '88px' }}>Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.rowNo}>
              <td style={tdC}>{item.rowNo}</td>
              <td style={tdC}>
                {item.tglMuat}<br />—<br />{item.tglTiba !== '-' ? item.tglTiba : item.tglMuat}
              </td>
              <td style={td}>{item.noSO}</td>
              <td style={td}>
                {item.armada}
                {item.noPol && item.noPol !== '-' ? <><br />({item.noPol})</> : null}
              </td>
              <td style={td}>
                {item.muatan && <><strong>Muatan :</strong><br />{item.muatan}<br /><br /></>}
                {item.sn     && <><strong>SN :</strong><br />{item.sn}<br /><br /></>}
                <strong>Lokasi Muat :</strong><br />{item.lokasiMuat}<br /><br />
                <strong>Lokasi Tujuan :</strong><br />{item.lokasiTujuan}
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
          {ppn > 0 && (
            <tr>
              <td colSpan={5} style={{ border: '1px solid #000' }} />
              <td colSpan={2} style={tdR}>PPN (1,1%)</td>
              <td style={tdR}>{fRp(ppn)}</td>
            </tr>
          )}
          <tr>
            <td colSpan={5} style={{ border: '1px solid #000' }} />
            <td colSpan={2} style={{ ...tdR, fontWeight: 'bold' }}>Total</td>
            <td style={tdR}><strong>{fRp(total)}</strong></td>
          </tr>
        </tfoot>
      </table>

      {/* ── TERBILANG ── */}
      <div style={{ border: '1px solid #000', padding: '5px 8px', fontSize: '9px', borderTop: 'none' }}>
        <strong>Terbilang:</strong> {terbilang(total)}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop: '1px solid #000', marginTop: '24px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontSize: '9px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Pembayaran:</div>
          <div>Mandiri &nbsp;1330026272567 &nbsp;— &nbsp;a/n PT Sugiarto Jaya Mandiri</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '10px' }}>
          <div>Hormat Kami,</div>
          <div style={{ marginTop: '46px' }}>(Muhammad Naufal Sugiarto)</div>
        </div>
      </div>
    </div>
  )
);

InvoiceTemplate.displayName = 'InvoiceTemplate';
export default InvoiceTemplate;
