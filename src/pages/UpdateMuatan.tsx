import React, { useState } from "react";
import { C, I, STATUS_SO, STATUS_COLOR, STATUS_BG } from "../constants";
import { Card, SectionHeader, Icon } from "@/src/components/SJMComponents";
import { api } from "@/src/api";

export const UpdateMuatan = ({ so, setSo, onSOClick }: any) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [selectedForLog, setSelectedForLog] = useState<any>(null);
  const [newLog, setNewLog] = useState({ info: "", location: "" });
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [logSaving, setLogSaving] = useState(false);

  const showToast = (msg: string, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = so.filter((s: any) => {
    const matchesSearch = !search ||
      s.order_id?.toLowerCase().includes(search.toLowerCase()) ||
      s.customer?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all"
      ? true
      : statusFilter === "active"
        ? !["Completed", "Cancelled"].includes(s.status_muatan)
        : s.status_muatan === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getProgress = (status: string) => {
    const idx = STATUS_SO.indexOf(status);
    if (idx === -1) return 0;
    return ((idx + 1) / STATUS_SO.length) * 100;
  };

  const updateStatus = async (s: any, newStatus: string) => {
    try {
      const logEntry = {
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString(),
        status: newStatus,
        info: `Status diubah menjadi ${newStatus}`,
        location: s.lokasi_muat,
      };
      const updatedLog = [logEntry, ...(s.posisi_log || [])];
      await api.updateSO(s.id, { status_muatan: newStatus, posisi_log: updatedLog });
      setSo((prev: any[]) => prev.map(x => x.id === s.id ? { ...x, status_muatan: newStatus, posisi_log: updatedLog } : x));
    } catch (e: any) {
      showToast("Gagal update status: " + (e.message || "Server error"), "error");
    }
  };

  const addManualLog = async () => {
    if (!newLog.info.trim()) return;
    setLogSaving(true);
    try {
      const logEntry = {
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString(),
        status: selectedForLog.status_muatan,
        info: newLog.info,
        location: newLog.location,
      };
      const updatedLog = [logEntry, ...(selectedForLog.posisi_log || [])];
      await api.updateSO(selectedForLog.id, { posisi_log: updatedLog });
      setSo((prev: any[]) => prev.map(x => x.id === selectedForLog.id ? { ...x, posisi_log: updatedLog } : x));
      setSelectedForLog({ ...selectedForLog, posisi_log: updatedLog });
      setNewLog({ info: "", location: "" });
      showToast("Posisi berhasil diupdate");
    } catch (e: any) {
      showToast("Gagal update posisi: " + (e.message || "Server error"), "error");
    }
    setLogSaving(false);
  };

  return (
    <div className="fade-up">
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === "error" ? C.red : C.green,
          color: "#fff", padding: "12px 20px", borderRadius: 8,
          fontSize: 13, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          animation: "fadeUp 0.25s ease"
        }}>{toast.msg}</div>
      )}

      <SectionHeader title="Update Muatan" sub="Kelola status operasional pengiriman" />
      
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <input className="input-field" placeholder="○ Cari SO atau customer..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input-field" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
             <option value="active">SO Aktif</option>
             <option value="all">Semua Status</option>
             {STATUS_SO.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {filtered.map((s: any) => (
          <Card key={s.id}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <button onClick={() => onSOClick(s.order_id)} style={{ background: "none", border: "none", padding: 0, fontWeight: 700, color: C.accent, cursor: "pointer", textDecoration: "underline" }}>{s.order_id}</button>
                <span style={{ background: STATUS_BG[s.status_muatan], color: STATUS_COLOR[s.status_muatan], padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{s.status_muatan}</span>
            </div>
            
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{s.customer}</div>
            <div style={{ fontSize: 11, color: C.textLight, marginBottom: 12 }}>{s.lokasi_muat} → {s.lokasi_bongkar}</div>

            {/* Stepper Progress Bar */}
            <div style={{ marginBottom: 20, position: "relative", padding: "0 10px" }}>
                <div style={{ 
                  position: "absolute", top: 12, left: 20, right: 20, height: 2, 
                  background: C.bg, zIndex: 0 
                }} />
                <div style={{ 
                  position: "absolute", top: 12, left: 20, width: `${getProgress(s.status_muatan)}%`, maxWidth: "calc(100% - 40px)", height: 2, 
                  background: C.accent, zIndex: 1, transition: "0.5s ease" 
                }} />
                
                <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
                  {STATUS_SO.map((st, idx) => {
                    const currentIdx = STATUS_SO.indexOf(s.status_muatan);
                    const isDone = idx <= currentIdx;
                    return (
                      <div key={st} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <div style={{ 
                          width: 24, height: 24, borderRadius: "50%", 
                          background: isDone ? C.accent : "#fff",
                          border: `2px solid ${isDone ? C.accent : C.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, color: isDone ? "#fff" : C.textLight,
                          transition: "0.3s"
                        }}>
                          {isDone ? <Icon d={I.check} size={12} /> : idx + 1}
                        </div>
                        <span style={{ fontSize: 7, fontWeight: 700, color: isDone ? C.text : C.textLight, textTransform: "uppercase", textAlign: "center", maxWidth: 40, lineHeight: 1 }}>
                          {st.split(" ")[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 16 }}>
               {STATUS_SO.map(st => (
                 <button key={st} onClick={() => updateStatus(s, st)}
                   style={{ 
                     fontSize: 9, padding: "4px 6px", borderRadius: 4, cursor: "pointer", 
                     background: s.status_muatan === st ? STATUS_COLOR[st] : C.bg,
                     color: s.status_muatan === st ? "white" : C.textMed,
                     border: "none", transition: "0.2s"
                   }}>{st}</button>
               ))}
            </div>

            <button className="btn-ghost" 
              style={{ width: "100%", fontSize: 11, padding: 10, background: C.bg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, cursor: "pointer" }} 
              onClick={(e) => { e.stopPropagation(); setSelectedForLog(s); }}>
               Update Posisi & Lihat Log
            </button>
          </Card>
        ))}
      </div>

      {selectedForLog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1100, display: "flex", justifyContent: "center", alignItems: "center" }} onClick={() => setSelectedForLog(null)}>
           <div className="fade-up" style={{ width: 500, background: "#fff", borderRadius: 12, display: "flex", flexDirection: "column", maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: 20, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                 <div>
                    <div style={{ fontWeight: 700 }}>Update Log: {selectedForLog.order_id}</div>
                    <div style={{ fontSize: 12, color: C.textLight }}>Tgl Muat: {selectedForLog.tgl_muat || "—"}</div>
                 </div>
                 <button className="btn-ghost" onClick={() => setSelectedForLog(null)}>✕</button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                 <div style={{ background: C.bg, padding: 16, borderRadius: 8, marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Input Posisi Terkini</div>
                    <input className="input-field" placeholder="Lokasi (Contoh: Rest Area KM 57)" style={{ marginBottom: 10, background: "white" }} 
                      value={newLog.location} onChange={e => setNewLog({...newLog, location: e.target.value})} />
                    <textarea className="input-field" placeholder="Keterangan posisi/status..." style={{ height: 60, background: "white", marginBottom: 10 }}
                      value={newLog.info} onChange={e => setNewLog({...newLog, info: e.target.value})} />
                    <button className="btn-primary" style={{ width: "100%" }} onClick={addManualLog} disabled={logSaving}>
                      {logSaving ? "Menyimpan..." : "Update Posisi"}
                    </button>
                 </div>

                 <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>History Updates</div>
                 <div style={{ display: "grid", gap: 12 }}>
                    {(selectedForLog.posisi_log || []).length === 0 && <div style={{ textAlign: "center", color: C.textLight, fontSize: 12, padding: 20 }}>Belum ada log update</div>}
                    {(selectedForLog.posisi_log || []).map((l: any, i: number) => (
                      <div key={i} style={{ padding: 12, border: `1px solid ${C.border}`, borderRadius: 8, position: "relative" }}>
                         <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: 11, color: C.accent }}>{l.status}</span>
                            <span style={{ fontSize: 10, color: C.textLight }}>{l.date} {l.time}</span>
                         </div>
                         <div style={{ fontSize: 12, color: C.text }}>{l.info}</div>
                         {l.location && <div style={{ fontSize: 11, color: C.textMed, marginTop: 4 }}>📍 {l.location}</div>}
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
