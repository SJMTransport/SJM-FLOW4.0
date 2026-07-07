import React, { useState, useMemo } from "react";
import { STATUS_COLOR } from "../constants";
import {
  Icon, useToast, EmptyState, PageShell, KPIGrid, StatCard, PageHeader, ActionBar
} from "@/src/components/SJMComponents";
import { api } from "@/src/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getInitials = (name: string) => {
  const parts = (name || "").trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (parts[0] || "?")[0].toUpperCase();
};

const timeAgo = (dateStr: string, timeStr: string) => {
  if (!dateStr) return "";
  try {
    const dt = new Date(`${dateStr}T${timeStr || "00:00"}:00`);
    const diffH = Math.floor((Date.now() - dt.getTime()) / (1000 * 60 * 60));
    if (diffH < 1) return "Baru saja";
    if (diffH < 24) return `${diffH} jam lalu`;
    return `${Math.floor(diffH / 24)} hari lalu`;
  } catch { return ""; }
};

const STATUS_BUTTONS = [
  { label: "Confirmed",  value: "Order Confirmed" },
  { label: "Loading",    value: "Loading"         },
  { label: "In Transit", value: "On Going"        },
  { label: "Completed",  value: "Completed"       },
  { label: "Cancelled",  value: "Cancelled"       },
];

const URGENSI_OPTIONS = ["Normal", "High Priority", "Emergency"];

const STATUS_HEX: Record<string, string> = {
  "Order Confirmed": "#4A6FA5",
  "Loading":         "#C4914A",
  "On Going":        "#EB5E28",
  "Completed":       "#6B8E23",
  "Cancelled":       "#B85450",
};

const URGENSI_HEX: Record<string, string> = {
  "Normal":       "#6B8E23",
  "High Priority":"#C4914A",
  "Emergency":    "#B85450",
};

const getStatusHex = (status: string) => STATUS_HEX[status] || "#6B6862";
const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    "Order Confirmed": "Confirmed",
    "On Going": "In Transit",
  };
  return map[status] || status;
};

// ─── Terminal Panel ───────────────────────────────────────────────────────────

