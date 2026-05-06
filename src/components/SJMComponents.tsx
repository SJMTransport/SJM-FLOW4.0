import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { C, STATUS_COLOR, STATUS_BG } from "../constants";
import { fmt, fmtShort } from "@/src/utils";
import * as Lucide from "lucide-react";

export const Icon = ({ name, size=16, className="", ...props }: any) => {
  const LucideIcon = (Lucide as any)[name];
  if (!LucideIcon) return null;
  return <LucideIcon size={size} className={className} {...props} />;
};

export const Card = ({ children, className = "", ...props }: any) => (
  <div className={`card-modern p-4 ${className}`} {...props}>{children}</div>
);

export const Spinner = ({ size = 20, center = false, color = "currentColor" }: any) => (
  <div className={center ? "flex justify-center p-8" : "inline-block"}>
    <Lucide.Loader2 className="animate-spin" size={size} color={color} />
  </div>
);

export const Spark = ({ data = [], color = "#F97316" }: any) => {
  if (!Array.isArray(data) || data.length < 2) return null;
  const W = 100, H = 24, pad = 2;
  const mn = Math.min(...data), mx = Math.max(...data), rng = (mx - mn) || 1;
  const pts = data.map((v: any, i: number) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - mn) / rng) * (H - pad * 2) - pad;
    return x.toFixed(1) + "," + y.toFixed(1);
  });
  const line = "M " + pts.join(" L ");
  const area = line + " L " + W + "," + H + " L 0," + H + " Z";
  return (
    <svg viewBox={"0 0 " + W + " " + H} preserveAspectRatio="none" className="w-full h-full block">
      <path d={area} fill={color} fillOpacity="0.06" stroke="none" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

// ─── DESIGN SYSTEM LAYOUT COMPONENTS ───────────────────────────────────────

/** Unified page shell — max 1320px, 24px horizontal padding */
export const PageShell = ({ children, className = "" }: any) => (
  <div className={`page-shell fade-up ${className}`}>{children}</div>
);

/** Mandatory page header: title left, period/actions right. 16px below. */
export const PageHeader = ({ title, sub, action }: any) => (
  <div className="ph-block">
    <div>
      <h1 className="ph-title">{title}</h1>
      {sub && <p className="ph-sub">{sub}</p>}
    </div>
    {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
  </div>
);

/** Action bar: left = primary buttons, right = filters. All items 40px. 24px below. */
export const ActionBar = ({ left, right, className = "" }: any) => (
  <div className={`action-bar ${className}`}>
    <div className="action-bar-left">{left}</div>
    <div className="action-bar-right">{right}</div>
  </div>
);

/** KPI grid: locked 16px gap, each card 128px. 32px below. */
export const KPIGrid = ({ children, cols = 3, className = "" }: any) => (
  <div className={`kpi-grid kpi-grid-${cols} ${className}`}>{children}</div>
);

/** Fixed-height KPI card (128px). Icon top-right, label top-left, value middle, sub bottom. */
export const StatCard = ({ label, value, sub, color, delay = 0, sparkData, sparkColor, icon }: any) => (
  <div className="kpi-card fade-up" style={{ animationDelay: `${delay}ms` }}>
    <div className="flex items-start justify-between gap-2">
      <div className="kpi-card-label flex-1 min-w-0">{label}</div>
      {icon && (
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color || "var(--color-accent)"}18`, color: color || "var(--color-accent)" }}
        >
          <Icon name={icon} size={16} />
        </div>
      )}
    </div>
    <div className="kpi-card-value" style={{ color: color || undefined }}>{value}</div>
    <div className="flex items-end justify-between gap-2">
      {sub && <div className="kpi-card-sub">{sub}</div>}
      {sparkData && sparkData.length > 0 && (
        <div className="w-16 h-5 opacity-50 shrink-0">
          <Spark data={sparkData} color={sparkColor || color || "var(--color-accent)"} />
        </div>
      )}
    </div>
  </div>
);

/** Legacy SectionHeader — kept for backward compat, delegates to PageHeader */
export const SectionHeader = ({ title, sub, action }: any) => (
  <PageHeader title={title} sub={sub} action={action} />
);

export const Stepper = ({ steps, currentStep, isCancelled = false }: { steps: string[], currentStep: number, isCancelled?: boolean }) => (
  <div className={`flex items-center justify-between gap-1 mb-8 w-full max-w-2xl mx-auto px-4 ${isCancelled ? "opacity-40 grayscale" : ""}`}>
    {steps.map((step, idx) => {
      const s = idx + 1;
      const isActive = currentStep === s;
      const isCompleted = currentStep > s;
      const stepColor = STATUS_COLOR[step] || "var(--color-accent)";
      
      return (
        <React.Fragment key={idx}>
          <div className="flex flex-col items-center gap-2 relative group">
            <div 
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-all duration-500 ${
                isActive ? "text-white shadow-lg" : 
                isCompleted ? "text-white shadow-sm" : 
                "bg-white border-slate-200 text-slate-400"
              }`}
              style={{ 
                backgroundColor: (isActive || isCompleted) ? stepColor : "white",
                borderColor: (isActive || isCompleted) ? stepColor : "var(--color-border-main)"
              }}
            >
              {isCompleted ? <Lucide.Check size={14} strokeWidth={4} /> : s}
            </div>
            <div className={`text-[10px] font-bold transition-colors duration-300 absolute -bottom-5 whitespace-nowrap ${
              isActive ? "opacity-100" : "opacity-40"
            }`} style={{ color: isActive ? stepColor : "inherit" }}>
              {step}
            </div>
          </div>
          {idx < steps.length - 1 && (
            <div className="flex-1 flex items-center justify-center -mt-5">
               <Lucide.ChevronRight size={14} className={isCompleted ? "text-slate-400" : "text-slate-200"} strokeWidth={3} />
            </div>
          )}
        </React.Fragment>
      );
    })}
  </div>
);

