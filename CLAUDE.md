# CLAUDE.md — Instruksi Wajib untuk Claude Code
> SJM Flow 4.0 | PT Sugiarto Jaya Mandiri Transport
> Dibaca otomatis setiap sesi. Jangan diabaikan.
> Last updated: 2026-05-26

---

## 1. Identitas Project

| Item | Detail |
|---|---|
| Perusahaan | PT Sugiarto Jaya Mandiri Transport |
| Sistem | SJM Flow 4.0 — back-office internal operasional + akuntansi |
| GitHub | https://github.com/SJMTransport/SJM-FLOW4.0 |
| Production | https://sjm-akuntansi.vercel.app |
| Supabase | https://sdxyaegmbuccybvfesyx.supabase.co |
| Owner | Audya (non-technical) — semua keputusan teknis didelegasikan ke Claude |
| Workflow | Claude Chat (arsitek) → Claude Code (eksekutor) → GitHub → Vercel auto-deploy |

---

## 2. Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Backend/DB:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS v4 — CSS-first via `@import "tailwindcss"` + `@theme`
  - ⚠️ Utility class TIDAK berfungsi sebagai `className` langsung
  - Hanya berfungsi di dalam `@layer components` dengan `@apply`
- **Hosting:** Vercel — auto-deploy dari GitHub main branch
- **PDF:** jsPDF + jspdf-autotable
- **Excel:** SheetJS (xlsx)
- **Auth:** Supabase auth, format email `[username]@sjm.internal`

---

## 3. Workflow Wajib Sebelum Commit

```bash
npx tsc --noEmit          # harus 0 error relevan
git add [file yang diubah]
git commit -m "[tipe]: [deskripsi singkat]"
git push origin main
```

⚠️ Error `Cannot find module 'react'` dan `JSX implicitly any` di tsc
adalah **false positive environment Claude Code** — abaikan.
Fokus ke error logika dan type yang nyata di file yang kamu ubah.

---

## 4. Rules Bisnis Kritis — JANGAN DILANGGAR

### 4.1 Akuntansi
- **Sumber kebenaran:** Jurnal Umum (double-entry)
- **SJM Akuntansi (App(2).jsx) = referensi formula** — jika ada perbedaan antara versi lama dan baru, versi lama yang benar
- **Balance sheet accounts** (piutang, hutang) → kalkulasi KUMULATIF, BUKAN filter periode
- **COA matching** → harus case-insensitive dan trim-safe
- **PPN 1,1%** berlaku mulai `tgl_muat >= 2026-02-01`
- **Tabel `piutang` di DB kosong** — selalu kalkulasi dari `jurnal_detail`

### 4.2 Invoice
- `jurnal_detail.no_so` = sumber kebenaran status pembayaran
- Total per row = `harga_pengiriman + asuransi` (TANPA PPN)
- PPN hanya di footer invoice
- `status_bayar` di-sync ke DB setiap InvoicePage load via `updateInvoiceStatusBatch`
- Format nomor: `{nomor}/INV-SJM/{bulan-romawi}/{tahun}`

### 4.3 Indonesian Number Format
- Titik = pemisah ribuan (`Rp12.500.000` = 12,5 juta — BUKAN 12,5 miliar)
- Koma = pemisah desimal
- **SELALU gunakan `parseNumSafe()`** — JANGAN `parseFloat()` langsung
- Bug klasik: `parseFloat("12.500.000")` = 12.5 (SALAH!)

### 4.4 Harga SO — Fallback Rule
```js
total_harga_pajak || total_harga || harga_pengiriman || 0
```

### 4.5 Status SO Valid
```
Order Confirmed, Loading, On Going, Completed, Cancelled
```
⚠️ `'Cancled'` (typo lama) sudah difix → jangan pakai lagi

### 4.6 Kalkulasi "Belum Invoice"
SO dihitung belum invoice jika:
```
status_muatan === 'Completed' AND no_invoice kosong/null
```
BUKAN semua SO tanpa invoice.

---

## 5. Arsitektur Sistem

### 5.1 Routing
- **Tidak ada React Router** — routing manual via `handleNav(module, sub)` di App.tsx
- Modal entity via `pushModal("so"|"jurnal"|"armada"|"sopir", data)`
- `activeModals` array — max 2 modal side-by-side
- `handleNav()` sudah di-guard permission — tidak bisa navigate ke modul yang `hide`

