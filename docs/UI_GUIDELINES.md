# SJM Flow — UI/UX Design Guidelines v1.0
# Dokumen ini adalah source of truth untuk semua keputusan desain di SJM Flow.
# Setiap komponen baru HARUS mengikuti panduan ini.

---

## 1. PRINSIP DASAR

1. **Konsistensi di atas kreativitas** — Gunakan komponen yang sudah ada, jangan buat inline style baru.
2. **Token dulu, utility kemudian** — Pakai CSS variables dari `@theme` sebelum Tailwind utility.
3. **Komponen shared dulu** — Cek `SJMComponents.tsx` sebelum buat elemen baru.
4. **Satu sumber kebenaran** — `index.css` adalah tempat semua class komponen. Jangan definisikan style di file `.tsx`.

---

## 2. WARNA (Color Tokens)

### Brand
- Primary/Accent: `var(--color-accent)` → `#EB5E28` (orange)
- Hover: `var(--color-accent-dark)` → `#D4531F`
- Light bg: `var(--color-accent-light)` → `#FCEEE8`

### Background
- Page: `var(--color-bg)` → `#F5F4F1` (warm grey)
- Card: `var(--color-bg-card)` → `#FFFFFF`
- Sidebar: `var(--color-bg-side)` → `#252422`

### Text
- Heading: `var(--color-text-main)` → `#252422`
- Body: `var(--color-text-med)` → `#524F4A`
- Caption/Label: `var(--color-text-light)` → `#6B6862`

### Status (Semantic)
- Success/Lunas: `var(--color-success)` → `#6B8E23`
- Error/Belum Bayar: `var(--color-error)` → `#B85450`
- Warning/Parsial: `var(--color-warning)` → `#C4914A`
- Info: `var(--color-info)` → `#4A6FA5`

### Border
- Default: `var(--color-border-main)` → `#E8E6E1`
- Strong: `var(--color-border-dark)` → `#CCC5B9`

### LARANGAN
❌ JANGAN hardcode warna seperti `#FF8F00`, `#FFC840`, `text-red-500`, `bg-green-500`
✅ GUNAKAN token: `text-accent`, `bg-accent/10`, `text-error`, `bg-success-light`

---

## 3. TIPOGRAFI

### Font
- Family: `Inter` (sudah di-set via `--font-sans`)
- Mono: untuk nomor invoice/SO/jurnal → tambahkan `font-mono tabular-nums`

### Ukuran (gunakan konsisten)
- Page title (h1): `text-[22px] font-black tracking-tight text-text-main`
- Section header: `text-[15px] font-black text-text-main`
- Table header: `text-[10px] font-bold uppercase tracking-widest text-text-light opacity-70`
- Table body: `text-[12px] text-text-main`
- Label form: `text-[10px] font-bold uppercase tracking-widest text-text-light mb-1.5 block`
- Caption/sub: `text-[10px] text-text-light italic`
- Badge: `text-[8px] font-bold uppercase`
- Nomor (invoice/SO): `text-[11px] font-black italic uppercase tracking-tight text-accent`

### LARANGAN
❌ JANGAN mix ukuran acak: `text-xs`, `text-sm`, `text-base` tanpa konsistensi
✅ GUNAKAN ukuran pixel eksplisit dari daftar di atas

---

## 4. KOMPONEN UI

### 4.1 Tombol (Button)

```
PRIMARY   → className="btn-primary"         (orange solid, untuk aksi utama)
SECONDARY → className="btn-secondary"        (outline, untuk aksi sekunder)
GHOST     → className="btn-ghost"            (text only, untuk aksi ringan)
DANGER    → className="btn-danger"           (merah, untuk hapus/destruktif)
EXPORT    → className="btn-export"           (untuk export PDF/Excel)
```

**Height standar tombol: h-9 (36px)**
**Gap antar tombol: gap-2**

```tsx
// ✅ BENAR
<button className="btn-primary h-9 px-4 text-[12px] flex items-center gap-2">
  <Icon name="Plus" size={14} /> Tambah
</button>

// ❌ SALAH
<button className="bg-orange-500 text-white px-4 py-2 rounded-lg">
  Tambah
</button>
```

### 4.2 Input Field

```
INPUT     → className="input"               (text input standar)
SELECT    → className="input"               (select element)
TEXTAREA  → className="input resize-none"   (textarea)
```

**Tinggi standar input: h-9 (36px) untuk inline, auto untuk form**

```tsx
// ✅ BENAR
<input className="input w-full text-[12px]" placeholder="..." />
<label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1.5 block">
  Label Field *
</label>

// ❌ SALAH
<input className="border rounded px-3 py-2 text-sm" />
```

### 4.3 Card / Container

