# SJM Flow 4.0 — Knowledge Base
> Last updated: 2026-05-26
> Dibuat untuk handoff antar sesi Claude. Selalu update setelah sesi selesai.

---

## 1. Identitas Project

| Item | Detail |
|------|--------|
| Perusahaan | PT Sugiarto Jaya Mandiri Transport |
| Sistem | SJM Flow 4.0 — back-office internal |
| GitHub | https://github.com/SJMTransport/SJM-FLOW4.0 |
| Production | https://sjm-akuntansi.vercel.app |
| Supabase | https://sdxyaegmbuccybvfesyx.supabase.co |
| Owner | Audya (non-technical, delegasi teknis ke Claude) |
| Workflow | Claude Chat (arsitek) → Claude Code (eksekusi) → GitHub → Vercel |

---

## 2. Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Backend/DB:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS v4 — CSS-first via `@import "tailwindcss"` + `@theme`
  - ⚠️ Utility class TIDAK berfungsi sebagai `className` langsung
  - Hanya berfungsi di dalam `@layer components` dengan `@apply`
- **Hosting:** Vercel (auto-deploy dari GitHub main branch)
- **PDF:** jsPDF
- **Auth:** Supabase auth, format email `[username]@sjm.internal`

---

## 3. Design System

```
Accent/Primary : #EB5E28  → var(--color-accent)
Background     : #F5F4F1  → var(--color-bg)
Border         : #E8E4DC  → var(--color-border-main)
Border Strong  : #C8C0B4
Text Main      : var(--color-text-main)
Text Med       : var(--color-text-med)
Text Light     : var(--color-text-light)
Success        : var(--color-success)
Error          : var(--color-error)
Warning        : var(--color-warning)
Info           : var(--color-info)
Font           : Inter, tabular-nums untuk angka
```

**Komponen tersedia di `src/index.css`:**
`btn-primary`, `btn-ghost`, `input`, `badge`, `kpi-card`, `kpi-card-label`,
`kpi-card-value`, `kpi-card-sub`, `table-container`, `PageShell`, `PageHeader`,
`ActionBar`, `KPIGrid`, `StatCard`

**Wajib:** Baca `docs/UI_GUIDELINES.md` sebelum ubah UI apapun.

---

## 4. Arsitektur Sistem

### 4.1 Routing
- Tidak ada React Router — routing manual via `handleNav(module, sub)` di App.tsx
- Modal entity via `pushModal("so"|"jurnal"|"armada"|"sopir", data)`
- `activeModals` array — max 2 modal side-by-side
- Dedup modal by identity (order_id, no_jurnal, no_polisi, id)

### 4.2 State di App.tsx Level
```typescript
const [so, setSo] = useState<any[]>([]);
const [jurnal, setJurnal] = useState<any[]>([]);
const [invoices, setInvoices] = useState<any[]>([]);  // lifted dari InvoicePage
const [coa, setCoa] = useState<any[]>([]);
const [armada, setArmada] = useState<any[]>([]);
const [sopir, setSopir] = useState<any[]>([]);
const [customer, setCustomer] = useState<any[]>([]);
const [piutang, setPiutang] = useState<any[]>([]);
```

### 4.3 Struktur File Penting
```
src/
  App.tsx                    — routing + modal stack + SODetailModal
  api.ts                     — semua Supabase API calls
  index.css                  — design tokens + CSS classes
  pages/
    SalesOrder.tsx           — SO CRUD (~1100 baris)
    InvoicePage.tsx          — Invoice CRUD + KPI (~950 baris)
    QuotationPage.tsx        — Quotation CRUD
    HutangPiutang.tsx        — Piutang & hutang monitoring
    JurnalUmum.tsx           — Jurnal double-entry
    Laporan.tsx              — Laporan keuangan
    Dashboard.tsx            — Dashboard overview
  utils/
    generateInvoicePDF.ts    — PDF invoice (jsPDF)
    generateQuotationPDF.ts  — PDF quotation
  components/
    SJMComponents.tsx        — shared UI components
docs/
  UI_GUIDELINES.md           — panduan UI (449 baris)
```

