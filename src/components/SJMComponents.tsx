import React from "react";
import { C } from "@/src/constants";
import { fmt, fmtShort } from "@/src/utils";

export const Card = ({ children, style = {}, className = "" }: any) => (
  <div className={className} style={{ background: C.bgCard, borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04)", padding: 20, ...style }}>{children}</div>
);

export const Spinner = ({ size = 20, center = false }: any) => (
  <div style={center ? { display: "flex", justifyContent: "center", padding: 40 } : {}}>
    <div className="spinner" style={{ width: size, height: size }} />
  </div>
);

export const Spark = ({ data = [], color = "#FF8F00" }: any) => {
  if (!data || data.length < 2) return null;
  const W = 100, H = 38, pad = 3;
  const mn = Math.min(...data), mx = Math.max(...data), rng = (mx - mn) || 1;
  const pts = data.map((v: any, i: number) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - mn) / rng) * (H - pad * 2) - pad;
    return x.toFixed(1) + "," + y.toFixed(1);
  });
  const line = "M " + pts.join(" L ");
  const area = line + " L " + W + "," + H + " L 0," + H + " Z";
  const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
  return (
    <svg viewBox={"0 0 " + W + " " + H} preserveAspectRatio="none" style={{ width:"100%", height:"100%", display:"block" }}>
      <path d={area} fill={"rgba("+r+","+g+","+b+",0.08)"} stroke="none" />
      <path d={line}  fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

export const StatCard = ({ label, value, sub, color, delay = 0, sparkData, sparkColor }: any) => (
  <div style={{ background: C.bgCard, borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04)", padding: "16px 18px 0", overflow: "hidden", animationDelay: `${delay}ms` }} className="fade-up">
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
      {sub && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 20, background: color === C.red ? C.redLight : C.greenLight, color: color === C.red ? C.red : C.green }}>{sub}</span>}
    </div>
    <div style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 12 }}>{value}</div>
    <div style={{ height: 44, margin: "0 -18px" }}>
      <Spark data={sparkData || [0, 0]} color={sparkColor || color || C.accent} />
    </div>
  </div>
);

export const SectionHeader = ({ title, sub, action }: any) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: C.text, letterSpacing: "-0.02em" }}>{title}</h2>
      {sub && <p style={{ fontSize: 12, color: C.textLight, marginTop: 3 }}>{sub}</p>}
    </div>
    {action}
  </div>
);

export const DBBanner = ({ connected }: any) => (
  connected ? null :
  <div style={{ background: C.blueLight, borderLeft: `3px solid ${C.blue}`, borderRadius: "0 7px 7px 0", padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ fontSize: 13, fontWeight: 500, color: C.blue }}>Memuat data dari Supabase...</div>
  </div>
);

export const EmptyState = ({ colSpan = 20, msg = "Belum ada data" }: any) => (
  <tr><td colSpan={colSpan} style={{ padding: 48, textAlign: "center", color: C.textLight, fontSize: 13, fontFamily:"'Inter',sans-serif" }}>
    <div style={{ fontSize: 22, marginBottom: 8, color: C.borderDark }}>▣</div>{msg}
  </td></tr>
);

export const statusBadge = (s: string) => {
  const map: any = { "Lunas": "tag-lunas", "Parsial": "tag-parsial", "Belum Lunas": "tag-bl", "Overpaid": "tag-overpaid" };
  return <span className={`badge ${map[s] || "tag-bl"}`}>{s}</span>;
};

export const ConfirmModal = ({ open, title, msg, onConfirm, onCancel, confirmLabel = "Hapus", confirmColor = null }: any) => {
  if (!open) return null;
  const btnColor = confirmColor || C.red;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onCancel}>
      <div style={{ background: "white", borderRadius: 12, padding: 28, maxWidth: 380, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 10 }}>{title || "Konfirmasi"}</div>
        <div style={{ fontSize: 13, color: C.textMed, lineHeight: 1.6, marginBottom: 24 }}>{msg}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-ghost" onClick={onCancel}>Batal</button>
          <button onClick={onConfirm}
            style={{ padding: "8px 20px", background: btnColor, color: "white", border: "none", borderRadius: 7, fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const useConfirm = () => {
    const [state, setState] = React.useState<any>({ open:false, title:"", msg:"", onConfirm:null, confirmLabel:"Hapus", confirmColor:null });
    const confirm = ({ title, msg, onConfirm, confirmLabel="Hapus", confirmColor=null }: any) => {
      setState({ open:true, title, msg, onConfirm, confirmLabel, confirmColor });
    };
    const close = () => setState((s: any) => ({ ...s, open:false }));
    const handleConfirm = () => { close(); state.onConfirm && state.onConfirm(); };
    const Modal = () => <ConfirmModal open={state.open} title={state.title} msg={state.msg}
      onConfirm={handleConfirm} onCancel={close} confirmLabel={state.confirmLabel} confirmColor={state.confirmColor} />;
    return { confirm, Modal };
};

export const Icon = ({ d, size=16, style={} }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, ...style }}>
    {Array.isArray(d) ? d.map((p,i) => <path key={i} d={p}/>) : <path d={d}/>}
  </svg>
);

export const PeriodFilter = ({ period, setPeriod, search, setSearch, onAdd }: any) => {
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const years = [2024, 2025, 2026];

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
      {setSearch !== undefined && (
        <div style={{ flex: 1, minWidth: 200 }}>
          <input className="input-field" placeholder="Cari data..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}
      
      <select className="input-field" style={{ width: 120 }} value={period.mode} onChange={e => setPeriod({ ...period, mode: e.target.value })}>
        <option value="all">Semua</option>
        <option value="month">Per Bulan</option>
        <option value="year">Per Tahun</option>
      </select>

      {period.mode === "month" && (
        <select className="input-field" style={{ width: 130 }} value={period.month} onChange={e => setPeriod({ ...period, month: parseInt(e.target.value) })}>
          {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      )}

      {(period.mode === "month" || period.mode === "year") && (
        <select className="input-field" style={{ width: 100 }} value={period.year} onChange={e => setPeriod({ ...period, year: parseInt(e.target.value) })}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      )}

      {onAdd && <button className="btn-primary" onClick={onAdd}>+ Tambah Baru</button>}
    </div>
  );
};
