import React, { useState } from "react";
import { C } from "@/src/constants";
import { Card, SectionHeader, EmptyState, statusBadge, useConfirm, useToast, Icon, PageShell, ActionBar } from "@/src/components/SJMComponents";
import { CurrencyInput } from "@/src/components/SJMModals";
import { fmt } from "@/src/utils";
import { api, authActions } from "@/src/api";
import { buildMeta } from "@/src/lib/activityLogger";

export const MasterPage = ({ activeSub, coa, setCoa, users, setUsers, saldoAwal, setSaldoAwal, logAction }: any) => {
  const { showToast, ToastUI } = useToast();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState<any>(null); // 'coa', 'user', 'password'
  const [form, setForm] = useState<any>({});
  const [saChanges, setSaChanges] = useState<any>({});
  const { confirm, Modal: ModalUI } = useConfirm();

  const deleteCoa = async (id: string, name: string) => {
    const oldCoa = (coa || []).find((c: any) => c.id === id);
    confirm({
      title: "Hapus Akun COA",
      msg: `Apakah Anda yakin ingin menghapus akun ${name}?`,
      onConfirm: async () => {
        try {
          await api.deleteCoa(id);
          setCoa((prev: any[]) => prev.filter(x => x.id !== id));
          logAction(`Hapus COA: ${name}`, buildMeta({ module: 'coa', action_type: 'DELETE', record_id: name, before_data: oldCoa || { id } }));
          showToast("COA berhasil dihapus");
        } catch (e: any) {
            showToast(e.message, "error");
        }
      }
    });
  };

  const deleteUser = async (id: string, name: string) => {
    const oldUser = (users || []).find((u: any) => u.id === id);
    confirm({
      title: "Hapus User",
      msg: `Apakah Anda yakin ingin menghapus user ${name}?`,
      onConfirm: async () => {
        try {
          await authActions.deleteUser(id);
          setUsers((prev: any[]) => prev.filter(x => x.id !== id));
          logAction(`Hapus User: ${name}`, buildMeta({ module: 'auth', action_type: 'DELETE', record_id: name, before_data: oldUser || { id } }));
          showToast("User berhasil dihapus");
        } catch (e: any) {
            showToast(e.message, "error");
        }
      }
    });
  };

  const handleUpdateSaldo = async () => {
    if (Object.keys(saChanges).length === 0) return showToast("Tidak ada perubahan saldo", "info");
    setLoading(true);
    try {
      const rows = Object.entries(saChanges).map(([kode, val]: any) => ({
        coa_kode: kode,
        debit: parseFloat(val.debit) || 0,
        kredit: parseFloat(val.kredit) || 0
      }));
      await api.upsertSaldoAwal(rows);
      const updated = await api.getSaldoAwal();
      setSaldoAwal(updated);
      logAction(`Update Saldo Awal`, buildMeta({ module: 'coa', action_type: 'UPDATE', record_id: 'saldo_awal', after_data: { count: rows.length } }));
      setSaChanges({});
      showToast("Saldo awal berhasil diperbarui");
    } catch (e: any) { 
        showToast(e.message, "error"); 
    }
    setLoading(false);
  };

  const saveCoa = async () => {
    setLoading(true);
    try {
      if (form.id) {
        const oldCoa = (coa || []).find((c: any) => c.id === form.id);
        await api.updateCoa(form.id, form);
        setCoa((prev: any[]) => prev.map(x => x.id === form.id ? form : x));
        logAction(`Update COA: ${form.kode} - ${form.nama}`, buildMeta({ module: 'coa', action_type: 'UPDATE', record_id: `${form.kode} - ${form.nama}`, before_data: oldCoa || null, after_data: form }));
      } else {
        const res = await api.addCoa({ ...form, status: "Aktif" });
        setCoa((prev: any[]) => [...prev, res[0]]);
        logAction(`Add COA: ${form.kode} - ${form.nama}`, buildMeta({ module: 'coa', action_type: 'CREATE', record_id: `${form.kode} - ${form.nama}`, after_data: res[0] }));
      }
      setShowModal(null);
      showToast("Data COA disimpan");
    } catch (e: any) { 
        showToast(e.message, "error"); 
    }
    setLoading(false);
  };

  const saveUser = async () => {
    setLoading(true);
    try {
      const res = await authActions.inviteUser(form.username, form.nama, form.role, form.password);
      setUsers((prev: any[]) => [...prev, res]);
      logAction(`Invite User: ${form.username}`, buildMeta({ module: 'auth', action_type: 'CREATE', record_id: form.username, after_data: { role: form.role, nama: form.nama } }));
      setShowModal(null);
      showToast("User berhasil diundang");
    } catch (e: any) { 
        showToast(e.message, "error"); 
    }
    setLoading(false);
  };

  const updatePassword = async () => {
    if (form.new !== form.cnf) return showToast("Konfirmasi password tidak cocok", "error");
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      logAction(`Update Password`, buildMeta({ module: 'auth', action_type: 'UPDATE', record_id: 'password' }));
      showToast("Password berhasil diperbarui!");
      setForm({});
    } catch (e: any) { 
        showToast(e.message, "error"); 
    }
    setLoading(false);
  };

  if (activeSub === "coa") {
    const filtered = (coa || []).filter((c: any) => !search || c.nama?.toLowerCase().includes(search.toLowerCase()) || c.kode?.toLowerCase().includes(search.toLowerCase()));
    return (
      <PageShell>
        <ModalUI />
        <ToastUI />
        <SectionHeader
            title="Master COA"
            sub="Kelola bagan akun perkiraan standar akuntansi PT SJM"
            action={
                <button className="btn-primary" onClick={() => { setForm({}); setShowModal('coa'); }}>
                    <Icon name="Plus" size={14} /> Tambah Akun
                </button>
            }
        />

        <ActionBar left={
            <div className="relative">
                <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light opacity-50" />
                <input className="input-field h-10 pl-9 w-72 text-[12px]" placeholder="Cari kode atau nama akun..." value={search || ""} onChange={e => setSearch(e.target.value)} />
            </div>
        } />

        <Card className="p-0 border-border-main/40 overflow-hidden shadow-sm">
            <div className="overflow-auto max-h-[calc(100vh-360px)]">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th>Kode</th>
                            <th>Nama Akun</th>
                            <th>Klasifikasi</th>
                            <th>Kelompok</th>
                            <th>Sub-Kelompok</th>
                            <th className="text-center">Status</th>
                            <th className="text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? <EmptyState colSpan={7} /> :
                            filtered.map((r: any) => (
                                <tr key={r.id} className="group transition-colors">
                                                    <td className="font-black text-accent tabular-nums tracking-tighter text-[12px]">{r.kode}</td>
                                    <td className="font-bold text-text-main group-hover:text-accent transition-colors leading-tight text-[12px]">{r.nama}</td>
                                    <td>
                                        <span className="text-[10px] font-bold text-text-med bg-grey-100 px-2 py-0.5 rounded-md border border-border-main/20 italic">{r.klasifikasi || "Umum"}</span>
                                    </td>
                                    <td className="font-bold text-text-med text-[11px] opacity-70 italic">{r.kelompok}</td>
                                    <td className="font-medium text-text-light italic text-[11px]">{r.sub_kelompok || "—"}</td>
                                    <td className="text-center">{statusBadge(r.status || "Aktif")}</td>
                                    <td className="text-right">
                                        <div className="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 rounded-lg hover:bg-grey-100 text-text-med transition-colors" onClick={() => { setForm(r); setShowModal('coa'); }} title="Edit Akun">
                                                <Icon name="Edit3" size={14} />
                                            </button>
                                            <button className="p-1.5 rounded-lg hover:bg-red-brand/10 text-red-brand transition-colors" onClick={() => deleteCoa(r.id, r.nama)} title="Hapus Akun">
                                                <Icon name="Trash2" size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>
        </Card>

        {showModal === 'coa' && (
          <div className="fixed inset-0 bg-text-main/40 backdrop-blur-sm z-[1100] flex justify-center items-center p-4">
             <Card className="w-full max-w-[420px] p-6 animate-fade-up shadow-2xl relative">
                <button className="absolute top-5 right-5 text-text-light hover:text-text-main transition-colors" onClick={() => setShowModal(null)}>
                    <Icon name="X" size={18} />
                </button>
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border-main/40">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                        <Icon name="BookOpen" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-text-main tracking-tight uppercase leading-none">
                            {form.id ? 'Edit Akun' : 'Tambah Akun baru'}
                        </h3>
                        <p className="text-[9px] font-black text-text-light mt-1.5 tracking-widest uppercase opacity-60">Detail bagan akun (COA)</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Kode Akun</label>
                            <input className="input-field h-10 font-bold" placeholder="101.01" value={form.kode || ''} onChange={e => setForm({...form, kode: e.target.value})} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Nama Akun</label>
                            <input className="input-field h-10 font-bold" placeholder="Kas Kecil" value={form.nama || ''} onChange={e => setForm({...form, nama: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Kelompok Utama</label>
                            <select className="input-field h-10 font-bold appearance-none" value={form.kelompok || ''} onChange={e => setForm({...form, kelompok: e.target.value})}>
                                <option value="">— Pilih —</option>
                                <option value="Aset">Aset</option>
                                <option value="Liabilitas">Liabilitas</option>
                                <option value="Ekuitas">Ekuitas</option>
                                <option value="Pendapatan">Pendapatan</option>
                                <option value="Beban">Beban</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Klasifikasi</label>
                            <select className="input-field h-10 font-bold appearance-none" value={form.klasifikasi || ''} onChange={e => setForm({...form, klasifikasi: e.target.value})}>
                                <option value="">— Standar —</option>
                                <option value="Piutang">Piutang Usaha</option>
                                <option value="Hutang">Hutang Usaha</option>
                                <option value="Kas">Kas / Tunai</option>
                                <option value="Bank">Bank</option>
                                <option value="Aset Tetap">Aset Tetap</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Sub-Kelompok</label>
                        <input className="input-field h-10 font-bold" placeholder="Kas & Setara Kas" value={form.sub_kelompok || ''} onChange={e => setForm({...form, sub_kelompok: e.target.value})} />
                    </div>
                </div>

                <div className="flex flex-col gap-2 mt-8 pt-6 border-t border-border-main/40">
                    <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={saveCoa} disabled={loading}>
                       {loading ? <Icon name="Loader2" className="animate-spin" size={16} /> : <Icon name="Save" size={16} />}
                       {loading ? "Menyimpan..." : "Simpan Akun"}
                    </button>
                    <button className="h-10 text-[10px] font-black text-text-light uppercase tracking-widest hover:text-text-main transition-colors underline" onClick={() => setShowModal(null)}>Batal</button>
                </div>
             </Card>
          </div>
        )}
      </PageShell>
    );
  }

  if (activeSub === "saldoawal") {
    return (
      <PageShell>
        <ToastUI />
        <SectionHeader 
            title="Konfigurasi Saldo Awal" 
            sub="Pencatatan saldo pembukaan akun per periode akuntansi" 
            action={
                <button
                    className="btn-primary"
                    onClick={handleUpdateSaldo}
                    disabled={loading}
                >
                    <Icon name={loading ? "Loader2" : "Save"} size={14} className={loading ? "animate-spin" : ""} />
                    {loading ? "Menyimpan..." : "Update Saldo"}
                </button>
            } 
        />
        
        <Card className="p-0 overflow-hidden border-border-main/40 shadow-sm">
            <div className="overflow-auto max-h-[calc(100vh-320px)]">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th>Kode Akun</th>
                            <th>Nama Akun</th>
                            <th className="text-right">Saldo Debit (Rp)</th>
                            <th className="text-right">Saldo Kredit (Rp)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {coa.filter((c: any) => c.status === "Aktif").map((c: any) => {
                            const sa = saldoAwal.find((s: any) => s.coa_kode === c.kode);
                            const current = saChanges[c.kode] || { debit: sa?.debit || 0, kredit: sa?.kredit || 0 };
                            return (
                                <tr key={c.id} className="group transition-colors">
                                    <td className="font-black text-accent tabular-nums tracking-tighter text-[12px]">{c.kode}</td>
                                    <td className="font-bold text-text-main uppercase tracking-tight text-[12px] leading-none">{c.nama}</td>
                                    <td className="text-right">
                                        <div className="w-40 ml-auto scale-90 origin-right">
                                            <CurrencyInput 
                                                value={current.debit} 
                                                onChange={(v:any) => setSaChanges({...saChanges, [c.kode]: { ...current, debit: v }})} 
                                                color="#10B981"
                                                className="font-bold text-[13px]"
                                            />
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        <div className="w-40 ml-auto scale-90 origin-right">
                                            <CurrencyInput 
                                                value={current.kredit} 
                                                onChange={(v:any) => setSaChanges({...saChanges, [c.kode]: { ...current, kredit: v }})} 
                                                color="#EF4444"
                                                className="font-bold text-[13px]"
                                            />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
      </PageShell>
    );
  }

  if (activeSub === "users") {
    const filtered = (users || []).filter((u: any) => !search || u.nama?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));
    return (
      <PageShell>
        <ModalUI />
        <ToastUI />
        <SectionHeader
            title="Manajemen Pengguna"
            sub="Kelola akses dan hak istimewa akun internal SJM"
            action={
                <button className="btn-primary" onClick={() => { setForm({}); setShowModal('user'); }}>
                    <Icon name="UserPlus" size={16} /> Undang Staf
                </button>
            }
        />

        <ActionBar left={
            <div className="relative">
                <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light opacity-50" />
                <input className="input-field h-10 pl-9 w-72 text-[12px]" placeholder="Cari nama atau email..." value={search || ""} onChange={e => setSearch(e.target.value)} />
            </div>
        } />

        <Card className="p-0 border-border-main/40 overflow-hidden shadow-sm">
            <div className="overflow-auto max-h-[calc(100vh-360px)]">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th>Nama Pengguna</th>
                            <th>Alamat Email</th>
                            <th>Hak Akses / Role</th>
                            <th className="text-center">Status</th>
                            <th className="text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? <EmptyState colSpan={5} msg="Tidak ada pengguna ditemukan" /> :
                            filtered.map((r: any) => (
                                <tr key={r.id} className="group transition-colors">
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-brand/5 text-blue-brand flex items-center justify-center font-bold text-[10px] border border-blue-brand/10 shadow-sm italic">
                                                {r.nama?.[0]}
                                            </div>
                                            <div className="font-bold text-text-main group-hover:text-blue-brand transition-colors tracking-tight text-[12px]">{r.nama}</div>
                                        </div>
                                    </td>
                                    <td className="font-bold text-text-med italic text-[11px] opacity-60">{r.email}</td>
                                    <td>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold italic border ${
                                            r.role === "Admin" ? "bg-red-brand-light/40 border-red-brand/10 text-red-brand" :
                                            r.role === "Keuangan" ? "bg-green-brand-light/40 border-green-brand/10 text-green-brand" :
                                            r.role === "Operasional" ? "bg-blue-brand-light/40 border-blue-brand/10 text-blue-brand" : "bg-grey-100 border-border-main/10 text-text-light"
                                        }`}>
                                            {r.role}
                                        </span>
                                    </td>
                                    <td className="text-center">{statusBadge(r.status || "Aktif")}</td>
                                    <td className="text-right">
                                        <button className="p-1.5 rounded-lg hover:bg-red-brand/10 text-red-brand transition-colors opacity-40 group-hover:opacity-100" onClick={() => deleteUser(r.id, r.nama)} title="Nonaktifkan User">
                                            <Icon name="UserX" size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>
        </Card>

        {showModal === 'user' && (
          <div className="fixed inset-0 bg-text-main/40 backdrop-blur-sm z-[1100] flex justify-center items-center p-4">
             <Card className="w-full max-w-[420px] p-6 animate-fade-up shadow-2xl relative">
                <button className="absolute top-5 right-5 text-text-light hover:text-text-main transition-colors" onClick={() => setShowModal(null)}>
                    <Icon name="X" size={18} />
                </button>
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border-main/40">
                    <div className="w-10 h-10 rounded-xl bg-blue-brand/10 text-blue-brand flex items-center justify-center">
                        <Icon name="UserPlus" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-text-main tracking-tight uppercase leading-none">Undang Staf Baru</h3>
                        <p className="text-[9px] font-black text-text-light mt-1.5 tracking-widest uppercase opacity-60">Berikan hak akses internal sistem</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Nama Lengkap</label>
                        <input className="input-field h-10 font-bold" placeholder="John Doe" value={form.nama || ''} onChange={e => setForm({...form, nama: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-text-light px-1 opacity-60">ID Pengguna (Username)</label>
                        <div className="relative">
                            <input className="input-field h-10 pr-28 font-bold" placeholder="johndoe" value={form.username || ''} onChange={e => setForm({...form, username: e.target.value})} />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-text-light/30 italic">
                                @sjm.internal
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Hak Akses</label>
                            <select className="input-field h-10 font-bold appearance-none" value={form.role || ''} onChange={e => setForm({...form, role: e.target.value})}>
                                <option value="">— Pilih —</option>
                                <option value="Admin">Admin</option>
                                <option value="Keuangan">Keuangan</option>
                                <option value="Operasional">Operasional</option>
                                <option value="Viewer">Viewer</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-light px-1 opacity-60">Password</label>
                            <input className="input-field h-10 font-bold" type="password" placeholder="••••••••" value={form.password || ''} onChange={e => setForm({...form, password: e.target.value})} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2 mt-8 pt-6 border-t border-border-main/40">
                    <button className="btn-primary h-11 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-brand/20 flex items-center justify-center gap-2" onClick={saveUser} disabled={loading}>
                       {loading ? <Icon name="Loader2" className="animate-spin" size={16} /> : <Icon name="Zap" size={16} />}
                       {loading ? "Mengirim..." : "Kirim Undangan"}
                    </button>
                    <button className="h-10 text-[10px] font-black text-text-light uppercase tracking-widest hover:text-text-main transition-colors underline" onClick={() => setShowModal(null)}>Batal</button>
                </div>
             </Card>
          </div>
        )}
      </PageShell>
    );
  }

  if (activeSub === "password") {
    return (
      <PageShell>
        <div className="max-w-[500px] mx-auto">
        <ToastUI />
        <SectionHeader title="Keamanan" sub="Perbarui kredensial login Anda" />
        <Card className="p-8 space-y-5 shadow-2xl shadow-slate-200/50">
            <div className="space-y-1.5">
                <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Password Saat Ini</label>
                <div className="relative">
                    <Icon name="Lock" size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light opacity-30" />
                    <input className="input-field h-11 pl-11 font-bold" type="password" value={form.old || ''} onChange={e => setForm({...form, old: e.target.value})} />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Password Baru</label>
                    <input className="input-field h-11 font-bold" type="password" value={form.new || ''} onChange={e => setForm({...form, new: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Konfirmasi</label>
                    <input className="input-field h-11 font-bold" type="password" value={form.cnf || ''} onChange={e => setForm({...form, cnf: e.target.value})} />
                </div>
            </div>
            <button 
                className="btn-primary w-full h-12 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 mt-4" 
                onClick={updatePassword} 
                disabled={loading}
            >
                {loading ? <Icon name="Loader2" className="animate-spin" size={18} /> : <Icon name="ShieldCheck" size={18} />}
                {loading ? 'Sedang memperbarui...' : 'Simpan Kredensial Baru'}
            </button>
        </Card>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
        <SectionHeader title="Master Data" sub={`Menu ${activeSub}`} />
        <Card className="flex flex-col items-center justify-center p-20 text-center bg-slate-50/50 border-dashed border-2 border-border-main/50">
            <div className="w-20 h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center mb-6 border border-border-main/30">
                <Icon name="Database" size={32} className="text-text-light opacity-20" />
            </div>
            <h3 className="text-lg font-black text-text-main uppercase tracking-tight">Modul Master</h3>
            <p className="text-sm font-bold text-text-light mt-2 max-w-sm tracking-wide">
                Konfigurasi <span className="text-accent uppercase">{activeSub}</span> sedang disiapkan untuk mendukung operasional Anda.
            </p>
        </Card>
    </PageShell>
  );
};

