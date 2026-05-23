import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/src/api';
import { generateQuotationNo } from '@/src/utils/quotationGenerator';
import { generateQuotationPDF } from '@/src/utils/generateQuotationPDF';
import { useToast, Icon, PageShell, EmptyState } from '@/src/components/SJMComponents';

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
}

export const QuotationPage: React.FC<QuotationPageProps> = ({ currentUser }) => {
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

  const loadQuotations = async () => {
    setLoading(true);
    try { setQuotations(await api.getQuotations()); }
    catch (err: any) { showToast('Gagal memuat quotation: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadQuotations(); }, []);

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

  const handleSave = async () => {
    if (!form.customer.trim()) { showToast('Customer wajib diisi', 'error'); return; }
    if (!form.no_quotation.trim()) { showToast('No Quotation wajib diisi', 'error'); return; }
    if (!form.harga || Number(form.harga) <= 0) { showToast('Harga wajib diisi', 'error'); return; }

    if (!editItem) {
      const dup = quotations.find(q => q.no_quotation === form.no_quotation.trim());
      if (dup) { showToast(`No Quotation ${form.no_quotation} sudah digunakan`, 'error'); return; }
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        harga: Number(form.harga),
        created_by: currentUser?.email || '',
      };
      if (editItem) {
        await api.updateQuotation(editItem.id, payload);
        showToast('Quotation berhasil diupdate', 'success');
      } else {
        await api.addQuotation(payload);
        showToast('Quotation berhasil disimpan', 'success');
      }
      setForm({ ...EMPTY_FORM });
      setEditItem(null);
      setActiveTab('daftar');
      await loadQuotations();
    } catch (err: any) {
      showToast('Gagal simpan: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
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
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-black text-text-main tracking-tight">Quotation</h1>
          <p className="text-[12px] text-text-med mt-0.5">Penawaran harga kepada customer potensial</p>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'buat') {
              setForm({ ...EMPTY_FORM });
              setEditItem(null);
              setActiveTab('daftar');
            } else {
              setActiveTab('buat');
            }
          }}
          className="btn-primary h-9 px-4 text-[12px] flex items-center gap-2"
        >
          <Icon name={activeTab === 'buat' ? 'List' : 'Plus'} size={14} />
          {activeTab === 'buat' ? 'Daftar Quotation' : 'Buat Quotation'}
        </button>
      </div>

      {/* VIEW: DAFTAR */}
      {activeTab === 'daftar' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              placeholder="🔍 Cari customer atau no quotation..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              className="input h-8 text-[11px] w-64"
            />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input h-8 text-[11px] w-32">
              <option value="all">Semua Status</option>
              <option value="Draft">Draft</option>
              <option value="Terkirim">Terkirim</option>
              <option value="Diterima">Diterima</option>
              <option value="Ditolak">Ditolak</option>
            </select>
            <button onClick={loadQuotations} disabled={loading} className="btn-ghost h-8 px-3 text-[11px] flex items-center gap-1.5">
              <Icon name="RefreshCw" size={12} /> Refresh
            </button>
            <span className="text-[11px] text-text-light ml-auto">{filtered.length} quotation</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-text-light text-[13px]">Memuat...</div>
          ) : (
            <div className="table-container max-h-[calc(100vh-280px)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left min-w-[160px]">No Quotation</th>
                    <th className="text-left w-28">Tgl</th>
                    <th className="text-left">Customer</th>
                    <th className="text-left">Rute</th>
                    <th className="text-right w-32">Harga</th>
                    <th className="text-center w-24">Status</th>
                    <th className="text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main/20">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7}><EmptyState colSpan={7} /></td></tr>
                  ) : filtered.map(q => {
                    const sc = STATUS_COLOR[q.status] || '#666';
                    return (
                      <tr key={q.id} className="hover:bg-amber-50/30 cursor-pointer transition-colors group" onClick={() => handleEdit(q)}>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-black text-accent italic text-[11px] uppercase tracking-tight">{q.no_quotation}</div>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-text-med whitespace-nowrap">{fmtDate(q.tgl_quotation)}</td>
                        <td className="py-3 px-4">
                          <div className="text-[12px] font-bold text-text-main">{q.customer}</div>
                          {q.pic && <div className="text-[10px] text-text-light">{q.pic} {q.no_tlp}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-[11px] text-text-main">{q.lokasi_muat || '-'}</div>
                          <div className="text-[10px] text-text-light italic">→ {q.lokasi_tujuan || '-'}</div>
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
                            <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" onClick={() => setConfirmDelete(q)} title="Hapus">
                              <Icon name="Trash2" size={13} />
                            </button>
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
        <div className="max-w-2xl space-y-4">
          <div className="text-[13px] font-black text-text-main">
            {editItem ? `Edit Quotation — ${editItem.no_quotation}` : 'Buat Quotation Baru'}
          </div>

          {/* Section 1: Info Dokumen */}
          <div className="bg-white rounded-2xl border border-border-main p-4 space-y-3">
            <div className="text-[9px] font-black text-text-light uppercase tracking-widest">Info Dokumen</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1 block">No Quotation</label>
                <input value={form.no_quotation} onChange={e => setF('no_quotation', e.target.value)}
                  placeholder={loadingNo ? 'Memuat...' : 'xxxx/QTN-SJM/MM/YYYY'}
                  className="input w-full text-[12px] font-mono" disabled={loadingNo} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1 block">Tgl Quotation</label>
                <input type="date" value={form.tgl_quotation} onChange={e => setF('tgl_quotation', e.target.value)} className="input w-full text-[12px]" />
              </div>
            </div>
            {editItem && (
              <div>
                <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1 block">Status</label>
                <select value={form.status} onChange={e => setF('status', e.target.value)} className="input w-full text-[12px]">
                  <option value="Draft">Draft</option>
                  <option value="Terkirim">Terkirim</option>
                  <option value="Diterima">Diterima</option>
                  <option value="Ditolak">Ditolak</option>
                </select>
              </div>
            )}
          </div>

          {/* Section 2: Data Customer */}
          <div className="bg-white rounded-2xl border border-border-main p-4 space-y-3">
            <div className="text-[9px] font-black text-text-light uppercase tracking-widest">Data Customer</div>
            <div>
              <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1 block">Customer *</label>
              <input value={form.customer} onChange={e => setF('customer', e.target.value)} placeholder="Nama perusahaan customer" className="input w-full text-[12px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1 block">PIC</label>
                <input value={form.pic} onChange={e => setF('pic', e.target.value)} placeholder="Nama PIC" className="input w-full text-[12px]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1 block">No Telepon</label>
                <input value={form.no_tlp} onChange={e => setF('no_tlp', e.target.value)} placeholder="08xxxxxxxxxx" className="input w-full text-[12px]" />
              </div>
            </div>
          </div>

          {/* Section 3: Detail Pengiriman */}
          <div className="bg-white rounded-2xl border border-border-main p-4 space-y-3">
            <div className="text-[9px] font-black text-text-light uppercase tracking-widest">Detail Pengiriman</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1 block">Jenis Kendaraan</label>
                <input value={form.jenis_kendaraan} onChange={e => setF('jenis_kendaraan', e.target.value)} placeholder="Selfloader, Towing, dll" className="input w-full text-[12px]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1 block">Muatan</label>
                <input value={form.muatan} onChange={e => setF('muatan', e.target.value)} placeholder="Jenis alat berat / muatan" className="input w-full text-[12px]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1 block">Lokasi Muat</label>
                <input value={form.lokasi_muat} onChange={e => setF('lokasi_muat', e.target.value)} placeholder="Lokasi penjemputan" className="input w-full text-[12px]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1 block">Lokasi Tujuan</label>
                <input value={form.lokasi_tujuan} onChange={e => setF('lokasi_tujuan', e.target.value)} placeholder="Tujuan pengiriman" className="input w-full text-[12px]" />
              </div>
            </div>
          </div>

          {/* Section 4: Harga & Ketentuan */}
          <div className="bg-white rounded-2xl border border-border-main p-4 space-y-3">
            <div className="text-[9px] font-black text-text-light uppercase tracking-widest">Harga &amp; Ketentuan</div>
            <div>
              <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1 block">Harga (Rp) *</label>
              <input type="number" value={form.harga} onChange={e => setF('harga', e.target.value)} placeholder="15000000" className="input w-full text-[12px]" />
              {form.harga && Number(form.harga) > 0 && (
                <div className="text-[10px] text-text-light mt-1 px-1">= {fRp(Number(form.harga))}</div>
              )}
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1 block">Term of Payment</label>
              <input value={form.term_of_payment} onChange={e => setF('term_of_payment', e.target.value)} placeholder="Contoh: 14 hari setelah invoice" className="input w-full text-[12px]" />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.include_pph} onChange={e => setF('include_pph', e.target.checked)} className="w-4 h-4 accent-accent" />
                <span className="text-[12px] text-text-main">Sudah Termasuk PPh</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.include_asuransi} onChange={e => setF('include_asuransi', e.target.checked)} className="w-4 h-4 accent-accent" />
                <span className="text-[12px] text-text-main">Sudah Termasuk Asuransi</span>
              </label>
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1 block">Keterangan Tambahan</label>
              <textarea value={form.keterangan} onChange={e => setF('keterangan', e.target.value)}
                placeholder="Catatan tambahan..." rows={3} className="input w-full text-[12px] resize-none" />
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="flex items-center gap-3 pt-1">
            <button onClick={() => { setForm({ ...EMPTY_FORM }); setEditItem(null); setActiveTab('daftar'); }}
              className="btn-ghost h-9 px-4 text-[12px] flex items-center gap-2" disabled={saving}>
              <Icon name="X" size={14} /> Batal
            </button>
            <button onClick={handleSave} disabled={saving}
              className="btn-primary h-9 px-5 text-[12px] flex items-center gap-2 disabled:opacity-50">
              <Icon name="Save" size={14} />
              {saving ? 'Menyimpan...' : editItem ? 'Update Quotation' : 'Simpan Quotation'}
            </button>
            {editItem && (
              <button onClick={() => handleDownload(editItem)}
                className="btn-ghost h-9 px-4 text-[12px] flex items-center gap-2">
                <Icon name="Download" size={14} /> Download PDF
              </button>
            )}
          </div>
        </div>
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
    </PageShell>
  );
};

export default QuotationPage;
