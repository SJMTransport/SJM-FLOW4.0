const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

function _convert(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return SATUAN[n - 10] + ' belas';
  if (n < 100) {
    const r = n % 10;
    return SATUAN[Math.floor(n / 10)] + ' puluh' + (r ? ' ' + SATUAN[r] : '');
  }
  if (n < 200) {
    const r = n - 100;
    return 'seratus' + (r ? ' ' + _convert(r) : '');
  }
  if (n < 1_000) {
    const r = n % 100;
    return _convert(Math.floor(n / 100)) + ' ratus' + (r ? ' ' + _convert(r) : '');
  }
  if (n < 2_000) {
    const r = n - 1_000;
    return 'seribu' + (r ? ' ' + _convert(r) : '');
  }
  if (n < 1_000_000) {
    const r = n % 1_000;
    return _convert(Math.floor(n / 1_000)) + ' ribu' + (r ? ' ' + _convert(r) : '');
  }
  if (n < 1_000_000_000) {
    const r = n % 1_000_000;
    return _convert(Math.floor(n / 1_000_000)) + ' juta' + (r ? ' ' + _convert(r) : '');
  }
  const r = n % 1_000_000_000;
  return _convert(Math.floor(n / 1_000_000_000)) + ' miliar' + (r ? ' ' + _convert(r) : '');
}

export function terbilang(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return 'Nol Rupiah';
  const words = _convert(n).trim().replace(/\s+/g, ' ');
  return words.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Rupiah';
}