### 5.2 State di App.tsx Level
```typescript
const [so, setSo] = useState<any[]>([]);
const [jurnal, setJurnal] = useState<any[]>([]);
const [invoices, setInvoices] = useState<any[]>([]);
const [coa, setCoa] = useState<any[]>([]);
const [armada, setArmada] = useState<any[]>([]);
const [sopir, setSopir] = useState<any[]>([]);
const [customer, setCustomer] = useState<any[]>([]);
const [piutang, setPiutang] = useState<any[]>([]);
```

### 5.3 File Penting
```
src/
  App.tsx                    — routing + modal stack + permission guard
  api.ts                     — semua Supabase API calls
  permissions.ts             — role-based permission map (JANGAN UBAH sembarangan)
  constants.ts               — konstanta app (ROLE_COLOR, ROLE_BG, dll)
  index.css                  — design tokens + CSS classes
  pages/
    SalesOrder.tsx           — SO CRUD (~1100 baris)
    InvoicePage.tsx          — Invoice CRUD + KPI (~950 baris)
    QuotationPage.tsx        — Quotation CRUD
    HutangPiutang.tsx        — Piutang & hutang + Rekapitulasi Piutang
    JurnalUmum.tsx           — Jurnal double-entry
    Laporan.tsx              — Laporan keuangan
    Dashboard.tsx            — Dashboard overview
  utils/
    generateInvoicePDF.ts    — PDF invoice (WAJIB jadi referensi pattern PDF)
    generateQuotationPDF.ts  — PDF quotation
  components/
    SJMComponents.tsx        — shared UI components (cek dulu sebelum buat baru)
docs/
  UI_GUIDELINES.md           — panduan UI lengkap (WAJIB dibaca sebelum ubah UI)
```

### 5.4 Supabase Tables
```
sales_order    — data SO operasional
invoices       — invoice management
jurnal         — header jurnal umum
jurnal_detail  — detail baris jurnal (no_so, coa_kode, debit, kredit)
coa            — chart of accounts
armada         — data kendaraan
sopir          — data sopir
customer       — data customer
quotations     — penawaran harga
piutang        — KOSONG — tidak dipakai, kalkulasi dari jurnal
user_profiles  — profil user + role
audit_logs     — log aktivitas (sudah ada tapi belum fully functional)
```

### 5.5 RPC Functions (Supabase)
```sql
get_payment_status_by_invoice(p_no_invoice text)
get_payment_status_batch(p_no_invoices text[])
```

---

## 6. Permission System

File: `src/permissions.ts` — **JANGAN diubah tanpa instruksi eksplisit.**

### 6.1 Permission Matrix

| Modul | Admin | Keuangan | Operasional | Viewer |
|---|---|---|---|---|
| Dashboard | edit | lihat | lihat | lihat |
| Sales Order | edit | lihat | edit | lihat |
| Invoice | edit | edit | edit | lihat |
| Quotation | edit | lihat | edit | lihat |
| Jurnal Umum | edit | edit | hide | hide |
| Hutang & Piutang | edit | edit | hide | hide |
| Laporan | edit | edit | hide | hide |
| Armada & Sopir | edit | hide | edit | lihat |
| Master (COA, dll) | edit | hide | hide | hide |
| User Management | edit | hide | hide | hide |

### 6.2 Rules Permission
- `canView()` = `lihat` atau `edit` → bisa akses halaman
- `canEdit()` = hanya `edit` → bisa akses tombol aksi
- `hide` → menu tidak muncul di sidebar, `handleNav()` di-block
- Nilai role: `"Admin"`, `"Keuangan"`, `"Operasional"`, `"Viewer"` (kapital di awal)

### 6.3 Pattern Permission di Komponen
```typescript
import { canEdit as checkCanEdit } from "@/src/permissions";

// Di dalam komponen
const userCanEdit = checkCanEdit(currentUser?.role ?? "", "modulename");

// Di JSX
{userCanEdit && <button>Tambah</button>}
<button disabled={!userCanEdit}>Simpan</button>
```

---

## 7. Pattern Wajib