```tsx
// Page card (section dalam form)
<div className="bg-white rounded-2xl border border-border-main p-5 space-y-4">
  <div className="text-[10px] font-black text-text-light uppercase tracking-widest opacity-60">
    🔖 Nama Section
  </div>
  {/* konten */}
</div>

// KPI Card → gunakan <StatCard /> dari SJMComponents
<StatCard label="Total SO" value="293" icon="Package" color="var(--color-accent)" />

// Table container
<div className="table-container max-h-[calc(100vh-280px)]">
  <table className="w-full border-collapse">...</table>
</div>
```

### 4.4 Table

```tsx
// Header
<thead>
  <tr>
    <th className="text-left">Kolom</th>  // th sudah punya style dari CSS global
  </tr>
</thead>

// Row
<tbody className="divide-y divide-border-main/20">
  <tr className="hover:bg-accent/5 cursor-pointer transition-colors group">
    <td className="py-3 px-4 text-[12px]">...</td>
  </tr>
</tbody>
```

### 4.5 Badge / Status

```tsx
// Gunakan badge class + inline color untuk status dinamis
const sc = STATUS_COLOR[status] || '#666';
<span className="badge" style={{ backgroundColor: sc + '20', color: sc }}>
  {status}
</span>

// Status tetap
<span className="badge badge-success">Lunas</span>
<span className="badge badge-error">Belum Bayar</span>
<span className="badge badge-warning">Parsial</span>
```

### 4.6 Modal / Dialog

```tsx
// Overlay
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
  onClick={onClose}>
  
  // Container
  <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col"
    onClick={e => e.stopPropagation()}>
    
    // Header modal
    <div className="flex items-center justify-between p-5 border-b border-border-main">
      <div className="font-black text-[15px] text-text-main">Judul Modal</div>
      <button className="p-2 rounded-full hover:bg-slate-100 transition-colors"
        onClick={onClose}>
        <Icon name="X" size={18} className="text-text-med" />
      </button>
    </div>
    
    // Body
    <div className="flex-1 overflow-y-auto p-5">...</div>
    
    // Footer
    <div className="flex gap-2 p-5 border-t border-border-main">
      <button className="btn-ghost h-9 px-4 text-[12px]">Batal</button>
      <button className="btn-primary h-9 px-4 text-[12px]">Simpan</button>
    </div>
  </div>
</div>
```

### 4.7 Form Layout (Full Page, bukan popup)

```tsx
// Header halaman
<div className="flex items-center justify-between mb-5">
  <div>
    <h1 className="text-[22px] font-black text-text-main tracking-tight">Judul</h1>
    <p className="text-[12px] text-text-med mt-0.5">Sub judul</p>
  </div>
  <button className="btn-primary h-9 px-4 text-[12px] flex items-center gap-2">
    <Icon name="List" size={14} /> Daftar
  </button>
</div>

// Form sections
<div className="space-y-6 max-w-3xl">
  <div className="bg-white rounded-2xl border border-border-main p-5 space-y-4">
    <div className="text-[10px] font-black text-text-light uppercase tracking-widest opacity-60">
      📋 Nama Section
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1.5 block">
          Field Label *
        </label>
        <input className="input w-full text-[12px]" />
      </div>
    </div>
  </div>
  
  // Tombol aksi di bawah
  <div className="flex items-center gap-3 pb-6">
    <button className="btn-ghost h-9 px-4 text-[12px] flex items-center gap-2">
      <Icon name="X" size={14} /> Batal
    </button>
    <button className="btn-primary h-9 px-5 text-[12px] flex items-center gap-2">
      <Icon name="Save" size={14} /> Simpan
    </button>
  </div>
</div>
```

### 4.8 Empty State

```tsx
// Gunakan komponen EmptyState dari SJMComponents
<EmptyState colSpan={8} msg="Belum ada data" icon="Search" />

// Untuk non-table context
<div className="flex flex-col items-center gap-3 py-16 text-text-light">
  <Icon name="Search" size={32} strokeWidth={1.5} className="opacity-30" />
  <div className="text-[13px] font-bold">Belum ada data</div>
  <div className="text-[11px] opacity-60">Ganti filter atau tambah data baru</div>
</div>
```

### 4.9 Loading State

```tsx
// Inline loading
{loading ? (
  <div className="text-center py-12">
    <Spinner center size={24} />
    <div className="text-[12px] text-text-light mt-3">Memuat data...</div>
  </div>
) : (...)}

// Tombol loading
<button className="btn-primary h-9 px-4" disabled={saving}>
  {saving ? <><Spinner size={14} /> Menyimpan...</> : 'Simpan'}
</button>
```

---

## 5. LAYOUT & SPACING

### Margin & Padding
- Page padding: sudah di-handle `PageShell` → jangan tambah padding lagi
- Section gap: `space-y-6` antar section form, `space-y-4` dalam section
- Card padding: `p-5` (20px)
- Table cell: `py-3 px-4`
- Filter bar margin bawah: `mb-4`
- Tombol gap: `gap-2`

### Grid
- Form 2 kolom: `grid grid-cols-2 gap-4`
- Form 3 kolom: `grid grid-cols-3 gap-4`
- KPI grid: gunakan `<KPIGrid cols={5}>` dari SJMComponents

