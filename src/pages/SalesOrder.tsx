import React, { useState, useMemo } from "react";
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

export const SalesOrderPage = ({ so, setSo, jurnal, customer, armada = [], sopir = [], connected, currentUser, onSOClick }: any) => {
  const canEdit = ["Admin", "Operasional"].includes(currentUser?.role);
  const [tab, setTab] = useState("list");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState({ mode: "all", month: new Date().getMonth(), year: new Date().getFullYear() });
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [err, setErr] = useState("");

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

  // FIX #25: Listen for edit event from SO detail modal
  React.useEffect(() => {
    const handler = (e: any) => { if (e.detail) openEdit(e.detail); };
    window.addEventListener("sjm:editSO", handler);
    return () => window.removeEventListener("sjm:editSO", handler);
  }, []);

  const openNew = async () => {
    const last = await api.getLastSONo();
    const newId = genSONo(last[0]?.order_id);
    setForm({ ...emptyForm, order_id: newId });
    setEditItem(null);
    setErr(""); // FIX #10: clear error setiap kali buka form baru
    setTab("form");
  };

  // FIX #10: clear error juga saat pindah tab
  const handleTabChange = (t: string) => {
    setErr("");
    setTab(t);
  };

  const submit = async (posted = false) => {
    setErr("");
    if (!form.order_id?.trim()) return setErr("Order ID wajib diisi");
    setSaving(true);
    try {
      const payload = {
        ...form,
        is_posted: posted,
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

  const filtered = useMemo(() =>
    filterByPeriod(so, period, "tgl_muat")
      .filter((s: any) => !search || s.order_id?.toLowerCase().includes(search.toLowerCase()) || s.customer?.toLowerCase().includes(search.toLowerCase()))
      .sort((a: any, b: any) => (b.order_id || "").localeCompare(a.order_id || "")),
    [so, period, search]
  );

  const statusCount: any = { "Order Confirmed": 0, Loading: 0, "On Going": 0, Arrived: 0, Completed: 0, Cancelled: 0 };
  filtered.forEach((x: any) => { if (statusCount[x.status_muatan] !== undefined) statusCount[x.status_muatan]++; });

  return (
    <div className="fade-up">
      <SectionHeader title="Sales Order" sub={`${so.length} SO tersimpan`}
        action={canEdit && <button className="btn-primary" onClick={openNew}>+ SO Baru</button>} />

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
            <StatCard label="On Going" value={`${(statusCount.Loading + statusCount["On Going"] + statusCount.Arrived)} aktif`} color={C.blue} />
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
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>TOTAL HARGA</th>
                    <th style={{ padding: "10px 14px", textAlign: "left" }}>STATUS</th>
                    {canEdit && <th style={{ padding: "10px 14px", textAlign: "center" }}>AKSI</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={canEdit ? 7 : 6} style={{ textAlign: "center", padding: 40, color: C.textLight }}>Belum ada data</td></tr>
                  )}
                  {filtered.map((s: any) => (
                    <tr key={s.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                      onClick={() => onSOClick && onSOClick(s.order_id)}>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 700, color: C.accent }}>{s.order_id}</div>
                        <div style={{ fontSize: 10, color: C.textLight, marginTop: 2, display: "flex", gap: 4 }}>
                          {jurnal.some((j: any) => j.no_so?.includes(s.order_id)) && (
                            <span style={{ background: C.greenLight, color: C.green, padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>Dijurnal</span>
                          )}
                          <span style={{ background: s.is_posted ? C.greenLight : C.bg, color: s.is_posted ? C.green : C.textLight, padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>
                            {s.is_posted ? "Posted" : "Draft"}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>{s.tgl_muat || s.tgl_order}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 500 }}>{s.customer}</td>
                      <td style={{ padding: "10px 14px", color: C.textMed, fontSize: 12 }}>
                        {s.lokasi_muat && s.lokasi_bongkar
                          ? `${s.lokasi_muat} → ${s.lokasi_bongkar}`
                          : s.lokasi_muat || s.lokasi_bongkar || "—"}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600 }}>
                        {s.total_harga_pajak ? fmt(s.total_harga_pajak) : s.total_harga ? fmt(s.total_harga) : "—"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ background: STATUS_BG[s.status_muatan], color: STATUS_COLOR[s.status_muatan], padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 500 }}>
                          {s.status_muatan}
                        </span>
                      </td>
                      {canEdit && (
                        <td style={{ padding: "10px 14px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
                          <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}
                            onClick={() => openEdit(s)}>
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === "form" && (
        <Card style={{ maxWidth: 700 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>{editItem ? "Update Sales Order" : "Input Sales Order Baru"}</div>

          {/* ── Identitas ── */}
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
              <input className="input-field" placeholder="Nomor invoice" value={form.no_invoice} onChange={e => F("no_invoice", e.target.value)} />
            </Field>
          </div>

          {/* ── Jadwal & Rute ── */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Jadwal & Rute</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Field label="Tanggal Order">
              <input type="date" className="input-field" value={form.tgl_order} onChange={e => F("tgl_order", e.target.value)} />
            </Field>
            <Field label="Tanggal Muat">
              <input type="date" className="input-field" value={form.tgl_muat} onChange={e => F("tgl_muat", e.target.value)} />
            </Field>
            <Field label="Lokasi Muat" span={2}>
              <input className="input-field" placeholder="Kota/alamat muat" value={form.lokasi_muat} onChange={e => F("lokasi_muat", e.target.value)} />
            </Field>
            <Field label="Lokasi Bongkar" span={2}>
              <input className="input-field" placeholder="Kota/alamat bongkar" value={form.lokasi_bongkar} onChange={e => F("lokasi_bongkar", e.target.value)} />
            </Field>
          </div>

          {/* ── Armada ── */}
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
            <Field label="Jenis Truk">
              <input className="input-field" value={form.jenis_truk} onChange={e => F("jenis_truk", e.target.value)} />
            </Field>
          </div>

          {/* ── Harga ── */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Harga</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Field label="Total Harga">
              <input className="input-field" type="number" placeholder="0" value={form.total_harga} onChange={e => F("total_harga", e.target.value)} style={{ textAlign: "right" }} />
            </Field>
            <Field label="Total + Pajak">
              <input className="input-field" type="number" placeholder="0" value={form.total_harga_pajak} onChange={e => F("total_harga_pajak", e.target.value)} style={{ textAlign: "right" }} />
            </Field>
          </div>

          {/* ── Status & Dokumen ── */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Status & Dokumen</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Field label="Status Muatan">
              <select className="input-field" value={form.status_muatan} onChange={e => F("status_muatan", e.target.value)}>
                {STATUS_SO.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Link Bukti Muatan">
              <input className="input-field" placeholder="https://drive.google.com/..." value={form.bukti_muatan} onChange={e => F("bukti_muatan", e.target.value)} />
            </Field>
            <Field label="Link Surat Jalan" span={2}>
              <input className="input-field" placeholder="https://drive.google.com/..." value={form.surat_jalan} onChange={e => F("surat_jalan", e.target.value)} />
            </Field>
            <Field label="Keterangan" span={2}>
              <textarea className="input-field" style={{ height: 70 }} value={form.keterangan} onChange={e => F("keterangan", e.target.value)} />
            </Field>
          </div>

          {err && <div style={{ color: C.red, fontSize: 12, marginBottom: 14, padding: "8px 12px", background: C.redLight, borderRadius: 6 }}>{err}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-primary" onClick={() => submit(true)} disabled={saving} style={{ flex: 1 }}>
              {saving ? "Menyimpan..." : "Simpan & Posting"}
            </button>
            <button className="btn-ghost" onClick={() => submit(false)} disabled={saving} style={{ flex: 1 }}>
              Simpan Draft
            </button>
            <button className="btn-ghost" onClick={() => { setTab("list"); setErr(""); setEditItem(null); }}>Batal</button>
          </div>
        </Card>
      )}
    </div>
  );
};

// Export openEdit so App.tsx can call it from SO detail modal
export type { };