export const EmptyState = ({ colSpan = 20, msg = "Belum ada data", icon = "Search", error = false }: any) => (
  <tr>
    <td colSpan={colSpan} className="py-16 text-center">
       <div className="flex flex-col items-center gap-4 max-w-xs mx-auto animate-fade-up">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${error ? "bg-red-brand-light text-red-brand" : "bg-slate-50 text-text-light/30"}`}>
             <Icon name={error ? "AlertCircle" : icon} size={24} strokeWidth={1.5} />
          </div>
          <div>
              <div className="font-bold text-sm text-text-main mb-1">{error ? "Terjadi Kesalahan" : msg}</div>
              <p className="text-[10px] text-text-light font-bold leading-relaxed opacity-60">
                {error ? "Gagal memuat data dari server." : "Ganti filter periode atau gunakan pencarian yang berbeda."}
              </p>
          </div>
          {error && <button className="px-4 py-2 rounded-lg bg-slate-900 text-white text-[10px] font-bold hover:bg-black transition-all" onClick={() => window.location.reload()}>Muat Ulang</button>}
       </div>
    </td>
  </tr>
);

export const statusBadge = (s: string) => {
  const finMap: any = { 
    "Lunas": { bg: "var(--color-green-brand-light)", fg: "var(--color-green-brand)" }, 
    "Parsial": { bg: "var(--color-yellow-brand-light)", fg: "var(--color-yellow-brand)" }, 
    "Belum Lunas": { bg: "var(--color-bg)", fg: "var(--color-text-med)" }, 
    "Overpaid": { bg: "var(--color-blue-brand-light)", fg: "var(--color-blue-brand)" },
    "Draft": { bg: "var(--color-bg)", fg: "var(--color-text-med)" },
    "Posted": { bg: "var(--color-green-brand-light)", fg: "var(--color-green-brand)" },
    "Aktif": { bg: "var(--color-green-brand-light)", fg: "var(--color-green-brand)" },
    "Non-Aktif": { bg: "var(--color-bg)", fg: "var(--color-text-med)" },
    "Expired": { bg: "var(--color-red-brand-light)", fg: "var(--color-red-brand)" },
    "OK": { bg: "var(--color-green-brand-light)", fg: "var(--color-green-brand)" },
  };

  const style = finMap[s] || (STATUS_BG[s] ? { bg: STATUS_BG[s], fg: STATUS_COLOR[s] } : { bg: "var(--color-red-brand-light)", fg: "var(--color-red-brand)" });

  return (
    <span className="badge" style={{ background: style.bg, color: style.fg }}>
      {s}
    </span>
  );
};

export const NotificationBadge = ({ count, icon, onClick }: any) => (
  <button onClick={onClick} className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors text-text-med">
    <Icon name={icon} size={20} />
    {count > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-brand text-white text-[9px] font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white">
        {count}
      </span>
    )}
  </button>
);

export const ModalShell = ({ children, onClose, isOpen }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-end p-0 bg-abyssal-blue/40 backdrop-blur-sm animate-fade" onClick={onClose}>
      <div className="absolute inset-0" onClick={onClose} />
      <Card 
        className="relative w-full max-w-4xl h-full shadow-2xl animate-fade-left p-0 border-none rounded-none flex flex-col bg-white overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        {children}
      </Card>
    </div>
  );
}

export const ConfirmModal = ({ open, title, msg, onConfirm, onCancel, confirmLabel = "Hapus", confirmColor = null }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-text-main/40 z-[9000] flex items-center justify-center p-6 backdrop-blur-sm" onClick={onCancel}>
      <Card className="max-w-md w-full shadow-xl animate-fade-up" onClick={e => e.stopPropagation()}>
        <div className="text-lg font-black text-text-main mb-2">{title || "Konfirmasi"}</div>
        <div className="text-[13px] text-text-med font-medium leading-relaxed mb-8">{msg}</div>
        <div className="flex gap-3 justify-end">
          <button className="btn-ghost" onClick={onCancel}>Batal</button>
          <button className="btn-primary" onClick={onConfirm} style={{ background: confirmColor || "var(--color-red-brand)" }}>{confirmLabel}</button>
        </div>
      </Card>
    </div>
  );
};

export const useConfirm = () => {
    const [state, setState] = React.useState<any>({ open:false, title:"", msg:"", onConfirm:null, confirmLabel:"Hapus", confirmColor:null });
    const confirm = (args: any) => setState({ ...args, open:true });
    const close = () => setState((s: any) => ({ ...s, open:false }));
    const handleConfirm = () => { close(); state.onConfirm?.(); };
    const Modal = () => <ConfirmModal {...state} onConfirm={handleConfirm} onCancel={close} />;
    return { confirm, Modal };
};

export const Toast = ({ msg, type = "success" }: { msg: string, type?: string }) => {
    const config: any = {
        success: { bg: "var(--color-green-brand)", icon: "CheckCircle" },
        error: { bg: "var(--color-red-brand)", icon: "XCircle" },
        info: { bg: "var(--color-blue-brand)", icon: "Info" },
        warning: { bg: "var(--color-accent)", icon: "AlertTriangle" },
    };
    const c = config[type] || config.info;
    return (
        <div className="fade-up fixed bottom-10 right-6 sm:right-10 text-white py-4 px-6 rounded-2xl shadow-xl flex items-center gap-3 z-[10000] font-bold text-[13px]" style={{ background: c.bg }}>
            <Icon name={c.icon} size={20} />
            {msg}
        </div>
    );
};

export const useToast = () => {
    const [toast, setToast] = React.useState<any>(null);
    const showToast = (msg: string, type: any = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };
    const ToastUI = () => toast ? <Toast msg={toast.msg} type={toast.type} /> : null;
    return { showToast, ToastUI };
};

export const FeedbackButton = ({ 
  children, 
  onClick, 
  loading = false, 
  success = false, 
  error = false, 
  className = "", 
  disabled = false, 
  ...props 
}: any) => {
  const [shake, setShake] = React.useState(0);

  React.useEffect(() => {
    if (error) setShake(prev => prev + 1);
  }, [error]);

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading || success}
      animate={shake > 0 ? { x: [0, -10, 10, -10, 10, 0] } : {}}
      transition={{ duration: 0.4 }}
      className={`btn-primary relative overflow-hidden transition-all duration-300 ${success ? "!bg-green-brand !text-white !border-green-brand" : ""} ${className}`}
      {...props}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-center gap-2"
          >
            <Lucide.Loader2 className="animate-spin" size={16} />
            <span>Memproses...</span>
          </motion.div>
        ) : success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-2"
          >
            <Lucide.CheckCircle size={16} />
            <span>Berhasil!</span>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export const PeriodFilter = ({ period, setPeriod, search, setSearch, onAdd, loading = false, hideSearch = false, hidePeriod = false }: any) => {
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const todayStr = new Date().toISOString().slice(0, 10);

  const isRange = period.mode === "range";

  return (
    <div className="flex flex-col lg:flex-row gap-2 mb-4 items-stretch lg:items-center w-full">
      {setSearch !== undefined && !hideSearch && (
        <div className="flex-1 min-w-0">
          <div className="relative group w-full lg:max-w-md">
            <Lucide.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-light opacity-50 group-focus-within:text-accent transition-colors" size={14} />
            <input
              className="input-field pl-10"
              placeholder="Search data..."
              value={search || ""}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap lg:flex-nowrap gap-2 items-center shrink-0">
        {!hidePeriod && (
          <div className={`flex items-center gap-0 bg-white border border-border-main rounded-xl h-[38px] px-1 shadow-sm overflow-hidden divide-x divide-border-main/50 ${isRange ? "h-auto py-1" : ""}`}>
            <select
              className="bg-transparent text-[11px] font-extrabold px-3 h-[30px] border-none outline-none cursor-pointer hover:text-accent transition-colors appearance-none"
              value={period.mode || "all"}
              onChange={e => {
                const mode = e.target.value;
                if (mode === "day") setPeriod({ ...period, mode, day: period.day || todayStr });
                else if (mode === "range") setPeriod({ ...period, mode, rangeFrom: period.rangeFrom || todayStr, rangeTo: period.rangeTo || todayStr });
                else setPeriod({ ...period, mode });
              }}
            >
              <option value="all">Semua</option>
              <option value="day">Harian</option>
              <option value="month">Bulanan</option>
              <option value="year">Tahunan</option>
              <option value="range">Rentang</option>
            </select>

            {period.mode === "day" && (
              <input
                type="date"
                className="bg-transparent text-[11px] font-extrabold px-3 h-[30px] border-none outline-none cursor-pointer tabular-nums"
                value={period.day || todayStr}
                onChange={e => setPeriod({ ...period, day: e.target.value })}
              />
            )}

            {period.mode === "range" && (
              <>
                <input
                  type="date"
                  className="bg-transparent text-[11px] font-extrabold px-2 h-[30px] border-none outline-none cursor-pointer tabular-nums"
                  value={period.rangeFrom || ""}
                  onChange={e => setPeriod({ ...period, rangeFrom: e.target.value })}
                />
                <span className="text-[10px] font-black text-text-light px-1 opacity-40">—</span>
                <input
                  type="date"
                  className="bg-transparent text-[11px] font-extrabold px-2 h-[30px] border-none outline-none cursor-pointer tabular-nums"
                  value={period.rangeTo || ""}
                  onChange={e => setPeriod({ ...period, rangeTo: e.target.value })}
                />
              </>
            )}

            {period.mode === "month" && (
              <select
                className="bg-transparent text-[11px] font-extrabold px-3 h-[30px] border-none outline-none cursor-pointer hover:text-accent transition-colors appearance-none text-center"
                value={period.month ?? 0}
                onChange={e => setPeriod({ ...period, month: parseInt(e.target.value) })}
              >
                {months.map((m, i) => <option key={i} value={i}>{m.substring(0,3)}</option>)}
              </select>
            )}

            {(period.mode === "month" || period.mode === "year") && (
              <select
                className="bg-transparent text-[11px] font-extrabold px-3 h-[30px] border-none outline-none cursor-pointer hover:text-accent transition-colors appearance-none text-center"
                value={period.year ?? new Date().getFullYear()}
                onChange={e => setPeriod({ ...period, year: parseInt(e.target.value) })}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>
        )}

        {onAdd && (
          <button
            className="btn-primary flex items-center justify-center gap-2 min-w-[120px] h-[38px] px-4 rounded-xl shadow-lg shadow-accent/10"
            onClick={onAdd}
            disabled={loading}
          >
            {loading ? <Lucide.Loader2 className="animate-spin" size={16} /> : <><Lucide.Plus size={16} strokeWidth={3} /> <span className="font-extrabold text-[10px] uppercase tracking-wider">Data Baru</span></>}
          </button>
        )}
      </div>
    </div>
  );
};
