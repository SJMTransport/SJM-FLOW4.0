import React, { useState, useMemo } from "react";
import { C, STATUS_SO, STATUS_COLOR, STATUS_BG } from "@/src/constants";
import { fmt, fmtShort, filterByPeriod, today } from "@/src/utils";
import { Card, SectionHeader, StatCard, useConfirm, PeriodFilter } from "@/src/components/SJMComponents";
import { api } from "@/src/api";
import { CSVImportModal } from "@/src/components/CSVImportModal";

const genSONo = (last: string | undefined) => {
  const yr = new Date().getFullYear().toString().slice(-2);
  if (!last) return `SJM.ID-0.001.${yr}`;
  const m = last.match(/SJM\.ID-0\.(\d+)\./);
  const num = m ? parseInt(m[1]) + 1 : 1;
  return `SJM.ID-0.${String(num).padStart(3, "0")}.${yr}`;
};

export const SalesOrderPage = ({ so, setSo, customer, connected, currentUser, onSOClick }: any) => {
  const canEdit = ["Admin", "Operasional"].includes(currentUser?.role);
  const [tab, setTab] = useState("list");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState({ mode: "all", month: new Date().getMonth(), year: new Date().getFullYear() });
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [err, setErr] = useState("");
  const [showCSVImport, setShowCSVImport] = useState(false);
  
  const emptyForm = {
    order_id: "", customer: "", tgl_order: today(), tgl_muat: today(),
    lokasi_muat: "", lokasi_bongkar: "", status_muatan: "Order Confirmed",
    total_harga: 0, total_harga_pajak: 0
  };
  const [form, setForm] = useState<any>(emptyForm);

  const openNew = async () => {
    const last = await api.getLastSONo();
    const newId = genSONo(last[0]?.order_id);
    setForm({ ...emptyForm, order_id: newId });
    setEditItem(null); setErr(""); setTab("form");
  };

  const handleCSVImport = async (data: any[]) => {
    try {
      await api.bulkInsertSO(data);
      // Reload SO data
      const freshSO = await api.getSO();
      setSo(freshSO);
    } catch (e: any) {
      throw new Error("Gagal import: " + e.message);
    }
  };

  const submit = async () => {
    setErr("");
    if (!form.order_id?.trim()) return setErr("Order ID wajib diisi");
    setSaving(true);
    try {
      if (editItem) {
        await api.updateSO(editItem.id, form);
        setSo((s: any[]) => s.map(x => x.id === editItem.id ? { ...x, ...form } : x));
      } else {
        const res = await api.addSO(form);
        setSo((s: any[]) => [res[0], ...s]);
      }
      setTab("list"); setEditItem(null);
    } catch (e: any) { setErr("Gagal simpan: " + e.message); }
    setSaving(false);
  };

  const filtered = useMemo(() => {
    return filterByPeriod(so, period, "tgl_muat").filter((s: any) =>
      !search ||
      s.order_id?.toLowerCase().includes(search.toLowerCase()) ||
      s.customer?.toLowerCase().includes(search.toLowerCase())
    ).sort((a: any, b: any) => (b.order_id || "").localeCompare(a.order_id || ""));
  }, [so, period, search]);

  const statusCount: any = { "Order Confirmed": 0, Loading: 0, "On Going": 0, Arrived: 0, Completed: 0, Cancelled: 0 };
  filtered.forEach((x: any) => { if (statusCount[x.status_muatan] !== undefined) statusCount[x.status_muatan]++; });

  return (
    <div className="fade-up">
      <SectionHeader title="Sales Order" sub={`${so.length} SO tersimpan`}
        action={canEdit && (
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              className="btn-secondary" 
              onClick={() => setShowCSVImport(true)}
              style={{ background: "#10B981", color: "#fff", border: "none" }}
            >
              📤 Import CSV
            </button>
            <button className="btn-primary" onClick={openNew}>+ SO Baru</button>
          </div>
        )} />

      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 20 }}>
        {[["list", "Daftar SO"], canEdit && ["form", editItem ? "Edit SO" : "Input SO"]].filter(Boolean).map(([k, l]: any) => (
          <button key={k} className={`tab-btn ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "list" && (
        <>
          <PeriodFilter period={period} setPeriod={setPeriod} search={search} setSearch={setSearch} onAdd={canEdit ? openNew : null} />
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
            <StatCard label="Total SO" value={filtered.length} color={C.accent} icon="▤" />
            <StatCard label="Completed" value={statusCount.Completed || 0} color={C.green} icon="✓" />
            <StatCard label="Cancelled" value={statusCount.Cancelled || 0} color={C.red} icon="✕" />
          </div>

          <Card style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                  <th style={{ padding: "10px 14px", textAlign: "left" }}>Order ID</th>
                  <th style={{ padding: "10px 14px", textAlign: "left" }}>Tgl Order</th>
                  <th style={{ padding: "10px 14px", textAlign: "left" }}>Customer</th>
                  <th style={{ padding: "10px 14px", textAlign: "left" }}>Rute</th>
                  <th style={{ padding: "10px 14px", textAlign: "left" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => (
                  <tr key={s.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }} onClick={() => onSOClick && onSOClick(s.order_id)}>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: C.accent }}>{s.order_id}</td>
                    <td style={{ padding: "10px 14px" }}>{s.tgl_order}</td>
                    <td style={{ padding: "10px 14px" }}>{s.customer}</td>
                    <td style={{ padding: "10px 14px" }}>{s.lokasi_muat} → {s.lokasi_bongkar}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ background: STATUS_BG[s.status_muatan], color: STATUS_COLOR[s.status_muatan], padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 500 }}>{s.status_muatan}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab === "form" && (
        <Card style={{ maxWidth: 600 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>{editItem ? "Update Sales Order" : "Input Sales Order Baru"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
             <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Order ID *</label>
                <input className="input-field" value={form.order_id} onChange={e => setForm((f: any) => ({ ...f, order_id: e.target.value }))} />
             </div>
             <div>
                <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Customer</label>
                <select className="input-field" value={form.customer} onChange={e => setForm((f: any) => ({ ...f, customer: e.target.value }))}>
                   <option value="">— Pilih Customer —</option>
                   {customer.map((c: any) => <option key={c.id} value={c.nama}>{c.nama}</option>)}
                </select>
             </div>
             <div>
                <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Tanggal Order</label>
                <input type="date" className="input-field" value={form.tgl_order} onChange={e => setForm((f: any) => ({ ...f, tgl_order: e.target.value }))} />
             </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <button className="btn-primary" onClick={submit} disabled={saving} style={{ flex: 1 }}>{saving ? "Menyimpan..." : "Simpan SO"}</button>
            <button className="btn-ghost" onClick={() => setTab("list")}>Batal</button>
          </div>
        </Card>
      )}

      {/* CSV Import Modal */}
      {showCSVImport && (
        <CSVImportModal 
          onClose={() => setShowCSVImport(false)}
          onImport={handleCSVImport}
        />
      )}
    </div>
  );
};
