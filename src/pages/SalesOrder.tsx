import React, { useState, useMemo, useRef } from "react";
import { C, I, STATUS_SO, STATUS_COLOR, STATUS_BG } from "../constants";
import { fmt, fmtShort, filterByPeriod, today } from "@/src/utils";
import { Card, SectionHeader, StatCard, useConfirm, PeriodFilter, Icon } from "@/src/components/SJMComponents";
import { api } from "@/src/api";

const genSONo = (last: string | undefined) => {
  const yr = new Date().getFullYear().toString().slice(-2);
  if (!last) return `SJM.ID-0.001.${yr}`;
  const m = last.match(/SJM\.ID-0\.(\d+)\./);
  const num = m ? parseInt(m[1]) + 1 : 1;
  return `SJM.ID-0.${String(num).padStart(3, "0")}.${yr}`;
};

const Field = ({ label, children, span = 1 }: any) => (
  <div style={{ gridColumn: `span ${span}` }}>
    <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>{label}</label>
    {children}
  </div>
);

// ── Indonesian number parser for CSV ────────────────────────────────────
const parseRupiah = (v: string): number => {
  if (!v || v.trim() === "-" || v.trim() === "") return 0;
  let s = v.replace(/Rp/gi, "").replace(/\s/g, "");
  s = s.replace(/\./g, "").replace(",", ".");
  return parseFloat(s) || 0;
};

const parseIDDate = (v: string): string => {
  if (!v || v.trim() === "" || v.trim() === "-") return "";
  const MONTHS: Record<string, string> = {
    Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",
    Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12"
  };
  const p = v.trim().split("-");
  if (p.length === 3 && isNaN(Number(p[1]))) {
    return `${p[2]}-${MONTHS[p[1]] || "01"}-${p[0].padStart(2,"0")}`;
  }
  return v;
};

