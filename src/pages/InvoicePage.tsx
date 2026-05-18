import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/src/api';
import { generateInvoiceNo } from '@/src/utils/invoiceGenerator';
import InvoicePreviewModal from '@/src/components/InvoicePreviewModal';
import type { InvoiceTemplateProps } from '@/src/components/InvoiceTemplate';
import { Card, SectionHeader, useToast, Icon, PageShell, statusBadge } from '@/src/components/SJMComponents';
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
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [filterInvCustomer, setFilterInvCustomer] = useState('');
  const [filterInvTipe, setFilterInvTipe] = useState('all');
  const [filterInvStatus, setFilterInvStatus] = useState('all');
  const [reprintData, setReprintData] = useState<InvoiceTemplateProps | null>(null);
  const [reprintNo, setReprintNo] = useState('');
  const [showReprint, setShowReprint] = useState(false);

  // ── Tab 3 state
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [loadingPayment, setLoadingPayment] = useState(false);

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

  useEffect(() => {
    if (activeTab === 'daftar') loadInvoices();
  }, [activeTab]);

  // ── Tab 1: available SO by tipe
  const availableSO = useMemo(() => {
    if (invoiceTipe === 'normal') return so.filter(s => s.status_muatan === 'Completed' && !(s.invoice_count > 0));
    if (invoiceTipe === 'dp') return so.filter(s => !(s.invoice_count > 0));
    return so.filter(s => s.invoice_count === 1);
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
          total: Number(s.total_harga_pajak) || 0,
        }));
        subTotal = items.reduce((acc, i) => acc + i.hargaPengiriman, 0);
        ppn = items.reduce((acc, i) => acc + (i.nilaiPajak || 0), 0);
        total = items.reduce((acc, i) => acc + i.total, 0);
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
  const filteredInvoices = useMemo(() =>
    invoices.filter(inv => {
      if (filterInvCustomer && !inv.customer?.toLowerCase().includes(filterInvCustomer.toLowerCase())) return false;
      if (filterInvTipe !== 'all' && inv.tipe !== filterInvTipe) return false;
      if (filterInvStatus !== 'all' && inv.status_bayar !== filterInvStatus) return false;
      return true;
    }),
  [invoices, filterInvCustomer, filterInvTipe, filterInvStatus]);

  const handleReprint = (invoice: any) => {
    const soData = so.filter(s => invoice.so_order_ids?.includes(s.order_id));
    const items: InvoiceTemplateProps['items'] = soData.map((s, i) => ({
      rowNo: i + 1, tglMuat: fmtDate(s.tgl_muat), tglTiba: fmtDate(s.tgl_bongkar),
      noSO: s.order_id, armada: s.jenis_truk || '-', noPol: s.no_polisi || '-',
      muatan: s.muatan || '-', sn: s.sn || '-',
      lokasiMuat: s.lokasi_muat || '-', lokasiTujuan: s.lokasi_bongkar || '-',
      hargaPengiriman: invoice.tipe !== 'normal' ? invoice.total_sebelum_pajak : Number(s.harga_pengiriman) || 0,
      nilaiPajak: Number(s.nilai_pajak) || 0,
      hargaAsuransi: Number(s.harga_asuransi) > 0 ? Number(s.harga_asuransi) : null,
      total: invoice.tipe !== 'normal' ? invoice.total_setelah_pajak : Number(s.total_harga_pajak) || 0,
    }));
    setReprintData({
      invoiceNumber: invoice.no_invoice, invoiceDate: fmtDate(invoice.tgl_invoice),
      customer: invoice.customer, picCust: invoice.pic_cust || '-',
      items, subTotal: invoice.total_sebelum_pajak, ppn: invoice.ppn,
      total: invoice.total_setelah_pajak, keterangan: invoice.keterangan_invoice || '',
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

  // ── RENDER
  return (
    <PageShell>
      <ToastUI />
      <SectionHeader title="Invoice" sub="Manajemen invoice PT Sugiarto Jaya Mandiri" />

      {/* Tabs */}
      <div className="flex border-b border-border-main mb-6 gap-1">
        {([
          { key: 'buat', label: '➕ Buat Invoice' },
          { key: 'daftar', label: '📋 Daftar Invoice' },
          { key: 'pembayaran', label: '💰 Status Pembayaran' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-5 h-11 text-[12px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === key ? 'border-accent text-accent' : 'border-transparent text-text-light hover:text-text-med'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: BUAT INVOICE ── */}
      {activeTab === 'buat' && (
        <div className="space-y-5">
          <Card className="p-4">
            <div className="text-[9px] font-black text-text-light uppercase tracking-widest mb-3 opacity-60">Tipe Invoice</div>
            <div className="flex gap-3 flex-wrap">
              {(['normal', 'dp', 'pelunasan'] as InvoiceTipe[]).map(tipe => (
                <button
                  key={tipe}
                  onClick={() => { setInvoiceTipe(tipe); setSelectedIds(new Set()); setDpNominal(''); setDpKeterangan(''); }}
                  className={`px-5 py-2 rounded-xl border-2 text-[12px] font-black uppercase tracking-wide transition-all ${
                    invoiceTipe === tipe ? 'border-accent bg-accent/5 text-accent' : 'border-border-main text-text-med hover:border-accent/50'
                  }`}
                >
                  {tipe === 'normal' ? '📄 Normal' : tipe === 'dp' ? '📑 DP' : '✅ Pelunasan'}
                </button>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-text-med bg-blue-50 rounded-lg px-3 py-2">
              {invoiceTipe === 'normal' && 'SO Completed yang belum punya invoice. Bisa pilih lebih dari 1 SO dari customer yang sama.'}
              {invoiceTipe === 'dp' && 'Hanya 1 SO, status apapun, belum punya invoice. Isi nominal DP minimal Rp 100.000.'}
              {invoiceTipe === 'pelunasan' && 'Hanya 1 SO yang sudah punya Invoice DP. Nominal otomatis = Total SO − DP.'}
            </div>
          </Card>

          {invoiceTipe === 'dp' && (
            <Card className="p-4 border-amber-200 bg-amber-50/40">
              <div className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-3">Detail Invoice DP</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-light uppercase tracking-widest opacity-60 px-1">Nominal DP (Rp) *</label>
                  <input
                    type="number" min={100000} value={dpNominal} onChange={e => setDpNominal(e.target.value)}
                    placeholder="5000000" className="input-field h-10"
                  />
                  {dpNominal && <div className="text-[10px] text-text-light px-1">= {fRp(parseFloat(dpNominal) || 0)}</div>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-light uppercase tracking-widest opacity-60 px-1">Keterangan (opsional)</label>
                  <input type="text" value={dpKeterangan} onChange={e => setDpKeterangan(e.target.value)}
                    placeholder="50% atau sesuai kesepakatan" className="input-field h-10" />
                </div>
              </div>
            </Card>
          )}

          <div className="flex gap-4 items-end flex-wrap">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-light uppercase tracking-widest opacity-60 px-1">Tanggal Invoice</label>
              <input type="date" value={tglInvoice} onChange={e => setTglInvoice(e.target.value)} className="input-field h-10 w-48" />
            </div>
            <div className="space-y-1.5 flex-1 max-w-xs">
              <label className="text-[10px] font-bold text-text-light uppercase tracking-widest opacity-60 px-1">Filter Customer</label>
              <input type="text" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}
                placeholder="Cari customer..." className="input-field h-10" />
            </div>
          </div>

          <Card className="p-0 border-border-main/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
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
                    <tr><td colSpan={7} className="py-10 text-center text-[12px] text-text-light">
                      {invoiceTipe === 'normal' ? 'Tidak ada SO Completed yang belum punya invoice' :
                       invoiceTipe === 'dp' ? 'Tidak ada SO yang belum punya invoice' :
                       'Tidak ada SO yang sudah punya Invoice DP'}
                    </td></tr>
                  ) : filteredSO.map(s => {
                    const isSel = selectedIds.has(s.id);
                    return (
                      <tr key={s.id} onClick={() => toggleSelect(s.id)}
                        className={`cursor-pointer transition-colors ${isSel ? 'bg-accent/5' : 'hover:bg-slate-50'}`}>
                        <td className="text-center">
                          <input type="checkbox" checked={isSel} readOnly className="w-3.5 h-3.5 rounded border-border-main text-accent" />
                        </td>
                        <td className="font-bold text-accent italic text-[12px]">{s.order_id}</td>
                        <td className="text-[12px]">{s.customer}</td>
                        <td className="text-[11px] text-text-med">{s.lokasi_muat} → {s.lokasi_bongkar}</td>
                        <td className="text-[12px]">{s.tgl_muat}</td>
                        <td>{statusBadge(s.status_muatan)}</td>
                        <td className="text-right font-bold text-[12px] tabular-nums">{fRp(s.total_harga_pajak || 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {selectedIds.size > 0 && (
            <Card className="p-4 bg-slate-50/50 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[11px] text-text-med">{selectedIds.size} SO dipilih · {selectedSOList[0]?.customer}</div>
                {invoiceTipe === 'normal' && (
                  <div className="font-black text-[16px] mt-0.5">
                    Total: {fRp(selectedSOList.reduce((s, so) => s + (so.total_harga_pajak || 0), 0))}
                  </div>
                )}
                {invoiceTipe === 'dp' && dpNominal && (
                  <div className="font-black text-[16px] mt-0.5 text-amber-600">DP: {fRp(parseFloat(dpNominal) || 0)}</div>
                )}
              </div>
              <button onClick={handlePrepareInvoice} disabled={preparing}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Icon name="Eye" size={14} />
                {preparing ? '⏳ Mempersiapkan...' : 'Preview Invoice'}
              </button>
            </Card>
          )}
        </div>
      )}

      {/* ── TAB 2: DAFTAR INVOICE ── */}
      {activeTab === 'daftar' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap items-end">
            <input type="text" placeholder="🔍 Cari customer..." value={filterInvCustomer}
              onChange={e => setFilterInvCustomer(e.target.value)} className="input-field h-9 w-48" />
            <select value={filterInvTipe} onChange={e => setFilterInvTipe(e.target.value)} className="input-field h-9">
              <option value="all">Semua Tipe</option>
              <option value="normal">Normal</option>
              <option value="dp">DP</option>
              <option value="pelunasan">Pelunasan</option>
            </select>
            <select value={filterInvStatus} onChange={e => setFilterInvStatus(e.target.value)} className="input-field h-9">
              <option value="all">Semua Status</option>
              <option value="Belum Bayar">Belum Bayar</option>
              <option value="Parsial">Parsial</option>
              <option value="Lunas">Lunas</option>
              <option value="Lebih Bayar">Lebih Bayar</option>
            </select>
            <button onClick={loadInvoices} disabled={loadingInvoices} className="btn-ghost h-9 px-3 flex items-center gap-1.5">
              <Icon name="RefreshCw" size={13} /> {loadingInvoices ? 'Memuat...' : 'Refresh'}
            </button>
          </div>
          <div className="text-[11px] text-text-light">{filteredInvoices.length} invoice ditemukan</div>

          {loadingInvoices ? (
            <div className="text-center py-12 text-text-light text-[13px]">Memuat invoice...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-text-light text-[13px]">Belum ada invoice</div>
          ) : (
            <div className="space-y-2">
              {filteredInvoices.map(inv => (
                <Card key={inv.id} className="p-0 overflow-hidden">
                  <div
                    onClick={() => setExpandedInvoice(expandedInvoice === inv.id ? null : inv.id)}
                    className={`px-4 py-3 flex justify-between items-center cursor-pointer transition-colors ${expandedInvoice === inv.id ? 'bg-accent/5' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <div className="font-bold text-accent text-[13px]">{inv.no_invoice}</div>
                        <div className="text-[11px] text-text-med">{fmtDate(inv.tgl_invoice)} · {inv.customer}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.tipe === 'dp' ? 'bg-amber-100 text-amber-700' :
                        inv.tipe === 'pelunasan' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {inv.tipe === 'normal' ? 'Normal' : inv.tipe === 'dp' ? 'DP' : 'Pelunasan'}
                      </span>
                      <span style={{ backgroundColor: (STATUS_COLOR[inv.status_bayar] || '#666') + '20', color: STATUS_COLOR[inv.status_bayar] || '#666' }}
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {inv.status_bayar || 'Belum Bayar'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="font-bold text-[13px] tabular-nums">{fRp(inv.total_setelah_pajak || 0)}</div>
                        <div className="text-[10px] text-text-light">{inv.so_order_ids?.length || 0} SO</div>
                      </div>
                      <Icon name={expandedInvoice === inv.id ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-text-light" />
                    </div>
                  </div>
                  {expandedInvoice === inv.id && (
                    <div className="px-4 pb-4 pt-3 border-t border-border-main/30 bg-slate-50/50 space-y-3">
                      <div>
                        <div className="text-[9px] font-black text-text-light uppercase tracking-widest mb-2 opacity-60">Sales Order</div>
                        <div className="flex gap-2 flex-wrap">
                          {(inv.so_order_ids || []).map((soId: string) => (
                            <span key={soId} className="px-2 py-0.5 bg-accent/5 border border-accent/20 rounded-full text-[11px] font-bold text-accent">{soId}</span>
                          ))}
                        </div>
                      </div>
                      {inv.keterangan_invoice && (
                        <div className="text-[11px] text-text-med">Keterangan: <strong>{inv.keterangan_invoice}</strong></div>
                      )}
                      <button onClick={() => handleReprint(inv)}
                        className="btn-primary !bg-blue-600 hover:!bg-blue-700 flex items-center gap-2 !text-[11px]">
                        <Icon name="Eye" size={12} /> Preview & Reprint
                      </button>
                    </div>
                  )}
                </Card>
              ))}
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
            <Card className="p-0 border-border-main/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th>No Invoice</th>
                      <th>Customer</th>
                      <th>Tipe</th>
                      <th className="text-right">Total Invoice</th>
                      <th className="text-right">Terbayar</th>
                      <th className="text-right">Sisa</th>
                      <th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-main/20">
                    {paymentData.length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-text-light text-[12px]">Belum ada data</td></tr>
                    ) : paymentData.map(inv => {
                      const ps = inv.paymentStatus;
                      const sc = STATUS_COLOR[ps?.status || 'Belum Bayar'] || '#666';
                      return (
                        <tr key={inv.id}>
                          <td className="font-bold text-accent italic text-[12px]">{inv.no_invoice}</td>
                          <td className="text-[12px]">{inv.customer}</td>
                          <td>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.tipe === 'dp' ? 'bg-amber-100 text-amber-700' :
                              inv.tipe === 'pelunasan' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-700'
                            }`}>{inv.tipe}</span>
                          </td>
                          <td className="text-right tabular-nums text-[12px]">{fRp(ps?.total_invoiced || inv.total_setelah_pajak || 0)}</td>
                          <td className="text-right tabular-nums text-[12px] text-green-600">{fRp(ps?.total_paid || 0)}</td>
                          <td className="text-right tabular-nums text-[12px] text-red-500">{fRp(ps?.total_remaining || 0)}</td>
                          <td className="text-center">
                            <span style={{ backgroundColor: sc + '20', color: sc }}
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold">
                              {ps?.status || 'Belum Bayar'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

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
