import React, { useState, useEffect, useMemo } from 'react';
import { canEdit as checkCanEdit } from "@/src/permissions";
import { buildMeta } from '@/src/lib/activityLogger';
import { api } from '@/src/api';
import { generateQuotationNo } from '@/src/utils/quotationGenerator';
import { generateQuotationPDF } from '@/src/utils/generateQuotationPDF';
import { useToast, Card, Icon, PageShell, EmptyState, PageHeader, ActionBar, KPIGrid, StatCard } from '@/src/components/SJMComponents';
import QuotationPreviewModal from '@/src/components/QuotationPreviewModal';

const fRp = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
const fmtDate = (d: string) => {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const STATUS_COLOR: Record<string, string> = {
  'Draft':    '#6b7280',
  'Terkirim': '#3b82f6',
  'Diterima': '#22c55e',
  'Ditolak':  '#ef4444',
};

const EMPTY_FORM = {
  no_quotation: '',
  tgl_quotation: new Date().toISOString().split('T')[0],
  customer: '',
  pic: '',
  no_tlp: '',
  jenis_kendaraan: '',
  muatan: '',
  lokasi_muat: '',
  lokasi_tujuan: '',
  harga: '',
  keterangan: '',
  term_of_payment: '',
  include_pph: false,
  include_asuransi: false,
  status: 'Draft',
};

interface QuotationPageProps {
  currentUser: any;
  logAction: (msg: string, meta?: any) => void;
}

export const QuotationPage: React.FC<QuotationPageProps> = ({ currentUser, logAction }) => {
  const userCanEdit = checkCanEdit(currentUser?.role ?? "", "quotation");
  const { showToast, ToastUI } = useToast();
  const [activeTab, setActiveTab] = useState<'daftar' | 'buat'>('daftar');
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loadingNo, setLoadingNo] = useState(false);
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [localCustomers, setLocalCustomers] = useState<string[]>([]);

  const loadQuotations = async () => {
    setLoading(true);
    try { setQuotations(await api.getQuotations()); }
    catch (err: any) { showToast('Gagal memuat quotation: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadQuotations();
    const fetchCustomers = async () => {
      try {
        const res = await api.getCustomer();
        setCustomerList(res);
      } catch {}
    };
    fetchCustomers();
  }, []);

  const allNames = useMemo(() => {
    const dbNames = customerList.map(c => c.nama as string);
    const qNames = quotations.map(q => q.customer as string);
    const local = localCustomers;
    return Array.from(new Set([...dbNames, ...qNames, ...local])).filter(Boolean);
  }, [customerList, quotations, localCustomers]);

  const pickCustomer = (name: string) => {
    setCustomerQuery(name);
    setCustomerOpen(false);
    
    let foundPic = '';
    let foundTlp = '';
    
    const recentQ = [...quotations]
      .sort((a, b) => (b.tgl_quotation || '').localeCompare(a.tgl_quotation || ''))
      .find(q => q.customer === name && q.pic);
    
    if (recentQ) {
      foundPic = recentQ.pic || '';
      foundTlp = recentQ.no_tlp || '';
    } else {
      const dbCust = customerList.find(c => c.nama === name);
      if (dbCust) {
        foundPic = dbCust.pic || '';
        foundTlp = dbCust.telepon || dbCust.hp || '';
      }
    }
    
    setForm(f => ({
      ...f,
      customer: name,
      pic: foundPic || f.pic,
      no_tlp: foundTlp || f.no_tlp
    }));
  };

  useEffect(() => {
    if (activeTab !== 'buat' || editItem) return;
    const suggest = async () => {
      setLoadingNo(true);
      try {
        const no = await generateQuotationNo(new Date(form.tgl_quotation));
        setForm(f => ({ ...f, no_quotation: no }));
      } catch { } finally { setLoadingNo(false); }
    };
    suggest();
  }, [activeTab, form.tgl_quotation]);

  const filtered = useMemo(() => {
    return quotations.filter(q => {
      const matchText = !filterText ||
        q.customer?.toLowerCase().includes(filterText.toLowerCase()) ||
        q.no_quotation?.toLowerCase().includes(filterText.toLowerCase());
      const matchStatus = filterStatus === 'all' || q.status === filterStatus;
      return matchText && matchStatus;
    }).sort((a, b) => {
      const na = parseInt((a.no_quotation || '').split('/')[0]) || 0;
      const nb = parseInt((b.no_quotation || '').split('/')[0]) || 0;
      return nb - na;
    });
  }, [quotations, filterText, filterStatus]);

  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [viewingQuotation, setViewingQuotation] = useState<any | null>(null);

  const triggerSavePreview = () => {
    if (!form.customer.trim()) { showToast('Customer wajib diisi', 'error'); return; }
    if (!form.no_quotation.trim()) { showToast('No Quotation wajib diisi', 'error'); return; }
    if (!form.harga || Number(form.harga) <= 0) { showToast('Harga wajib diisi', 'error'); return; }

    if (!editItem) {
      const dup = quotations.find(q => q.no_quotation === form.no_quotation.trim());
      if (dup) { showToast(`No Quotation ${form.no_quotation} sudah digunakan`, 'error'); return; }
    }

    const dataForPreview = {
      noQuotation: form.no_quotation,
      tglQuotation: fmtDate(form.tgl_quotation),
      customer: form.customer,
      pic: form.pic,
      noTlp: form.no_tlp,
      jenisKendaraan: form.jenis_kendaraan,
      muatan: form.muatan,
      lokasiMuat: form.lokasi_muat,
      lokasiTujuan: form.lokasi_tujuan,
      harga: Number(form.harga),
      keterangan: form.keterangan,
      termOfPayment: form.term_of_payment,
      includePph: form.include_pph,
      includeAsuransi: form.include_asuransi,
    };

    setPreviewData(dataForPreview);
    setShowPreview(true);
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        harga: Number(form.harga),
        created_by: currentUser?.email || '',
      };
      if (editItem) {
        await api.updateQuotation(editItem.id, payload);
        logAction(`Update Quotation: ${payload.no_quotation}`, buildMeta({
          module: 'quotation', action_type: 'UPDATE', record_id: payload.no_quotation,
          before_data: { customer: editItem.customer, harga: editItem.harga },
          after_data: { customer: payload.customer, harga: payload.harga },
        }));
        showToast('Quotation berhasil diupdate', 'success');
      } else {
        await api.addQuotation(payload);
        logAction(`Buat Quotation: ${payload.no_quotation}`, buildMeta({
          module: 'quotation', action_type: 'CREATE', record_id: payload.no_quotation,
          after_data: { customer: payload.customer, harga: payload.harga },
        }));
        showToast('Quotation berhasil disimpan', 'success');
      }
      setForm({ ...EMPTY_FORM });
      setEditItem(null);
      setCustomerQuery('');
      setCustomerOpen(false);
      setActiveTab('daftar');
      await loadQuotations();
    } catch (err: any) {
      showToast('Gagal simpan: ' + err.message, 'error');
    } finally {
      setSaving(false);
      setShowPreview(false);
      setPreviewData(null);
    }
  };

  const handleOpenPreview = (q: any) => {
    const dataForPreview = {
      noQuotation: q.no_quotation,
      tglQuotation: fmtDate(q.tgl_quotation),
      customer: q.customer,
      pic: q.pic,
      noTlp: q.no_tlp,
      jenisKendaraan: q.jenis_kendaraan,
      muatan: q.muatan,
      lokasiMuat: q.lokasi_muat,
      lokasiTujuan: q.lokasi_tujuan,
      harga: Number(q.harga),
      keterangan: q.keterangan,
      termOfPayment: q.term_of_payment,
      includePph: q.include_pph,
      includeAsuransi: q.include_asuransi,
    };
    setViewingQuotation({ raw: q, data: dataForPreview });
  };

  const handleEdit = (q: any) => {
    setEditItem(q);
    setForm({
      no_quotation: q.no_quotation || '',
      tgl_quotation: q.tgl_quotation || new Date().toISOString().split('T')[0],
      customer: q.customer || '',
      pic: q.pic || '',
      no_tlp: q.no_tlp || '',
      jenis_kendaraan: q.jenis_kendaraan || '',
      muatan: q.muatan || '',
      lokasi_muat: q.lokasi_muat || '',
      lokasi_tujuan: q.lokasi_tujuan || '',
      harga: String(q.harga || ''),
      keterangan: q.keterangan || '',
      term_of_payment: q.term_of_payment || '',
      include_pph: q.include_pph || false,
      include_asuransi: q.include_asuransi || false,
      status: q.status || 'Draft',
    });
    setCustomerQuery(q.customer || '');
    setCustomerOpen(false);
    setActiveTab('buat');
  };

  const handleDownload = async (q: any) => {
    try {
      const doc = await generateQuotationPDF({
        noQuotation: q.no_quotation,
        tglQuotation: fmtDate(q.tgl_quotation),
        customer: q.customer,
        pic: q.pic || '-',
        noTlp: q.no_tlp || '-',
        jenisKendaraan: q.jenis_kendaraan || '-',
        muatan: q.muatan || '-',
        lokasiMuat: q.lokasi_muat || '-',
        lokasiTujuan: q.lokasi_tujuan || '-',
        harga: Number(q.harga) || 0,
        keterangan: q.keterangan,
        termOfPayment: q.term_of_payment,
        includePph: q.include_pph,
        includeAsuransi: q.include_asuransi,
      });
      doc.save(`Quotation_${q.no_quotation.replace(/\//g, '_')}.pdf`);
    } catch (err: any) {
      showToast('Gagal generate PDF: ' + err.message, 'error');
    }
  };

  const handleDelete = async (q: any) => {
    try {
      await api.deleteQuotation(q.id);
      logAction(`Hapus Quotation: ${q.no_quotation}`, buildMeta({
        module: 'quotation', action_type: 'DELETE', record_id: q.no_quotation,
        before_data: { customer: q.customer, harga: q.harga },
      }));
      showToast('Quotation berhasil dihapus', 'success');
      setConfirmDelete(null);
      await loadQuotations();
    } catch (err: any) {
      showToast('Gagal hapus: ' + err.message, 'error');
    }
  };

  const setF = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <PageShell>
      {ToastUI}

      {/* HEADER */}
      <PageHeader
        title="Quotation"
        sub="Penawaran harga"
        action={
          <button
            onClick={() => {
              if (activeTab === 'buat') {
                setForm({ ...EMPTY_FORM });
                setEditItem(null);
                setCustomerQuery('');
                setCustomerOpen(false);
                setActiveTab('daftar');
              } else {
                setForm({ ...EMPTY_FORM });
                setEditItem(null);
                setCustomerQuery('');
                setCustomerOpen(false);
                setActiveTab('buat');
              }
            }}
            className="btn-primary h-9 px-4 text-[12px] flex items-center gap-2"
          >
            <Icon name={activeTab === 'buat' ? 'List' : 'Plus'} size={14} />
            {activeTab === 'buat' ? 'Daftar Quotation' : 'Buat Quotation'}
          </button>
        }
      />

      {/* VIEW: DAFTAR */}
      {activeTab === 'daftar' && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <KPIGrid cols={5}>
            <StatCard
              label="Total Quotation"
              value={String(quotations.length)}
              icon="FileText"
              color="var(--color-accent)"
            />
            <StatCard
              label="Draft"
              value={String(quotations.filter(q => q.status === 'Draft').length)}
              icon="FilePen"
              color="var(--color-text-light)"
            />
            <StatCard
              label="Terkirim"
              value={String(quotations.filter(q => q.status === 'Terkirim').length)}
              icon="Send"
              color="var(--color-info)"
            />
            <StatCard
              label="Diterima"
              value={String(quotations.filter(q => q.status === 'Diterima').length)}
              icon="CheckCircle"
              color="var(--color-success)"
            />
            <StatCard
              label="Ditolak"
              value={String(quotations.filter(q => q.status === 'Ditolak').length)}
              icon="XCircle"
              color="var(--color-error)"
            />
          </KPIGrid>

          {/* Filter Bar */}
          <ActionBar
            left={
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[220px]">
                  <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
                  <input
                    placeholder="Cari customer atau no quotation..."
                    value={filterText}
                    onChange={e => setFilterText(e.target.value)}
                    className="input-field h-9 w-full pl-9 text-[12px]"
                  />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field h-9 text-[12px]">
                  <option value="all">Semua Status</option>
                  <option value="Draft">Draft</option>
                  <option value="Terkirim">Terkirim</option>
                  <option value="Diterima">Diterima</option>
                  <option value="Ditolak">Ditolak</option>
                </select>
              </div>
            }
            right={
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-text-light">{filtered.length} quotation</span>
                <button onClick={loadQuotations} disabled={loading}
                  className="btn-ghost h-9 px-3 text-[12px] flex items-center gap-1.5">
                  <Icon name="RefreshCw" size={13} /> Refresh
                </button>
              </div>
            }
          />

          {loading ? (
            <div className="text-center py-12 text-text-light text-[13px]">Memuat...</div>
          ) : (
            <div className="table-container max-h-[calc(100vh-320px)]">
              <table className="w-full border-collapse table-fixed">
                <thead>
                  <tr>
                    <th className="w-[160px]">No Quotation</th>
                    <th className="w-[100px]">Tgl</th>
                    <th className="w-[180px]">Customer</th>
                    <th className="w-[150px]">Rute</th>
                    <th className="w-[120px] text-right">Harga</th>
                    <th className="w-[100px] text-center">Status</th>
                    <th className="w-[80px] text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main/30">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7}><EmptyState colSpan={7} /></td></tr>
                  ) : filtered.map(q => {
                    const sc = STATUS_COLOR[q.status] || '#666';
                    return (
                      <tr key={q.id} className="transition-colors group hover:bg-slate-50/50 cursor-pointer" onClick={() => handleOpenPreview(q)}>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-black text-accent italic text-[11px] uppercase tracking-tight">{q.no_quotation}</div>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-text-med whitespace-nowrap">{fmtDate(q.tgl_quotation)}</td>
                        <td className="py-3 px-4 max-w-[180px]">
                          <div className="text-[12px] font-bold text-text-main truncate" title={q.customer}>{q.customer}</div>
                          {q.pic && <div className="text-[10px] text-text-light truncate" title={`${q.pic} ${q.no_tlp}`}>{q.pic} {q.no_tlp}</div>}
                        </td>
                        <td className="py-3 px-4 max-w-[150px]">
                          <div className="text-[11px] text-text-main truncate" title={q.lokasi_muat}>{q.lokasi_muat || '-'}</div>
                          <div className="text-[10px] text-text-light italic truncate" title={q.lokasi_tujuan ? `Ke ${q.lokasi_tujuan}` : ''}>→ {q.lokasi_tujuan || '-'}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums text-[12px]">{fRp(q.harga || 0)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="badge text-[8px]" style={{ backgroundColor: sc + '20', color: sc }}>{q.status}</span>
                        </td>
                        <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 rounded-lg hover:bg-slate-100 text-text-med transition-colors" onClick={() => handleDownload(q)} title="Download PDF">
                              <Icon name="Download" size={13} />
                            </button>
                            {userCanEdit && (
                              <>
                                <button className="p-1.5 rounded-lg hover:bg-slate-100 text-amber-500 hover:text-amber-700 transition-colors" onClick={() => handleEdit(q)} title="Edit">
                                  <Icon name="FilePen" size={13} />
                                </button>
                                <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" onClick={() => setConfirmDelete(q)} title="Hapus">
                                  <Icon name="Trash2" size={13} />
                                </button>
                              </>
                            )}
                          </div>
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

      {/* VIEW: BUAT / EDIT */}
      {activeTab === 'buat' && (
        <Card className="p-0 overflow-hidden border-border-main/40 shadow-sm animate-fade-left bg-white">
          {/* Header */}
          <div className="p-4 border-b border-border-main flex justify-between items-center bg-white sticky top-0 z-20">
             <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-brand/10 text-blue-brand flex items-center justify-center">
                  <Icon name="FilePlus2" size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-text-main tracking-tight leading-none">
                    {editItem ? 'Edit Quotation' : 'Buat Quotation Baru'}
                  </h3>
                  <p className="text-[9px] font-bold text-text-light mt-1 opacity-60 italic">
                    {editItem ? editItem.no_quotation : 'Penawaran harga resmi'}
                  </p>
                </div>
             </div>
             <button className="p-2 rounded-full hover:bg-slate-100 transition-colors" onClick={() => { setForm({ ...EMPTY_FORM }); setEditItem(null); setActiveTab('daftar'); }}>
                <Icon name="X" size={20} className="text-text-main" />
             </button>
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-8 overflow-y-auto max-h-[calc(100vh-270px)] no-scrollbar bg-white">
            {/* Section 1: Info Dokumen */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-widest px-0.5 italic">
                 <Icon name="Hash" size={12} className="text-accent" /> Info Dokumen
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">No Quotation</label>
                  <input value={form.no_quotation} onChange={e => setF('no_quotation', e.target.value)}
                    placeholder={loadingNo ? 'Memuat...' : 'xxxx/QTN-SJM/MM/YYYY'}
                    className="input-field h-9 text-[11px] font-bold font-mono" disabled={loadingNo} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Tgl Quotation</label>
                  <input type="date" value={form.tgl_quotation} onChange={e => setF('tgl_quotation', e.target.value)} className="input-field h-9 text-[11px] font-bold" />
                </div>
              </div>
              {editItem && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Status</label>
                  <select value={form.status} onChange={e => setF('status', e.target.value)} className="input-field h-9 text-[11px] font-bold">
                    <option value="Draft">Draft</option>
                    <option value="Terkirim">Terkirim</option>
                    <option value="Diterima">Diterima</option>
                    <option value="Ditolak">Ditolak</option>
                  </select>
                </div>
              )}
            </div>

            {/* Section 2: Data Customer */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-widest px-0.5 italic">
                 <Icon name="User" size={12} className="text-accent" /> Data Customer
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Customer *</label>
                  {(() => {
                    const q = customerQuery.toLowerCase().trim();
                    const matches = q ? allNames.filter(n => n.toLowerCase().includes(q)) : allNames;
                    const isNew = customerQuery.trim() && !allNames.some(n => n.toLowerCase() === customerQuery.toLowerCase().trim());
                    
                    const confirmNew = () => {
                      const name = customerQuery.trim();
                      if (!name) return;
                      setLocalCustomers(prev => prev.includes(name) ? prev : [...prev, name]);
                      pickCustomer(name);
                    };

                    return (
                      <div className="relative">
                        <input
                          className="input-field h-9 w-full text-[11px] font-bold"
                          placeholder="Cari atau ketik nama customer..."
                          value={customerQuery}
                          onChange={e => {
                            setCustomerQuery(e.target.value);
                            setForm(f => ({ ...f, customer: e.target.value }));
                            setCustomerOpen(true);
                          }}
                          onFocus={() => setCustomerOpen(true)}
                          onBlur={() => setTimeout(() => setCustomerOpen(false), 150)}
                          onKeyDown={e => {
                            if (e.key === 'Escape') setCustomerOpen(false);
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (matches.length > 0) { pickCustomer(matches[0]); }
                              else confirmNew();
                            }
                          }}
                        />
                        {customerOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border-main rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto">
                            {matches.map((name, i) => (
                              <button key={i} type="button"
                                className="w-full text-left px-3 py-2 text-[11px] font-bold hover:bg-slate-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                                onMouseDown={e => { e.preventDefault(); pickCustomer(name); }}>
                                {name}
                              </button>
                            ))}
                            {isNew && (
                              <button type="button"
                                className="w-full text-left px-3 py-2 text-[11px] font-black text-accent hover:bg-accent/5 transition-colors flex items-center gap-2 border-t border-border-main/30"
                                onMouseDown={e => { e.preventDefault(); confirmNew(); }}>
                                <Icon name="Plus" size={11} /> Tambah &ldquo;{customerQuery.trim()}&rdquo;
                              </button>
                            )}
                            {matches.length === 0 && !isNew && (
                              <div className="px-3 py-2 text-[11px] text-text-light italic opacity-50">Tidak ada hasil</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">PIC</label>
                    <input value={form.pic} onChange={e => setF('pic', e.target.value)} placeholder="Nama PIC" className="input-field h-9 text-[11px] font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">No Telepon</label>
                    <input value={form.no_tlp} onChange={e => setF('no_tlp', e.target.value)} placeholder="08xxxxxxxxxx" className="input-field h-9 text-[11px] font-bold" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Detail Pengiriman */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-widest px-0.5 italic">
                 <Icon name="Truck" size={12} className="text-accent" /> Detail Pengiriman
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Jenis Kendaraan</label>
                    <input value={form.jenis_kendaraan} onChange={e => setF('jenis_kendaraan', e.target.value)} placeholder="Selfloader, Towing, dll" className="input-field h-9 text-[11px] font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Muatan</label>
                    <input value={form.muatan} onChange={e => setF('muatan', e.target.value)} placeholder="Jenis alat berat / muatan" className="input-field h-9 text-[11px] font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Lokasi Muat</label>
                    <input value={form.lokasi_muat} onChange={e => setF('lokasi_muat', e.target.value)} placeholder="Lokasi penjemputan" className="input-field h-9 text-[11px] font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Lokasi Tujuan</label>
                    <input value={form.lokasi_tujuan} onChange={e => setF('lokasi_tujuan', e.target.value)} placeholder="Tujuan pengiriman" className="input-field h-9 text-[11px] font-bold" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Harga & Ketentuan */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-widest px-0.5 italic">
                 <Icon name="Receipt" size={12} className="text-accent" /> Harga &amp; Ketentuan
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Harga (Rp) *</label>
                  <input type="number" value={form.harga} onChange={e => setF('harga', e.target.value)} placeholder="15000000" className="input-field h-9 text-[11px] font-bold" />
                  {form.harga && Number(form.harga) > 0 && (
                    <div className="text-[10px] text-text-light mt-1 px-1 font-bold">= {fRp(Number(form.harga))}</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Term of Payment</label>
                  <input value={form.term_of_payment} onChange={e => setF('term_of_payment', e.target.value)} placeholder="Contoh: 14 hari setelah invoice" className="input-field h-9 text-[11px] font-bold" />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.include_pph} onChange={e => setF('include_pph', e.target.checked)} className="w-4 h-4 rounded text-accent focus:ring-accent" />
                    <span className="text-[12px] text-text-main font-bold">Sudah Termasuk PPh</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.include_asuransi} onChange={e => setF('include_asuransi', e.target.checked)} className="w-4 h-4 rounded text-accent focus:ring-accent" />
                    <span className="text-[12px] text-text-main font-bold">Sudah Termasuk Asuransi</span>
                  </label>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-main uppercase tracking-widest px-1 block">Keterangan Tambahan</label>
                  <textarea value={form.keterangan} onChange={e => setF('keterangan', e.target.value)}
                    placeholder="Catatan tambahan..." className="input-field h-16 pt-2 text-[11px] resize-none font-bold" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="p-6 border-t border-border-main bg-slate-50/50 flex flex-col sm:flex-row gap-3">
            <button onClick={triggerSavePreview} disabled={saving || !userCanEdit}
              className="btn-primary flex-1 h-10 text-[10px] uppercase font-black tracking-widest gap-2 flex items-center justify-center order-2 sm:order-1 disabled:opacity-50">
              <Icon name="Save" size={14} />
              {saving ? 'Menyimpan...' : editItem ? 'Update Quotation' : 'Simpan Quotation'}
            </button>
            {editItem && (
              <button onClick={() => handleDownload(editItem)}
                className="btn-ghost flex-1 h-10 text-[10px] uppercase font-black tracking-widest gap-2 flex items-center justify-center order-3 sm:order-2">
                <Icon name="Download" size={14} /> Download PDF
              </button>
            )}
            <button onClick={() => { setForm({ ...EMPTY_FORM }); setEditItem(null); setActiveTab('daftar'); }}
              className="h-10 px-6 rounded-xl text-text-light font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-colors order-1 sm:order-3 animate-fade-left" disabled={saving}>
              Batal
            </button>
          </div>
        </Card>
      )}

      {/* MODAL KONFIRMASI DELETE */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <Icon name="Trash2" size={18} className="text-red-500" />
              </div>
              <div>
                <div className="font-black text-text-main text-[14px]">Hapus Quotation</div>
                <div className="text-[11px] text-text-med mt-0.5">Tindakan ini tidak bisa dibatalkan</div>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 mb-5">
              <div className="text-[11px] font-bold text-accent">{confirmDelete.no_quotation}</div>
              <div className="text-[11px] text-text-med mt-0.5">{confirmDelete.customer}</div>
              <div className="text-[12px] font-black text-text-main mt-1">{fRp(confirmDelete.harga || 0)}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 btn-ghost h-9 text-[12px]">Batal</button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="flex-1 h-9 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[12px] font-bold transition-colors">
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Save Preview Modal */}
      {showPreview && previewData && (
        <QuotationPreviewModal
          data={previewData}
          quotationNumber={form.no_quotation}
          onClose={() => { setShowPreview(false); setPreviewData(null); }}
          onConfirm={handleConfirmSave}
        />
      )}

      {/* Row Click View Detail Preview Modal */}
      {viewingQuotation && (
        <QuotationPreviewModal
          data={viewingQuotation.data}
          quotationNumber={viewingQuotation.raw.no_quotation}
          onClose={() => setViewingQuotation(null)}
        />
      )}
    </PageShell>
  );
};

export default QuotationPage;