### 4.4 Supabase Tables
```
sales_order      — data SO operasional
invoices         — invoice management
jurnal           — header jurnal umum
jurnal_detail    — detail baris jurnal (no_so, coa_kode, debit, kredit)
coa              — chart of accounts
armada           — data kendaraan
sopir            — data sopir
customer         — data customer
quotations       — penawaran harga
piutang          — monitoring piutang (saat ini KOSONG — tidak diisi manual)
```

### 4.5 RPC Functions (Supabase)
```sql
get_payment_status_by_invoice(p_no_invoice text)
  → status per invoice dari jurnal_detail.no_so

get_payment_status_batch(p_no_invoices text[])
  → batch, return {status, terbayar, jurnal_detail jsonb}
```

---

## 5. Rules Bisnis Kritis

### 5.1 Akuntansi
- **Sumber kebenaran:** Jurnal Umum (double-entry)
- **SJM Akuntansi (App(2).jsx) = referensi formula** — jika ada perbedaan, versi lama yang benar
- **Balance sheet accounts** (piutang, hutang) → kalkulasi KUMULATIF, BUKAN filter periode
- **COA matching** → harus case-insensitive dan trim-safe
- **PPN 1,1%** berlaku mulai `tgl_muat >= 2026-02-01`
- **Tabel `piutang` kosong** — tidak digunakan, fallback ke kalkulasi jurnal

### 5.2 Invoice
- `jurnal_detail.no_so` = sumber kebenaran status pembayaran
- Total per row = `harga_pengiriman + asuransi` (TANPA PPN)
- PPN hanya di footer invoice
- `status_bayar` di-sync ke DB setiap InvoicePage load via `updateInvoiceStatusBatch`
- Nomor invoice format: `{nomor}/INV-SJM/{bulan-romawi}/{tahun}`

### 5.3 Indonesian Number Format
- Titik = pemisah ribuan (`Rp12.500.000` = 12,5 juta)
- Koma = pemisah desimal
- Gunakan `parseNumSafe()` — JANGAN `parseFloat()` langsung
- Bug lama: `parseFloat("12.500.000")` = 12.5 (salah!)

### 5.4 Status SO
Valid values: `Order Confirmed`, `Loading`, `On Going`, `Completed`, `Cancelled`
- ⚠️ `Cancled` (typo lama) sudah difix → `Cancelled` untuk 12 SO

### 5.5 Kalkulasi "Belum Invoice"
SO dihitung belum invoice jika:
```
status_muatan === 'Completed' AND no_invoice kosong/null
```
BUKAN semua SO tanpa no_invoice (karena yang On Going/Loading belum bisa diinvoice).

### 5.6 Tracking Resi
```
TIKI      : https://tiki.id/id/track/{no_resi}
JNE       : https://www.jne.co.id/id/tracking/trace/{no_resi}
SiCepat   : https://sicepat.com/checkAwb/{no_resi}
Anteraja  : https://anteraja.id/tracking/{no_resi}
J&T       : https://www.jet.co.id/track/{no_resi}
Pos       : https://www.posindonesia.co.id/id/tracking?noResi={no_resi}
Fallback  : https://www.google.com/search?q=lacak+resi+{ekspedisi}+{no_resi}
```

---

## 6. Terminologi yang Disepakati

| Istilah UI | Definisi | Sumber Data | Lokasi |
|------------|----------|-------------|--------|
| **Piutang Usaha** | Total tagihan − pembayaran aktual dari jurnal | Jurnal (COA Piutang) | HutangPiutang.tsx |
| **Belum Lunas** | Sisa tagihan invoice yang belum lunas (total − terbayar) | Invoice + paymentStatusMap | InvoicePage.tsx KPI |
| **Tagihan Beredar** | Invoice terbit + dikirim + belum lunas (per customer) | Invoice + jurnal | Rekapitulasi Piutang (planned) |
| **Jatuh Tempo** | Piutang dengan umur > threshold hari | Jurnal | HutangPiutang.tsx Notif |
| **Belum Diinvoice** | SO Completed yang belum punya invoice | sales_order | SO + Invoice KPI |

