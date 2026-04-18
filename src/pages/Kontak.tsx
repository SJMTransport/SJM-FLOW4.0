import React, { useState } from "react";
import { C } from "@/src/constants";
import { Card, SectionHeader, EmptyState, useConfirm } from "@/src/components/SJMComponents";
import { api } from "@/src/api";

export const KontakPage = ({ so, connected }: any) => {
  const { confirm: askConfirmKontak, Modal: ConfirmKontakModal } = useConfirm();
  const [tab, setTab] = useState("customer");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  
  const isCustomer = tab === "customer";

  const loadData = async () => {
    setLoading(true);
    try {
        const data = isCustomer ? await api.getCustomer() : await api.getVendor();
        setItems(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  React.useEffect(() => { loadData(); }, [tab]);

  const [form, setForm] = useState({ nama: "", telepon: "", email: "" });

  const save = async () => {
     try {
         if (editItem) {
             isCustomer ? await api.updateCustomer(editItem.id, form) : await api.updateVendor(editItem.id, form);
         } else {
             isCustomer ? await api.addCustomer(form) : await api.addVendor(form);
         }
         setShowForm(false);
         loadData();
     } catch (e) { console.error(e); }
  };

  const filtered = items.filter(x => 
    !search || x.nama?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-up">
      <ConfirmKontakModal />
      <SectionHeader title="Kontak" sub="Daftar customer dan vendor" 
        action={<button className="btn-primary" onClick={() => { setEditItem(null); setForm({nama:"", telepon:"", email:""}); setShowForm(true); }}>+ Tambah {isCustomer ? "Customer" : "Vendor"}</button>} />

      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 20 }}>
        {[["customer", "Customer"], ["vendor", "Vendor"]].map(([k, l]) => (
          <button key={k} className={`tab-btn ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <input className="input-field" placeholder={`○ Cari nama ${isCustomer ? "customer" : "vendor"}...`} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 20, maxWidth: 500 }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>{editItem ? "Edit" : "Tambah"} {isCustomer ? "Customer" : "Vendor"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input className="input-field" placeholder="Nama" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} />
            <input className="input-field" placeholder="Telepon" value={form.telepon} onChange={e => setForm(f => ({ ...f, telepon: e.target.value }))} />
            <input className="input-field" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-primary" onClick={save} style={{ flex: 1 }}>Simpan</button>
                <button className="btn-ghost" onClick={() => setShowForm(false)}>Batal</button>
            </div>
          </div>
        </Card>
      )}

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
           <thead>
              <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                 <th style={{ padding: "10px 14px", textAlign: "left" }}>Nama</th>
                 <th style={{ padding: "10px 14px", textAlign: "left" }}>Telepon</th>
                 <th style={{ padding: "10px 14px", textAlign: "left" }}>Email</th>
                 <th style={{ padding: "10px 14px", textAlign: "left" }}>Aksi</th>
              </tr>
           </thead>
           <tbody>
              {filtered.map(x => (
                <tr key={x.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                   <td style={{ padding: "10px 14px", fontWeight: 600 }}>{x.nama}</td>
                   <td style={{ padding: "10px 14px" }}>{x.telepon || "—"}</td>
                   <td style={{ padding: "10px 14px" }}>{x.email || "—"}</td>
                   <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => { setEditItem(x); setForm({nama:x.nama, telepon:x.telepon, email:x.email}); setShowForm(true); }} style={{ color: C.blue, background: "none", border: "none", cursor: "pointer", marginRight: 10 }}>Edit</button>
                   </td>
                </tr>
              ))}
              {filtered.length === 0 && <EmptyState colSpan={4} />}
           </tbody>
        </table>
      </Card>
    </div>
  );
};