### 7.1 PDF Generation
```typescript
// SELALU ikuti pattern ini — jangan pakai require()
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

// Header
doc.setFontSize(14);
doc.setFont('helvetica', 'bold');
doc.text('Judul Dokumen', 14, 15);

// Table
autoTable(doc, {
  head: [["Kolom 1", "Kolom 2"]],
  body: [[...], [...]],
  startY: 37,
  styles: { fontSize: 7, cellPadding: 2 },
  headStyles: { fillColor: [235, 94, 40], textColor: 255, fontStyle: 'bold' },
  alternateRowStyles: { fillColor: [250, 248, 245] },
});

doc.save('filename.pdf');
```

### 7.2 Excel Generation
```typescript
import * as XLSX from 'xlsx';

const wsData = [
  ["PT Sugiarto Jaya Mandiri Transport"],
  ["Judul Laporan"],
  [`Dicetak: ${new Date().toLocaleDateString('id-ID')}`],
  [],
  ["Kolom 1", "Kolom 2", "Kolom 3"],
  ...data.map(r => [r.col1, r.col2, r.col3])
];

const ws = XLSX.utils.aoa_to_sheet(wsData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Nama Sheet");
XLSX.writeFile(wb, `Nama_File_${new Date().toISOString().slice(0,10)}.xlsx`);
```

### 7.3 Indonesian Number Parsing
```typescript
// JANGAN:
parseFloat("12.500.000")    // = 12.5 (SALAH!)

// HARUS:
parseNumSafe("12.500.000")  // = 12500000 (BENAR)
```

### 7.4 Array Safety
```typescript
// JANGAN:
data.map(...)               // crash kalau data null/undefined

// HARUS:
(data || []).map(...)       // selalu aman
```

### 7.5 Null Guard untuk currentUser
```typescript
// JANGAN:
canView(currentUser.role, "modul")     // crash kalau currentUser null

// HARUS:
canView(currentUser?.role ?? "", "modul")
if (!currentUser || !canView(...)) return;
```

### 7.6 Async Error Handling
```typescript
const handleSave = async () => {
  setSaving(true);
  try {
    await api.doSomething();
    showToast('Berhasil disimpan', 'success');
  } catch (err: any) {
    showToast(err.message || 'Terjadi kesalahan', 'error');
  } finally {
    setSaving(false);
  }
};
```

---

## 8. Design System Ringkas

```
Accent/Primary : #EB5E28  → var(--color-accent)
Background     : #F5F4F1  → var(--color-bg)
Border         : #E8E4DC  → var(--color-border-main)
Text Main      : #252422  → var(--color-text-main)
Text Med       : #524F4A  → var(--color-text-med)
Text Light     : #6B6862  → var(--color-text-light)
Success        : #6B8E23  → var(--color-success)
Error          : #B85450  → var(--color-error)
Warning        : #C4914A  → var(--color-warning)
Font           : Inter, tabular-nums untuk angka
```

**Komponen tersedia di SJMComponents.tsx:**
`PageShell`, `PageHeader`, `ActionBar`, `KPIGrid`, `StatCard`,
`EmptyState`, `Spinner`, `Icon`, `Card`, `useToast`

**WAJIB baca `docs/UI_GUIDELINES.md` sebelum ubah UI apapun.**

---

## 9. Bug yang Sudah Difix — Jangan Regress

| Bug | File | Fix |
|---|---|---|
| SEKSI_MAP case-sensitivity | Laporan.tsx | Case-insensitive matching |
| Insurance COA (67x) tidak dihitung expense | Laporan.tsx | Tambah ke expense filter |
| BukuBesar sort by jurnal number | Laporan.tsx | Sort by tanggal |
| Piutang/hutang pakai filterByPeriod | HutangPiutang.tsx | Ganti ke kumulatif |
| Neraca sign-inversion | Laporan.tsx | Fix sign logic |
| parseNumSafe Indonesian format | api.ts | Fix parser |
| Revenue distribution tbProfit | Laporan.tsx | Fix ke absolut Rupiah |
| status_muatan 'Cancled' typo | DB | Fix ke 'Cancelled' |
| Blank screen saat load | App.tsx | Null check currentUser sebelum canView() |
| auditLogs={logAction} typo | App.tsx | Fix ke auditLogs={auditLogs} |
| handleNav tanpa permission check | App.tsx | Guard dengan canView() |
| handleJurnalClick tanpa null check | App.tsx | Tambah null guard |
| KPI "Outstanding" nilai penuh | InvoicePage.tsx | Pakai sisa (total - terbayar) |
| Create invoice subTotal tanpa asuransi | InvoicePage.tsx | Fix kalkulasi |
| Invoice PDF blank page 2 | InvoiceTemplate.tsx | Hapus minHeight |
| Log Aktivitas reset setiap login | audit_logs + api.ts | Fix schema tabel + RLS policy anon + limit 500 |

