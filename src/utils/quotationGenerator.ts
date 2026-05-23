import { api } from '../api';

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

export async function generateQuotationNo(date: Date): Promise<string> {
  const last = await api.getLastQuotationNo();
  const next = last + 1;
  const month = ROMAN[date.getMonth()];
  const year = date.getFullYear();
  return `${String(next).padStart(4, '0')}/QTN-SJM/${month}/${year}`;
}
