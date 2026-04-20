import React, { useState, useEffect } from "react";
import { C } from "@/src/constants";
import { Card, SectionHeader, EmptyState, statusBadge, useConfirm } from "@/src/components/SJMComponents";
import { fmt } from "@/src/utils";
import { api, authActions } from "@/src/api";

export const MasterPage = ({ activeSub, activeModule, coa, users, saldoAwal, setSaldoAwal, setCoa }: any) => {
  const [search, setSearch] = useState("");

  // ─── COA ────────────────────────────────────────────────────────────────
  if (activeSub === "coa") {
    return <CoaPage coa={coa} setCoa={setCoa} search={search} setSearch={setSearch} />;
  }

  // ─── SALDO AWAL ──────────────────────────────────────────────────────────
  if (activeSub === "saldoawal") {
    return <SaldoAwalPage coa={coa} saldoAwal={saldoAwal} setSaldoAwal={setSaldoAwal} />;
  }

  // ─── USERS ──────────────────────────────────────────────────────────────
  if (activeSub === "users") {
    return <UsersPage users={users} search={search} setSearch={setSearch} />;
  }

  // ─── PASSWORD ────────────────────────────────────────────────────────────
  if (activeSub === "password") {
    return <PasswordPage />;
  }

  return (
    <div className="fade-up" style={{ padding: 40, textAlign: "center", color: C.textLight }}>
      Fitur {activeSub} dalam pengembangan
    </div>
  );
};