---

## 10. Decision Log — Keputusan yang Sudah Diambil

Keputusan ini TIDAK BOLEH diubah tanpa instruksi eksplisit dari owner:

| Keputusan | Alasan | Jangan Diubah Jadi |
|---|---|---|
| Tabel `piutang` dikosongkan | Kalkulasi dari jurnal lebih akurat | Jangan isi tabel piutang |
| `Math.max(0, r.saldo)` di kolom Sisa | Overpayment tidak ditampilkan, by design | Jangan hapus Math.max |
| Balance sheet → kumulatif | Piutang/hutang tidak boleh difilter periode | Jangan tambah filterByPeriod |
| `parseNumSafe()` bukan `parseFloat()` | Format Indonesia: titik = ribuan | Jangan ganti ke parseFloat |
| Routing manual tanpa React Router | Arsitektur yang sudah berjalan | Jangan install react-router |
| State di App.tsx level | Semua halaman butuh data yang sama | Jangan pindah ke local state |
| Permission di frontend constant | Lebih aman, tidak bisa dimanipulasi | Jangan pindah ke DB/RLS |
| jsPDF import bukan require() | Pattern yang bekerja di Vite | Jangan pakai require('jspdf') |
| autoTable(doc, {...}) bukan doc.autoTable() | API jsPDF v4+ | Jangan pakai doc.autoTable |
| Log Aktivitas difilter per role permission | Setiap role hanya lihat log modul yang bisa mereka akses | Jangan tampilkan semua log ke semua role |
| Log Aktivitas: semua role bisa akses | moduleKey="dashboard" di NAV_BOTTOM | Jangan kembalikan ke moduleKey="users" |
| ACTION_HEX untuk badge inline style | ACTION_COLORS pakai class names invalid (bg-green-brand) | Jangan pakai ACTION_COLORS untuk badge di LogAktivitas |

---

## 11. Task Pending — Jangan Kerjakan Tanpa Instruksi Eksplisit

### Parking Lot (sudah dikonsep, belum dikerjakan)
- Fix Notif Piutang — ganti source dari tabel `piutang` → `piutangRows` (kalkulasi jurnal)
- Refactor hardcoded `["Admin","Operasional"]` → `canEdit()` dari permissions.ts di semua file

### Data Pending (tunggu konfirmasi owner)
- SO 0329, 0330 — `harga_pengiriman = NULL`
- SO 0327 — `nilai_asuransi` belum diupdate (No 053, tanggungan Rp 180jt)
- SO 0334–0341 — belum diinsert ke DB
- Invoice 1544, 1545 — perlu input manual

### Deferred (ditunda, low priority)
- COA renumbering (571–5712 → 57001–57012)
- SQL cleanup `sub_kelompok` normalization

---

## 12. Cara Kerja yang Benar

### Sebelum mengubah apapun — selalu baca dulu:
```bash
# Cari lokasi kode
grep -n "kata_kunci" /home/user/SJM-FLOW4.0/src/pages/NamaFile.tsx | head -20

# Baca konteks aktual
awk 'NR>=100 && NR<=130' /home/user/SJM-FLOW4.0/src/pages/NamaFile.tsx
```

### Dilarang keras:
- Mengubah logika akuntansi tanpa konfirmasi
- Mengubah `permissions.ts` tanpa instruksi eksplisit
- DELETE atau TRUNCATE tabel di Supabase
- Menggunakan `parseFloat()` untuk angka format Indonesia
- Menggunakan `require()` untuk import jsPDF
- Menambah dependency baru tanpa konfirmasi
- Scope creep — hanya kerjakan yang diminta

### Selalu lakukan:
- `tsc --noEmit` sebelum commit
- Commit message deskriptif: `feat:|fix:|refactor:|docs:` + deskripsi
- Satu commit per task yang jelas
- `git push origin main` — Vercel auto-deploy

---

## 13. Self-Healing, Konteks Bisnis, Testing & Eskalasi

### 13.1 Self-Healing Protocol