**❌ JANGAN gunakan "Outstanding" sebagai label UI** — ambigu, sudah diganti.

---

## 7. Fitur yang Sudah Ada

### 7.1 Operasional
- **Sales Order** — CRUD, KPI interaktif (clickable filter by status), filter Belum/Sudah Invoice
- **Update Muatan** — tracking status pengiriman per SO
- **Quotation** — CRUD + generate PDF
- **Invoice** — CRUD + KPI interaktif + modal detail lengkap

### 7.2 Invoice Features
- Status bayar dihitung real-time dari `jurnal_detail.no_so`
- Section "Dokumen Fisik & Pengiriman" di modal detail:
  - Link Google Drive (scan invoice)
  - Ekspedisi + no resi + tanggal kirim
  - Tombol "Lacak Paket" → buka tab baru ke website ekspedisi
- Status dokumen: Belum Dikirim → Terkirim → Diterima Customer
- Kolom invoice di tabel SO bisa diklik → buka modal SO
- Section "Invoice & Dokumen" di modal SO:
  - SO belum invoice: banner amber + tombol "Buat Invoice"
  - SO sudah invoice: card detail + status bayar + link Drive + resi + Lacak

### 7.3 Keuangan
- **Jurnal Umum** — double-entry, approval workflow
- **Hutang & Piutang** — monitoring piutang & hutang dari jurnal
- **Notif Piutang** — aging analysis dengan threshold configurable

### 7.4 Laporan
- Buku Besar, Neraca, Laba Rugi — dari jurnal

### 7.5 Master
- Armada, Sopir, COA management

---

## 8. Fitur Pending / Planned

### 8.1 Sedang Dikerjakan
- [ ] **Audit Piutang Usaha** — verifikasi logika debit/kredit di HutangPiutang.tsx
  - Kenapa nilai "Sisa" bisa hijau tapi minus?
  - Apakah konsisten dengan Buku Besar COA Piutang?

### 8.2 Planned (Sudah Dikonsepkan)
- [ ] **Rekapitulasi Piutang** — generate PDF/Excel per customer
  - Filter: per customer + rentang hari jatuh tempo (custom threshold)
  - Kolom: No, Tanggal, No Invoice, No SO, Asal, Tujuan, Unit, Armada, Total Invoice, Keterangan, Umur Piutang (Hari)
  - Format output: tampil di layar + download PDF + download Excel
  - Sumber: invoice terbit + sudah dikirim + belum lunas (Belum Bayar + sisa Parsial)

- [ ] **Fix Notif Piutang** — kalkulasi dari SO → jurnal untuk konsistensi

- [ ] **Flow Generate Invoice Atomik** — preview → simpan + download sekaligus, nomor terkunci

### 8.3 Deferred (Ditunda)
- [ ] COA renumbering (571–5712 → 57001–57012) — low priority
- [ ] SQL cleanup `sub_kelompok` normalization

---

## 9. Data yang Belum Diinsert

### SO 0329, 0330
- `harga_pengiriman = NULL` — tunggu konfirmasi nilai dari owner

### SO 0327
- `nilai_asuransi` belum diupdate — No asuransi 053, tanggungan Rp 180.000.000

### SO 0334–0341
Data lengkap sudah ada di Excel (sesi 2026-05-25), belum diinsert ke DB:
- 0334: PT Siberat Digital Logistic, Hexindo Cibitung → Dharmasraya, Loading
- 0335–0339: PT Altrak 1978, Sumitomo Karawang → Hasi Altrak, 5 unit CX210 @ Rp 3.000.000, Order Confirmed
- 0340: PT Rentindo Citra Utama, Mojokerto → Marunda Center, 2xHL504, Rp 8.000.000, On Going
- 0341: PT Rentindo Citra Utama, Mojokerto → Marunda Center, HL504, Rp 4.000.000, Loading

