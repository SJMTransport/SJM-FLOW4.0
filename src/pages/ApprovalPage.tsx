import React, { useState, useMemo } from "react";
import { C } from "@/src/constants";
import { Card, SectionHeader, Icon, useConfirm } from "@/src/components/SJMComponents";
import { api } from "@/src/api";

export const ApprovalPage = ({ jurnal, setJurnal, currentUser, onJurnalClick }: any) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const { confirm, Modal: ConfirmModal } = useConfirm();

  const showToast = (msg: string, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const pending = useMemo(() =>
    jurnal.filter((j: any) => j.status_approval === "Pending")
      .sort((a: any, b: any) => b.tanggal.localeCompare(a.tanggal)),
    [jurnal]
  );

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAll = () =>
    setSelected(selected.length === pending.length ? [] : pending.map((x: any) => x.id));

  const approveBulk = () => {
    if (selected.length === 0) return;
    confirm({
      title: "Konfirmasi Persetujuan",
      msg: `Setujui ${selected.length} jurnal yang dipilih? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: "Setujui",
      confirmColor: C.green,
      onConfirm: async () => {
        setProcessing(true);
        try {
          await api.bulkApproveJurnal(selected);
          setJurnal((prev: any[]) =>
            prev.map(j => selected.includes(j.id) ? { ...j, status_approval: "Approved" } : j)
          );
          showToast(`${selected.length} jurnal berhasil disetujui`);
          setSelected([]);
        } catch (e: any) {
          showToast("Gagal approve: " + e.message, "error");
        }
        setProcessing(false);
      }
    });
  };

  return (
    <div className="fade-up">
      <ConfirmModal />

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === "error" ? C.red : C.green,
          color: "#fff", padding: "12px 20px", borderRadius: 8,
          fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          animation: "fadeUp 0.25s ease"
        }}>
          {toast.msg}
        </div>
      )}

      <SectionHeader
        title="Persetujuan Jurnal"
        sub="Validasi dan setujui entri jurnal secara massal untuk posting final"
        action={
          <button
            className="btn-primary"
            onClick={approveBulk}
            disabled={selected.length === 0 || processing}
            style={{ display: "flex", alignItems: "center", gap: 8, background: selected.length > 0 ? C.green : undefined }}
          >
            <span style={{ fontSize: 15 }}>✓</span>
            {processing ? "Memproses..." : `Setujui (${selected.length})`}
          </button>
        }
      />

      {pending.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: 40, color: C.textLight }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Semua jurnal sudah disetujui</div>
            <div style={{ fontSize: 12 }}>Tidak ada jurnal yang menunggu persetujuan</div>
          </div>
        </Card>
      ) : (
        <>
          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ background: C.accentLight, color: C.accent, padding: "4px 12px", borderRadius: 5, fontSize: 12, fontWeight: 600 }}>
              {pending.length} menunggu persetujuan
            </span>
            {selected.length > 0 && (
              <span style={{ background: C.greenLight, color: C.green, padding: "4px 12px", borderRadius: 5, fontSize: 12, fontWeight: 600 }}>
                {selected.length} dipilih
              </span>
            )}
          </div>

          <Card style={{ padding: 0 }}>
            <div style={{ maxHeight: "calc(100vh - 240px)", overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", width: 40 }}>
                      <input type="checkbox"
                        checked={selected.length > 0 && selected.length === pending.length}
                        onChange={toggleAll}
                        style={{ cursor: "pointer", width: 14, height: 14 }} />
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>TGL</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>NO JURNAL</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>KETERANGAN</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>DEBIT</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>KREDIT</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((j: any) => (
                    <tr key={j.id} className="row-hover"
                      style={{ borderBottom: `1px solid ${C.border}`, background: selected.includes(j.id) ? C.accentLight : undefined }}
                      onClick={() => toggleSelect(j.id)}>
                      <td style={{ padding: "12px 16px" }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.includes(j.id)} onChange={() => toggleSelect(j.id)} style={{ cursor: "pointer", width: 14, height: 14 }} />
                      </td>
                      <td style={{ padding: "12px 16px" }}>{j.tanggal}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          className="chip-jurnal"
                          style={{ cursor: "pointer" }}
                          onClick={e => { e.stopPropagation(); onJurnalClick(j.no_jurnal); }}>
                          {j.no_jurnal}
                        </button>
                      </td>
                      <td style={{ padding: "12px 16px" }}>{j.keterangan || "—"}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: C.green, fontWeight: 500 }}>
                        {Number(j.total_debit || 0).toLocaleString("id-ID")}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: C.red, fontWeight: 500 }}>
                        {Number(j.total_kredit || 0).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