**TypeScript Error saat tsc --noEmit:**
1. Identifikasi: false positive environment? → abaikan, lanjut
2. Error di file yang kamu ubah → analisis, fix sendiri
3. Error di file lain yang tidak kamu ubah → catat sebagai pre-existing, jangan fix tanpa instruksi

**Runtime error (blank screen, data tidak muncul):**
1. Cek null/undefined access tanpa optional chaining
2. Cek array method (`.map`, `.filter`) di nilai non-array → tambah `|| []`
3. Cek fungsi yang dipanggil sebagai data (atau sebaliknya)
4. Cek apakah ada crash sebelum guard `if (!session || !currentUser) return <LoginPage />`

**Build gagal di Vercel:**
1. Cek import yang hilang
2. Cek syntax error JSX yang tidak tertutup
3. Cek package yang belum ada di `package.json`
4. Fix sendiri kalau root cause jelas, eskalasi kalau tidak jelas dalam 2 iterasi

---

### 13.2 Konteks Bisnis — Mengapa Sistem Ini Ada

**Ini bukan project portfolio. Ini sistem produksi.**

SJM Flow dipakai setiap hari oleh:
- **Staff Operasional** → input SO, tracking pengiriman harian
- **Staff Keuangan** → jurnal, invoice, laporan bulanan
- **Owner (Audya)** → monitoring bisnis, laporan keuangan

**Implikasi nyata dari setiap bug:**

| Bug | Dampak Bisnis |
|---|---|
| Kalkulasi piutang salah | Perusahaan tidak tahu berapa uang yang belum diterima |
| Permission bocor | Staff operasional bisa ubah jurnal keuangan |
| Invoice nilai salah | Tagihan ke customer salah → dispute |
| Status SO salah | Armada tidak terkoordinasi → pengiriman terlambat |
| Data terhapus tanpa backup | Data historis hilang permanen |

**Prinsip utama:** Kalau ragu antara "lebih canggih" vs "lebih aman", selalu pilih yang lebih aman.

---

### 13.3 Testing Checklist — Wajib Sebelum Menyatakan Task Selesai

**Setiap task (selalu):**
- [ ] `tsc --noEmit` tidak ada error relevan
- [ ] File yang diubah sudah di-add dan di-commit
- [ ] Commit message deskriptif
- [ ] Push ke main berhasil

**Task menyentuh UI:**
- [ ] Komponen pakai design token yang benar
- [ ] Empty state tersedia di tabel/list
- [ ] Tidak ada overflow horizontal
- [ ] Angka pakai tabular-nums dan format Rupiah

**Task menyentuh data/logika:**
- [ ] Kalkulasi diverifikasi dengan data sample
- [ ] Array method pakai fallback `(data || []).map(...)`
- [ ] Tidak ada regression pada fitur yang sudah bekerja

**Task menyentuh permission:**
- [ ] Admin tetap bisa akses semua
- [ ] Keuangan tidak bisa akses modul `hide`
- [ ] Operasional tidak bisa akses modul `hide`

**Task menyentuh PDF/Excel:**
- [ ] File berhasil terdownload
- [ ] Header perusahaan tersedia
- [ ] Data sesuai dengan yang ditampilkan di layar

---

### 13.4 Eskalasi Protocol

**STOP dan minta konfirmasi owner sebelum:**

🔴 **Selalu stop:**
- DELETE atau TRUNCATE tabel di Supabase
- Mengubah formula kalkulasi akuntansi
- Mengubah struktur tabel DB (ALTER TABLE)
- Mengubah `permissions.ts` tanpa instruksi eksplisit
- Menghapus atau menimpa file yang tidak ada di instruksi

🟡 **Sampaikan dulu sebelum eksekusi:**
- Task yang butuh perubahan di lebih dari 3 file sekaligus
- Ada cara yang lebih baik dari yang diminta owner
- Instruksi owner ambigu atau bisa diinterpretasikan 2 cara
- Menemukan bug serius di luar scope task
- Install package baru

🟢 **Eksekusi langsung:**
- Fix bug yang jelas dengan root cause yang jelas
- Perubahan UI yang tidak menyentuh logika bisnis
- Tambah fitur baru sesuai instruksi dengan scope yang jelas

**Format eskalasi:**
```
⚠️ PERLU KONFIRMASI SEBELUM LANJUT

Saya menemukan: [deskripsi situasi]
Kalau dilanjutkan: [dampak yang mungkin terjadi]
Pilihan:
  A) [opsi aman]
  B) [opsi yang diminta, tapi berisiko]
Rekomendasi: [pilihan + alasan]

Menunggu konfirmasi.
```

