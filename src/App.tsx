import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
    APP_NAME, APP_TAGLINE, APP_VERSION, APP_COMPANY, ROLE_COLOR, ROLE_BG 
} from "@/src/constants";
import { 
    fmt, fmtShort, filterByPeriod, filterUpToPeriod 
} from "@/src/utils";
import { api, authActions, supabase } from "@/src/api";
import { buildMeta } from "@/src/lib/activityLogger";
import { SectionHeader, Icon, statusBadge, NotificationBadge, Card, useConfirm, useToast, Spinner } from "@/src/components/SJMComponents";
import { Dashboard } from "@/src/pages/Dashboard";
import { JurnalUmum } from "@/src/pages/JurnalUmum";
import { SalesOrderPage } from "@/src/pages/SalesOrder";
import { OperasionalPage } from "@/src/pages/Operasional";
import { HutangPiutangPage } from "@/src/pages/HutangPiutang";
import { KeuanganPage } from "@/src/pages/Keuangan";
import { UpdateMuatan } from "@/src/pages/UpdateMuatan";
import { ApprovalPage } from "@/src/pages/ApprovalPage";
import { KontakPage } from "@/src/pages/Kontak";
import { LaporanPage } from "@/src/pages/Laporan";
import { ArmadaPage } from "@/src/pages/Armada";
import { InvoicePage } from "@/src/pages/InvoicePage";
import { QuotationPage } from "@/src/pages/QuotationPage";
import { MasterPage } from "@/src/pages/Master";
import { Loader2, LogOut, Plus, ChevronRight, ChevronLeft, Search, User, Power, AlertCircle } from "lucide-react";

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
const LoginPage = ({ onLogin }: any) => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (!username.trim()) return setErr("Username wajib diisi");
    setLoading(true);
    try {
      const session = await authActions.signIn(username);
      const profile = await authActions.getProfile(null, session.user.email);
      if (!profile) throw new Error("Akun tidak ditemukan");
      if (profile.status === "Nonaktif") throw new Error("Akun tidak aktif. Hubungi Admin.");
      onLogin({ session, profile });
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative center accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/2 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
        <div className="text-center mb-10 animate-fade-down">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20 mb-6 mx-auto">
            <span className="text-2xl font-black italic">S</span>
          </div>
          <h1 className="text-3xl font-black text-text-main tracking-tighter leading-none">SJM Flow</h1>
          <p className="text-[11px] font-bold text-text-light mt-2 block">
            PT Sugiarto Jaya Mandiri · v3.1
          </p>
        </div>
        
        <Card className="w-full p-8 shadow-xl shadow-black/[0.03] border-border-main/50 bg-white rounded-2xl">
          <div className="mb-8">
            <h2 className="text-[15px] font-black text-text-main tracking-tight">Masuk ke akun</h2>
          </div>
          
          <div className="space-y-5">
            <div className="space-y-1.5">
              <div className="relative">
                <input 
                  className="input-field h-12 text-[14px] font-medium tracking-tight bg-white border-border-main shadow-none placeholder:opacity-50" 
                  value={username || ""} 
                  onChange={e => setUsername(e.target.value)} 
                  placeholder="Username" 
                  onKeyDown={e => e.key === "Enter" && submit()} 
                />
              </div>
            </div>
            
            {err && (
              <div className="text-center">
                <div className="text-[11px] font-bold text-red-brand bg-red-brand-light py-2 px-3 rounded-lg inline-block border border-red-brand/10">
                   {err}
                </div>
              </div>
            )}
            
            <button 
              className="btn-primary w-full h-12 text-[13px] font-black flex items-center justify-center gap-2 shadow-lg shadow-accent/20 active:scale-95 transition-all" 
              onClick={submit} 
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin text-white" size={18} />
              ) : (
                <>Masuk <Icon name="ArrowRight" size={16} /></>
              )}
            </button>
          </div>
        </Card>
        
        <div className="mt-20">
          <p className="text-[11px] font-bold text-text-light/50 opacity-60 italic">© {new Date().getFullYear()} SJM Group</p>
        </div>
      </div>
    </div>
  );
};


