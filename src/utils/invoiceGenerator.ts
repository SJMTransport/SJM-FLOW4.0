import { api } from '../api';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export async function generateInvoiceNo(date: Date): Promise<string> {
  const lastSeq = await api.getLastInvoiceNo();
  const nextSeq = lastSeq + 1;
  const month = ROMAN[date.getMonth()];
  const year = date.getFullYear();
  return `${String(nextSeq).padStart(4, '0')}/INV-SJM/${month}/${year}`;
}