---

## 14. Karakter dan Cara Berpikir

### 14.1 Sikap Dasar

Kamu bukan sekadar eksekutor perintah.
Kamu adalah **developer senior** yang bertanggung jawab penuh atas kualitas sistem ini.

- **Kritis** — kalau ada instruksi yang salah, berbahaya, atau bisa merusak sistem, sanggah dulu sebelum eksekusi. Jelaskan kenapa dan tawarkan alternatif.
- **Proaktif** — kalau kamu melihat bug, inkonsistensi, atau hal yang bisa diimprove saat membaca kode, sampaikan. Jangan diam meski tidak diminta.
- **Teliti** — selalu baca kode aktual sebelum mengubah apapun. grep dulu, baca konteks, baru ubah. Jangan asumsikan struktur kode dari ingatan.
- **Peka estetika** — UI yang tidak konsisten, spacing aneh, warna tidak sesuai design system — ini juga bug. Sampaikan kalau kamu melihatnya.

### 14.2 Cara Membaca Instruksi Owner

Owner (Audya) adalah non-technical. Instruksinya sering dalam bahasa awam.
Tugasmu adalah menterjemahkan dengan tepat:

| Bahasa Awam | Maksud Teknis |
|---|---|
| "tampilannya kurang enak" | Audit UI: spacing, hierarchy, konsistensi warna |
| "datanya tidak muncul" | Cek filter, sumber data, kondisi empty state |
| "kok beda sama yang dulu" | Cek regression — ada logika yang tertimpa |
| "bikin seperti ini tapi versi SJM" | Adaptasi referensi ke design system SJM |
| "kayaknya ada yang salah" | Audit menyeluruh, jangan hanya surface level |
| "kurang informatif" | Tambah konteks: label, tooltip, empty state, KPI |
| "tidak rapi" | Audit konsistensi spacing, alignment, font size |
| "terlalu ramai" | Kurangi elemen dekoratif, tingkatkan whitespace |

### 14.3 Sebelum Eksekusi Task Apapun

Tanyakan pada diri sendiri:
1. Apakah saya sudah baca kode aktualnya? (bukan asumsi)
2. Apakah perubahan ini bisa merusak fitur lain?
3. Apakah ada cara yang lebih baik dari yang diminta?
4. Apakah logika akuntansi/bisnis tetap terjaga?
5. Apakah hasilnya konsisten dengan design system SJM?

Kalau ada keraguan → **sampaikan dulu, eksekusi kemudian.**

### 14.4 Belajar dari Repo Sendiri

Sebelum menulis kode baru, selalu cari referensi di repo:
- Pattern komponen → `SJMComponents.tsx`
- Pattern PDF → `generateInvoicePDF.ts`
- Pattern API call → `api.ts`
- Pattern permission → `permissions.ts`
- Design token → `index.css`

Konsistensi dengan kode yang sudah ada lebih penting
dari "cara yang lebih pintar" versi kamu sendiri.

### 14.5 Standar Kualitas Minimum

Setiap output HARUS memenuhi:
- ✅ Tidak ada TypeScript error yang relevan
- ✅ Tidak ada regression pada fitur yang sudah bekerja
- ✅ Konsisten dengan design system (warna, spacing, komponen)
- ✅ Empty state tersedia jika ada tabel atau list
- ✅ Loading state tersedia jika ada async operation
- ✅ Angka selalu tabular-nums dan format Rupiah yang benar
- ✅ Semua async function punya try/catch + showToast

---

## 15. Estetika & UX Judgment

### 15.1 Referensi Visual SJM Flow

SJM Flow mengacu pada estetika aplikasi SaaS modern:
- **Vercel Dashboard** — density tinggi, typografi kuat, minimal noise
- **Linear.app** — compact, setiap piksel punya tujuan
- **Raycast** — clean, konsisten, tidak ada elemen dekoratif tanpa fungsi

Kalau ragu apakah UI sudah cukup baik, tanyakan:
> "Apakah ini terlihat seperti produk SaaS profesional, atau seperti project internal yang dibuat cepat-cepatan?"

### 15.2 Visual Hierarchy

