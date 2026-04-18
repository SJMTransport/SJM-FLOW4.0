# SJM FLOW 4.0

**Sistem Operasional & Akuntansi - PT Sugiarto Jaya Mandiri**

---

## 🚀 Features

### Operasional
- ✅ **Sales Order** with CSV Bulk Import (Indonesian number format support)
- ✅ Quotation
- ✅ Invoice Generator
- ✅ Update Muatan (shipment tracking)

### Keuangan
- ✅ **Jurnal Umum** (General Ledger)
- ✅ **Hutang & Piutang** tracking
- ✅ Hutang Vendor
- ✅ Cicilan kendaraan
- ✅ Rekap Uang Jalan per unit

### Laporan
- ✅ **Neraca** (Balance Sheet)
- ✅ **Laba Rugi** (Income Statement)
- ✅ **Buku Besar** (General Ledger Report)
- ✅ Profitabilitas per SO
- ✅ Export to PDF/Excel
- ✅ Dashboard per unit

### Master Data
- ✅ Armada & Sopir management
- ✅ Dokumen & Service tracking
- ✅ Kontak (Customer & Vendor)
- ✅ Master COA
- ✅ Saldo Awal
- ✅ User Management

---

## 🆕 What's New in v4.0

### Critical Bug Fixes
- ✅ **CSV Parser Fix**: Indonesian number format `Rp12.500.000,00` now correctly parsed as 12,500,000 (not 12.5 billion)

### New Features
- ✅ **CSV Import Modal**: Drag & drop, preview, progress bar, batch processing
- ✅ **Enhanced SO Detail Modal**: 40+ fields, organized sections, clickable ShareLok links
- ✅ **Search Filters**: Available in all major pages

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Styling**: Custom CSS with responsive design

---

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

1. Clone repository:
```bash
git clone https://github.com/SJMTransport/SJM-FLOW4.0.git
cd SJM-FLOW4.0
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

4. Run development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import repository in Vercel
3. Configure:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variables (from `.env`)
5. Deploy!

---

## 📊 Database Schema

Using Supabase PostgreSQL with tables:
- `sales_order` - Sales orders with 40+ fields
- `jurnal` - General journal entries
- `coa` - Chart of accounts
- `customer` - Customer master data
- `vendor` - Vendor master data
- `armada` - Fleet management
- `sopir` - Driver records
- `user_profiles` - User authentication

---

## 🐛 Known Issues & Solutions

### CSV Import shows wrong values
**Solution**: Update to v4.0 - parser now correctly handles Indonesian number format

### Modal not showing all fields
**Solution**: v4.0 includes enhanced SO Detail Modal with all 40+ fields

---

## 📝 Changelog

### v4.0 (April 2026)
- ✅ Fixed critical CSV parser bug (Indonesian number format)
- ✅ Added CSV Import Modal with drag & drop
- ✅ Enhanced SO Detail Modal (40+ fields)
- ✅ Added search filters across all pages
- ✅ Improved UX with slide-in animations

### v3.1 (March 2026)
- Initial modular architecture migration
- Vite + TypeScript setup
- All pages working

---

## 👥 Team

**PT Sugiarto Jaya Mandiri**
- Heavy Equipment Transportation & Logistics

---

## 📄 License

Proprietary - Internal Use Only

---

## 📞 Support

For issues or questions, contact the development team.
