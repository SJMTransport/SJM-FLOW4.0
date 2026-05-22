import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/src/api';
import { generateInvoiceNo } from '@/src/utils/invoiceGenerator';
import InvoicePreviewModal from '@/src/components/InvoicePreviewModal';
import type { InvoiceData } from '@/src/utils/generateInvoicePDF';
import { Card, SectionHeader, StatCard, useToast, Icon, PageShell, statusBadge, KPIGrid, EmptyState } from '@/src/components/SJMComponents';
import { buildMeta } from '@/src/lib/activityLogger';

type InvoiceTipe = 'normal' | 'dp' | 'pelunasan';
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
  return isPajak ? Math.round(Number(s.harga_pengiriman) * 0.011) : 0;
};

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
}

export const InvoicePage: React.FC<InvoicePageProps> = ({ so, currentUser, logAction }) => {
  const { showToast, ToastUI } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('daftar');

  // ── Buat Invoice state
  const [invoiceTipe, setInvoiceTipe] = useState<InvoiceTipe>('normal');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterCustomer, setFilterCustomer] = useState('');
  const [dpNominal, setDpNominal] = useState('');
  const [dpKeterangan, setDpKeterangan] = useState('');
  const [tglInvoice, setTglInvoice] = useState(new Date().toISOString().split('T')[0]);
  const [manualInvoiceNo, setManualInvoiceNo] = useState('');
  const [loadingInvoiceNo, setLoadingInvoiceNo] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<InvoiceData | null>(null);
  const [pendingInvoiceNo, setPendingInvoiceNo] = useState('');
  const [pendingTipe, setPendingTipe] = useState<InvoiceTipe>('normal');
  const [pendingKeterangan, setPendingKeterangan] = useState('');
  const [preparing, setPreparing] = useState(false);

  // ── Daftar Invoice state
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [paymentStatusMap, setPaymentStatusMap] = useState<Record<string, any>>({});
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [filterInvCustomer, setFilterInvCustomer] = useState('');
  const [filterInvTipe, setFilterInvTipe] = useState('all');
  const [filterInvStatus, setFilterInvStatus] = useState('all');
  const [filterPeriodStart, setFilterPeriodStart] = useState('');
  const [filterPeriodEnd, setFilterPeriodEnd] = useState('');
  const [reprintData, setReprintData] = useState<InvoiceData | null>(null);
  const [reprintNo, setReprintNo] = useState('');
  const [showReprint, setShowReprint] = useState(false);
  const [selectedPaymentInv, setSelectedPaymentInv] = useState<any>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

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

  // ── Buat Invoice: available SO by tipe
  const availableSO = useMemo(() => {
    if (invoiceTipe === 'normal') {
      return so.filter(s =>
        s.status_muatan === 'Completed' &&
        (s.invoice_count === 0 || !s.invoice_count) &&
        (!s.no_invoice || s.no_invoice === '')
      );
    } else if (invoiceTipe === 'dp') {
      return so.filter(s =>
        (s.invoice_count === 0 || !s.invoice_count) &&
        (!s.no_invoice || s.no_invoice === '')
      );
    } else {
      return so.filter(s => s.invoice_count === 1);
    }
  }, [so, invoiceTipe]);

  const filteredSO = useMemo(() =>
    !filterCustomer ? availableSO
    : availableSO.filter(s => s.customer?.toLowerCase().includes(filterCustomer.toLowerCase())),
  [availableSO, filterCustomer]);

  const selectedSOList = useMemo(() => so.filter(s => selectedIds.has(s.id)), [so, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); return next; }
      if (invoiceTipe !== 'normal' && next.size >= 1) {
        showToast('Invoice DP/Pelunasan hanya untuk 1 SO', 'error');
        return prev;
      }
      next.add(id);
      return next;
    });
  };

  const validate = (): string | null => {
    if (selectedIds.size === 0) return 'Pilih minimal 1 Sales Order';
    if (new Set(selectedSOList.map(s => s.customer)).size > 1) return 'Semua SO harus dari customer yang sama';
    if (invoiceTipe === 'dp') {
      if (selectedIds.size > 1) return 'Invoice DP hanya untuk 1 SO';
      const nom = parseFloat(dpNominal);
      if (!nom || nom < 100000) return 'Nominal DP minimal Rp 100.000';
      if (nom >= (selectedSOList[0]?.total_harga_pajak || 0)) return 'Nominal DP harus kurang dari total SO';
    }
    if (invoiceTipe === 'pelunasan' && selectedIds.size > 1) return 'Invoice Pelunasan hanya untuk 1 SO';
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
      setPendingTipe(invoiceTipe);
      const firstSO = selectedSOList[0];
      const invDateStr = fmtDate(tglInvoice);

      let items: InvoiceData['items'];
      let subTotal = 0, ppn = 0, total = 0;
      let keteranganInv = '';

      if (invoiceTipe === 'dp') {
        const dpAmount = parseFloat(dpNominal);
        keteranganInv = dpKeterangan ? `DP ${dpKeterangan}` : 'DP';
        setPendingKeterangan(keteranganInv);
        items = selectedSOList.map((s, i) => ({
          rowNo: i + 1, tglMuat: fmtDate(s.tgl_muat), tglTiba: fmtDate(s.tgl_bongkar),
          noSO: s.order_id, armada: s.jenis_truk || '-', noPol: s.no_polisi || '-',
          muatan: s.muatan || '-', sn: s.sn || '-',
          lokasiMuat: s.lokasi_muat || '-', lokasiTujuan: s.lokasi_bongkar || '-',
          hargaPengiriman: dpAmount, nilaiPajak: 0, hargaAsuransi: null, total: dpAmount,
        }));
        subTotal = dpAmount; ppn = 0; total = dpAmount;

      } else if (invoiceTipe === 'pelunasan') {
        keteranganInv = 'Pelunasan';
        setPendingKeterangan(keteranganInv);
        const existing = await api.getInvoicesBySO([firstSO.order_id]);
        const dpInv = existing.find((inv: any) => inv.tipe === 'dp');
        const sisa = (firstSO.total_harga_pajak || 0) - (dpInv?.total_setelah_pajak || 0);
        items = selectedSOList.map((s, i) => ({
          rowNo: i + 1, tglMuat: fmtDate(s.tgl_muat), tglTiba: fmtDate(s.tgl_bongkar),
          noSO: s.order_id, armada: s.jenis_truk || '-', noPol: s.no_polisi || '-',
          muatan: s.muatan || '-', sn: s.sn || '-',
          lokasiMuat: s.lokasi_muat || '-', lokasiTujuan: s.lokasi_bongkar || '-',
          hargaPengiriman: sisa, nilaiPajak: 0, hargaAsuransi: null, total: sisa,
        }));
        subTotal = sisa; ppn = 0; total = sisa;

      } else {
        keteranganInv = '';
        setPendingKeterangan('');
        items = [...selectedSOList]
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
        subTotal = items.reduce((acc, i) => acc + i.hargaPengiriman + (i.hargaAsuransi || 0), 0);
        ppn = items.reduce((acc, i) => acc + (i.nilaiPajak || 0), 0);
        total = subTotal + ppn;
      }

      setPreviewData({
        invoiceNumber: invoiceNo, invoiceDate: invDateStr,
        customer: firstSO.customer,
        picCust: `${firstSO.pic_cust || ''} ${firstSO.no_pic || ''}`.trim(),
        items, subTotal, ppn, total, keterangan: keteranganInv,
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
      tipe: pendingTipe,
      keterangan_invoice: pendingKeterangan,
    });
    for (const s of selectedSOList) {
      await api.updateSOInvoiceCount(s.id, (s.invoice_count || 0) + 1);
    }
    await api.updateSOInvoiceNo(selectedSOList.map(s => s.id), pendingInvoiceNo);
    logAction(`Generate Invoice: ${pendingInvoiceNo}`, buildMeta({
      module: 'invoice' as any, action_type: 'CREATE', record_id: pendingInvoiceNo,
      after_data: { customer: firstSO.customer, total: previewData.total, so_count: selectedIds.size, tipe: pendingTipe },
    }));
    setSelectedIds(new Set());
    setDpNominal('');
    setDpKeterangan('');
    await loadInvoices();
    try {
      const newNo = await generateInvoiceNo(new Date(tglInvoice));
      setManualInvoiceNo(newNo);
    } catch { }
  };

  const handleDeleteInvoice = async (inv: any) => {
    setDeletingInvoiceId(inv.id);
    try {
      await api.deleteInvoice(inv.id);
      showToast(`Invoice ${inv.no_invoice} berhasil dihapus`, 'success');
      setConfirmDelete(null);
      await loadInvoices();
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
      const matchTipe = filterInvTipe === 'all' || inv.tipe === filterInvTipe;
      const matchStatus = filterInvStatus === 'all' || getInvStatus(inv) === filterInvStatus;
      const matchStart = !filterPeriodStart || inv.tgl_invoice >= filterPeriodStart;
      const matchEnd = !filterPeriodEnd || inv.tgl_invoice <= filterPeriodEnd;
      return matchCustomer && matchTipe && matchStatus && matchStart && matchEnd;
    }).sort((a, b) => {
      const extractNum = (s: string) => { const m = (s || '').match(/^(\d+)\//); return m ? parseInt(m[1], 10) : 0; };
      return extractNum(b.no_invoice) - extractNum(a.no_invoice);
    });
  }, [invoices, paymentStatusMap, filterInvCustomer, filterInvTipe, filterInvStatus, filterPeriodStart, filterPeriodEnd]);

  const kpiData = useMemo(() => ({
    total: invoices.length,
    lunas: invoices.filter(i => getInvStatus(i) === 'Lunas').length,
    belumBayar: invoices.filter(i => getInvStatus(i) === 'Belum Bayar').length,
    parsial: invoices.filter(i => getInvStatus(i) === 'Parsial').length,
    perluVerifikasi: invoices.filter(i => getInvStatus(i) === 'Perlu Verifikasi').length,
    outstanding: invoices.filter(i => getInvStatus(i) !== 'Lunas').reduce((s, i) => s + (i.total_setelah_pajak || 0), 0),
  }), [invoices, paymentStatusMap]);

  // ── RENDER
  return (
    <PageShell>
      {ToastUI}

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-black text-text-main tracking-tight">Invoice</h1>
          <p className="text-[12px] text-text-med mt-0.5">Manajemen invoice PT Sugiarto Jaya Mandiri</p>
        </div>
        <button
          onClick={() => { setActiveTab(activeTab === 'buat' ? 'daftar' : 'buat'); setSelectedIds(new Set()); }}
          className="btn-primary h-9 px-4 text-[12px] flex items-center gap-2"
        >
          <Icon name={activeTab === 'buat' ? 'List' : 'Plus'} size={14} />
          {activeTab === 'buat' ? 'Daftar Invoice' : 'Buat Invoice'}
        </button>
      </div>

      {/* ══════════════════════════════════ */}
      {/* VIEW: DAFTAR INVOICE               */}
      {/* ══════════════════════════════════ */}
      {activeTab === 'daftar' && (
        <div className="space-y-4">

          {/* KPI Cards */}
          <div className="grid grid-cols-6 gap-3">
            {[
              { label: 'Total Invoice', value: kpiData.total, color: 'text-text-main', bg: 'bg-white' },
              { label: 'Lunas', value: kpiData.lunas, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Belum Bayar', value: kpiData.belumBayar, color: 'text-red-500', bg: 'bg-red-50' },
              { label: 'Parsial', value: kpiData.parsial, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Perlu Verifikasi', value: kpiData.perluVerifikasi, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Outstanding', value: fRp(kpiData.outstanding), color: 'text-accent', bg: 'bg-accent/5' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl border border-border-main p-4`}>
                <div className="text-[9px] font-bold text-text-light uppercase tracking-widest opacity-70 mb-1">{label}</div>
                <div className={`text-[18px] font-black tabular-nums ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              placeholder="🔍 Cari customer..."
              value={filterInvCustomer}
              onChange={e => setFilterInvCustomer(e.target.value)}
              className="input h-8 text-[11px] w-44"
            />
            <input type="date" value={filterPeriodStart} onChange={e => setFilterPeriodStart(e.target.value)} className="input h-8 text-[11px] w-34" />
            <span className="text-text-light text-[11px]">–</span>
            <input type="date" value={filterPeriodEnd} onChange={e => setFilterPeriodEnd(e.target.value)} className="input h-8 text-[11px] w-34" />
            <select value={filterInvTipe} onChange={e => setFilterInvTipe(e.target.value)} className="input h-8 text-[11px] w-28">
              <option value="all">Semua Tipe</option>
              <option value="normal">Normal</option>
              <option value="dp">DP</option>
              <option value="pelunasan">Pelunasan</option>
            </select>
            <select value={filterInvStatus} onChange={e => setFilterInvStatus(e.target.value)} className="input h-8 text-[11px] w-32">
              <option value="all">Semua Status</option>
              <option value="Belum Bayar">Belum Bayar</option>
              <option value="Parsial">Parsial</option>
              <option value="Lunas">Lunas</option>
              <option value="Lebih Bayar">Lebih Bayar</option>
              <option value="Perlu Verifikasi">Perlu Verifikasi</option>
            </select>
            <button onClick={loadInvoices} disabled={loadingInvoices} className="btn-ghost h-8 px-3 text-[11px] flex items-center gap-1.5">
              <Icon name="RefreshCw" size={12} /> {loadingInvoices ? 'Memuat...' : 'Refresh'}
            </button>
            {loadingStatus && (
              <span className="text-[10px] text-purple-500 italic flex items-center gap-1">
                <Icon name="Loader" size={10} className="animate-spin" /> Cek status...
              </span>
            )}
            <span className="text-[11px] text-text-light ml-auto">{filteredInvoices.length} invoice ditemukan</span>
          </div>

          {/* Tabel */}
          {loadingInvoices ? (
            <div className="text-center py-12 text-text-light text-[13px]">Memuat invoice...</div>
          ) : (
            <div className="table-container max-h-[calc(100vh-340px)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left min-w-[160px]">No Invoice</th>
                    <th className="text-left w-24">Tgl Invoice</th>
                    <th className="text-left max-w-[180px]">Customer</th>
                    <th className="text-left max-w-[200px]">Sales Order</th>
                    <th className="text-center w-20">Tipe</th>
                    <th className="text-right w-32">Total</th>
                    <th className="text-center w-28">Status Bayar</th>
                    <th className="text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main/20">
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
                          <div className="text-[12px] font-bold text-text-main truncate">{inv.customer}</div>
                        </td>
                        <td className="py-3 px-4 max-w-[200px]">
                          <div className="flex gap-1 flex-wrap">
                            {(inv.so_order_ids || []).slice(0, 2).map((soId: string) => (
                              <span key={soId} className="px-1.5 py-0.5 bg-accent/5 border border-accent/20 rounded-full text-[9px] font-bold text-accent whitespace-nowrap">{soId}</span>
                            ))}
                            {(inv.so_order_ids || []).length > 2 && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-text-light rounded-full text-[9px] font-bold">+{(inv.so_order_ids || []).length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`badge text-[8px] ${inv.tipe === 'dp' ? 'bg-amber-100 text-amber-700' : inv.tipe === 'pelunasan' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                            {inv.tipe}
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
                    <td colSpan={5} className="py-3 px-4 text-right text-[9px] italic opacity-50 uppercase tracking-widest">Total Terfilter</td>
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

            {/* Type pills + tanggal invoice inline */}
            <div className="flex items-center gap-2 py-2 flex-wrap">
              {([
                { key: 'normal' as InvoiceTipe, label: 'Normal' },
                { key: 'dp' as InvoiceTipe, label: 'DP' },
                { key: 'pelunasan' as InvoiceTipe, label: 'Pelunasan' },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setInvoiceTipe(key); setSelectedIds(new Set()); setDpNominal(''); setDpKeterangan(''); }}
                  className={`flex items-center gap-1.5 h-7 px-3 rounded-full text-[10px] font-bold border transition-colors ${
                    invoiceTipe === key
                      ? 'bg-accent text-white border-accent'
                      : 'bg-white text-text-med border-border-main hover:border-accent'
                  }`}
                >
                  {label}
                </button>
              ))}
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
              {invoiceTipe === 'normal' && 'SO sudah Completed, belum punya invoice. Bisa pilih lebih dari 1 SO dari customer yang sama.'}
              {invoiceTipe === 'dp' && 'SO apapun, belum punya invoice. Isi nominal DP minimal Rp 100.000.'}
              {invoiceTipe === 'pelunasan' && 'SO yang sudah punya invoice DP, belum lunas. Nominal otomatis = Total SO − DP.'}
            </div>

            {/* DP form */}
            {invoiceTipe === 'dp' && (
              <Card className="p-3 border-amber-200 bg-amber-50/40 mb-2">
                <div className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-2">Detail Invoice DP</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-light opacity-60 px-1">Nominal DP (Rp) * min Rp 100.000</label>
                    <input type="number" min={100000} value={dpNominal} onChange={e => setDpNominal(e.target.value)}
                      placeholder="5000000" className="input-field h-9 text-[11px] font-bold" />
                    {dpNominal && <div className="text-[10px] text-text-light px-1">= {fRp(parseFloat(dpNominal) || 0)}</div>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-light opacity-60 px-1">Keterangan (opsional)</label>
                    <input type="text" value={dpKeterangan} onChange={e => setDpKeterangan(e.target.value)}
                      placeholder="50% atau sesuai kesepakatan" className="input-field h-9 text-[11px] font-bold" />
                  </div>
                </div>
              </Card>
            )}

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
                      {invoiceTipe === 'normal' && fRp(selectedSOList.reduce((s, x) => s + (x.total_harga_pajak || 0), 0))}
                      {invoiceTipe === 'dp' && dpNominal && `DP: ${fRp(parseFloat(dpNominal) || 0)}`}
                      {invoiceTipe === 'pelunasan' && 'Lihat preview untuk nominal'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedIds(new Set());
                        setFilterCustomer('');
                        setDpNominal('');
                        setDpKeterangan('');
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
                <tr>
                  <th className="w-10 text-center">☐</th>
                  <th>No SO</th>
                  <th>Customer</th>
                  <th>Rute</th>
                  <th>Tgl Muat</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col mx-4" onClick={e => e.stopPropagation()}>

              {/* Header Modal */}
              <div className="flex items-start justify-between p-5 border-b border-border-main">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[15px] font-black text-accent uppercase tracking-tight">{inv.no_invoice}</span>
                    <span className={`badge text-[8px] ${inv.tipe === 'dp' ? 'bg-amber-100 text-amber-700' : inv.tipe === 'pelunasan' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{inv.tipe}</span>
                    <span className="badge text-[8px]" style={{ backgroundColor: sc + '20', color: sc }}>{ps?.status || inv.status_bayar || 'Belum Bayar'}</span>
                  </div>
                  <div className="text-[11px] text-text-med mt-1">{inv.customer} · {fmtDate(inv.tgl_invoice)}</div>
                  {inv.keterangan_invoice && <div className="text-[10px] text-text-light italic opacity-60 mt-0.5">{inv.keterangan_invoice}</div>}
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

              {/* Summary Pembayaran */}
              <div className="grid grid-cols-4 gap-0 border-b border-border-main">
                {[
                  { label: 'Total Invoice', value: fRp(ps?.total_invoiced || inv.total_setelah_pajak || 0), color: 'text-text-main' },
                  { label: 'Terbayar', value: fRp(ps?.total_paid || 0), color: 'text-green-600' },
                  { label: 'Sisa Tagihan', value: fRp(ps?.total_remaining ?? inv.total_setelah_pajak ?? 0), color: 'text-red-500' },
                  { label: 'DPP (Sub Total)', value: fRp(inv.total_sebelum_pajak || 0), color: 'text-text-med' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-4 border-r border-border-main last:border-r-0">
                    <div className="text-[9px] font-bold text-text-light uppercase tracking-widest opacity-60 mb-1">{label}</div>
                    <div className={`text-[13px] font-black tabular-nums ${color}`}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Detail SO */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="text-[10px] font-black text-text-light uppercase tracking-widest opacity-60 mb-3">
                  Detail Sales Order ({soOrderIds.length} SO)
                </div>
                <div className="table-container max-h-[none]">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr>
                        <th>No SO</th>
                        <th>Rute</th>
                        <th>Tgl Muat</th>
                        <th>Armada</th>
                        <th>Status</th>
                        <th className="text-right">Total Biaya</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main/20">
                      {soDetails.length === 0 ? (
                        <tr><td colSpan={6} className="py-4 text-center text-text-light italic text-[11px]">Tidak ada data SO</td></tr>
                      ) : soDetails.map((s: any) => (
                        <tr key={s.order_id} className="hover:bg-slate-50 transition-colors">
                          <td className="font-black text-accent uppercase tracking-tight">{s.order_id}</td>
                          {s._notFound ? (
                            <td colSpan={5} className="text-text-light italic opacity-50 text-[10px]">Data tidak tersedia</td>
                          ) : (
                            <>
                              <td>
                                <div className="font-bold text-text-main truncate max-w-[140px]" title={s.lokasi_muat}>{s.lokasi_muat || '-'}</div>
                                <div className="text-[10px] text-text-light italic truncate" title={s.lokasi_bongkar}>→ {s.lokasi_bongkar || '-'}</div>
                              </td>
                              <td className="text-text-med italic">{fmtDate(s.tgl_muat) || '-'}</td>
                              <td>
                                <div className="font-bold text-text-main">{s.jenis_truk || '-'}</div>
                                <div className="text-[10px] text-text-light">{s.no_polisi || '-'}</div>
                              </td>
                              <td>{statusBadge(s.status_muatan)}</td>
                              <td className="text-right font-black tabular-nums">{fRp(s.total_harga_pajak || s.total_harga || 0)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
