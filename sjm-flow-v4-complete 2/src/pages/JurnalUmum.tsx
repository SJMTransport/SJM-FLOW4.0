import React, { useState, useMemo } from "react";
import { C, STATUS_SO } from "@/src/constants";
import { fmt, genJUNo, today } from "@/src/utils";
import { Card, SectionHeader, DBBanner, Spinner, EmptyState, useConfirm, PeriodFilter } from "@/src/components/SJMComponents";
import { CurrencyInput } from "@/src/components/SJMModals";
import { api, supabase } from "@/src/api";

const filterByPeriod = (items: any[], period: any) => {
  if (period.mode === "all") return items;
  return items.filter(j => {
    if (!j.tanggal) return true;
    if (period.mode === "month") {
      const d = new Date(j.tanggal);
      return d.getMonth() === period.month && d.getFullYear() === period.year;
    }
    if (period.mode === "year") {
      const d = new Date(j.tanggal);
      return d.getFullYear() === period.year;
    }
    return true;
  });
};

export const JurnalUmum = ({ jurnal, setJurnal, coa, so, connected, currentUser, prefill, onPrefillUsed, onSOClick }: any) => {
  const { confirm: askConfirmJurnal, Modal: ConfirmJurnalModal } = useConfirm();
  const [tab, setTab] = useState("list");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState({ mode: "month", month: new Date().getMonth(), year: new Date().getFullYear() });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState<any>(null);
  const [editJurnalId, setEditJurnalId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ tanggal: today(), noJurnal: "", noBukti: "", keterangan: "", noSO: [], entries: [{ coa: "", akun: "", debit: "", kredit: "", no_so: "" }, { coa: "", akun: "", debit: "", kredit: "", no_so: "" }] });

  React.useEffect(() => {
    if (prefill) {
      setTab("input");
      setForm((f: any) => ({
        ...f,
        noSO: prefill.noSO ? (Array.isArray(prefill.noSO) ? prefill.noSO : [prefill.noSO]) : f.noSO,
        noBukti: prefill.noBukti || f.noBukti,
        keterangan: prefill.keterangan || f.keterangan,
      }));
      if (onPrefillUsed) onPrefillUsed();
    }
  }, [prefill]);

  const showToast = (msg: string, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const filtered = useMemo(() => {
    return filterByPeriod(jurnal, period).filter((j: any) =>
      j.keterangan?.toLowerCase().includes(search.toLowerCase()) ||
      j.no_jurnal?.toLowerCase().includes(search.toLowerCase()) ||
      (j.no_so || "").toLowerCase().includes(search.toLowerCase())
    ).sort((a: any, b: any) => (b.no_jurnal || "").localeCompare(a.no_jurnal || ""));
  }, [jurnal, period, search]);

  const totalD = form.entries.reduce((s: number, e: any) => s + (parseFloat(e.debit) || 0), 0);
  const totalK = form.entries.reduce((s: number, e: any) => s + (parseFloat(e.kredit) || 0), 0);
  const balanced = Math.abs(totalD - totalK) < 0.01 && totalD > 0;

  const updateEntry = (i: number, field: string, val: any) => {
    const entries = [...form.entries];
    if (field === "coa") {
      const found = coa.find((c: any) => c.kode === val);
      entries[i] = { ...entries[i], coa: val, akun: found ? found.nama : "" };
    } else {
      entries[i] = { ...entries[i], [field]: val };
    }
    setForm((f: any) => ({ ...f, entries }));
  };

  const submit = async () => {
    setErr("");
    if (!form.tanggal) return setErr("Tanggal wajib diisi");
    if (!form.keterangan.trim()) return setErr("Keterangan wajib diisi");
    for (let e of form.entries) if (!e.coa) return setErr("Semua akun harus dipilih");
    if (!balanced) return setErr("Total debit & kredit harus seimbang");

    setSaving(true);
    try {
      const t = form.tanggal;
      const nj = form.noJurnal || genJUNo(t, jurnal);
      const jurnalData = {
        no_jurnal: nj, tanggal: t, no_bukti: form.noBukti, keterangan: form.keterangan,
        no_so: form.noSO.join(", "), total_debit: totalD, total_kredit: totalK, status: "Posted",
        created_by: currentUser?.nama || "—"
      };
      let jurnalId;
      if (editJurnalId) {
        await api.updateJurnal(editJurnalId, jurnalData);
        await supabase.from("jurnal_detail").delete().eq("jurnal_id", editJurnalId);
        jurnalId = editJurnalId;
      } else {
        const res = await api.addJurnal(jurnalData);
        jurnalId = res[0].id;
      }
      await api.addJurnalDetail(form.entries.map((e: any) => ({
        jurnal_id: jurnalId, coa_kode: e.coa, nama_akun: e.akun,
        debit: parseFloat(e.debit) || 0, kredit: parseFloat(e.kredit) || 0,
        no_so: e.no_so || null
      })));
      const updated = await api.getJurnal();
      setJurnal(updated);
      setTab("list"); setEditJurnalId(null);
      showToast("Jurnal berhasil disimpan!");
    } catch (e: any) { setErr("Gagal simpan: " + e.message); }
    setSaving(false);
  };

  const grandD = filtered.reduce((s: number, j: any) => s + Number(j.total_debit || 0), 0);
  const grandK = filtered.reduce((s: number, j: any) => s + Number(j.total_kredit || 0), 0);

  return (
    <div className="fade-up">
      <ConfirmJurnalModal />
      <DBBanner connected={connected} />
      <SectionHeader title="Jurnal Umum" sub={`${jurnal.length} entri jurnal`}
        action={<button className="btn-primary" onClick={() => {
          setEditJurnalId(null); setErr("");
          setForm({ tanggal: today(), noJurnal: "", noBukti: "", keterangan: "", noSO: [], entries: [{ coa: "", akun: "", debit: "", kredit: "", no_so: "" }, { coa: "", akun: "", debit: "", kredit: "", no_so: "" }] });
          setTab("input");
        }}>+ Entri Baru</button>} />

      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 20 }}>
        {[["list", "Daftar Jurnal"], ["input", "Input Jurnal"]].map(([k, l]) => (
          <button key={k} className={`tab-btn ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "list" && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <PeriodFilter period={period} setPeriod={setPeriod} search={search} setSearch={setSearch} />
            </div>
          </div>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                    <th style={{ padding: "10px 14px", textAlign: "left" }}>Tanggal</th>
                    <th style={{ padding: "10px 14px", textAlign: "left" }}>No Jurnal</th>
                    <th style={{ padding: "10px 14px", textAlign: "left" }}>No SO</th>
                    <th style={{ padding: "10px 14px", textAlign: "left" }}>Keterangan / Akun</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Debit</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Kredit</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? <EmptyState msg="Belum ada jurnal" /> :
                    filtered.map((j: any) => {
                      const details = j.jurnal_detail || [];
                      return details.map((e: any, ei: number) => (
                        <tr key={`${j.id}-${ei}`} className="row-hover" style={{ borderBottom: ei === details.length - 1 ? `1px solid ${C.border}` : "none" }}>
                          {ei === 0 && <>
                            <td rowSpan={details.length} style={{ padding: "10px 14px", color: C.textMed }}>{j.tanggal}</td>
                            <td rowSpan={details.length} style={{ padding: "10px 14px" }}><span style={{ background: C.accentLight, color: C.accent, padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{j.no_jurnal}</span></td>
                            <td rowSpan={details.length} style={{ padding: "10px 14px" }}>
                                {j.no_so ? (j.no_so as string).split(",").map(s => (
                                    <span key={s} className="chip-so" style={{ marginRight: 4 }} onClick={() => onSOClick && onSOClick(s.trim())}>{s.trim()}</span>
                                )) : "—"}
                            </td>
                          </>}
                          <td style={{ padding: "8px 14px", paddingLeft: Number(e.kredit) > 0 ? 32 : 14 }}>
                            {ei === 0 && <div style={{ fontSize: 11, color: C.textLight, marginBottom: 2 }}>{j.keterangan}</div>}
                            <span style={{ color: Number(e.debit) > 0 ? C.text : C.textMed }}>{e.coa_kode} — {e.nama_akun}</span>
                          </td>
                          <td style={{ padding: "8px 14px", textAlign: "right", color: C.green }}>{Number(e.debit) > 0 ? fmt(e.debit) : ""}</td>
                          <td style={{ padding: "8px 14px", textAlign: "right", color: C.red }}>{Number(e.kredit) > 0 ? fmt(e.kredit) : ""}</td>
                        </tr>
                      ));
                    })}
                </tbody>
                <tfoot>
                  <tr style={{ background: C.bg }}>
                    <td colSpan={4} style={{ padding: "10px 14px", fontWeight: 700 }}>Total</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: C.green }}>{fmt(grandD)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: C.red }}>{fmt(grandK)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === "input" && (
        <Card style={{ maxWidth: 800 }}>
          <div style={{ fontSize: 18, color: C.text, marginBottom: 20 }}>Input Jurnal Umum</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Tanggal *</label>
              <input type="date" className="input-field" value={form.tanggal} onChange={e => setForm((f: any) => ({ ...f, tanggal: e.target.value }))} />
            </div>
            <div>
                <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Nomor Jurnal (Auto)</label>
                <input className="input-field" placeholder="JU/YYMMDD/001" value={form.noJurnal} onChange={e => setForm((f: any) => ({ ...f, noJurnal: e.target.value }))} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 11, color: C.textLight, fontWeight: 600, display: "block", marginBottom: 5 }}>Keterangan *</label>
              <input className="input-field" placeholder="Deskripsi transaksi..." value={form.keterangan} onChange={e => setForm((f: any) => ({ ...f, keterangan: e.target.value }))} />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1.2fr 1.2fr 28px", gap: 10, marginBottom: 8 }}>
              {["Pilih Akun", "Nama Akun", "Debit (Rp)", "Kredit (Rp)", ""].map(h => (
                <div key={h} style={{ fontSize: 11, color: C.textLight, fontWeight: 600 }}>{h}</div>
              ))}
            </div>
            {form.entries.map((e: any, i: number) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1.2fr 1.2fr 28px", gap: 10, marginBottom: 10 }}>
                <select className="input-field" value={e.coa} onChange={ev => updateEntry(i, "coa", ev.target.value)}>
                    <option value="">— Pilih Akun —</option>
                    {coa.map((c: any) => <option key={c.kode} value={c.kode}>{c.kode} · {c.nama}</option>)}
                </select>
                <input className="input-field" readOnly value={e.akun} style={{ background: C.bg }} />
                <CurrencyInput value={e.debit} onChange={(v: any) => updateEntry(i, "debit", v)} color={C.green} />
                <CurrencyInput value={e.kredit} onChange={(v: any) => updateEntry(i, "kredit", v)} color={C.red} />
                <button onClick={() => setForm((f: any) => ({ ...f, entries: f.entries.filter((_: any, idx: number) => idx !== i) }))} style={{ color: C.red, background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>×</button>
              </div>
            ))}
            <button className="btn-ghost" onClick={() => setForm((f: any) => ({ ...f, entries: [...f.entries, { coa: "", akun: "", debit: "", kredit: "", no_so: "" }] }))} style={{ width: "100%" }}>+ Tambah Baris Transaksi</button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, background: balanced ? C.greenLight : C.bg, borderRadius: 10, marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 40 }}>
              <div><div style={{ fontSize: 10, color: C.textLight, fontWeight: 600 }}>Total Debit</div><div style={{ fontWeight: 700, color: C.green }}>{fmt(totalD)}</div></div>
              <div><div style={{ fontSize: 10, color: C.textLight, fontWeight: 600 }}>Total Kredit</div><div style={{ fontWeight: 700, color: C.red }}>{fmt(totalK)}</div></div>
            </div>
            {balanced ? <span style={{ color: C.green, fontWeight: 700 }}>✓ Seimbang</span> : <span style={{ color: C.red, fontSize: 13 }}>✕ Belum Seimbang</span>}
          </div>

          {err && <div style={{ color: C.red, marginBottom: 14, fontSize: 13 }}>{err}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-primary" onClick={submit} disabled={saving} style={{ flex: 1 }}>{saving ? "Menyimpan..." : "Posting ke Jurnal"}</button>
            <button className="btn-ghost" onClick={() => setTab("list")}>Batal</button>
          </div>
        </Card>
      )}
    </div>
  );
};