// ─── ARMADA POSITION FORM ───────────────────────────────────────────────────
const ArmadaPositionForm = ({ armadaDetail, setGlobalArmadaDetail, setArmada, logAction, showToast }: any) => {
  const [pos, setPos] = useState({ loc: "", info: "" });
  const [loading, setLoading] = useState(false);
  const latest = armadaDetail.posisi_log?.[0];

  const handleUpdate = async () => {
    if (!pos.loc) return showToast?.("Pilih lokasi terlebih dahulu", "info");
    setLoading(true);
    try {
      const entry = {
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString("id-ID"),
        location: pos.loc,
        info: pos.info,
        status: "Update Posisi"
      };
      const newLog = [entry, ...(armadaDetail.posisi_log || [])];
      await api.updateArmada(armadaDetail.id, { posisi_log: newLog });

      const updated = { ...armadaDetail, posisi_log: newLog };
      setGlobalArmadaDetail(updated);
      setArmada((p: any[]) => p.map(a => a.id === updated.id ? updated : a));
      setPos({ loc: "", info: "" });
      logAction(`Update Posisi Armada: ${updated.no_polisi}`, { location: entry.location });
      showToast?.("Posisi armada berhasil diperbarui");
    } catch (e: any) { showToast?.("Gagal update: " + e.message, "error"); }
    setLoading(false);
  };

  return (
    <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-inner">
      <div className="mb-4">
        <div className="text-[13px] font-black text-indigo-700 flex items-center gap-2 mb-1">
          <Icon name="MapPin" size={14} className="animate-bounce" /> 
          {latest ? latest.location : "Belum ada data posisi"}
        </div>
        <div className="text-[10px] font-bold text-indigo-400 leading-none">
          Terakhir update: {latest ? `${latest.date} ${latest.time}` : "—"}
        </div>
      </div>
      
      <div className="space-y-2">
        <input 
          className="input-field bg-white/80 focus:bg-white text-[12px] h-10 border-indigo-200" 
          placeholder="Ketik lokasi armada terkini..." 
          value={pos.loc || ""} 
          onChange={e => setPos({...pos, loc: e.target.value})} 
        />
        <textarea 
          className="input-field bg-white/80 focus:bg-white text-[12px] min-h-[60px] py-3 border-indigo-200 resize-none" 
          placeholder="Keterangan singkat..." 
          value={pos.info || ""} 
          onChange={e => setPos({...pos, info: e.target.value})} 
        />
        <button 
          className="btn-primary w-full h-11 text-[12px] font-bold shadow-lg shadow-indigo-200" 
          onClick={handleUpdate} 
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
               <Loader2 className="animate-spin" size={14} /> Memperbarui...
            </div>
          ) : "Simpan Lokasi Terkini"}
        </button>
      </div>
      
      {armadaDetail.posisi_log?.length > 0 && (
        <div className="mt-5 pt-4 border-t border-dashed border-indigo-200">
          <div className="text-[11px] font-bold text-indigo-400 mb-3 leading-none italic">Log Terakhir</div>
          <div className="space-y-2">
            {armadaDetail.posisi_log.slice(0, 3).map((l: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center text-[11px] font-bold text-indigo-600 bg-white/40 px-3 py-1.5 rounded-lg border border-white/60">
                <span className="truncate pr-4">{l.location}</span>
                <span className="text-[9px] opacity-60 shrink-0">{l.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── DETAIL MODALS ──────────────────────────────────────────────────────────
const SODetailModal = ({ data, onClose, coa, jurnal, invoices, currentUser, handleNav, setPendingEditSO, onJurnalClick, onArmadaClick }: any) => {
  if (!data) return null;
  const relatedJurnals = (jurnal || []).filter((j: any) =>
    String(j.no_so || "").split(",").map((s: string) => s.trim()).includes(data.order_id)
  );
  const relatedInvoices = (invoices || []).filter((inv: any) =>
    (inv.so_order_ids || []).includes(data.order_id)
  );

  return (
    <Card className="w-full max-w-xl h-full flex flex-col shadow-2xl animate-fade-left p-0 border-none rounded-none bg-white overflow-hidden relative z-10" onClick={e => e.stopPropagation()}>
      <div className="p-4 border-b border-border-main flex justify-between items-center bg-white sticky top-0 z-20">
        <div>
          <h3 className="text-sm font-black text-text-main tracking-tight uppercase">Detail Sales Order</h3>
          <div className="text-[9px] font-bold text-accent tracking-widest">{data.order_id}</div>
        </div>
        <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors" onClick={onClose}>
          <Icon name="X" size={18} className="text-text-med" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 no-scrollbar space-y-6 bg-white">
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="col-span-2">
                  <div className="text-[9px] font-bold text-text-light uppercase tracking-widest label-glow mb-1">Customer</div>
                  <div className="text-[15px] font-black text-text-main tracking-tight leading-tight">{data.customer}</div>
               </div>
               
               <div>
                  <div className="text-[9px] font-bold text-text-light uppercase tracking-widest label-glow mb-1">Tanggal Muat</div>
                  <div className="text-[13px] font-black text-text-main tabular-nums italic">{data.tgl_muat}</div>
               </div>
               <div>
                  <div className="text-[9px] font-bold text-text-light uppercase tracking-widest label-glow mb-1">Status Muatan</div>
                  <div className="mt-1">{statusBadge(data.status_muatan)}</div>
               </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-border-main/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-accent/5 -rotate-45 translate-x-8 -translate-y-8" />
                <div className="text-[9px] font-bold text-text-light uppercase tracking-widest mb-2 opacity-50">Rute Operasional</div>
                <div className="flex items-center gap-3">
                    <div className="flex-1 text-[12px] font-black text-text-main truncate" title={data.lokasi_muat}>{data.lokasi_muat}</div>
                    <Icon name="ArrowRight" size={12} className="text-accent/30" />
                    <div className="flex-1 text-[12px] font-black text-text-main truncate" title={data.lokasi_bongkar}>{data.lokasi_bongkar}</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
               <div>
                  <div className="text-[9px] font-bold text-text-light uppercase tracking-widest label-glow mb-1">Unit Armada</div>
                  <button
                    className="text-[13px] font-black text-accent tabular-nums italic uppercase tracking-tight hover:underline"
                    onClick={() => data.no_polisi && onArmadaClick && onArmadaClick(data.no_polisi)}
                  >{data.no_polisi || "—"}</button>
               </div>
               <div>
                  <div className="text-[9px] font-bold text-text-light uppercase tracking-widest label-glow mb-1">Nama Sopir</div>
                  <div className="text-[13px] font-bold text-text-main">{data.nama_sopir || "—"}</div>
               </div>
            </div>

            {data.keterangan && (
              <div className="pt-2">
                  <div className="text-[9px] font-bold text-text-light uppercase tracking-widest label-glow mb-1">Keterangan</div>
                  <div className="text-[11px] font-medium text-text-med leading-relaxed bg-slate-50 p-3 rounded-lg border-l-2 border-accent italic">{data.keterangan}</div>
              </div>
            )}

            <div className="pt-4 border-t border-border-main/50 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <h4 className="text-[9px] font-black text-text-light uppercase tracking-widest">Biaya & Keuangan</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-4 rounded-xl border border-border-main/50 shadow-sm flex flex-col justify-center">
                    <div className="text-[9px] font-black text-text-light uppercase tracking-widest opacity-60 mb-1 leading-none">Harga Pengiriman</div>
                    <div className="text-[15px] font-black text-navy tabular-nums leading-none">{fmt(data.harga_pengiriman || 0)}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-border-main/50 shadow-sm flex flex-col justify-center">
                    <div className="text-[9px] font-black text-text-light uppercase tracking-widest opacity-60 mb-1 leading-none">Asuransi Trip</div>
                    <div className="text-[15px] font-black text-navy tabular-nums leading-none">{fmt(data.harga_asuransi || 0)}</div>
                  </div>
                  <div className="col-span-2 bg-navy p-5 rounded-2xl flex items-center justify-between border border-white/10 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-full bg-white/5 -skew-x-12 translate-x-10 transition-transform group-hover:translate-x-6" />
                    <div>
                      <div className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1.5 leading-none italic">Total Billable Amount (Inc. PPN)</div>
                      <div className="text-2xl font-black text-white tabular-nums tracking-tighter leading-none">{fmt(data.total_harga_pajak || data.total_harga || 0)}</div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg ${data.nilai_pajak > 0 ? "bg-accent text-white" : "bg-white/10 text-white/40"}`}>
                      {data.nilai_pajak > 0 ? "Taxable (1.1%)" : "Non-Taxable"}
                    </div>
                  </div>
                </div>
            </div>

            {data.posisi_log?.length > 0 && (
              <div className="pt-4 border-t border-border-main/50">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-brand" />
                    <h4 className="text-[9px] font-black text-text-light uppercase tracking-widest">Riwayat Operasional / Muatan</h4>
                  </div>
                  <div className="space-y-3 pl-2 border-l border-slate-200">
                    {data.posisi_log.slice(0, 5).map((log: any, idx: number) => (
                      <div key={idx} className="relative pl-4 pb-2 group">
                        <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-slate-200 border-2 border-white group-first:bg-blue-brand" />
                        <div className="text-[11px] font-black text-navy leading-none mb-1">{log.location || "Log Entry"}</div>
                        <div className="text-[10px] font-medium text-text-med leading-tight mb-0.5">{log.info}</div>
                        <div className="text-[8px] font-bold text-text-light opacity-50 tabular-nums lowercase italic">{log.date} @ {log.time}</div>
                      </div>
                    ))}
                  </div>
              </div>
            )}
        </div>

        {/* Invoice & Dokumen */}
        <div className="pt-4 border-t border-border-main/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green-brand" />
            <h4 className="text-[9px] font-black text-text-light uppercase tracking-widest">Invoice &amp; Dokumen</h4>
          </div>

          {relatedInvoices.length === 0 ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div>
                <div className="text-[10px] font-bold text-amber-700">Belum ada invoice</div>
                <div className="text-[9px] text-amber-600 opacity-70 mt-0.5">SO ini belum dibuatkan invoice</div>
              </div>
              {data.status_muatan === 'Completed' && (
                <button
                  onClick={() => { handleNav("operasional", "invoice"); onClose(); }}
                  className="h-7 px-3 bg-accent text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-accent/90 transition-colors shrink-0"
                >
                  + Buat Invoice
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {relatedInvoices.map((inv: any) => {
                const STATUS_COLOR: Record<string, string> = {
                  'Belum Bayar':       '#B85450',
                  'Parsial':           '#C4914A',
                  'Lunas':             '#6B8E23',
                  'Lebih Bayar':       '#4A6FA5',
                  'Perlu Verifikasi':  '#8b5cf6',
                };
                const sc = STATUS_COLOR[inv.status_bayar || 'Belum Bayar'] || '#666';
                return (
                  <div key={inv.id} className="p-3.5 rounded-xl bg-white border border-border-main space-y-3">
                    {/* Header invoice */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-black text-accent uppercase tracking-tight">{inv.no_invoice}</div>
                        <div className="text-[9px] text-text-light mt-0.5">
                          {inv.tgl_invoice ? new Date(inv.tgl_invoice).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-[12px] font-black text-text-main tabular-nums">{fmt(inv.total_setelah_pajak || 0)}</div>
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-bold" style={{ backgroundColor: sc + '20', color: sc }}>
                          {inv.status_bayar || 'Belum Bayar'}
                        </span>
                      </div>
                    </div>

                    {/* Dokumen fisik */}
                    {(inv.gdrive_url || inv.no_resi || inv.status_dokumen) && (
                      <div className="pt-2 border-t border-border-main/30 space-y-1.5">
                        {inv.status_dokumen && (
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-text-light w-16 shrink-0">Status</span>
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                              inv.status_dokumen === 'Diterima Customer' ? 'bg-success/10 text-success' :
                              inv.status_dokumen === 'Terkirim'          ? 'bg-info/10 text-info' :
                              'bg-slate-100 text-slate-500'
                            }`}>{inv.status_dokumen}</span>
                          </div>
                        )}
                        {inv.gdrive_url && (
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-text-light w-16 shrink-0">Scan</span>
                            <a href={inv.gdrive_url} target="_blank" rel="noopener noreferrer"
                              className="text-[9px] font-bold text-accent hover:underline flex items-center gap-1">
                              <Icon name="FileText" size={10} /> Buka Drive
                              <Icon name="ExternalLink" size={9} />
                            </a>
                          </div>
                        )}
                        {inv.no_resi && (
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-text-light w-16 shrink-0">Resi</span>
                            <span className="text-[9px] font-mono text-text-main">{inv.ekspedisi} {inv.no_resi}</span>
                            <a
                              href={`https://www.google.com/search?q=lacak+resi+${encodeURIComponent(inv.ekspedisi || '')}+${inv.no_resi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[8px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full hover:bg-accent/20 transition-colors"
                            >
                              Lacak
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {relatedJurnals.length > 0 && (
           <div className="pt-4 border-t border-border-main/50">
             <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <h4 className="text-[9px] font-black text-text-light uppercase tracking-widest">Jurnal Finansial Terkait</h4>
             </div>
             <div className="space-y-2">
               {relatedJurnals.map((j: any) => (
                 <div 
                   key={j.id} 
                   onClick={() => onJurnalClick(j.no_jurnal)}
                   className="p-3.5 rounded-xl bg-white border border-border-main hover:border-accent hover:shadow-lg hover:shadow-accent/5 transition-all cursor-pointer group flex items-center justify-between"
                 >
                   <div className="flex-1 min-w-0 pr-3">
                     <div className="text-[9px] font-black text-accent uppercase tracking-widest mb-0.5">{j.no_jurnal}</div>
                     <div className="text-[11px] font-bold text-text-main truncate group-hover:text-accent transition-colors">{j.keterangan}</div>
                   </div>
                   <div className="text-right shrink-0">
                     <div className="text-[12px] font-black text-text-main tabular-nums">{fmt(j.total_debit)}</div>
                     <div className="text-[8px] font-bold text-text-light uppercase mt-0.5 opacity-60 tabular-nums">{j.tanggal}</div>
                   </div>
                 </div>
               ))}
             </div>
           </div>
        )}
      </div>

      <div className="p-5 border-t border-border-main bg-slate-50/50 flex gap-2 sticky bottom-0">
         <button className="flex-1 h-10 rounded-xl bg-white border border-border-main/60 text-text-med font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-colors" onClick={onClose}>Close</button>
         {["Admin", "Operasional"].includes(currentUser?.role) && (
           <button className="flex-1 h-10 bg-accent text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all active:scale-95" onClick={() => {
               handleNav("operasional", "so");
               setPendingEditSO(data.order_id);
               onClose();
           }}>Edit Transaksi</button>
         )}
      </div>
    </Card>
  );
};
const JurnalDetailModal = ({ data, onClose, onSOClick }: any) => {
  if (!data) return null;

  return (
    <Card className="w-full max-w-2xl h-full flex flex-col shadow-2xl animate-fade-left p-0 border-none rounded-none bg-white overflow-hidden relative z-10" onClick={e => e.stopPropagation()}>
      <div className="p-4 border-b border-border-main flex justify-between items-center bg-white sticky top-0 z-20">
        <div>
          <h3 className="text-sm font-black text-text-main tracking-tight uppercase">Detail Jurnal Umum</h3>
          <div className="text-[9px] font-bold text-accent tracking-widest">{data.no_jurnal}</div>
        </div>
        <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors" onClick={onClose}>
          <Icon name="X" size={18} className="text-text-med" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 no-scrollbar space-y-6 bg-white">
         <div className="grid grid-cols-2 gap-4">
            <div>
                <div className="text-[9px] font-bold text-text-light uppercase tracking-widest label-glow mb-1">Tanggal Transaksi</div>
                <div className="text-[13px] font-black text-text-main tabular-nums italic uppercase">{data.tanggal}</div>
            </div>
            <div>
                <div className="text-[9px] font-bold text-text-light uppercase tracking-widest label-glow mb-1">Nomor SO</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.no_so ? (data.no_so as string).split(",").map((s: string) => (
                    <button
                      key={s.trim()}
                      onClick={() => onSOClick && onSOClick(s.trim())}
                      className="text-[11px] font-black text-accent bg-accent/5 hover:bg-accent hover:text-white px-2 py-0.5 rounded border border-accent/20 transition-all uppercase tracking-tight"
                    >{s.trim()}</button>
                  )) : <span className="text-[13px] font-black text-text-light opacity-30">—</span>}
                </div>
            </div>
            <div className="col-span-2 pt-1">
                <div className="text-[9px] font-bold text-text-light uppercase tracking-widest label-glow mb-1">Keterangan Jurnal</div>
                <div className="text-[12px] font-bold text-text-main leading-tight bg-slate-50 p-4 rounded-xl border-l-2 border-accent italic">
                  {data.keterangan}
                </div>
            </div>
         </div>

         <div className="bg-white rounded-xl border border-border-main/60 overflow-hidden shadow-sm">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 border-b border-border-main/40">
                        <th className="px-4 py-3 text-left text-[9px] font-black text-text-light uppercase tracking-widest opacity-60">AKUN</th>
                        <th className="px-4 py-3 text-right text-[9px] font-black text-text-light uppercase tracking-widest opacity-60">DEBIT</th>
                        <th className="px-4 py-3 text-right text-[9px] font-black text-text-light uppercase tracking-widest opacity-60">KREDIT</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-main/20">
                    {(data.jurnal_detail || []).map((d: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/20 transition-colors">
                            <td className="px-4 py-4">
                                <div className="text-[11px] font-black text-text-main leading-none mb-1 tabular-nums">{d.coa_kode}</div>
                                <div className="text-[9px] font-bold text-text-light uppercase tracking-tighter opacity-60 truncate max-w-[120px]">{d.nama_akun}</div>
                            </td>
                            <td className="px-4 py-4 text-right tabular-nums text-[11px] font-bold whitespace-nowrap min-w-[140px]">
                               {Number(d.debit) > 0 ? (
                                 <span className="text-green-brand">{fmt(d.debit)}</span>
                               ) : (
                                 <span className="text-text-light opacity-30">—</span>
                               )}
                            </td>
                            <td className="px-4 py-4 text-right tabular-nums text-[11px] font-bold whitespace-nowrap min-w-[140px]">
                               {Number(d.kredit) > 0 ? (
                                 <span className="text-red-brand">{fmt(d.kredit)}</span>
                               ) : (
                                 <span className="text-text-light opacity-30">—</span>
                               )}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-slate-900 border-t border-slate-700">
                    <tr>
                        <td className="px-4 py-4 text-[9px] font-black text-white/50 uppercase tracking-widest italic">BALANCE</td>
                        <td className="px-4 py-4 text-right font-black text-[#10B981] text-[12px] tabular-nums whitespace-nowrap">{fmt(data.total_debit)}</td>
                        <td className="px-4 py-4 text-right font-black text-[#EF4444] text-[12px] tabular-nums whitespace-nowrap">{fmt(data.total_kredit)}</td>
                    </tr>
                </tfoot>
            </table>
         </div>
      </div>

      <div className="p-5 border-t border-border-main bg-slate-50/50 flex justify-end">
          <button 
            className="px-8 h-10 rounded-xl bg-white border border-border-main text-text-main font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm" 
            onClick={onClose}
          >
            Close Detail
          </button>
      </div>
   </Card>
  );
};

const ArmadaDetailModal = ({ data, onClose, armadaDokumen, so, jurnal, armadaService, setGlobalArmadaDetail, setArmada, logAction, handleSOClick, handleJurnalClick, showToast }: any) => {
  if (!data) return null;
  const docs = (armadaDokumen || []).filter((d: any) => d.no_polisi === data.no_polisi);
  const services = (armadaService || []).filter((s: any) => s.no_polisi === data.no_polisi).slice(0, 5);
  const mySOs = (so || []).filter((s: any) => s.no_polisi === data.no_polisi).slice(0, 5);
  
  // Financial snippet for this unit
  const revenue = (jurnal || []).filter((j: any) => 
    (j.no_polisi === data.no_polisi) || (j.keterangan || "").toUpperCase().includes(data.no_polisi.toUpperCase())
  ).reduce((acc: number, j: any) => acc + (j.jurnal_detail || []).filter((d: any) => String(d.coa_kode).startsWith("4")).reduce((sa: number, sd: any) => sa + (Number(sd.kredit)-Number(sd.debit)), 0), 0);

  return (
    <Card className="w-full max-w-2xl h-full rounded-none flex flex-col shadow-2xl animate-fade-left p-0 border-none relative z-10" onClick={e => e.stopPropagation()}>
      <div className="p-6 border-b border-border-main flex justify-between items-center bg-slate-50/50">
        <div>
          <h3 className="text-xl font-black tracking-tight">Detail Unit Armada</h3>
          <div className="text-[11px] font-black text-blue-brand uppercase tracking-widest mt-1">{data.no_polisi} — {data.no_armada || "Truck Unit"}</div>
        </div>
        <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors" onClick={onClose}>
          <Icon name="X" size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar bg-white/50 backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-4">
           <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-32">
              <div className="text-[10px] font-black text-text-light uppercase tracking-widest opacity-50 italic">Total Revenue Unit</div>
              <div className="text-2xl font-black text-navy">{fmtShort(revenue)}</div>
           </div>
           <div className="p-5 rounded-3xl bg-amber-50 border border-amber-100 flex flex-col justify-between h-32 shadow-sm">
              <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest opacity-50 italic">Status Armada</div>
              <div className="mt-2">{statusBadge(data.status || "Aktif")}</div>
           </div>
        </div>

        <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-4 bg-blue-brand rounded-full shadow-[0_0_8px_rgba(51,65,85,0.3)]" />
              <h4 className="text-[11px] font-black text-text-light uppercase tracking-widest opacity-60">Spesifikasi Kendaraan</h4>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6 px-4">
               <div>
                  <div className="text-[10px] font-black text-text-light uppercase tracking-widest mb-1 opacity-50 italic">Merk / Body</div>
                  <div className="text-[14px] font-black text-navy">{data.merk} {data.jenis}</div>
               </div>
               <div>
                  <div className="text-[10px] font-black text-text-light uppercase tracking-widest mb-1 opacity-50 italic">Th. Pembuatan</div>
                  <div className="text-[14px] font-black text-navy">{data.tahun || "—"}</div>
               </div>
               <div>
                  <div className="text-[10px] font-black text-text-light uppercase tracking-widest mb-1 opacity-50 italic">Kepemilikan</div>
                  <div className="text-[14px] font-bold text-text-main">{data.kepemilikan || "SJM GROUP"}</div>
               </div>
               <div>
                  <div className="text-[10px] font-black text-text-light uppercase tracking-widest mb-1 opacity-50 italic">Terakhir Service</div>
                  <div className="text-[14px] font-bold text-text-main">{services[0]?.tgl_service || "—"}</div>
               </div>
            </div>
        </section>

        <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-4 bg-orange-400 rounded-full" />
              <h4 className="text-[11px] font-black text-text-light uppercase tracking-widest opacity-60">Posisi & Logistik Terakhir</h4>
            </div>
            <div className="px-2">
              <ArmadaPositionForm 
                 armadaDetail={data} 
                 setGlobalArmadaDetail={setGlobalArmadaDetail} 
                 setArmada={setArmada} 
                 logAction={logAction} 
                 showToast={showToast}
              />
            </div>
        </section>

        {mySOs.length > 0 && (
           <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-4 bg-accent rounded-full" />
              <h4 className="text-[11px] font-black text-text-light uppercase tracking-widest opacity-60">Penugasan SO Terakhir</h4>
            </div>
            <div className="space-y-3">
               {mySOs.map((s: any) => (
                  <div 
                    key={s.id} 
                    onClick={() => handleSOClick(s.order_id)}
                    className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-accent/40 transition-all cursor-pointer group shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-2">
                       <div className="text-[12px] font-black text-navy italic">{s.order_id}</div>
                       {statusBadge(s.status_muatan)}
                    </div>
                    <div className="text-[13px] font-bold text-text-main line-clamp-1">{s.customer}</div>
                    <div className="text-[10px] font-bold text-text-light mt-1 flex items-center gap-2 opacity-50">
                       <Icon name="Calendar" size={10} /> {s.tgl_muat}
                    </div>
                  </div>
               ))}
            </div>
           </section>
        )}

        {docs.length > 0 && (
           <section>
             <div className="flex items-center gap-3 mb-6">
               <div className="w-1.5 h-4 bg-rose-500 rounded-full" />
               <h4 className="text-[11px] font-black text-text-light uppercase tracking-widest opacity-60">Legalitas & Dokumen</h4>
             </div>
             <div className="grid grid-cols-1 gap-2">
                {docs.map((d: any) => {
                   const isExp = new Date(d.tgl_expired) < new Date();
                   return (
                      <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                         <div className="flex items-center gap-3">
                            <Icon name="FileText" size={14} className={isExp ? "text-rose-500" : "text-blue-brand"} />
                            <span className="text-[12px] font-bold text-text-main">{d.nama_dokumen}</span>
                         </div>
                         <div className={`text-[11px] font-black tabular-nums ${isExp ? "text-rose-600" : "text-emerald-600"}`}>
                            {d.tgl_expired}
                         </div>
                      </div>
                   );
                })}
             </div>
           </section>
        )}
      </div>

      <div className="p-6 border-t border-border-main bg-slate-50">
         <button className="w-full h-12 btn-primary font-black uppercase tracking-widest text-[11px] shadow-xl shadow-blue-brand/20" onClick={onClose}>Tutup Detail Armada</button>
      </div>
    </Card>
  );
};

const SopirDetailModal = ({ data, onClose, so, handleSOClick }: any) => {
  if (!data) return null;

  return (
    <Card className="w-full max-w-2xl h-full rounded-none flex flex-col shadow-2xl animate-fade-left p-0 border-none relative z-10" onClick={e => e.stopPropagation()}>
       <div className="p-6 border-b border-border-main flex justify-between items-center bg-slate-50/50">
         <div>
           <h3 className="text-xl font-black tracking-tight">Profil Personil Sopir</h3>
           <div className="text-[11px] font-black text-amber-500 uppercase tracking-widest mt-1">SJM PERSONNEL • ID: {data.id?.slice(-8).toUpperCase()}</div>
         </div>
         <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors" onClick={onClose}>
           <Icon name="X" size={24} />
         </button>
       </div>

       <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
          <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner">
             <div className="w-20 h-20 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center text-3xl font-black shadow-lg shadow-amber-100/50 border-2 border-white">
                {data.nama?.[0]}
             </div>
             <div>
                <div className="text-2xl font-black text-text-main tracking-tight leading-tight mb-1">{data.nama}</div>
                <div className="flex items-center gap-2 text-[13px] font-bold text-text-med">
                   <Icon name="Phone" size={14} className="text-amber-500" />
                   {data.no_telp || "—"}
                </div>
             </div>
          </div>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-4 bg-amber-400 rounded-full" />
              <h4 className="text-[11px] font-black text-text-light uppercase tracking-[0.2em]">Data Identitas</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="col-span-2 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="text-[10px] font-black text-text-light uppercase tracking-widest mb-1 leading-none italic">Alamat Domisili</div>
                  <div className="text-[14px] font-bold text-text-main leading-relaxed">{data.alamat || "Alamat belum diperbarui"}</div>
               </div>
               <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="text-[10px] font-black text-text-light uppercase tracking-widest mb-1 leading-none italic">No. KTP (NIK)</div>
                  <div className="text-[14px] font-black tracking-widest text-text-main">{data.no_ktp || "—"}</div>
               </div>
               <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="text-[10px] font-black text-text-light uppercase tracking-widest mb-1 leading-none italic">No. SIM</div>
                  <div className="text-[14px] font-black tracking-widest text-text-main">{data.no_sim || "—"}</div>
               </div>
            </div>
          </section>
       </div>
       <div className="p-6 border-t border-border-main bg-slate-50">
          <button className="w-full btn-ghost py-4 border border-border-main text-[11px] font-black uppercase tracking-widest" onClick={onClose}>Tutup Profil</button>
       </div>
    </Card>
  );
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeModule, setActiveModule] = useState("dashboard");
  const [activeSub, setActiveSub] = useState("default");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [jurnal, setJurnal] = useState([]);
  const [so, setSo] = useState([]);
  const [customer, setCustomer] = useState([]);
  const [piutang, setPiutang] = useState([]);
  const [coa, setCoa] = useState([]);
  const [armada, setArmada] = useState([]);
  const [armadaDokumen, setArmadaDokumen] = useState([]);
  const [armadaService, setArmadaService] = useState([]);
  const [sopir, setSopir] = useState([]);
  const [users, setUsers] = useState([]);
  const [saldoAwal, setSaldoAwal] = useState([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [activeModals, setActiveModals] = useState<any[]>([]);
  const [pendingEditSO, setPendingEditSO] = useState<string | null>(null);
  const [hpPrefill, setHpPrefill] = useState<any>(null);
  const [jurnalPrefill, setJurnalPrefill] = useState<any>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  // Load invoices on mount
  useEffect(() => {
    api.getInvoices().then(setInvoices).catch(() => {});
  }, []);

  const pushModal = useCallback((type: string, data: any) => {
    setActiveModals(prev => {
        const match = (a: any, b: any, t: string) => {
            if (t === 'so') return a.order_id === b.order_id;
            if (t === 'jurnal') return a.no_jurnal === b.no_jurnal;
            if (t === 'armada') return a.no_polisi === b.no_polisi;
            if (t === 'sopir') return a.id === b.id;
            return false;
        };
        const exists = prev.findIndex(m => m.type === type && match(m.data, data, type));
        if (exists !== -1) {
            // Already there, maybe move to top or just keep? 
            // User wants side-by-side, so let's keep unique
            return prev;
        }
        const newStack = [...prev, { type, data }];
        return newStack.slice(-2); // Max 2 side-by-side
    });
  }, []);

  const closeModal = (idx: number) => {
    setActiveModals(prev => prev.filter((_, i) => i !== idx));
  };

  const clearModals = () => setActiveModals([]);
  
  const expiredDocsCount = (armadaDokumen || []).filter((d: any) => new Date(d.tgl_expired) < new Date()).length;

  const logAction = useCallback(async (msg: string, metadata: any = null) => {
    const log = {
        timestamp: new Date().toISOString(),
        user_name: currentUser?.nama || "Unknown",
        user_email: currentUser?.email || "Unknown",
        action: msg,
        metadata: metadata ? JSON.stringify(metadata) : null
    };
    // Push to state
    setAuditLogs(prev => [{ ...log, id: Math.random().toString(36).substr(2,9) }, ...prev].slice(0, 100));
    // Persist
    await api.addLog(log);
  }, [currentUser]);
  const [lastSubByModule, setLastSubByModule] = useState<any>({});
  const [collapsed, setCollapsed] = useState(false);

  const handleLogin = ({ session, profile }: any) => {
    setSession(session); setCurrentUser(profile);
    api.addLog({
      timestamp: new Date().toISOString(),
      user_name: profile.nama,
      user_email: profile.email,
      action: "User Login",
      metadata: JSON.stringify(buildMeta({ module: 'auth', action_type: 'LOGIN', record_id: profile.email, after_data: { role: profile.role } })),
    });
  };

  const handleLogout = () => {
    confirm({
      title: "Keluar Aplikasi",
      msg: "Apakah Anda yakin ingin keluar dari aplikasi?",
      confirmLabel: "Keluar",
      onConfirm: async () => {
        api.addLog({
          timestamp: new Date().toISOString(),
          user_name: currentUser.nama,
          user_email: currentUser.email,
          action: "User Logout",
          metadata: JSON.stringify(buildMeta({ module: 'auth', action_type: 'LOGOUT', record_id: currentUser.email })),
        });
        setSession(null);
        setCurrentUser(null);
        setActiveModule("dashboard");
        setActiveSub("default");
      }
    });
  };

  const loadJurnal = async () => {
    try { setJurnal(await api.getJurnal()); } catch (err: any) {
      console.error('loadJurnal error:', err);
      showToast('Data jurnal gagal dimuat ulang. Refresh halaman jika data tidak akurat.', 'error');
    }
  };
  const loadSalesOrder = async () => {
    try { setSo(await api.getSO()); } catch (err: any) {
      console.error('loadSalesOrder error:', err);
      showToast('Data Sales Order gagal dimuat ulang. Refresh halaman jika data tidak akurat.', 'error');
    }
  };
  const loadCOA = async () => {
    try { setCoa(await api.getCoa()); } catch { /* silent */ }
  };
  const loadAuditLogs = async () => {
    try { setAuditLogs(await api.getLogs()); } catch { /* silent */ }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, j, s, cu, p, arm, armD, armS, sop, usr, sa, logs] = await Promise.all([
        api.getCoa(), api.getJurnal(), api.getSO(), api.getCustomer(),
        api.getPiutang(), api.getArmada(), api.getArmadaDokumen(), api.getArmadaService(),
        api.getSopir(), authActions.getAllUsers(), api.getSaldoAwal(), api.getLogs()
      ]);
      setCoa(c); setJurnal(j); setSo(s); setCustomer(cu); setPiutang(p || []);
      setArmada(arm); setArmadaDokumen(armD); setArmadaService(armS); setSopir(sop); setUsers(usr); setSaldoAwal(sa);
      setAuditLogs(logs || []);
      setConnected(true);
    } catch (e: any) {
      console.error(e);
      setConnected(false);
      showToast("Gagal memuat data: " + e.message, "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (session) loadData();
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const jurnalChannel = supabase
      .channel('sjm_jurnal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jurnal' }, () => {
        loadJurnal();
      })
      .subscribe();

    const detailChannel = supabase
      .channel('sjm_detail')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jurnal_detail' }, () => {
        loadJurnal();
      })
      .subscribe();

    const soChannel = supabase
      .channel('sjm_so')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_order' }, () => {
        loadSalesOrder();
      })
      .subscribe();

    const coaChannel = supabase
      .channel('sjm_coa')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coa' }, () => {
        loadCOA();
      })
      .subscribe();

    const auditChannel = supabase
      .channel('sjm_audit')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        loadAuditLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(jurnalChannel);
      supabase.removeChannel(detailChannel);
      supabase.removeChannel(soChannel);
      supabase.removeChannel(coaChannel);
      supabase.removeChannel(auditChannel);
    };
  }, [session]);

  const handleSOClick = useCallback((id: string) => {
    const s = (so || []).find((x: any) => x.order_id === id);
    if (s) pushModal("so", s);
  }, [so, pushModal]);

  const handleJurnalClick = useCallback((no: string) => {
    const j = (jurnal || []).find((x: any) => x.no_jurnal === no);
    if (j) pushModal("jurnal", j);
  }, [jurnal, pushModal]);

  const handleGoToJurnal = useCallback((data: any) => {
    setJurnalPrefill(data);
    handleNav("keuangan", "jurnal");
  }, []);

  const handleGoToHP = useCallback((data: any) => {
    setHpPrefill(data);
    handleNav("keuangan", "hutangpiutang");
  }, []);

  const handleArmadaClick = useCallback((noPol: string) => {
    const a = (armada || []).find((x: any) => x.no_polisi === noPol);
    if (a) pushModal("armada", a);
  }, [armada, pushModal]);

  const handleSopirClick = useCallback((id: string) => {
    const s = (sopir || []).find((x: any) => x.id === id);
    if (s) pushModal("sopir", s);
  }, [sopir, pushModal]);

  const { confirm, Modal: ConfirmModalUI } = useConfirm();
  const { showToast, ToastUI } = useToast();

  const NAV_MODULES = [
    { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard", subs: [] },
    { 
      key: "operasional", label: "Operasional", icon: "Truck", 
      subs: [
        { key: "so", label: "Sales Order" },
        { key: "updatemuatan", label: "Update Muatan" },
        { key: "quotation", label: "Quotation" },
        { key: "invoice", label: "Invoice" }
      ]
    },
    { 
      key: "keuangan", label: "Keuangan", icon: "CreditCard", 
      subs: [
        { key: "jurnal", label: "Jurnal Umum" },
        { key: "persetujuan", label: "Persetujuan Jurnal" },
        { key: "hutangpiutang", label: "Hutang & Piutang" }
      ]
    },
    { 
      key: "laporan", label: "Laporan", icon: "FilePieChart", 
      subs: [
        { key: "neraca", label: "Neraca Saldo" },
        { key: "labarugi", label: "Laba Rugi" },
        { key: "bukubesar", label: "Buku Besar" },
        { key: "profit", label: "Profitabilitas" },
        { key: "audit", label: "Log Aktivitas" }
      ]
    },
    { 
      key: "armada", label: "Armada", icon: "Dribbble", // Armada icon
      subs: [
        { key: "dashboard_unit", label: "Dashboard Unit" },
        { key: "unit", label: "Unit List" },
        { key: "dokumen", label: "Dokumen" },
        { key: "service", label: "Service" },
        { key: "sopir", label: "Sopir" }
      ]
    },
    { 
      key: "master", label: "Master", icon: "Settings", 
      subs: [
        { key: "kontak", label: "Kontak" },
        { key: "coa", label: "Master COA" },
        { key: "saldoawal", label: "Saldo Awal" },
        { key: "users", label: "Users" },
        { key: "password", label: "Password" }
      ]
    },
  ];

  const handleNav = (mod: string, sub?: string) => {
    setActiveModule(mod);
    const lastSub = lastSubByModule[mod];
    const defaultSub = (NAV_MODULES.find(m => m.key === mod)?.subs[0]?.key) || "default";
    setActiveSub(sub || lastSub || defaultSub);
  };

  const setSubWithMemory = (sub: string) => {
      setActiveSub(sub);
      setLastSubByModule((p: any) => ({ ...p, [activeModule]: sub }));
  };

  const currentModule = NAV_MODULES.find(m => m.key === activeModule);

  if (!session || !currentUser) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text-main font-sans">
      <ConfirmModalUI />
      <ToastUI />
      {/* Sidebar - Dark Blue as per reference */}
      <aside 
        className={`flex flex-col bg-blue-fantastic border-r border-side-border z-[100] transition-all duration-300 relative group ${collapsed ? "w-[64px]" : "w-[200px]"}`}
      >
        <div className="flex items-center gap-3 px-4 h-[60px] border-b border-white/10 mb-2 overflow-hidden bg-abyssal-blue">
           <div 
             className="w-9 h-9 rounded-md bg-burning-flame flex items-center justify-center flex-shrink-0 shadow-lg shadow-black/20 cursor-pointer transition-all hover:scale-105 active:scale-95" 
             onClick={() => setCollapsed(!collapsed)}
           >
              <span className="text-abyssal-blue font-black text-lg italic uppercase">S</span>
           </div>
           {!collapsed && (
             <div className="animate-fade-right">
                <div className="text-[15px] font-black tracking-tighter text-white leading-none italic">SJM <span className="text-burning-flame">Flow</span></div>
                <div className="text-[8px] font-bold text-white/50 mt-0.5">Logistics v3.1</div>
             </div>
           )}
        </div>

        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto no-scrollbar py-1">
          {NAV_MODULES.map(item => (
            <button 
              key={item.key} 
              onClick={() => handleNav(item.key)}
              title={collapsed ? item.label : ""}
              className={`nav-item w-full ${activeModule === item.key ? "active" : ""} ${collapsed ? "justify-center px-0" : ""}`}
            >
              <Icon name={item.icon} size={collapsed ? 18 : 16} strokeWidth={activeModule === item.key ? 2.5 : 2} />
              {!collapsed && <span className="flex-1 truncate tracking-tight text-left ml-px">{item.label}</span>}
            </button>
          ))}
        </nav>
        
        <div className="p-2 border-t border-white/10 bg-black/10">
           {!collapsed && (
              <div className="mb-2 px-1 flex items-center justify-between">
                 <div className="text-[8px] font-bold text-white/40 uppercase tracking-widest italic">Session</div>
                 <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              </div>
           )}
           <div className={`flex items-center gap-2 mb-2 p-1.5 rounded-md bg-white/5 border border-white/5 shadow-inner ${collapsed ? "justify-center" : ""}`}>
              <div 
                className="w-8 h-8 rounded-md flex items-center justify-center text-[12px] font-black flex-shrink-0 shadow-sm border border-white/10"
                style={{ background: ROLE_BG[currentUser.role], color: ROLE_COLOR[currentUser.role] }}
              >
                 {currentUser.nama?.[0]}
              </div>
              {!collapsed && (
                <div className="overflow-hidden animate-fade-right">
                   <div className="text-[11px] font-bold text-white truncate leading-none mb-0.5">{currentUser.nama}</div>
                   <div className="text-[9px] font-bold text-white/40 flex items-center gap-1 leading-none">
                      <div className="w-1 h-1 rounded-full" style={{ background: ROLE_COLOR[currentUser.role] }} />
                      {currentUser.role}
                   </div>
                </div>
              )}
           </div>
           
           <button 
             onClick={handleLogout} 
             className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[10px] font-bold text-white/50 hover:text-red-400 hover:bg-red-400/10 transition-all ${collapsed ? "justify-center" : ""}`}
           >
              <LogOut size={16} strokeWidth={2.5} className="shrink-0" />
              {!collapsed && <span className="font-bold leading-none">Keluar</span>}
           </button>
        </div>

        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-border-main flex items-center justify-center text-text-light hover:text-accent shadow-sm shadow-accent/5 transition-all opacity-0 group-hover:opacity-100 z-50 hover:scale-110 active:scale-95"
        >
          <Icon name={collapsed ? "ChevronRight" : "ChevronLeft"} size={14} />
        </button>
      </aside>

      {/* Main Content - PALLADIAN BACKGROUND */}
      <div className="flex-1 flex flex-col bg-bg h-screen overflow-hidden relative">
      <header className="bg-grey-100 border-b border-border-dark/40 px-6 h-[56px] flex items-center justify-between z-[90] shrink-0 gap-6">
           <div className="flex items-center gap-6 flex-1 min-w-0">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                   <span className="text-[13px] font-bold text-text-main tracking-tight italic">{currentModule?.label}</span>
                   {activeSub !== "default" && <Icon name="ChevronRight" size={12} strokeWidth={3} className="text-text-light/30" />}
                   {activeSub !== "default" && (
                     <span className="text-[12px] font-bold text-text-light opacity-60 italic">
                        {currentModule?.subs.find(s => s.key === activeSub)?.label}
                     </span>
                   )}
                </div>
              </div>
           </div>
           
           <div className="flex items-center gap-6">
            <div className="relative w-72">
              <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light opacity-60" />
              <input 
                className="input-field h-[32px] pl-9 pr-4 text-[11px] placeholder:opacity-50"
                placeholder="Cari data global..."
                value={globalSearch || ""}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
              {globalSearch && (
                <div className="absolute top-full right-0 w-[420px] mt-2 bg-white rounded-xl shadow-2xl border border-border-main overflow-hidden animate-fade-down z-[100] max-h-[500px] flex flex-col">
                   <div className="p-4 border-b border-border-main bg-grey-100 flex justify-between items-center">
                      <span className="text-[11px] font-bold text-text-main leading-none">Hasil Pencarian</span>
                      <button onClick={() => setGlobalSearch("")} className="text-text-light hover:text-accent"><Icon name="X" size={16} /></button>
                   </div>
                   <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-border-main/40">
                      {(() => {
                          const sTerm = globalSearch.toLowerCase();
                          const resSO = (so || []).filter((s:any) => String(s.order_id).toLowerCase().includes(sTerm) || String(s.customer).toLowerCase().includes(sTerm)).slice(0, 5);
                          const resArm = (armada || []).filter((a:any) => String(a.no_polisi).toLowerCase().includes(sTerm)).slice(0, 5);
                          
                          if (resSO.length === 0 && resArm.length === 0) return <div className="p-8 text-center text-[12px] text-text-med font-medium">Tidak ada hasil ditemukan</div>;
                          
                          return (
                             <>
                                {resSO.map((s:any) => (
                                   <div key={s.id} onClick={() => { handleSOClick(s.order_id); setGlobalSearch(""); }} className="p-3.5 hover:bg-slate-50 cursor-pointer group flex items-start gap-4 transition-colors">
                                      <div className="p-2 rounded-lg bg-blue-brand-light text-blue-brand border border-blue-brand/10">
                                         <Icon name="Package" size={16} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                           <div className="text-[13px] font-bold text-text-main group-hover:text-accent transition-colors truncate tracking-tight italic">{s.order_id}</div>
                                           <span className="text-[9px] font-bold text-text-light opacity-70 italic">Sales Order</span>
                                        </div>
                                        <div className="text-[11px] font-bold text-text-med truncate opacity-80">{s.customer}</div>
                                      </div>
                                   </div>
                                ))}
                                {resArm.map((a:any) => (
                                   <div key={a.id} onClick={() => { handleArmadaClick(a.no_polisi); setGlobalSearch(""); }} className="p-2.5 hover:bg-palladian cursor-pointer group flex items-start gap-4 transition-colors">
                                      <div className="w-8 h-8 rounded-md bg-burning-flame/5 text-burning-flame flex items-center justify-center shrink-0">
                                         <Icon name="Truck" size={14} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                           <div className="text-[12px] font-black text-abyssal-blue group-hover:text-accent transition-colors truncate tracking-tight">{a.no_polisi}</div>
                                           <span className="text-[8px] font-bold text-text-light opacity-50 uppercase">Armada</span>
                                        </div>
                                        <div className="text-[10px] font-bold text-text-med truncate">{a.merk} {a.tipe}</div>
                                      </div>
                                   </div>
                                ))}
                             </>
                          );
                      })()}
                   </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                 <button
                    className="btn-primary flex items-center gap-2"
                    onClick={() => setShowQuickMenu(!showQuickMenu)}
                 >
                    <Plus size={16} /> <span className="hidden sm:inline font-black uppercase tracking-tight">Quick Action</span>
                 </button>
                 {showQuickMenu && (
                    <Card className="absolute top-10 right-0 w-64 p-0 overflow-hidden z-[60] shadow-2xl animate-fade-down border-none">
                       <div onClick={() => { handleNav("operasional", "so"); setShowQuickMenu(false); }} className="p-4 hover:bg-palladian cursor-pointer flex items-center gap-4 transition-colors">
                          <div className="w-10 h-10 rounded-md bg-burning-flame/10 text-burning-flame flex items-center justify-center shrink-0">
                            <Icon name="Plus" size={20} />
                          </div>
                          <div>
                            <div className="text-[12px] font-black text-abyssal-blue uppercase tracking-tight">Sales Order</div>
                            <div className="text-[9px] text-text-light font-bold">Input Muatan Baru</div>
                          </div>
                       </div>
                    </Card>
                 )}
                 {showQuickMenu && <div className="fixed inset-0 z-55" onClick={() => setShowQuickMenu(false)} />}
              </div>

              <div className="flex items-center gap-3 pr-4 border-r border-border-main">
                 <NotificationBadge 
                    icon="Bell" 
                    count={expiredDocsCount} 
                    onClick={() => handleNav("armada", "dokumen")} 
                 />
                 <NotificationBadge 
                    icon="CheckSquare" 
                    count={(jurnal || []).filter((j:any) => j.status === "Draft").length}
                    onClick={() => handleNav("keuangan", "persetujuan")} 
                 />
              </div>

              <div className="flex items-center gap-3">
                 {connected && (
                   <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full">
                     <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                     <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Live</span>
                   </div>
                 )}
                 <div
                    className="w-8 h-8 rounded-md flex items-center justify-center font-black text-[12px] transition-transform hover:scale-105 cursor-pointer shadow-sm border border-black/[0.03]"
                    style={{ background: ROLE_BG[currentUser.role], color: ROLE_COLOR[currentUser.role] }}
                   >
                    {currentUser.nama?.[0]}
                 </div>
                 <div className={`w-2 h-2 rounded-full border-2 border-white shadow-sm ${connected ? "bg-green-500" : "bg-red-500"}`} title={connected ? "Connected" : "Disconnected"} />
              </div>
           </div>
          </div>
        </header>

        {/* Sub Navigation Tabs */}
        {currentModule && currentModule.subs.length > 0 && (
          <div className="bg-white border-b border-border-main px-4 flex items-center overflow-x-auto no-scrollbar z-[40] sticky top-0 shrink-0 gap-2 shadow-sm shadow-black/[0.02]">
             {currentModule.subs.map(sub => (
               <button 
                 key={sub.key} 
                 onClick={() => setSubWithMemory(sub.key)}
                 className={`tab-btn h-[48px] px-5 ${activeSub === sub.key ? "active" : ""}`}
               >
                 {sub.label.toUpperCase()}
               </button>
             ))}
          </div>
        )}
        
        <main className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-bg relative">
          <AnimatePresence mode="wait">
            <motion.div 
              key={`${activeModule}-${activeSub}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="max-w-[1800px] mx-auto min-h-full"
            >
              {activeModule === "dashboard" && <Dashboard jurnal={jurnal} so={so} coa={coa} piutang={piutang} armada={armada} sopir={sopir} armadaDokumen={armadaDokumen} onSOClick={handleSOClick} onJurnalClick={handleJurnalClick} onNavigate={handleNav} />}
              
              {activeModule === "operasional" && (
                <>
                  {activeSub === "so" && <SalesOrderPage so={so} setSo={setSo} jurnal={jurnal} customer={customer} armada={armada} sopir={sopir} currentUser={currentUser} logAction={logAction} onSOClick={handleSOClick} onArmadaClick={handleArmadaClick} pendingEditSO={pendingEditSO} setPendingEditSO={setPendingEditSO} onGoToHP={handleGoToHP} />}
                  {activeSub === "updatemuatan" && <UpdateMuatan so={so} setSo={setSo} onSOClick={handleSOClick} onArmadaClick={handleArmadaClick} logAction={logAction} />}
                  {activeSub === "invoice" && <InvoicePage so={so} currentUser={currentUser} logAction={logAction} />}
                  {activeSub === "quotation" && <QuotationPage currentUser={currentUser} />}
                </>
              )}

              {activeModule === "keuangan" && (
                <>
                  {activeSub === "persetujuan" && <ApprovalPage jurnal={jurnal} setJurnal={setJurnal} currentUser={currentUser} onJurnalClick={handleJurnalClick} logAction={logAction} />}
                  {activeSub === "jurnal" && <JurnalUmum jurnal={jurnal} setJurnal={setJurnal} coa={coa} so={so} connected={connected} currentUser={currentUser} logAction={logAction} onSOClick={handleSOClick} onJurnalClick={handleJurnalClick} prefill={jurnalPrefill} onPrefillUsed={() => setJurnalPrefill(null)} />}
                  {activeSub === "hutangpiutang" && <HutangPiutangPage jurnal={jurnal} coa={coa} so={so} armada={armada} connected={connected} onSOClick={handleSOClick} onJurnalClick={handleJurnalClick} piutang={piutang} onGoToJurnal={handleGoToJurnal} prefill={hpPrefill} onPrefillUsed={() => setHpPrefill(null)} />}
                  {["hutangvendor", "cicilan", "rekapuj"].includes(activeSub) && (
                    <KeuanganPage activeSub={activeSub} jurnal={jurnal} coa={coa} so={so} connected={connected} />
                  )}
                </>
              )}

              {activeModule === "laporan" && <LaporanPage activeSub={activeSub} jurnal={jurnal} coa={coa} so={so} armada={armada} auditLogs={auditLogs} saldoAwal={saldoAwal} onSOClick={handleSOClick} onJurnalClick={handleJurnalClick} logAction={logAction} />}
              {activeModule === "armada" && <ArmadaPage activeSub={activeSub} armada={armada} setArmada={setArmada} dokumen={armadaDokumen} setDokumen={setArmadaDokumen} service={armadaService} setService={setArmadaService} sopir={sopir} setSopir={setSopir} onArmadaClick={handleArmadaClick} onSopirClick={handleSopirClick} jurnal={jurnal} coa={coa} logAction={logAction} so={so} />}
              
              {activeModule === "master" && (
                <>
                  {activeSub === "kontak" && <KontakPage so={so} connected={connected} />}
                  {["coa", "saldoawal", "users", "password"].includes(activeSub) && (
                    <MasterPage activeSub={activeSub} coa={coa} setCoa={setCoa} users={users} setUsers={setUsers} saldoAwal={saldoAwal} setSaldoAwal={setSaldoAwal} logAction={logAction} />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
    </div>

      {/* ─── DYNAMIC MODAL STACK (Side-by-Side) ────────────────────────── */}
      <AnimatePresence>
        {activeModals.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex justify-end bg-white/30 backdrop-blur-sm pointer-events-none" 
            onClick={clearModals}
          >
            <div className="flex flex-row-reverse h-full overflow-x-auto pointer-events-auto items-stretch no-scrollbar" onClick={e => e.stopPropagation()}>
              <AnimatePresence mode="popLayout text-left">
                {activeModals.map((modal, idx) => {
                  const props = {
                    data: modal.data,
                    onClose: () => closeModal(idx),
                  };
                  return (
                    <motion.div
                      key={`${modal.type}-${idx}`}
                      initial={{ opacity: 0, x: 100, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 100, scale: 0.95 }}
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                      className="h-full flex items-stretch border-l border-border-main/20 shadow-2xl"
                    >
                      {modal.type === 'so' && (
                        <SODetailModal
                          {...props}
                          coa={coa}
                          jurnal={jurnal}
                          invoices={invoices}
                          currentUser={currentUser}
                          handleNav={handleNav}
                          setPendingEditSO={setPendingEditSO}
                          onJurnalClick={handleJurnalClick}
                          onArmadaClick={handleArmadaClick}
                        />
                      )}
                      {modal.type === 'jurnal' && (
                        <JurnalDetailModal
                          {...props}
                          onSOClick={handleSOClick}
                        />
                      )}
                      {modal.type === 'armada' && (
                        <ArmadaDetailModal 
                          {...props} 
                          armadaDokumen={armadaDokumen} 
                          so={so} 
                          jurnal={jurnal} 
                          armadaService={armadaService} 
                          setArmada={setArmada} 
                          logAction={logAction} 
                          handleSOClick={handleSOClick} 
                          handleJurnalClick={handleJurnalClick}
                          showToast={showToast} 
                        />
                      )}
                      {modal.type === 'sopir' && (
                        <SopirDetailModal 
                          {...props} 
                          so={so} 
                          handleSOClick={handleSOClick} 
                        />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
