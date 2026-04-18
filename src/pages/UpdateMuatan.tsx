import React, { useState } from "react";
import { C, STATUS_SO, STATUS_COLOR, STATUS_BG } from "@/src/constants";
import { Card, SectionHeader, Icon } from "@/src/components/SJMComponents";
import { api } from "@/src/api";

export const UpdateMuatan = ({ so, setSo }: any) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = so.filter((s: any) => {
    const matchesSearch = !search || 
      s.order_id?.toLowerCase().includes(search.toLowerCase()) || 
      s.customer?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status_muatan === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const updateStatus = async (soId: string, newStatus: string) => {
    try {
      await api.updateSO(soId, { status_muatan: newStatus });
      setSo((prev: any[]) => prev.map(x => x.id === soId ? { ...x, status_muatan: newStatus } : x));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="fade-up">
      <SectionHeader title="Update Muatan" sub="Kelola status operasional pengiriman" />
      
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <input className="input-field" placeholder="○ Cari SO atau customer..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input-field" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
             <option value="all">Semua Status</option>
             {STATUS_SO.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {filtered.map((s: any) => (
          <Card key={s.id}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontWeight: 700, color: C.accent }}>{s.order_id}</span>
                <span style={{ background: STATUS_BG[s.status_muatan], color: STATUS_COLOR[s.status_muatan], padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{s.status_muatan}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 5 }}>{s.customer}</div>
            <div style={{ fontSize: 12, color: C.textMed, marginBottom: 16 }}>{s.lokasi_muat} → {s.lokasi_bongkar}</div>
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
               {STATUS_SO.map(st => (
                 <button key={st} onClick={() => updateStatus(s.id, st)}
                   style={{ 
                     fontSize: 10, padding: "4px 8px", borderRadius: 4, cursor: "pointer", 
                     background: s.status_muatan === st ? STATUS_COLOR[st] : C.bg,
                     color: s.status_muatan === st ? "white" : C.textMed,
                     border: "none"
                   }}>{st}</button>
               ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
