import React, { useState, useMemo } from "react";
import { C } from "@/src/constants";
import { Card, SectionHeader, Icon, useConfirm, useToast } from "@/src/components/SJMComponents";
import { api } from "@/src/api";
import { fmt } from "@/src/utils";

export const ApprovalPage = ({ jurnal, setJurnal, currentUser, onJurnalClick, logAction }: any) => {
  const { confirm: confirmModal, Modal: ConfirmModalUI } = useConfirm();
  const { showToast, ToastUI } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  const pending = useMemo(() => {
    return jurnal.filter((j: any) => j.status === "Pending").sort((a: any, b: any) => b.tanggal.localeCompare(a.tanggal));
  }, [jurnal]);

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selected.length === pending.length) setSelected([]);
    else setSelected(pending.map((x: any) => x.id));
  };

  const approveBulk = async () => {
    if (selected.length === 0) return;
    confirmModal({
      title: "Setujui Jurnal",
      msg: `Apakah Anda yakin ingin menyetujui ${selected.length} jurnal pilihan?`,
      confirmLabel: "Setujui",
      confirmColor: C.green,
      onConfirm: async () => {
        setProcessing(true);
        try {
          await api.bulkApproveJurnal(selected);
          setJurnal((prev: any[]) => prev.map(j => selected.includes(j.id) ? { ...j, status: "Approved" } : j));
          logAction(`Approve Jurnal Masal: ${selected.length} jurnal`, { ids: selected });
          showToast(`${selected.length} Jurnal berhasil disetujui.`);
          setSelected([]);
        } catch (e: any) {
          showToast("Gagal approve: " + e.message, "error");
        }
        setProcessing(false);
      }
    });
  };

  return (
    <div className="fade-up max-w-full mx-auto space-y-4 pb-8">
      <ConfirmModalUI />
      <ToastUI />
      <SectionHeader title="Persetujuan Jurnal" sub="Validasi dan setujui entri jurnal secara massal untuk posting final"
        action={
          <button 
            className="btn-primary flex items-center gap-2 px-4 py-1.5 text-[10px] uppercase tracking-widest shadow-xl shadow-accent/10" 
            onClick={approveBulk} 
            disabled={selected.length === 0 || processing}
          >
            {processing ? <Icon name="Loader2" className="animate-spin" size={14} /> : <Icon name="CheckSquare" size={14} />}
            {processing ? "Memproses..." : `Setujui (${selected.length})`}
          </button>
        } />

      <Card className="p-0 border-border-main/40 overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-250px)]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-border-main/40 shadow-sm sticky top-0 z-10">
                <th className="py-3 px-4 text-left w-10">
                  <input type="checkbox" checked={selected.length > 0 && selected.length === pending.length} onChange={toggleAll} className="w-4 h-4 rounded border-border-main/60 accent-accent cursor-pointer" />
                </th>
                <th className="py-3 px-4 text-[10px] font-bold text-text-light text-left opacity-60">Tgl Jurnal</th>
                <th className="py-3 px-4 text-[10px] font-bold text-text-light text-left opacity-60">No Jurnal</th>
                <th className="py-3 px-4 text-[10px] font-bold text-text-light text-left opacity-60">Keterangan Jurnal</th>
                <th className="py-3 px-4 text-[10px] font-bold text-text-light text-right opacity-60">Debit (Rp)</th>
                <th className="py-3 px-4 text-[10px] font-bold text-text-light text-right opacity-60">Kredit (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main/20">
              {pending.length === 0 ? (
                <tr>
                    <td colSpan={6} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-border-main/20 text-text-light opacity-30">
                                <Icon name="CheckCircle2" size={24} />
                            </div>
                            <span className="text-[9px] font-black text-text-light uppercase tracking-widest opacity-60">Semua jurnal telah ter-validasi</span>
                        </div>
                    </td>
                </tr>
              ) : (
                pending.map((j: any) => (
                  <tr key={j.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-3 px-4">
                      <input type="checkbox" checked={selected.includes(j.id)} onChange={() => toggleSelect(j.id)} className="w-4 h-4 rounded border-border-main/60 accent-accent cursor-pointer" />
                    </td>
                    <td className="py-3 px-4 text-[11px] font-bold text-text-med tabular-nums">{j.tanggal}</td>
                    <td className="py-3 px-4">
                      <button className="text-[11px] font-bold text-accent hover:underline tracking-tighter italic" onClick={() => onJurnalClick(j.no_jurnal)}>
                         {j.no_jurnal}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-[11px] font-bold text-text-main group-hover:text-accent transition-colors truncate max-w-xs">{j.keterangan || "—"}</td>
                    <td className="py-3 px-4 text-right text-[11px] font-black text-text-med tabular-nums">{fmt(j.total_debit || 0)}</td>
                    <td className="py-3 px-4 text-right text-[11px] font-black text-text-med tabular-nums">{fmt(j.total_kredit || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
