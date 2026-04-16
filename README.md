# 🛒 Multi-Merchant eCommerce Platform with Integrated Affiliate Membership System

> Platform marketplace multi-merchant dengan sistem keanggotaan affiliate terintegrasi — memungkinkan banyak penjual berjualan di satu platform, sementara member affiliate mendapatkan komisi dari setiap transaksi yang berhasil mereka referensikan.

---

## 📋 Daftar Isi

- [Visi & Tujuan Proyek](#-visi--tujuan-proyek)
- [Gambaran Umum Sistem](#-gambaran-umum-sistem)
- [Aktor & Peran Pengguna](#-aktor--peran-pengguna)
- [Fitur Utama](#-fitur-utama)
- [Arsitektur Sistem](#-arsitektur-sistem)
- [Struktur Database](#-struktur-database)
- [Alur Bisnis Kritis](#-alur-bisnis-kritis)
- [Sistem Komisi & Membership Tier](#-sistem-komisi--membership-tier)
- [Integrasi Pembayaran](#-integrasi-pembayaran)
- [Tech Stack yang Direkomendasikan](#-tech-stack-yang-direkomendasikan)
- [Struktur Proyek](#-struktur-proyek)
- [API Endpoints Overview](#-api-endpoints-overview)
- [Keamanan & Anti-Fraud](#-keamanan--anti-fraud)
- [Roadmap Pengembangan](#-roadmap-pengembangan)
- [Pertimbangan Teknis Penting](#-pertimbangan-teknis-penting)
- [Glosarium](#-glosarium)

---

## 🎯 Visi & Tujuan Proyek

Platform ini dibangun untuk menjawab tiga kebutuhan bisnis sekaligus:

1. **Marketplace Multi-Merchant** — Memberi ruang bagi banyak penjual (merchant) untuk membuka toko dan berjualan di satu ekosistem platform, tanpa perlu membangun infrastruktur toko online sendiri.

2. **Sistem Affiliate Terintegrasi** — Member dapat mempromosikan produk dari merchant mana pun dan mendapatkan komisi otomatis setiap kali terjadi transaksi melalui link referral mereka.

3. **Revenue Sharing Otomatis** — Platform secara otomatis memisahkan dan mendistribusikan pendapatan ke tiga pihak: merchant (hasil penjualan), affiliate (komisi), dan platform (service fee) — tanpa proses manual.

### Nilai Bisnis

| Pihak | Manfaat |
|---|---|
| Merchant | Akses pasar lebih luas, infrastruktur siap pakai, tidak perlu bangun toko sendiri |
| Affiliate Member | Penghasilan pasif dari komisi tanpa perlu stok produk |
| Platform | Revenue dari service fee setiap transaksi + biaya berlangganan merchant |
| Pembeli | Pilihan produk lebih banyak dari berbagai merchant dalam satu platform |

---

## 🧩 Gambaran Umum Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                        PLATFORM LAYER                           │
│                                                                 │
│   Pembeli ──→ Storefront & Search ──→ Cart & Checkout           │
│                                           │                     │
│   Merchant ──→ Merchant Dashboard ──→ Produk & Order Mgmt       │
│                                           │                     │
│   Affiliate ──→ Affiliate Portal ──→ Link Generator & Laporan   │
│                                           │                     │
│   Admin ──→ Admin Panel ──→ Semua Data & Konfigurasi            │
│                                           │                     │
│              ┌────────────────────────────┘                     │
│              ↓                                                  │
│   ┌─────────────────────────────────────┐                       │
│   │         CORE ENGINE LAYER           │                       │
│   │  Order Engine │ Commission Engine   │                       │
│   │  Payment Split│ Wallet System       │                       │
│   └─────────────────────────────────────┘                       │
│              │                                                  │
│   ┌──────────────────────┐                                      │
│   │    DATA LAYER        │                                      │
│   │  PostgreSQL │ Redis  │                                      │
│   └──────────────────────┘                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 👥 Aktor & Peran Pengguna

### 1. Pembeli (Buyer)
- Mengunjungi platform dan browsing produk dari berbagai merchant
- Dapat masuk melalui link affiliate (ref code tersimpan di cookie)
- Melakukan checkout multi-merchant dalam satu keranjang
- Menerima notifikasi status order dan pengiriman

### 2. Merchant
- Mendaftar dan mengelola toko virtual di dalam platform
- Mengunggah produk, mengatur harga, stok, dan variasi produk
- Menerima dan memproses order masuk
- Memiliki wallet untuk menampung hasil penjualan (setelah dikurangi platform fee)
- Mengajukan pencairan dana (withdrawal) ke rekening bank

### 3. Affiliate Member
- Mendaftar sebagai member affiliate (bisa berbayar berdasarkan tier)
- Mendapatkan unique referral link untuk setiap produk atau halaman
- Menghasilkan komisi setiap kali ada transaksi sukses melalui link mereka
- Memiliki dashboard untuk memantau klik, konversi, dan pendapatan
- Dapat naik tier berdasarkan performa atau pembelian paket membership

### 4. Admin Platform
- Mengelola semua merchant, member affiliate, dan pembeli
- Mengatur konfigurasi komisi per kategori, per merchant, atau per tier
- Memoderasi produk dan toko merchant
- Melihat laporan keuangan platform secara keseluruhan
- Mengatur konfigurasi pembayaran, payout schedule, dan kebijakan

---

## ✨ Fitur Utama

### 🏪 Merchant Management
- [ ] Registrasi dan verifikasi merchant (KTP, NPWP, rekening bank)
- [ ] Kustomisasi halaman toko (banner, logo, deskripsi)
- [ ] Manajemen produk: CRUD produk, varian (ukuran, warna), SKU, stok
- [ ] Bulk upload produk via CSV/Excel
- [ ] Pengaturan ongkos kirim per wilayah atau integrasi kurir (JNE, JNT, SiCepat, dll.)
- [ ] Dashboard merchant: penjualan harian/bulanan, produk terlaris, status order
- [ ] Notifikasi order masuk via email, WhatsApp, atau push notification
- [ ] Pengajuan withdrawal dengan approval admin

### 🛍️ eCommerce Core
- [ ] Halaman beranda dengan featured products dan merchant
- [ ] Search dan filter produk (kategori, harga, rating, merchant, lokasi)
- [ ] Halaman produk detail dengan galeri foto, deskripsi, varian
- [ ] Sistem keranjang belanja multi-merchant (satu checkout, banyak merchant)
- [ ] Sistem review dan rating produk
- [ ] Wishlist produk
- [ ] Riwayat pembelian dan tracking order
- [ ] Notifikasi status pengiriman

### 🔗 Affiliate System
- [ ] Unique referral link per affiliate per produk/halaman/merchant
- [ ] Cookie tracking dengan masa berlaku yang dapat dikonfigurasi (misal 30 hari)
- [ ] Dashboard affiliate: total klik, konversi, pendapatan pending, pendapatan tersedia
- [ ] Laporan affiliate detail: per produk, per merchant, per periode
- [ ] Link shortener opsional untuk tampilan URL yang lebih rapi
- [ ] Banner dan materi promosi yang dapat diunduh affiliate
- [ ] Notifikasi real-time saat komisi berhasil diperoleh

### 🏆 Membership Tier
- [ ] Sistem level membership (Bronze, Silver, Gold, Platinum)
- [ ] Persentase komisi berbeda berdasarkan tier
- [ ] Kenaikan tier otomatis berdasarkan total pendapatan atau pembelian paket
- [ ] Benefit tambahan per tier (prioritas support, akses exclusive deal, bonus komisi)
- [ ] Halaman landing membership dengan perbandingan keuntungan tiap tier

### 💰 Keuangan & Pembayaran
- [ ] Integrasi payment gateway (Midtrans / Xendit)
- [ ] Dukungan metode pembayaran: transfer bank, virtual account, QRIS, e-wallet (GoPay, OVO, DANA)
- [ ] Cicilan kartu kredit
- [ ] Automatic revenue splitting saat pembayaran sukses
- [ ] Wallet merchant dan wallet affiliate
- [ ] Sistem payout otomatis atau manual dengan jadwal yang dapat dikonfigurasi
- [ ] Laporan keuangan platform (gross revenue, net revenue, total fee, total komisi)
- [ ] Invoice otomatis untuk merchant dan affiliate

### 🛡️ Admin Panel
- [ ] Dashboard overview platform (GMV, aktif merchant, aktif affiliate, order hari ini)
- [ ] Manajemen merchant (verifikasi, suspend, setting komisi khusus)
- [ ] Manajemen affiliate member (tier management, suspend, verifikasi identitas)
- [ ] Konfigurasi komisi global dan per kategori
- [ ] Moderasi produk (approve/reject/remove)
- [ ] Manajemen kategori dan atribut produk
- [ ] Laporan komprehensif dengan export CSV/Excel
- [ ] Log aktivitas sistem

---

## 🏗️ Arsitektur Sistem

### Komponen Infrastruktur

| Komponen | Fungsi |
|---|---|
| **Web Frontend** | UI untuk semua jenis pengguna (Next.js direkomendasikan untuk SSR/SEO) |
| **API Gateway** | Single entry point, rate limiting, auth token validation |
| **Application Server** | Business logic, REST API atau GraphQL |
| **PostgreSQL** | Database utama untuk semua data transaksional |
| **Redis** | Cache session, cart, rate limiting, queue job |
| **Object Storage (S3/MinIO)** | Penyimpanan gambar produk, banner merchant, dokumen |
| **Queue/Worker** | Background jobs: kirim email, hitung komisi, proses payout |
| **Payment Gateway** | Midtrans atau Xendit untuk pemrosesan pembayaran |

---

## 🗄️ Struktur Database

### Tabel-Tabel Utama

#### Users & Authentication
```sql
users
  - id (UUID, PK)
  - email (UNIQUE)
  - phone
  - password_hash
  - role (buyer | merchant | affiliate | admin)
  - is_verified (boolean)
  - created_at, updated_at

user_profiles
  - id, user_id (FK)
  - full_name, avatar_url
  - address, city, province, postal_code
```

#### Merchant
```sql
merchants
  - id (UUID, PK)
  - user_id (FK → users)
  - shop_name, slug (UNIQUE)
  - description, logo_url, banner_url
  - status (pending | active | suspended)
  - commission_rate_override (nullable — jika null, pakai rate global)
  - bank_account_name, bank_account_number, bank_name
  - created_at, verified_at

merchant_wallets
  - id, merchant_id (FK)
  - balance (DECIMAL 15,2)
  - pending_balance (DECIMAL 15,2)
  - total_withdrawn (DECIMAL 15,2)
```

#### Products & Catalog
```sql
categories
  - id, parent_id (nullable, untuk subkategori)
  - name, slug, commission_rate (default untuk kategori ini)

products
  - id (UUID, PK)
  - merchant_id (FK)
  - category_id (FK)
  - name, slug, description
  - status (draft | active | inactive)
  - is_featured

product_variants
  - id, product_id (FK)
  - sku (UNIQUE), name
  - price, compare_price
  - stock, weight
  - images (JSON array of URLs)
```

#### Orders
```sql
orders
  - id (UUID, PK)
  - buyer_id (FK → users)
  - affiliate_id (nullable, FK → affiliate_members)
  - ref_code (nullable — kode affiliate yang digunakan)
  - status (pending | paid | processing | shipped | delivered | completed | cancelled | refunded)
  - subtotal, platform_fee, shipping_total, grand_total
  - payment_method, payment_status
  - payment_reference (dari payment gateway)
  - created_at, paid_at, completed_at

order_items
  - id, order_id (FK)
  - merchant_id (FK)
  - product_variant_id (FK)
  - quantity, unit_price, subtotal
  - merchant_amount (hasil setelah fee dipotong)
  - commission_amount (komisi untuk affiliate)
  - platform_fee_amount

order_merchant_groups
  - id, order_id (FK), merchant_id (FK)
  - subtotal, shipping_cost, shipping_courier, tracking_number
  - status (per merchant dalam satu order)
```

#### Affiliate System
```sql
affiliate_members
  - id (UUID, PK)
  - user_id (FK → users)
  - membership_tier_id (FK)
  - ref_code (UNIQUE — kode unik affiliate)
  - status (active | inactive | suspended)
  - joined_at, tier_upgraded_at

membership_tiers
  - id, name (Bronze | Silver | Gold | Platinum)
  - base_commission_rate (DECIMAL 5,2) -- persentase default
  - monthly_fee (nullable, 0 = gratis)
  - min_earnings_for_upgrade
  - benefits (JSON)

affiliate_links
  - id, affiliate_id (FK)
  - target_url (URL produk/merchant/halaman)
  - short_code (UNIQUE)
  - clicks_count, conversions_count
  - created_at

affiliate_clicks
  - id, affiliate_link_id (FK)
  - ip_address, user_agent
  - clicked_at, converted (boolean), order_id (nullable)

affiliate_commissions
  - id (UUID, PK)
  - affiliate_id (FK)
  - order_id (FK), order_item_id (FK)
  - amount (DECIMAL 15,2)
  - rate_applied (DECIMAL 5,2)
  - status (pending | approved | paid | rejected)
  - created_at, approved_at, paid_at

affiliate_wallets
  - id, affiliate_id (FK)
  - balance (siap dicairkan)
  - pending_balance (menunggu order selesai)
  - total_earned, total_withdrawn
```

#### Payouts
```sql
withdrawal_requests
  - id (UUID, PK)
  - requester_id (FK → users)
  - requester_type (merchant | affiliate)
  - amount
  - bank_account_name, bank_account_number, bank_name
  - status (pending | approved | processed | rejected)
  - admin_note
  - requested_at, processed_at
```

---

## 🔄 Alur Bisnis Kritis

### Alur 1: Kunjungan via Affiliate Link → Order → Komisi

```
1. Affiliate generate link:
   https://platform.com/produk/sepatu-xyz?ref=JOHN123

2. Calon pembeli klik link:
   → Server menyimpan ref_code=JOHN123 ke cookie (expired: 30 hari)
   → Mencatat klik di tabel affiliate_clicks

3. Pembeli tambah ke keranjang & checkout:
   → ref_code terbaca dari cookie
   → Disimpan di sessions/cart

4. Pembeli selesai checkout:
   → Order dibuat dengan affiliate_id dan ref_code tersimpan
   → Status order: PENDING

5. Pembeli bayar → Payment Gateway callback (webhook):
   → Order status update → PAID
   → Trigger Commission Engine

6. Commission Engine berjalan:
   UNTUK SETIAP order_item:
     grand_total_item = unit_price × quantity
     platform_fee = grand_total_item × platform_fee_rate (misal 5%)
     
     IF affiliate_id EXISTS:
       commission_rate = ambil dari tier affiliate + override kategori
       commission = grand_total_item × commission_rate
     ELSE:
       commission = 0
     
     merchant_amount = grand_total_item - platform_fee - commission
     
     → Simpan ke order_items (merchant_amount, commission_amount, platform_fee_amount)
     → Buat record affiliate_commissions (status: PENDING)
     → Tambah merchant_wallet.pending_balance += merchant_amount

7. Order selesai (status: COMPLETED — setelah pembeli konfirmasi terima):
   → affiliate_commissions.status → APPROVED
   → affiliate_wallet.pending_balance → balance (siap dicairkan)
   → merchant_wallet.pending_balance → balance (siap dicairkan)

8. Jika order di-CANCEL atau REFUND sebelum selesai:
   → affiliate_commissions.status → REJECTED
   → Pending balance dikembalikan / di-reverse
```

### Alur 2: Checkout Multi-Merchant

```
Pembeli memiliki keranjang dengan produk dari 3 merchant berbeda:
  - Merchant A: 2 produk
  - Merchant B: 1 produk
  - Merchant C: 3 produk

Saat checkout:
  → 1 Order dibuat (dengan 1 payment)
  → 3 order_merchant_groups dibuat (satu per merchant)
  → Setelah bayar, masing-masing merchant terima notifikasi order MEREKA saja
  → Masing-masing merchant kirim pengiriman secara independen
  → Tracking terpisah per merchant group
  → Komisi affiliate dihitung dari total semua item
```

### Alur 3: Pencairan Dana (Withdrawal)

```
Merchant atau Affiliate mengajukan withdrawal:
1. Cek balance >= minimum withdrawal (misal Rp 100.000)
2. Buat withdrawal_request (status: PENDING)
3. Balance dikurangi (reserved)
4. Admin review dan approve
5. Transfer dilakukan via API bank atau manual
6. Status update → PROCESSED
7. Notifikasi ke merchant/affiliate
```

---

## 🏆 Sistem Komisi & Membership Tier

### Struktur Tier

| Tier | Fee Bulanan | Komisi Default | Syarat Naik Tier |
|---|---|---|---|
| **Bronze** | Gratis | 3% | — |
| **Silver** | Rp 50.000/bulan | 5% | Total earn Rp 5.000.000 atau beli paket |
| **Gold** | Rp 150.000/bulan | 8% | Total earn Rp 25.000.000 atau beli paket |
| **Platinum** | Rp 300.000/bulan | 12% | Undangan / total earn Rp 100.000.000 |

### Hirarki Penentuan Rate Komisi

Komisi ditentukan dengan urutan prioritas berikut (dari paling spesifik ke paling umum):

```
1. Override merchant untuk affiliate tertentu     (paling spesifik)
2. Override kategori produk untuk tier tertentu
3. Base rate dari tier affiliate member
4. Default platform commission rate               (paling umum)
```

### Kebijakan Komisi

- **Holding period**: Komisi berstatus PENDING selama order belum COMPLETED
- **Auto-complete order**: Order otomatis berstatus COMPLETED setelah X hari sejak status DELIVERED (default: 7 hari)
- **Refund policy**: Jika order di-refund sebelum auto-complete, komisi di-reject
- **Minimum payout**: Rp 100.000
- **Payout schedule**: Setiap hari Jumat (atau sesuai konfigurasi admin)
- **Cookie duration**: 30 hari (konfigurabel per platform atau per merchant)

---

## 💳 Integrasi Pembayaran

### Payment Gateway yang Direkomendasikan (Indonesia)

**Midtrans** (prioritas utama):
- Virtual Account (BCA, BNI, BRI, Mandiri, Permata)
- QRIS
- GoPay, OVO, DANA, ShopeePay
- Kartu kredit/debit
- Indomaret / Alfamart
- Cicilan tanpa kartu (Kredivo, Akulaku)

**Xendit** (alternatif):
- Fitur serupa Midtrans
- API lebih sederhana untuk disbursement (payout ke merchant/affiliate)

### Alur Pembayaran

```
1. Backend buat payment request ke Midtrans → dapat payment_url
2. User diarahkan ke payment_url atau tampilkan payment modal
3. User bayar
4. Midtrans kirim webhook notification ke endpoint platform
5. Platform verifikasi signature webhook
6. Update order status → PAID
7. Trigger commission splitting
```

### Payout ke Merchant & Affiliate

- Menggunakan fitur **Disbursement API** dari Xendit atau **Iris (Midtrans)** untuk transfer bank otomatis
- Alternatif manual: admin download daftar payout, transfer manual, update status

---


### Infrastructure

| Komponen | Teknologi |
|---|---|
| **Containerization** | Docker + Docker Compose |
| **Orchestration** | Kubernetes (production) atau Railway/Render (awal) |
| **CI/CD** | GitHub Actions |
| **Monitoring** | Grafana + Prometheus atau Datadog |
| **Email** | SendGrid / Mailgun / AWS SES |
| **WhatsApp Notif** | Fonnte / Wablas / WA Business API |

---

## 📁 Struktur Proyek

```
project-root/
├── apps/
│   ├── web/                    # Frontend storefront (Next.js)
│   │   ├── pages/
│   │   │   ├── index.tsx       # Halaman beranda
│   │   │   ├── products/       # Halaman produk
│   │   │   ├── merchant/       # Halaman toko merchant
│   │   │   ├── cart.tsx        # Keranjang belanja
│   │   │   ├── checkout.tsx    # Checkout
│   │   │   └── account/        # Area pembeli (order, profile)
│   │   └── components/
│   │
│   ├── merchant-dashboard/     # Dashboard merchant (Next.js / React)
│   │   ├── pages/
│   │   │   ├── dashboard.tsx   # Overview penjualan
│   │   │   ├── products/       # Kelola produk
│   │   │   ├── orders/         # Kelola order
│   │   │   ├── wallet.tsx      # Wallet & withdrawal
│   │   │   └── settings.tsx    # Pengaturan toko
│   │   └── components/
│   │
│   ├── affiliate-portal/       # Portal affiliate (Next.js / React)
│   │   ├── pages/
│   │   │   ├── dashboard.tsx   # Overview komisi & klik
│   │   │   ├── links/          # Kelola affiliate link
│   │   │   ├── commissions/    # Riwayat komisi
│   │   │   ├── wallet.tsx      # Wallet & payout
│   │   │   └── membership.tsx  # Info tier membership
│   │   └── components/
│   │
│   └── admin-panel/            # Panel admin (React)
│       ├── pages/
│       │   ├── dashboard.tsx   # Overview platform
│       │   ├── merchants/      # Kelola merchant
│       │   ├── affiliates/     # Kelola affiliate member
│       │   ├── orders/         # Semua order
│       │   ├── products/       # Moderasi produk
│       │   ├── finance/        # Laporan keuangan
│       │   └── settings/       # Konfigurasi platform
│       └── components/
│
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/           # Login, register, JWT, OAuth
│   │   │   ├── users/          # Profil pengguna
│   │   │   ├── merchants/      # Merchant management
│   │   │   ├── products/       # Product & catalog
│   │   │   ├── orders/         # Order management
│   │   │   ├── payments/       # Payment gateway integration
│   │   │   ├── affiliate/      # Affiliate tracking & links
│   │   │   ├── commissions/    # Commission engine
│   │   │   ├── wallets/        # Wallet & payout
│   │   │   ├── membership/     # Tier management
│   │   │   └── admin/          # Admin-specific endpoints
│   │   │
│   │   ├── shared/
│   │   │   ├── middleware/     # Auth, rate limit, logging
│   │   │   ├── utils/          # Helper functions
│   │   │   ├── events/         # Event emitter / queue
│   │   │   └── config/         # Environment config
│   │   │
│   │   └── jobs/               # Background workers
│   │       ├── commission.job.ts       # Proses komisi setelah order selesai
│   │       ├── auto-complete.job.ts    # Auto-complete order setelah X hari
│   │       ├── payout.job.ts           # Proses payout terjadwal
│   │       └── notification.job.ts     # Kirim notifikasi email/WA
│   │
│   ├── database/
│   │   ├── migrations/         # Migrasi database
│   │   └── seeds/              # Data awal (kategori, tier, admin)
│   │
│   └── tests/
│       ├── unit/
│       └── integration/
│
├── infrastructure/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── nginx/
│       └── nginx.conf
│
├── docs/
│   ├── api/                    # API documentation (OpenAPI/Swagger)
│   ├── database/               # ERD dan skema database
│   └── flows/                  # Diagram alur bisnis
│
├── .env.example
├── .gitignore
└── README.md                   # File ini
```

---

## 🔌 API Endpoints Overview

### Authentication
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh-token
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
```

### Products & Catalog
```
GET    /api/v1/products                  # List produk dengan filter & search
GET    /api/v1/products/:slug            # Detail produk
GET    /api/v1/categories                # List kategori
GET    /api/v1/merchants/:slug/products  # Produk milik merchant tertentu

# Merchant only:
POST   /api/v1/merchant/products
PUT    /api/v1/merchant/products/:id
DELETE /api/v1/merchant/products/:id
POST   /api/v1/merchant/products/bulk-upload
```

### Orders & Checkout
```
GET    /api/v1/cart                     # Lihat keranjang
POST   /api/v1/cart/items               # Tambah item
PUT    /api/v1/cart/items/:id           # Update quantity
DELETE /api/v1/cart/items/:id           # Hapus item

POST   /api/v1/orders/checkout          # Buat order & inisiasi pembayaran
GET    /api/v1/orders                   # Riwayat order pembeli
GET    /api/v1/orders/:id               # Detail order
POST   /api/v1/orders/:id/confirm-received  # Pembeli konfirmasi barang diterima

# Merchant:
GET    /api/v1/merchant/orders
PUT    /api/v1/merchant/orders/:id/ship  # Input nomor resi

# Webhook dari payment gateway:
POST   /api/v1/webhooks/midtrans
POST   /api/v1/webhooks/xendit
```

### Affiliate
```
GET    /api/v1/affiliate/dashboard          # Statistik affiliate
POST   /api/v1/affiliate/links              # Generate link baru
GET    /api/v1/affiliate/links              # List semua link
GET    /api/v1/affiliate/commissions        # Riwayat komisi
GET    /api/v1/affiliate/wallet             # Info wallet

# Public — tracking klik (dipanggil saat redirect):
GET    /r/:short_code                       # Redirect + catat klik
```

### Wallet & Payout
```
GET    /api/v1/wallet                       # Info wallet (merchant atau affiliate)
POST   /api/v1/wallet/withdraw              # Ajukan withdrawal
GET    /api/v1/wallet/transactions          # Riwayat transaksi wallet
```

### Admin
```
GET    /api/v1/admin/dashboard
GET    /api/v1/admin/merchants
PUT    /api/v1/admin/merchants/:id/verify
PUT    /api/v1/admin/merchants/:id/suspend
GET    /api/v1/admin/affiliates
PUT    /api/v1/admin/affiliates/:id/tier
GET    /api/v1/admin/orders
GET    /api/v1/admin/finance/report
GET    /api/v1/admin/withdrawal-requests
PUT    /api/v1/admin/withdrawal-requests/:id/approve
PUT    /api/v1/admin/withdrawal-requests/:id/reject
GET    /api/v1/admin/settings
PUT    /api/v1/admin/settings
```

---

## 🔐 Keamanan & Anti-Fraud

### Autentikasi & Otorisasi
- JWT Access Token (expired: 15 menit) + Refresh Token (expired: 30 hari)
- Role-based access control (RBAC): buyer, merchant, affiliate, admin
- Setiap endpoint divalidasi middleware dengan role yang sesuai
- Rate limiting per IP dan per user account

### Keamanan Pembayaran
- Verifikasi webhook signature dari payment gateway (HMAC-SHA256)
- Idempotency key untuk mencegah double-processing webhook
- Semua komunikasi dengan payment gateway menggunakan HTTPS + server-side (tidak via frontend)
- Tidak ada data kartu kredit yang disimpan di server platform

### Anti-Fraud Affiliate
- **Self-referral prevention**: Jika affiliate_id sama dengan buyer_id, komisi tidak diberikan
- **IP-based click dedup**: Klik dari IP yang sama dalam 1 jam hanya dihitung sekali
- **Suspicious click detection**: Alert jika rasio klik-to-konversi tidak normal
- **Device fingerprinting** (opsional, fase lanjut): Deteksi penggunaan VPN/proxy berulang
- **Cooling period**: Komisi tidak langsung approved — menunggu order selesai dan melewati return window

### Keamanan Data
- Password di-hash dengan bcrypt (minimal 12 rounds)
- Data sensitif (nomor rekening, NPWP) dienkripsi di database
- SQL injection prevention via ORM dengan parameterized queries
- XSS prevention via input sanitization
- CSRF protection untuk semua mutating endpoints

---

## 📅 Roadmap Pengembangan

### Phase 1 — MVP (Bulan 1–3)
- [ ] Setup infrastruktur dasar (database, backend, auth)
- [ ] Manajemen merchant & produk (CRUD)
- [ ] Storefront pembeli (browse, search, detail produk)
- [ ] Cart & checkout single merchant
- [ ] Integrasi payment gateway (Midtrans)
- [ ] Order management (merchant & buyer)
- [ ] Sistem affiliate dasar (ref link, tracking, komisi sederhana)
- [ ] Admin panel dasar
- [ ] Wallet merchant dan affiliate
- [ ] Email notifikasi

### Phase 2 — Feature Complete (Bulan 4–6)
- [ ] Checkout multi-merchant
- [ ] Sistem membership tier
- [ ] Affiliate dashboard lengkap dengan analytics
- [ ] Integrasi kurir dan tracking pengiriman
- [ ] Review & rating produk
- [ ] Wishlist
- [ ] Bulk upload produk
- [ ] Laporan keuangan lengkap
- [ ] Payout otomatis terjadwal
- [ ] WhatsApp notification

### Phase 3 — Growth & Optimization (Bulan 7–12)
- [ ] Aplikasi mobile (React Native / Flutter)
- [ ] Sistem voucher & diskon
- [ ] Flash sale & limited time offer
- [ ] Program loyalitas untuk pembeli
- [ ] SEO optimization (sitemap, meta, structured data)
- [ ] Elasticsearch untuk search produk yang lebih baik
- [ ] Recommendation engine (produk terkait, terlaris)
- [ ] Multi-currency support (opsional)
- [ ] Integrasi marketplace lain (Tokopedia, Shopee) via API

### Phase 4 — Scale (Bulan 12+)
- [ ] Ekstraksi ke microservices jika traffic tinggi
- [ ] CDN untuk aset statik
- [ ] Database read replica untuk query berat
- [ ] Data warehouse untuk analytics bisnis
- [ ] Machine learning untuk fraud detection

---

## ⚠️ Pertimbangan Teknis Penting

### 1. Race Condition pada Komisi
Webhook dari payment gateway bisa diterima lebih dari sekali. Pastikan:
- Implementasi **idempotency key** pada setiap proses order
- Gunakan database transaction + pessimistic locking saat update wallet
- Cek status order sebelum menjalankan commission engine

### 2. Konsistensi Data Finansial
- Selalu gunakan **database transaction** untuk operasi yang melibatkan banyak tabel finansial
- Jangan pernah update balance langsung — selalu via ledger/transaction record
- Audit trail untuk semua perubahan saldo (wallet_transactions table)

### 3. Cookie & Attribution Affiliate
- Cookie 30 hari adalah standard, tapi bisa di-override per merchant
- Tentukan model atribusi: **last-click** (default) atau **first-click**
- Jika pembeli klik 2 link affiliate berbeda, siapa yang dapat komisi? → Dokumentasikan kebijakannya sejak awal

### 4. Return & Refund
- Tentukan kebijakan: refund dalam berapa hari?
- Jika order sudah COMPLETED dan komisi sudah APPROVED, bagaimana jika ada dispute?
- Buat kebijakan tertulis yang jelas sebelum launch

### 5. Skalabilitas Pencarian Produk
- PostgreSQL full-text search cukup untuk 10.000–100.000 produk
- Di atas itu, pertimbangkan Elasticsearch atau Meilisearch
- Dari awal, desain query produk agar mudah dimigrasi ke search engine

### 6. Performa Halaman Produk
- Gunakan SSR (Next.js) untuk halaman produk agar SEO optimal
- Implement CDN untuk gambar produk
- Lazy loading gambar dan infinite scroll untuk list produk

---

## 📖 Glosarium

| Istilah | Definisi |
|---|---|
| **Merchant** | Penjual yang membuka toko di platform |
| **Affiliate Member** | Member yang mempromosikan produk dan mendapatkan komisi |
| **Ref Code** | Kode unik milik setiap affiliate untuk tracking |
| **Commission Engine** | Sistem otomatis yang menghitung dan mendistribusikan komisi |
| **Platform Fee** | Potongan yang diambil platform dari setiap transaksi |
| **Pending Balance** | Saldo yang sudah dihitung tapi belum bisa dicairkan (menunggu order selesai) |
| **Available Balance** | Saldo yang siap dicairkan |
| **Withdrawal** | Proses pencairan saldo ke rekening bank |
| **Cookie Duration** | Lamanya cookie referral tersimpan di browser pembeli |
| **Attribution** | Proses menentukan affiliate mana yang berhak atas komisi sebuah transaksi |
| **GMV** | Gross Merchandise Value — total nilai transaksi di platform |
| **Conversion Rate** | Persentase klik affiliate yang berujung pada transaksi |
| **Last-Click Attribution** | Model atribusi di mana komisi diberikan ke affiliate terakhir yang diklik sebelum transaksi |
| **Holding Period** | Waktu tunggu sebelum komisi dapat dicairkan |
| **Disbursement** | Transfer dana ke rekening bank merchant atau affiliate |

---

## 📞 Kontak & Kontribusi

> Dokumentasi ini merupakan living document — akan terus diperbarui seiring perkembangan proyek.

Untuk pertanyaan teknis, diskusi arsitektur, atau kontribusi pada proyek ini, silakan buka issue atau pull request di repositori ini.

---

*Versi dokumen: 1.0.0 | Terakhir diperbarui: 2026*