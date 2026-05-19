import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/src/api';
import { generateInvoiceNo } from '@/src/utils/invoiceGenerator';
import InvoicePreviewModal from '@/src/components/InvoicePreviewModal';
import type { InvoiceTemplateProps } from '@/src/components/InvoiceTemplate';
import { Card, SectionHeader, StatCard, useToast, Icon, PageShell, statusBadge, KPIGrid, EmptyState } from '@/src/components/SJMComponents';
import { buildMeta } from '@/src/lib/activityLogger';

type InvoiceTipe = 'normal' | 'dp' | 'pelunasan';
type TabType = 'buat' | 'daftar' | 'pembayaran';

const fRp = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');

const fmtDate = (d: string) => {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const STATUS_COLOR: Record<string, string> = {
  'Belum Bayar': '#ef4444',
  'Parsial': '#f59e0b',
  'Lunas': '#22c55e',
  'Lebih Bayar': '#3b82f6',
};

interface InvoicePageProps {
  so: any[];
  currentUser: any;
  logAction: (msg: string, meta?: any) => void;
}

export const InvoicePage: React.FC<InvoicePageProps> = ({ so, currentUser, logAction }) => {
  const { showToast, ToastUI } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('buat');

  // ── Tab 1 state
  const [invoiceTipe, setInvoiceTipe] = useState<InvoiceTipe>('normal');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterCustomer, setFilterCustomer] = useState('');
  const [dpNominal, setDpNominal] = useState('');
  const [dpKeterangan, setDpKeterangan] = useState('');
  const [tglInvoice, setTglInvoice] = useState(new Date().toISOString().split('T')[0]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<InvoiceTemplateProps | null>(null);
  const [pendingInvoiceNo, setPendingInvoiceNo] = useState('');
  const [pendingTipe, setPendingTipe] = useState<InvoiceTipe>('normal');
  const [pendingKeterangan, setPendingKeterangan] = useState('');
  const [preparing, setPreparing] = useState(false);

  // ── Tab 2 state
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [filterInvCustomer, setFilterInvCustomer] = useState('');
  const [filterInvTipe, setFilterInvTipe] = useState('all');
  const [filterInvStatus, setFilterInvStatus] = useState('all');
  const [reprintData, setReprintData] = useState<InvoiceTemplateProps | null>(null);
  const [reprintNo, setReprintNo] = useState('');
  const [showReprint, setShowReprint] = useState(false);

  // ── Tab 3 state
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [selectedPaymentInv, setSelectedPaymentInv] = useState<any>(null);

  // ── Load all invoices
  const loadInvoices = async () => {
    setLoadingInvoices(true);
    try {
      setInvoices(await api.getInvoices());
    } catch (err: any) {
      showToast('Gagal memuat invoice: ' + err.message, 'error');
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Load on mount so KPI cards are ready immediately
  useEffect(() => { loadInvoices(); }, []);

  // Reload when switching to daftar tab
  useEffect(() => {
    if (activeTab === 'daftar') loadInvoices();
  }, [activeTab]);

  // ── Tab 1: available SO by tipe — exclude SO with no_invoice set (legacy data fix)
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
      const invoiceNo = await generateInvoiceNo(new Date(tglInvoice));
      setPendingInvoiceNo(invoiceNo);
      setPendingTipe(invoiceTipe);
      const firstSO = selectedSOList[0];
      const invDateStr = fmtDate(tglInvoice);

      let items: InvoiceTemplateProps['items'];
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
        items = selectedSOList.map((s, i) => ({
          rowNo: i + 1, tglMuat: fmtDate(s.tgl_muat), tglTiba: fmtDate(s.tgl_bongkar),
          noSO: s.order_id, armada: s.jenis_truk || '-', noPol: s.no_polisi || '-',
          muatan: s.muatan || '-', sn: s.sn || '-',
          lokasiMuat: s.lokasi_muat || '-', lokasiTujuan: s.lokasi_bongkar || '-',
          hargaPengiriman: Number(s.harga_pengiriman) || 0,
          nilaiPajak: Number(s.nilai_pajak) || 0,
          hargaAsuransi: Number(s.harga_asuransi) > 0 ? Number(s.harga_asuransi) : null,
          total: Number(s.total_harga_pajak) || Number(s.total_harga) || Number(s.harga_pengiriman) || 0,
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
  };

  // ── Tab 2 helpers
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (filterInvCustomer && !inv.customer?.toLowerCase().includes(filterInvCustomer.toLowerCase())) return false;
      if (filterInvTipe !== 'all' && inv.tipe !== filterInvTipe) return false;
      if (filterInvStatus !== 'all' && inv.status_bayar !== filterInvStatus) return false;
      return true;
    });
  }, [invoices, filterInvCustomer, filterInvTipe, filterInvStatus]);

  const handleReprint = (invoice: any) => {
    const soOrderIds: string[] = invoice.so_order_ids || [];
    const totalPerItem = soOrderIds.length > 0 ? (invoice.total_setelah_pajak || 0) / soOrderIds.length : 0;
    const subPerItem = soOrderIds.length > 0 ? (invoice.total_sebelum_pajak || 0) / soOrderIds.length : 0;

    const items: InvoiceTemplateProps['items'] = soOrderIds.map((soId, idx) => {
      const s = so.find(x => x.order_id === soId);
      if (!s) {
        // SO not in memory — distribute invoice total evenly as fallback
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
        nilaiPajak: Number(s.nilai_pajak) || 0,
        hargaAsuransi: Number(s.harga_asuransi) > 0 ? Number(s.harga_asuransi) : null,
        total: invoice.tipe !== 'normal'
          ? (invoice.total_setelah_pajak || 0)
          : (Number(s.total_harga_pajak) || Number(s.total_harga) || Number(s.harga_pengiriman) || totalPerItem),
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

  // ── Tab 3: payment status
  const loadPaymentStatus = async () => {
    setLoadingPayment(true);
    try {
      const invData = await api.getInvoices();
      const withStatus = await Promise.all(invData.map(async (inv: any) => {
        if (!inv.so_order_ids?.length) return { ...inv, paymentStatus: null };
        try {
          const status = await api.getPaymentStatus(inv.so_order_ids);
          return { ...inv, paymentStatus: status };
        } catch { return { ...inv, paymentStatus: null }; }
      }));
      setPaymentData(withStatus);
    } catch (err: any) {
      showToast('Gagal memuat status pembayaran: ' + err.message, 'error');
    } finally {
      setLoadingPayment(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pembayaran') loadPaymentStatus();
  }, [activeTab]);

  // ── KPI computed values for Tab 2
  const belumBayarCount = invoices.filter(inv => !inv.status_bayar || inv.status_bayar === 'Belum Bayar').length;
  const totalNilai = invoices.reduce((s, inv) => s + (inv.total_setelah_pajak || 0), 0);

  // ── RENDER
  return (
    <PageShell>
      <ToastUI />
      <SectionHeader title="Invoice" sub="Manajemen invoice PT Sugiarto Jaya Mandiri" />

      {/* Tab bar — same style as SalesOrder */}
      <div className="tab-bar">
        {([
          { key: 'buat', label: 'Buat Invoice' },
          { key: 'daftar', label: 'Daftar Invoice' },
          { key: 'pembayaran', label: 'Status Pembayaran' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            className={`tab-btn ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── TAB 1: BUAT INVOICE ── */}
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
              <div className="ml-auto flex items-center gap-2">
                <label className="text-[10px] font-bold text-text-light opacity-60 uppercase tracking-widest whitespace-nowrap">Tgl Invoice</label>
                <input type="date" value={tglInvoice} onChange={e => setTglInvoice(e.target.value)}
                  className="input-field h-8 w-40 text-[11px] font-bold" />
              </div>
            </div>

            {/* Description */}
            <div className="text-[11px] text-text-med bg-blue-50 rounded-lg px-3 py-2 mb-2">
              {invoiceTipe === 'normal' && 'SO Completed yang belum punya invoice. Bisa pilih lebih dari 1 SO dari customer yang sama.'}
              {invoiceTipe === 'dp' && 'Hanya 1 SO, status apapun, belum punya invoice. Isi nominal DP minimal Rp 100.000.'}
              {invoiceTipe === 'pelunasan' && 'Hanya 1 SO yang sudah punya Invoice DP. Nominal otomatis = Total SO − DP.'}
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
                  <button onClick={handlePrepareInvoice} disabled={preparing}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Icon name="Eye" size={14} />
                    {preparing ? '⏳ Mempersiapkan...' : 'Preview Invoice'}
                  </button>
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

      {/* ── TAB 2: DAFTAR INVOICE ── */}
      {activeTab === 'daftar' && (
        <div className="space-y-4">

          <KPIGrid cols={3}>
            <StatCard label="Total Invoice" value={invoices.length} color="var(--color-accent)" icon="FileText" />
            <StatCard label="Belum Bayar" value={belumBayarCount} color="var(--color-red-brand)" icon="AlertCircle" />
            <StatCard label="Total Nilai" value={`Rp ${Math.round(totalNilai / 1_000_000)}jt`} color="var(--color-green-brand)" icon="DollarSign" />
          </KPIGrid>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            <input type="text" placeholder="🔍 Cari customer..." value={filterInvCustomer}
              onChange={e => setFilterInvCustomer(e.target.value)}
              className="input-field h-9 w-48 text-[11px] font-bold" />
            <select value={filterInvTipe} onChange={e => setFilterInvTipe(e.target.value)}
              className="input-field h-9 text-[11px] font-bold">
              <option value="all">Semua Tipe</option>
              <option value="normal">Normal</option>
              <option value="dp">DP</option>
              <option value="pelunasan">Pelunasan</option>
            </select>
            <select value={filterInvStatus} onChange={e => setFilterInvStatus(e.target.value)}
              className="input-field h-9 text-[11px] font-bold">
              <option value="all">Semua Status</option>
              <option value="Belum Bayar">Belum Bayar</option>
              <option value="Parsial">Parsial</option>
              <option value="Lunas">Lunas</option>
              <option value="Lebih Bayar">Lebih Bayar</option>
            </select>
            <button onClick={loadInvoices} disabled={loadingInvoices}
              className="btn-ghost h-9 px-3 flex items-center gap-1.5 text-[11px]">
              <Icon name="RefreshCw" size={13} /> {loadingInvoices ? 'Memuat...' : 'Refresh'}
            </button>
            <span className="text-[11px] text-text-light italic ml-auto">{filteredInvoices.length} invoice ditemukan</span>
          </div>

          {loadingInvoices ? (
            <div className="text-center py-12 text-text-light text-[13px]">Memuat invoice...</div>
          ) : (
            <div className="table-container max-h-[calc(100vh-420px)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th>No Invoice</th>
                    <th>Tgl Invoice</th>
                    <th>Customer</th>
                    <th>Sales Order</th>
                    <th>Tipe</th>
                    <th className="text-right">Total</th>
                    <th>Status Bayar</th>
                    <th className="text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main/20">
                  {filteredInvoices.length === 0 ? (
                    <EmptyState colSpan={8} />
                  ) : filteredInvoices.map(inv => (
                    <tr key={inv.id} className="transition-colors group hover:bg-slate-50">
                      <td>
                        <div className="font-black text-accent italic text-[11px] uppercase tracking-tight">{inv.no_invoice}</div>
                        {inv.keterangan_invoice && (
                          <div className="text-[9px] text-text-light opacity-60 italic">{inv.keterangan_invoice}</div>
                        )}
                      </td>
                      <td className="tabular-nums text-[11px] font-bold text-text-med italic">{fmtDate(inv.tgl_invoice)}</td>
                      <td>
                        <div className="text-[12px] font-bold text-text-main group-hover:text-blue-brand transition-colors">{inv.customer}</div>
                      </td>
                      <td className="max-w-[220px]">
                        <div className="flex gap-1 flex-wrap">
                          {(inv.so_order_ids || []).map((soId: string) => (
                            <span key={soId} className="px-1.5 py-0.5 bg-accent/5 border border-accent/20 rounded-full text-[9px] font-bold text-accent whitespace-nowrap">{soId}</span>
                          ))}
                          {(!inv.so_order_ids || inv.so_order_ids.length === 0) && (
                            <span className="text-[10px] text-text-light italic opacity-50">—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge text-[8px] ${
                          inv.tipe === 'dp' ? 'bg-amber-100 text-amber-700' :
                          inv.tipe === 'pelunasan' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-blue-50 text-blue-700'
                        }`}>
                          {inv.tipe === 'normal' ? 'Normal' : inv.tipe === 'dp' ? 'DP' : 'Pelunasan'}
                        </span>
                      </td>
                      <td className="text-right font-black text-[12px] tabular-nums">{fRp(inv.total_setelah_pajak || 0)}</td>
                      <td>
                        <span className="badge text-[8px]" style={{
                          backgroundColor: (STATUS_COLOR[inv.status_bayar || 'Belum Bayar'] || '#666') + '20',
                          color: STATUS_COLOR[inv.status_bayar || 'Belum Bayar'] || '#666',
                        }}>
                          {inv.status_bayar || 'Belum Bayar'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-0.5 justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                          <button
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-text-med transition-colors"
                            onClick={() => handleReprint(inv)}
                            title="Preview & Reprint"
                          >
                            <Icon name="Eye" size={12} />
                          </button>
                          <button
                            className="p-1.5 rounded-lg hover:bg-blue-brand/10 text-blue-brand transition-colors"
                            onClick={() => handleReprint(inv)}
                            title="Download"
                          >
                            <Icon name="Download" size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 text-text-main font-black border-t-2 border-border-main">
                    <td colSpan={5} className="py-3 px-4 text-right italic text-[9px] opacity-60 uppercase tracking-widest">Total Invoice Terfilter</td>
                    <td className="py-3 px-4 text-right text-[12px] font-black text-accent tabular-nums">
                      {fRp(filteredInvoices.reduce((s, inv) => s + (inv.total_setelah_pajak || 0), 0))}
                    </td>
                    <td colSpan={2} className="py-3 px-4 text-center text-[12px] font-black text-accent">{filteredInvoices.length} Records</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: STATUS PEMBAYARAN ── */}
      {activeTab === 'pembayaran' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-[11px] text-text-med">Status dihitung dari Jurnal (COA 112 - Piutang Usaha)</div>
            <button onClick={loadPaymentStatus} disabled={loadingPayment}
              className="btn-ghost h-8 px-3 text-[11px] flex items-center gap-1.5">
              <Icon name="RefreshCw" size={12} /> {loadingPayment ? 'Menghitung...' : 'Refresh'}
            </button>
          </div>
          {loadingPayment ? (
            <div className="text-center py-12 text-text-light text-[13px]">Menghitung status pembayaran...</div>
          ) : (
            <div className="table-container max-h-[calc(100vh-380px)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th>No Invoice</th>
                    <th>Customer</th>
                    <th>Tipe</th>
                    <th>Sales Order</th>
                    <th className="text-right">Total Invoice</th>
                    <th className="text-right">Terbayar</th>
                    <th className="text-right">Sisa</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main/20">
                  {paymentData.length === 0 ? (
                    <EmptyState colSpan={8} />
                  ) : paymentData.map(inv => {
                    const ps = inv.paymentStatus;
                    const sc = STATUS_COLOR[ps?.status || 'Belum Bayar'] || '#666';
                    return (
                      <tr key={inv.id} className="transition-colors hover:bg-slate-50 group">
                        <td>
                          <button
                            className="font-black text-accent italic text-[11px] uppercase tracking-tight hover:underline text-left"
                            onClick={() => setSelectedPaymentInv({ ...inv, paymentStatus: ps })}
                          >
                            {inv.no_invoice}
                          </button>
                          {inv.keterangan_invoice && (
                            <div className="text-[9px] text-text-light opacity-60 italic">{inv.keterangan_invoice}</div>
                          )}
                        </td>
                        <td>
                          <div className="text-[12px] font-bold text-text-main">{inv.customer}</div>
                        </td>
                        <td>
                          <span className={`badge text-[8px] ${
                            inv.tipe === 'dp' ? 'bg-amber-100 text-amber-700' :
                            inv.tipe === 'pelunasan' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>{inv.tipe}</span>
                        </td>
                        <td>
                          <div className="flex gap-1 flex-wrap max-w-[200px]">
                            {(inv.so_order_ids || []).slice(0, 3).map((soId: string) => (
                              <span key={soId} className="px-1.5 py-0.5 bg-accent/5 border border-accent/20 rounded-full text-[9px] font-bold text-accent whitespace-nowrap">{soId}</span>
                            ))}
                            {(inv.so_order_ids || []).length > 3 && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-text-light rounded-full text-[9px] font-bold">+{inv.so_order_ids.length - 3}</span>
                            )}
                            {(!inv.so_order_ids || inv.so_order_ids.length === 0) && (
                              <span className="text-[10px] text-text-light italic opacity-50">—</span>
                            )}
                          </div>
                        </td>
                        <td className="text-right tabular-nums text-[12px] font-bold">{fRp(ps?.total_invoiced || inv.total_setelah_pajak || 0)}</td>
                        <td className="text-right tabular-nums text-[12px] font-bold text-green-600">{fRp(ps?.total_paid || 0)}</td>
                        <td className="text-right tabular-nums text-[12px] font-bold text-red-500">{fRp(ps?.total_remaining || 0)}</td>
                        <td className="text-center">
                          <span className="badge text-[8px]" style={{ backgroundColor: sc + '20', color: sc }}>
                            {ps?.status || 'Belum Bayar'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Invoice Detail Modal (Tab 3 click) ── */}
      {selectedPaymentInv && (() => {
        const inv = selectedPaymentInv;
        const ps = inv.paymentStatus;
        const sc = STATUS_COLOR[ps?.status || 'Belum Bayar'] || '#666';
        const soOrderIds: string[] = inv.so_order_ids || [];
        const soDetails = soOrderIds.map((soId: string) => so.find(x => x.order_id === soId) || { order_id: soId, _notFound: true });
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedPaymentInv(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col mx-4" onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-border-main">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[15px] font-black text-accent uppercase tracking-tight">{inv.no_invoice}</span>
                    <span className={`badge text-[8px] ${inv.tipe === 'dp' ? 'bg-amber-100 text-amber-700' : inv.tipe === 'pelunasan' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{inv.tipe}</span>
                    <span className="badge text-[8px]" style={{ backgroundColor: sc + '20', color: sc }}>{ps?.status || 'Belum Bayar'}</span>
                  </div>
                  <div className="text-[11px] text-text-med mt-1">{inv.customer} · {fmtDate(inv.tgl_invoice)}</div>
                  {inv.keterangan_invoice && <div className="text-[10px] text-text-light italic opacity-60 mt-0.5">{inv.keterangan_invoice}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-ghost h-8 px-3 text-[11px] flex items-center gap-1.5"
                    onClick={() => { setSelectedPaymentInv(null); handleReprint(inv); }}
                  >
                    <Icon name="Eye" size={13} /> Lihat PDF
                  </button>
                  <button className="p-2 rounded-full hover:bg-slate-100 transition-colors" onClick={() => setSelectedPaymentInv(null)}>
                    <Icon name="X" size={18} className="text-text-med" />
                  </button>
                </div>
              </div>

              {/* Payment summary */}
              <div className="grid grid-cols-4 gap-0 border-b border-border-main">
                {[
                  { label: 'Total Invoice', value: fRp(ps?.total_invoiced || inv.total_setelah_pajak || 0), color: 'text-text-main' },
                  { label: 'Terbayar', value: fRp(ps?.total_paid || 0), color: 'text-green-600' },
                  { label: 'Sisa Tagihan', value: fRp(ps?.total_remaining || 0), color: 'text-red-500' },
                  { label: 'Sub-total (DPP)', value: fRp(inv.total_sebelum_pajak || 0), color: 'text-text-med' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-4 border-r border-border-main last:border-r-0">
                    <div className="text-[9px] font-bold text-text-light uppercase tracking-widest opacity-60 mb-1">{label}</div>
                    <div className={`text-[13px] font-black tabular-nums ${color}`}>{value}</div>
                  </div>
                ))}
              </div>

              {/* SO Details table */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="text-[10px] font-black text-text-light uppercase tracking-widest opacity-60 mb-3">
                  Detail Sales Order ({soOrderIds.length} SO)
                </div>
                <div className="table-container max-h-[none]">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr>
                        <th>No SO</th>
                        <th>Customer</th>
                        <th>Rute</th>
                        <th>Tgl Muat</th>
                        <th>Armada / No Pol</th>
                        <th>Status</th>
                        <th className="text-right">Total Biaya</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main/20">
                      {soDetails.length === 0 ? (
                        <EmptyState colSpan={7} />
                      ) : soDetails.map((s: any) => (
                        <tr key={s.order_id} className="hover:bg-slate-50 transition-colors">
                          <td>
                            <span className="font-black text-accent uppercase tracking-tight">{s.order_id}</span>
                          </td>
                          {s._notFound ? (
                            <td colSpan={6} className="text-text-light italic opacity-50 text-[10px]">Data SO tidak tersedia di memori</td>
                          ) : (
                            <>
                              <td className="font-bold text-text-main">{s.customer}</td>
                              <td className="max-w-[160px]">
                                <div className="font-bold text-text-main truncate" title={s.lokasi_muat}>{s.lokasi_muat || '-'}</div>
                                <div className="text-[10px] text-text-light italic truncate" title={s.lokasi_bongkar}>→ {s.lokasi_bongkar || '-'}</div>
                              </td>
                              <td className="tabular-nums text-text-med italic">{s.tgl_muat || '-'}</td>
                              <td>
                                <div className="font-bold text-text-main">{s.jenis_truk || '-'}</div>
                                <div className="text-[10px] text-text-light">{s.no_polisi || '-'}</div>
                              </td>
                              <td>{statusBadge(s.status_muatan)}</td>
                              <td className="text-right font-black tabular-nums">{fRp(s.total_harga_pajak || 0)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* New invoice preview */}
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
          onConfirm={async () => {
            setShowReprint(false);
            setReprintData(null);
            showToast('Invoice berhasil diunduh ulang!', 'success');
          }}
        />
      )}
    </PageShell>
  );
};

export default InvoicePage;
