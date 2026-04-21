import React, { useState } from "react";
import { C, STATUS_SO, STATUS_COLOR, STATUS_BG } from "../constants";
import { Card, SectionHeader, Icon, useToast, EmptyState } from "@/src/components/SJMComponents";
import { api } from "@/src/api";
import { fmt } from "../utils";

export const UpdateMuatan = ({ so, setSo, onSOClick, logAction }: any) => {
  const { showToast, ToastUI } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSO, setSelectedSO] = useState<any>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [newLog, setNewLog] = useState({ info: "", location: "" });
  const [loading, setLoading] = useState(false);

  const filtered = so.filter((s: any) => {
    const matchesSearch = !search || 
      s.order_id?.toLowerCase().includes(search.toLowerCase()) || 
      s.customer?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status_muatan === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const updateSOStatus = async (s: any, newStatus: string) => {
    if (s.status_muatan === newStatus) return;
    setLoading(true);
    try {
      const logEntry = {
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }),
        status: newStatus,
        info: `Status diperbarui via Stepper: ${newStatus}`,
        location: s.posisi_log?.[0]?.location || s.lokasi_muat
      };
      
      const updatedLog = [logEntry, ...(s.posisi_log || [])];
      await api.updateSO(s.id, { 
        status_muatan: newStatus,
        posisi_log: updatedLog
      });
      
      setSo((prev: any[]) => prev.map(x => x.id === s.id ? { ...x, status_muatan: newStatus, posisi_log: updatedLog } : x));
      logAction(`Update Status SO: ${s.order_id}`, { from: s.status_muatan, to: newStatus });
      showToast(`Status berkas ${s.order_id} diperbarui`);
    } catch (e: any) { 
      showToast("Gagal update status: " + e.message, "error");
    }
    setLoading(false);
  };

  const toggleCancelSO = async (s: any) => {
    const isCurrentlyCancelled = s.status_muatan === "Cancelled";
    let newStatus = "Cancelled";
    
    if (isCurrentlyCancelled) {
      // Revert to previous status from log
      const prevLog = (s.posisi_log || []).find((l: any) => l.status !== "Cancelled");
      newStatus = prevLog ? prevLog.status : "Order Confirmed";
    }

    setLoading(true);
    try {
      const logEntry = {
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }),
        status: newStatus,
        info: isCurrentlyCancelled ? `Order dipulihkan ke status ${newStatus}` : "Order dibatalkan oleh pengguna",
        location: s.posisi_log?.[0]?.location || s.lokasi_muat
      };
      
      const updatedLog = [logEntry, ...(s.posisi_log || [])];
      await api.updateSO(s.id, { 
        status_muatan: newStatus,
        posisi_log: updatedLog
      });
      
      setSo((prev: any[]) => prev.map(x => x.id === s.id ? { ...x, status_muatan: newStatus, posisi_log: updatedLog } : x));
      logAction(`${isCurrentlyCancelled ? 'Revert' : 'Cancel'} SO: ${s.order_id}`, { status: newStatus });
      showToast(isCurrentlyCancelled ? "Order dipulihkan" : "Order telah dibatalkan");
    } catch (e: any) { 
      showToast("Operasi gagal: " + e.message, "error");
    }
    setLoading(false);
  };

  const addManualLog = async () => {
    if (!newLog.location && !newLog.info) return showToast("Mohon isi minimal lokasi atau keterangan", "error");
    setLoading(true);
    try {
      const now = new Date();
      const logEntry = {
        date: now.toISOString().split("T")[0],
        time: now.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }),
        status: selectedSO.status_muatan,
        info: newLog.info || `Update posisi di ${newLog.location}`,
        location: newLog.location
      };
      const updatedLog = [logEntry, ...(selectedSO.posisi_log || [])];
      
      await api.updateSO(selectedSO.id, { posisi_log: updatedLog });
      
      setSo((prev: any[]) => prev.map(x => x.id === selectedSO.id ? { ...x, posisi_log: updatedLog } : x));
      setNewLog({ info: "", location: "" });
      setShowLogForm(false);
      showToast("Log operasional berhasil ditambahkan");
      logAction(`Log Muatan SO: ${selectedSO.order_id}`, { location: newLog.location });
    } catch (e: any) { 
      showToast("Gagal update log: " + e.message, "error");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-full mx-auto space-y-4 pb-8 fade-up">
      <ToastUI />
      
      <SectionHeader 
        title="Update Muatan Operasional" 
        sub="Kelola pergerakan logistik dan status pengiriman armada SJM" 
      />
      
      <div className="flex flex-col lg:flex-row gap-3 mb-3 items-stretch lg:items-center">
        <div className="flex-1 min-w-0">
          <div className="relative group max-w-md">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light opacity-50 group-focus-within:text-accent transition-all duration-300" />
            <input 
                className="input-field pl-10 h-10 bg-white border-border-main/40 focus:border-accent text-[11px] font-bold" 
                placeholder="Cari Kode SO, Pelanggan, atau Unit..." 
                value={search || ""} 
                onChange={e => setSearch(e.target.value)} 
            />
          </div>
        </div>
        <div className="shrink-0">
           <select className="input-field h-10 w-full lg:w-64 font-bold text-[11px] bg-white border-border-main/40 focus:border-accent" value={statusFilter || "all"} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">Semua Status Muat</option>
              {STATUS_SO.map(st => <option key={st} value={st}>{st}</option>)}
           </select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState msg="Tidak ada muatan aktif yang ditemukan" />
        ) : (
          filtered.map((s: any) => {
            const stepList = STATUS_SO.filter(s => s !== "Cancelled");
            const isCancelled = s.status_muatan === "Cancelled";
            const isEditing = showLogForm && selectedSO?.id === s.id;
            
            return (
              <Card key={s.id} className="p-0 border-border-main/50 overflow-hidden shadow-sm hover:shadow-md transition-all bg-white ring-1 ring-black/[0.02]">
                <div className="flex flex-col w-full">
                  {/* Narrow Info Bar */}
                  <div className="flex flex-col lg:flex-row items-center p-3 sm:px-5 gap-3 lg:gap-8 hover:bg-slate-50 transition-colors">
                     <div className="flex items-center gap-3 min-w-[240px] flex-1 lg:flex-none">
                        <button 
                          onClick={() => onSOClick(s.order_id)}
                          className="text-[12px] font-black text-navy hover:text-amber-600 transition-colors tracking-tight italic bg-navy/5 px-2.5 py-1 rounded-lg"
                        >
                          {s.order_id}
                        </button>
                        <div>
                           <div className="text-[13px] font-black text-text-main line-clamp-1 tracking-tight">{s.customer}</div>
                           <div className="text-[9px] font-bold text-text-light flex items-center gap-1.5 opacity-60">
                              <Icon name="Truck" size={10} className="text-amber-500" /> {s.no_polisi || "N/A"}
                           </div>
                        </div>
                     </div>

                     <div className="hidden sm:flex flex-1 items-center gap-4 text-[11px]">
                        <div className="flex items-center gap-2 font-bold text-text-med bg-slate-100/50 px-3 py-1.5 rounded-lg border border-slate-200/50">
                           <span className="truncate max-w-[100px]">{s.lokasi_muat}</span>
                           <Icon name="ArrowRight" size={10} className="text-text-light/30" />
                           <span className="truncate max-w-[100px]">{s.lokasi_bongkar}</span>
                        </div>
                        <div className="text-[11px] font-black text-navy bg-amber-50 px-3 py-1.5 rounded-lg">
                           {fmt(s.total_harga || 0)}
                        </div>
                     </div>

                     <div className="flex items-center gap-2 shrink-0 ml-auto lg:ml-0">
                        {isCancelled ? (
                           <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-brand text-white text-[10px] font-black uppercase tracking-widest">
                              <Icon name="XCircle" size={12} /> Cancelled
                           </div>
                        ) : (
                           <div 
                              className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-transparent shadow-sm"
                              style={{ 
                                 backgroundColor: (STATUS_BG[s.status_muatan] || "#F8FAFC") + "10",
                                 color: STATUS_COLOR[s.status_muatan] || "#64748B",
                                 borderColor: (STATUS_COLOR[s.status_muatan] || "#64748B") + "20"
                              }}
                           >
                              {s.status_muatan}
                           </div>
                        )}
                        <button 
                           onClick={() => toggleCancelSO(s)}
                           className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              isCancelled 
                                ? "bg-amber-100 text-amber-600 hover:bg-amber-200" 
                                : "bg-slate-100 text-slate-400 hover:bg-red-brand-light hover:text-red-brand"
                           }`}
                        >
                           <Icon name={isCancelled ? "RotateCcw" : "XCircle"} size={16} />
                        </button>
                     </div>
                  </div>

                  {/* Slim Minimal Stepper */}
                  {!isCancelled && (
                    <div className="px-5 pt-5 pb-10 bg-slate-50/10 border-y border-border-main/20">
                       <div className="flex items-center justify-between w-full max-w-5xl mx-auto relative px-2">
                          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 rounded-full" />
                          <div 
                            className="absolute top-1/2 left-0 h-0.5 bg-amber-500 -translate-y-1/2 rounded-full transition-all duration-700" 
                            style={{ width: `${(stepList.indexOf(s.status_muatan) / (stepList.length - 1)) * 100}%` }}
                          />
                          
                          {stepList.map((step, idx) => {
                             const isActive = s.status_muatan === step;
                             const isCompleted = stepList.indexOf(s.status_muatan) > idx;
                             const stepColor = STATUS_COLOR[step] || "var(--color-navy)";
                             
                             return (
                               <div key={idx} className="relative z-10 flex flex-col items-center group/step">
                                 <button 
                                   disabled={isActive || loading}
                                   onClick={() => updateSOStatus(s, step)}
                                   className={`w-4 h-4 rounded-full border-2 transition-all duration-300 relative ${
                                     isActive ? "scale-125 border-white ring-4 ring-amber-500/20 shadow-md" : 
                                     isCompleted ? "border-amber-500 bg-amber-500 shadow-sm" : 
                                     "bg-white border-slate-300 hover:border-navy"
                                   }`}
                                   style={{ 
                                     backgroundColor: isActive ? stepColor : (isCompleted ? stepColor : "white"),
                                     borderColor: isActive ? "white" : (isCompleted ? stepColor : "var(--color-border-main)")
                                   }}
                                 >
                                    {isCompleted && isActive === false && <div className="w-1.5 h-1.5 bg-white rounded-full m-auto" />}
                                    {isActive && (
                                       <div className="absolute -top-1.5 -left-1.5 w-7 h-7 bg-amber-500/10 rounded-full animate-ping pointer-events-none" />
                                    )}
                                 </button>
                                 <div className={`absolute -bottom-7 text-[8px] font-black uppercase tracking-tight whitespace-nowrap transition-all ${
                                   isActive ? "opacity-100 text-navy translate-y-0" : "opacity-30 translate-y-1 group-hover/step:opacity-60"
                                 }`}>
                                   {step}
                                 </div>
                               </div>
                             );
                          })}
                       </div>
                    </div>
                  )}

                  {/* Inline Edit Form */}
                  {isEditing && (
                    <div className="p-8 bg-slate-50 border-b border-border-main/50 animate-fade-down shadow-inner relative z-20">
                       <div className="max-w-3xl mx-auto space-y-5">
                          <div className="flex items-center justify-between mb-1">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                                   <Icon name="PlusCircle" size={16} />
                                </div>
                                <div>
                                   <h4 className="text-[11px] font-black text-navy uppercase tracking-widest leading-none">Update Manual Logistik</h4>
                                   <p className="text-[9px] font-bold text-text-light mt-1 opacity-50">Tambahkan catatan pergerakan muatan terbaru</p>
                                </div>
                             </div>
                             <button onClick={() => setShowLogForm(false)} className="px-3 py-1.5 rounded-lg text-[10px] font-black text-red-brand hover:bg-red-brand-light transition-colors uppercase tracking-widest">Tutup</button>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-text-med uppercase tracking-widest px-1 flex items-center gap-2">
                                   <Icon name="MapPin" size={10} className="text-amber-500" /> Lokasi Terkini
                                </label>
                                <input 
                                  className="input-field h-11 font-bold bg-white border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all text-[12px]" 
                                  placeholder="Cth: Gerbang Tol Cikampek" 
                                  value={newLog.location || ""} 
                                  onChange={e => setNewLog({...newLog, location: e.target.value})} 
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-text-med uppercase tracking-widest px-1 flex items-center gap-2">
                                   <Icon name="MessageSquare" size={10} className="text-amber-500" /> Keterangan / Kejadian
                                </label>
                                <input 
                                  className="input-field h-11 font-medium bg-white border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all text-[12px]" 
                                  placeholder="Cth: Antrian muat..." 
                                  value={newLog.info || ""} 
                                  onChange={e => setNewLog({...newLog, info: e.target.value})} 
                                />
                             </div>
                          </div>
                          
                          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200/50">
                             <button className="h-10 px-5 text-[10px] font-black uppercase tracking-widest text-text-light hover:bg-slate-200 rounded-lg transition-colors" onClick={() => setShowLogForm(false)}>Batal</button>
                             <button 
                                className="h-10 px-8 bg-amber-500 text-white shadow-lg shadow-amber-500/20 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-amber-600 transition-all active:scale-95 flex items-center gap-2" 
                                onClick={addManualLog} 
                                disabled={loading}
                             >
                                {loading && <Icon name="Loader2" size={14} className="animate-spin" />}
                                Simpan Log Pergerakan
                             </button>
                          </div>
                       </div>
                    </div>
                  )}

                  {/* Log Footer */}
                  <div className="px-5 py-3 flex flex-wrap gap-4 items-center bg-white border-t border-border-main/20">
                     <div className="flex items-center gap-2 text-text-light/40">
                        <Icon name="History" size={12} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Logs:</span>
                     </div>
                     
                     {s.posisi_log?.length > 0 ? (
                        <div className="flex-1 flex items-center gap-3 overflow-hidden">
                           <div className="text-[11px] font-bold text-navy italic truncate flex-1 leading-relaxed opacity-80 decoration-amber-500/20">
                              "{s.posisi_log[0].info || "-"}" @ {s.posisi_log[0].location}
                           </div>
                           <div className="text-[9px] font-black text-text-light shrink-0 opacity-40 bg-slate-100 px-2 py-0.5 rounded-md tabular-nums">
                              {s.posisi_log[0].date} • {s.posisi_log[0].time}
                           </div>
                        </div>
                     ) : (
                        <div className="text-[10px] font-bold text-text-light opacity-30 italic">Belum ada riwayat update</div>
                     )}

                     {!isEditing && (
                       <div className="ml-auto flex gap-2">
                          <button 
                             onClick={() => {
                                const lastLog = s.posisi_log?.[0];
                                let statusText = s.status_muatan;
                                if (lastLog) {
                                   const parts = [];
                                   parts.push(lastLog.status || s.status_muatan);
                                   if (lastLog.location) parts.push(`di ${lastLog.location}`);
                                   // Only add info if it's not the generic stepper update message
                                   if (lastLog.info && !lastLog.info.includes("Status diperbarui via Stepper")) {
                                      parts.push(lastLog.info);
                                   }
                                   statusText = parts.join(", ");
                                }
                                
                                const text = `*Update Status Muatan*\n${s.order_id}\n\n${s.lokasi_muat} - ${s.lokasi_bongkar}\n\nArmada : ${s.unit_muatan || "—"}\nSopir : ${s.nama_sopir || "—"}\nNo Polisi : ${s.no_polisi || "—"}\nMuatan : ${s.muatan || "—"}\n\nStatus :\n${statusText}\n\nTerima kasih\nPT SJM`;
                                navigator.clipboard.writeText(text);
                                showToast("Konfirmasi status di-copy ke clipboard!");
                             }}
                             className={`h-8 px-4 rounded-xl bg-green-brand/10 text-green-brand text-[9px] font-black uppercase tracking-widest hover:bg-green-brand hover:text-white transition-all flex items-center gap-1.5 shadow-sm border border-green-brand/20 ${isCancelled ? "opacity-20 grayscale pointer-events-none" : ""}`}
                          >
                             <Icon name="Send" size={12} /> Konfirmasi
                          </button>
                          <button 
                             onClick={() => { setSelectedSO(s); setShowLogForm(true); }}
                             className={`h-8 px-4 rounded-xl border border-navy/20 bg-navy/5 text-navy text-[9px] font-black uppercase tracking-widest hover:bg-navy hover:text-white transition-all flex items-center gap-1.5 ${isCancelled ? "opacity-20 grayscale pointer-events-none" : ""}`}
                          >
                             <Icon name="Plus" size={12} /> Log
                          </button>
                          <button 
                             onClick={() => onSOClick(s.order_id)}
                             className="h-8 px-4 rounded-xl border border-border-main bg-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-sm"
                          >
                             Detail
                          </button>
                       </div>
                     )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
