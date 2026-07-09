import React, { useState, useMemo } from "react";
import { Card, SectionHeader, EmptyState, useConfirm, Icon, PageShell, ActionBar, useToast } from "@/src/components/SJMComponents";
import { api } from "@/src/api";
import { fmt, fmtShort } from "../utils";

export const KontakPage = ({ so, connected, currentUser, invoices, jurnal }: any) => {
  const { confirm: askConfirmKontak, Modal: ConfirmKontakModal } = useConfirm();
  const { showToast } = useToast();
  const [tab, setTab] = useState("customer");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Detail panel state
  const [selectedDetailItem, setSelectedDetailItem] = useState<any>(null);
  const [detailTab, setDetailTab] = useState("ringkasan");
  
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
    setSelectedDetailItem(null);
  }, [tab]);

  // Audit list: find unique names in SO history that are not in the contact list
  const missingList = useMemo(() => {
    if (loading || !so) return [];
    if (isCustomer) {
      const soCustomers = Array.from(new Set(so.map((s: any) => s.customer).filter(Boolean) as string[]));
      const existing = new Set(items.map(x => (x.nama || "").toLowerCase().trim()));
      return soCustomers.filter(name => !existing.has(name.toLowerCase().trim()));
    } else {
      const soVendors = Array.from(new Set(so.map((s: any) => s.nama_vendor).filter(Boolean) as string[]));
      const existing = new Set(items.map(x => (x.nama || "").toLowerCase().trim()));
      return soVendors.filter(name => !existing.has(name.toLowerCase().trim()));
    }
  }, [so, items, isCustomer, loading]);

  const handleSync = async () => {
    if (missingList.length === 0) return;
    setSyncing(true);
    let successCount = 0;
    try {
      const SJM_STAFF_PHONES = new Set([
        '082123761101', '087899898779', '081119176307', '082111719487', '081314254847',
        '085287776889', '081289913078', '081170007078', '0811288091', '083826287695',
        '08113203003', '081513775662', '085711154305', '085777648419', '085810139260',
        '085715827220', '08126876996', '085777084977', '082131052372', '082132738707',
        '085265906207'
      ]);

      // Find the current highest code number in items
      let maxNum = 0;
      items.forEach(c => {
        if (c.kode && c.kode.startsWith(isCustomer ? 'C-' : 'V-')) {
          const num = parseInt(c.kode.replace(isCustomer ? 'C-' : 'V-', ''), 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });

      let nextNum = maxNum + 1;

      for (const name of missingList) {
        // Find most recent SO to extract phone and PIC (excluding SJM staff)
        const recent = [...(so || [])]
          .sort((a: any, b: any) => (b.tgl_order || "").localeCompare(a.tgl_order || ""))
          .find((s: any) => {
            if ((isCustomer ? s.customer : s.nama_vendor) !== name) return false;
            const phone = (s.no_pic || "").replace(/[^0-9]/g, "");
            return !SJM_STAFF_PHONES.has(phone);
          });

        const formattedNum = String(nextNum).padStart(2, '0');
        const generatedCode = isCustomer ? `C-${formattedNum}` : `V-${formattedNum}`;

        const payload = {
          kode: generatedCode,
          nama: name,
          no_hp: isCustomer && recent ? (recent.no_pic || "") : "",
          pic: isCustomer && recent ? (recent.pic_cust || "") : "",
          company_id: currentUser?.company_id || "a9742c2c-e13e-4606-a2d5-149042377f88",
          status: "Aktif"
        };

        if (isCustomer) {
          await api.addCustomer(payload);
        } else {
          await api.addVendor(payload);
        }
        successCount++;
        nextNum++;
      }
      showToast(`Berhasil mendaftarkan ${successCount} kontak baru dari histori SO.`, "success");
      loadData();
    } catch (e: any) {
      console.error("Gagal sinkronisasi kontak:", e);
      showToast("Sinkronisasi gagal: " + (e.message || "Kesalahan database"), "error");
    }
    setSyncing(false);
  };

  const [form, setForm] = useState({ nama: "", telepon: "", email: "" });

  const save = async () => {
    if (!form.nama) return;
    setSaving(true);
    try {
      let generatedCode = editItem?.kode;
      if (!editItem) {
        // Find the current highest code number in items
        let maxNum = 0;
        items.forEach(c => {
          if (c.kode && c.kode.startsWith(isCustomer ? 'C-' : 'V-')) {
            const num = parseInt(c.kode.replace(isCustomer ? 'C-' : 'V-', ''), 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        });
        const formattedNum = String(maxNum + 1).padStart(2, '0');
        generatedCode = isCustomer ? `C-${formattedNum}` : `V-${formattedNum}`;
      }

      const payload = {
        kode: generatedCode,
        nama: form.nama,
        no_hp: form.telepon,
        pic: form.email,
        company_id: currentUser?.company_id || "a9742c2c-e13e-4606-a2d5-149042377f88",
        status: editItem?.status || "Aktif"
      };

      if (editItem) {
        isCustomer ? await api.updateCustomer(editItem.id, payload) : await api.updateVendor(editItem.id, payload);
        showToast("Perubahan kontak berhasil disimpan.", "success");
      } else {
        isCustomer ? await api.addCustomer(payload) : await api.addVendor(payload);
        showToast("Kontak baru berhasil didaftarkan.", "success");
      }
      setShowForm(false);
      loadData();
    } catch (e: any) { 
      console.error("Gagal simpan kontak:", e); 
      showToast("Gagal menyimpan kontak: " + (e.message || "Kesalahan database"), "error");
    }
    setSaving(false);
  };

  const filtered = items.filter(x => 
    !search || x.nama?.toLowerCase().includes(search.toLowerCase()) || 
    x.kode?.toLowerCase().includes(search.toLowerCase()) ||
    x.pic?.toLowerCase().includes(search.toLowerCase()) ||
    x.no_hp?.toLowerCase().includes(search.toLowerCase())
  );

  // Helper date formatter
  const fmtDate = (dStr: string) => {
    if (!dStr) return "—";
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  // Detail Modal data calculations
  const detailData = useMemo(() => {
    if (!selectedDetailItem) return null;
    const name = selectedDetailItem.nama;

    // 1. Sales Orders
    const matchingSos = (so || []).filter((s: any) => (isCustomer ? s.customer : s.nama_vendor) === name);

    // 2. Invoices
    const matchingInvoices = (invoices || []).filter((inv: any) => inv.customer === name);

    // 3. Jurnals
    const orderIds = matchingSos.map((s: any) => s.order_id);
    const matchingJurnals = (jurnal || []).filter((j: any) => {
      const relatedSOIds = j.no_so ? j.no_so.split(",").map((s: string) => s.trim()) : [];
      const matchesSO = relatedSOIds.some((id: string) => orderIds.includes(id));
      const matchesName = (j.keterangan || "").toLowerCase().includes(name.toLowerCase());
      return matchesSO || matchesName;
    });

    // 4. Finance summary
    const totalInvoiced = matchingInvoices.reduce((acc: number, inv: any) => acc + (Number(inv.total_setelah_pajak) || 0), 0);
    const totalPaid = matchingInvoices.reduce((acc: number, inv: any) => acc + (Number(inv.total_terbayar) || 0), 0);
    const outstandingPiutang = totalInvoiced - totalPaid;

    return {
      sos: matchingSos,
      invoices: matchingInvoices,
      jurnals: matchingJurnals,
      totalInvoiced,
      totalPaid,
      outstandingPiutang
    };
  }, [selectedDetailItem, so, invoices, jurnal, isCustomer]);

  return (
    <PageShell>
      <ConfirmKontakModal />
      <SectionHeader 
        title={`Direktori Kontak (${items.length} ${isCustomer ? "Customer" : "Vendor"})`} 
        sub={`Kelola data ${tab} strategis PT SJM`} 
        action={
          <button 
            className="btn-primary"
            onClick={() => { setEditItem(null); setForm({nama:"", telepon:"", email:""}); setShowForm(true); }}
          >
            <Icon name="Plus" size={14} /> Tambah {isCustomer ? "Customer" : "Vendor"}
          </button>
        } 
      />

      <div className="tab-bar">
        {[["customer", "Customer"], ["vendor", "Vendor"]].map(([k, l]) => (
          <button
            key={k}
            className={`tab-btn uppercase tracking-widest ${tab === k ? "active" : ""}`}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>

      {missingList.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 animate-fade-down">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Icon name="AlertTriangle" size={16} />
            </div>
            <div>
              <div className="text-[12px] font-black text-text-main leading-none">Audit & Sinkronisasi Kontak</div>
              <p className="text-[10px] text-text-med mt-1 font-medium leading-normal">
                Ada <span className="font-bold text-amber-700">{missingList.length} nama {isCustomer ? "customer" : "vendor"}</span> dari data Sales Order yang belum terdaftar di direktori Kontak.
              </p>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-primary h-9 px-4 text-[10px] font-black uppercase tracking-wider bg-amber-600 hover:bg-amber-700 shadow-amber-600/10 shrink-0 flex items-center gap-1.5"
          >
            {syncing ? (
              <><Icon name="Loader2" className="animate-spin" size={12} /> Sinkronisasi...</>
            ) : (
              <><Icon name="RefreshCw" size={12} /> Daftarkan Semua ({missingList.length})</>
            )}
          </button>
        </div>
      )}

      <ActionBar left={
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light opacity-50" />
          <input
            className="input-field h-10 pl-9 w-72 text-[12px]"
            placeholder={`Cari nama, kode ID, atau telepon ${isCustomer ? "customer" : "vendor"}...`}
            value={search || ""}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      } />

      {showForm && (
        <div className="fixed inset-0 bg-white/40 backdrop-blur-sm z-[1100] flex justify-center items-center p-4">
          <Card className="w-full max-w-[420px] p-6 animate-fade-up shadow-2xl relative bg-white border border-slate-100 rounded-2xl">
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
              {editItem && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Kode ID Kontak</label>
                  <input className="input-field h-10 font-bold bg-slate-50 cursor-not-allowed" value={editItem.kode || "—"} disabled />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Nama Lengkap / Perusahaan</label>
                <input className="input-field h-10 font-bold" placeholder="Masukkan nama..." value={form.nama || ""} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Nomor Telepon / WhatsApp</label>
                <input className="input-field h-10 font-bold" placeholder="0812..." value={form.telepon || ""} onChange={e => setForm(f => ({ ...f, telepon: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Nama PIC / Contact Person</label>
                <input className="input-field h-10 font-bold" placeholder="Nama PIC..." value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
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

      <Card className="p-0 overflow-hidden border-border-main/40 shadow-sm">
        <div className="overflow-auto max-h-[calc(100vh-360px)]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th>Kode ID</th>
                <th>Nama / Entitas</th>
                <th>Kontak Telepon</th>
                <th>Nama PIC</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main/20">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Icon name="Loader2" className="animate-spin text-accent opacity-30" size={32} />
                      <span className="text-[9px] font-black text-text-light uppercase tracking-widest opacity-60">Memuat database...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? <EmptyState colSpan={5} msg={`Tidak ada ${tab} yang ditemukan`} /> :
                filtered.map(x => (
                  <tr 
                    key={x.id} 
                    className="group transition-colors hover:bg-amber-50/20 cursor-pointer"
                    onClick={() => { setSelectedDetailItem(x); setDetailTab("ringkasan"); }}
                  >
                    <td className="whitespace-nowrap font-black text-text-light tracking-wider text-[11px]">
                      <span className="bg-slate-100 text-text-med px-2.5 py-1 rounded-md text-[10px] font-bold border border-slate-200/50">
                        {x.kode || "—"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center border border-border-main/20 text-accent font-bold text-[10px] shadow-sm italic shrink-0">
                          {x.nama?.[0] || "?"}
                        </div>
                        <div className="font-bold text-text-main group-hover:text-accent transition-colors leading-tight tracking-tight text-[12px]">{x.nama}</div>
                      </div>
                    </td>
                    <td>
                      {x.no_hp ? (
                        <a href={`tel:${x.no_hp}`} className="text-[11px] font-bold text-text-med hover:text-accent transition-colors flex items-center gap-2 tabular-nums" onClick={e => e.stopPropagation()}>
                          <Icon name="Phone" size={12} className="opacity-30" /> {x.no_hp}
                        </a>
                      ) : <span className="text-[11px] font-black text-text-light opacity-20 tracking-widest uppercase">—</span>}
                    </td>
                    <td>
                      {x.pic ? (
                        <span className="text-[11px] font-bold text-text-med flex items-center gap-2">
                          <Icon name="User" size={12} className="opacity-30" /> {x.pic}
                        </span>
                      ) : <span className="text-[11px] font-black text-text-light opacity-20 tracking-widest uppercase">—</span>}
                    </td>
                    <td className="text-right" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditItem(x); setForm({nama:x.nama, telepon:x.no_hp || "", email:x.pic || ""}); setShowForm(true); }}
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

      {/* Slide-over Detail Customer/Vendor Panel */}
      {selectedDetailItem && detailData && (
        <div className="fixed inset-0 z-[1200] flex justify-end">
          {/* Overlay backdrop */}
          <div 
            className="fixed inset-0 bg-black/35 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setSelectedDetailItem(null)}
          />

          {/* Side Drawer */}
          <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col z-10 animate-fade-left border-l border-slate-100">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="bg-accent text-white px-3 py-1 rounded-lg text-[10px] font-black tracking-widest border border-accent">
                  {selectedDetailItem.kode || "KONTAK"}
                </span>
                <div>
                  <h3 className="text-base font-black text-text-main tracking-tight">{selectedDetailItem.nama}</h3>
                  <p className="text-[10px] text-text-light font-bold uppercase mt-0.5 tracking-wider">
                    Detail Profil & Informasi Transaksi Keuangan
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDetailItem(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200/60 flex items-center justify-center text-text-light hover:text-text-main transition-colors border border-slate-200/40 bg-white"
              >
                <Icon name="X" size={16} />
              </button>
            </div>

            {/* Profile Bar */}
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex flex-wrap items-center gap-6 text-[11px] font-bold text-text-med">
              <div className="flex items-center gap-2">
                <Icon name="User" size={14} className="text-text-light opacity-50" />
                <span>PIC: <span className="text-text-main font-black">{selectedDetailItem.pic || "—"}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="Phone" size={14} className="text-text-light opacity-50" />
                <span>No. Telp: <span className="text-text-main font-black">{selectedDetailItem.no_hp || "—"}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="Activity" size={14} className="text-text-light opacity-50" />
                <span>Status: 
                  <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${selectedDetailItem.status === 'Aktif' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                    {selectedDetailItem.status || "Aktif"}
                  </span>
                </span>
              </div>
            </div>

            {/* Stat Summary Cards */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50">
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Icon name="TrendingUp" size={18} />
                </div>
                <div>
                  <div className="text-[9px] text-text-light font-bold uppercase tracking-wider leading-none">Total Transaksi SO</div>
                  <div className="text-lg font-black text-text-main mt-1 tracking-tight">{detailData.sos.length} Order</div>
                </div>
              </div>
              {isCustomer ? (
                <>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Icon name="FileText" size={18} />
                    </div>
                    <div>
                      <div className="text-[9px] text-text-light font-bold uppercase tracking-wider leading-none">Total Nilai Tagihan</div>
                      <div className="text-lg font-black text-text-main mt-1 tracking-tight">Rp {fmt(detailData.totalInvoiced)}</div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Icon name="Clock" size={18} />
                    </div>
                    <div>
                      <div className="text-[9px] text-text-light font-bold uppercase tracking-wider leading-none">Sisa Piutang Aktif</div>
                      <div className="text-lg font-black text-amber-600 mt-1 tracking-tight">Rp {fmt(detailData.outstandingPiutang)}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-3.5 col-span-2">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Icon name="Truck" size={18} />
                  </div>
                  <div>
                    <div className="text-[9px] text-text-light font-bold uppercase tracking-wider leading-none">Armada Pelaksana Terakhir</div>
                    <div className="text-[12px] font-bold text-text-main mt-1.5 leading-snug">
                      {detailData.sos[0]?.nopol ? `${detailData.sos[0].nopol} — ${detailData.sos[0].sopir}` : "Tidak ada riwayat armada pelaksana"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Tabs for Detail */}
            <div className="px-6 border-b border-slate-100 flex gap-4 bg-white">
              {([
                { id: "ringkasan", label: "Ringkasan", hide: false },
                { id: "so", label: "Sales Order", hide: false },
                { id: "invoice", label: "Invoice & Piutang", hide: !isCustomer },
                { id: "jurnal", label: "Buku Jurnal", hide: false }
              ]).filter(t => !t.hide).map(t => (
                <button
                  key={t.id}
                  onClick={() => setDetailTab(t.id)}
                  className={`py-3.5 px-1.5 border-b-2 text-[11px] font-black uppercase tracking-wider transition-all ${detailTab === t.id ? "border-accent text-accent" : "border-transparent text-text-light hover:text-text-main"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Details Content Container */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20">
              
              {/* TAB: Ringkasan */}
              {detailTab === "ringkasan" && (
                <div className="space-y-6">
                  {/* General Profile Description */}
                  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs space-y-4">
                    <h4 className="text-[11px] font-black text-text-main uppercase tracking-wider pb-2 border-b border-slate-100">Informasi Administratif</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] font-bold text-text-med">
                      <div>
                        <div className="text-[9px] text-text-light uppercase font-bold tracking-widest leading-none mb-1">Nama Perusahaan</div>
                        <div className="text-text-main font-black">{selectedDetailItem.nama}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-text-light uppercase font-bold tracking-widest leading-none mb-1">Kode Direktori</div>
                        <div className="text-text-main font-black">{selectedDetailItem.kode || "—"}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-text-light uppercase font-bold tracking-widest leading-none mb-1">Nama PIC</div>
                        <div className="text-text-main font-black">{selectedDetailItem.pic || "—"}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-text-light uppercase font-bold tracking-widest leading-none mb-1">Nomor Handphone PIC</div>
                        <div className="text-text-main font-black">{selectedDetailItem.no_hp || "—"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Operational Summary */}
                  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs space-y-3.5">
                    <h4 className="text-[11px] font-black text-text-main uppercase tracking-wider pb-2 border-b border-slate-100">Ikhtisar Operasional</h4>
                    {detailData.sos.length > 0 ? (
                      <div className="text-[11px] text-text-med leading-relaxed">
                        Customer ini terdaftar aktif dengan total <span className="font-bold text-accent">{detailData.sos.length} Sales Order</span> di database. 
                        Order terakhir kali tercatat pada tanggal <span className="font-bold text-text-main">{fmtDate(detailData.sos[0]?.tgl_order)}</span> dengan rute <span className="font-bold text-text-main">{detailData.sos[0]?.asal} → {detailData.sos[0]?.tujuan}</span> menggunakan armada <span className="font-bold text-text-main">{detailData.sos[0]?.nopol || "—"}</span>.
                      </div>
                    ) : (
                      <div className="text-[11px] text-text-light italic">Belum ada riwayat aktivitas Sales Order operasional yang terekam untuk kontak ini.</div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: Sales Order */}
              {detailTab === "so" && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr>
                          <th>No. SO</th>
                          <th>Tanggal Muat</th>
                          <th>Rute (Asal → Tujuan)</th>
                          <th>Armada / Sopir</th>
                          <th className="text-right">Total Harga</th>
                          <th className="text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailData.sos.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center p-8 text-[11px] text-text-light italic">Tidak ada transaksi SO</td>
                          </tr>
                        ) : (
                          detailData.sos.map((s: any) => (
                            <tr key={s.id} className="text-[11px] hover:bg-slate-50/50">
                              <td className="font-black text-accent">{s.order_id}</td>
                              <td className="tabular-nums font-medium">{fmtDate(s.tgl_muat || s.tgl_order)}</td>
                              <td className="font-bold text-text-main max-w-[150px] truncate">{s.asal} → {s.tujuan}</td>
                              <td className="font-medium text-text-med">
                                <div>{s.nopol || "—"}</div>
                                <div className="text-[9px] text-text-light mt-0.5">{s.sopir || "—"}</div>
                              </td>
                              <td className="text-right font-black text-text-main tabular-nums">
                                Rp {fmt(s.total_harga_pajak || s.total_harga || 0)}
                              </td>
                              <td className="text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase inline-block`} 
                                  style={{
                                    backgroundColor: s.status_muatan === 'Completed' ? 'var(--color-success-bg)' : s.status_muatan === 'Cancelled' ? 'var(--color-error-bg)' : 'var(--color-warning-bg)',
                                    color: s.status_muatan === 'Completed' ? 'var(--color-success)' : s.status_muatan === 'Cancelled' ? 'var(--color-error)' : 'var(--color-warning)',
                                    border: `1px solid ${s.status_muatan === 'Completed' ? 'var(--color-success-border)' : s.status_muatan === 'Cancelled' ? 'var(--color-error-border)' : 'var(--color-warning-border)'}`
                                  }}
                                >
                                  {s.status_muatan}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: Invoice */}
              {detailTab === "invoice" && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr>
                          <th>No. Invoice</th>
                          <th>Tanggal</th>
                          <th className="text-right">Subtotal</th>
                          <th className="text-right">PPN</th>
                          <th className="text-right">Total Invoice</th>
                          <th className="text-center">Status Bayar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailData.invoices.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center p-8 text-[11px] text-text-light italic">Tidak ada tagihan invoice</td>
                          </tr>
                        ) : (
                          detailData.invoices.map((inv: any) => (
                            <tr key={inv.id} className="text-[11px] hover:bg-slate-50/50">
                              <td className="font-black text-accent">{inv.no_invoice}</td>
                              <td className="tabular-nums font-medium">{fmtDate(inv.tgl_invoice)}</td>
                              <td className="text-right font-bold text-text-med tabular-nums">Rp {fmt(inv.total_sebelum_pajak || 0)}</td>
                              <td className="text-right font-bold text-text-med tabular-nums">Rp {fmt(inv.ppn || 0)}</td>
                              <td className="text-right font-black text-text-main tabular-nums">Rp {fmt(inv.total_setelah_pajak || 0)}</td>
                              <td className="text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase inline-block`}
                                  style={{
                                    backgroundColor: inv.status_bayar === 'Lunas' ? 'var(--color-success-bg)' : inv.status_bayar === 'Belum Bayar' ? 'var(--color-error-bg)' : 'var(--color-warning-bg)',
                                    color: inv.status_bayar === 'Lunas' ? 'var(--color-success)' : inv.status_bayar === 'Belum Bayar' ? 'var(--color-error)' : 'var(--color-warning)',
                                    border: `1px solid ${inv.status_bayar === 'Lunas' ? 'var(--color-success-border)' : inv.status_bayar === 'Belum Bayar' ? 'var(--color-error-border)' : 'var(--color-warning-border)'}`
                                  }}
                                >
                                  {inv.status_bayar}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: Jurnal */}
              {detailTab === "jurnal" && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr>
                          <th>No. Jurnal</th>
                          <th>Tanggal</th>
                          <th>Keterangan</th>
                          <th className="text-right">Debet</th>
                          <th className="text-right">Kredit</th>
                          <th className="text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailData.jurnals.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center p-8 text-[11px] text-text-light italic">Tidak ada entri buku jurnal terkait</td>
                          </tr>
                        ) : (
                          detailData.jurnals.map((j: any) => {
                            // Sum details
                            const debetSum = (j.jurnal_detail || []).reduce((acc: number, d: any) => acc + (Number(d.debit) || 0), 0);
                            const kreditSum = (j.jurnal_detail || []).reduce((acc: number, d: any) => acc + (Number(d.kredit) || 0), 0);
                            return (
                              <tr key={j.id} className="text-[11px] hover:bg-slate-50/50">
                                <td className="font-black text-accent">{j.no_jurnal}</td>
                                <td className="tabular-nums font-medium">{fmtDate(j.tanggal)}</td>
                                <td className="font-bold text-text-main max-w-[200px] truncate" title={j.keterangan}>{j.keterangan}</td>
                                <td className="text-right font-bold text-text-main tabular-nums">Rp {fmt(debetSum)}</td>
                                <td className="text-right font-bold text-text-main tabular-nums">Rp {fmt(kreditSum)}</td>
                                <td className="text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase inline-block`}
                                    style={{
                                      backgroundColor: j.status === 'Posted' ? 'var(--color-success-bg)' : 'var(--color-border-main)',
                                      color: j.status === 'Posted' ? 'var(--color-success)' : 'var(--color-text-light)',
                                      border: `1px solid ${j.status === 'Posted' ? 'var(--color-success-border)' : 'var(--color-border-dark)'}`
                                    }}
                                  >
                                    {j.status || "Draft"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};
