import React, { useState } from "react";
import { C } from "@/src/constants";
import { Card, SectionHeader, EmptyState, useConfirm, Icon, PageShell } from "@/src/components/SJMComponents";
import { api } from "@/src/api";

export const KontakPage = ({ so, connected }: any) => {
  const { confirm: askConfirmKontak, Modal: ConfirmKontakModal } = useConfirm();
  const [tab, setTab] = useState("customer");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  const isCustomer = tab === "customer";

  const loadData = async () => {
    setLoading(true);
    try {
        const data = isCustomer ? await api.getCustomer() : await api.getVendor();
        setItems(data || []);
    } catch (e) { 
        console.error("Gagal load data kontak:", e); 
    }
    setLoading(false);
  };

  React.useEffect(() => { 
    loadData(); 
  }, [tab]);

  const [form, setForm] = useState({ nama: "", telepon: "", email: "" });

  const save = async () => {
     if (!form.nama) return;
     setSaving(true);
     try {
         if (editItem) {
             isCustomer ? await api.updateCustomer(editItem.id, form) : await api.updateVendor(editItem.id, form);
         } else {
             isCustomer ? await api.addCustomer(form) : await api.addVendor(form);
         }
         setShowForm(false);
         loadData();
     } catch (e) { 
        console.error("Gagal simpan kontak:", e); 
     }
     setSaving(false);
  };

  const filtered = items.filter(x => 
    !search || x.nama?.toLowerCase().includes(search.toLowerCase()) || 
    x.id?.toLowerCase().includes(search.toLowerCase()) ||
    x.email?.toLowerCase().includes(search.toLowerCase()) ||
    x.telepon?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell>
      <ConfirmKontakModal />
      <SectionHeader 
        title="Direktori Kontak" 
        sub={`Kelola data ${tab} strategis PT SJM`} 
        action={
            <button 
                className="btn-primary flex items-center gap-2 px-4 py-1.5 text-[10px] uppercase tracking-widest" 
                onClick={() => { setEditItem(null); setForm({nama:"", telepon:"", email:""}); setShowForm(true); }}
            >
                <Icon name="Plus" size={14} /> Tambah {isCustomer ? "Customer" : "Vendor"}
            </button>
        } 
      />

      <div className="flex gap-4 border-b border-border-main pb-px">
        {[["customer", "Customer"], ["vendor", "Vendor"]].map(([k, l]) => (
          <button 
            key={k} 
            className={`px-4 py-2 text-[11px] font-black transition-all relative ${tab === k ? "text-accent" : "text-text-light hover:text-text-med"}`} 
            onClick={() => setTab(k)}
          >
            {l}
            {tab === k && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="w-full md:w-96 relative group">
            <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-accent transition-all duration-300 opacity-50" />
            <input 
                className="input-field pl-11 bg-slate-50 border-transparent focus:bg-white focus:border-accent" 
                placeholder={`Cari nama, email, atau telepon ${isCustomer ? "customer" : "vendor"}...`} 
                value={search || ""} 
                onChange={e => setSearch(e.target.value)} 
            />
          </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-text-main/40 backdrop-blur-sm z-[1100] flex justify-center items-center p-4">
            <Card className="w-full max-w-[420px] p-6 animate-fade-up shadow-2xl relative">
                <button className="absolute top-5 right-5 text-text-light hover:text-text-main transition-colors" onClick={() => setShowForm(false)}>
                    <Icon name="X" size={18} />
                </button>
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border-main/40">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                        <Icon name={isCustomer ? "Users" : "Building2"} size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-text-main tracking-tight uppercase leading-none">
                            {editItem ? "Edit" : "Tambah"} {isCustomer ? "Customer" : "Vendor"}
                        </h3>
                        <p className="text-[9px] font-black text-text-light mt-1.5 tracking-widest uppercase opacity-60">Lengkapi detail informasi kontak</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Nama Lengkap / Perusahaan</label>
                        <input className="input-field h-10 font-bold" placeholder="Masukkan nama..." value={form.nama || ""} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Nomor Telepon / WhatsApp</label>
                        <input className="input-field h-10 font-bold" placeholder="0812..." value={form.telepon || ""} onChange={e => setForm(f => ({ ...f, telepon: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Alamat Email Aktif</label>
                        <input className="input-field h-10 font-bold" type="email" placeholder="example@mail.com" value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                </div>

                <div className="flex flex-col gap-2 mt-8 pt-6 border-t border-border-main/40">
                    <button className="btn-primary h-11 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2" onClick={save} disabled={saving || !form.nama}>
                       {saving ? <Icon name="Loader2" className="animate-spin" size={16} /> : <Icon name="Save" size={16} />}
                       {saving ? "Menyimpan..." : editItem ? "Simpan Perubahan" : "Daftarkan Kontak"}
                    </button>
                    <button className="h-10 text-[10px] font-black text-text-light uppercase tracking-widest hover:text-text-main transition-colors underline" onClick={() => setShowForm(false)}>Batal</button>
                </div>
            </Card>
        </div>
      )}

      <Card className="p-0 overflow-hidden border-border-main/40">
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
            <thead>
                <tr className="bg-slate-50/50 border-b border-border-main/40 shadow-sm">
                    <th className="py-3 px-4 text-[10px] font-bold text-text-light text-left opacity-60">Nama / Entitas</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-text-light text-left opacity-60">Kontak Telepon</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-text-light text-left opacity-60">Email</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-text-light text-right opacity-60">Aksi</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border-main/20">
                {loading ? (
                    <tr>
                        <td colSpan={4} className="p-20 text-center">
                            <div className="flex flex-col items-center gap-3">
                                <Icon name="Loader2" className="animate-spin text-accent opacity-30" size={32} />
                                <span className="text-[9px] font-black text-text-light uppercase tracking-widest opacity-60">Memuat database...</span>
                            </div>
                        </td>
                    </tr>
                ) : filtered.length === 0 ? <EmptyState colSpan={4} msg={`Tidak ada ${tab} yang ditemukan`} /> :
                    filtered.map(x => (
                        <tr key={x.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center border border-border-main/20 text-accent font-bold text-[10px] shadow-sm italic">
                                        {x.nama?.[0] || "?"}
                                    </div>
                                    <div className="font-bold text-text-main group-hover:text-accent transition-colors leading-tight tracking-tight text-[12px]">{x.nama}</div>
                                </div>
                            </td>
                            <td className="py-3 px-4">
                                {x.telepon ? (
                                    <a href={`tel:${x.telepon}`} className="text-[11px] font-bold text-text-med hover:text-accent transition-colors flex items-center gap-2 tabular-nums">
                                        <Icon name="Phone" size={12} className="opacity-30" /> {x.telepon}
                                    </a>
                                ) : <span className="text-[11px] font-black text-text-light opacity-20 tracking-widest uppercase">—</span>}
                            </td>
                            <td className="py-3 px-4">
                                {x.email ? (
                                    <a href={`mailto:${x.email}`} className="text-[11px] font-bold text-text-med hover:text-accent transition-colors flex items-center gap-2">
                                        <Icon name="Mail" size={12} className="opacity-30" /> {x.email}
                                    </a>
                                ) : <span className="text-[11px] font-black text-text-light opacity-20 tracking-widest uppercase">—</span>}
                            </td>
                            <td className="py-3 px-4 text-right">
                                <button 
                                    onClick={() => { setEditItem(x); setForm({nama:x.nama, telepon:x.telepon, email:x.email}); setShowForm(true); }} 
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-text-med transition-colors opacity-40 group-hover:opacity-100"
                                    title="Edit Kontak"
                                >
                                    <Icon name="UserCog" size={14} />
                                </button>
                            </td>
                        </tr>
                    ))
                }
            </tbody>
            </table>
        </div>
      </Card>
    </PageShell>
  );
};

