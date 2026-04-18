/**
 * CSV Parser for SJM Sales Order Import
 * Fixes Indonesian number format parsing bug (Rp12.500.000,00 → 12500000)
 */

// Parse Indonesian Rupiah format to number
export const parseRupiah = (val: string): number => {
  if (!val || typeof val !== 'string') return 0;
  const cleaned = val.trim();
  if (cleaned === '' || cleaned === '-') return 0;
  
  // Remove "Rp" prefix and spaces
  let num = cleaned.replace(/Rp/gi, '').replace(/\s/g, '');
  
  // CRITICAL FIX: Remove dots (thousand separator) BEFORE replacing comma
  num = num.replace(/\./g, '');  // 12.500.000 → 12500000
  num = num.replace(/,/g, '.');  // 12500000,00 → 12500000.00
  
  const parsed = parseFloat(num);
  return isNaN(parsed) ? 0 : parsed;
};

// Parse Indonesian date format (26-Dec-2025 → 2025-12-26)
export const parseDate = (val: string): string => {
  if (!val || val.trim() === '' || val.trim() === '-') return '';
  
  const months: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  
  const parts = val.trim().split('-');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = months[parts[1]] || parts[1];
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  
  return val; // Return as-is if can't parse
};

// CSV column mapping for SJM Sales Order
export const CSV_COLUMN_MAP = {
  order_id: 0,
  no_invoice: 1,
  kode_invoice: 2,
  laporan_keuangan: 3,
  tgl_order: 4,
  tgl_muat: 5,
  jam_muat: 6,
  lokasi_muat: 7,
  sharelok_muat: 8,
  lokasi_bongkar: 9,
  sharelok_bongkar: 10,
  customer: 11,
  pic: 12,
  no_pic: 13,
  nama_sopir: 14,
  jenis_truk: 15,
  no_polisi: 16,
  no_supir: 17,
  armada: 18,
  unit_muatan: 19,
  base_harga: 20,
  harga_asuransi: 21,
  pajak: 22,
  nilai_pajak: 23,
  harga_pengiriman: 24,
  total_harga: 25,
  template_konfirmasi: 26,
  status_muatan: 27,
  tgl_bongkar: 28,
  update_customer: 29,
  no_asuransi: 30,
  nilai_tanggungan_asuransi: 31,
  nilai_asuransi: 32,
  nilai_tanpa_asuransi: 33,
  total_harga_pajak: 34,
  keterangan: 35,
  muatan: 36,
  sn: 37,
  spk: 38,
};

// Parse single CSV row to SO object
export const parseCSVRow = (row: string[], headers: string[]): any => {
  const col = CSV_COLUMN_MAP;
  
  return {
    order_id: row[col.order_id]?.trim() || '',
    no_invoice: row[col.no_invoice]?.trim() || null,
    kode_invoice: row[col.kode_invoice]?.trim() || null,
    tgl_order: parseDate(row[col.tgl_order] || ''),
    tgl_muat: parseDate(row[col.tgl_muat] || ''),
    jam_muat: row[col.jam_muat]?.trim() || null,
    lokasi_muat: row[col.lokasi_muat]?.trim() || '',
    sharelok_muat: row[col.sharelok_muat]?.trim() || null,
    lokasi_bongkar: row[col.lokasi_bongkar]?.trim() || '',
    sharelok_bongkar: row[col.sharelok_bongkar]?.trim() || null,
    customer: row[col.customer]?.trim() || '',
    pic: row[col.pic]?.trim() || null,
    no_pic: row[col.no_pic]?.trim() || null,
    nama_sopir: row[col.nama_sopir]?.trim() || null,
    jenis_truk: row[col.jenis_truk]?.trim() || null,
    no_polisi: row[col.no_polisi]?.trim() || null,
    no_supir: row[col.no_supir]?.trim() || null,
    armada: row[col.armada]?.trim() || null,
    unit_muatan: row[col.unit_muatan]?.trim() || null,
    base_harga: parseRupiah(row[col.base_harga] || '0'),
    harga_asuransi: row[col.harga_asuransi]?.trim() || null,
    pajak: row[col.pajak]?.trim() || null,
    nilai_pajak: parseRupiah(row[col.nilai_pajak] || '0'),
    harga_pengiriman: parseRupiah(row[col.harga_pengiriman] || '0'),
    total_harga: parseRupiah(row[col.total_harga] || '0'),
    status_muatan: row[col.status_muatan]?.trim() || 'Order Confirmed',
    tgl_bongkar: parseDate(row[col.tgl_bongkar] || ''),
    no_asuransi: row[col.no_asuransi]?.trim() || null,
    nilai_tanggungan_asuransi: parseRupiah(row[col.nilai_tanggungan_asuransi] || '0'),
    nilai_asuransi: parseRupiah(row[col.nilai_asuransi] || '0'),
    nilai_tanpa_asuransi: parseRupiah(row[col.nilai_tanpa_asuransi] || '0'),
    total_harga_pajak: parseRupiah(row[col.total_harga_pajak] || '0'),
    keterangan: row[col.keterangan]?.trim() || null,
    muatan: row[col.muatan]?.trim() || null,
    sn: row[col.sn]?.trim() || null,
    spk: row[col.spk]?.trim() || null,
  };
};

// Parse entire CSV file
export const parseCSVFile = (csvText: string): any[] => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const delimiter = ';'; // SJM CSV uses semicolon
  const headers = lines[0].split(delimiter);
  const rows: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(delimiter);
    if (row.length < 10) continue; // Skip incomplete rows
    
    const orderId = row[0]?.trim();
    if (!orderId || !orderId.startsWith('SJM.ID-')) continue; // Skip invalid rows
    
    try {
      const parsed = parseCSVRow(row, headers);
      rows.push(parsed);
    } catch (e) {
      console.error(`Error parsing row ${i}:`, e);
    }
  }
  
  return rows;
};