// ── COA Page dengan + Tambah Akun fungsional ──────────────────────────────
const CoaPage = ({ coa, setCoa, search, setSearch }: any) => {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ kode: "", nama: "", kelompok: "", sub_kelompok: "", status: "Aktif" });

  const filtered = (coa || []).filter((c: any) =>
    !search || c.nama?.toLowerCase().includes(search.toLowerCase()) || c.kode?.toLowerCase().includes(search.toLowerCase())
  );

  const save = async () => {
    setErr("");
    if (!form.kode.trim()) return setErr("Kode akun wajib diisi");
    if (!form.nama.trim()) return setErr("Nama akun wajib diisi");
    if (!form.kelompok) return setErr("Kelompok wajib dipilih");
    setSaving(true);
    try {
      const res = await api.addCoa(form);
      setCoa((prev: any[]) => [...prev, res[0]].sort((a, b) => a.kode.localeCompare(b.kode)));
      setShowModal(false);
      setForm({ kode: "", nama: "", kelompok: "", sub_kelompok: "", status: "Aktif" });
    } catch (e: any) {
      setErr("Gagal simpan: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="fade-up">
      <SectionHeader title="Master COA" sub={`${coa.length} akun terdaftar`}
        action={<button className="btn-primary" onClick={() => { setShowModal(true); setErr(""); }}>+ Tambah Akun</button>} />
      <div style={{ marginBottom: 16 }}>
        <input className="input-field" placeholder="○ Cari kode atau nama akun..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>KODE</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>NAMA AKUN</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>KELOMPOK</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>SUB-KELOMPOK</th>
              <th style={{ padding: "12px 16px", textAlign: "center" }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <EmptyState colSpan={5} />}
            {filtered.map((r: any) => (
              <tr key={r.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "12px 16px", fontWeight: 700, color: C.accent }}>{r.kode}</td>
                <td style={{ padding: "12px 16px" }}>{r.nama}</td>
                <td style={{ padding: "12px 16px" }}>{r.kelompok}</td>
                <td style={{ padding: "12px 16px", color: C.textLight }}>{r.sub_kelompok}</td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>{statusBadge(r.status || "Aktif")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowModal(false)}>
          <div className="fade-up" style={{ width: 440, background: "#fff", borderRadius: 12, padding: 28, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Tambah Akun COA</div>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Kode Akun *</label>
                <input className="input-field" placeholder="Contoh: 111" value={form.kode} onChange={e => setForm(f => ({ ...f, kode: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Nama Akun *</label>
                <input className="input-field" placeholder="Contoh: Kas Tunai" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Kelompok *</label>
                <select className="input-field" value={form.kelompok} onChange={e => setForm(f => ({ ...f, kelompok: e.target.value }))}>
                  <option value="">— Pilih Kelompok —</option>
                  <option value="Aset">Aset</option>
                  <option value="Kewajiban">Kewajiban</option>
                  <option value="Ekuitas">Ekuitas</option>
                  <option value="Pendapatan">Pendapatan</option>
                  <option value="Beban">Beban</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Sub-Kelompok</label>
                <input className="input-field" placeholder="Contoh: Kas & Bank" value={form.sub_kelompok} onChange={e => setForm(f => ({ ...f, sub_kelompok: e.target.value }))} />
              </div>
            </div>
            {err && <div style={{ color: C.red, fontSize: 12, marginTop: 12 }}>{err}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button className="btn-primary" onClick={save} disabled={saving} style={{ flex: 1 }}>
                {saving ? "Menyimpan..." : "Simpan Akun"}
              </button>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Saldo Awal Page — fully controlled & saves to DB ─────────────────────
const SaldoAwalPage = ({ coa, saldoAwal, setSaldoAwal }: any) => {
  const [values, setValues] = useState<Record<string, { debit: string; kredit: string }>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  // Init controlled state dari saldoAwal data
  useEffect(() => {
    const init: Record<string, { debit: string; kredit: string }> = {};
    (coa || []).filter((c: any) => c.status === "Aktif").forEach((c: any) => {
      const sa = (saldoAwal || []).find((s: any) => s.coa_kode === c.kode);
      init[c.kode] = { debit: sa?.debit ? String(sa.debit) : "", kredit: sa?.kredit ? String(sa.kredit) : "" };
    });
    setValues(init);
  }, [coa, saldoAwal]);

  const handleChange = (kode: string, field: "debit" | "kredit", val: string) => {
    setValues(prev => ({ ...prev, [kode]: { ...prev[kode], [field]: val } }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveErr("");
    try {
      const rows = Object.entries(values)
        .filter(([, v]) => Number(v.debit) > 0 || Number(v.kredit) > 0)
        .map(([kode, v]) => ({
          coa_kode: kode,
          debit: Number(v.debit) || 0,
          kredit: Number(v.kredit) || 0,
        }));
      await api.upsertSaldoAwal(rows);
      const fresh = await api.getSaldoAwal();
      setSaldoAwal(fresh);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setSaved(false);
      setSaveErr("Gagal simpan: " + e.message);
    }
    setSaving(false);
  };

  const activeCoa = (coa || []).filter((c: any) => c.status === "Aktif");

  return (
    <div className="fade-up">
      <SectionHeader title="Saldo Awal" sub="Input saldo awal akun per periode"
        action={
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : saved ? "✓ Tersimpan" : "Simpan Saldo Awal"}
          </button>
        } />
      {saved && (
        <div style={{ background: C.greenLight, border: `1px solid ${C.green}`, borderRadius: 8, padding: "10px 16px", marginBottom: 16, color: C.green, fontSize: 13, fontWeight: 500 }}>
          ✓ Saldo awal berhasil disimpan
        </div>
      )}
      {saveErr && (
        <div style={{ background: C.redLight, border: `1px solid ${C.red}`, borderRadius: 8, padding: "10px 16px", marginBottom: 16, color: C.red, fontSize: 13 }}>
          {saveErr}
        </div>
      )}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>KODE</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>NAMA AKUN</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>DEBIT</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>KREDIT</th>
            </tr>
          </thead>
          <tbody>
            {activeCoa.map((c: any) => (
              <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "12px 16px", fontWeight: 600, color: C.accent }}>{c.kode}</td>
                <td style={{ padding: "12px 16px" }}>{c.nama}</td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    value={values[c.kode]?.debit || ""}
                    onChange={e => handleChange(c.kode, "debit", e.target.value)}
                    style={{ textAlign: "right", width: 150 }}
                    placeholder="0"
                  />
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    value={values[c.kode]?.kredit || ""}
                    onChange={e => handleChange(c.kode, "kredit", e.target.value)}
                    style={{ textAlign: "right", width: 150 }}
                    placeholder="0"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// ── Password Page — fully functional ──────────────────────────────────────
const PasswordPage = () => {
  const [form, setForm] = useState({ lama: "", baru: "", konfirmasi: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const submit = async () => {
    setErr(""); setOk(false);
    if (!form.lama) return setErr("Password lama wajib diisi");
    if (!form.baru || form.baru.length < 6) return setErr("Password baru minimal 6 karakter");
    if (form.baru !== form.konfirmasi) return setErr("Konfirmasi password tidak cocok");
    setSaving(true);
    try {
      await authActions.updatePassword(form.lama, form.baru);
      setOk(true);
      setForm({ lama: "", baru: "", konfirmasi: "" });
    } catch (e: any) {
      setErr(e.message || "Gagal update password");
    }
    setSaving(false);
  };

  return (
    <div className="fade-up" style={{ maxWidth: 400, margin: "0 auto" }}>
      <SectionHeader title="Ganti Password" sub="Keamanan akun" />
      <Card>
        {ok && (
          <div style={{ background: C.greenLight, border: `1px solid ${C.green}`, borderRadius: 7, padding: "10px 14px", marginBottom: 16, color: C.green, fontSize: 13 }}>
            ✓ Password berhasil diperbarui
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Password Lama</label>
          <input className="input-field" type="password" value={form.lama} onChange={e => setForm(f => ({ ...f, lama: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Password Baru</label>
          <input className="input-field" type="password" value={form.baru} onChange={e => setForm(f => ({ ...f, baru: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Konfirmasi Password Baru</label>
          <input className="input-field" type="password" value={form.konfirmasi}
            onChange={e => setForm(f => ({ ...f, konfirmasi: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        {err && <div style={{ color: C.red, fontSize: 12, marginBottom: 14 }}>{err}</div>}
        <button className="btn-primary" style={{ width: "100%" }} onClick={submit} disabled={saving}>
          {saving ? "Memperbarui..." : "Update Password"}
        </button>
      </Card>
    </div>
  );
};

// ── Users Page — dengan modal Undang User ─────────────────────────────────
const ROLES = ["Admin", "Keuangan", "Operasional", "Viewer"];

const UsersPage = ({ users, search, setSearch }: any) => {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({ nama: "", email: "", role: "Operasional", password: "" });

  const filtered = (users || []).filter((u: any) =>
    !search || u.nama?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const invite = async () => {
    setErr(""); setOk("");
    if (!form.nama.trim()) return setErr("Nama wajib diisi");
    if (!form.email.trim() || !form.email.includes("@")) return setErr("Email tidak valid");
    if (!form.password || form.password.length < 6) return setErr("Password minimal 6 karakter");
    if (!form.role) return setErr("Role wajib dipilih");
    setSaving(true);
    try {
      await authActions.inviteUser(form.email, form.nama, form.role, form.password);
      setOk(`User "${form.nama}" berhasil ditambahkan`);
      setForm({ nama: "", email: "", role: "Operasional", password: "" });
      setTimeout(() => { setShowModal(false); setOk(""); }, 2000);
    } catch (e: any) {
      setErr("Gagal: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="fade-up">
      <SectionHeader title="Manajemen User" sub={`${users?.length || 0} user terdaftar`}
        action={<button className="btn-primary" onClick={() => { setShowModal(true); setErr(""); setOk(""); }}>+ Undang User</button>} />
      <div style={{ marginBottom: 16 }}>
        <input className="input-field" placeholder="○ Cari nama atau email user..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>NAMA</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>EMAIL</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>ROLE</th>
              <th style={{ padding: "12px 16px", textAlign: "center" }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r: any) => (
              <tr key={r.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "12px 16px", fontWeight: 600 }}>{r.nama}</td>
                <td style={{ padding: "12px 16px", color: C.textLight }}>{r.email}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ background: C.accentLight, color: C.accent, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                    {r.role}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>{statusBadge(r.status || "Aktif")}</td>
              </tr>
            ))}
            {filtered.length === 0 && <EmptyState colSpan={4} />}
          </tbody>
        </table>
      </Card>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowModal(false)}>
          <div className="fade-up" style={{ width: 420, background: "#fff", borderRadius: 12, padding: 28, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Undang User Baru</div>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Nama Lengkap *</label>
                <input className="input-field" placeholder="Contoh: Budi Santoso" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Email *</label>
                <input className="input-field" type="email" placeholder="user@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Password Awal *</label>
                <input className="input-field" type="password" placeholder="Min. 6 karakter" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Role *</label>
                <select className="input-field" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div style={{ fontSize: 11, color: C.textLight, marginTop: 6 }}>
                  Admin: akses penuh · Keuangan: jurnal+laporan · Operasional: SO saja · Viewer: lihat saja
                </div>
              </div>
            </div>

            {err && (
              <div style={{ color: C.red, fontSize: 12, marginTop: 12, padding: "8px 12px", background: C.redLight, borderRadius: 6 }}>{err}</div>
            )}
            {ok && (
              <div style={{ color: C.green, fontSize: 12, marginTop: 12, padding: "8px 12px", background: C.greenLight, borderRadius: 6 }}>✓ {ok}</div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button className="btn-primary" onClick={invite} disabled={saving} style={{ flex: 1 }}>
                {saving ? "Menyimpan..." : "Tambahkan User"}
              </button>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