const TerminalPanel = ({
  s, panelStatus, setPanelStatus,
  panelCheckpoint, setPanelCheckpoint,
  panelUrgensi, setPanelUrgensi,
  panelRemarks, setPanelRemarks,
  panelFotoMuat, setPanelFotoMuat,
  panelFotoBongkar, setPanelFotoBongkar,
  loading, onSubmit, onCopy, onClose,
}: any) => {
  const urgensiColor = URGENSI_HEX[panelUrgensi] || "#6B8E23";

  return (
    <div className="border-t-2 border-accent/30 bg-bg">
      {/* Panel header bar */}
      <div
        className="flex items-center justify-between px-5 py-2.5"
        style={{ background: "#252422" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white">
            Dispatch Terminal Panel
          </span>
          <span className="text-white/30 text-[11px]">|</span>
          <span className="text-[11px] font-black italic text-accent">{s.order_id}</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
        >
          <Icon name="ChevronUp" size={12} /> Sembunyikan Panel
        </button>
      </div>

      {/* 3-column body */}
      <div className="grid grid-cols-3 divide-x divide-border-main/30 bg-white">

        {/* ── LEFT: Driver Profile ───────────────────────── */}
        <div className="p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-light opacity-60 mb-4">
            Profil &amp; Identitas Driver
          </div>

          {/* Urgensi badge */}
          <div className="mb-4">
            <span
              className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{ backgroundColor: urgensiColor + "18", color: urgensiColor }}
            >
              {panelUrgensi} Priority
            </span>
          </div>

          {/* Avatar + name */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[14px] font-black shrink-0"
              style={{ background: "#EB5E28" }}
            >
              {getInitials(s.nama_sopir || "NA")}
            </div>
            <div>
              <div className="text-[13px] font-black text-text-main">
                {s.nama_sopir || "—"}
              </div>
              <div className="text-[10px] text-text-light">
                {s.no_polisi || "—"}
              </div>
            </div>
          </div>

          {/* Detail rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-text-light">Plat Nomor</span>
              <span
                className="text-[11px] font-black font-mono px-2 py-0.5 rounded text-white tracking-wider"
                style={{ background: "#252422" }}
              >
                {s.no_polisi || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-text-light">Jenis Truck</span>
              <span className="text-[11px] font-medium text-text-main">
                {s.jenis_truk || s.unit_muatan || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-text-light">Muatan</span>
              <span className="text-[11px] font-medium text-text-main truncate max-w-[130px]">
                {s.muatan || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-text-light">Rute</span>
              <span className="text-[10px] text-text-med text-right max-w-[130px]">
                {s.lokasi_muat} → {s.lokasi_bongkar}
              </span>
            </div>
          </div>
        </div>

        {/* ── CENTER: Form Input Logger ──────────────────── */}
        <div className="p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-light opacity-60 mb-4">
            Form Input Logger Dispatcher
          </div>

          {/* Status buttons */}
          <div className="mb-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-light mb-2 block">
              Tahap Status:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_BUTTONS.map((btn) => {
                const isActive = panelStatus === btn.value;
                const c = getStatusHex(btn.value);
                return (
                  <button
                    key={btn.value}
                    onClick={() => setPanelStatus(btn.value)}
                    className="h-7 px-3 text-[10px] font-bold rounded-full transition-all"
                    style={{
                      backgroundColor: isActive ? c : c + "15",
                      color: isActive ? "#fff" : c,
                    }}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Checkpoint */}
          <div className="mb-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-light mb-1.5 block">
              Checkpoint / Posisi Terakhir: <span className="text-error">*</span>
            </label>
            <input
              className="input w-full text-[12px] h-9"
              placeholder="Cth: Rest Area KM 207A Tol Palimanan"
              value={panelCheckpoint}
              onChange={e => setPanelCheckpoint(e.target.value)}
            />
          </div>

          {/* Urgensi */}
          <div className="mb-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-light mb-1.5 block">
              Prioritas / Urgensi Operasional:
            </label>
            <select
              className="input w-full text-[12px] h-9"
              value={panelUrgensi}
              onChange={e => setPanelUrgensi(e.target.value)}
            >
              {URGENSI_OPTIONS.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Remarks */}
          <div className="mb-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-light mb-1.5 block">
              Catatan Logs / Remarks:
            </label>
            <textarea
              className="input w-full text-[12px] resize-none"
              rows={2}
              placeholder="Deskripsi kejadian berkendara (Remarks)..."
              value={panelRemarks}
              onChange={e => setPanelRemarks(e.target.value)}
            />
          </div>

          {/* Foto Muat & Bongkar — selalu tampil, tidak kondisional */}
          <div className="mb-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-text-light opacity-70 flex items-center gap-1.5">
              <Icon name="Camera" size={10} /> Dokumentasi (Google Drive)
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-text-light opacity-50 mb-1 block">Foto Muat</label>
              <div className="flex gap-1.5">
                <input
                  className="input flex-1 text-[11px] h-8"
                  placeholder="https://drive.google.com/..."
                  value={panelFotoMuat}
                  onChange={e => setPanelFotoMuat(e.target.value)}
                />
                {panelFotoMuat && (
                  <a href={panelFotoMuat} target="_blank" rel="noopener noreferrer"
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-border-main text-text-light hover:text-accent hover:border-accent transition-colors shrink-0">
                    <Icon name="ExternalLink" size={11} />
                  </a>
                )}
              </div>
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-text-light opacity-50 mb-1 block">Foto Bongkar / POD</label>
              <div className="flex gap-1.5">
                <input
                  className="input flex-1 text-[11px] h-8"
                  placeholder="https://drive.google.com/..."
                  value={panelFotoBongkar}
                  onChange={e => setPanelFotoBongkar(e.target.value)}
                />
                {panelFotoBongkar && (
                  <a href={panelFotoBongkar} target="_blank" rel="noopener noreferrer"
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-border-main text-text-light hover:text-accent hover:border-accent transition-colors shrink-0">
                    <Icon name="ExternalLink" size={11} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={onSubmit}
              disabled={loading}
              className="btn-primary h-9 px-4 text-[12px] flex-1 flex items-center justify-center gap-2"
            >
              {loading
                ? <Icon name="Loader2" size={13} className="animate-spin" />
                : <Icon name="Plus" size={13} />
              }
              Submit Log
            </button>
            <button
              onClick={onCopy}
              className="btn-secondary h-9 px-4 text-[12px] flex items-center gap-2"
            >
              <Icon name="Copy" size={13} /> Salin Teks SJM
            </button>
          </div>
        </div>

        {/* ── RIGHT: Kronologi Timeline ──────────────────── */}
        <div className="p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-light opacity-60 mb-4">
            Kronologi Rute Pergerakan ({(s.posisi_log || []).length})
          </div>

          {(!s.posisi_log || s.posisi_log.length === 0) ? (
            <div className="flex flex-col items-center gap-2 py-10 text-text-light">
              <Icon name="MapPin" size={28} strokeWidth={1.5} className="opacity-30" />
              <div className="text-[11px] opacity-50 font-medium">Belum ada log pergerakan</div>
              <div className="text-[10px] opacity-30">Submit log pertama di form sebelah</div>
            </div>
          ) : (
            <div className="space-y-0 max-h-[280px] overflow-y-auto pr-1">
              {(s.posisi_log || []).slice(0, 10).map((log: any, i: number) => {
                const lc = getStatusHex(log.status);
                const ago = timeAgo(log.date, log.time);
                return (
                  <div key={i} className="relative flex gap-3 pb-4">
                    {/* Vertical line */}
                    {i < Math.min((s.posisi_log || []).length - 1, 9) && (
                      <div className="absolute left-[6px] top-3.5 bottom-0 w-px bg-border-main/40" />
                    )}
                    {/* Dot */}
                    <div
                      className="w-3 h-3 rounded-full border-2 border-white shrink-0 mt-1 shadow-sm"
                      style={{ backgroundColor: lc }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-[10px] text-text-light tabular-nums">
                          {log.date}, {log.time}
                        </span>
                        {ago && (
                          <span className="text-[9px] text-text-light opacity-50">{ago}</span>
                        )}
                        <span
                          className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: lc + "18", color: lc }}
                        >
                          {getStatusLabel(log.status)}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-text-main">
                        {log.location || "—"}
                      </div>
                      {log.info && !log.info.includes("Status diperbarui via Stepper") && (
                        <div className="text-[10px] text-text-med mt-0.5 italic line-clamp-2">
                          "{log.info}"
                        </div>
                      )}
                      {log.foto_url && (
                        <a
                          href={log.foto_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-accent hover:underline"
                        >
                          <Icon name="Paperclip" size={9} />
                          {log.foto_label || "Lihat Dokumen"}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const UpdateMuatan = ({ so, setSo, onSOClick, onArmadaClick, logAction }: any) => {
  const { showToast, ToastUI } = useToast();

  // ── Filters
  const [search, setSearch]                       = useState("");
  const [selectedStatuses, setSelectedStatuses]   = useState<Set<string>>(new Set());
  const [sortKey, setSortKey]                     = useState<'order_id' | 'tgl_muat'>('order_id');
  const [sortDir, setSortDir]                     = useState<'asc' | 'desc'>('desc');

  // ── Panel state
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [panelStatus, setPanelStatus]       = useState("");
  const [panelCheckpoint, setPanelCheckpoint] = useState("");
  const [panelUrgensi, setPanelUrgensi]     = useState("Normal");
  const [panelRemarks, setPanelRemarks]     = useState("");
  const [panelFotoMuat, setPanelFotoMuat]   = useState("");
  const [panelFotoBongkar, setPanelFotoBongkar] = useState("");
  const [loading, setLoading]               = useState(false);

  // ── KPI data
  const allSO = so || [];
  const activeSO = useMemo(
    () => allSO.filter((s: any) => !["Completed", "Cancelled"].includes(s.status_muatan)),
    [allSO]
  );
  const kpiTotal   = activeSO.length;
  const kpiTransit = activeSO.filter((s: any) => s.status_muatan === "On Going").length;
  const kpiMuat    = activeSO.filter((s: any) => s.status_muatan === "Loading").length;
  const kpiAtensi  = useMemo(() => activeSO.filter((s: any) => {
    if (!s.posisi_log?.length) return true;
    const last = s.posisi_log[0];
    try {
      const dt = new Date(`${last.date}T${last.time || "00:00"}:00`);
      return (Date.now() - dt.getTime()) > 24 * 60 * 60 * 1000;
    } catch { return false; }
  }).length, [activeSO]);

  const toggleSort = (key: 'order_id' | 'tgl_muat') => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const toggleStatus = (st: string) => {
    setSelectedStatuses(prev => {
      const next = new Set(prev);
      if (next.has(st)) next.delete(st); else next.add(st);
      return next;
    });
  };

  // ── Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const base = allSO.filter((s: any) => {
      const matchSearch = !search ||
        s.order_id?.toLowerCase().includes(q) ||
        s.customer?.toLowerCase().includes(q) ||
        s.no_polisi?.toLowerCase().includes(q) ||
        s.nama_sopir?.toLowerCase().includes(q);
      const matchStatus = selectedStatuses.size === 0 || selectedStatuses.has(s.status_muatan);
      return matchSearch && matchStatus;
    });
    return [...base].sort((a: any, b: any) => {
      const aVal = sortKey === 'tgl_muat' ? (a.tgl_muat || '') : (a.order_id || '');
      const bVal = sortKey === 'tgl_muat' ? (b.tgl_muat || '') : (b.order_id || '');
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [allSO, search, selectedStatuses, sortKey, sortDir]);

  // ── Open / close terminal panel
  const openPanel = (s: any) => {
    if (expandedId === s.id) { setExpandedId(null); return; }
    setExpandedId(s.id);
    setPanelStatus(s.status_muatan);
    setPanelCheckpoint(s.posisi_log?.[0]?.location || "");
    setPanelUrgensi("Normal");
    setPanelRemarks("");
    setPanelFotoMuat(s.foto_muat || "");
    setPanelFotoBongkar(s.foto_bongkar || "");
  };

  // ── Submit log from terminal panel
  const submitLog = async (s: any) => {
    if (!panelCheckpoint && !panelRemarks) {
      showToast("Mohon isi checkpoint atau catatan", "error"); return;
    }
    setLoading(true);
    try {
      const now = new Date();
      const logEntry: any = {
        date:    now.toISOString().split("T")[0],
        time:    now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        status:  panelStatus,
        info:    panelRemarks || `Update posisi: ${panelCheckpoint}`,
        location: panelCheckpoint,
        urgensi: panelUrgensi,
      };
      const updatedLog = [logEntry, ...(s.posisi_log || [])];
      const updates: any = { posisi_log: updatedLog };
      if (panelStatus !== s.status_muatan) updates.status_muatan = panelStatus;
      if (panelFotoMuat   !== (s.foto_muat    || "")) updates.foto_muat    = panelFotoMuat    || null;
      if (panelFotoBongkar !== (s.foto_bongkar || "")) updates.foto_bongkar = panelFotoBongkar || null;

      await api.updateSO(s.id, updates);
      setSo((prev: any[]) =>
        prev.map(x => x.id === s.id ? { ...x, ...updates } : x)
      );
      logAction(`Log Muatan SO: ${s.order_id}`, {
        location: panelCheckpoint,
        status: panelStatus,
        urgensi: panelUrgensi,
      });
      setPanelRemarks("");
      showToast("Log berhasil disimpan", "success");
    } catch (e: any) {
      showToast("Gagal simpan: " + e.message, "error");
    }
    setLoading(false);
  };

  // ── Copy SJM text to clipboard
  const copySJMText = (s: any) => {
    const lastLog = s.posisi_log?.[0];
    const statusText = lastLog
      ? `${getStatusLabel(lastLog.status)}${lastLog.location ? ` di ${lastLog.location}` : ""}${
          lastLog.info && !lastLog.info.includes("Status diperbarui via Stepper")
            ? `\n${lastLog.info}`
            : ""
        }`
      : getStatusLabel(s.status_muatan);

    const text =
      `*Update Status Muatan*\n${s.order_id}\n\n` +
      `${s.lokasi_muat} → ${s.lokasi_bongkar}\n\n` +
      `Armada  : ${s.unit_muatan || "—"}\n` +
      `Sopir   : ${s.nama_sopir || "—"}\n` +
      `No. Pol : ${s.no_polisi || "—"}\n` +
      `Muatan  : ${s.muatan || "—"}\n\n` +
      `Status :\n${statusText}\n\n` +
      `Terima kasih\nPT Sugiarto Jaya Mandiri Transport`;

    navigator.clipboard.writeText(text);
    showToast("Teks SJM berhasil disalin!", "success");
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <PageShell>
      {ToastUI}

      {/* ── Header ── */}
      <PageHeader
        title="Update Muatan"
        sub="Lakukan Update Status Muatan secara Berkala"
      />

      {/* ── KPI Grid ── */}
      <KPIGrid cols={4}>
        <StatCard
          label="Total Armada Aktif"
          value={String(kpiTotal)}
          sub={`${kpiTransit} dalam perjalanan`}
          icon="Truck"
          color="var(--color-accent)"
        />
        <StatCard
          label="Dalam Perjalanan"
          value={String(kpiTransit)}
          sub="Menuju titik bongkar"
          icon="Navigation"
          color="#4A6FA5"
        />
        <StatCard
          label="Proses Muat & Bongkar"
          value={String(kpiMuat)}
          sub="Sedang di pabrik / gudang"
          icon="Package"
          color="var(--color-warning)"
        />
        <StatCard
          label="Perlu Atensi"
          value={String(kpiAtensi)}
          sub={kpiAtensi > 0 ? `${kpiAtensi} armada perlu update` : "Semua armada update"}
          icon="AlertTriangle"
          color="var(--color-error)"
        />
      </KPIGrid>

      {/* ── Filter Bar ── */}
      <ActionBar
        left={
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <div className="relative min-w-[200px]">
              <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
              <input
                className="input-field h-9 w-full pl-9 text-[12px]"
                placeholder="Cari SO, Customer, Sopir, Plat..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {/* Multi-select status pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(["Order Confirmed", "Loading", "On Going", "Completed", "Cancelled"] as const).map(st => {
                const count = allSO.filter((s: any) => s.status_muatan === st).length;
                const hex   = getStatusHex(st);
                const active = selectedStatuses.has(st);
                return (
                  <button
                    key={st}
                    onClick={() => toggleStatus(st)}
                    className="flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[10px] font-bold border transition-all"
                    style={active ? {
                      background: hex + '18',
                      borderColor: hex,
                      color: hex,
                    } : {
                      background: 'white',
                      borderColor: 'var(--color-border-main)',
                      color: 'var(--color-text-light)',
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: hex }} />
                    {getStatusLabel(st)}
                    <span className="font-black opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        }
        right={(search || selectedStatuses.size > 0) ? (
          <button
            onClick={() => { setSearch(""); setSelectedStatuses(new Set()); }}
            className="btn-ghost h-9 px-3 text-[12px] flex items-center gap-1.5"
          >
            <Icon name="X" size={13} /> Reset
          </button>
        ) : undefined}
      />

      {/* ── Table ── */}
      <div className="table-container max-h-[calc(100vh-360px)]">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-50 border-b-2 border-border-main">
              <th
                className={`w-[110px] text-left py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap cursor-pointer select-none transition-colors hover:bg-slate-100 ${sortKey === 'order_id' ? 'text-accent bg-slate-100' : 'text-text-light opacity-70'}`}
                onClick={() => toggleSort('order_id')}
              >
                <span className="flex items-center gap-1">
                  No. SO
                  {sortKey !== 'order_id' && <Icon name="ArrowUpDown" size={9} className="opacity-40" />}
                  {sortKey === 'order_id' && sortDir === 'asc' && <Icon name="ArrowUp" size={9} className="text-accent" />}
                  {sortKey === 'order_id' && sortDir === 'desc' && <Icon name="ArrowDown" size={9} className="text-accent" />}
                </span>
              </th>
              <th className="w-[120px] text-left py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest text-text-light opacity-70">Sopir</th>
              <th className="w-[130px] text-left py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest text-text-light opacity-70">Plat &amp; Armada</th>
              <th className="w-[180px] text-left py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest text-text-light opacity-70">Customer &amp; Barang</th>
              <th
                className={`w-[150px] text-left py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest cursor-pointer select-none transition-colors hover:bg-slate-100 ${sortKey === 'tgl_muat' ? 'text-accent bg-slate-100' : 'text-text-light opacity-70'}`}
                onClick={() => toggleSort('tgl_muat')}
              >
                <span className="flex items-center gap-1">
                  Rute
                  {sortKey !== 'tgl_muat' && <Icon name="ArrowUpDown" size={9} className="opacity-40" />}
                  {sortKey === 'tgl_muat' && sortDir === 'asc' && <Icon name="ArrowUp" size={9} className="text-accent" />}
                  {sortKey === 'tgl_muat' && sortDir === 'desc' && <Icon name="ArrowDown" size={9} className="text-accent" />}
                </span>
              </th>
              <th className="w-[160px] text-left py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest text-text-light opacity-70">Posisi Terakhir</th>
              <th className="w-[100px] text-left py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest text-text-light opacity-70">Status</th>
              <th className="w-[80px] text-right py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest text-text-light opacity-70">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-main/20">
            {filtered.length === 0 ? (
              <EmptyState colSpan={8} msg="Tidak ada muatan yang ditemukan" icon="Truck" />
            ) : filtered.map((s: any) => {
              const isExpanded  = expandedId === s.id;
              const lastLog     = s.posisi_log?.[0];
              const statusColor = getStatusHex(s.status_muatan);

              return (
                <React.Fragment key={s.id}>
                  {/* ── Data row ── */}
                  <tr className={`transition-colors group ${
                    isExpanded ? "bg-accent/5 border-l-2 border-l-accent" : "hover:bg-accent/5"
                  }`}>

                    {/* No. SO */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onSOClick(s.order_id)}
                        className="text-[11px] font-black italic text-accent hover:underline tracking-tight"
                      >
                        {s.order_id}
                      </button>
                      {s.tgl_muat && (
                        <div className="text-[10px] text-text-light mt-0.5 tabular-nums">
                          {s.tgl_muat}
                        </div>
                      )}
                    </td>

                    {/* Sopir */}
                    <td className="py-3 px-4 max-w-[120px]">
                      <div className="text-[12px] font-medium text-text-main truncate" title={s.nama_sopir || "—"}>
                        {s.nama_sopir || "—"}
                      </div>
                    </td>

                    {/* Plat & Armada */}
                    <td className="py-3 px-4 max-w-[130px]">
                      {s.no_polisi ? (
                        <button
                          onClick={() => onArmadaClick && onArmadaClick(s.no_polisi)}
                          className="text-[11px] font-black font-mono px-2 py-0.5 rounded text-white tracking-wider hover:bg-accent transition-colors truncate max-w-full"
                          style={{ background: "#252422" }}
                          title={s.no_polisi}
                        >
                          {s.no_polisi}
                        </button>
                      ) : <span className="text-text-light text-[11px]">—</span>}
                      <div className="text-[10px] text-text-light mt-0.5 truncate" title={s.jenis_truk || s.unit_muatan || "—"}>
                        {s.jenis_truk || s.unit_muatan || "—"}
                      </div>
                    </td>

                    {/* Customer & Barang */}
                    <td className="py-3 px-4 max-w-[180px]">
                      <div className="text-[12px] font-medium text-text-main truncate" title={s.customer || "—"}>
                        {s.customer || "—"}
                      </div>
                      <div className="text-[10px] text-text-light truncate" title={s.muatan || s.unit_muatan || "—"}>
                        {s.muatan || s.unit_muatan || "—"}
                      </div>
                    </td>

                    {/* Rute */}
                    <td className="py-3 px-4 max-w-[150px]">
                      <div className="flex items-center gap-1.5 text-[11px] text-text-med w-full" title={`Dari ${s.lokasi_muat || "—"} ke ${s.lokasi_bongkar || "—"}`}>
                        <span className="truncate max-w-[80px]">{s.lokasi_muat || "—"}</span>
                        <Icon name="ArrowRight" size={10} className="text-text-light shrink-0" />
                        <span className="truncate max-w-[80px]">{s.lokasi_bongkar || "—"}</span>
                      </div>
                    </td>

                    {/* Posisi Terakhir */}
                    <td className="py-3 px-4 max-w-[160px]">
                      {lastLog ? (
                        <>
                          <div className="text-[11px] text-text-main truncate" title={lastLog.location || "—"}>
                            {lastLog.location || "—"}
                          </div>
                          <div className="text-[10px] text-text-light tabular-nums">
                            {lastLog.date}, {lastLog.time}
                          </div>
                        </>
                      ) : (
                        <span className="text-[11px] text-text-light italic">
                          Belum ada update
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide whitespace-nowrap"
                        style={{
                          backgroundColor: statusColor + "18",
                          color: statusColor,
                        }}
                      >
                        {getStatusLabel(s.status_muatan)}
                      </span>
                    </td>

                    {/* Aksi */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openPanel(s)}
                        className="btn-primary h-8 px-3 text-[11px] flex items-center gap-1.5 ml-auto"
                      >
                        <Icon name={isExpanded ? "ChevronUp" : "Pencil"} size={12} />
                        {isExpanded ? "Tutup" : "Update"}
                      </button>
                    </td>
                  </tr>

                  {/* ── Terminal Panel ── */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={8} className="p-0">
                        <TerminalPanel
                          s={s}
                          panelStatus={panelStatus}
                          setPanelStatus={setPanelStatus}
                          panelCheckpoint={panelCheckpoint}
                          setPanelCheckpoint={setPanelCheckpoint}
                          panelUrgensi={panelUrgensi}
                          setPanelUrgensi={setPanelUrgensi}
                          panelRemarks={panelRemarks}
                          setPanelRemarks={setPanelRemarks}
                          panelFotoMuat={panelFotoMuat}
                          setPanelFotoMuat={setPanelFotoMuat}
                          panelFotoBongkar={panelFotoBongkar}
                          setPanelFotoBongkar={setPanelFotoBongkar}
                          loading={loading}
                          onSubmit={() => submitLog(s)}
                          onCopy={() => copySJMText(s)}
                          onClose={() => setExpandedId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
};
