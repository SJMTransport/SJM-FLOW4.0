/**
 * Format number to Indonesian Rupiah with decimal and thousands separators
 * Format: Rp. xxx.xxx.xxx,00
 */
export const formatIDR = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'Rp.0,00';
  
  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `Rp.${formatter.format(num)}`;
};

/**
 * Clean IDR string back to number
 */
export const parseIDR = (str: string): number => {
  return parseFloat(str.replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
};
