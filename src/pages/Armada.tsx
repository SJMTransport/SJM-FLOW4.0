import React, { useState } from "react";
import { C } from "@/src/constants";
import { Card, SectionHeader, EmptyState, statusBadge, useConfirm } from "@/src/components/SJMComponents";
import { api } from "@/src/api";

export const ArmadaPage = ({ activeSub, armada, setArmada, dokumen, setDokumen, service, setService, sopir, setSopir, onArmadaClick }: any) => {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showSopirModal, setShowSopirModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [item, setItem] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const { confirm, Modal: ConfirmModal } = useConfirm();

  const save = async () => {
    setErr("");
    if (!item.no_polisi?.trim()) return setErr("Nomor polisi wajib diisi");
    setSaving(true);
    try {
      if (editing) {
        await api.updateArmada(editing.id, item);
        setArmada((prev: any[]) => prev.map(x => x.id === editing.id ? { ...x, ...item } : x));
      } else {
        const res = await api.addArmada(item);
        setArmada((prev: any[]) => [...prev, res[0] ?? res]);
      }
      setShowModal(false); setEditing(null); setItem({});
    } catch (e: any) { setErr("Gagal simpan: " + e.message); }
    setSaving(false);
  };

  const saveDoc = async () => {
    setErr("");
    if (!item.no_polisi) return setErr("Pilih unit armada");
    if (!item.nama_dokumen) return setErr("Pilih jenis dokumen");
    if (!item.tgl_expired) return setErr("Tanggal expired wajib diisi");
    setSaving(true);
    try {
      if (editingDoc) {
        await api.updateArmadaDokumen(editingDoc.id, item);
        setDokumen((prev: any[]) => prev.map(x => x.id === editingDoc.id ? { ...x, ...item } : x));
      } else {
        const res = await api.addArmadaDokumen(item);
        setDokumen((prev: any[]) => [...prev, res[0] ?? res]);
      }
      setShowDocModal(false); setEditingDoc(null); setItem({});
    } catch (e: any) { setErr("Gagal simpan: " + e.message); }
    setSaving(false);
  };

  const saveService = async () => {
    setErr("");
    if (!item.no_polisi) return setErr("Pilih unit armada");
    if (!item.jenis_service?.trim()) return setErr("Jenis service wajib diisi");
    if (!item.tgl_service) return setErr("Tanggal service wajib diisi");
    setSaving(true);
    try {
      const res = await api.addArmadaService(item);
      setService?.((prev: any[]) => [res[0] ?? res, ...prev]);
      setShowServiceModal(false); setItem({});
    } catch (e: any) { setErr("Gagal simpan: " + e.message); }
    setSaving(false);
  };

  const saveSopir = async () => {
    setErr("");
    if (!item.nama?.trim()) return setErr("Nama sopir wajib diisi");
    setSaving(true);
    try {
      const res = await api.addSopir(item);
      setSopir?.((prev: any[]) => [...prev, res[0] ?? res]);
      setShowSopirModal(false); setItem({});
    } catch (e: any) { setErr("Gagal simpan: " + e.message); }
    setSaving(false);
  };

  const deleteDoc = (doc: any) => {
    confirm({
      title: "Hapus Dokumen",
      msg: `Hapus dokumen "${doc.nama_dokumen}" untuk ${doc.no_polisi}?`,
      confirmLabel: "Hapus",
      onConfirm: async () => {
        try {
          await api.deleteArmadaDokumen(doc.id);
          setDokumen((prev: any[]) => prev.filter(x => x.id !== doc.id));
        } catch (e: any) { alert("Gagal hapus: " + e.message); }
      }
    });
  };

  const openDocModal = (doc?: any) => {
    setErr("");
    if (doc) { setEditingDoc(doc); setItem(doc); }
    else { setEditingDoc(null); setItem({}); }
    setShowDocModal(true);
  };

  // ── UNIT ──────────────────────────────────────────────────────────────
  if (activeSub === "unit") {
    const filtered = (armada || []).filter((a: any) =>
      !search || a.no_polisi?.toLowerCase().includes(search.toLowerCase()) || a.merk?.toLowerCase().includes(search.toLowerCase())
    );
    return (
      <div className="fade-up">
        <ConfirmModal />
        <SectionHeader title="Armada" sub={`${armada.length} unit terdaftar`}
          action={<button className="btn-primary" onClick={() => { setEditing(null); setItem({}); setErr(""); setShowModal(true); }}>+ Tambah Unit</button>} />
        <div style={{ marginBottom: 16 }}>
          <input className="input-field" placeholder="○ Cari no polisi atau merk..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Card style={{ padding: 0 }}>
          <div style={{ maxHeight: "calc(100vh - 280px)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>NO POLISI</th>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>NAMA ARMADA</th>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>JENIS</th>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>MERK</th>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>TAHUN</th>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>KEPEMILIKAN</th>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>STATUS</th>
                  <th style={{ padding: "12px 16px", textAlign: "center" }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <EmptyState colSpan={8} />}
                {filtered.map((r: any) => (
                  <tr key={r.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: C.accent }}>{r.no_polisi}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                      <button onClick={() => onArmadaClick(r.no_polisi)} style={{ background: "none", border: "none", padding: 0, fontWeight: 700, color: C.text, cursor: "pointer" }}>
                        {r.nama_armada || "—"}
                      </button>
                    </td>
                    <td style={{ padding: "12px 16px" }}>{r.jenis}</td>
                    <td style={{ padding: "12px 16px" }}>{r.merk}</td>
                    <td style={{ padding: "12px 16px" }}>{r.tahun}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ border: `1px solid ${C.blue}`, color: C.blue, padding: "2px 6px", borderRadius: 4, fontSize: 10 }}>{r.kepemilikan || "SJM"}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>{statusBadge(r.status || "Aktif")}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => { setEditing(r); setItem(r); setErr(""); setShowModal(true); }}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {showModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100, display: "flex", justifyContent: "center", alignItems: "center" }}
            onClick={() => setShowModal(false)}>
            <div className="fade-up" style={{ width: 450, background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{editing ? "Edit Unit Armada" : "Tambah Unit Armada"}</div>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Nomor Polisi *</div>
                  <input className="input-field" value={item.no_polisi || ""} onChange={e => setItem({ ...item, no_polisi: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Nama Armada</div>
                  <input className="input-field" value={item.nama_armada || ""} onChange={e => setItem({ ...item, nama_armada: e.target.value })} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Jenis</div>
                    <input className="input-field" value={item.jenis || ""} onChange={e => setItem({ ...item, jenis: e.target.value })} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Merk</div>
                    <input className="input-field" value={item.merk || ""} onChange={e => setItem({ ...item, merk: e.target.value })} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Tahun</div>
                    <input className="input-field" type="number" value={item.tahun || ""} onChange={e => setItem({ ...item, tahun: e.target.value })} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Kepemilikan</div>
                    <select className="input-field" value={item.kepemilikan || "SJM"} onChange={e => setItem({ ...item, kepemilikan: e.target.value })}>
                      <option value="SJM">SJM</option>
                      <option value="Vendor">Vendor</option>
                      <option value="Sewa">Sewa</option>
                    </select>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Status</div>
                  <select className="input-field" value={item.status || "Aktif"} onChange={e => setItem({ ...item, status: e.target.value })}>
                    <option value="Aktif">Aktif</option>
                    <option value="Tidak Aktif">Tidak Aktif</option>
                    <option value="Dalam Perbaikan">Dalam Perbaikan</option>
                  </select>
                </div>
              </div>
              {err && <div style={{ color: C.red, fontSize: 12, marginTop: 10 }}>{err}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                <button className="btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
                <button className="btn-primary" onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── DOKUMEN ───────────────────────────────────────────────────────────
  if (activeSub === "dokumen") {
    const filtered = (dokumen || []).filter((d: any) =>
      !search || d.no_polisi?.toLowerCase().includes(search.toLowerCase()) || d.nama_dokumen?.toLowerCase().includes(search.toLowerCase())
    );
    return (
      <div className="fade-up">
        <ConfirmModal />
        <SectionHeader title="Dokumen Armada" sub="Tracking STNK, KIR, Izin, dll"
          action={<button className="btn-primary" onClick={() => openDocModal()}>+ Register Dokumen</button>} />
        <div style={{ marginBottom: 16 }}>
          <input className="input-field" placeholder="○ Cari unit atau nama dokumen..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Card style={{ padding: 0 }}>
          <div style={{ maxHeight: "calc(100vh - 280px)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>UNIT</th>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>NAMA DOKUMEN</th>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>TGL EXPIRED</th>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>STATUS</th>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>KETERANGAN</th>
                  <th style={{ padding: "12px 16px", textAlign: "center" }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <EmptyState colSpan={6} />}
                {filtered.map((r: any) => {
                  const isExp = new Date(r.tgl_expired) < new Date();
                  const daysLeft = Math.ceil((new Date(r.tgl_expired).getTime() - Date.now()) / 86400000);
                  return (
                    <tr key={r.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700 }}>{r.no_polisi}</td>
                      <td style={{ padding: "12px 16px" }}>{r.nama_dokumen}</td>
                      <td style={{ padding: "12px 16px", color: isExp ? C.red : daysLeft < 30 ? C.yellow : C.text, fontWeight: isExp || daysLeft < 30 ? 700 : 400 }}>
                        {r.tgl_expired}
                        {!isExp && daysLeft < 30 && <span style={{ fontSize: 10, marginLeft: 6, color: C.yellow }}>({daysLeft}hr lagi)</span>}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ background: isExp ? C.redLight : C.greenLight, color: isExp ? C.red : C.green, padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>
                          {isExp ? "Expired" : "OK"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: C.textLight }}>{r.keterangan || "—"}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center", display: "flex", gap: 6, justifyContent: "center" }}>
                        <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => openDocModal(r)}>Edit</button>
                        <button onClick={() => deleteDoc(r)} style={{ fontSize: 11, padding: "4px 8px", border: "none", background: C.redLight, color: C.red, borderRadius: 5, cursor: "pointer" }}>Hapus</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {showDocModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100, display: "flex", justifyContent: "center", alignItems: "center" }}
            onClick={() => setShowDocModal(false)}>
            <div className="fade-up" style={{ width: 400, background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{editingDoc ? "Edit Dokumen" : "Register Dokumen Baru"}</div>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Unit Armada *</div>
                  <select className="input-field" value={item.no_polisi || ""} onChange={e => setItem({ ...item, no_polisi: e.target.value })}>
                    <option value="">— Pilih Unit —</option>
                    {armada.map((a: any) => <option key={a.id} value={a.no_polisi}>{a.no_polisi} — {a.nama_armada}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Nama Dokumen *</div>
                  <select className="input-field" value={item.nama_dokumen || ""} onChange={e => setItem({ ...item, nama_dokumen: e.target.value })}>
                    <option value="">— Pilih Jenis —</option>
                    {["STNK", "KIR", "SIPA", "IBM", "ASURANSI", "SIM", "Lainnya"].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Tanggal Expired *</div>
                  <input className="input-field" type="date" value={item.tgl_expired || ""} onChange={e => setItem({ ...item, tgl_expired: e.target.value })} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Keterangan</div>
                  <textarea className="input-field" style={{ height: 60 }} value={item.keterangan || ""} onChange={e => setItem({ ...item, keterangan: e.target.value })} />
                </div>
              </div>
              {err && <div style={{ color: C.red, fontSize: 12, marginTop: 10 }}>{err}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                <button className="btn-ghost" onClick={() => setShowDocModal(false)}>Batal</button>
                <button className="btn-primary" onClick={saveDoc} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Dokumen"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── SERVICE ───────────────────────────────────────────────────────────
  if (activeSub === "service") {
    const filtered = (service || []).filter((s: any) =>
      !search || s.no_polisi?.toLowerCase().includes(search.toLowerCase()) || s.jenis_service?.toLowerCase().includes(search.toLowerCase())
    );
    return (
      <div className="fade-up">
        <SectionHeader title="Riwayat Service" sub="Maintenance rutin unit"
          action={<button className="btn-primary" onClick={() => { setItem({ tgl_service: new Date().toISOString().split("T")[0] }); setErr(""); setShowServiceModal(true); }}>+ Catat Service</button>} />
        <div style={{ marginBottom: 16 }}>
          <input className="input-field" placeholder="○ Cari unit atau jenis service..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>UNIT</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>TANGGAL</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>JENIS SERVICE</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>KM</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>BIAYA</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>KETERANGAN</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <EmptyState colSpan={6} />}
              {filtered.map((r: any) => (
                <tr key={r.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 16px", fontWeight: 700 }}>{r.no_polisi}</td>
                  <td style={{ padding: "12px 16px" }}>{r.tgl_service}</td>
                  <td style={{ padding: "12px 16px" }}>{r.jenis_service}</td>
                  <td style={{ padding: "12px 16px" }}>{r.km_terakhir?.toLocaleString()} km</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>
                    {r.biaya ? `Rp ${Number(r.biaya).toLocaleString("id-ID")}` : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", color: C.textLight }}>{r.keterangan || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {showServiceModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100, display: "flex", justifyContent: "center", alignItems: "center" }}
            onClick={() => setShowServiceModal(false)}>
            <div className="fade-up" style={{ width: 440, background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Catat Service</div>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Unit Armada *</div>
                  <select className="input-field" value={item.no_polisi || ""} onChange={e => setItem({ ...item, no_polisi: e.target.value })}>
                    <option value="">— Pilih Unit —</option>
                    {armada.map((a: any) => <option key={a.id} value={a.no_polisi}>{a.no_polisi} — {a.nama_armada}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Tanggal Service *</div>
                    <input className="input-field" type="date" value={item.tgl_service || ""} onChange={e => setItem({ ...item, tgl_service: e.target.value })} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>KM Terakhir</div>
                    <input className="input-field" type="number" placeholder="0" value={item.km_terakhir || ""} onChange={e => setItem({ ...item, km_terakhir: e.target.value })} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Jenis Service *</div>
                  <input className="input-field" placeholder="Contoh: Ganti Oli, Tune Up..." value={item.jenis_service || ""} onChange={e => setItem({ ...item, jenis_service: e.target.value })} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Bengkel</div>
                  <input className="input-field" placeholder="Nama bengkel" value={item.bengkel || ""} onChange={e => setItem({ ...item, bengkel: e.target.value })} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Biaya (Rp)</div>
                  <input className="input-field" type="number" placeholder="0" value={item.biaya || ""} onChange={e => setItem({ ...item, biaya: e.target.value })} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Keterangan</div>
                  <textarea className="input-field" style={{ height: 60 }} value={item.keterangan || ""} onChange={e => setItem({ ...item, keterangan: e.target.value })} />
                </div>
              </div>
              {err && <div style={{ color: C.red, fontSize: 12, marginTop: 10 }}>{err}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                <button className="btn-ghost" onClick={() => setShowServiceModal(false)}>Batal</button>
                <button className="btn-primary" onClick={saveService} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── SOPIR ─────────────────────────────────────────────────────────────
  if (activeSub === "sopir") {
    const filtered = (sopir || []).filter((s: any) => !search || s.nama?.toLowerCase().includes(search.toLowerCase()));
    return (
      <div className="fade-up">
        <SectionHeader title="Sopir" sub={`${sopir.length} sopir terdaftar`}
          action={<button className="btn-primary" onClick={() => { setItem({}); setErr(""); setShowSopirModal(true); }}>+ Tambah Sopir</button>} />
        <div style={{ marginBottom: 16 }}>
          <input className="input-field" placeholder="○ Cari nama sopir..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>NAMA</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>TELEPON</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>ALAMAT</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <EmptyState colSpan={4} />}
              {filtered.map((r: any) => (
                <tr key={r.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{r.nama}</td>
                  <td style={{ padding: "12px 16px" }}>{r.telepon || "—"}</td>
                  <td style={{ padding: "12px 16px", color: C.textLight }}>{r.alamat || "—"}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>{statusBadge(r.status || "Aktif")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {showSopirModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100, display: "flex", justifyContent: "center", alignItems: "center" }}
            onClick={() => setShowSopirModal(false)}>
            <div className="fade-up" style={{ width: 400, background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Tambah Sopir</div>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Nama *</div>
                  <input className="input-field" value={item.nama || ""} onChange={e => setItem({ ...item, nama: e.target.value })} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Telepon</div>
                  <input className="input-field" value={item.telepon || ""} onChange={e => setItem({ ...item, telepon: e.target.value })} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>Alamat</div>
                  <textarea className="input-field" style={{ height: 70 }} value={item.alamat || ""} onChange={e => setItem({ ...item, alamat: e.target.value })} />
                </div>
              </div>
              {err && <div style={{ color: C.red, fontSize: 12, marginTop: 10 }}>{err}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                <button className="btn-ghost" onClick={() => setShowSopirModal(false)}>Batal</button>
                <button className="btn-primary" onClick={saveSopir} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return <div className="fade-up" style={{ padding: 40, textAlign: "center", color: C.textLight }}>Fitur {activeSub} dalam pengembangan</div>;
};
