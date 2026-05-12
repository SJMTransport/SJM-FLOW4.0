import React, { useState, useMemo } from "react";
import { C } from "@/src/constants";
import { Card, SectionHeader, EmptyState, statusBadge, useConfirm, useToast, PeriodFilter, Icon, StatCard, FeedbackButton, PageShell, KPIGrid, ActionBar } from "@/src/components/SJMComponents";
import { api } from "@/src/api";
import { fmt, fmtShort, filterByPeriod } from "@/src/utils";

export const ArmadaPage = ({ activeSub, armada, setArmada, dokumen, setDokumen, service, setService, sopir, setSopir, onArmadaClick, onSopirClick, jurnal, coa, logAction, so }: any) => {
  const { confirm: confirmModal, Modal: ConfirmModalUI } = useConfirm();
  const { showToast, ToastUI } = useToast();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState({ mode: "year", year: new Date().getFullYear(), month: new Date().getMonth() });
  const [showModal, setShowModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showSopirModal, setShowSopirModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [item, setItem] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const save = async () => {
    setLoading(true);
    setSaveError(false);
    setSaveSuccess(false);
    try {
      if (editing) {
        await api.updateArmada(editing.id, item);
        setArmada((prev: any[]) => prev.map(x => x.id === editing.id ? { ...x, ...item } : x));
        logAction(`Update Armada: ${item.no_polisi || editing.no_polisi}`, { id: editing.id });
      } else {
        const res = await api.addArmada(item);
        setArmada((prev: any[]) => [...prev, res]);
        logAction(`Add Armada: ${item.no_polisi}`, { id: res.id });
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setShowModal(false); setEditing(null); setItem({});
        setSaveSuccess(false);
      }, 1000);
      showToast("Data armada berhasil disimpan");
    } catch (e: any) { 
        showToast("Gagal simpan armada: " + e.message, "error"); 
        setSaveError(true);
        setTimeout(() => setSaveError(false), 2000);
    }
    setLoading(false);
  };

  const saveDoc = async () => {
    setLoading(true);
    setSaveError(false);
    setSaveSuccess(false);
    try {
      if (editing) {
          await api.updateArmadaDokumen(editing.id, item);
          setDokumen((prev: any[]) => prev.map(x => x.id === editing.id ? { ...x, ...item } : x));
          logAction(`Update Dokumen Armada: ${item.jenis_dokumen || editing.jenis_dokumen}`, { id: editing.id });
      } else {
          const res = await api.addArmadaDokumen(item);
          setDokumen((prev: any[]) => [...prev, res]);
          logAction(`Add Dokumen Armada: ${item.jenis_dokumen}`, { id: res.id });
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setShowDocModal(false); setEditing(null); setItem({});
        setSaveSuccess(false);
      }, 1000);
      showToast("Dokumen berhasil diregistrasi");
    } catch (e: any) { 
        showToast("Gagal simpan dokumen: " + e.message, "error"); 
        setSaveError(true);
        setTimeout(() => setSaveError(false), 2000);
    }
    setLoading(false);
  };

  const deleteDoc = async (id: string) => {
    confirmModal({
      title: "Hapus Dokumen",
      msg: "Apakah Anda yakin ingin menghapus dokumen ini?",
      onConfirm: async () => {
        try {
          const docItem = dokumen.find((x: any) => x.id === id);
          await api.deleteArmadaDokumen(id);
          setDokumen((prev: any[]) => prev.filter(x => x.id !== id));
          logAction(`Hapus Dokumen Armada: ${docItem?.jenis_dokumen || id}`, { id });
          showToast("Dokumen berhasil dihapus");
        } catch (e: any) { showToast("Gagal hapus dokumen: " + e.message, "error"); }
      }
    });
  };

  const saveService = async () => {
    setLoading(true);
    setSaveError(false);
    setSaveSuccess(false);
    try {
      const res = await api.addArmadaService(item);
      setService((prev: any[]) => [res, ...prev]);
      logAction(`Add Service Record: ${item.no_polisi} - ${item.jenis_service}`, { id: res.id });
      setSaveSuccess(true);
      setTimeout(() => {
        setShowServiceModal(false); setItem({});
        setSaveSuccess(false);
      }, 1000);
      showToast("Riwayat service dicatat");
    } catch (e: any) { 
        showToast("Gagal catat service: " + e.message, "error"); 
        setSaveError(true);
        setTimeout(() => setSaveError(false), 2000);
    }
    setLoading(false);
  };

  const saveSopir = async () => {
    setLoading(true);
    setSaveError(false);
    setSaveSuccess(false);
    try {
      if (editing) {
        await api.updateSopir(editing.id, item);
        setSopir((prev: any[]) => prev.map(x => x.id === editing.id ? { ...x, ...item } : x));
        logAction(`Update Sopir: ${item.nama || editing.nama}`, { id: editing.id });
      } else {
        const res = await api.addSopir(item);
        setSopir((prev: any[]) => [...prev, res]);
        logAction(`Add Sopir: ${item.nama}`, { id: res.id });
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setShowSopirModal(false); setEditing(null); setItem({});
        setSaveSuccess(false);
      }, 1000);
      showToast("Data sopir berhasil disimpan");
    } catch (e: any) { 
        showToast("Gagal simpan sopir: " + e.message, "error"); 
        setSaveError(true);
        setTimeout(() => setSaveError(false), 2000);
    }
    setLoading(false);
  };

  const currentTbPerUnit = useMemo(() => {
    const units = (armada || []).map((a: any) => a.no_polisi).filter(Boolean);
    const displayUnits = units.length > 0 ? units : [];
    const filtered = filterByPeriod(jurnal || [], period);
    
    return displayUnits.map(unit => {
        const noPol = (unit || "").trim();
        const mySOs = (so || []).filter((s: any) => String(s.no_polisi || "").trim() === noPol);
        const orderIds = mySOs.map((s: any) => (s.order_id || "").trim()).filter(Boolean);

        let revenue = 0;
        let expense = 0;

        filtered.forEach(j => {
            const journalSOs = (j.no_so || "").split(",").map((s: string) => s.trim()).filter(Boolean);
            const hasSO = orderIds.some(id => journalSOs.includes(id));
            const hasNoPol = (j.keterangan || "").toUpperCase().includes(noPol.toUpperCase());
            const hasExplicitNoPol = (String(j.no_polisi || "").trim() === noPol);

            if (hasSO || hasNoPol || hasExplicitNoPol) {
                (j.jurnal_detail || []).forEach((d: any) => {
                    const code = String(d.coa_kode || "");
                    if (code.startsWith("4")) {
                        revenue += (Number(d.kredit) || 0) - (Number(d.debit) || 0);
                    } else if (code.startsWith("5") || code.startsWith("6")) {
                        expense += (Number(d.debit) || 0) - (Number(d.kredit) || 0);
                    }
                });
            }
        });
        return { unit, revenue, expense, profit: revenue - expense };
    });
  }, [jurnal, coa, period, armada, so]);

  if (activeSub === "dashboard_unit") {
    const totalRevenue = currentTbPerUnit.reduce((s, u) => s + u.revenue, 0);
    const totalExpense = currentTbPerUnit.reduce((s, u) => s + u.expense, 0);
    const totalProfit = totalRevenue - totalExpense;

    const filteredUnits = currentTbPerUnit.filter(u => !search || u.unit.toLowerCase().includes(search.toLowerCase()));

    return (
      <PageShell>
        <SectionHeader 
          title="Analisis Finansial Per Unit" 
          sub="Ringkasan performa pendapatan dan beban operasional setiap armada" 
          action={
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <PeriodFilter period={period} setPeriod={setPeriod} search={search} setSearch={setSearch} />
            </div>
          }
        />

        <KPIGrid cols={3}>
           <StatCard
              label="Total Revenue"
              value={fmt(totalRevenue)}
              icon="TrendingUp"
              color="var(--color-navy)"
           />
           <StatCard
              label="Total Expense"
              value={fmt(totalExpense)}
              icon="TrendingDown"
              color="var(--color-red-brand)"
           />
           <StatCard
              label="Grand Profit"
              value={fmt(totalProfit)}
              icon="BarChart3"
              color={totalProfit >= 0 ? "var(--color-accent)" : "var(--color-red-brand)"}
           />
        </KPIGrid>

        <Card className="p-0 border-border-main/40 overflow-hidden shadow-sm">
           <div className="table-container overflow-x-auto max-h-[calc(100vh-420px)]">
              <table className="w-full border-collapse">
                 <thead>
                    <tr>
                       <th>Unit Armada</th>
                       <th className="text-right">Pendapatan</th>
                       <th className="text-right">Beban Ops</th>
                       <th className="text-right">Nett Profit</th>
                       <th className="text-center">Status</th>
                       <th className="text-center">Aksi</th>
                    </tr>
                 </thead>
                 <tbody>
                    {filteredUnits.length === 0 ? (
                      <EmptyState colSpan={6} msg="Unit tidak ditemukan" />
                    ) : (
                      filteredUnits.map(u => (
                        <tr key={u.unit} className="group hover:bg-oatmeal/20 transition-colors">
                           <td>
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-navy/5 text-navy flex items-center justify-center border border-navy/10 shrink-0">
                                    <Icon name="Truck" size={16} />
                                 </div>
                                 <div className="font-black text-[13px] text-text-main group-hover:text-accent transition-colors tabular-nums">{u.unit}</div>
                              </div>
                           </td>
                           <td className="text-right font-bold text-[12px] text-blue-brand tabular-nums whitespace-nowrap">{fmt(u.revenue)}</td>
                           <td className="text-right font-bold text-[12px] text-red-brand tabular-nums whitespace-nowrap">{fmt(u.expense)}</td>
                           <td className="text-right whitespace-nowrap">
                              <span className={`text-[13px] font-black tabular-nums ${u.profit >= 0 ? "text-green-brand" : "text-red-brand"}`}>
                                 {fmt(u.profit)}
                              </span>
                           </td>
                           <td className="text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-grey-100 text-[9px] font-bold text-text-light border border-border-main/20 uppercase tracking-widest">
                                 SJM
                              </span>
                           </td>
                           <td className="text-center">
                              <button
                                onClick={() => onArmadaClick(u.unit)}
                                className="text-[10px] font-bold text-text-light hover:text-accent flex items-center gap-1 mx-auto transition-colors"
                              >
                                 Detail <Icon name="ArrowRight" size={12} />
                              </button>
                           </td>
                        </tr>
                      ))
                    )}
                 </tbody>
                 <tfoot>
                    <tr className="bg-grey-100 border-t border-border-dark/30">
                       <td className="text-[10px] font-black uppercase tracking-widest text-text-light opacity-60">Total Konsolidasi</td>
                       <td className="text-right font-black tabular-nums text-blue-brand whitespace-nowrap">{fmt(totalRevenue)}</td>
                       <td className="text-right font-black tabular-nums text-red-brand whitespace-nowrap">{fmt(totalExpense)}</td>
                       <td className="text-right font-black tabular-nums text-green-brand whitespace-nowrap">{fmt(totalProfit)}</td>
                       <td colSpan={2}></td>
                    </tr>
                 </tfoot>
              </table>
           </div>
        </Card>
      </PageShell>
    );
  }

  if (activeSub === "unit") {
    const filtered = (armada || []).filter((a: any) => !search || a.no_polisi?.toLowerCase().includes(search.toLowerCase()) || a.merk?.toLowerCase().includes(search.toLowerCase()));
    return (
      <PageShell>
        <ConfirmModalUI />
        <ToastUI />
        <SectionHeader 
          title="Master Armada" 
          sub={`Manajemen ${armada.length} unit kendaraan operasional`} 
          action={
            <button className="btn-primary" onClick={() => { setEditing(null); setItem({}); setShowModal(true); }}>
              <Icon name="Plus" size={14} /> Tambah Unit
            </button>
          } 
        />
        
        <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="w-full md:w-96 relative group">
                <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-accent transition-all duration-300 opacity-50" />
                <input 
                    className="input-field pl-11 bg-slate-50 border-transparent focus:bg-white focus:border-accent" 
                    placeholder="Cari no polisi atau merk..." 
                    value={search || ""} 
                    onChange={e => setSearch(e.target.value)} 
                />
            </div>
        </div>
        
        <Card className="p-0 border-border-main/40 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                <thead>
                    <tr>
                        <th>No Polisi</th>
                        <th>Nama Unit</th>
                        <th>Spesifikasi / Merk</th>
                        <th>Kepemilikan</th>
                        <th className="text-center">Status</th>
                        <th className="text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-main/20">
                    {filtered.length === 0 ? <EmptyState colSpan={6} /> :
                        filtered.map((r: any) => (
                        <tr key={r.id} className="group transition-colors">
                            <td>
                                <button onClick={() => onArmadaClick(r.no_polisi)} className="text-[12px] font-bold text-accent hover:text-blue-brand tabular-nums tracking-tighter transition-colors italic">
                                    {r.no_polisi}
                                </button>
                            </td>
                            <td>
                                <div className="text-[12px] font-bold text-text-main leading-none">{r.nama_armada || "—"}</div>
                                <div className="text-[9px] font-bold text-text-light mt-1 opacity-40 italic">{r.tahun || "Tahun —"}</div>
                            </td>
                            <td>
                                <div className="text-[11px] font-bold text-text-med leading-none">{r.merk}</div>
                                <div className="text-[9px] font-bold text-text-light mt-1 italic opacity-50">{r.jenis}</div>
                            </td>
                            <td>
                               <span className="inline-block px-1.5 py-0.5 rounded-md border border-blue-brand/20 bg-blue-brand-light/40 text-[10px] font-bold text-blue-brand italic">
                                 {r.kepemilikan || "SJM"}
                               </span>
                            </td>
                            <td className="text-center">{statusBadge(r.status || "Aktif")}</td>
                            <td className="text-right">
                                <button className="p-1.5 hover:bg-slate-100 text-text-med rounded-lg transition-colors opacity-40 group-hover:opacity-100" onClick={() => { setEditing(r); setItem(r); setShowModal(true); }}>
                                    <Icon name="Edit3" size={14} />
                                </button>
                            </td>
                        </tr>
                        ))
                    }
                </tbody>
                </table>
            </div>
        </Card>

        {showModal && (
          <div className="fixed inset-0 bg-black/[0.06] z-[1100] flex justify-center items-center p-4">
             <Card className="w-full max-w-[420px] p-6 animate-fade-up shadow-2xl relative">
                <button className="absolute top-5 right-5 text-text-light hover:text-text-main transition-colors" onClick={() => setShowModal(false)}><Icon name="X" size={18} /></button>
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border-main/40">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                        <Icon name="Plus" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-text-main tracking-tight uppercase leading-none">
                            {editing ? "Ubah Armada" : "Unit Baru"}
                        </h3>
                        <p className="text-[9px] font-black text-text-light mt-1.5 tracking-widest uppercase opacity-60">Registrasi armada operasional SJM</p>
                    </div>
                </div>
                
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Nomor Polisi</label>
                        <input className="input-field h-10 font-bold" value={item.no_polisi || ""} placeholder="B 1234 ABC" onChange={e => setItem({...item, no_polisi: e.target.value.toUpperCase()})} />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Nama Panggilan</label>
                        <input className="input-field h-10 font-bold" value={item.nama_armada || ""} placeholder="SJM-01" onChange={e => setItem({...item, nama_armada: e.target.value})} />
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Jenis Body</label>
                        <input className="input-field h-10 font-bold" value={item.jenis || ""} placeholder="Tronton Box" onChange={e => setItem({...item, jenis: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Merk / Model</label>
                        <input className="input-field h-10 font-bold" value={item.merk || ""} placeholder="Hino 500" onChange={e => setItem({...item, merk: e.target.value})} />
                      </div>
                   </div>

                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Driver Utama</label>
                      <select className="input-field h-10 font-bold appearance-none bg-white" value={item.sopir_id || ""} onChange={e => setItem({...item, sopir_id: e.target.value})}>
                         <option value="">— Standar / Pool —</option>
                         {sopir.map((s: any) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                      </select>
                   </div>
                </div>

                <div className="flex flex-col gap-2 mt-8 pt-6 border-t border-border-main/40">
                    <FeedbackButton 
                      className="h-11 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-accent/10" 
                      onClick={save} 
                      loading={loading}
                      success={saveSuccess}
                      error={saveError}
                    >
                      <Icon name="Save" size={16} />
                      Simpan Data Unit
                    </FeedbackButton>
                    <button className="h-10 text-[10px] font-black text-text-light uppercase tracking-widest hover:text-text-main transition-colors underline" onClick={() => setShowModal(false)}>Batal</button>
                </div>
             </Card>
          </div>
        )}
      </PageShell>
    );
  }

  if (activeSub === "dokumen") {
    const filtered = (dokumen || []).filter((d: any) => !search || d.no_polisi?.toLowerCase().includes(search.toLowerCase()) || d.nama_dokumen?.toLowerCase().includes(search.toLowerCase()));
    return (
      <PageShell>
        <ConfirmModalUI />
        <ToastUI />
        <SectionHeader 
            title="Legalitas Armada" 
            sub="Pemantauan masa berlaku dokumen (STNK, KIR, SIPA, dll)" 
            action={
                <button className="btn-primary" onClick={() => { setItem({}); setShowDocModal(true); }}>
                  <Icon name="FilePlus" size={14} /> Register
                </button>
            } 
        />

        <div className="flex flex-col md:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="w-full md:w-96 relative group">
                <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-accent transition-all duration-300 opacity-50" />
                <input 
                    className="input-field pl-11 bg-slate-50 border-transparent focus:bg-white focus:border-accent" 
                    placeholder="Cari no polisi atau dokumen..." 
                    value={search || ""} 
                    onChange={e => setSearch(e.target.value)} 
                />
            </div>
            <PeriodFilter period={period} setPeriod={setPeriod} hideSearch />
        </div>

        <Card className="p-0 border-border-main/40 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <th>UNIT</th>
                            <th>DOKUMEN</th>
                            <th>TGL EXPIRED</th>
                            <th className="text-center">STATUS</th>
                            <th className="whitespace-nowrap">CATATAN</th>
                            <th className="text-right">AKSI</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main/20">
                        {filtered.length === 0 ? <EmptyState colSpan={6} /> :
                            filtered.map((r: any) => {
                                const isExp = new Date(r.tgl_expired) < new Date();
                                return (
                                    <tr key={r.id} className="transition-colors group">
                                        <td className="font-bold text-accent text-[12px] tabular-nums italic">{r.no_polisi}</td>
                                        <td className="font-bold text-text-main text-[11px] italic tracking-tight">{r.nama_dokumen}</td>
                                        <td className={`font-black text-[12px] tabular-nums ${isExp ? "text-red-brand underline decoration-red-brand/30" : "text-text-main"}`}>{r.tgl_expired}</td>
                                        <td className="text-center">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border italic ${isExp ? "bg-red-brand-light/40 border-red-brand/10 text-red-brand" : "bg-green-brand-light/40 border-green-brand/10 text-green-brand"}`}>
                                                {isExp ? "Expired" : "Aktif"}
                                            </span>
                                        </td>
                                        <td className="text-[10px] font-medium text-text-light italic opacity-60 max-w-[200px] truncate">{r.keterangan || "—"}</td>
                                        <td className="text-right">
                                           <div className="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                               <button className="p-1.5 hover:bg-slate-100 text-accent rounded-lg" onClick={() => { setEditing(r); setItem(r); setShowDocModal(true); }}>
                                                  <Icon name="Edit" size={14} />
                                               </button>
                                               <button className="p-1.5 hover:bg-red-brand/10 text-red-brand rounded-lg" onClick={() => deleteDoc(r.id)}>
                                                  <Icon name="Trash2" size={14} />
                                               </button>
                                           </div>
                                        </td>
                                    </tr>
                                );
                            })
                        }
                    </tbody>
                </table>
            </div>
        </Card>

        {showDocModal && (
          <div className="fixed inset-0 bg-black/[0.06] z-[1100] flex justify-center items-center p-4">
             <Card className="w-full max-w-[420px] p-6 animate-fade-up shadow-2xl relative">
                <button className="absolute top-5 right-5 text-text-light hover:text-text-main transition-colors" onClick={() => setShowDocModal(false)}><Icon name="X" size={18} /></button>
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border-main/40">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                        <Icon name="FilePlus" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-text-main tracking-tight uppercase leading-none">Register Dokumen</h3>
                        <p className="text-[9px] font-black text-text-light mt-1.5 tracking-widest uppercase opacity-60">Pencatatan legalitas unit armada</p>
                    </div>
                </div>
                
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Unit Armada</label>
                        <select className="input-field h-10 font-bold appearance-none bg-white" value={item.no_polisi || ""} onChange={e => setItem({...item, no_polisi: e.target.value})}>
                            <option value="">— Pilih Unit —</option>
                            {armada.map((a: any) => <option key={a.id} value={a.no_polisi}>{a.no_polisi}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Jenis Dokumen</label>
                        <select className="input-field h-10 font-bold appearance-none bg-white" value={item.nama_dokumen || ""} onChange={e => setItem({...item, nama_dokumen: e.target.value})}>
                            <option value="">— Pilih —</option>
                            <option value="STNK">STNK</option>
                            <option value="KIR">KIR</option>
                            <option value="SIPA">SIPA</option>
                            <option value="IBM">IBM</option>
                            <option value="ASURANSI">ASURANSI</option>
                        </select>
                    </div>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Tanggal Expired</label>
                      <input className="input-field h-10 font-bold" type="date" value={item.tgl_expired || ""} onChange={e => setItem({...item, tgl_expired: e.target.value})} />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Catatan / Keterangan</label>
                      <textarea className="input-field h-20 font-bold py-2" placeholder="Contoh: Perpanjangan di Samsat Jaktim" value={item.keterangan || ""} onChange={e => setItem({...item, keterangan: e.target.value})} />
                   </div>
                </div>

                <div className="flex flex-col gap-2 mt-8 pt-6 border-t border-border-main/40">
                    <FeedbackButton 
                      className="h-11 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-accent/10" 
                      onClick={saveDoc} 
                      loading={loading}
                      success={saveSuccess}
                      error={saveError}
                    >
                      <Icon name="Save" size={16} />
                      Simpan Dokumen
                    </FeedbackButton>
                    <button className="h-10 text-[10px] font-black text-text-light uppercase tracking-widest hover:text-text-main transition-colors underline" onClick={() => setShowDocModal(false)}>Batal</button>
                </div>
             </Card>
          </div>
        )}
      </PageShell>
    );
  }

  if (activeSub === "service") {
    const filtered = (service || []).filter((s: any) => !search || s.no_polisi?.toLowerCase().includes(search.toLowerCase()) || s.jenis_service?.toLowerCase().includes(search.toLowerCase()));
    return (
      <PageShell>
        <ToastUI />
        <SectionHeader 
          title="Log Pemeliharaan" 
          sub="Riwayat maintenance rutin dan perbaikan unit" 
          action={
              <button className="btn-primary" onClick={() => { setItem({}); setShowServiceModal(true); }}>
                <Icon name="Wrench" size={14} /> Catat Log
              </button>
          } 
        />

        <div className="flex flex-col md:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="w-full md:w-96 relative group">
                <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-accent transition-all duration-300 opacity-50" />
                <input 
                    className="input-field pl-11 bg-slate-50 border-transparent focus:bg-white focus:border-accent" 
                    placeholder="Cari no polisi atau jenis service..." 
                    value={search || ""} 
                    onChange={e => setSearch(e.target.value)} 
                />
            </div>
            <PeriodFilter period={period} setPeriod={setPeriod} hideSearch />
        </div>

        <Card className="p-0 border-border-main/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                    <th>Unit</th>
                    <th>Tgl Service</th>
                    <th>Diperbaiki</th>
                    <th className="text-right">Kilometer</th>
                    <th className="text-right">Biaya (Rp)</th>
                    <th>Dok / Ket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main/20">
                {filtered.length === 0 ? <EmptyState colSpan={6} /> :
                    filtered.map((r: any) => (
                    <tr key={r.id} className="transition-colors group">
                        <td className="font-black text-accent text-[12px] uppercase">{r.no_polisi}</td>
                        <td className="font-bold text-text-med text-[11px] uppercase tracking-tight">{r.tgl_service}</td>
                        <td>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-orange-500/10 text-orange-600 flex items-center justify-center border border-orange-500/10">
                                    <Icon name="Hammer" size={12} />
                                </div>
                                <span className="text-[11px] font-bold text-text-main group-hover:text-accent transition-colors uppercase leading-none">{r.jenis_service}</span>
                            </div>
                        </td>
                        <td className="text-right">
                           <div className="text-[12px] font-black text-text-med tabular-nums">{r.km_terakhir?.toLocaleString()}</div>
                           <div className="text-[8px] font-black text-text-light uppercase tracking-[0.2em] opacity-40">KILOMETER</div>
                        </td>
                        <td className="text-right font-black text-[12px] text-red-brand tabular-nums whitespace-nowrap">{fmt(r.biaya)}</td>
                        <td className="text-[10px] font-medium text-text-light italic opacity-60 max-w-[150px] truncate">{r.keterangan || "—"}</td>
                    </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </Card>

        {showServiceModal && (
          <div className="fixed inset-0 bg-black/[0.06] z-[1100] flex justify-center items-center p-4">
             <Card className="w-full max-w-[420px] p-6 animate-fade-up shadow-2xl relative">
                <button className="absolute top-5 right-5 text-text-light hover:text-text-main transition-colors" onClick={() => setShowServiceModal(false)}><Icon name="X" size={18} /></button>
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border-main/40">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                        <Icon name="Wrench" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-text-main tracking-tight uppercase leading-none">Log Maintenance</h3>
                        <p className="text-[9px] font-black text-text-light mt-1.5 tracking-widest uppercase opacity-60">Catat riwayat perawatan armada</p>
                    </div>
                </div>
                
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Pilih Unit</label>
                        <select className="input-field h-10 font-bold appearance-none bg-white" value={item.no_polisi || ""} onChange={e => setItem({...item, no_polisi: e.target.value})}>
                            <option value="">— Unit —</option>
                            {armada.map((a: any) => <option key={a.id} value={a.no_polisi}>{a.no_polisi}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Service Item</label>
                        <input className="input-field h-10 font-bold" placeholder="Ganti Oli / Ban" value={item.jenis_service || ""} onChange={e => setItem({...item, jenis_service: e.target.value})} />
                    </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Tanggal</label>
                        <input className="input-field h-10 font-bold" type="date" value={item.tgl_service || ""} onChange={e => setItem({...item, tgl_service: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">KM Terakhir</label>
                        <input className="input-field h-10 font-bold" type="number" placeholder="25000" value={item.km_terakhir || ""} onChange={e => setItem({...item, km_terakhir: e.target.value})} />
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Total Biaya (Rp)</label>
                      <input className="input-field h-10 font-bold" type="number" placeholder="0" value={item.biaya || ""} onChange={e => setItem({...item, biaya: e.target.value})} />
                   </div>
                </div>

                <div className="flex flex-col gap-2 mt-8 pt-6 border-t border-border-main/40">
                    <FeedbackButton 
                      className="h-11 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-accent/10" 
                      onClick={saveService} 
                      loading={loading}
                      success={saveSuccess}
                      error={saveError}
                    >
                      <Icon name="Save" size={16} />
                      Catat Log Service
                    </FeedbackButton>
                    <button className="h-10 text-[10px] font-black text-text-light uppercase tracking-widest hover:text-text-main transition-colors underline" onClick={() => setShowServiceModal(false)}>Batal</button>
                </div>
             </Card>
          </div>
        )}
      </PageShell>
    );
  }
  if (activeSub === "sopir") {
    const filtered = (sopir || []).filter((s: any) => !search || s.nama?.toLowerCase().includes(search.toLowerCase()));
    return (
      <PageShell>
        <ToastUI />
        <SectionHeader 
          title="Manajemen Pengemudi" 
          sub={`Data personil ${sopir.length} sopir operasional`} 
          action={
              <button className="btn-primary" onClick={() => { setEditing(null); setItem({}); setShowSopirModal(true); }}>
                <Icon name="UserPlus" size={14} /> Tambah
              </button>
          } 
        />

        <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="w-full md:w-96 relative group">
                <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-accent transition-all duration-300 opacity-50" />
                <input 
                    className="input-field pl-11 bg-slate-50 border-transparent focus:bg-white focus:border-accent" 
                    placeholder="Cari nama sopir..." 
                    value={search || ""} 
                    onChange={e => setSearch(e.target.value)} 
                />
            </div>
        </div>

        <Card className="p-0 border-border-main/40 overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr>
                    <th>NAMA LENGKAP</th>
                    <th>HUBUNGI</th>
                    <th>ALAMAT</th>
                    <th className="text-center">STATUS</th>
                    <th className="text-right">AKSI</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border-main/20">
                 {filtered.length === 0 ? <EmptyState colSpan={5} /> :
                    filtered.map((r: any) => (
                    <tr key={r.id} className="transition-colors group">
                      <td>
                         <button onClick={() => onSopirClick(r.id)} className="flex items-center gap-2.5 text-[12px] font-black text-accent hover:text-blue-brand transition-colors text-left uppercase">
                            <div className="w-7 h-7 rounded-lg bg-accent/5 border border-accent/10 flex items-center justify-center text-[10px] font-black text-accent leading-none">
                                {r.nama?.[0]}
                            </div>
                            <span>{r.nama}</span>
                         </button>
                      </td>
                      <td>
                         <a href={`tel:${r.telepon}`} className="text-[11px] font-bold text-text-med hover:text-blue-brand underline decoration-blue-brand/20 transition-colors tabular-nums">{r.telepon || "—"}</a>
                      </td>
                      <td className="text-[10px] font-medium text-text-light italic opacity-60 max-w-[250px] truncate">{r.alamat || "—"}</td>
                      <td className="text-center">{statusBadge(r.status || "Aktif")}</td>
                      <td className="text-right">
                         <button className="p-1.5 hover:bg-slate-100 text-text-med rounded-lg transition-colors opacity-40 group-hover:opacity-100" onClick={() => { setEditing(r); setItem(r); setShowSopirModal(true); }}>
                            <Icon name="Edit3" size={14} />
                         </button>
                      </td>
                    </tr>
                    ))
                 }
               </tbody>
             </table>
           </div>
        </Card>

        {showSopirModal && (
          <div className="fixed inset-0 bg-black/[0.06] z-[1100] flex justify-center items-center p-4">
             <Card className="w-full max-w-[400px] p-6 animate-fade-up shadow-2xl relative">
                <button className="absolute top-5 right-5 text-text-light hover:text-text-main transition-colors" onClick={() => setShowSopirModal(false)}><Icon name="X" size={18} /></button>
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border-main/40">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                        <Icon name="UserPlus" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-text-main tracking-tight uppercase leading-none">{editing ? "Update Sopir" : "Sopir Baru"}</h3>
                        <p className="text-[9px] font-black text-text-light mt-1.5 tracking-widest uppercase opacity-60">Registrasi personil pengemudi</p>
                    </div>
                </div>
                
                <div className="space-y-4">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Nama Lengkap Sesuai KTP</label>
                      <input className="input-field h-10 font-bold" placeholder="John Doe" value={item.nama || ""} onChange={e => setItem({...item, nama: e.target.value})} />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Nomor Telepon (WhatsApp)</label>
                      <input className="input-field h-10 font-bold" placeholder="0812..." value={item.telepon || ""} onChange={e => setItem({...item, telepon: e.target.value})} />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-light uppercase tracking-widest px-1 opacity-60">Alamat Domisili</label>
                      <textarea className="input-field h-24 font-bold py-2" placeholder="Jalan Merdeka No. 1..." value={item.alamat || ""} onChange={e => setItem({...item, alamat: e.target.value})} />
                   </div>
                </div>

                <div className="flex flex-col gap-2 mt-8 pt-6 border-t border-border-main/40">
                    <FeedbackButton 
                      className="h-11 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-accent/10" 
                      onClick={saveSopir} 
                      loading={loading}
                      success={saveSuccess}
                      error={saveError}
                    >
                      <Icon name="Save" size={16} />
                      Simpan Data
                    </FeedbackButton>
                    <button className="h-10 text-[10px] font-black text-text-light uppercase tracking-widest hover:text-text-main transition-colors underline" onClick={() => setShowSopirModal(false)}>Batal</button>
                </div>
             </Card>
          </div>
        )}
      </PageShell>
    );
  }

  return <div className="fade-up" style={{ padding: 40, textAlign: "center", color: C.textLight }}>Fitur {activeSub} dalam pengembangan</div>;
};
