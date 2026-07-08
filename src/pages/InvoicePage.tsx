import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/src/api';
import { generateInvoiceNo } from '@/src/utils/invoiceGenerator';
import InvoicePreviewModal from '@/src/components/InvoicePreviewModal';
import type { InvoiceData } from '@/src/utils/generateInvoicePDF';
import { Card, SectionHeader, StatCard, useToast, Icon, PageShell,
  PageHeader, ActionBar, statusBadge, KPIGrid, EmptyState
} from '@/src/components/SJMComponents';
import { buildMeta } from '@/src/lib/activityLogger';

type TabType = 'daftar' | 'buat';

const fRp = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');

const fmtDate = (d: string) => {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const calcNilaiPajak = (s: any): number => {
  if (Number(s.nilai_pajak) > 0) return Number(s.nilai_pajak);
  const tgl = s.tgl_muat || s.tgl_order;
  if (!tgl) return 0;
  const isPajak = new Date(tgl) >= new Date('2026-02-01');
  const base = (Number(s.harga_pengiriman) || 0) + (Number(s.harga_asuransi) || Number(s.nilai_asuransi) || 0);
  return isPajak ? Math.round(base * 0.011) : 0;
};

function terbilang(n: number): string {
  const s = ['','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan','Sembilan','Sepuluh','Sebelas'];
  if (n < 12)   return s[Math.round(n)];
  if (n < 20)   return (terbilang(n - 10) + ' Belas').trim();
  if (n < 100)  return (terbilang(Math.floor(n / 10)) + ' Puluh ' + terbilang(n % 10)).trim();
  if (n < 200)  return ('Seratus ' + terbilang(n - 100)).trim();
  if (n < 1000) return (terbilang(Math.floor(n / 100)) + ' Ratus ' + terbilang(n % 100)).trim();
  if (n < 2000) return ('Seribu ' + terbilang(n - 1000)).trim();
  if (n < 1e6)  return (terbilang(Math.floor(n / 1000)) + ' Ribu ' + terbilang(n % 1000)).trim();
  if (n < 1e9)  return (terbilang(Math.floor(n / 1e6)) + ' Juta ' + terbilang(n % 1e6)).trim();
  return '';
}

const STATUS_COLOR: Record<string, string> = {
  'Belum Bayar': '#ef4444',
  'Parsial': '#f59e0b',
  'Lunas': '#22c55e',
  'Lebih Bayar': '#3b82f6',
  'Perlu Verifikasi': '#8b5cf6',
};

interface InvoicePageProps {
  so: any[];
  currentUser: any;
  logAction: (msg: string, meta?: any) => void;
  onSOClick?: (orderId: string) => void;
  onRefreshSO?: () => Promise<void>;
  invoices: any[];
  setInvoices: React.Dispatch<React.SetStateAction<any[]>>;
}

export const InvoicePage: React.FC<InvoicePageProps> = ({ so, currentUser, logAction, onSOClick, invoices, setInvoices, onRefreshSO }) => {
  const { showToast, ToastUI } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('daftar');

  // ── Buat Invoice state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterCustomer, setFilterCustomer] = useState('');
  const [tglInvoice, setTglInvoice] = useState(new Date().toISOString().split('T')[0]);
  const [manualInvoiceNo, setManualInvoiceNo] = useState('');
  const [loadingInvoiceNo, setLoadingInvoiceNo] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<InvoiceData | null>(null);
  const [pendingInvoiceNo, setPendingInvoiceNo] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [sortSOKey, setSortSOKey] = useState<'order_id' | 'tgl_muat'>('order_id');
  const [sortSODir, setSortSODir] = useState<'asc' | 'desc'>('desc');

  // ── Daftar Invoice state
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [paymentStatusMap, setPaymentStatusMap] = useState<Record<string, any>>({});
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [filterInvCustomer, setFilterInvCustomer] = useState('');
  const [filterInvStatus, setFilterInvStatus] = useState('all');
  const [activeKpi, setActiveKpi] = useState<string>('all');
  const [filterPeriodStart, setFilterPeriodStart] = useState('');
  const [filterPeriodEnd, setFilterPeriodEnd] = useState('');
  const [reprintData, setReprintData] = useState<InvoiceData | null>(null);
  const [reprintNo, setReprintNo] = useState('');
  const [showReprint, setShowReprint] = useState(false);
  const [selectedPaymentInv, setSelectedPaymentInv] = useState<any>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [editDokumen, setEditDokumen] = useState<string | null>(null);
  const [formDokumen, setFormDokumen] = useState({
    gdrive_url: '',
    ekspedisi: '',
    no_resi: '',
    tgl_kirim: '',
    status_dokumen: 'Belum Dikirim',
  });
  const [savingDokumen, setSavingDokumen] = useState(false);

  // ── Load all invoices
  const loadInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const list = await api.getInvoices();
      setInvoices(list);
      const noInvoices = list.map((inv: any) => inv.no_invoice).filter(Boolean);
      if (noInvoices.length > 0) {
        setLoadingStatus(true);
        try {
          const map = await api.getPaymentStatusBatch(noInvoices);
          setPaymentStatusMap(map);
          
          // Map latest statuses and payments from RPC to local state
          const updatedList = list.map((inv: any) => {
            const ps = map[inv.no_invoice];
            if (ps) {
              return {
                ...inv,
                status_bayar: ps.status,
                total_terbayar: Number(ps.total_paid || 0),
              };
            }
            return inv;
          });
          setInvoices(updatedList);

          // Find only rows where database is stale (status or paid amount differs)
          const updates = list
            .filter((inv: any) => {
              const ps = map[inv.no_invoice];
              return ps && (ps.status !== inv.status_bayar || Number(ps.total_paid || 0) !== Number(inv.total_terbayar || 0));
            })
            .map((inv: any) => ({
              id: inv.id,
              status_bayar: map[inv.no_invoice].status,
              total_terbayar: Number(map[inv.no_invoice].total_paid || 0),
            }));

          if (updates.length > 0) {
            api.updateInvoiceStatusBatch(updates).catch(() => {});
          }
        } catch { /* silent */ } finally {
          setLoadingStatus(false);
        }
      }
    } catch (err: any) {
      showToast('Gagal memuat invoice: ' + err.message, 'error');
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => { loadInvoices(); }, []);

  useEffect(() => {
    if (activeTab !== 'buat') return;
    const suggest = async () => {
      setLoadingInvoiceNo(true);
      try {
        const no = await generateInvoiceNo(new Date(tglInvoice));
        setManualInvoiceNo(no);
      } catch { } finally { setLoadingInvoiceNo(false); }
    };
    suggest();
  }, [activeTab, tglInvoice]);

  const handleOpenDetail = (inv: any) => {
    setSelectedPaymentInv(inv);
  };

  const getTrackingUrl = (ekspedisi: string, no_resi: string): string => {
    const e = (ekspedisi || '').toLowerCase().trim();
    const r = no_resi || '';
    if (e.includes('tiki'))     return `https://tiki.id/id/track/${r}`;
    if (e.includes('jne'))      return `https://www.jne.co.id/id/tracking/trace/${r}`;
    if (e.includes('sicepat'))  return `https://sicepat.com/checkAwb/${r}`;
    if (e.includes('anteraja')) return `https://anteraja.id/tracking/${r}`;
    if (e.includes('jnt') || e.includes('j&t')) return `https://www.jet.co.id/track/${r}`;
    if (e.includes('pos'))      return `https://www.posindonesia.co.id/id/tracking?noResi=${r}`;
    if (e.includes('wahana'))   return `https://www.wahana.com/tracking/${r}`;
    if (e.includes('ninja'))    return `https://www.ninjaxpress.co/id-id/tracking?id=${r}`;
    return `https://www.google.com/search?q=lacak+resi+${encodeURIComponent(ekspedisi)}+${r}`;
  };

  const handleSaveDokumen = async (invId: string) => {
    setSavingDokumen(true);
    try {
      await api.updateInvoiceDokumen(invId, formDokumen);
      const inv = invoices.find((i: any) => i.id === invId);
      logAction(`Update Dokumen Invoice: ${inv?.no_invoice || invId}`, buildMeta({
        module: 'invoice', action_type: 'UPDATE', record_id: inv?.no_invoice || invId,
        after_data: formDokumen,
      }));
      setSelectedPaymentInv((prev: any) => prev ? { ...prev, ...formDokumen } : prev);
      setInvoices(prev => prev.map((inv: any) =>
        inv.id === invId ? { ...inv, ...formDokumen } : inv
      ));
      setEditDokumen(null);
      showToast('Data dokumen berhasil disimpan', 'success');
    } catch (err: any) {
      showToast('Gagal simpan: ' + err.message, 'error');
    } finally {
      setSavingDokumen(false);
    }
  };

  // ── Buat Invoice: SO yang belum punya invoice
  const availableSO = useMemo(() => {
    return so.filter(s =>
      (s.invoice_count === 0 || !s.invoice_count) &&
      (!s.no_invoice || s.no_invoice === '')
    );
  }, [so]);

  const toggleSortSO = (key: 'order_id' | 'tgl_muat') => {
    if (sortSOKey === key) setSortSODir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortSOKey(key); setSortSODir('desc'); }
  };

  const filteredSO = useMemo(() => {
    const base = !filterCustomer ? availableSO
      : availableSO.filter(s => s.customer?.toLowerCase().includes(filterCustomer.toLowerCase()));
    return [...base].sort((a, b) => {
      const aVal = sortSOKey === 'tgl_muat' ? (a.tgl_muat || '') : (a.order_id || '');
      const bVal = sortSOKey === 'tgl_muat' ? (b.tgl_muat || '') : (b.order_id || '');
      const cmp = aVal.localeCompare(bVal);
      return sortSODir === 'asc' ? cmp : -cmp;
    });
  }, [availableSO, filterCustomer, sortSOKey, sortSODir]);

  const selectedSOList = useMemo(() => so.filter(s => selectedIds.has(s.id)), [so, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); return next; }
      next.add(id);
      return next;
    });
  };

  const validate = (): string | null => {
    if (selectedIds.size === 0) return 'Pilih minimal 1 Sales Order';
    if (new Set(selectedSOList.map(s => s.customer)).size > 1) return 'Semua SO harus dari customer yang sama';
    return null;
  };

  const handlePrepareInvoice = async () => {
    const err = validate();
    if (err) { showToast(err, 'error'); return; }
    setPreparing(true);
    try {
      const invoiceNo = manualInvoiceNo.trim();
      if (!invoiceNo) {
        showToast('No Invoice tidak boleh kosong', 'error');
        setPreparing(false);
        return;
      }
      const existing = invoices.find((inv: any) => inv.no_invoice === invoiceNo);
      if (existing) {
        showToast(`No Invoice ${invoiceNo} sudah digunakan`, 'error');
        setPreparing(false);
        return;
      }
      setPendingInvoiceNo(invoiceNo);
      const firstSO = selectedSOList[0];
      const invDateStr = fmtDate(tglInvoice);

      const items: InvoiceData['items'] = [...selectedSOList]
        .sort((a, b) => {
          const cmp = (a.tgl_muat || '').localeCompare(b.tgl_muat || '');
          return cmp !== 0 ? cmp : (a.order_id || '').localeCompare(b.order_id || '');
        })
        .map((s, i) => ({
          rowNo: i + 1, tglMuat: fmtDate(s.tgl_muat), tglTiba: fmtDate(s.tgl_bongkar),
          noSO: s.order_id, armada: s.jenis_truk || '-', noPol: s.no_polisi || '-',
          muatan: s.muatan || '-', sn: s.sn || '-',
          lokasiMuat: s.lokasi_muat || '-', lokasiTujuan: s.lokasi_bongkar || '-',
          hargaPengiriman: Number(s.harga_pengiriman) || 0,
          nilaiPajak: calcNilaiPajak(s),
          hargaAsuransi: Number(s.harga_asuransi) > 0 ? Number(s.harga_asuransi) : null,
          total: (Number(s.harga_pengiriman) || 0) + (Number(s.harga_asuransi) > 0 ? Number(s.harga_asuransi) : 0),
        }));
      const subTotal = items.reduce((acc, i) => acc + i.hargaPengiriman + (i.hargaAsuransi || 0), 0);
      const ppn = items.reduce((acc, i) => acc + (i.nilaiPajak || 0), 0);
      const total = subTotal + ppn;

      setPreviewData({
        invoiceNumber: invoiceNo, invoiceDate: invDateStr,
        customer: firstSO.customer,
        picCust: `${firstSO.pic_cust || ''} ${firstSO.no_pic || ''}`.trim(),
        items, subTotal, ppn, total, keterangan: '',
      });
      setShowPreview(true);
    } catch (err: any) {
      showToast('Gagal mempersiapkan invoice: ' + err.message, 'error');
    } finally {
      setPreparing(false);
    }
  };

  const handleConfirmInvoice = async () => {
    if (!previewData) return;
    const firstSO = selectedSOList[0];
    await api.addInvoice({
      no_invoice: pendingInvoiceNo,
      tgl_invoice: tglInvoice,
      customer: firstSO.customer,
      pic_cust: `${firstSO.pic_cust || ''} ${firstSO.no_pic || ''}`.trim(),
      so_ids: selectedSOList.map(s => s.id),
      so_order_ids: selectedSOList.map(s => s.order_id),
      total_sebelum_pajak: previewData.subTotal,
      ppn: previewData.ppn,
      total_setelah_pajak: previewData.total,
      tipe: 'normal',
      keterangan_invoice: '',
    });
    for (const s of selectedSOList) {
      await api.updateSOInvoiceCount(s.id, (s.invoice_count || 0) + 1);
    }
    await api.updateSOInvoiceNo(selectedSOList.map(s => s.id), pendingInvoiceNo);
    logAction(`Generate Invoice: ${pendingInvoiceNo}`, buildMeta({
      module: 'invoice' as any, action_type: 'CREATE', record_id: pendingInvoiceNo,
      after_data: { customer: firstSO.customer, total: previewData.total, so_count: selectedIds.size, tipe: 'normal' },
    }));
    setSelectedIds(new Set());
    await loadInvoices();
    await onRefreshSO?.();
    try {
      const newNo = await generateInvoiceNo(new Date(tglInvoice));
      setManualInvoiceNo(newNo);
    } catch { }
  };

  const handleDeleteInvoice = async (inv: any) => {
    setDeletingInvoiceId(inv.id);
    try {
      await api.deleteInvoice(inv.id, inv.so_ids || []);
      logAction(`Hapus Invoice: ${inv.no_invoice}`, buildMeta({
        module: 'invoice', action_type: 'DELETE', record_id: inv.no_invoice,
        before_data: { customer: inv.customer, total: inv.total_setelah_pajak },
      }));
      showToast(`Invoice ${inv.no_invoice} berhasil dihapus`, 'success');
      setConfirmDelete(null);
      await loadInvoices();
      await onRefreshSO?.();
    } catch (err: any) {
      showToast('Gagal hapus invoice: ' + err.message, 'error');
    } finally {
      setDeletingInvoiceId(null);
    }
  };

  const handleReprint = (invoice: any) => {
    const soOrderIds: string[] = invoice.so_order_ids || [];
    const totalPerItem = soOrderIds.length > 0 ? (invoice.total_setelah_pajak || 0) / soOrderIds.length : 0;
    const subPerItem = soOrderIds.length > 0 ? (invoice.total_sebelum_pajak || 0) / soOrderIds.length : 0;

    const sortedSoIds = [...soOrderIds].sort((aId, bId) => {
      const a = so.find(x => x.order_id === aId);
      const b = so.find(x => x.order_id === bId);
      const cmp = (a?.tgl_muat || '').localeCompare(b?.tgl_muat || '');
      return cmp !== 0 ? cmp : aId.localeCompare(bId);
    });

    let items: InvoiceData['items'] = sortedSoIds.map((soId, idx) => {
      const s = so.find(x => x.order_id === soId);
      if (!s) {
        return {
          rowNo: idx + 1, tglMuat: '-', tglTiba: '-',
          noSO: soId, armada: '-', noPol: '-', muatan: '-', sn: '-',
          lokasiMuat: '-', lokasiTujuan: '-',
          hargaPengiriman: invoice.tipe !== 'normal' ? (invoice.total_sebelum_pajak || 0) : subPerItem,
          nilaiPajak: 0, hargaAsuransi: null,
          total: invoice.tipe !== 'normal' ? (invoice.total_setelah_pajak || 0) : totalPerItem,
        };
      }
      return {
        rowNo: idx + 1,
        tglMuat: fmtDate(s.tgl_muat), tglTiba: fmtDate(s.tgl_bongkar),
        noSO: s.order_id, armada: s.jenis_truk || '-', noPol: s.no_polisi || '-',
        muatan: s.muatan || '-', sn: s.sn || '-',
        lokasiMuat: s.lokasi_muat || '-', lokasiTujuan: s.lokasi_bongkar || '-',
        hargaPengiriman: invoice.tipe !== 'normal'
          ? (invoice.total_sebelum_pajak || 0)
          : (Number(s.harga_pengiriman) || Number(s.total_harga) || subPerItem),
        nilaiPajak: calcNilaiPajak(s),
        hargaAsuransi: Number(s.harga_asuransi) > 0 ? Number(s.harga_asuransi) : null,
        total: invoice.tipe !== 'normal'
          ? (invoice.total_setelah_pajak || 0)
          : (Number(s.harga_pengiriman) || 0) + (Number(s.harga_asuransi) > 0 ? Number(s.harga_asuransi) : 0),
      };
    });
    setReprintData({
      invoiceNumber: invoice.no_invoice, invoiceDate: fmtDate(invoice.tgl_invoice),
      customer: invoice.customer, picCust: invoice.pic_cust || '-',
      items,
      subTotal: invoice.total_sebelum_pajak || 0,
      ppn: invoice.ppn || 0,
      total: invoice.total_setelah_pajak || 0,
      keterangan: invoice.keterangan_invoice || '',
    });
    setReprintNo(invoice.no_invoice);
    setShowReprint(true);
  };

  const getInvStatus = (inv: any) => {
    const ps = paymentStatusMap[inv.no_invoice];
    return ps?.status || inv.status_bayar || 'Belum Bayar';
  };
  const getInvTotalPaid = (inv: any) => {
    const ps = paymentStatusMap[inv.no_invoice];
    return ps?.total_paid ?? 0;
  };
  const getInvRemaining = (inv: any) => {
    const ps = paymentStatusMap[inv.no_invoice];
    return ps?.total_remaining ?? (inv.total_setelah_pajak || 0);
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchCustomer = !filterInvCustomer || inv.customer?.toLowerCase().includes(filterInvCustomer.toLowerCase());
      const matchStatus = filterInvStatus === 'all' || getInvStatus(inv) === filterInvStatus;
      const matchStart = !filterPeriodStart || inv.tgl_invoice >= filterPeriodStart;
      const matchEnd = !filterPeriodEnd || inv.tgl_invoice <= filterPeriodEnd;
      const matchKpi = activeKpi === 'all' || getInvStatus(inv) === activeKpi;
      return matchCustomer && matchStatus && matchStart && matchEnd && matchKpi;
    }).sort((a, b) => {
      const extractNum = (s: string) => { const m = (s || '').match(/^(\d+)\//); return m ? parseInt(m[1], 10) : 0; };
      return extractNum(b.no_invoice) - extractNum(a.no_invoice);
    });
  }, [invoices, paymentStatusMap, filterInvCustomer, filterInvStatus, filterPeriodStart, filterPeriodEnd, activeKpi]);

  const kpiData = useMemo(() => {
    const soBelumiInvoice = so.filter(s =>
      s.status_muatan === 'Completed' &&
      (s.invoice_count === 0 || !s.invoice_count) &&
      (!s.no_invoice || s.no_invoice === '')
    );
    const nilaiBelumiInvoice = soBelumiInvoice.reduce((sum, s) =>
      sum + (Number(s.total_harga_pajak) || Number(s.total_harga) || Number(s.harga_pengiriman) || 0), 0
    );
    return {
      total: invoices.length,
      lunas: invoices.filter(i => getInvStatus(i) === 'Lunas').length,
      belumBayar: invoices.filter(i => getInvStatus(i) === 'Belum Bayar').length,
      parsial: invoices.filter(i => getInvStatus(i) === 'Parsial').length,
      perluVerifikasi: invoices.filter(i => getInvStatus(i) === 'Perlu Verifikasi').length,
      outstanding: invoices
        .filter(i => getInvStatus(i) !== 'Lunas')
        .reduce((s, i) => {
          const ps = paymentStatusMap[i.no_invoice];
          const terbayar = Number(ps?.terbayar || 0);
          const total = Number(i.total_setelah_pajak || 0);
          return s + Math.max(0, total - terbayar);
        }, 0),
      soBelumiInvoice: soBelumiInvoice.length,
      nilaiBelumiInvoice,
    };
  }, [invoices, paymentStatusMap, so]);

  // ── RENDER
  return (
    <PageShell>
      {ToastUI}

      {/* ── HEADER ── */}
      <PageHeader
        title="Invoice"
        sub="Manajemen invoice PT Sugiarto Jaya Mandiri"
        action={
          <button
            onClick={() => { setActiveTab(activeTab === 'buat' ? 'daftar' : 'buat'); setSelectedIds(new Set()); }}
            className="btn-primary h-9 px-4 text-[12px] flex items-center gap-2"
          >
            <Icon name={activeTab === 'buat' ? 'List' : 'Plus'} size={14} />
            {activeTab === 'buat' ? 'Daftar Invoice' : 'Buat Invoice'}
          </button>
        }
      />

      {/* ══════════════════════════════════ */}
      {/* VIEW: DAFTAR INVOICE               */}
      {/* ══════════════════════════════════ */}
      {activeTab === 'daftar' && (
        <div className="space-y-4">

          {/* KPI Cards — Baris 1: Status pembayaran */}
          <KPIGrid cols={5} className="mb-3">
            {([
              { key: 'all',              label: 'Total Invoice',    value: String(kpiData.total),           icon: 'Database',    color: 'var(--color-text-main)' },
              { key: 'Lunas',            label: 'Lunas',            value: String(kpiData.lunas),           icon: 'CheckCircle', color: 'var(--color-success)'   },
              { key: 'Belum Bayar',      label: 'Belum Bayar',      value: String(kpiData.belumBayar),      icon: 'Clock',       color: 'var(--color-error)'     },
              { key: 'Parsial',          label: 'Parsial',          value: String(kpiData.parsial),         icon: 'PieChart',    color: 'var(--color-warning)'   },
              { key: 'Perlu Verifikasi', label: 'Perlu Verifikasi', value: String(kpiData.perluVerifikasi), icon: 'AlertCircle', color: 'var(--color-info)'      },
            ] as const).map(({ key, label, value, icon, color }) => {
              const isActive = activeKpi === key;
              return (
                <StatCard
                  key={key}
                  label={label}
                  value={value}
                  icon={icon}
                  color={color}
                  isActive={isActive}
                  onClick={() => {
                    setActiveKpi(prev => prev === key ? 'all' : key);
                    setFilterInvStatus('all');
                  }}
                />
              );
            })}
          </KPIGrid>

          {/* KPI Baris 2: Financial summary — flat layout */}
          <div className="flex items-stretch gap-6 px-1 mb-4">
            {/* Belum Lunas */}
            <div className="flex-1">
              <div className="text-[9px] font-bold text-text-light uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Icon name="TrendingUp" size={10} className="text-accent" />
                Belum Lunas
              </div>
              <div className="text-[18px] font-black tabular-nums" style={{ color: 'var(--color-accent)' }}>
                {fRp(kpiData.outstanding)}
              </div>
              <div className="text-[9px] text-text-light opacity-60 mt-0.5">Sisa tagihan belum lunas</div>
            </div>

            <div className="w-px bg-border-main/40 self-stretch" />

            {/* Belum Diinvoice */}
            <div className="flex-1 cursor-pointer group" onClick={() => setActiveTab('buat')}>
              <div className="text-[9px] font-bold text-text-light uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Icon name="AlertTriangle" size={10} style={{ color: '#0d9488' }} />
                Belum Diinvoice
              </div>
              <div className="text-[18px] font-black tabular-nums group-hover:underline" style={{ color: '#0d9488' }}>
                {kpiData.soBelumiInvoice} SO
              </div>
              <div className="text-[9px] mt-0.5" style={{ color: '#0d9488', opacity: 0.7 }}>
                {fRp(kpiData.nilaiBelumiInvoice)}
              </div>
            </div>

            <div className="w-px bg-border-main/40 self-stretch" />

            {/* Total Revenue */}
            <div className="flex-1">
              <div className="text-[9px] font-bold text-text-light uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Icon name="DollarSign" size={10} style={{ color: '#6366f1' }} />
                Total Revenue
              </div>
              <div className="text-[18px] font-black tabular-nums" style={{ color: '#6366f1' }}>
                {fRp(invoices.reduce((s: number, inv: any) => s + (inv.total_setelah_pajak || 0), 0))}
              </div>
              <div className="text-[9px] text-text-light opacity-60 mt-0.5">Seluruh invoice terbuat</div>
            </div>
          </div>

          {/* Filter Bar */}
          <ActionBar
            left={
              <div className="flex items-center gap-2 flex-wrap flex-1">
                <div className="relative min-w-[200px]">
                  <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light opacity-60" />
                  <input
                    placeholder="Cari customer..."
                    value={filterInvCustomer}
                    onChange={e => setFilterInvCustomer(e.target.value)}
                    className="input-field pl-9 h-9 text-[12px] w-full"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <input type="date" value={filterPeriodStart} onChange={e => setFilterPeriodStart(e.target.value)} className="input-field h-9 text-[12px] w-32 px-2 tabular-nums" />
                  <span className="text-text-light text-[11px]">—</span>
                  <input type="date" value={filterPeriodEnd} onChange={e => setFilterPeriodEnd(e.target.value)} className="input-field h-9 text-[12px] w-32 px-2 tabular-nums" />
                </div>
                <select value={filterInvStatus} onChange={e => setFilterInvStatus(e.target.value)} className="input-field h-9 text-[12px] w-36 px-2">
                  <option value="all">Semua Status</option>
                  <option value="Belum Bayar">Belum Bayar</option>
                  <option value="Parsial">Parsial</option>
                  <option value="Lunas">Lunas</option>
                  <option value="Lebih Bayar">Lebih Bayar</option>
                  <option value="Perlu Verifikasi">Perlu Verifikasi</option>
                </select>
              </div>
            }
            right={
              <div className="flex items-center gap-2">
                {loadingStatus && (
                  <span className="text-[11px] text-text-light italic flex items-center gap-1">
                    <Icon name="Loader2" size={11} className="animate-spin" /> Cek status...
                  </span>
                )}
                <span className="text-[11px] text-text-light">{filteredInvoices.length} invoice</span>
                {activeKpi !== 'all' && (
                  <button
                    onClick={() => setActiveKpi('all')}
                    className="flex items-center gap-1 h-9 px-3 bg-accent/10 text-accent rounded-lg text-[11px] font-bold hover:bg-accent/20 transition-colors"
                  >
                    <Icon name="X" size={11} /> Reset KPI
                  </button>
                )}
                <button onClick={loadInvoices} disabled={loadingInvoices}
                  className="btn-ghost h-9 px-3 text-[12px] flex items-center gap-1.5">
                  <Icon name="RefreshCw" size={13} className={loadingInvoices ? "animate-spin" : ""} /> Refresh
                </button>
              </div>
            }
          />

          {/* Tabel */}
          {loadingInvoices ? (
            <div className="text-center py-12 text-text-light text-[13px]">Memuat invoice...</div>
          ) : (
            <div className="table-container max-h-[calc(100vh-380px)]">
              <table className="w-full border-collapse table-fixed">
                <thead>
                  <tr>
                    <th className="w-[170px]">No Invoice</th>
                    <th className="w-[115px]">Tgl Invoice</th>
                    <th className="w-[190px]">Customer</th>
                    <th className="w-[180px]">Sales Order</th>
                    <th className="w-[90px] text-center">Tipe</th>
                    <th className="w-[130px] text-right">Total</th>
                    <th className="w-[125px] text-center">Status Bayar</th>
                    <th className="w-[80px] text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main/30">
                  {filteredInvoices.length === 0 ? (
                    <tr><td colSpan={8}><EmptyState colSpan={8} /></td></tr>
                  ) : filteredInvoices.map(inv => {
                    const sc = STATUS_COLOR[getInvStatus(inv)] || '#666';
                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-amber-50/30 cursor-pointer transition-colors group"
                        onClick={() => handleOpenDetail(inv)}
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-black text-accent italic text-[11px] uppercase tracking-tight">{inv.no_invoice}</div>
                          {inv.keterangan_invoice && (
                            <div className="text-[9px] text-text-light opacity-60 italic">{inv.keterangan_invoice}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-text-med whitespace-nowrap">{fmtDate(inv.tgl_invoice)}</td>
                        <td className="py-3 px-4 max-w-[180px]">
                          <div className="text-[12px] font-bold text-text-main truncate" title={inv.customer}>{inv.customer}</div>
                        </td>
                        <td className="py-3 px-4 max-w-[200px]">
                          <div className="flex gap-1 flex-wrap">
                            {(inv.so_order_ids || []).slice(0, 2).map((soId: string) => (
                              <button
                                key={soId}
                                onClick={e => { e.stopPropagation(); onSOClick && onSOClick(soId); }}
                                className="px-1.5 py-0.5 bg-accent/5 border border-accent/20 rounded-full text-[9px] font-bold text-accent whitespace-nowrap hover:bg-accent/20 transition-colors"
                              >
                                {soId}
                              </button>
                            ))}
                            {(inv.so_order_ids || []).length > 2 && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-text-light rounded-full text-[9px] font-bold" title={(inv.so_order_ids || []).join(', ')}>+{(inv.so_order_ids || []).length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            inv.tipe === 'dp' 
                              ? 'bg-blue-100 text-blue-800' 
                              : inv.tipe === 'pelunasan' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-slate-100 text-slate-700'
                          }`} title={inv.tipe || 'normal'}>
                            {inv.tipe || 'normal'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-[12px] font-bold text-text-main">
                          {fRp(inv.total_setelah_pajak || 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="badge text-[8px]" style={{ backgroundColor: sc + '20', color: sc }}>
                            {getInvStatus(inv)}
                          </span>
                        </td>
                        <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-text-med transition-colors"
                              onClick={e => { e.stopPropagation(); handleReprint(inv); }}
                              title="Download PDF"
                            >
                              <Icon name="Download" size={13} />
                            </button>
                            <button
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                              onClick={e => { e.stopPropagation(); setConfirmDelete(inv); }}
                              title="Hapus Invoice"
                            >
                              <Icon name="Trash2" size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-border-main">
                    <td colSpan={4} className="py-3 px-4 text-right text-[9px] italic opacity-50 uppercase tracking-widest">Total Terfilter</td>
                    <td className="py-3 px-4 text-right text-[12px] font-black text-accent tabular-nums">
                      {fRp(filteredInvoices.reduce((s, inv) => s + (inv.total_setelah_pajak || 0), 0))}
                    </td>
                    <td colSpan={2} className="py-3 px-4 text-center text-[11px] font-bold text-text-med">{filteredInvoices.length} records</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════ */}
      {/* VIEW: BUAT INVOICE                 */}
      {/* ══════════════════════════════════ */}
      {activeTab === 'buat' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)' }}>

          {/* Sticky top panel */}
          <div className="sticky top-0 z-10 bg-white border-b border-border-main pb-3">

            {/* No Invoice + Tgl Invoice */}
            <div className="flex items-center gap-2 py-2 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-text-light opacity-60 uppercase tracking-widest whitespace-nowrap">No Invoice</label>
                <div className="relative">
                  <input
                    value={manualInvoiceNo}
                    onChange={e => setManualInvoiceNo(e.target.value)}
                    placeholder={loadingInvoiceNo ? 'Memuat...' : 'xxxx/INV-SJM/MM/YYYY'}
                    className="input-field h-8 text-[11px] w-52 font-mono"
                    disabled={loadingInvoiceNo}
                  />
                  {loadingInvoiceNo && (
                    <span className="absolute right-2 top-1.5 text-[10px] text-text-light">...</span>
                  )}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <label className="text-[10px] font-bold text-text-light opacity-60 uppercase tracking-widest whitespace-nowrap">Tgl Invoice</label>
                <input type="date" value={tglInvoice} onChange={e => setTglInvoice(e.target.value)}
                  className="input-field h-8 w-40 text-[11px] font-bold" />
              </div>
            </div>

            {/* Description */}
            <div className="text-[11px] text-text-med bg-blue-50 rounded-lg px-3 py-2 mb-2">
              SO yang belum punya invoice. Bisa pilih lebih dari 1 SO dari customer yang sama.
            </div>

            {/* Customer filter + count + Preview button */}
            <div className="flex items-center gap-3 flex-wrap">
              <input type="text" placeholder="🔍 Cari customer..." value={filterCustomer}
                onChange={e => setFilterCustomer(e.target.value)}
                className="input-field h-9 max-w-xs text-[11px] font-bold" />
              <span className="text-[11px] text-text-light italic">{filteredSO.length} SO tersedia</span>
              <div className="flex-1" />
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-4 px-4 py-2 bg-accent/5 border border-accent/20 rounded-xl">
                  <div>
                    <div className="text-[11px] text-text-med">{selectedIds.size} SO dipilih · {selectedSOList[0]?.customer}</div>
                    <div className="font-black text-[15px] text-accent">
                      {fRp(selectedSOList.reduce((s, x) => s + (x.total_harga_pajak || 0), 0))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedIds(new Set());
                        setFilterCustomer('');
                      }}
                      className="btn-ghost h-9 px-4 text-[12px] flex items-center gap-2"
                      disabled={preparing}
                    >
                      <Icon name="X" size={14} /> Batal
                    </button>
                    <button onClick={handlePrepareInvoice} disabled={preparing || selectedIds.size === 0}
                      className="btn-primary h-9 px-4 text-[12px] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                      {preparing ? '⏳ Mempersiapkan...' : '👁 Preview Invoice'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scrollable SO table */}
          <div className="table-container mt-2" style={{ flex: 1, overflowY: 'auto', maxHeight: 'none' }}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-border-main">
                  <th className="w-10 text-center py-3 px-4 text-[10px] font-black text-text-med uppercase tracking-widest">☐</th>
                  <th
                    className="py-3 px-4 text-left text-[10px] font-black text-text-med uppercase tracking-widest cursor-pointer select-none hover:bg-slate-100 transition-colors"
                    onClick={() => toggleSortSO('order_id')}
                  >
                    <span className="flex items-center gap-1">
                      No SO
                      {sortSOKey !== 'order_id' && <Icon name="ArrowUpDown" size={10} className="opacity-30" />}
                      {sortSOKey === 'order_id' && sortSODir === 'asc' && <Icon name="ArrowUp" size={10} className="text-accent" />}
                      {sortSOKey === 'order_id' && sortSODir === 'desc' && <Icon name="ArrowDown" size={10} className="text-accent" />}
                    </span>
                  </th>
                  <th className="py-3 px-4 text-left text-[10px] font-black text-text-med uppercase tracking-widest">Customer</th>
                  <th className="py-3 px-4 text-left text-[10px] font-black text-text-med uppercase tracking-widest">Rute</th>
                  <th
                    className="py-3 px-4 text-left text-[10px] font-black text-text-med uppercase tracking-widest cursor-pointer select-none hover:bg-slate-100 transition-colors"
                    onClick={() => toggleSortSO('tgl_muat')}
                  >
                    <span className="flex items-center gap-1">
                      Tgl Muat
                      {sortSOKey !== 'tgl_muat' && <Icon name="ArrowUpDown" size={10} className="opacity-30" />}
                      {sortSOKey === 'tgl_muat' && sortSODir === 'asc' && <Icon name="ArrowUp" size={10} className="text-accent" />}
                      {sortSOKey === 'tgl_muat' && sortSODir === 'desc' && <Icon name="ArrowDown" size={10} className="text-accent" />}
                    </span>
                  </th>
                  <th className="py-3 px-4 text-left text-[10px] font-black text-text-med uppercase tracking-widest">Status</th>
                  <th className="py-3 px-4 text-right text-[10px] font-black text-text-med uppercase tracking-widest">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main/20">
                {filteredSO.length === 0 ? (
                  <EmptyState colSpan={7} />
                ) : filteredSO.map(s => {
                  const isSel = selectedIds.has(s.id);
                  return (
                    <tr key={s.id} onClick={() => toggleSelect(s.id)}
                      className={`cursor-pointer transition-colors group ${isSel ? 'bg-accent/5' : 'hover:bg-slate-50'}`}>
                      <td className="text-center">
                        <input type="checkbox" checked={isSel} readOnly
                          className="w-3.5 h-3.5 rounded border-border-main text-accent focus:ring-accent" />
                      </td>
                      <td>
                        <span className="text-[11px] font-black text-accent uppercase tracking-tight">{s.order_id}</span>
                      </td>
                      <td>
                        <div className="text-[12px] font-bold text-text-main group-hover:text-blue-brand transition-colors">{s.customer}</div>
                      </td>
                      <td className="max-w-[200px]">
                        <div className="text-[12px] font-bold text-text-main truncate">{s.lokasi_muat}</div>
                        <div className="text-[10px] font-medium text-text-light opacity-70 italic truncate">to {s.lokasi_bongkar}</div>
                      </td>
                      <td className="tabular-nums text-[11px] font-bold text-text-med italic">{s.tgl_muat}</td>
                      <td>{statusBadge(s.status_muatan)}</td>
                      <td className="text-right font-black text-[12px] tabular-nums">{fRp(s.total_harga_pajak || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {filteredSO.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 text-text-main font-black border-t-2 border-border-main">
                    <td colSpan={6} className="py-3 px-4 text-right italic text-[9px] opacity-60 uppercase tracking-widest">Total SO Terfilter</td>
                    <td className="py-3 px-4 text-right text-[12px] font-black text-accent">{filteredSO.length} Records</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════ */}
      {/* MODAL KONFIRMASI DELETE INVOICE    */}
      {/* ══════════════════════════════════ */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <Icon name="Trash2" size={18} className="text-red-500" />
              </div>
              <div>
                <div className="font-black text-text-main text-[14px]">Hapus Invoice</div>
                <div className="text-[11px] text-text-med mt-0.5">Tindakan ini tidak bisa dibatalkan</div>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 mb-5">
              <div className="text-[11px] font-bold text-accent">{confirmDelete.no_invoice}</div>
              <div className="text-[11px] text-text-med mt-0.5">{confirmDelete.customer}</div>
              <div className="text-[12px] font-black text-text-main mt-1">{fRp(confirmDelete.total_setelah_pajak || 0)}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 btn-ghost h-9 text-[12px]"
                disabled={deletingInvoiceId === confirmDelete.id}
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteInvoice(confirmDelete)}
                className="flex-1 h-9 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[12px] font-bold transition-colors disabled:opacity-50"
                disabled={deletingInvoiceId === confirmDelete.id}
              >
                {deletingInvoiceId === confirmDelete.id ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════ */}
      {/* MODAL DETAIL INVOICE               */}
      {/* ══════════════════════════════════ */}
      {selectedPaymentInv && (() => {
        const inv = selectedPaymentInv;
        const ps = paymentStatusMap[inv.no_invoice] || inv.paymentStatus;
        const sc = STATUS_COLOR[ps?.status || getInvStatus(inv)] || '#666';
        const soOrderIds: string[] = inv.so_order_ids || [];
        const soDetails = soOrderIds.map((soId: string) => so.find(x => x.order_id === soId) || { order_id: soId, _notFound: true });
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedPaymentInv(null)}>
            <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col mx-4 overflow-hidden animate-fade-up" onClick={e => e.stopPropagation()}>

              {/* Header Modal */}
              <div className="flex items-start justify-between p-5 border-b border-border-main bg-white">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[15px] font-black text-accent uppercase tracking-tight">{inv.no_invoice}</span>
                    <span className={`badge text-[8px] ${inv.tipe === 'dp' ? 'bg-amber-100 text-amber-700' : inv.tipe === 'pelunasan' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{inv.tipe}</span>
                    <span className="badge text-[8px]" style={{ backgroundColor: sc + '20', color: sc }}>{ps?.status || inv.status_bayar || 'Belum Bayar'}</span>
                  </div>
                  <div className="text-[11px] text-text-med mt-1">{inv.customer} · {fmtDate(inv.tgl_invoice)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-ghost h-8 px-3 text-[11px] flex items-center gap-1.5" onClick={() => { setSelectedPaymentInv(null); handleReprint(inv); }}>
                    <Icon name="Download" size={13} /> Download PDF
                  </button>
                  <button className="p-2 rounded-full hover:bg-slate-100 transition-colors" onClick={() => setSelectedPaymentInv(null)}>
                    <Icon name="X" size={18} className="text-text-med" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
                {/* Left Column: Real Invoice Preview Paper */}
                <div className="lg:col-span-7 overflow-y-auto p-6 bg-slate-100 border-r border-border-main/40 no-scrollbar">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-border-main/30 text-left" style={{ fontFamily: 'helvetica, Arial, sans-serif', fontSize: '9pt', color: '#000' }}>
                    {/* Header SJM */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-3 items-start">
                        <div className="w-14 h-14 rounded bg-[#f9ac3d] flex items-center justify-center text-white font-bold text-[18px] flex-shrink-0">SJM</div>
                        <div>
                          <div className="text-[#f9ac3d] font-bold text-[15px] leading-tight">SUGIARTO JAYA MANDIRI TRANSPORT</div>
                          <div className="text-[#505050] text-[10px] mt-1 leading-relaxed">
                            Jl Raya Kemang Parung No.168A Kab.Bogor<br />
                            Phone : 0811751027<br />
                            Email : sugiartojayamandiri@gmail.com
                          </div>
                        </div>
                      </div>
                      <div className="bg-[#f9ac3d] px-5 py-1.5 rounded text-white font-bold text-[18px]">INVOICE</div>
                    </div>

                    <div className="border-t-[1.5px] border-black mb-0.5" />
                    <div className="border-t-[2px] border-[#f9ac3d] w-40 ml-auto mb-3" />

                    {/* Metadata Table */}
                    <table className="mb-4 text-[11px] text-left border-collapse">
                      <tbody>
                        {[
                          ['No Invoice', inv.no_invoice, true],
                          ['Tgl Invoice', fmtDate(inv.tgl_invoice), false],
                          ['Penyewa', inv.customer, false],
                          ['Telepon', inv.pic_cust || '-', false],
                        ].map(([lbl, val, bold]) => (
                          <tr key={lbl as string}>
                            <td className="pr-2 pb-1 text-[#505050] whitespace-nowrap">{lbl}</td>
                            <td className="pr-2 pb-1 text-[#505050]">:</td>
                            <td className={`pb-1 ${bold ? 'font-bold text-black' : 'text-black'}`}>{val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Table of items */}
                    <table className="w-full border-collapse text-[10px] border border-black mb-4">
                      <thead>
                        <tr className="bg-[#f9ac3d] text-black">
                          {['No.', 'Tanggal', 'No SO / Armada', 'Deskripsi', 'Biaya Pengiriman', 'Biaya Asuransi', 'Jumlah'].map(h => (
                            <th key={h} className="border border-black p-1 text-center font-bold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const previewItems = soDetails.map((s: any, idx: number) => {
                            const subPrice = Number(s.harga_pengiriman) || Number(s.total_harga) || (inv.total_sebelum_pajak || 0) / (soOrderIds.length || 1);
                            const insurance = Number(s.harga_asuransi) > 0 ? Number(s.harga_asuransi) : 0;
                            const rowTotal = subPrice + insurance;
                            return {
                              no: idx + 1,
                              tgl: fmtDate(s.tgl_muat) + (s.tgl_bongkar ? `\n—\n${fmtDate(s.tgl_bongkar)}` : ''),
                              so_armada: s.order_id + '\n' + (s.jenis_truk || '-') + '\n' + (s.no_polisi ? `(${s.no_polisi})` : ''),
                              desc: `Muatan: ${s.muatan || '-'}${s.sn ? `\nSN: ${s.sn}` : ''}\nLokasi Muat: ${s.lokasi_muat || '-'}\nLokasi Tujuan: ${s.lokasi_bongkar || '-'}`,
                              shipCost: subPrice,
                              insCost: insurance,
                              total: rowTotal,
                            };
                          });

                          return previewItems.map((item, i) => (
                            <tr key={i} className="align-top border-b border-black">
                              <td className="border border-black p-1.5 text-center">{item.no}</td>
                              <td className="border border-black p-1.5 text-center whitespace-pre-line">{item.tgl}</td>
                              <td className="border border-black p-1.5 font-bold whitespace-pre-line text-[#000]">{item.so_armada}</td>
                              <td className="border border-black p-1.5 whitespace-pre-line text-[#333]">{item.desc}</td>
                              <td className="border border-black p-1.5 text-right whitespace-nowrap">{fRp(item.shipCost)}</td>
                              <td className="border border-black p-1.5 text-center text-[9px] whitespace-pre-line">
                                {item.insCost > 0 ? fRp(item.insCost) : 'Tidak termasuk\nasuransi'}
                              </td>
                              <td className="border border-black p-1.5 text-right whitespace-nowrap font-bold">{fRp(item.total)}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                      <tfoot>
                        <tr className="bg-white">
                          <td colSpan={5} rowSpan={3} className="border border-black p-2 text-left align-top max-w-[200px] text-[10px]">
                            {inv.keterangan_invoice ? <><strong>Catatan:</strong><br />{inv.keterangan_invoice}</> : <strong>Catatan:</strong>}
                          </td>
                          <td className="border border-black p-1.5 text-right font-bold whitespace-nowrap">Sub Total</td>
                          <td className="border border-black p-1.5 text-right font-bold whitespace-nowrap">{fRp(inv.total_sebelum_pajak || 0)}</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="border border-black p-1.5 text-right whitespace-nowrap">PPN (1,1%)</td>
                          <td className="border border-black p-1.5 text-right whitespace-nowrap">{fRp(inv.ppn || 0)}</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="border border-black p-1.5 text-right font-bold whitespace-nowrap">Total</td>
                          <td className="border border-black p-1.5 text-right font-bold whitespace-nowrap font-black">{fRp(inv.total_setelah_pajak || 0)}</td>
                        </tr>
                        <tr className="bg-[#fafafa]">
                          <td colSpan={7} className="border border-black p-1.5 font-bold text-left">
                            Terbilang: {terbilang(inv.total_setelah_pajak || 0)} Rupiah
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    <div className="flex justify-between items-end mt-5">
                      <div className="flex gap-2 items-start text-left">
                        <div className="w-1 h-10 bg-[#f9ac3d] rounded" />
                        <div>
                          <div className="font-bold text-[11px]">Pembayaran:</div>
                          <div className="text-[10px] text-[#333] mt-1">
                            Mandiri 1330026272567 — a/n PT Sugiarto Jaya Mandiri
                          </div>
                        </div>
                      </div>
                      <div className="text-center w-40">
                        <div className="text-[10px] mb-8">Hormat Kami,</div>
                        <div className="border-t border-black pt-1 text-[10px] font-bold">
                          (Muhammad Naufal Sugiarto)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Other Info & Operations */}
                <div className="lg:col-span-5 overflow-y-auto p-5 bg-white flex flex-col gap-6 no-scrollbar text-left border-l border-border-main/30">
                  {/* Summary Pembayaran */}
                  <div>
                    <div className="text-[10px] font-black text-text-light uppercase tracking-widest opacity-60 mb-2">Summary Pembayaran</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Total Invoice', value: fRp(ps?.total_invoiced || inv.total_setelah_pajak || 0), color: 'text-text-main font-black' },
                        { label: 'Terbayar', value: fRp(ps?.total_paid || 0), color: 'text-green-600 font-black' },
                        { label: 'Sisa Tagihan', value: fRp(ps?.total_remaining ?? inv.total_setelah_pajak ?? 0), color: 'text-red-500 font-black' },
                        { label: 'DPP (Sub Total)', value: fRp(inv.total_sebelum_pajak || 0), color: 'text-text-med font-black' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="p-3 rounded-xl border border-border-main/50 bg-slate-50/50">
                          <div className="text-[8px] font-bold text-text-light uppercase tracking-widest mb-1">{label}</div>
                          <div className={`text-[12px] tabular-nums ${color}`}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detail SO Link List */}
                  <div>
                    <div className="text-[10px] font-black text-text-light uppercase tracking-widest opacity-60 mb-2">
                      Detail Sales Order ({soOrderIds.length} SO)
                    </div>
                    <div className="table-container max-h-[none]">
                      <table className="w-full border-collapse text-[10px]">
                        <thead>
                          <tr>
                            <th>No SO</th>
                            <th>Rute</th>
                            <th className="text-right">Biaya</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-main/20">
                          {soDetails.length === 0 ? (
                            <tr><td colSpan={3} className="py-2 text-center text-text-light italic text-[10px]">Tidak ada data SO</td></tr>
                          ) : soDetails.map((s: any) => (
                            <tr key={s.order_id} className="hover:bg-slate-50 transition-colors">
                              <td>
                                <button
                                  className="font-black text-accent uppercase tracking-tight hover:underline"
                                  onClick={() => { setSelectedPaymentInv(null); onSOClick && onSOClick(s.order_id); }}
                                >
                                  {s.order_id}
                                </button>
                              </td>
                              {s._notFound ? (
                                <td colSpan={2} className="text-text-light italic opacity-50 text-[10px]">Data tidak tersedia</td>
                              ) : (
                                <>
                                  <td>
                                    <div className="font-bold text-text-main truncate max-w-[120px]" title={s.lokasi_muat}>{s.lokasi_muat || '-'}</div>
                                    <div className="text-[10px] text-text-light italic truncate" title={s.lokasi_bongkar}>→ {s.lokasi_bongkar || '-'}</div>
                                  </td>
                                  <td className="text-right font-black tabular-nums">{fRp(s.total_harga_pajak || s.total_harga || 0)}</td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                {/* Riwayat Pembayaran */}
                {(() => {
                  const jurnalList = ps?.jurnal_detail || [];
                  return (
                    <div className="border-t border-border-main/30 pt-4 mt-4">
                      <div className="text-[10px] font-black text-text-light uppercase tracking-widest opacity-60 mb-3">
                        Riwayat Pembayaran dari Jurnal
                      </div>
                      {jurnalList.length === 0 ? (
                        <div className="text-[11px] text-text-light italic opacity-50 py-2">
                          Belum ada pembayaran tercatat di jurnal
                        </div>
                      ) : (
                        <table className="w-full border-collapse text-[11px]">
                          <thead>
                            <tr>
                              <th className="text-left py-2 px-3 bg-slate-50 border border-border-main/30 text-[10px] font-bold text-text-light uppercase tracking-widest">No Jurnal</th>
                              <th className="text-left py-2 px-3 bg-slate-50 border border-border-main/30 text-[10px] font-bold text-text-light uppercase tracking-widest">Tanggal</th>
                              <th className="text-left py-2 px-3 bg-slate-50 border border-border-main/30 text-[10px] font-bold text-text-light uppercase tracking-widest">Keterangan</th>
                              <th className="text-right py-2 px-3 bg-slate-50 border border-border-main/30 text-[10px] font-bold text-text-light uppercase tracking-widest">Jumlah</th>
                            </tr>
                          </thead>
                          <tbody>
                            {jurnalList.map((jr: any, idx: number) => (
                              <tr key={idx} className="border-b border-border-main/20 hover:bg-slate-50">
                                <td className="py-2 px-3 font-bold text-accent">{jr.no_jurnal}</td>
                                <td className="py-2 px-3 text-text-med">{fmtDate(jr.tanggal)}</td>
                                <td className="py-2 px-3 text-text-med">{jr.keterangan}</td>
                                <td className="py-2 px-3 text-right font-bold text-green-600 tabular-nums">{fRp(jr.kredit)}</td>
                              </tr>
                            ))}
                            {jurnalList.length > 1 && (
                              <tr className="bg-green-50">
                                <td colSpan={3} className="py-2 px-3 text-right font-black text-[11px] text-green-700">Total Terbayar</td>
                                <td className="py-2 px-3 text-right font-black text-green-700 tabular-nums">
                                  {fRp(jurnalList.reduce((s: number, jr: any) => s + Number(jr.kredit), 0))}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })()}

                {/* Dokumen Fisik */}
                <div className="px-4 pb-4 border-t border-border-main/30 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-black text-text-light uppercase tracking-widest opacity-60">
                      Dokumen Fisik &amp; Pengiriman
                    </div>
                    {editDokumen !== inv.id ? (
                      <button
                        onClick={() => {
                          setEditDokumen(inv.id);
                          setFormDokumen({
                            gdrive_url: inv.gdrive_url || '',
                            ekspedisi: inv.ekspedisi || '',
                            no_resi: inv.no_resi || '',
                            tgl_kirim: inv.tgl_kirim || '',
                            status_dokumen: inv.status_dokumen || 'Belum Dikirim',
                          });
                        }}
                        className="btn-ghost h-7 px-3 text-[10px] flex items-center gap-1"
                      >
                        <Icon name="Edit3" size={11} /> Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => setEditDokumen(null)} className="btn-ghost h-7 px-3 text-[10px]">Batal</button>
                        <button
                          onClick={() => handleSaveDokumen(inv.id)}
                          disabled={savingDokumen}
                          className="btn-primary h-7 px-3 text-[10px] flex items-center gap-1"
                        >
                          <Icon name="Save" size={11} /> {savingDokumen ? 'Menyimpan...' : 'Simpan'}
                        </button>
                      </div>
                    )}
                  </div>

                  {editDokumen !== inv.id ? (
                    // VIEW MODE
                    <div className="space-y-3">
                      {/* Status */}
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-text-light w-24">Status</span>
                        <span className={`badge text-[8px] ${
                          inv.status_dokumen === 'Diterima Customer' ? 'badge-success' :
                          inv.status_dokumen === 'Terkirim' ? 'badge-info' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {inv.status_dokumen || 'Belum Dikirim'}
                        </span>
                        {inv.status_dokumen === 'Terkirim' && (
                          <button
                            onClick={async () => {
                              await api.updateInvoiceDokumen(inv.id, { status_dokumen: 'Diterima Customer' });
                              logAction(`Invoice Diterima Customer: ${inv.no_invoice}`, buildMeta({
                                module: 'invoice', action_type: 'UPDATE', record_id: inv.no_invoice,
                                after_data: { status_dokumen: 'Diterima Customer' },
                              }));
                              setSelectedPaymentInv((prev: any) => prev ? { ...prev, status_dokumen: 'Diterima Customer' } : prev);
                              setInvoices(prev => prev.map((i: any) => i.id === inv.id ? { ...i, status_dokumen: 'Diterima Customer' } : i));
                              showToast('Status diupdate', 'success');
                            }}
                            className="btn-ghost h-6 px-2 text-[9px] flex items-center gap-1 text-success"
                          >
                            <Icon name="CheckCircle" size={10} /> Tandai Diterima
                          </button>
                        )}
                      </div>

                      {/* Google Drive */}
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-text-light w-24">Scan Invoice</span>
                        {inv.gdrive_url ? (
                          <a
                            href={inv.gdrive_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[11px] font-bold text-accent hover:underline"
                          >
                            <Icon name="FileText" size={12} /> Buka Drive
                            <Icon name="ExternalLink" size={10} />
                          </a>
                        ) : (
                          <span className="text-[10px] text-text-light italic opacity-50">Belum ada file</span>
                        )}
                      </div>

                      {/* Ekspedisi & Resi */}
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-text-light w-24">Pengiriman</span>
                        {inv.no_resi ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-text-main">{inv.ekspedisi}</span>
                            <span className="text-[10px] text-text-light">·</span>
                            <span className="text-[11px] font-mono text-text-main">{inv.no_resi}</span>
                            {inv.tgl_kirim && (
                              <>
                                <span className="text-[10px] text-text-light">·</span>
                                <span className="text-[10px] text-text-light italic">{fmtDate(inv.tgl_kirim)}</span>
                              </>
                            )}
                            <a
                              href={getTrackingUrl(inv.ekspedisi, inv.no_resi)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 h-6 px-2 bg-accent/10 text-accent rounded-lg text-[9px] font-bold hover:bg-accent/20 transition-colors"
                            >
                              <Icon name="MapPin" size={10} /> Lacak Paket
                            </a>
                          </div>
                        ) : (
                          <span className="text-[10px] text-text-light italic opacity-50">Belum ada resi</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    // EDIT MODE
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1 block">Status Dokumen</label>
                        <select
                          value={formDokumen.status_dokumen}
                          onChange={e => setFormDokumen(f => ({ ...f, status_dokumen: e.target.value }))}
                          className="input w-full text-[12px]"
                        >
                          <option value="Belum Dikirim">Belum Dikirim</option>
                          <option value="Terkirim">Terkirim</option>
                          <option value="Diterima Customer">Diterima Customer</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1 block">Link Google Drive (Scan Invoice)</label>
                        <input
                          value={formDokumen.gdrive_url}
                          onChange={e => setFormDokumen(f => ({ ...f, gdrive_url: e.target.value }))}
                          placeholder="https://drive.google.com/file/d/..."
                          className="input w-full text-[12px]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1 block">Ekspedisi</label>
                          <input
                            value={formDokumen.ekspedisi}
                            onChange={e => setFormDokumen(f => ({ ...f, ekspedisi: e.target.value }))}
                            placeholder="Tiki, JNE, SiCepat, dll"
                            className="input w-full text-[12px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1 block">No Resi</label>
                          <input
                            value={formDokumen.no_resi}
                            onChange={e => setFormDokumen(f => ({ ...f, no_resi: e.target.value }))}
                            placeholder="Nomor resi pengiriman"
                            className="input w-full text-[12px] font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1 block">Tanggal Kirim</label>
                        <input
                          type="date"
                          value={formDokumen.tgl_kirim}
                          onChange={e => setFormDokumen(f => ({ ...f, tgl_kirim: e.target.value }))}
                          className="input w-full text-[12px]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* New Invoice Preview */}
      {showPreview && previewData && (
        <InvoicePreviewModal
          data={previewData}
          invoiceNumber={pendingInvoiceNo}
          onClose={() => { setShowPreview(false); setPreviewData(null); }}
          onConfirm={handleConfirmInvoice}
        />
      )}

      {/* Reprint */}
      {showReprint && reprintData && (
        <InvoicePreviewModal
          data={reprintData}
          invoiceNumber={reprintNo}
          onClose={() => { setShowReprint(false); setReprintData(null); }}
          onConfirm={async () => { setShowReprint(false); setReprintData(null); showToast('Invoice berhasil diunduh ulang!', 'success'); }}
        />
      )}

    </PageShell>
  );
};

export default InvoicePage;