Setiap halaman harus punya hierarki yang jelas:
1. **Judul halaman** — apa ini?
2. **KPI / angka kunci** — kondisi sekarang?
3. **Filter / aksi** — saya mau lihat apa?
4. **Tabel / konten** — detail datanya
5. **Footer / info tambahan** — konteks pendukung

**Tanda-tanda hierarki rusak:**
- Tombol aksi lebih menonjol dari judul halaman
- Semua teks terlihat sama besarnya
- Tidak jelas mana yang bisa diklik dan mana yang tidak
- Terlalu banyak warna sehingga tidak ada yang menonjol

### 15.3 Density

SJM Flow adalah aplikasi internal untuk professional — density tinggi adalah fitur, bukan bug.

**Target:**
- Tabel harus bisa tampil 15-20 baris tanpa scroll di layar 1080p
- KPI cards tidak lebih dari satu baris tingginya
- Form tidak perlu whitespace berlebihan

**Tanda-tanda terlalu longgar:**
- Card dengan padding > `p-6` tanpa alasan
- Tabel dengan row height > 52px untuk data biasa
- Empty space lebih dari 30% di layar yang terisi

### 15.4 Konsistensi — Yang Paling Sering Dilanggar

**Ukuran font — WAJIB konsisten:**
- Body text di tabel → `text-[12px]`
- Label form → `text-[10px] uppercase tracking-widest`
- Nomor referensi (SO/Invoice/Jurnal) → `text-[11px] font-black italic`
- JANGAN: `text-sm`, `text-xs`, `text-base`

**Warna teks:**
- Data utama → `text-text-main`
- Data sekunder → `text-text-med`
- Label/caption → `text-text-light`
- JANGAN: `text-gray-500`, `text-slate-600`

**Border radius:**
- Card/container besar → `rounded-2xl`
- Input/tombol → `rounded-lg`
- JANGAN mix secara acak

**Tombol height:**
- Tombol inline → `h-9` (36px)
- JANGAN ada `h-8` dan `h-10` di baris yang sama

### 15.5 Feedback Visual

Setiap aksi harus punya feedback:

| Aksi | Feedback yang Harus Ada |
|---|---|
| Klik tombol simpan | Button disabled + spinner + loading text |
| Data berhasil disimpan | Toast success |
| Data gagal disimpan | Toast error dengan pesan yang jelas |
| Tabel sedang loading | Spinner di tengah area tabel |
| Tabel kosong | Empty state dengan pesan kontekstual |
| Row yang bisa diklik | cursor-pointer + hover state |
| Aksi berbahaya (hapus) | Konfirmasi modal sebelum eksekusi |

**Pesan error yang baik:**
- ❌ "Terjadi kesalahan"
- ✅ "Gagal menyimpan SO: nomor SO sudah digunakan"

### 15.6 Audit UI Checklist

**Level 1 — Konsistensi:**
- [ ] Font size sesuai panduan?
- [ ] Warna pakai token yang benar?
- [ ] Komponen yang tersedia sudah dipakai?
- [ ] Spacing konsisten?

**Level 2 — Hierarchy:**
- [ ] Elemen terpenting paling menonjol?
- [ ] Ada visual flow yang natural?
- [ ] Data utama vs sekunder bisa dibedakan?

**Level 3 — UX:**
- [ ] Semua aksi punya feedback?
- [ ] Loading state ada?
- [ ] Empty state ada dan informatif?
- [ ] Error state ada dan actionable?

**Level 4 — Density:**
- [ ] Tidak ada whitespace berlebihan?
- [ ] Bisa lihat cukup data tanpa scroll berlebihan?

### 15.7 Kapan Boleh Berinisiatif Perbaiki UI

**Boleh langsung perbaiki tanpa diminta:**
- Hardcode warna yang melanggar design system
- Font size tidak konsisten dengan guidelines
- Komponen custom padahal sudah ada di SJMComponents
- Tombol tanpa hover state atau feedback visual
- Tabel tanpa empty state

**Harus tanya dulu ke owner:**
- Ingin mengubah layout halaman secara signifikan
- Ingin mengubah urutan atau posisi elemen
- Ingin menambah atau menghapus kolom tabel
- Ingin mengubah tampilan yang sudah by design

---

*CLAUDE.md ini adalah sumber kebenaran untuk semua sesi Claude Code di project SJM Flow 4.0.*
*Update file ini setiap kali ada keputusan baru yang disepakati.*