### Invoice 1544, 1545
- Perlu diinput manual di aplikasi (belum ada di DB)

---

## 10. Data Fixes yang Sudah Dilakukan

### 10.1 SO Harga Fix (2026-05-25) — Kelebihan 1 Nol
SO berikut sudah difix harga_pengiriman, total_harga, nilai_pajak, total_harga_pajak:
```
0295: 17.000.000 (dari 170.000.000)
0296: 7.500.000  (dari 75.000.000)
0297: 17.000.000 (dari 170.000.000) + asuransi 472.500
0298: 10.500.000 (dari 105.000.000) + asuransi 438.750
0299: 11.000.000 (dari 110.000.000)
0301: 37.000.000 (dari 370.000.000) + asuransi 1.147.500
0302: 26.000.000 (dari 260.000.000)
0303: 26.000.000 (dari 260.000.000)
0304: 8.250.000  (dari 82.500.000)
0305: 11.500.000 (dari 115.000.000) + asuransi 162.000
0306: 8.000.000  (dari 80.000.000)
0307: 1.500.000  (dari 15.000.000)
0308: 26.000.000 (dari 260.000.000)
0309: 7.000.000  (dari 70.000.000)
0310: 8.000.000  (dari 80.000.000)
0311: 10.500.000 (dari 105.000.000) + asuransi 607.500
0312: 1.500.000  (dari 15.000.000)
0315: 6.000.000  (dari 60.000.000)
0316: 17.500.000 (dari 175.000.000)
0317: 31.000.000 (dari 310.000.000)
0318: 2.522.255  (dari 25.222.550)
```

### 10.2 Status Muatan Fix (2026-05-25)
12 SO dengan `status_muatan = 'Cancled'` → `'Cancelled'`

### 10.3 Invoice Dokumen Update (2026-05-25)
193 invoice di-update dengan: `gdrive_url`, `no_resi`, `ekspedisi`, `tgl_kirim`, `status_dokumen`
Semua ekspedisi NULL dengan resi TIKI → di-update ke `ekspedisi = 'TIKI'`

### 10.4 Kolom Baru di Tabel invoices
```sql
ALTER TABLE invoices ADD COLUMN gdrive_url TEXT;
ALTER TABLE invoices ADD COLUMN ekspedisi TEXT;
ALTER TABLE invoices ADD COLUMN no_resi TEXT;
ALTER TABLE invoices ADD COLUMN tgl_kirim DATE;
ALTER TABLE invoices ADD COLUMN status_dokumen TEXT DEFAULT 'Belum Dikirim';
```

---

## 10b. Data Fixes Sesi Sebelumnya (2026-05-19)

### SO Data Fix Massal
293 SO di-update dari Excel via SQL massal:
- Kolom yang diupdate: `harga_pengiriman`, `harga_asuransi`, `nilai_asuransi`, `total_harga`, `muatan`, `sn`
- Excel adalah sumber kebenaran untuk data SO
- Multi-SN dipisah dengan `, ` (bukan newline)

### Invoice Nilai Rusak Fix
6 invoice dengan nilai rusak akibat Indonesian number format (titik dibaca desimal):
- 1351, 1410, 1494, 1499, 1500, 1502 sudah difix `total_sebelum_pajak`, `ppn`, `total_setelah_pajak`

### Old vs New SO Data
```
Data LAMA (sebelum Feb 2026):
  harga_pengiriman = harga modal (BUKAN harga jual)  ← sudah difix via SQL massal
  total_harga      = harga jual ke customer
  total_harga_pajak = NULL

Data BARU (Feb 2026+):
  harga_pengiriman = harga jual ✅
  total_harga_pajak = harga jual + pajak ✅
```

### Fallback Rule untuk Tampilan
Semua tampilan harga di aplikasi harus pakai fallback:
```js
// Harga tampil:
total_harga_pajak || total_harga || harga_pengiriman || 0
// Harga pengiriman per row invoice:
harga_pengiriman || total_harga || subPerItem
```

---

## 11. Bug yang Sudah Difix (Jangan Regress)