### Border Radius
- Card/modal besar: `rounded-2xl` (20px)
- Tombol/input: `rounded-lg` (10px)
- Badge: `rounded-full`
- Icon container: `rounded-xl` (14px)

---

## 6. SHADOW

```
xs  → var(--shadow-xs)   Sangat ringan, border saja
sm  → var(--shadow-sm)   Card default
md  → var(--shadow-md)   Card hover / modal
lg  → var(--shadow-lg)   Dropdown / popover
xl  → var(--shadow-xl)   Modal utama
```

---

## 7. ANIMASI

```tsx
// Fade up saat mount (sudah di PageShell)
className="fade-up"

// Hover transition
className="transition-colors duration-150"
className="transition-all duration-200"

// Opacity hover (aksi tersembunyi di row tabel)
className="opacity-0 group-hover:opacity-100 transition-opacity"
```

---

## 8. ICON

Gunakan `<Icon />` dari SJMComponents — wrapper Lucide React.

```tsx
import { Icon } from '@/src/components/SJMComponents';

<Icon name="Plus" size={14} />           // dalam tombol
<Icon name="Download" size={13} />        // aksi tabel
<Icon name="RefreshCw" size={12} />       // refresh
<Icon name="X" size={18} />              // close modal
<Icon name="Trash2" size={13} />          // hapus
<Icon name="Save" size={14} />            // simpan
<Icon name="ChevronRight" size={14} />    // navigasi
```

**LARANGAN**
❌ JANGAN import langsung dari `lucide-react`
✅ GUNAKAN `<Icon name="..." />` selalu

---

## 9. TOAST / NOTIFIKASI

```tsx
// Dari useToast hook (SJMComponents)
const { showToast, ToastUI } = useToast();

showToast('Berhasil disimpan', 'success');
showToast('Terjadi kesalahan', 'error');
showToast('Perhatian', 'warning');
showToast('Info', 'info');

// Render di JSX (harus ada di return)
{ToastUI}
```

---

## 10. ERROR HANDLING PATTERN

```tsx
// Setiap async function harus punya try/catch + toast
const handleSave = async () => {
  setSaving(true);
  try {
    await api.doSomething();
    showToast('Berhasil', 'success');
    onSuccess();
  } catch (err: any) {
    showToast(err.message || 'Terjadi kesalahan', 'error');
  } finally {
    setSaving(false);
  }
};
```

---

## 11. NOMOR FORMAT

```tsx
// Rupiah
import { fmt } from '@/src/utils';
fmt(15250000) // → "Rp 15.250.000"

// Atau manual
'Rp ' + Math.round(n).toLocaleString('id-ID')

// Nomor SO/Invoice/Jurnal → selalu font-mono
className="font-mono tabular-nums text-accent font-black"
```

---

## 12. CHECKLIST SEBELUM COMMIT

Sebelum setiap commit yang menyentuh UI, pastikan:

- [ ] Tidak ada hardcode warna (misal `#FF8F00`, `bg-orange-500`)
- [ ] Tombol pakai `btn-primary`, `btn-ghost`, atau `btn-secondary`
- [ ] Input pakai class `input`
- [ ] Semua async function punya try/catch + showToast
- [ ] Loading state ada untuk operasi > 500ms
- [ ] Modal punya overlay click-to-close
- [ ] Tabel punya empty state
- [ ] Font size konsisten dengan panduan di atas
- [ ] Tidak ada `style={{}}` inline kecuali untuk dynamic color dari data
- [ ] Icon menggunakan `<Icon />` bukan import langsung lucide

---

## 13. KOMPONEN YANG WAJIB DIPAKAI (dari SJMComponents.tsx)

| Kebutuhan | Komponen |
|-----------|----------|
| Layout halaman | `<PageShell>` |
| Header halaman | `<PageHeader title sub action>` |
| Filter + tombol bar | `<ActionBar left right>` |
| KPI grid | `<KPIGrid cols={n}>` |
| KPI card | `<StatCard label value sub icon color>` |
| Loading spinner | `<Spinner size center>` |
| Empty state di tabel | `<EmptyState colSpan msg icon>` |
| Icon | `<Icon name size className>` |
| Card container | `<Card className>` |

---

## 14. ANTI-PATTERNS (JANGAN DILAKUKAN)

❌ Inline style untuk layout: `style={{ marginTop: '24px' }}`
❌ Hardcode warna: `style={{ color: '#FF8F00' }}`  
❌ Class Tailwind untuk button dari scratch: `className="bg-blue-500 text-white px-4 py-2 rounded"`
❌ Import Lucide langsung: `import { Plus } from 'lucide-react'`
❌ Font size Tailwind default: `text-sm`, `text-xs`, `text-base`
❌ Async tanpa try/catch
❌ Loading state tanpa disabled button
❌ Form tanpa validasi sebelum submit
❌ Delete tanpa konfirmasi modal