const parseCSV = (text: string): { headers: string[]; rows: any[] } => {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map(h => h.trim().replace(/"/g, ""));
  const rows = lines.slice(1).map(line => {
    const cells = line.split(sep).map(c => c.trim().replace(/"/g, ""));
    const obj: any = {};
    headers.forEach((h, i) => { obj[h] = cells[i] ?? ""; });
    return obj;
  }).filter(r => r[headers[0]]?.startsWith("SJM") || r["order_id"]?.startsWith("SJM"));
  return { headers, rows };
};

const mapCSVRow = (row: any): any => {
  const g = (keys: string[]) => {
    for (const k of keys) if (row[k] !== undefined) return row[k];
    return "";
  };
  return {
    order_id: g(["order_id","Order ID","No SO"]),
    no_invoice: g(["no_invoice","No Invoice"]) || null,
    customer: g(["customer","Customer","Nama Customer"]),
    tgl_order: parseIDDate(g(["tgl_order","Tgl Order","Tanggal Order"])),
    tgl_muat: parseIDDate(g(["tgl_muat","Tgl Muat","Tanggal Muat"])),
    tgl_bongkar: parseIDDate(g(["tgl_bongkar","Tgl Bongkar"])) || null,
    lokasi_muat: g(["lokasi_muat","Lokasi Muat"]),
    lokasi_bongkar: g(["lokasi_bongkar","Lokasi Bongkar"]),
    no_polisi: g(["no_polisi","No Polisi"]) || null,
    nama_sopir: g(["nama_sopir","Nama Sopir","Sopir"]) || null,
    jenis_truk: g(["jenis_truk","Jenis Truk"]) || null,
    status_muatan: g(["status_muatan","Status Muatan"]) || "Order Confirmed",
    total_harga: parseRupiah(g(["total_harga","Total Harga","Harga"])),
    total_harga_pajak: parseRupiah(g(["total_harga_pajak","Total + Pajak","Harga + Pajak"])),
    base_harga: parseRupiah(g(["base_harga","Base Harga","Modal"])),
    keterangan: g(["keterangan","Keterangan"]) || null,
    muatan: g(["muatan","Muatan"]) || null,
    is_posted: false,
  };
};

// ── CSV Import Modal ──────────────────────────────────────────────────────
const CSVImportModal = ({ onClose, onImport }: { onClose: () => void; onImport: (rows: any[]) => Promise<void> }) => {
  const [parsed, setParsed] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [err, setErr] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setErr("");
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const { rows } = parseCSV(text);
      if (!rows.length) { setErr("Tidak ada baris valid ditemukan. Pastikan format CSV benar."); return; }
      setParsed(rows.map(mapCSVRow));
    };
    reader.readAsText(file, "utf-8");
  };

  const doImport = async () => {
    if (!parsed.length) return;
    setImporting(true);
    setErr("");
    try {
      const BATCH = 50;
      for (let i = 0; i < parsed.length; i += BATCH) {
        await onImport(parsed.slice(i, i + BATCH));
        setProgress({ done: Math.min(i + BATCH, parsed.length), total: parsed.length });
      }
      onClose();
    } catch (e: any) {
      setErr("Gagal import: " + e.message);
    }
    setImporting(false);
  };

  const preview = parsed.slice(0, 6);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div className="fade-up" style={{ width: "100%", maxWidth: 760, background: "#fff", borderRadius: 12, boxShadow: "0 8px 40px rgba(0,0,0,0.18)", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Import Sales Order dari CSV</div>
            <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>Mendukung format file CSV dengan delimiter koma (,) atau titik koma (;)</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, color: C.textLight, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? C.accent : C.borderDark}`,
              borderRadius: 10, padding: "32px 20px", textAlign: "center",
              cursor: "pointer", background: isDragging ? C.accentLight : C.bg,
              transition: "all 150ms", marginBottom: 20
            }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
            {fileName
              ? <div style={{ fontWeight: 600, color: C.text }}>{fileName}<span style={{ marginLeft: 10, background: C.greenLight, color: C.green, fontSize: 11, padding: "2px 8px", borderRadius: 4 }}>{parsed.length} baris</span></div>
              : <>
                <div style={{ fontWeight: 600, fontSize: 14, color: C.text, marginBottom: 4 }}>Drag & drop file CSV di sini</div>
                <div style={{ fontSize: 12, color: C.textLight }}>atau klik untuk pilih file</div>
              </>
            }
            <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {/* Preview table */}
          {preview.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textMed, marginBottom: 8 }}>
                Preview ({preview.length} dari {parsed.length} baris)
              </div>
              <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["Order ID","Customer","Tgl Muat","Lokasi Muat","Lokasi Bongkar","Total Harga","Status"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: C.textLight, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "8px 10px", fontWeight: 700, color: C.accent }}>{r.order_id}</td>
                        <td style={{ padding: "8px 10px" }}>{r.customer}</td>
                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{r.tgl_muat}</td>
                        <td style={{ padding: "8px 10px", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.lokasi_muat}</td>
                        <td style={{ padding: "8px 10px", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.lokasi_bongkar}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>
                          {r.total_harga > 0 ? fmt(r.total_harga) : "—"}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{ background: STATUS_BG[r.status_muatan] || C.bg, color: STATUS_COLOR[r.status_muatan] || C.textMed, padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                            {r.status_muatan}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {err && <div style={{ background: C.redLight, color: C.red, padding: "10px 14px", borderRadius: 7, fontSize: 13, marginBottom: 12 }}>{err}</div>}

          {importing && progress.total > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textMed, marginBottom: 6 }}>
                <span>Mengimport...</span><span>{progress.done}/{progress.total}</span>
              </div>
              <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", background: C.accent, width: `${(progress.done / progress.total) * 100}%`, transition: "width 0.3s" }} />
              </div>
            </div>
          )}

          {/* Column mapping guide */}
          <div style={{ background: C.bg, borderRadius: 8, padding: "12px 16px", fontSize: 11, color: C.textMed }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: C.textLight }}>KOLOM YANG DIBACA OTOMATIS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "4px 16px" }}>
              {["order_id / Order ID","customer / Customer","tgl_muat / Tgl Muat","lokasi_muat / Lokasi Muat","lokasi_bongkar / Lokasi Bongkar","total_harga / Total Harga","no_polisi / No Polisi","nama_sopir / Nama Sopir","status_muatan / Status Muatan"].map(c => (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color: C.accent }}>·</span>{c}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
          <button className="btn-ghost" onClick={onClose} disabled={importing}>Batal</button>
          <button className="btn-primary" onClick={doImport} disabled={!parsed.length || importing}>
            {importing ? "Mengimport..." : `Import ${parsed.length} Baris`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main SalesOrder page ──────────────────────────────────────────────────
export const SalesOrderPage = ({ so, setSo, jurnal, customer, armada = [], sopir = [], connected, currentUser, onSOClick }: any) => {
  const canEdit = ["Admin", "Operasional"].includes(currentUser?.role);
  const [tab, setTab] = useState("list");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState({ mode: "all", month: new Date().getMonth(), year: new Date().getFullYear() });
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [err, setErr] = useState("");
  const [showCSV, setShowCSV] = useState(false);
  const { confirm, Modal: ConfirmModal } = useConfirm();

  const emptyForm = {
    order_id: "", customer: "", tgl_order: today(), tgl_muat: today(),
    lokasi_muat: "", lokasi_bongkar: "", status_muatan: "Order Confirmed",
    no_polisi: "", nama_sopir: "", jenis_truk: "",
    total_harga: "", total_harga_pajak: "", is_posted: false,
    bukti_muatan: "", surat_jalan: "", no_invoice: "", keterangan: "",
  };
  const [form, setForm] = useState<any>(emptyForm);
  const F = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }));

  const openEdit = (item: any) => {
    setForm({ ...emptyForm, ...item });
    setEditItem(item);
    setErr("");
    setTab("form");
  };

  React.useEffect(() => {
    const handler = (e: any) => { if (e.detail) openEdit(e.detail); };
    window.addEventListener("sjm:editSO", handler);
    return () => window.removeEventListener("sjm:editSO", handler);
  }, []);

  const openNew = async () => {
    const last = await api.getLastSONo();
    const newId = genSONo(last[0]?.order_id);
    setForm({ ...emptyForm, order_id: newId });
    setEditItem(null); setErr(""); setTab("form");
  };

  const handleTabChange = (t: string) => { setErr(""); setTab(t); };

  const submit = async (posted = false) => {
    setErr("");
    if (!form.order_id?.trim()) return setErr("Order ID wajib diisi");
    setSaving(true);
    try {
      const payload = {
        ...form, is_posted: posted,
        total_harga: parseFloat(form.total_harga) || 0,
        total_harga_pajak: parseFloat(form.total_harga_pajak) || 0,
      };
      if (editItem) {
        await api.updateSO(editItem.id, payload);
        setSo((s: any[]) => s.map(x => x.id === editItem.id ? { ...x, ...payload } : x));
      } else {
        const res = await api.addSO(payload);
        setSo((s: any[]) => [res[0], ...s]);
      }
      setTab("list"); setEditItem(null);
    } catch (e: any) { setErr("Gagal simpan: " + e.message); }
    setSaving(false);
  };

  // Hapus SO dengan double assessment
  const deleteSO = (item: any) => {
    confirm({
      title: "Hapus Sales Order",
      msg: `Hapus SO "${item.order_id}" — ${item.customer}? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: "Ya, Lanjutkan",
      confirmColor: C.textMed,
      onConfirm: () => {
        confirm({
          title: "Konfirmasi Terakhir",
          msg: `SO "${item.order_id}" akan dihapus permanen dari database. Pastikan tidak ada jurnal yang terkait.`,
          confirmLabel: "Hapus Permanen",
          confirmColor: C.red,
          onConfirm: async () => {
            try {
              await api.deleteSO(item.id);
              setSo((s: any[]) => s.filter(x => x.id !== item.id));
            } catch (e: any) { alert("Gagal hapus: " + e.message); }
          }
        });
      }
    });
  };

  const handleBulkImport = async (rows: any[]) => {
    const res = await api.addSOBulk(rows);
    setSo((prev: any[]) => [...res, ...prev]);
  };

  // Nilai dari jurnal untuk SO
  const soJurnalValue = useMemo(() => {
    const map: Record<string, number> = {};
    (jurnal || []).forEach((j: any) => {
      const soNos = (j.no_so || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      soNos.forEach((no: string) => {
        if (!map[no]) map[no] = 0;
        (j.jurnal_detail || []).forEach((d: any) => {
          // Pendapatan (kode 4xx) = nilai riil SO dari jurnal
          if (d.coa_kode?.startsWith("4")) map[no] += Number(d.kredit || 0);
        });
      });
    });
    return map;
  }, [jurnal]);

  const filtered = useMemo(() =>
    filterByPeriod(so, period, "tgl_muat")
      .filter((s: any) => !search ||
        s.order_id?.toLowerCase().includes(search.toLowerCase()) ||
        s.customer?.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a: any, b: any) => (b.order_id || "").localeCompare(a.order_id || "")),
    [so, period, search]
  );

  const statusCount: any = { "Order Confirmed": 0, Loading: 0, "On Going": 0, Arrived: 0, Completed: 0, Cancelled: 0 };
  filtered.forEach((x: any) => { if (statusCount[x.status_muatan] !== undefined) statusCount[x.status_muatan]++; });

  return (
    <div className="fade-up">
      <ConfirmModal />
      {showCSV && <CSVImportModal onClose={() => setShowCSV(false)} onImport={handleBulkImport} />}

      <SectionHeader title="Sales Order" sub={`${so.length} SO tersimpan`}
        action={canEdit && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" onClick={() => setShowCSV(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon d={I.download} size={13} /> Import CSV
            </button>
            <button className="btn-primary" onClick={openNew}>+ SO Baru</button>
          </div>
        )} />

      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 20 }}>
        {[["list", "Daftar SO"], canEdit && ["form", editItem ? "Edit SO" : "Input SO"]].filter(Boolean).map(([k, l]: any) => (
          <button key={k} className={`tab-btn ${tab === k ? "active" : ""}`} onClick={() => handleTabChange(k)}>{l}</button>
        ))}
      </div>

      {tab === "list" && (
        <>
          <PeriodFilter period={period} setPeriod={setPeriod} search={search} setSearch={setSearch} onAdd={canEdit ? openNew : null} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
            <StatCard label="Total SO" value={`${filtered.length} SO`} color={C.accent} />
            <StatCard label="Aktif" value={`${statusCount.Loading + statusCount["On Going"] + statusCount.Arrived} aktif`} color={C.blue} />
            <StatCard label="Completed" value={`${statusCount.Completed} selesai`} color={C.green} />
            <StatCard label="Cancelled" value={`${statusCount.Cancelled} dibatalkan`} color={C.red} />
          </div>

          <Card style={{ padding: 0 }}>
            <div style={{ maxHeight: "calc(100vh - 340px)", overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
                    <th style={{ padding: "10px 14px", textAlign: "left" }}>ORDER ID</th>
                    <th style={{ padding: "10px 14px", textAlign: "left" }}>TGL MUAT</th>
                    <th style={{ padding: "10px 14px", textAlign: "left" }}>CUSTOMER</th>
                    <th style={{ padding: "10px 14px", textAlign: "left" }}>RUTE</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>NILAI (JURNAL)</th>
                    <th style={{ padding: "10px 14px", textAlign: "left" }}>STATUS</th>
                    {canEdit && <th style={{ padding: "10px 14px", textAlign: "center" }}>AKSI</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={canEdit ? 7 : 6} style={{ textAlign: "center", padding: 40, color: C.textLight }}>Belum ada data</td></tr>
                  )}
                  {filtered.map((s: any) => {
                    // Ambil nilai dari jurnal dulu, fallback ke field SO
                    const nilaiJurnal = soJurnalValue[s.order_id] || 0;
                    const nilaiTampil = nilaiJurnal > 0 ? nilaiJurnal : (s.total_harga_pajak || s.total_harga || 0);
                    const dariJurnal = nilaiJurnal > 0;

                    return (
                      <tr key={s.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                        onClick={() => onSOClick && onSOClick(s.order_id)}>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ fontWeight: 700, color: C.accent }}>{s.order_id}</div>
                          <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                            <span style={{ background: s.is_posted ? C.greenLight : C.bg, color: s.is_posted ? C.green : C.textLight, fontSize: 10, padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>
                              {s.is_posted ? "Posted" : "Draft"}
                            </span>
                            {dariJurnal && <span style={{ background: C.blueLight, color: C.blue, fontSize: 10, padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>Dijurnal</span>}
                          </div>
                        </td>
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>{s.tgl_muat || s.tgl_order}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 500 }}>{s.customer}</td>
                        <td style={{ padding: "10px 14px", color: C.textMed, fontSize: 12, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.lokasi_muat && s.lokasi_bongkar ? `${s.lokasi_muat} → ${s.lokasi_bongkar}` : s.lokasi_muat || "—"}
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "right" }}>
                          <div style={{ fontWeight: 700, color: dariJurnal ? C.green : C.text }}>{nilaiTampil ? fmt(nilaiTampil) : "—"}</div>
                          {dariJurnal && <div style={{ fontSize: 10, color: C.textLight }}>dari jurnal</div>}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: STATUS_BG[s.status_muatan], color: STATUS_COLOR[s.status_muatan], padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 500 }}>
                            {s.status_muatan}
                          </span>
                        </td>
                        {canEdit && (
                          <td style={{ padding: "10px 14px", textAlign: "center", whiteSpace: "nowrap" }} onClick={e => e.stopPropagation()}>
                            <button className="btn-ghost" style={{ fontSize: 11, padding: "3px 8px", marginRight: 4 }} onClick={() => openEdit(s)}>Edit</button>
                            <button onClick={() => deleteSO(s)} style={{ fontSize: 11, padding: "3px 8px", border: "none", background: C.redLight, color: C.red, borderRadius: 5, cursor: "pointer" }}>Hapus</button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === "form" && (
        <Card style={{ maxWidth: 700 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>{editItem ? "Update Sales Order" : "Input Sales Order Baru"}</div>

          <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Identitas</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Field label="Order ID *" span={2}>
              <input className="input-field" value={form.order_id} onChange={e => F("order_id", e.target.value)} />
            </Field>
            <Field label="Customer">
              <select className="input-field" value={form.customer} onChange={e => F("customer", e.target.value)}>
                <option value="">— Pilih Customer —</option>
                {customer.map((c: any) => <option key={c.id} value={c.nama}>{c.nama}</option>)}
              </select>
            </Field>
            <Field label="No Invoice">
              <input className="input-field" value={form.no_invoice} onChange={e => F("no_invoice", e.target.value)} />
            </Field>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Jadwal & Rute</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Field label="Tanggal Order"><input type="date" className="input-field" value={form.tgl_order} onChange={e => F("tgl_order", e.target.value)} /></Field>
            <Field label="Tanggal Muat"><input type="date" className="input-field" value={form.tgl_muat} onChange={e => F("tgl_muat", e.target.value)} /></Field>
            <Field label="Lokasi Muat" span={2}><input className="input-field" value={form.lokasi_muat} onChange={e => F("lokasi_muat", e.target.value)} /></Field>
            <Field label="Lokasi Bongkar" span={2}><input className="input-field" value={form.lokasi_bongkar} onChange={e => F("lokasi_bongkar", e.target.value)} /></Field>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Armada</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Field label="No Polisi">
              <select className="input-field" value={form.no_polisi} onChange={e => {
                const a = armada.find((x: any) => x.no_polisi === e.target.value);
                F("no_polisi", e.target.value);
                if (a) F("jenis_truk", a.jenis || "");
              }}>
                <option value="">— Pilih Unit —</option>
                {armada.map((a: any) => <option key={a.id} value={a.no_polisi}>{a.no_polisi}</option>)}
              </select>
            </Field>
            <Field label="Sopir">
              <select className="input-field" value={form.nama_sopir} onChange={e => F("nama_sopir", e.target.value)}>
                <option value="">— Pilih Sopir —</option>
                {sopir.map((s: any) => <option key={s.id} value={s.nama}>{s.nama}</option>)}
              </select>
            </Field>
            <Field label="Jenis Truk"><input className="input-field" value={form.jenis_truk} onChange={e => F("jenis_truk", e.target.value)} /></Field>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Harga</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Field label="Total Harga">
              <input className="input-field" type="number" placeholder="0" value={form.total_harga} onChange={e => F("total_harga", e.target.value)} style={{ textAlign: "right" }} />
            </Field>
            <Field label="Total + Pajak">
              <input className="input-field" type="number" placeholder="0" value={form.total_harga_pajak} onChange={e => F("total_harga_pajak", e.target.value)} style={{ textAlign: "right" }} />
            </Field>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Status & Dokumen</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
            <Field label="Status Muatan">
              <select className="input-field" value={form.status_muatan} onChange={e => F("status_muatan", e.target.value)}>
                {STATUS_SO.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Link Bukti Muatan"><input className="input-field" placeholder="https://..." value={form.bukti_muatan} onChange={e => F("bukti_muatan", e.target.value)} /></Field>
            <Field label="Link Surat Jalan" span={2}><input className="input-field" placeholder="https://..." value={form.surat_jalan} onChange={e => F("surat_jalan", e.target.value)} /></Field>
            <Field label="Keterangan" span={2}><textarea className="input-field" style={{ height: 70 }} value={form.keterangan} onChange={e => F("keterangan", e.target.value)} /></Field>
          </div>

          {err && <div style={{ color: C.red, fontSize: 12, marginBottom: 14, padding: "8px 12px", background: C.redLight, borderRadius: 6 }}>{err}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-primary" onClick={() => submit(true)} disabled={saving} style={{ flex: 1 }}>{saving ? "Menyimpan..." : "Simpan & Posting"}</button>
            <button className="btn-ghost" onClick={() => submit(false)} disabled={saving} style={{ flex: 1 }}>Simpan Draft</button>
            <button className="btn-ghost" onClick={() => { setTab("list"); setErr(""); setEditItem(null); }}>Batal</button>
          </div>
        </Card>
      )}
    </div>
  );
};
