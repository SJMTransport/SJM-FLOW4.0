import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/src/api';
import * as XLSX from 'xlsx';
import { filterByPeriod, today } from '@/src/utils';
import { generateInvoiceNo } from '@/src/utils/invoiceGenerator';
import InvoicePreviewModal from '@/src/components/InvoicePreviewModal';
import type { InvoiceData } from '@/src/utils/generateInvoicePDF';
import { Card, SectionHeader, StatCard, useToast, Icon, PageShell,
  PageHeader, ActionBar, statusBadge, KPIGrid, EmptyState
} from '@/src/components/SJMComponents';
import { buildMeta } from '@/src/lib/activityLogger';

type TabType = 'daftar' | 'buat';

interface VendorComboboxProps {
  value: string;
  vendorSearch: string;
  setVendorSearch: (v: string) => void;
  vendorCustom: boolean;
  setVendorCustom: (v: boolean) => void;
  setCustomer: (v: string) => void;
  vendorDropdownOpen: boolean;
  setVendorDropdownOpen: (v: boolean) => void;
  vendorOptions: string[];
}

const VendorCombobox: React.FC<VendorComboboxProps> = ({
  value,
  vendorSearch,
  setVendorSearch,
  vendorCustom,
  setVendorCustom,
  setCustomer,
  vendorDropdownOpen,
  setVendorDropdownOpen,
  vendorOptions,
}) => {
  const filtered = vendorOptions.filter((v) =>
    v.toLowerCase().includes(vendorSearch.toLowerCase())
  );
  
  return (
    <div className="relative">
      <input
        value={vendorCustom ? value : vendorSearch}
        onChange={(e) => {
          const val = e.target.value;
          if (vendorCustom) {
            setCustomer(val);
          } else {
            setVendorSearch(val);
            setCustomer(val);
            setVendorDropdownOpen(true);
          }
        }}
        onFocus={() => {
          if (!vendorCustom) setVendorDropdownOpen(true);
        }}
        placeholder={vendorCustom ? 'Ketik nama vendor...' : 'Cari atau pilih vendor...'}
        className="input-field h-9 text-[12px] w-full pr-16"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {(value || vendorSearch) && (
          <button
            type="button"
            onClick={() => {
              setCustomer('');
              setVendorSearch('');
              setVendorCustom(false);
            }}
            className="p-0.5 rounded text-text-light hover:text-red-500 transition-colors"
          >
            <Icon name="X" size={11} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setVendorDropdownOpen(!vendorDropdownOpen)}
          className="p-0.5 rounded text-text-light hover:text-text-main"
        >
          <Icon name="ChevronDown" size={12} />
        </button>
      </div>

      {vendorDropdownOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-border-main rounded-xl shadow-xl max-h-44 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setCustomer(v);
                  setVendorSearch(v);
                  setVendorCustom(false);
                  setVendorDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-[12px] hover:bg-purple-50 transition-colors ${
                  value === v ? 'bg-purple-50 text-purple-700 font-bold' : 'text-text-main'
                }`}
              >
                {v}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-[11px] text-text-light">Tidak ada data vendor dari SO</div>
          )}
          <div className="border-t border-border-main/40">
            <button
              type="button"
              onClick={() => {
                setVendorCustom(true);
                setVendorDropdownOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-[11px] text-purple-600 font-bold hover:bg-purple-50 flex items-center gap-1.5"
            >
              <Icon name="Plus" size={11} /> Input vendor manual
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface SOMultiSelectProps {
  selected: string[];
  setSelected: (ids: string[]) => void;
  soOptions: string[];
  open: boolean;
  setOpen: (v: boolean) => void;
}

const SOMultiSelect: React.FC<SOMultiSelectProps> = ({
  selected,
  setSelected,
  soOptions,
  open,
  setOpen,
}) => {
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const selectedSet = new Set(selected);
  const toggle = (id: string) => {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(Array.from(next));
  };

  const filtered = soOptions.filter((id) =>
    id.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div className="relative">
      <div
        className="input-field min-h-9 py-1.5 px-3 text-[11px] w-full cursor-pointer flex items-center justify-between gap-2"
        onClick={() => setOpen(!open)}
      >
        <div className="flex gap-1 flex-wrap flex-1">
          {selected.length === 0 ? (
            <span className="text-text-light opacity-50">Pilih No SO (boleh kosong)...</span>
          ) : (
            selected.map((id) => (
              <span
                key={id}
                className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-bold text-[9px] flex items-center gap-1"
              >
                {id}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(id);
                  }}
                >
                  <Icon name="X" size={9} />
                </button>
              </span>
            ))
          )}
        </div>
        <Icon name="ChevronDown" size={12} className="shrink-0 text-text-light" />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 z-[70] mt-1 bg-white border border-border-main rounded-xl shadow-xl max-h-56 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-border-main/50 bg-slate-50 shrink-0">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari No SO..."
              className="input-field h-8 text-[11px] w-full px-2 bg-white"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 max-h-44">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-[11px] text-text-light text-center">Tidak ada data SO</div>
            ) : (
              filtered.map((soId) => (
                <button
                  key={soId}
                  type="button"
                  onClick={() => toggle(soId)}
                  className={`w-full text-left px-3 py-2 text-[11px] flex items-center gap-2 hover:bg-purple-50 transition-colors ${
                    selectedSet.has(soId) ? 'bg-purple-50 font-bold text-purple-700' : 'text-text-main'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 ${
                      selectedSet.has(soId) ? 'bg-purple-600 border-purple-600' : 'border-border-main'
                    }`}
                  >
                    {selectedSet.has(soId) && <Icon name="Check" size={9} className="text-white" />}
                  </div>
                  <span className="font-mono">{soId}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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
  const [invoiceTypeTab, setInvoiceTypeTab] = useState<'dashboard' | 'masuk' | 'keluar' | 'surat_jalan'>('keluar');

  // ── Pelacakan Surat Jalan state
  const [showFormSj, setShowFormSj] = useState(false);
  const [editingSj, setEditingSj] = useState<any | null>(null);
  const [savingSj, setSavingSj] = useState(false);
  const [filterSjSearch, setFilterSjSearch] = useState('');
  const [filterSjStatus, setFilterSjStatus] = useState('all');
  const [formSj, setFormSj] = useState({
    status_dokumen: 'Belum Dikirim',
    no_resi: '',
    tgl_kirim: '',
    ekspedisi: '',
    surat_jalan: '',
  });

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
  const [openDropdown, setOpenDropdown] = useState<'status_bayar' | 'date_range' | null>(null);
  const [period, setPeriod] = useState<any>({ mode: 'all', month: new Date().getMonth(), year: new Date().getFullYear() });
  const [tempRangeFrom, setTempRangeFrom] = useState(new Date().toISOString().slice(0, 10));
  const [tempRangeTo, setTempRangeTo] = useState(new Date().toISOString().slice(0, 10));
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

  // ── Invoice Masuk state
  const [invoiceMasukList, setInvoiceMasukList] = useState<any[]>([]);
  const [loadingMasuk, setLoadingMasuk] = useState(false);
  const [showFormMasuk, setShowFormMasuk] = useState(false);
  const [editingMasuk, setEditingMasuk] = useState<any | null>(null);
  const [savingMasuk, setSavingMasuk] = useState(false);
  const [filterMasukSearch, setFilterMasukSearch] = useState('');
  const [formMasuk, setFormMasuk] = useState({
    no_invoice:          '',
    tgl_invoice:         new Date().toISOString().split('T')[0],
    customer:            '', // Nama Vendor
    vendor_custom:       false,
    jenis_invoice:       'Armada Truk',
    jenis_custom:        '',
    so_selected_ids:     [] as string[],
    total_setelah_pajak: 0,
    status:              'Belum Diterima',
    status_user:         '',
    keterangan_invoice:  '',
  });
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [vendorSearch, setVendorSearch]             = useState('');
  const [soDropdownOpen, setSODropdownOpen]         = useState(false);

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

  // ── Load Invoice Masuk on tab change
  const loadInvoiceMasuk = async () => {
    setLoadingMasuk(true);
    try {
      const all = await api.getInvoices();
      const list = all.filter((inv: any) => inv.tipe === 'masuk');
      setInvoiceMasukList(list);
      const noInvoices = list.map((inv: any) => inv.no_invoice).filter(Boolean);
      if (noInvoices.length > 0) {
        try {
          const map = await api.getPaymentStatusBatch(noInvoices);
          setPaymentStatusMap(prev => ({ ...prev, ...map }));
        } catch { }
      }
    } catch (err: any) {
      showToast('Gagal memuat Invoice Masuk: ' + err.message, 'error');
    } finally {
      setLoadingMasuk(false);
    }
  };

  useEffect(() => {
    if (invoiceTypeTab === 'masuk') loadInvoiceMasuk();
  }, [invoiceTypeTab]);

  const openNewFormMasuk = () => {
    setEditingMasuk(null);
    setVendorSearch('');
    setVendorDropdownOpen(false);
    setSODropdownOpen(false);
    setFormMasuk({
      no_invoice:          '',
      tgl_invoice:         new Date().toISOString().split('T')[0],
      customer:            '',
      vendor_custom:       false,
      jenis_invoice:       'Armada Truk',
      jenis_custom:        '',
      so_selected_ids:     [],
      total_setelah_pajak: 0,
      status:              'Belum Diterima',
      status_user:         '',
      keterangan_invoice:  '',
    });
    setShowFormMasuk(true);
  };

  const openEditFormMasuk = (inv: any) => {
    setEditingMasuk(inv);
    // Parse stored status: "Diterima oleh Budi" or "Diserahkan ke Ani"
    let status = inv.status || 'Belum Diterima';
    let status_user = '';
    if (status.startsWith('Diterima oleh ')) {
      status_user = status.replace('Diterima oleh ', '');
      status = 'Diterima oleh';
    } else if (status.startsWith('Diserahkan ke ')) {
      status_user = status.replace('Diserahkan ke ', '');
      status = 'Diserahkan ke';
    }
    const storedJenis = inv.pic_cust || 'Armada Truk';
    const knownJenis = ['Armada Truk', 'Kapal', 'Asuransi'];
    const jenis_invoice = knownJenis.includes(storedJenis) ? storedJenis : 'Lain-lain';
    const jenis_custom  = knownJenis.includes(storedJenis) ? '' : storedJenis;
    setVendorSearch(inv.customer || '');
    setVendorDropdownOpen(false);
    setSODropdownOpen(false);
    setFormMasuk({
      no_invoice:          inv.no_invoice || '',
      tgl_invoice:         inv.tgl_invoice || new Date().toISOString().split('T')[0],
      customer:            inv.customer || '',
      vendor_custom:       false,
      jenis_invoice,
      jenis_custom,
      so_selected_ids:     inv.so_order_ids || [],
      total_setelah_pajak: inv.total_setelah_pajak || 0,
      status,
      status_user,
      keterangan_invoice:  inv.keterangan_invoice || '',
    });
    setShowFormMasuk(true);
  };

  const buildStatusStr = (status: string, user: string) => {
    if (status === 'Diterima oleh' || status === 'Diserahkan ke') {
      return `${status} ${user}`.trim();
    }
    return status;
  };

  const handleSaveMasuk = async () => {
    if (!formMasuk.no_invoice.trim()) {
      showToast('No Invoice Masuk wajib diisi', 'error'); return;
    }
    if (!formMasuk.customer.trim()) {
      showToast('Nama Vendor wajib diisi', 'error'); return;
    }
    setSavingMasuk(true);
    try {
      const soIds = formMasuk.so_selected_ids;
      const jenisValue = formMasuk.jenis_invoice === 'Lain-lain'
        ? (formMasuk.jenis_custom.trim() || 'Lain-lain')
        : formMasuk.jenis_invoice;

      const payload = {
        no_invoice:          formMasuk.no_invoice.trim(),
        tgl_invoice:         formMasuk.tgl_invoice,
        customer:            formMasuk.customer.trim(),
        pic_cust:            jenisValue,
        so_order_ids:        soIds,
        total_setelah_pajak: Number(formMasuk.total_setelah_pajak) || 0,
        status:              buildStatusStr(formMasuk.status, formMasuk.status_user),
        keterangan_invoice:  formMasuk.keterangan_invoice,
        company_id:          currentUser?.company_id,
      };

      if (editingMasuk) {
        await api.updateInvoiceMasuk(editingMasuk.id, payload);
        setInvoiceMasukList(prev => prev.map(inv =>
          inv.id === editingMasuk.id ? { ...inv, ...payload } : inv
        ));
        logAction(`Update Invoice Masuk: ${payload.no_invoice}`);
        showToast('Invoice Masuk berhasil diperbarui', 'success');
      } else {
        const created = await api.addInvoiceMasuk(payload);
        if (created) setInvoiceMasukList(prev => [created, ...prev]);
        logAction(`Tambah Invoice Masuk: ${payload.no_invoice}`);
        showToast('Invoice Masuk berhasil disimpan', 'success');
      }
      setShowFormMasuk(false);
      setEditingMasuk(null);
    } catch (err: any) {
      showToast('Gagal simpan: ' + err.message, 'error');
    } finally {
      setSavingMasuk(false);
    }
  };

  const handleDeleteMasuk = async (inv: any) => {
    if (!window.confirm(`Hapus Invoice Masuk ${inv.no_invoice}?`)) return;
    try {
      await api.deleteInvoice(inv.id);
      setInvoiceMasukList(prev => prev.filter(i => i.id !== inv.id));
      showToast('Invoice Masuk dihapus', 'success');
      logAction(`Hapus Invoice Masuk: ${inv.no_invoice}`);
    } catch (err: any) {
      showToast('Gagal hapus: ' + err.message, 'error');
    }
  };

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

  const openEditFormSj = (s: any) => {
    setEditingSj(s);
    const sjRecord = invoices.find((inv: any) => 
      inv.tipe === 'surat_jalan' && (inv.so_order_ids || []).includes(s.order_id)
    );
    setFormSj({
      status_dokumen: sjRecord ? (sjRecord.status_dokumen || 'Belum Dikirim') : 'Belum Dikirim',
      no_resi: sjRecord ? (sjRecord.no_resi || '') : '',
      tgl_kirim: sjRecord ? (sjRecord.tgl_kirim || '') : '',
      ekspedisi: sjRecord ? (sjRecord.ekspedisi || '') : '',
      surat_jalan: s.surat_jalan || '',
    });
    setShowFormSj(true);
  };

  const handleSaveSj = async () => {
    if (!editingSj) return;
    setSavingSj(true);
    try {
      const soId = editingSj.order_id;
      const sjRecord = invoices.find((inv: any) => 
        inv.tipe === 'surat_jalan' && (inv.so_order_ids || []).includes(soId)
      );

      const payload = {
        no_invoice: `SJ-${soId}`,
        customer: editingSj.customer || '',
        so_order_ids: [soId],
        status_dokumen: formSj.status_dokumen,
        no_resi: formSj.no_resi,
        tgl_kirim: formSj.tgl_kirim || null,
        ekspedisi: formSj.ekspedisi || '',
        company_id: currentUser?.company_id,
      };

      let updatedRecord;
      if (sjRecord) {
        await api.updateSuratJalanTracking(sjRecord.id, payload);
        updatedRecord = { ...sjRecord, ...payload };
        setInvoices((prev: any[]) => prev.map(x => x.id === sjRecord.id ? updatedRecord : x));
      } else {
        const created = await api.addSuratJalanTracking(payload);
        updatedRecord = created;
        if (created) setInvoices((prev: any[]) => [created, ...prev]);
      }

      // Sync scan link to Sales Order if modified
      if (formSj.surat_jalan !== (editingSj.surat_jalan || '')) {
        await api.updateSO(editingSj.id, {
          ...editingSj,
          surat_jalan: formSj.surat_jalan
        });
        if (onRefreshSO) {
          await onRefreshSO();
        }
      }

      logAction(`Update Pelacakan Surat Jalan SO: ${soId}`);
      showToast(`Pelacakan Surat Jalan ${soId} berhasil disimpan`, 'success');
      setShowFormSj(false);
      setEditingSj(null);
    } catch (err: any) {
      showToast('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setSavingSj(false);
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

  // ── Surat Jalan Computations
  const sjKpiData = useMemo(() => {
    const list = so || [];
    let verified = 0;
    let kantor = 0;
    let kirim = 0;
    let belum = 0;
    list.forEach((s: any) => {
      const sjRecord = invoices.find((inv: any) =>
        inv.tipe === 'surat_jalan' && (inv.so_order_ids || []).includes(s.order_id)
      );
      const status = sjRecord ? (sjRecord.status_dokumen || 'Belum Dikirim') : 'Belum Dikirim';
      if (status === 'Verified') verified++;
      else if (status === 'Diterima Kantor' || status === 'Diterima') kantor++;
      else if (status === 'Sedang Dikirim') kirim++;
      else belum++;
    });
    return { total: list.length, verified, kantor, kirim, belum };
  }, [so, invoices]);

  const filteredSjList = useMemo(() => {
    return (so || []).filter((s: any) => {
      const q = filterSjSearch.toLowerCase();
      const matchQuery = !q ||
        (s.order_id || '').toLowerCase().includes(q) ||
        (s.customer || '').toLowerCase().includes(q) ||
        (s.nama_sopir || '').toLowerCase().includes(q) ||
        (s.nama_vendor || '').toLowerCase().includes(q);

      const sjRecord = invoices.find((inv: any) =>
        inv.tipe === 'surat_jalan' && (inv.so_order_ids || []).includes(s.order_id)
      );
      const statusSj = sjRecord ? (sjRecord.status_dokumen || 'Belum Dikirim') : 'Belum Dikirim';
      const matchStatus = filterSjStatus === 'all' || statusSj === filterSjStatus;

      return matchQuery && matchStatus;
    });
  }, [so, invoices, filterSjSearch, filterSjStatus]);

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

  const formatRangeLabel = (p: any) => {
    if (p.mode === 'all') return 'Semua Periode';
    if (p.mode === 'day') return p.day || '';
    if (p.mode === 'month') return `Bulan ${p.month + 1} - ${p.year}`;
    if (p.mode === 'year') return `Tahun ${p.year}`;
    if (p.mode === 'range') {
      const fDate = (dStr: string) => {
        if (!dStr) return '';
        const d = new Date(dStr);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      };
      return `${fDate(p.rangeFrom)} - ${fDate(p.rangeTo)}`;
    }
    return 'Pilih Periode';
  };

  const handleExportExcel = () => {
    const dataToExport = filteredInvoices.map((inv: any, idx: number) => ({
      'No.': idx + 1,
      'No. Invoice': inv.no_invoice || '',
      'Tgl Invoice': inv.tgl_invoice || '',
      'Customer': inv.customer || '',
      'Total Tagihan': inv.total_setelah_pajak || 0,
      'Total Bayar': getInvTotalPaid(inv),
      'Sisa Tagihan': getInvRemaining(inv),
      'Status': getInvStatus(inv),
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    wb.Props = {
      Title: "Sales Order Report",
      Subject: "Logistics Management",
      Author: "SJM Flow",
      Company: "PT Sugiarto Jaya Mandiri",
      Creator: "SJM Flow",
      Keywords: "Logistics, Transportation, Heavy Equipment, SJM Flow"
    } as any;
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, `Invoices_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("Berhasil mengunduh Excel Invoice", "success");
  };

  const filteredInvoices = useMemo(() => {
    const withPeriod = filterByPeriod(invoices, period, "tgl_invoice");
    return withPeriod.filter(inv => {
      const matchCustomer = !filterInvCustomer || inv.customer?.toLowerCase().includes(filterInvCustomer.toLowerCase()) || inv.no_invoice?.toLowerCase().includes(filterInvCustomer.toLowerCase());
      const matchStatus = filterInvStatus === 'all' || getInvStatus(inv) === filterInvStatus;
      const matchKpi = activeKpi === 'all' || getInvStatus(inv) === activeKpi;
      return matchCustomer && matchStatus && matchKpi;
    }).sort((a, b) => {
      const extractNum = (s: string) => { const m = (s || '').match(/^(\d+)\//); return m ? parseInt(m[1], 10) : 0; };
      return extractNum(b.no_invoice) - extractNum(a.no_invoice);
    });
  }, [invoices, paymentStatusMap, filterInvCustomer, filterInvStatus, period, activeKpi]);

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
          invoiceTypeTab === 'keluar' ? (
            <button
              onClick={() => { setActiveTab(activeTab === 'buat' ? 'daftar' : 'buat'); setSelectedIds(new Set()); }}
              className="btn-primary h-9 px-4 text-[12px] flex items-center gap-2"
            >
              <Icon name={activeTab === 'buat' ? 'List' : 'Plus'} size={14} />
              {activeTab === 'buat' ? 'Daftar Invoice' : 'Buat Invoice'}
            </button>
          ) : undefined
        }
      />

      {/* Tab Switching Bar */}
      <div className="tab-bar mb-6">
        {[
          ["dashboard", "Dashboard Invoice"],
          ["masuk", "Invoice Masuk"],
          ["keluar", "Invoice Keluar"],
          ["surat_jalan", "Pelacakan Surat Jalan"]
        ].map(([k, l]) => (
          <button
            key={k}
            className={`tab-btn uppercase tracking-widest ${invoiceTypeTab === k ? "active" : ""}`}
            onClick={() => setInvoiceTypeTab(k as any)}
          >
            {l}
          </button>
        ))}
      </div>

      {invoiceTypeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/30">
                <Icon name="Database" size={20} />
              </div>
              <div>
                <div className="text-[9px] text-text-light font-bold uppercase tracking-wider leading-none">Total Tagihan Keluar</div>
                <div className="text-lg font-black text-text-main mt-1.5 tracking-tight">
                  {fRp(invoices.reduce((s, i) => s + (i.total_setelah_pajak || 0), 0)) + ',00'}
                </div>
              </div>
            </div>
            
            <div className="card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100/30">
                <Icon name="Clock" size={20} />
              </div>
              <div>
                <div className="text-[9px] text-text-light font-bold uppercase tracking-wider leading-none">Outstanding Piutang (Keluar)</div>
                <div className="text-lg font-black text-red-600 mt-1.5 tracking-tight">
                  {fRp(invoices.reduce((s, i) => {
                    const ps = paymentStatusMap[i.no_invoice];
                    const paid = Number(ps?.total_paid || 0);
                    const total = Number(i.total_setelah_pajak || 0);
                    return s + Math.max(0, total - paid);
                  }, 0)) + ',00'}
                </div>
              </div>
            </div>

            <div className="card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100/30">
                <Icon name="TrendingDown" size={20} />
              </div>
              <div>
                <div className="text-[9px] text-text-light font-bold uppercase tracking-wider leading-none">Total Tagihan Masuk</div>
                <div className="text-lg font-black text-text-main mt-1.5 tracking-tight">Rp 0,00</div>
              </div>
            </div>

            <div className="card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100/30">
                <Icon name="AlertTriangle" size={20} />
              </div>
              <div>
                <div className="text-[9px] text-text-light font-bold uppercase tracking-wider leading-none">Outstanding Hutang (Masuk)</div>
                <div className="text-lg font-black text-text-main mt-1.5 tracking-tight">Rp 0,00</div>
              </div>
            </div>
          </div>

          <div className="card p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200/50 flex items-center justify-center mx-auto text-text-light">
              <Icon name="LayoutDashboard" size={28} />
            </div>
            <div>
              <h3 className="text-base font-black text-text-main tracking-tight uppercase leading-none">Dashboard Konsolidasi Invoice</h3>
              <p className="text-[11px] text-text-med mt-2 max-w-md mx-auto leading-relaxed">
                Halaman dashboard ini nantinya akan menyajikan grafik komparasi real-time antara **Invoice Masuk** (Vendor/Supplier) dan **Invoice Keluar** (Customer) beserta analisis perputaran arus kas.
              </p>
            </div>
            <div className="pt-2">
              <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[9px] font-black uppercase tracking-wider">Sedang Dalam Rancangan</span>
            </div>
          </div>
        </div>
      )}

      {invoiceTypeTab === 'surat_jalan' && (
        <div className="space-y-4 animate-fade-in">
          {/* KPI Grid */}
          <KPIGrid cols={5} className="mb-3">
            {[
              { key: 'all', label: 'Total Surat Jalan', value: String(sjKpiData.total), icon: 'Database', color: 'var(--color-text-main)' },
              { key: 'Verified', label: 'Verified', value: String(sjKpiData.verified), icon: 'CheckCircle', color: 'var(--color-success)' },
              { key: 'Diterima Kantor', label: 'Diterima Kantor', value: String(sjKpiData.kantor), icon: 'Briefcase', color: 'var(--color-info)' },
              { key: 'Sedang Dikirim', label: 'Sedang Dikirim', value: String(sjKpiData.kirim), icon: 'Truck', color: 'var(--color-warning)' },
              { key: 'Belum Dikirim', label: 'Belum Dikirim', value: String(sjKpiData.belum), icon: 'Clock', color: 'var(--color-error)' },
            ].map(card => {
              const active = filterSjStatus === card.key;
              return (
                <button
                  key={card.key}
                  onClick={() => setFilterSjStatus(card.key)}
                  className={`card text-left p-4 relative overflow-hidden transition-all duration-200 cursor-pointer ${
                    active ? 'ring-2 ring-purple-600 shadow-md' : 'hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-text-light font-bold uppercase tracking-wider leading-none">
                      {card.label}
                    </span>
                    <span style={{ color: card.color }}>
                      <Icon name={card.icon as any} size={15} />
                    </span>
                  </div>
                  <div className="text-xl font-black mt-2 tracking-tight">
                    {card.value}
                  </div>
                </button>
              );
            })}
          </KPIGrid>

          {/* Action Bar */}
          <ActionBar
            left={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light">
                    <Icon name="Search" size={13} />
                  </span>
                  <input
                    value={filterSjSearch}
                    onChange={e => setFilterSjSearch(e.target.value)}
                    placeholder="Cari SO, Customer, Vendor, Sopir..."
                    className="input-field h-9 text-[12px] pl-8 w-64"
                  />
                </div>
                {filterSjStatus !== 'all' && (
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                    Status: {filterSjStatus}
                  </span>
                )}
              </div>
            }
            right={
              <div className="flex items-center gap-2">
                {(filterSjSearch || filterSjStatus !== 'all') && (
                  <button
                    onClick={() => {
                      setFilterSjSearch('');
                      setFilterSjStatus('all');
                    }}
                    className="btn-ghost h-9 px-3 text-[12px] flex items-center gap-1.5 text-red-500 hover:bg-red-50 border-red-200"
                  >
                    <Icon name="X" size={13} /> Reset
                  </button>
                )}
                <span className="text-[11px] text-text-light">{filteredSjList.length} Sales Order</span>
              </div>
            }
          />

          {/* Table */}
          <div className="table-container bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="w-12 text-center">No</th>
                  <th>No SO</th>
                  <th>Customer</th>
                  <th>Vendor</th>
                  <th>Sopir</th>
                  <th>Status Dokumen</th>
                  <th>No Resi / Info</th>
                  <th>Tgl Kirim / Terima</th>
                  <th>Ekspedisi</th>
                  <th>Dokumen Scan</th>
                  <th className="w-12 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredSjList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-text-light">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Icon name="Inbox" size={32} className="opacity-40" />
                        <span className="text-[13px] font-medium">Tidak ada data pelacakan surat jalan</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSjList.map((s: any, idx: number) => {
                    const sjRecord = invoices.find((inv: any) =>
                      inv.tipe === 'surat_jalan' && (inv.so_order_ids || []).includes(s.order_id)
                    );
                    const status = sjRecord ? (sjRecord.status_dokumen || 'Belum Dikirim') : 'Belum Dikirim';
                    const colorMap: Record<string, string> = {
                      'Verified': 'bg-green-50 text-green-700 border-green-200',
                      'Diterima Kantor': 'bg-blue-50 text-blue-700 border-blue-200',
                      'Diterima': 'bg-blue-50 text-blue-700 border-blue-200',
                      'Sedang Dikirim': 'bg-amber-50 text-amber-700 border-amber-200',
                      'Belum Dikirim': 'bg-red-50 text-red-700 border-red-200',
                    };
                    const statusClass = colorMap[status] || 'bg-slate-50 text-slate-700 border-slate-200';

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="text-center font-bold text-text-light tabular-nums">{idx + 1}</td>
                        <td>
                          <button
                            onClick={() => onSOClick?.(s.order_id)}
                            className="font-bold text-primary hover:underline font-mono text-[12px]"
                          >
                            {s.order_id}
                          </button>
                        </td>
                        <td>
                          <div className="font-bold text-text-main">{s.customer}</div>
                          <div className="text-[11px] text-text-light mt-0.5">{s.wilayah}</div>
                        </td>
                        <td>{s.nama_vendor || s.armada || '-'}</td>
                        <td>{s.nama_sopir || '-'}</td>
                        <td>
                          <span className={`px-2 py-0.5 border rounded-full text-[10px] font-black uppercase tracking-wider ${statusClass}`}>
                            {status}
                          </span>
                        </td>
                        <td className="max-w-[150px] truncate" title={sjRecord?.no_resi || '-'}>
                          {sjRecord?.no_resi || '-'}
                        </td>
                        <td className="tabular-nums">
                          {sjRecord?.tgl_kirim ? fmtDate(sjRecord.tgl_kirim) : '-'}
                        </td>
                        <td>{sjRecord?.ekspedisi || '-'}</td>
                        <td>
                          {s.surat_jalan ? (
                            <a
                              href={s.surat_jalan}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[12px] font-bold text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1"
                            >
                              <Icon name="ExternalLink" size={12} /> Buka Drive
                            </a>
                          ) : (
                            <span className="text-[11px] text-text-light italic">Belum diunggah</span>
                          )}
                        </td>
                        <td className="text-center">
                          <button
                            onClick={() => openEditFormSj(s)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-600 transition-all border border-slate-200/50"
                          >
                            <Icon name="Edit3" size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Modal Form Edit Pelacakan Surat Jalan */}
          {showFormSj && editingSj && createPortal((
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-6 backdrop-blur-md bg-black/25 animate-fade-in"
              onClick={e => {
                if (e.target === e.currentTarget) {
                  setShowFormSj(false);
                  setEditingSj(null);
                }
              }}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col border border-slate-200/50"
                style={{ maxHeight: 'min(90vh, 650px)' }}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-main shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Icon name="Truck" size={14} />
                    </div>
                    <div>
                      <h2 className="text-[14px] font-black text-text-main tracking-tight">Pelacakan Surat Jalan</h2>
                      <div className="text-[10px] text-text-light font-mono mt-0.5">{editingSj.order_id}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowFormSj(false);
                      setEditingSj(null);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-text-light hover:text-text-main transition-all"
                  >
                    <Icon name="X" size={15} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Status Dokumen */}
                  <div>
                    <label className="text-[10px] font-bold text-text-light uppercase tracking-widest block mb-2">Status Surat Jalan</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Belum Dikirim', 'Sedang Dikirim', 'Diterima Kantor', 'Verified'].map(opt => {
                        const active = formSj.status_dokumen === opt;
                        const colors: Record<string, string> = {
                          'Verified': active ? 'bg-green-600 text-white border-green-600 shadow-sm' : 'hover:border-green-300 hover:text-green-700',
                          'Diterima Kantor': active ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'hover:border-blue-300 hover:text-blue-700',
                          'Sedang Dikirim': active ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'hover:border-amber-300 hover:text-amber-700',
                          'Belum Dikirim': active ? 'bg-red-500 text-white border-red-500 shadow-sm' : 'hover:border-red-300 hover:text-red-700',
                        };
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setFormSj(p => ({ ...p, status_dokumen: opt }))}
                            className={`py-2 rounded-xl text-[10px] font-bold border-2 transition-all text-center ${
                              active ? colors[opt] : 'bg-white text-text-med border-border-main ' + colors[opt]
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* No Resi / Info */}
                  <div>
                    <label className="text-[10px] font-bold text-text-light uppercase tracking-widest block mb-1.5">No Resi / Keterangan</label>
                    <input
                      value={formSj.no_resi}
                      onChange={e => setFormSj(p => ({ ...p, no_resi: e.target.value }))}
                      placeholder="Masukkan nomor resi, PIC penerima, dll..."
                      className="input-field h-9 text-[12px] w-full"
                    />
                  </div>

                  {/* Tgl Kirim / Terima */}
                  <div>
                    <label className="text-[10px] font-bold text-text-light uppercase tracking-widest block mb-1.5">Tanggal Kirim / Terima</label>
                    <input
                      type="date"
                      value={formSj.tgl_kirim}
                      onChange={e => setFormSj(p => ({ ...p, tgl_kirim: e.target.value }))}
                      className="input-field h-9 text-[12px] w-full"
                    />
                  </div>

                  {/* Ekspedisi */}
                  <div>
                    <label className="text-[10px] font-bold text-text-light uppercase tracking-widest block mb-1.5">Ekspedisi / Kurir</label>
                    <input
                      value={formSj.ekspedisi}
                      onChange={e => setFormSj(p => ({ ...p, ekspedisi: e.target.value }))}
                      placeholder="JNE, J&T, Kurir Internal, dll..."
                      className="input-field h-9 text-[12px] w-full"
                    />
                  </div>

                  {/* Link Google Drive */}
                  <div>
                    <label className="text-[10px] font-bold text-text-light uppercase tracking-widest block mb-1.5">Link Scan Dokumen (GDive)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light">
                        <Icon name="Link" size={12} />
                      </span>
                      <input
                        value={formSj.surat_jalan}
                        onChange={e => setFormSj(p => ({ ...p, surat_jalan: e.target.value }))}
                        placeholder="https://drive.google.com/..."
                        className="input-field h-9 text-[12px] pl-8 w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-border-main bg-slate-50 rounded-b-2xl shrink-0">
                  <button
                    onClick={() => {
                      setShowFormSj(false);
                      setEditingSj(null);
                    }}
                    className="btn-ghost px-4 h-9 text-[12px]"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveSj}
                    disabled={savingSj}
                    className="btn-primary px-6 h-9 text-[12px] font-bold flex items-center gap-1.5"
                  >
                    {savingSj ? (
                      <><Icon name="RefreshCw" size={13} className="animate-spin" /> Menyimpan...</>
                    ) : (
                      <><Icon name="Save" size={13} /> Simpan</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ), document.body)}
        </div>
      )}

      {invoiceTypeTab === 'masuk' && (() => {
        const filteredMasuk = invoiceMasukList.filter(inv => {
          const q = filterMasukSearch.toLowerCase();
          if (!q) return true;
          return (
            (inv.no_invoice || '').toLowerCase().includes(q) ||
            (inv.customer || '').toLowerCase().includes(q) ||
            (inv.so_order_ids || []).join(' ').toLowerCase().includes(q)
          );
        });

        const totalNominal = invoiceMasukList.reduce((s, inv) => s + (inv.total_setelah_pajak || 0), 0);
        const belumDiterima = invoiceMasukList.filter(inv => (inv.status || '') === 'Belum Diterima').length;
        const sudahDiterima = invoiceMasukList.filter(inv => (inv.status || '').startsWith('Diterima')).length;
        const sudahDiserahkan = invoiceMasukList.filter(inv => (inv.status || '').startsWith('Diserahkan')).length;

        const MASUK_STATUS_COLOR: Record<string, string> = {
          'Belum Diterima': '#ef4444',
          'Diterima': '#3b82f6',
          'Diserahkan': '#22c55e',
        };
        const getMasukStatusColor = (s: string) => {
          if (!s) return '#94a3b8';
          if (s.startsWith('Diterima')) return '#3b82f6';
          if (s.startsWith('Diserahkan')) return '#22c55e';
          return '#ef4444';
        };
        const getSJStatusColor = (s: string) => {
          if (!s) return '#94a3b8';
          if (s.startsWith('Terkirim')) return '#22c55e';
          if (s.startsWith('Diserahkan')) return '#8b5cf6';
          if (s.startsWith('Diterima')) return '#3b82f6';
          return '#ef4444';
        };

        return (
          <div className="space-y-4 animate-fade-in">
            {/* KPI Cards */}
            <KPIGrid cols={4} className="mb-2">
              <StatCard
                label="Total Invoice Masuk"
                value={String(invoiceMasukList.length)}
                icon="TrendingDown"
                color="var(--color-text-main)"
              />
              <StatCard
                label="Belum Diterima"
                value={String(belumDiterima)}
                icon="Clock"
                color="#ef4444"
              />
              <StatCard
                label="Sudah Diterima"
                value={String(sudahDiterima)}
                icon="CheckSquare"
                color="#3b82f6"
              />
              <StatCard
                label="Total Nominal"
                value={fRp(totalNominal)}
                icon="DollarSign"
                color="var(--color-accent)"
              />
            </KPIGrid>

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <Icon name="Search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-light" />
                <input
                  value={filterMasukSearch}
                  onChange={e => setFilterMasukSearch(e.target.value)}
                  placeholder="Cari No Invoice, Vendor, SO..."
                  className="input-field pl-8 h-8 text-[12px] w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadInvoiceMasuk}
                  className="btn-ghost h-8 px-3 text-[11px] flex items-center gap-1.5"
                  title="Refresh"
                >
                  <Icon name="RefreshCw" size={13} className={loadingMasuk ? 'animate-spin' : ''} />
                  Refresh
                </button>
                <button
                  onClick={openNewFormMasuk}
                  className="btn-primary h-8 px-4 text-[11px] flex items-center gap-1.5"
                >
                  <Icon name="Plus" size={13} />
                  Tambah Invoice Masuk
                </button>
              </div>
            </div>

            {/* Table */}
            {loadingMasuk ? (
              <div className="text-center py-12 text-text-light text-[13px]">Memuat Invoice Masuk...</div>
            ) : (
              <div className="table-container max-h-[calc(100vh-390px)]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="w-[170px]">No Invoice</th>
                      <th className="w-[110px]">Tgl Invoice</th>
                      <th className="w-[170px]">Nama Vendor</th>
                      <th className="w-[140px]">No SO</th>
                      <th className="w-[120px] text-right">Total</th>
                      <th className="w-[145px] text-right">Sisa Belum Terbayar</th>
                      <th className="w-[125px] text-center">Status Bayar</th>
                      <th className="w-[120px] text-center">Status Invoice</th>
                      <th className="w-[130px] text-center">Status Surat Jalan</th>
                      <th className="w-[80px] text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-main/30">
                    {filteredMasuk.length === 0 ? (
                      <tr><td colSpan={10}><EmptyState colSpan={10} /></td></tr>
                    ) : filteredMasuk.map(inv => {
                      const invStatus = inv.status || 'Belum Diterima';
                      const sjStatus = inv.status_dokumen || 'Belum Diterima';
                      const invColor = getMasukStatusColor(invStatus);
                      const sjColor = getSJStatusColor(sjStatus);
                      return (
                        <tr key={inv.id} className="hover:bg-purple-50/20 transition-colors group">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-black text-purple-700 italic text-[11px] uppercase tracking-tight">{inv.no_invoice}</div>
                            {inv.keterangan_invoice && (
                              <div className="text-[9px] text-text-light opacity-60 italic truncate max-w-[150px]" title={inv.keterangan_invoice}>{inv.keterangan_invoice}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[11px] text-text-med whitespace-nowrap">{fmtDate(inv.tgl_invoice)}</td>
                          <td className="py-3 px-4">
                            <div className="text-[12px] font-bold text-text-main truncate max-w-[170px]" title={inv.customer}>{inv.customer}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1 flex-wrap">
                              {(inv.so_order_ids || []).map((soId: string, idx: number) => (
                                <React.Fragment key={soId}>
                                  <button
                                    onClick={() => onSOClick && onSOClick(soId)}
                                    className="text-[11px] font-black text-accent hover:underline uppercase tracking-tight"
                                  >
                                    {soId}
                                  </button>
                                  {idx < (inv.so_order_ids || []).length - 1 && <span className="text-[10px] text-text-light opacity-50 mr-1">,</span>}
                                </React.Fragment>
                              ))}
                              {(inv.so_order_ids || []).length === 0 && (
                                <span className="text-[10px] text-text-light opacity-50">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-[12px] font-bold text-text-main">
                            {fRp(inv.total_setelah_pajak || 0)},00
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-[12px] font-bold">
                            {(() => {
                              const total_invoice = inv.total_setelah_pajak || 0;
                              const total_paid = paymentStatusMap[inv.no_invoice]?.total_paid || 0;
                              const diff = total_invoice - total_paid;
                              if (diff > 0) {
                                return <span className="text-red-500 font-bold">-Rp {Math.round(diff).toLocaleString('id-ID')},00</span>;
                              } else if (diff < 0) {
                                return <span className="text-green-600 font-bold">+Rp {Math.round(Math.abs(diff)).toLocaleString('id-ID')},00</span>;
                              } else {
                                return <span className="text-text-light font-medium">Rp 0,00</span>;
                              }
                            })()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {(() => {
                              const statusBayar = getInvStatus(inv);
                              const sc = STATUS_COLOR[statusBayar] || '#666';
                              return (
                                <span 
                                  className="badge text-[9px] font-black uppercase tracking-widest"
                                  style={{ 
                                    backgroundColor: sc + '15', 
                                    color: sc,
                                    border: `1px solid ${sc}30`
                                  }}
                                >
                                  {statusBayar}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div>
                              <span className="badge text-[8px]" style={{ backgroundColor: invColor + '20', color: invColor }}>
                                {invStatus}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-0.5 text-center">
                              <span className="badge text-[8px] mx-auto block w-fit" style={{ backgroundColor: sjColor + '20', color: sjColor }}>
                                {sjStatus}
                              </span>
                              {inv.tgl_kirim && (
                                <div className="text-[8px] text-text-light opacity-60">Terima: {fmtDate(inv.tgl_kirim)}</div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500 hover:text-purple-700 transition-colors"
                                onClick={() => openEditFormMasuk(inv)}
                                title="Edit"
                              >
                                <Icon name="Edit3" size={13} />
                              </button>
                              <button
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                onClick={() => handleDeleteMasuk(inv)}
                                title="Hapus"
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
                      <td className="py-3 px-4 text-right text-[12px] font-black text-purple-700 tabular-nums">
                        {fRp(filteredMasuk.reduce((s, inv) => s + (inv.total_setelah_pajak || 0), 0))},00
                      </td>
                      <td colSpan={5} className="py-3 px-4 text-center text-[11px] font-bold text-text-med">{filteredMasuk.length} records</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Form Modal — Invoice Masuk ── redesigned (React Portal) */}
            {showFormMasuk && createPortal((() => {
              const vendorOptions = Array.from(new Set(
                so
                  .flatMap((s: any) => [s.armada, s.nama_vendor])
                  .filter(Boolean)
                  .map((v: string) => v.trim())
              )).sort() as string[];

              const selectedVendorName = (formMasuk.customer || '').trim().toLowerCase();
              const soOptions = so
                .filter((s: any) => {
                  const matchVendor = !selectedVendorName || 
                    (s.nama_vendor || '').trim().toLowerCase() === selectedVendorName ||
                    (s.armada || '').trim().toLowerCase() === selectedVendorName;
                  
                  const soId = s.order_id;
                  const sjRecord = invoices.find((inv: any) =>
                    inv.tipe === 'surat_jalan' && (inv.so_order_ids || []).includes(soId)
                  );
                  const statusSj = sjRecord ? sjRecord.status_dokumen : 'Belum Diterima';
                  const isVerified = statusSj === 'Verified' || statusSj === 'Diterima Kantor' || statusSj === 'Diterima';
                  
                  return matchVendor && isVerified;
                })
                .map((s: any) => s.order_id)
                .filter(Boolean)
                .sort() as string[];

              return (
                <div
                  className="fixed inset-0 z-[9999] flex items-center justify-center p-6 backdrop-blur-md bg-black/25 animate-fade-in"
                  onClick={e => {
                    if (e.target === e.currentTarget) {
                      setShowFormMasuk(false);
                      setVendorDropdownOpen(false);
                      setSODropdownOpen(false);
                    }
                  }}
                >
                  <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col border border-slate-200/50"
                    style={{ maxHeight: 'min(90vh, 720px)' }}
                  >

                    {/* ── Header */}
                    <div className="flex items-center justify-between px-8 py-5 border-b border-border-main shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-sm">
                          <Icon name="FileText" size={16} className="text-white" />
                        </div>
                        <div>
                          <h2 className="text-[15px] font-black text-text-main tracking-tight">
                            {editingMasuk ? 'Edit Invoice Masuk' : 'Tambah Invoice Masuk'}
                          </h2>
                          <p className="text-[10px] text-text-light mt-0.5 font-medium">Pencatatan tagihan dan biaya masuk dari vendor</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowFormMasuk(false);
                          setVendorDropdownOpen(false);
                          setSODropdownOpen(false);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-text-light hover:text-text-main transition-all"
                      >
                        <Icon name="X" size={16} />
                      </button>
                    </div>

                    {/* ── Body (Single Column) */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-5">
                      {/* No Invoice + Tanggal */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-text-light uppercase tracking-widest block mb-1.5">No Invoice *</label>
                          <input
                            value={formMasuk.no_invoice}
                            onChange={e => setFormMasuk(p => ({ ...p, no_invoice: e.target.value }))}
                            placeholder="INV/VENDOR/001/2026"
                            className="input-field h-9 text-[12px] w-full font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-text-light uppercase tracking-widest block mb-1.5">Tanggal Invoice</label>
                          <input
                            type="date"
                            value={formMasuk.tgl_invoice}
                            onChange={e => setFormMasuk(p => ({ ...p, tgl_invoice: e.target.value }))}
                            className="input-field h-9 text-[12px] w-full"
                          />
                        </div>
                      </div>

                      {/* Nama Vendor (Combobox) */}
                      <div>
                        <label className="text-[10px] font-bold text-text-light uppercase tracking-widest block mb-1.5">Nama Vendor *</label>
                        <VendorCombobox
                          value={formMasuk.customer}
                          vendorSearch={vendorSearch}
                          setVendorSearch={setVendorSearch}
                          vendorCustom={formMasuk.vendor_custom}
                          setVendorCustom={(custom) => setFormMasuk(p => ({ ...p, vendor_custom: custom }))}
                          setCustomer={(cust) => setFormMasuk(p => ({ ...p, customer: cust }))}
                          vendorDropdownOpen={vendorDropdownOpen}
                          setVendorDropdownOpen={setVendorDropdownOpen}
                          vendorOptions={vendorOptions}
                        />
                      </div>

                      {/* Jenis Invoice */}
                      <div>
                        <label className="text-[10px] font-bold text-text-light uppercase tracking-widest block mb-2">Jenis Invoice</label>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            { val: 'Armada Truk', icon: 'Truck' },
                            { val: 'Kapal', icon: 'Anchor' },
                            { val: 'Asuransi', icon: 'Shield' },
                            { val: 'Lain-lain', icon: 'MoreHorizontal' },
                          ] as const).map(({ val, icon }) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setFormMasuk(p => ({ ...p, jenis_invoice: val }))}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold border-2 transition-all ${
                                formMasuk.jenis_invoice === val
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                  : 'bg-white text-text-med border-border-main hover:border-purple-300'
                              }`}
                            >
                              <Icon name={icon as any} size={12} />
                              {val}
                            </button>
                          ))}
                        </div>
                        {formMasuk.jenis_invoice === 'Lain-lain' && (
                          <input
                            value={formMasuk.jenis_custom}
                            onChange={e => setFormMasuk(p => ({ ...p, jenis_custom: e.target.value }))}
                            placeholder="Sebutkan jenis invoice..."
                            className="input-field h-9 text-[12px] w-full mt-2"
                            autoFocus
                          />
                        )}
                      </div>

                      {/* Nominal */}
                      <div>
                        <label className="text-[10px] font-bold text-text-light uppercase tracking-widest block mb-1.5">Nominal Invoice (Rp)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-text-light">Rp</span>
                          <input
                            type="number"
                            value={formMasuk.total_setelah_pajak || ''}
                            onChange={e => setFormMasuk(p => ({ ...p, total_setelah_pajak: Number(e.target.value) }))}
                            placeholder="0"
                            className="input-field h-9 text-[12px] w-full pl-9 tabular-nums"
                          />
                        </div>
                        {formMasuk.total_setelah_pajak > 0 && (
                          <div className="text-[10px] text-text-light mt-1 font-medium tabular-nums">
                            = Rp {Number(formMasuk.total_setelah_pajak).toLocaleString('id-ID')},00
                          </div>
                        )}
                      </div>

                      {/* No SO (Multi-select Dropdown) */}
                      <div>
                        <label className="text-[10px] font-bold text-text-light uppercase tracking-widest block mb-1.5">
                          No SO <span className="normal-case font-normal opacity-60">(Hanya menampilkan SO dengan Surat Jalan yang terverifikasi)</span>
                        </label>
                        <SOMultiSelect
                          selected={formMasuk.so_selected_ids}
                          setSelected={(ids) => setFormMasuk(p => ({ ...p, so_selected_ids: ids }))}
                          soOptions={soOptions}
                          open={soDropdownOpen}
                          setOpen={setSODropdownOpen}
                        />
                      </div>

                      {/* Status Invoice */}
                      <div>
                        <label className="text-[10px] font-bold text-text-light uppercase tracking-widest block mb-2">Status Invoice</label>
                        <div className="flex gap-2">
                          {['Belum Diterima', 'Diterima oleh', 'Diserahkan ke'].map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setFormMasuk(p => ({ ...p, status: opt }))}
                              className={`flex-1 py-2 rounded-xl text-[10px] font-bold border-2 transition-all ${
                                formMasuk.status === opt
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                  : 'bg-white text-text-med border-border-main hover:border-purple-300 hover:text-purple-700'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        {(formMasuk.status === 'Diterima oleh' || formMasuk.status === 'Diserahkan ke') && (
                          <div className="mt-2.5">
                            <input
                              value={formMasuk.status_user}
                              onChange={e => setFormMasuk(p => ({ ...p, status_user: e.target.value }))}
                              placeholder={formMasuk.status === 'Diterima oleh' ? 'Nama penerima...' : 'Diserahkan kepada...'}
                              className="input-field h-9 text-[12px] w-full"
                              autoFocus
                            />
                          </div>
                        )}
                      </div>

                      {/* Keterangan */}
                      <div>
                        <label className="text-[10px] font-bold text-text-light uppercase tracking-widest block mb-1.5">Keterangan Invoice</label>
                        <textarea
                          value={formMasuk.keterangan_invoice}
                          onChange={e => setFormMasuk(p => ({ ...p, keterangan_invoice: e.target.value }))}
                          placeholder="Catatan tambahan mengenai invoice ini..."
                          rows={2}
                          className="input-field text-[12px] w-full resize-none leading-relaxed"
                        />
                      </div>
                    </div>

                    {/* ── Footer */}
                    <div className="flex items-center justify-between px-8 py-4 border-t border-border-main bg-slate-50/80 shrink-0 rounded-b-2xl">
                      <div className="text-[10px] text-text-light">
                        {editingMasuk ? (
                          <span className="flex items-center gap-1.5"><Icon name="Edit3" size={10} /> Mengubah data tagihan</span>
                        ) : (
                          <span className="flex items-center gap-1.5"><Icon name="Plus" size={10} /> Menyimpan tagihan vendor</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setShowFormMasuk(false);
                            setVendorDropdownOpen(false);
                            setSODropdownOpen(false);
                          }}
                          className="btn-ghost px-5 h-9 text-[12px]"
                        >
                          Batal
                        </button>
                        <button
                          onClick={handleSaveMasuk}
                          disabled={savingMasuk}
                          className="btn-primary px-6 h-9 text-[12px] font-bold flex items-center gap-2"
                        >
                          {savingMasuk ? (
                            <><Icon name="Loader2" size={13} className="animate-spin" /> Menyimpan...</>
                          ) : (
                            <><Icon name="Save" size={13} /> {editingMasuk ? 'Perbarui Data' : 'Simpan'}</>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })(), document.body)}
          </div>
        );
      })()}

      {invoiceTypeTab === 'keluar' && activeTab === 'daftar' && (
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
                {/* Search */}
                <div className="relative min-w-[200px]">
                  <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light opacity-60" />
                  <input
                    placeholder="Cari customer atau no invoice..."
                    value={filterInvCustomer}
                    onChange={e => setFilterInvCustomer(e.target.value)}
                    className="input-field pl-9 h-9 text-[12px] w-full"
                  />
                </div>

                {/* Status Bayar Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'status_bayar' ? null : 'status_bayar')}
                    className="input-field h-9 px-3 text-[11px] font-bold flex items-center gap-2 bg-white border border-border-main rounded-xl shadow-xs"
                  >
                    <Icon name="DollarSign" size={12} className="text-text-light opacity-80" />
                    <span>{filterInvStatus === 'all' ? 'Status Bayar' : filterInvStatus}</span>
                    <Icon name="ChevronDown" size={10} className="text-text-light ml-1" />
                  </button>
                  {openDropdown === 'status_bayar' && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setOpenDropdown(null)} />
                      <div className="absolute top-10 left-0 z-30 bg-white border border-border-main rounded-xl shadow-lg py-1.5 min-w-[170px] text-[11px] font-bold text-text-main">
                        <button
                          onClick={() => { setFilterInvStatus('all'); setOpenDropdown(null); }}
                          className="flex items-center justify-between w-full px-4 py-2 hover:bg-slate-50 text-left"
                        >
                          <span>Semua Status</span>
                          {filterInvStatus === 'all' && <Icon name="Check" size={11} className="text-accent" />}
                        </button>
                        {([
                          { key: 'Belum Bayar', color: '#ef4444' },
                          { key: 'Parsial', color: '#f59e0b' },
                          { key: 'Lunas', color: '#10b981' },
                          { key: 'Lebih Bayar', color: '#a855f7' },
                          { key: 'Perlu Verifikasi', color: '#3b82f6' }
                        ] as const).map(({ key, color }) => (
                          <button
                            key={key}
                            onClick={() => { setFilterInvStatus(key); setOpenDropdown(null); }}
                            className="flex items-center justify-between w-full px-4 py-2 hover:bg-slate-50 text-left"
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                              {key}
                            </span>
                            {filterInvStatus === key && <Icon name="Check" size={11} className="text-accent" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Period / Date Range Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      if (period.mode === 'range') {
                        setTempRangeFrom(period.rangeFrom || today());
                        setTempRangeTo(period.rangeTo || today());
                      }
                      setOpenDropdown(openDropdown === 'date_range' ? null : 'date_range');
                    }}
                    className="input-field h-9 px-3 text-[11px] font-bold flex items-center gap-2 bg-white border border-border-main rounded-xl shadow-xs"
                  >
                    <Icon name="Calendar" size={12} className="text-text-light opacity-80" />
                    <span>{formatRangeLabel(period)}</span>
                    <Icon name="ChevronDown" size={10} className="text-text-light ml-1" />
                  </button>
                  {openDropdown === 'date_range' && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setOpenDropdown(null)} />
                      <div className="absolute top-10 left-0 z-30 bg-white border border-border-main rounded-xl shadow-lg p-3 min-w-[280px] text-[11px] font-bold text-text-main flex flex-col gap-2.5">
                        <div className="text-[10px] uppercase tracking-widest text-text-light">Pilih Rentang Tanggal</div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-text-light font-medium">Dari Tanggal</label>
                          <input
                            type="date"
                            className="input-field h-9 px-2 text-[11px] tabular-nums w-full"
                            value={tempRangeFrom}
                            onChange={e => setTempRangeFrom(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-text-light font-medium">Sampai Tanggal</label>
                          <input
                            type="date"
                            className="input-field h-9 px-2 text-[11px] tabular-nums w-full"
                            value={tempRangeTo}
                            onChange={e => setTempRangeTo(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2 justify-end mt-1">
                          <button
                            onClick={() => {
                              setPeriod({ mode: 'all', month: new Date().getMonth(), year: new Date().getFullYear() });
                              setOpenDropdown(null);
                            }}
                            className="btn-ghost h-8 px-3 text-[10px]"
                          >
                            Reset
                          </button>
                          <button
                            onClick={() => {
                              setPeriod({ mode: 'range', rangeFrom: tempRangeFrom, rangeTo: tempRangeTo } as any);
                              setOpenDropdown(null);
                            }}
                            className="btn-primary h-8 px-3 text-[10px]"
                          >
                            Terapkan
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            }
            right={
              <div className="flex items-center gap-2">
                {loadingStatus && (
                  <span className="text-[11px] text-text-light italic flex items-center gap-1">
                    <Icon name="Loader2" size={11} className="animate-spin" /> Cek status...
                  </span>
                )}
                {(filterInvCustomer || filterInvStatus !== 'all' || period.mode !== 'all' || activeKpi !== 'all') && (
                  <button
                    onClick={() => {
                      setFilterInvCustomer("");
                      setFilterInvStatus("all");
                      setPeriod({ mode: "all", month: new Date().getMonth(), year: new Date().getFullYear() });
                      setActiveKpi("all");
                    }}
                    className="btn-ghost h-9 px-3 text-[12px] flex items-center gap-1.5 text-red-500 hover:bg-red-50 border-red-200"
                  >
                    <Icon name="X" size={13} /> Reset
                  </button>
                )}
                <span className="text-[11px] text-text-light">{filteredInvoices.length} invoice</span>
                <button onClick={loadInvoices} disabled={loadingInvoices}
                  className="btn-ghost h-9 px-3 text-[12px] flex items-center gap-1.5 border border-border-main">
                  <Icon name="RefreshCw" size={13} className={loadingInvoices ? "animate-spin" : ""} /> Refresh
                </button>
                <button
                  onClick={handleExportExcel}
                  className="btn-ghost h-9 px-3 text-[12px] flex items-center gap-1.5 border border-border-main"
                >
                  <Icon name="Download" size={13} /> Export
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
                    <th className="w-[130px] text-right">Total</th>
                    <th className="w-[150px] text-right">Sisa Belum Terbayar</th>
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
                            {(inv.so_order_ids || []).map((soId: string, idx: number) => (
                              <React.Fragment key={soId}>
                                <button
                                  onClick={e => { e.stopPropagation(); onSOClick && onSOClick(soId); }}
                                  className="text-[11px] font-black text-accent hover:underline uppercase tracking-tight"
                                >
                                  {soId}
                                </button>
                                {idx < (inv.so_order_ids || []).length - 1 && <span className="text-[10px] text-text-light opacity-50 mr-1">,</span>}
                              </React.Fragment>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-[12px] font-bold text-text-main">
                          {fRp(inv.total_setelah_pajak || 0) + ',00'}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-[12px] font-bold">
                          {(() => {
                            const total_invoice = inv.total_setelah_pajak || 0;
                            const total_paid = paymentStatusMap[inv.no_invoice]?.total_paid || 0;
                            const diff = total_invoice - total_paid;
                            if (diff > 0) {
                              return <span className="text-red-500 font-bold">-Rp {Math.round(diff).toLocaleString('id-ID')},00</span>;
                            } else if (diff < 0) {
                              return <span className="text-green-600 font-bold">+Rp {Math.round(Math.abs(diff)).toLocaleString('id-ID')},00</span>;
                            } else {
                              return <span className="text-text-light font-medium">Rp 0,00</span>;
                            }
                          })()}
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
                      {fRp(filteredInvoices.reduce((s, inv) => s + (inv.total_setelah_pajak || 0), 0)) + ',00'}
                    </td>
                    <td className="py-3 px-4 text-right text-[12px] font-black tabular-nums">
                      {(() => {
                        const sumDiff = filteredInvoices.reduce((s, inv) => {
                          const total_invoice = inv.total_setelah_pajak || 0;
                          const total_paid = paymentStatusMap[inv.no_invoice]?.total_paid || 0;
                          return s + (total_invoice - total_paid);
                        }, 0);
                        if (sumDiff > 0) {
                          return <span className="text-red-500 font-bold">-Rp {Math.round(sumDiff).toLocaleString('id-ID')},00</span>;
                        } else if (sumDiff < 0) {
                          return <span className="text-green-600 font-bold">+Rp {Math.round(Math.abs(sumDiff)).toLocaleString('id-ID')},00</span>;
                        } else {
                          return <span className="text-text-light font-medium">Rp 0,00</span>;
                        }
                      })()}
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
      {invoiceTypeTab === 'keluar' && activeTab === 'buat' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)' }} className="animate-fade-in">

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
                                  className="text-[11px] font-black text-accent uppercase tracking-tight hover:underline"
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