| Bug | File | Fix |
|-----|------|-----|
| `SEKSI_MAP` case-sensitivity excluding COA dari Laba Rugi | Laporan.tsx | Case-insensitive matching |
| Insurance COA (67x) tidak dihitung sebagai expense | Laporan.tsx | Tambah ke expense filter |
| `BukuBesar` sort by jurnal number bukan date | Laporan.tsx | Sort by tanggal |
| Piutang/hutang pakai `filterByPeriod` (salah) | HutangPiutang.tsx | Ganti ke kumulatif |
| Neraca sign-inversion → selisih besar | Laporan.tsx | Fix sign logic |
| `parseNumSafe` mishandle Indonesian format | api.ts/utils | Fix parser |
| Revenue distribution di `tbProfit` pakai proporsi SO bukan Rupiah absolut | Laporan.tsx | Fix ke absolut |
| `status_muatan = 'Cancled'` (typo) | DB | Fix ke 'Cancelled' |
| Tracking URL TIKI salah format | InvoicePage.tsx | `/id/track/{resi}` |
| "Belum Invoice" hitung semua SO tanpa invoice | SalesOrder.tsx | Filter Completed only |
| KPI "Outstanding" pakai nilai invoice penuh | InvoicePage.tsx | Pakai sisa (total − terbayar) |
| SO list & form tampilkan Rp 0,00 untuk data lama | SalesOrder.tsx | Fallback total_harga_pajak || total_harga |
| Create invoice subTotal tidak include asuransi | InvoicePage.tsx | Fix kalkulasi subTotal |
| Create invoice total per row tanpa fallback | InvoicePage.tsx | Fallback total_harga_pajak || total_harga |
| Invoice PDF blank page 2 | InvoiceTemplate.tsx | Hapus minHeight 1123px |
| Invoice nilai rusak titik dibaca desimal | DB invoices | Fix 6 invoice: 1351,1494,1499,1500,1502 |
| harga_pengiriman SO lama = harga modal | DB sales_order | SQL massal update 293 SO dari Excel |

---

## 12. Prompt Template untuk Claude Code

```
Baca docs/UI_GUIDELINES.md terlebih dahulu.

Di [file target], lakukan:

[instruksi spesifik dengan baris target jika memungkinkan]

PENTING:
- [hal yang tidak boleh diubah]
- Semua logika lain TIDAK BOLEH diubah

Commit:
npx tsc --noEmit
git add [file]
git commit -m "[tipe]: [deskripsi singkat]"
git push origin main
```

---

## 13. Checklist Validasi Akuntansi

Cross-check yang harus dilakukan secara berkala:

- [ ] Total debit Jurnal = Total kredit Jurnal (Buku Besar balance = 0)
- [ ] Saldo COA Piutang Usaha (112) di Buku Besar = Piutang Usaha di H&P
- [ ] Total invoice Lunas = Total kredit pembayaran di jurnal_detail
- [ ] Neraca: Total Aset = Total Liabilitas + Ekuitas
- [ ] Laba Rugi: Revenue − Expense = Laba Bersih di Neraca (Ekuitas)

---

## 14. Catatan Penting Lainnya

### Monolithic vs Modular
- Versi lama: monolithic `App.jsx` ~10.000 baris → rawan fungsi tertimpa saat AI-assisted dev
- Versi baru (4.0): modular multi-file TypeScript → lebih aman

### Cara Deploy
1. Edit file di local/Claude Code
2. `git push origin main`
3. Vercel auto-deploy (biasanya 1-2 menit)
4. Verifikasi di https://sjm-akuntansi.vercel.app

### Backup Data
- Selalu export CSV dari Supabase sebelum operasi DELETE massal
- Jangan DELETE tanpa backup kecuali data test

### Claude Code vs Claude Chat
- **Claude Chat** = arsitek, konsep, prompt generator, SQL generator
- **Claude Code** = eksekutor, commit langsung ke GitHub
- Jangan minta Claude Code untuk hal yang butuh diskusi dulu
