export const fmt = (n: number | string) => {
  const val = typeof n === "string" ? parseFloat(n) : n;
  return "Rp " + (val || 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const fmtShort = (n: number | string) => {
  const val = typeof n === "string" ? parseFloat(n) : n;
  if (!val) return "Rp 0";
  if (val >= 1e9) return `Rp ${(val / 1e9).toFixed(1)}M`;
  if (val >= 1e6) return `Rp ${(val / 1e6).toFixed(1)}jt`;
  return "Rp " + val.toLocaleString("id-ID");
};

export const today = () => new Date().toISOString().split("T")[0];

export const genJUNo = (tanggal: string, jurnalList: any[]) => {
  const tgl = (tanggal || new Date().toISOString().slice(0,10)).replace(/-/g, "");
  const sameDay = (jurnalList||[]).filter(j => j.tanggal === tanggal);
  const seq = String(sameDay.length + 1).padStart(3, "0");
  return `JU/${tgl}/${seq}`;
};

export const filterByPeriod = (items: any[], period: any, dateField = "tanggal") => {
  if (period.mode === "all") return items;
  return items.filter(item => {
    const raw = item[dateField] || (dateField === "tgl_muat" ? item["tgl_order"] : null);
    if (!raw) return true;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return true;
    if (period.mode === "day") return raw.slice(0, 10) === (period.day || "");
    if (period.mode === "month") return d.getFullYear() === period.year && d.getMonth() === period.month;
    if (period.mode === "year") return d.getFullYear() === period.year;
    if (period.mode === "range") {
      const dateStr = raw.slice(0, 10);
      if (period.rangeFrom && dateStr < period.rangeFrom) return false;
      if (period.rangeTo && dateStr > period.rangeTo) return false;
      return true;
    }
    return true;
  });
};
