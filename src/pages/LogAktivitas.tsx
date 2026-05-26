import React, { useState, useMemo } from 'react';
import { canView, type ModuleKey as PermModuleKey } from '@/src/permissions';
import { MODULE_LABELS, ACTION_LABELS, ACTION_HEX } from '@/src/lib/activityLogger';
import { useToast, Icon, PageShell, EmptyState } from '@/src/components/SJMComponents';

// Map log module key → permissions module key
const LOG_MODULE_TO_PERM: Record<string, PermModuleKey> = {
  jurnal: 'jurnal',
  so: 'so',
  laporan: 'laporan',
  armada: 'armada',
  posisi: 'armada',
  kontak: 'so',
  coa: 'master',
  auth: 'users',
  invoice: 'invoice',
  quotation: 'quotation',
};

const formatDateTime = (iso: string) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `${date}, ${time}`;
  } catch { return iso; }
};

export const LogAktivitasPage = ({ auditLogs, currentUser }: any) => {
  const { ToastUI } = useToast();

  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo]     = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Parse metadata JSON untuk setiap log entry
  const parsedLogs = useMemo(() => {
    return (auditLogs || []).map((log: any) => {
      let meta: any = {};
      try { meta = JSON.parse(log.metadata || '{}'); } catch {}
      return { ...log, meta };
    });
  }, [auditLogs]);

  // Filter berdasarkan permission user — hanya tampilkan log modul yang bisa dilihat
  const permissionFiltered = useMemo(() => {
    return parsedLogs.filter((log: any) => {
      const logModule = log.meta?.module as string;
      if (!logModule) return true; // log tanpa modul (e.g. login) selalu tampil
      const permKey = LOG_MODULE_TO_PERM[logModule];
      if (!permKey) return true;
      return canView(currentUser?.role ?? '', permKey);
    });
  }, [parsedLogs, currentUser]);

  // Daftar modul yang ada di data (untuk dropdown filter)
  const availableModules = useMemo(() => {
    const mods = new Set(permissionFiltered.map((l: any) => l.meta?.module).filter(Boolean));
    return Array.from(mods) as string[];
  }, [permissionFiltered]);

  // Daftar action type yang ada di data (untuk dropdown filter)
  const availableActions = useMemo(() => {
    const acts = new Set(permissionFiltered.map((l: any) => l.meta?.action_type).filter(Boolean));
    return Array.from(acts) as string[];
  }, [permissionFiltered]);

  // Terapkan filter user
  const filtered = useMemo(() => {
    return permissionFiltered.filter((log: any) => {
      if (filterFrom && log.timestamp < filterFrom) return false;
      if (filterTo   && log.timestamp > filterTo + 'T23:59:59') return false;
      if (filterModule && log.meta?.module !== filterModule) return false;
      if (filterAction && log.meta?.action_type !== filterAction) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        const matchUser = log.user_name?.toLowerCase().includes(q);
        const matchDesc = log.action?.toLowerCase().includes(q);
        if (!matchUser && !matchDesc) return false;
      }
      return true;
    });
  }, [permissionFiltered, filterFrom, filterTo, filterModule, filterAction, filterSearch]);

  const hasFilter = filterFrom || filterTo || filterModule || filterAction || filterSearch;

  return (
    <PageShell>
      {ToastUI}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-black text-text-main tracking-tight">Log Aktivitas</h1>
          <p className="text-[12px] text-text-med mt-0.5">Riwayat aktivitas pengguna di sistem</p>
        </div>
        <div className="text-[11px] text-text-light bg-border-main/40 px-3 py-1.5 rounded-lg tabular-nums">
          {filtered.length} dari {permissionFiltered.length} aktivitas
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="date"
          value={filterFrom}
          onChange={e => setFilterFrom(e.target.value)}
          className="input h-9 text-[12px]"
          title="Dari tanggal"
        />
        <input
          type="date"
          value={filterTo}
          onChange={e => setFilterTo(e.target.value)}
          className="input h-9 text-[12px]"
          title="Sampai tanggal"
        />
        <select
          value={filterModule}
          onChange={e => setFilterModule(e.target.value)}
          className="input h-9 text-[12px]"
        >
          <option value="">Semua Modul</option>
          {availableModules.map(m => (
            <option key={m} value={m}>
              {MODULE_LABELS[m as keyof typeof MODULE_LABELS] || m}
            </option>
          ))}
        </select>
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="input h-9 text-[12px]"
        >
          <option value="">Semua Aksi</option>
          {availableActions.map(a => (
            <option key={a} value={a}>
              {ACTION_LABELS[a as keyof typeof ACTION_LABELS] || a}
            </option>
          ))}
        </select>
        <input
          placeholder="Cari user atau keterangan..."
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          className="input h-9 text-[12px] flex-1 min-w-[180px]"
        />
        {hasFilter && (
          <button
            onClick={() => {
              setFilterFrom(''); setFilterTo('');
              setFilterModule(''); setFilterAction('');
              setFilterSearch('');
            }}
            className="btn-ghost h-9 px-3 text-[12px] flex items-center gap-1.5"
          >
            <Icon name="X" size={13} /> Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-container max-h-[calc(100vh-280px)]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest text-text-light opacity-70 whitespace-nowrap">Waktu</th>
              <th className="text-left py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest text-text-light opacity-70">User</th>
              <th className="text-left py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest text-text-light opacity-70">Modul</th>
              <th className="text-left py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest text-text-light opacity-70">Aksi</th>
              <th className="text-left py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest text-text-light opacity-70">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-main/20">
            {filtered.length === 0 ? (
              <EmptyState colSpan={5} msg="Tidak ada log aktivitas" icon="ClipboardList" />
            ) : filtered.map((log: any, i: number) => {
              const actionType  = log.meta?.action_type as string;
              const logModule   = log.meta?.module as string;
              const actionColor = ACTION_HEX[actionType as keyof typeof ACTION_HEX] || '#6B6862';
              const username    = log.user_name || '—';
              const emailShort  = (log.user_email || '').replace('@sjm.internal', '');

              return (
                <tr key={log.id || i} className="hover:bg-accent/5 transition-colors">
                  {/* Waktu */}
                  <td className="py-2.5 px-4 text-[11px] text-text-light font-mono whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </td>

                  {/* User */}
                  <td className="py-2.5 px-4">
                    <div className="text-[12px] text-text-main font-medium">{username}</div>
                    {emailShort && (
                      <div className="text-[10px] text-text-light">{emailShort}</div>
                    )}
                  </td>

                  {/* Modul */}
                  <td className="py-2.5 px-4">
                    {logModule ? (
                      <span
                        className="badge text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                        style={{ backgroundColor: '#EB5E2815', color: '#EB5E28' }}
                      >
                        {MODULE_LABELS[logModule as keyof typeof MODULE_LABELS] || logModule}
                      </span>
                    ) : <span className="text-text-light text-[11px]">—</span>}
                  </td>

                  {/* Aksi */}
                  <td className="py-2.5 px-4">
                    {actionType ? (
                      <span
                        className="badge text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                        style={{ backgroundColor: actionColor + '18', color: actionColor }}
                      >
                        {ACTION_LABELS[actionType as keyof typeof ACTION_LABELS] || actionType}
                      </span>
                    ) : <span className="text-text-light text-[11px]">—</span>}
                  </td>

                  {/* Keterangan */}
                  <td
                    className="py-2.5 px-4 text-[12px] text-text-med max-w-[320px] truncate"
                    title={log.action}
                  >
                    {log.action || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
};
