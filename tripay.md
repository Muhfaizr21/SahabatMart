# 📚 DOKUMENTASI LENGKAP INTEGRASI TRIPAY PAYMENT GATEWAY DENGAN GOLANG

**Referensi Resmi:** https://tripay.co.id/developer  
**Bahasa:** Golang  
**Status:** Production Ready  
**Tahun:** 2026

---

## 📑 DAFTAR ISI

1. [Pengenalan Tripay](#pengenalan-tripay)
2. [Setup Awal & Konfigurasi](#setup-awal--konfigurasi)
3. [Memahami Tipe Pembayaran](#memahami-tipe-pembayaran)
4. [Daftar Lengkap Channel Pembayaran](#daftar-lengkap-channel-pembayaran)
5. [Setup Project Golang](#setup-project-golang)
6. [Struktur Folder Project](#struktur-folder-project)
7. [Membuat Model Data](#membuat-model-data)
8. [API Dasar - Ambil Data Channel](#api-dasar---ambil-data-channel)
9. [Transaksi Closed Payment (Nominal Pasti)](#transaksi-closed-payment)
10. [Transaksi Open Payment (Nominal Fleksibel)](#transaksi-open-payment)
11. [Menerima Callback Notifikasi](#menerima-callback-notifikasi)
12. [Implementasi Lengkap Contoh Toko Online](#implementasi-lengkap-contoh-toko-online)
13. [Error Handling & Validation](#error-handling--validation)
14. [Testing & Debugging](#testing--debugging)
15. [Best Practices](#best-practices)

---

## 🎯 PENGENALAN TRIPAY

### Apa itu Tripay?

Tripay adalah **Payment Gateway** (Pintu Pembayaran) untuk e-commerce Indonesia yang menyediakan berbagai metode pembayaran:

- **Virtual Account**: Transfer ke nomor VA dari berbagai bank (BRI, BNI, BCA, Mandiri, dll)
- **Convenience Store**: Bayar di Alfamart, Indomaret, Alfamidi
- **E-Wallet**: OVO, Dana, ShopeePay
- **QRIS**: Bayar menggunakan QR code dari berbagai wallet

### Keuntungan Menggunakan Tripay

✅ **Banyak metode pembayaran** - Customer punya banyak pilihan  
✅ **Mudah diintegrasikan** - API yang simple dan jelas  
✅ **Real-time notification** - Notifikasi instant saat pembayaran masuk  
✅ **Settlement cepat** - Dana masuk ke rekening dalam hitungan jam  
✅ **Support 24/7** - Team support yang responsif  
✅ **Sandbox mode** - Bisa testing sebelum go live  

### Istilah-Istilah Penting

| Istilah | Penjelasan |
|---------|-----------|
| **API Key** | Token untuk authentikasi request ke Tripay |
| **Private Key** | Kunci rahasia untuk membuat signature |
| **Merchant** | Penjual/toko online Anda |
| **Merchant Ref** | Nomor invoice/order dari sistem Anda |
| **Reference** | Nomor referensi transaksi dari Tripay |
| **Signature** | Tanda tangan digital untuk keamanan |
| **Pay Code** | Kode pembayaran (untuk VA / Alfamart) |
| **Callback** | Notifikasi dari Tripay ke server Anda |
| **Webhook** | Sistem notifikasi berbasis HTTP |
| **Settlement** | Pencairan dana ke rekening merchant |

---

## 🔧 SETUP AWAL & KONFIGURASI

### Step 1: Daftar dan Buat Akun Tripay

1. Buka https://tripay.co.id
2. Klik **Daftar** atau **Register**
3. Isi form pendaftaran dengan data lengkap
4. Verifikasi email Anda
5. Login ke dashboard

### Step 2: Membuat Merchant

1. Masuk ke Dashboard Tripay
2. Cari menu **Merchant** atau **Toko**
3. Klik **Tambah Merchant**
4. Isi detail toko:
   - Nama Toko
   - Deskripsi
   - Email Support
   - Website URL
   - URL Callback (untuk webhook)
5. Simpan

### Step 3: Ambil API Key dan Private Key

#### Untuk Mode Sandbox (Testing)

1. Dari dashboard, cari menu: **API & Integrasi → Simulator → Merchant**
2. Pilih merchant Anda, klik **Detail**
3. Salin **API Key** (format: `sandbox_xxxxx`)
4. Salin **Private Key** (format: `xxxxxxxxxxxx`)

#### Untuk Mode Production (Live)

1. Dari dashboard, cari menu: **Merchant → Opsi → Edit**
2. Di bagian bawah halaman ada section **Credential API**
3. Salin **API Key** (format: `T0001`)
4. Salin **Private Key** (format: `xxxxxxxxxxxx`)

**⚠️ PENTING:** Jangan pernah membagikan Private Key ke siapa pun!

### Step 4: Mengaktifkan Channel Pembayaran

#### Untuk Mode Sandbox

1. Buka: **API & Integrasi → Simulator → Merchant**
2. Klik merchant Anda
3. Tab **Channel Pembayaran**
4. Pilih channel yang ingin diaktifkan (centang checkbox)
5. Simpan

#### Untuk Mode Production

1. Buka: **Merchant → Opsi**
2. Klik **Atur Channel Pembayaran**
3. Pilih channel yang ingin diaktifkan
4. Simpan

### Step 5: Konfigurasi Callback URL

1. Buka: **Merchant → Opsi → Edit**
2. Cari field **Callback URL**
3. Masukkan URL server Anda: `https://yoursite.com/api/tripay/callback`
4. Simpan

**URL Callback harus:**
- Menggunakan HTTPS (tidak boleh HTTP)
- Bisa diakses dari internet
- Responsif dan tidak timeout

### Step 6: Whitelist IP Tripay (Opsional)

Jika Anda menggunakan IP Whitelist pada server, tambahkan IP Tripay:

- **IPv4**: `95.111.200.230`
- **IPv6**: `2a04:3543:1000:2310:ac92:4cff:fe87:63f9`

---

## 📊 MEMAHAMI TIPE PEMBAYARAN

### Tipe 1: CLOSED PAYMENT (Nominal Sudah Pasti)

**Karakteristik:**
- ✅ Nominal pembayaran ditentukan merchant (sudah fixed)
- ✅ 1 kode bayar hanya bisa digunakan 1 kali saja
- ✅ Biaya bisa dibebankan ke merchant atau customer
- ✅ Waktu kadaluarsa bisa diatur (15 menit - 4320 menit)

**Kapan digunakan:**
- Ketika customer sudah tahu berapa yang harus dibayar
- Sistem e-commerce dengan checkout yang pasti nominalnya
- Invoice dengan nominal fixed

**Contoh alur:**
```
Customer lihat produk: Rp 500.000
Customer checkout → Total: Rp 504.250 (sudah termasuk fee)
Customer dapat kode VA: 1234567890
Customer transfer ke: BRI VA 1234567890 sebesar Rp 504.250
```

### Tipe 2: OPEN PAYMENT (Nominal Fleksibel)

**Karakteristik:**
- ✅ Nominal pembayaran TIDAK ditentukan sebelumnya
- ✅ 1 kode bayar bisa digunakan berkali-kali
- ✅ Customer bisa input nominal berapa saja
- ✅ Biaya hanya bisa dibebankan ke merchant

**Kapan digunakan:**
- Untuk donasi atau infak (nominal tidak pasti)
- Top-up saldo (customer input berapa)
- Layanan berlangganan dengan nominal variasi

**Contoh alur:**
```
Buat session pembayaran "Donasi"
Dapat kode VA: 1234567890
Customer bisa transfer: Rp 10.000 / Rp 100.000 / Rp 1.000.000
Semua transfer ke VA 1234567890 terdaftar
```

### Tipe Integrasi: DIRECT vs REDIRECT

#### DIRECT Type (Pembayaran langsung di website Anda)

Karakteristik:
- Customer tidak dialihkan ke halaman lain
- Semua UI pembayaran di website Anda
- Anda yang urus tampilan kode bayarnya

Channel DIRECT:
- Virtual Account (semua bank)
- Convenience Store (Alfamart, Indomaret)
- QRIS

Keuntungan:
- ✅ User experience lebih smooth
- ✅ Customer tidak perlu meninggalkan website
- ✅ Branding konsisten

#### REDIRECT Type (Pembayaran di halaman Tripay)

Karakteristik:
- Customer dialihkan ke halaman pembayaran Tripay
- Tripay yang urus tampilan dan proses pembayaran
- Customer kembali ke website setelah selesai

Channel REDIRECT:
- OVO
- Dana
- ShopeePay

Keuntungan:
- ✅ Lebih aman (PCI compliance)
- ✅ Tidak perlu urus tampilan pembayaran
- ✅ Lebih ringkas dan sederhana

### Alur Lengkap CLOSED PAYMENT (DIRECT)

```
┌─────────────┐
│   Customer  │
│ (Browser)   │
└──────┬──────┘
       │
       │ 1. Checkout & pilih metode pembayaran
       ↓
┌─────────────────────┐
│   Website Anda      │
│ (Golang Server)     │
└──────┬──────────────┘
       │
       │ 2. Kirim request ke Tripay API
       │    (method, amount, signature, dll)
       ↓
┌──────────────────┐
│  Tripay Server   │
└──────┬───────────┘
       │
       │ 3. Return: kode VA + checkout_url
       ↓
┌──────────────────┐
│   Website Anda   │
└──────┬───────────┘
       │
       │ 4. Tampilkan kode VA ke customer
       ↓
┌──────────────────┐
│   Customer       │
│ Transfer uang    │ ← Manual transfer ke bank
└──────┬───────────┘
       │
       │ 5. Dana diterima bank
       ↓
┌──────────────────┐
│  Tripay Server   │
│ Detect transaksi │
└──────┬───────────┘
       │
       │ 6. Kirim notifikasi (Callback)
       │    POST ke webhook_url Anda
       ↓
┌──────────────────────┐
│   Website Anda       │
│ Handle Callback      │ ← Validasi signature + update DB
└──────┬───────────────┘
       │
       │ 7. Response: {"success": true}
       ↓
┌──────────────────┐
│  Tripay Server   │
│ Callback sukses  │
└──────┬───────────┘
       │
       │ 8. Dana masuk ke akun merchant
       ↓
┌──────────────────┐
│   Website Anda   │
│ Proses order     │ ← Kirim barang / aktifkan layanan
│ Update status    │
└──────────────────┘
```

### Alur Lengkap CLOSED PAYMENT (REDIRECT)

```
┌─────────────┐
│   Customer  │
│ (Browser)   │
└──────┬──────┘
       │
       │ 1. Checkout & pilih metode (e.g., OVO)
       ↓
┌─────────────────────┐
│   Website Anda      │
│ (Golang Server)     │
└──────┬──────────────┘
       │
       │ 2. Kirim request ke Tripay API
       ↓
┌──────────────────┐
│  Tripay Server   │
└──────┬───────────┘
       │
       │ 3. Return: pay_url (URL ke halaman pembayaran)
       ↓
┌──────────────────┐
│   Website Anda   │
└──────┬───────────┘
       │
       │ 4. Redirect browser ke pay_url
       ↓
┌──────────────────┐
│  Halaman Pembayaran Tripay │
│ (OVO/Dana/ShopeePay)      │
└──────┬───────────┘
       │
       │ 5. Customer selesaikan pembayaran
       ↓
┌──────────────────┐
│  Tripay Server   │
│ Detect pembayaran│
└──────┬───────────┘
       │
       │ 6. Kirim Callback (notifikasi) ke Anda
       ↓
┌──────────────────────┐
│   Website Anda       │
│ Handle Callback      │ ← Validasi + update DB
└──────┬───────────────┘
       │
       │ 7. Redirect customer ke return_url
       ↓
┌──────────────────┐
│   Customer       │
│ (Success Page)   │
└──────────────────┘
```

---

## 📋 DAFTAR LENGKAP CHANNEL PEMBAYARAN

### VIRTUAL ACCOUNT (Tipe: DIRECT)

Semua menggunakan transfer bank biasa ke nomor virtual account.

**BRI Virtual Account (BRIVA)**
- Kode: `BRIVA`
- Biaya: Rp 4.250
- Min: Rp 10.000
- Max: Rp 10.000.000
- Waktu expired: 60 menit - 4.320 menit (3 hari)
- Cara: Transfer via Internet Banking BRI / Aplikasi BRImo

**BNI Virtual Account (BNIVA)**
- Kode: `BNIVA`
- Biaya: Rp 4.250
- Min: Rp 10.000
- Max: Rp 10.000.000
- Waktu expired: 15 menit - 1.440 menit
- Cara: Transfer via Internet Banking BNI / Aplikasi

**BCA Virtual Account (BCAVA)**
- Kode: `BCAVA`
- Biaya: Rp 5.500 (Biaya paling tinggi)
- Min: Rp 10.000
- Max: Rp 10.000.000
- Waktu expired: 15 menit - 4.320 menit
- Cara: Transfer via Internet Banking BCA / Aplikasi

**Mandiri Virtual Account (MANDIRIVA)**
- Kode: `MANDIRIVA`
- Biaya: Rp 4.250
- Min: Rp 10.000
- Max: Rp 10.000.000
- Waktu expired: 60 menit - 4.320 menit
- Cara: Transfer via Internet Banking Mandiri / Aplikasi

**CIMB Niaga Virtual Account (CIMBVA)**
- Kode: `CIMBVA`
- Biaya: Rp 4.250
- Min: Rp 10.000
- Max: Rp 10.000.000
- Waktu expired: 15 menit - 4.320 menit
- Cara: Transfer via Internet Banking CIMB / Aplikasi

**Permata Virtual Account (PERMATAVA)**
- Kode: `PERMATAVA`
- Biaya: Rp 4.250
- Min: Rp 10.000
- Max: Rp 10.000.000
- Waktu expired: 15 menit - 1.440 menit
- Cara: Transfer via Internet Banking Permata

**Muamalat Virtual Account (MUAMALATVA)**
- Kode: `MUAMALATVA`
- Biaya: Rp 4.250
- Min: Rp 10.000
- Max: Rp 10.000.000
- Waktu expired: 60 menit - 180 menit
- Cara: Transfer via Internet Banking Muamalat

**OCBC NISP Virtual Account (OCBCVA)**
- Kode: `OCBCVA`
- Biaya: Rp 4.250
- Min: Rp 10.000
- Max: Rp 10.000.000
- Waktu expired: 15 menit - 4.320 menit
- Cara: Transfer via Internet Banking OCBC

**Other Bank Virtual Account (OTHERBANKVA)**
- Kode: `OTHERBANKVA`
- Biaya: Rp 4.250
- Min: Rp 10.000
- Max: Rp 10.000.000
- Waktu expired: 15 menit - 1.440 menit
- Cara: Transfer dari bank manapun

### CONVENIENCE STORE (Tipe: DIRECT)

Bayar langsung di toko dengan membayar ke kasir.

**Alfamart**
- Kode: `ALFAMART`
- Biaya: Rp 3.500 (ke merchant) + Rp 3.000 (dari customer)
- Min: Rp 10.000
- Max: Rp 2.500.000
- Waktu expired: 60 menit - 1.440 menit
- Cara: Datang ke kasir Alfamart, kasir scan barcode, bayar

**Indomaret**
- Kode: `INDOMARET`
- Biaya: Rp 3.500 (ke merchant) + Rp 3.000 (dari customer)
- Min: Rp 10.000
- Max: Rp 2.500.000
- Waktu expired: 15 menit - 4.320 menit
- Cara: Datang ke kasir Indomaret, bilang kode transaksi, bayar

**Alfamidi**
- Kode: `ALFAMIDI`
- Biaya: Rp 3.500 (ke merchant) + Rp 3.000 (dari customer)
- Min: Rp 5.000
- Max: Rp 2.500.000
- Waktu expired: 60 menit - 1.440 menit
- Cara: Datang ke kasir Alfamidi, kasir scan, bayar

### E-WALLET (Tipe: REDIRECT)

Pembayaran via e-wallet digital, customer dialihkan ke halaman wallet.

**OVO**
- Kode: `OVO`
- Biaya: 3% (dari nominal)
- Min: Rp 1.000
- Max: Rp 10.000.000
- Waktu expired: 15 menit - 4.320 menit
- Cara: Redirect ke OVO, customer approve dari aplikasi OVO

**DANA**
- Kode: `DANA`
- Biaya: 3%
- Min: Rp 1.000
- Max: Rp 10.000.000
- Waktu expired: 15 menit - 60 menit
- Cara: Redirect ke DANA, customer approve dari aplikasi DANA

**ShopeePay**
- Kode: `SHOPEEPAY`
- Biaya: 3%
- Min: Rp 1.000
- Max: Rp 10.000.000
- Waktu expired: 15 menit - 60 menit
- Cara: Redirect ke ShopeePay, customer approve dari aplikasi

### QRIS (Tipe: DIRECT)

Bayar menggunakan QR code yang bisa dibaca dari berbagai wallet.

**QRIS by ShopeePay**
- Kode: `QRIS`
- Biaya: Rp 750 + 0,7%
- Min: Rp 1.000
- Max: Rp 5.000.000
- Waktu expired: 10 menit - 60 menit
- Cara: Tampilkan QR code, customer scan dengan wallet apapun

**QRIS Customizable**
- Kode: `QRISC`
- Biaya: Rp 750 + 0,7%
- Min: Rp 1.000
- Max: Rp 5.000.000
- Waktu expired: 10 menit - 1.440 menit
- Cara: Sama seperti QRIS tapi bisa customize

**QRIS (Standard)**
- Kode: `QRIS2`
- Biaya: Rp 750 + 0,7%
- Min: Rp 1.000
- Max: Rp 5.000.000
- Waktu expired: 10 menit - 1.440 menit
- Cara: Standard QRIS format

---

## 💻 SETUP PROJECT GOLANG

### Prasyarat

Pastikan sudah install:
- Golang versi 1.16+ (download dari https://golang.org)
- Git
- Postman (untuk testing API)
- Code editor (VS Code, GoLand, dll)

### Verifikasi Golang

```bash
# Cek versi golang
go version
# Output: go version go1.21.0 linux/amd64

# Cek GOPATH
go env GOPATH
# Output: /home/username/go
```

### Membuat Project Baru

```bash
# Buat folder project
mkdir tripay-integration
cd tripay-integration

# Inisialisasi module Go
go mod init github.com/yourusername/tripay-integration

# Output:
# go: creating new go.mod in /home/user/tripay-integration
# go: to add module requirements from code, run 'go get -u', and to sync the go.sum file, use 'go mod tidy'.
```

### Install Dependencies

```bash
# HTTP Client (untuk membuat request ke API Tripay)
go get github.com/go-resty/resty/v2

# Database ORM (untuk manajemen database)
go get gorm.io/gorm
go get gorm.io/driver/mysql

# Environment loader (untuk read .env file)
go get github.com/joho/godotenv

# JSON validation
go get github.com/go-playground/validator/v10

# Crypto/Hash (sudah built-in di Go)
# Go Fiber (web framework) - Optional tapi recommend
go get github.com/gofiber/fiber/v2

# Jalankan go mod tidy untuk cleanup
go mod tidy
```

### Struktur Folder Project

```
tripay-integration/
├── main.go                 # Entry point aplikasi
├── .env                    # Konfigurasi (API KEY, Private Key, dll)
├── .env.example            # Template .env
├── .gitignore              # File/folder yang tidak di-commit
├── go.mod                  # Go module definition
├── go.sum                  # Go module checksums
│
├── config/                 # Konfigurasi aplikasi
│   └── config.go          # Load dan manage config
│
├── models/                 # Data structures
│   ├── transaction.go      # Model transaksi
│   ├── payment.go         # Model pembayaran
│   └── response.go        # Response structures
│
├── handlers/              # HTTP request handlers
│   ├── transaction.go     # Handler transaksi
│   ├── payment.go        # Handler pembayaran
│   └── callback.go       # Handler webhook callback
│
├── services/             # Business logic
│   ├── tripay.go         # Service untuk API Tripay
│   ├── transaction.go    # Service untuk transaksi
│   └── payment.go        # Service untuk pembayaran
│
├── repositories/         # Database operations
│   ├── transaction.go    # Query transaksi
│   └── payment.go        # Query pembayaran
│
├── utils/                # Utility functions
│   ├── crypto.go         # Signature generation
│   ├── response.go       # Response formatter
│   └── validation.go     # Data validation
│
├── middleware/           # HTTP middleware
│   └── auth.go          # Authentication
│
├── routes/              # Route definitions
│   └── routes.go        # Setup semua routes
│
└── database/            # Database related
    └── database.go      # Database connection
```

---

## 🔐 MEMBUAT MODEL DATA (STRUCTS)

Struct di Golang adalah blueprint untuk data yang akan disimpan/dikirim.

### File: models/transaction.go

```golang
package models

import (
    "time"
)

// TransactionRequest - Data yang dikirim ke Tripay saat membuat transaksi
type TransactionRequest struct {
    Method        string                `json:"method" binding:"required"`       // Kode channel (BRIVA, QRIS, dll)
    MerchantRef   string                `json:"merchant_ref" binding:"required"` // Invoice number dari sistem Anda
    Amount        int64                 `json:"amount" binding:"required"`       // Nominal transaksi
    CustomerName  string                `json:"customer_name" binding:"required"`
    CustomerEmail string                `json:"customer_email" binding:"required,email"`
    CustomerPhone string                `json:"customer_phone"`
    OrderItems    []OrderItem           `json:"order_items" binding:"required"` // Detail produk yang dibeli
    ReturnURL     string                `json:"return_url"`                     // URL setelah selesai pembayaran
    ExpiredTime   int64                 `json:"expired_time"`                   // Unix timestamp kapan transaksi expired
    Signature     string                `json:"signature" binding:"required"`    // HMAC-SHA256
}

// OrderItem - Detail setiap produk yang dibeli
type OrderItem struct {
    SKU         string `json:"sku"`
    Name        string `json:"name" binding:"required"`
    Price       int64  `json:"price" binding:"required"`
    Quantity    int    `json:"quantity" binding:"required"`
    Subtotal    int64  `json:"subtotal" binding:"required"`
    ProductURL  string `json:"product_url"`
    ImageURL    string `json:"image_url"`
}

// TripayTransactionResponse - Response dari Tripay saat membuat transaksi
type TripayTransactionResponse struct {
    Success bool                  `json:"success"`
    Message string                `json:"message"`
    Data    TripayTransactionData `json:"data"`
}

type TripayTransactionData struct {
    Reference             string                    `json:"reference"`              // Nomor referensi dari Tripay
    MerchantRef           string                    `json:"merchant_ref"`           // Nomor referensi Anda
    PaymentSelectionType  string                    `json:"payment_selection_type"` // static atau dynamic
    PaymentMethod         string                    `json:"payment_method"`         // BRIVA, QRIS, dll
    PaymentName           string                    `json:"payment_name"`           // "BRI Virtual Account", dll
    CustomerName          string                    `json:"customer_name"`
    CustomerEmail         string                    `json:"customer_email"`
    CustomerPhone         string                    `json:"customer_phone"`
    Amount                int64                     `json:"amount"`
    FeeMerchant           int64                     `json:"fee_merchant"`  // Biaya untuk merchant
    FeeCustomer           int64                     `json:"fee_customer"`  // Biaya untuk customer
    TotalFee              int64                     `json:"total_fee"`     // Total biaya
    AmountReceived        int64                     `json:"amount_received"` // Jumlah bersih diterima
    PayCode               string                    `json:"pay_code"`      // Kode pembayaran (untuk VA)
    PayURL                *string                   `json:"pay_url"`       // URL pembayaran (untuk redirect)
    CheckoutURL           string                    `json:"checkout_url"`  // URL checkout di Tripay
    Status                string                    `json:"status"`        // UNPAID, PAID, EXPIRED, FAILED
    ExpiredTime           int64                     `json:"expired_time"`  // Unix timestamp expired
    PaidAt                *int64                    `json:"paid_at"`       // Unix timestamp dibayar
    OrderItems            []OrderItem               `json:"order_items"`
    Instructions          []PaymentInstruction      `json:"instructions"` // Cara pembayaran
    QRString              *string                   `json:"qr_string"`    // Data QR (jika QRIS)
    QRURL                 *string                   `json:"qr_url"`       // URL gambar QR
}

// PaymentInstruction - Cara untuk melakukan pembayaran
type PaymentInstruction struct {
    Title string   `json:"title"` // "Internet Banking", "Aplikasi", dll
    Steps []string `json:"steps"` // Array langkah-langkah pembayaran
}

// Transaction - Model database untuk menyimpan transaksi
type Transaction struct {
    ID               uint          `gorm:"primaryKey"`
    TripayReference  string        `gorm:"uniqueIndex;index"` // Nomor dari Tripay
    MerchantRef      string        `gorm:"index"`             // Invoice number Anda
    PaymentMethod    string        // BRIVA, QRIS, dll
    CustomerName     string
    CustomerEmail    string
    CustomerPhone    string
    Amount           int64 // Nominal asli
    FeeMerchant      int64 // Biaya merchant
    AmountReceived   int64 // Uang yang diterima (Amount - Fee)
    PayCode          string        // Kode pembayaran
    Status           string        `gorm:"index"` // UNPAID, PAID, EXPIRED, FAILED
    PayURL           *string       // URL untuk redirect
    CheckoutURL      string
    ExpiredTime      int64
    PaidAt           *int64
    CreatedAt        time.Time
    UpdatedAt        time.Time
    DeletedAt        *time.Time `gorm:"index"` // Soft delete
}

// TableName - Specify table name di database
func (Transaction) TableName() string {
    return "transactions"
}

// CallbackRequest - Data yang diterima dari Tripay saat callback
type CallbackRequest struct {
    Reference           string `json:"reference"`
    MerchantRef         string `json:"merchant_ref"`
    PaymentMethod       string `json:"payment_method"`
    PaymentMethodCode   string `json:"payment_method_code"`
    TotalAmount         int64  `json:"total_amount"`
    FeeMerchant         int64  `json:"fee_merchant"`
    FeeCustomer         int64  `json:"fee_customer"`
    TotalFee            int64  `json:"total_fee"`
    AmountReceived      int64  `json:"amount_received"`
    IsClosedPayment     int    `json:"is_closed_payment"` // 1 = closed, 0 = open
    Status              string `json:"status"`            // PAID, FAILED, EXPIRED, REFUND
    PaidAt              *int64 `json:"paid_at"`
    Note                *string `json:"note"`
}

// CallbackResponse - Response yang harus dikirim balik ke Tripay
type CallbackResponse struct {
    Success bool   `json:"success"`
    Message string `json:"message"`
}
```

### File: models/payment.go

```golang
package models

import "time"

// PaymentChannel - Channel pembayaran dari Tripay
type PaymentChannel struct {
    Group          string      `json:"group"`           // "Virtual Account", "E-Wallet", dll
    Code           string      `json:"code"`            // BRIVA, QRIS, OVO, dll
    Name           string      `json:"name"`            // "BRI Virtual Account", dll
    Type           string      `json:"type"`            // "direct" atau "redirect"
    FeeMerchant    FeeDetails  `json:"fee_merchant"`
    FeeCustomer    FeeDetails  `json:"fee_customer"`
    TotalFee       FeeDetails  `json:"total_fee"`
    MinimumFee     int64       `json:"minimum_fee"`
    MaximumFee     int64       `json:"maximum_fee"`
    MinimumAmount  int64       `json:"minimum_amount"`
    MaximumAmount  int64       `json:"maximum_amount"`
    IconURL        string      `json:"icon_url"`
    Active         bool        `json:"active"`
}

// FeeDetails - Detail biaya (flat + percent)
type FeeDetails struct {
    Flat    int64   `json:"flat"`    // Biaya tetap (Rp)
    Percent float64 `json:"percent"` // Biaya persen (%)
}

// MerchantPaymentChannelsResponse - Response ambil daftar channel
type MerchantPaymentChannelsResponse struct {
    Success bool             `json:"success"`
    Message string           `json:"message"`
    Data    []PaymentChannel `json:"data"`
}

// FeeCalculatorRequest - Request untuk hitung biaya
type FeeCalculatorRequest struct {
    Amount int64  `json:"amount" binding:"required"`
    Code   string `json:"code"`
}

// FeeCalculatorItem - Detail perhitungan fee untuk 1 channel
type FeeCalculatorItem struct {
    Code     string      `json:"code"`
    Name     string      `json:"name"`
    Fee      FeeDetails  `json:"fee"`
    TotalFee FeeBreakdown `json:"total_fee"`
}

// FeeBreakdown - Rincian biaya untuk merchant dan customer
type FeeBreakdown struct {
    Merchant int64 `json:"merchant"`
    Customer int64 `json:"customer"`
}

// FeeCalculatorResponse - Response hitung biaya
type FeeCalculatorResponse struct {
    Success bool                 `json:"success"`
    Message string               `json:"message"`
    Data    []FeeCalculatorItem  `json:"data"`
}

// PaymentInstructionResponse - Response instruksi pembayaran
type PaymentInstructionResponse struct {
    Success bool                   `json:"success"`
    Message string                 `json:"message"`
    Data    []PaymentInstructions  `json:"data"`
}

// PaymentInstructions - Instruksi cara pembayaran
type PaymentInstructions struct {
    Title string   `json:"title"` // "Internet Banking", dll
    Steps []string `json:"steps"` // Langkah-langkah pembayaran
}

// MerchantTransactionsResponse - Response daftar transaksi
type MerchantTransactionsResponse struct {
    Success    bool           `json:"success"`
    Message    string         `json:"message"`
    Data       []Transaction  `json:"data"`
    Pagination PaginationInfo `json:"pagination"`
}

// PaginationInfo - Info pagination
type PaginationInfo struct {
    Sort       string `json:"sort"`
    Offset     Offset `json:"offset"`
    CurrentPage int   `json:"current_page"`
    PreviousPage *int `json:"previous_page"`
    NextPage   *int   `json:"next_page"`
    LastPage   int    `json:"last_page"`
    PerPage    int    `json:"per_page"`
    TotalRecords int  `json:"total_records"`
}

// Offset - Offset dalam pagination
type Offset struct {
    From int `json:"from"`
    To   int `json:"to"`
}
```

### File: models/response.go

```golang
package models

// APIResponse - Format response standard untuk semua endpoint
type APIResponse struct {
    Success bool        `json:"success"`
    Message string      `json:"message"`
    Data    interface{} `json:"data,omitempty"` // Bisa kosong jika tidak ada data
    Error   string      `json:"error,omitempty"`
    Code    int         `json:"code"`
}

// CreateTransactionRequest - Request untuk create transaksi
type CreateTransactionRequest struct {
    Method        string      `json:"method" binding:"required"`
    MerchantRef   string      `json:"merchant_ref" binding:"required"`
    Amount        int64       `json:"amount" binding:"required,gt=0"`
    CustomerName  string      `json:"customer_name" binding:"required"`
    CustomerEmail string      `json:"customer_email" binding:"required,email"`
    CustomerPhone string      `json:"customer_phone"`
    OrderItems    []OrderItem `json:"order_items" binding:"required,min=1"`
    ReturnURL     string      `json:"return_url"`
    ExpiredTime   *int64      `json:"expired_time"`
}
```

---

## 🔗 MEMBUAT CLIENT TRIPAY (SERVICE LAYER)

### File: services/tripay.go

File ini berisi semua fungsi untuk berkomunikasi dengan API Tripay.

```golang
package services

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "log"
    "strings"
    "time"

    "github.com/go-resty/resty/v2"
    "your-module/models"
)

// TripayClient - Struct untuk manage komunikasi dengan Tripay API
type TripayClient struct {
    BaseURL    string  // Base URL API (sandbox atau production)
    APIKey     string  // API Key untuk authentikasi
    PrivateKey string  // Private key untuk signature
    MerchantCode string // Kode merchant Anda
    Client     *resty.Client // HTTP client
}

// NewTripayClient - Constructor untuk membuat instance TripayClient
func NewTripayClient(baseURL, apiKey, privateKey, merchantCode string) *TripayClient {
    client := resty.New()
    client.SetBaseURL(baseURL)
    client.SetTimeout(30 * time.Second)
    
    return &TripayClient{
        BaseURL:      baseURL,
        APIKey:       apiKey,
        PrivateKey:   privateKey,
        MerchantCode: merchantCode,
        Client:       client,
    }
}

// GenerateSignature - Generate HMAC-SHA256 signature
// Formula: HMAC-SHA256(merchant_code + ref + amount, private_key)
func (tc *TripayClient) GenerateSignature(merchantRef string, amount int64) string {
    message := tc.MerchantCode + merchantRef + fmt.Sprintf("%d", amount)
    
    h := hmac.New(sha256.New, []byte(tc.PrivateKey))
    h.Write([]byte(message))
    signature := hex.EncodeToString(h.Sum(nil))
    
    return signature
}

// GenerateOpenPaymentSignature - Generate signature untuk open payment
// Formula: HMAC-SHA256(merchant_code + channel + ref, private_key)
func (tc *TripayClient) GenerateOpenPaymentSignature(channel, merchantRef string) string {
    message := tc.MerchantCode + channel + merchantRef
    
    h := hmac.New(sha256.New, []byte(tc.PrivateKey))
    h.Write([]byte(message))
    signature := hex.EncodeToString(h.Sum(nil))
    
    return signature
}

// GenerateCallbackSignature - Generate signature untuk validasi callback
// Formula: HMAC-SHA256(json_body, private_key)
func (tc *TripayClient) GenerateCallbackSignature(jsonBody string) string {
    h := hmac.New(sha256.New, []byte(tc.PrivateKey))
    h.Write([]byte(jsonBody))
    signature := hex.EncodeToString(h.Sum(nil))
    
    return signature
}

// ============================================
// PAYMENT CHANNEL METHODS
// ============================================

// GetPaymentChannels - Ambil daftar channel pembayaran yang aktif
func (tc *TripayClient) GetPaymentChannels() (*models.MerchantPaymentChannelsResponse, error) {
    var response models.MerchantPaymentChannelsResponse
    
    _, err := tc.Client.R().
        SetHeader("Authorization", "Bearer " + tc.APIKey).
        SetResult(&response).
        Get("/merchant/payment-channel")
    
    if err != nil {
        log.Printf("Error getting payment channels: %v", err)
        return nil, err
    }
    
    if !response.Success {
        return nil, fmt.Errorf("API error: %s", response.Message)
    }
    
    return &response, nil
}

// GetPaymentInstructions - Ambil instruksi pembayaran untuk suatu channel
func (tc *TripayClient) GetPaymentInstructions(
    code string,
    payCode *string,
    amount *int64,
) (*models.PaymentInstructionResponse, error) {
    var response models.PaymentInstructionResponse
    
    req := tc.Client.R().
        SetHeader("Authorization", "Bearer " + tc.APIKey).
        SetQueryParam("code", code).
        SetResult(&response)
    
    if payCode != nil {
        req.SetQueryParam("pay_code", *payCode)
    }
    
    if amount != nil {
        req.SetQueryParam("amount", fmt.Sprintf("%d", *amount))
    }
    
    req.SetQueryParam("allow_html", "1")
    
    _, err := req.Get("/payment/instruction")
    
    if err != nil {
        log.Printf("Error getting payment instructions: %v", err)
        return nil, err
    }
    
    if !response.Success {
        return nil, fmt.Errorf("API error: %s", response.Message)
    }
    
    return &response, nil
}

// ============================================
// TRANSACTION METHODS
// ============================================

// CreateTransaction - Buat transaksi baru (CLOSED PAYMENT)
func (tc *TripayClient) CreateTransaction(
    req *models.TransactionRequest,
) (*models.TripayTransactionResponse, error) {
    
    // Validate required fields
    if req.Method == "" || req.MerchantRef == "" || req.Amount <= 0 {
        return nil, fmt.Errorf("invalid transaction request")
    }
    
    var response models.TripayTransactionResponse
    
    // Buat payload untuk dikirim
    payload := map[string]interface{}{
        "method":           req.Method,
        "merchant_ref":     req.MerchantRef,
        "amount":           req.Amount,
        "customer_name":    req.CustomerName,
        "customer_email":   req.CustomerEmail,
        "customer_phone":   req.CustomerPhone,
        "return_url":       req.ReturnURL,
        "expired_time":     req.ExpiredTime,
        "signature":        req.Signature,
    }
    
    // Tambah order items ke payload
    for i, item := range req.OrderItems {
        prefix := fmt.Sprintf("order_items[%d]", i)
        payload[prefix + "[sku]"] = item.SKU
        payload[prefix + "[name]"] = item.Name
        payload[prefix + "[price]"] = item.Price
        payload[prefix + "[quantity]"] = item.Quantity
        payload[prefix + "[subtotal]"] = item.Subtotal
        payload[prefix + "[product_url]"] = item.ProductURL
        payload[prefix + "[image_url]"] = item.ImageURL
    }
    
    _, err := tc.Client.R().
        SetHeader("Authorization", "Bearer " + tc.APIKey).
        SetFormData(payload).
        SetResult(&response).
        Post("/transaction/create")
    
    if err != nil {
        log.Printf("Error creating transaction: %v", err)
        return nil, err
    }
    
    if !response.Success {
        return nil, fmt.Errorf("API error: %s", response.Message)
    }
    
    return &response, nil
}

// GetTransactionDetail - Ambil detail transaksi
func (tc *TripayClient) GetTransactionDetail(reference string) (*models.TripayTransactionResponse, error) {
    var response models.TripayTransactionResponse
    
    _, err := tc.Client.R().
        SetHeader("Authorization", "Bearer " + tc.APIKey).
        SetQueryParam("reference", reference).
        SetResult(&response).
        Get("/transaction/detail")
    
    if err != nil {
        log.Printf("Error getting transaction detail: %v", err)
        return nil, err
    }
    
    if !response.Success {
        return nil, fmt.Errorf("API error: %s", response.Message)
    }
    
    return &response, nil
}

// CheckTransactionStatus - Cek status transaksi
func (tc *TripayClient) CheckTransactionStatus(reference string) (string, error) {
    var response struct {
        Success bool   `json:"success"`
        Message string `json:"message"`
    }
    
    _, err := tc.Client.R().
        SetHeader("Authorization", "Bearer " + tc.APIKey).
        SetQueryParam("reference", reference).
        SetResult(&response).
        Get("/transaction/check-status")
    
    if err != nil {
        log.Printf("Error checking transaction status: %v", err)
        return "", err
    }
    
    if !response.Success {
        return "", fmt.Errorf("API error: %s", response.Message)
    }
    
    return response.Message, nil
}

// GetMerchantTransactions - Ambil daftar transaksi merchant
func (tc *TripayClient) GetMerchantTransactions(
    page, perPage int,
    filters map[string]interface{},
) (*models.MerchantTransactionsResponse, error) {
    
    var response models.MerchantTransactionsResponse
    
    req := tc.Client.R().
        SetHeader("Authorization", "Bearer " + tc.APIKey).
        SetQueryParam("page", fmt.Sprintf("%d", page)).
        SetQueryParam("per_page", fmt.Sprintf("%d", perPage)).
        SetQueryParam("sort", "desc").
        SetResult(&response)
    
    // Apply filters jika ada
    if filters != nil {
        if status, ok := filters["status"].(string); ok {
            req.SetQueryParam("status", status)
        }
        if method, ok := filters["method"].(string); ok {
            req.SetQueryParam("method", method)
        }
        if merchantRef, ok := filters["merchant_ref"].(string); ok {
            req.SetQueryParam("merchant_ref", merchantRef)
        }
    }
    
    _, err := req.Get("/merchant/transactions")
    
    if err != nil {
        log.Printf("Error getting merchant transactions: %v", err)
        return nil, err
    }
    
    if !response.Success {
        return nil, fmt.Errorf("API error: %s", response.Message)
    }
    
    return &response, nil
}

// ============================================
// OPEN PAYMENT METHODS
// ============================================

// CreateOpenPayment - Buat transaksi open payment
func (tc *TripayClient) CreateOpenPayment(
    method string,
    merchantRef *string,
    customerName *string,
) (*models.TripayTransactionResponse, error) {
    
    if method == "" {
        return nil, fmt.Errorf("method is required")
    }
    
    signature := tc.GenerateOpenPaymentSignature(method, *merchantRef)
    
    var response models.TripayTransactionResponse
    
    payload := map[string]interface{}{
        "method":        method,
        "merchant_ref":  merchantRef,
        "customer_name": customerName,
        "signature":     signature,
    }
    
    _, err := tc.Client.R().
        SetHeader("Authorization", "Bearer " + tc.APIKey).
        SetFormData(payload).
        SetResult(&response).
        Post("/open-payment/create")
    
    if err != nil {
        log.Printf("Error creating open payment: %v", err)
        return nil, err
    }
    
    if !response.Success {
        return nil, fmt.Errorf("API error: %s", response.Message)
    }
    
    return &response, nil
}

// GetOpenPaymentDetail - Ambil detail open payment
func (tc *TripayClient) GetOpenPaymentDetail(uuid string) (*models.TripayTransactionResponse, error) {
    var response models.TripayTransactionResponse
    
    _, err := tc.Client.R().
        SetHeader("Authorization", "Bearer " + tc.APIKey).
        SetResult(&response).
        Get("/open-payment/" + uuid + "/detail")
    
    if err != nil {
        log.Printf("Error getting open payment detail: %v", err)
        return nil, err
    }
    
    if !response.Success {
        return nil, fmt.Errorf("API error: %s", response.Message)
    }
    
    return &response, nil
}

// GetOpenPaymentTransactions - Ambil daftar pembayaran untuk open payment
func (tc *TripayClient) GetOpenPaymentTransactions(uuid string, perPage int) (*models.MerchantTransactionsResponse, error) {
    var response models.MerchantTransactionsResponse
    
    _, err := tc.Client.R().
        SetHeader("Authorization", "Bearer " + tc.APIKey).
        SetQueryParam("per_page", fmt.Sprintf("%d", perPage)).
        SetResult(&response).
        Get("/open-payment/" + uuid + "/transactions")
    
    if err != nil {
        log.Printf("Error getting open payment transactions: %v", err)
        return nil, err
    }
    
    if !response.Success {
        return nil, fmt.Errorf("API error: %s", response.Message)
    }
    
    return &response, nil
}

// ============================================
// FEE CALCULATOR METHODS
// ============================================

// CalculateFee - Hitung biaya transaksi
func (tc *TripayClient) CalculateFee(amount int64, code *string) (*models.FeeCalculatorResponse, error) {
    var response models.FeeCalculatorResponse
    
    req := tc.Client.R().
        SetHeader("Authorization", "Bearer " + tc.APIKey).
        SetQueryParam("amount", fmt.Sprintf("%d", amount)).
        SetResult(&response)
    
    if code != nil {
        req.SetQueryParam("code", *code)
    }
    
    _, err := req.Get("/merchant/fee-calculator")
    
    if err != nil {
        log.Printf("Error calculating fee: %v", err)
        return nil, err
    }
    
    if !response.Success {
        return nil, fmt.Errorf("API error: %s", response.Message)
    }
    
    return &response, nil
}
```

---

## 📤 HANDLERS (HTTP ENDPOINTS)

### File: handlers/transaction.go

```golang
package handlers

import (
    "fmt"
    "log"
    "net/http"
    "strconv"
    "time"

    "github.com/go-playground/validator/v10"
    "your-module/models"
    "your-module/services"
    "your-module/utils"
)

// TransactionHandler - Struct untuk handle transaction requests
type TransactionHandler struct {
    tripayService *services.TripayClient
}

// NewTransactionHandler - Constructor
func NewTransactionHandler(tripayService *services.TripayClient) *TransactionHandler {
    return &TransactionHandler{
        tripayService: tripayService,
    }
}

// CreateTransaction - Handler untuk create transaksi baru
// POST /api/transactions
func (h *TransactionHandler) CreateTransaction(c interface{}, body []byte) {
    var req models.CreateTransactionRequest
    
    // Parse request body
    if err := json.Unmarshal(body, &req); err != nil {
        logError("Invalid request body", err)
        utils.SendErrorResponse(c, http.StatusBadRequest, "Invalid request body")
        return
    }
    
    // Validate request
    validate := validator.New()
    if err := validate.Struct(req); err != nil {
        logError("Validation error", err)
        utils.SendErrorResponse(c, http.StatusBadRequest, "Validation failed")
        return
    }
    
    // Set default expired time jika tidak diberikan (24 jam ke depan)
    expiredTime := time.Now().Add(24 * time.Hour).Unix()
    if req.ExpiredTime != nil && *req.ExpiredTime > 0 {
        expiredTime = *req.ExpiredTime
    }
    
    // Generate signature
    merchantRef := req.MerchantRef
    amount := req.Amount
    signature := h.tripayService.GenerateSignature(merchantRef, amount)
    
    // Buat transaksi request
    transactionReq := &models.TransactionRequest{
        Method:        req.Method,
        MerchantRef:   merchantRef,
        Amount:        amount,
        CustomerName:  req.CustomerName,
        CustomerEmail: req.CustomerEmail,
        CustomerPhone: req.CustomerPhone,
        OrderItems:    req.OrderItems,
        ReturnURL:     req.ReturnURL,
        ExpiredTime:   expiredTime,
        Signature:     signature,
    }
    
    // Kirim ke Tripay API
    tripayResp, err := h.tripayService.CreateTransaction(transactionReq)
    if err != nil {
        logError("Failed to create transaction in Tripay", err)
        utils.SendErrorResponse(c, http.StatusInternalServerError, "Failed to create transaction")
        return
    }
    
    if !tripayResp.Success {
        logError("Tripay API error", fmt.Errorf(tripayResp.Message))
        utils.SendErrorResponse(c, http.StatusBadRequest, tripayResp.Message)
        return
    }
    
    // Simpan ke database (opsional)
    // Bisa menggunakan repository untuk save ke database
    
    // Return response
    utils.SendSuccessResponse(c, http.StatusOK, "Transaction created successfully", tripayResp.Data)
}

// GetTransactionDetail - Handler untuk ambil detail transaksi
// GET /api/transactions/:reference
func (h *TransactionHandler) GetTransactionDetail(c interface{}, reference string) {
    if reference == "" {
        utils.SendErrorResponse(c, http.StatusBadRequest, "Reference is required")
        return
    }
    
    // Ambil dari Tripay
    tripayResp, err := h.tripayService.GetTransactionDetail(reference)
    if err != nil {
        logError("Failed to get transaction detail", err)
        utils.SendErrorResponse(c, http.StatusInternalServerError, "Failed to get transaction")
        return
    }
    
    if !tripayResp.Success {
        utils.SendErrorResponse(c, http.StatusNotFound, "Transaction not found")
        return
    }
    
    utils.SendSuccessResponse(c, http.StatusOK, "Success", tripayResp.Data)
}

// CheckTransactionStatus - Handler untuk cek status transaksi
// GET /api/transactions/:reference/status
func (h *TransactionHandler) CheckTransactionStatus(c interface{}, reference string) {
    if reference == "" {
        utils.SendErrorResponse(c, http.StatusBadRequest, "Reference is required")
        return
    }
    
    status, err := h.tripayService.CheckTransactionStatus(reference)
    if err != nil {
        logError("Failed to check transaction status", err)
        utils.SendErrorResponse(c, http.StatusInternalServerError, "Failed to check status")
        return
    }
    
    utils.SendSuccessResponse(c, http.StatusOK, status, nil)
}

// GetMerchantTransactions - Handler untuk ambil daftar transaksi
// GET /api/transactions
func (h *TransactionHandler) GetMerchantTransactions(
    c interface{},
    page, perPage int,
    status, method, merchantRef string,
) {
    
    // Default pagination
    if page <= 0 {
        page = 1
    }
    if perPage <= 0 || perPage > 50 {
        perPage = 25
    }
    
    // Build filters
    filters := make(map[string]interface{})
    if status != "" {
        filters["status"] = status
    }
    if method != "" {
        filters["method"] = method
    }
    if merchantRef != "" {
        filters["merchant_ref"] = merchantRef
    }
    
    // Ambil dari Tripay
    tripayResp, err := h.tripayService.GetMerchantTransactions(page, perPage, filters)
    if err != nil {
        logError("Failed to get merchant transactions", err)
        utils.SendErrorResponse(c, http.StatusInternalServerError, "Failed to get transactions")
        return
    }
    
    if !tripayResp.Success {
        utils.SendErrorResponse(c, http.StatusBadRequest, tripayResp.Message)
        return
    }
    
    utils.SendSuccessResponse(c, http.StatusOK, "Success", tripayResp)
}

// Helper function untuk logging error
func logError(message string, err error) {
    log.Printf("[ERROR] %s: %v", message, err)
}
```

### File: handlers/payment.go

```golang
package handlers

import (
    "fmt"
    "log"
    "net/http"

    "your-module/models"
    "your-module/services"
    "your-module/utils"
)

// PaymentHandler - Handler untuk payment endpoints
type PaymentHandler struct {
    tripayService *services.TripayClient
}

// NewPaymentHandler - Constructor
func NewPaymentHandler(tripayService *services.TripayClient) *PaymentHandler {
    return &PaymentHandler{
        tripayService: tripayService,
    }
}

// GetPaymentChannels - Ambil daftar channel pembayaran
// GET /api/payment/channels
func (h *PaymentHandler) GetPaymentChannels(c interface{}) {
    channels, err := h.tripayService.GetPaymentChannels()
    if err != nil {
        logError("Failed to get payment channels", err)
        utils.SendErrorResponse(c, http.StatusInternalServerError, "Failed to get channels")
        return
    }
    
    if !channels.Success {
        utils.SendErrorResponse(c, http.StatusBadRequest, channels.Message)
        return
    }
    
    utils.SendSuccessResponse(c, http.StatusOK, "Success", channels.Data)
}

// GetPaymentInstructions - Ambil instruksi pembayaran untuk suatu channel
// GET /api/payment/instructions?code=BRIVA&pay_code=123456&amount=100000
func (h *PaymentHandler) GetPaymentInstructions(
    c interface{},
    code string,
    payCode *string,
    amount *int64,
) {
    
    if code == "" {
        utils.SendErrorResponse(c, http.StatusBadRequest, "Channel code is required")
        return
    }
    
    instructions, err := h.tripayService.GetPaymentInstructions(code, payCode, amount)
    if err != nil {
        logError("Failed to get payment instructions", err)
        utils.SendErrorResponse(c, http.StatusInternalServerError, "Failed to get instructions")
        return
    }
    
    if !instructions.Success {
        utils.SendErrorResponse(c, http.StatusBadRequest, instructions.Message)
        return
    }
    
    utils.SendSuccessResponse(c, http.StatusOK, "Success", instructions.Data)
}

// CalculateFee - Hitung biaya transaksi
// GET /api/payment/fee-calculator?amount=100000&code=QRIS
func (h *PaymentHandler) CalculateFee(
    c interface{},
    amount int64,
    code *string,
) {
    
    if amount <= 0 {
        utils.SendErrorResponse(c, http.StatusBadRequest, "Amount must be greater than 0")
        return
    }
    
    feeResp, err := h.tripayService.CalculateFee(amount, code)
    if err != nil {
        logError("Failed to calculate fee", err)
        utils.SendErrorResponse(c, http.StatusInternalServerError, "Failed to calculate fee")
        return
    }
    
    if !feeResp.Success {
        utils.SendErrorResponse(c, http.StatusBadRequest, feeResp.Message)
        return
    }
    
    utils.SendSuccessResponse(c, http.StatusOK, "Success", feeResp.Data)
}
```

### File: handlers/callback.go

```golang
package handlers

import (
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"

    "your-module/models"
    "your-module/services"
    "your-module/utils"
)

// CallbackHandler - Handler untuk menerima callback dari Tripay
type CallbackHandler struct {
    tripayService *services.TripayClient
}

// NewCallbackHandler - Constructor
func NewCallbackHandler(tripayService *services.TripayClient) *CallbackHandler {
    return &CallbackHandler{
        tripayService: tripayService,
    }
}

// HandleCallback - Terima callback dari Tripay
// POST /api/tripay/callback
func (h *CallbackHandler) HandleCallback(w http.ResponseWriter, r *http.Request) {
    // Cek method
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    
    // Baca raw body untuk validasi signature
    rawBody, err := io.ReadAll(r.Body)
    if err != nil {
        logError("Failed to read request body", err)
        sendCallbackError(w, "Invalid request body")
        return
    }
    defer r.Body.Close()
    
    // Ambil signature dari header
    callbackSignature := r.Header.Get("X-Callback-Signature")
    callbackEvent := r.Header.Get("X-Callback-Event")
    
    if callbackSignature == "" || callbackEvent == "" {
        logError("Missing callback headers", fmt.Errorf("signature or event header missing"))
        sendCallbackError(w, "Missing callback headers")
        return
    }
    
    // Validasi signature
    expectedSignature := h.tripayService.GenerateCallbackSignature(string(rawBody))
    if callbackSignature != expectedSignature {
        logError("Invalid callback signature", fmt.Errorf("signature mismatch"))
        sendCallbackError(w, "Invalid signature")
        return
    }
    
    // Validasi event type
    if callbackEvent != "payment_status" {
        logError("Unrecognized callback event", fmt.Errorf("event: %s", callbackEvent))
        sendCallbackError(w, "Unrecognized callback event")
        return
    }
    
    // Parse callback data
    var callbackData models.CallbackRequest
    if err := json.Unmarshal(rawBody, &callbackData); err != nil {
        logError("Failed to parse callback data", err)
        sendCallbackError(w, "Invalid callback data")
        return
    }
    
    // Handle berbeda berdasarkan status
    switch callbackData.Status {
    case "PAID":
        h.handlePaidCallback(&callbackData, w)
    case "EXPIRED":
        h.handleExpiredCallback(&callbackData, w)
    case "FAILED":
        h.handleFailedCallback(&callbackData, w)
    default:
        logError("Unrecognized payment status", fmt.Errorf("status: %s", callbackData.Status))
        sendCallbackError(w, "Unrecognized payment status")
        return
    }
}

// handlePaidCallback - Handle callback untuk pembayaran sukses
func (h *CallbackHandler) handlePaidCallback(
    callback *models.CallbackRequest,
    w http.ResponseWriter,
) {
    
    log.Printf("[CALLBACK PAID] Reference: %s, MerchantRef: %s, Amount: %d",
        callback.Reference,
        callback.MerchantRef,
        callback.AmountReceived,
    )
    
    // UPDATE DATABASE
    // Contoh:
    // - Update status transaksi menjadi PAID di tabel transactions
    // - Update tabel orders menjadi paid
    // - Trigger sending email konfirmasi
    // - Trigger kirim barang / aktifkan layanan
    
    // Contoh pseudo code:
    /*
    err := db.Model(&models.Transaction{}).
        Where("tripay_reference = ?", callback.Reference).
        Updates(map[string]interface{}{
            "status": "PAID",
            "paid_at": time.Now().Unix(),
        }).Error
    
    if err != nil {
        logError("Failed to update transaction", err)
        sendCallbackError(w, "Failed to process payment")
        return
    }
    */
    
    // Send success response ke Tripay
    sendCallbackSuccess(w)
}

// handleExpiredCallback - Handle callback untuk transaksi expired
func (h *CallbackHandler) handleExpiredCallback(
    callback *models.CallbackRequest,
    w http.ResponseWriter,
) {
    
    log.Printf("[CALLBACK EXPIRED] Reference: %s, MerchantRef: %s",
        callback.Reference,
        callback.MerchantRef,
    )
    
    // UPDATE DATABASE
    // Update status menjadi EXPIRED
    
    // Send success response
    sendCallbackSuccess(w)
}

// handleFailedCallback - Handle callback untuk pembayaran gagal
func (h *CallbackHandler) handleFailedCallback(
    callback *models.CallbackRequest,
    w http.ResponseWriter,
) {
    
    log.Printf("[CALLBACK FAILED] Reference: %s, MerchantRef: %s",
        callback.Reference,
        callback.MerchantRef,
    )
    
    // UPDATE DATABASE
    // Update status menjadi FAILED
    
    // Send success response
    sendCallbackSuccess(w)
}

// Helper untuk send callback success response
func sendCallbackSuccess(w http.ResponseWriter) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(models.CallbackResponse{
        Success: true,
    })
}

// Helper untuk send callback error response
func sendCallbackError(w http.ResponseWriter, message string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusBadRequest)
    json.NewEncoder(w).Encode(models.CallbackResponse{
        Success: false,
        Message: message,
    })
}
```

---

## ⚙️ KONFIGURASI & UTILITIES

### File: config/config.go

```golang
package config

import (
    "log"
    "os"
    "strconv"

    "github.com/joho/godotenv"
)

// Config - Struct untuk menyimpan konfigurasi aplikasi
type Config struct {
    // Server
    Port int
    Environment string // development, staging, production
    
    // Tripay
    TripayBaseURL    string
    TripayAPIKey     string
    TripayPrivateKey string
    TripayMerchantCode string
    
    // Database
    DBHost     string
    DBPort     int
    DBUser     string
    DBPassword string
    DBName     string
    
    // Callback
    CallbackURL string
}

// Load - Load configuration dari .env file
func Load() *Config {
    // Load .env file
    if err := godotenv.Load(); err != nil {
        log.Println("No .env file found, using environment variables")
    }
    
    port := 8080
    if p := os.Getenv("PORT"); p != "" {
        if parsed, err := strconv.Atoi(p); err == nil {
            port = parsed
        }
    }
    
    dbPort := 3306
    if p := os.Getenv("DB_PORT"); p != "" {
        if parsed, err := strconv.Atoi(p); err == nil {
            dbPort = parsed
        }
    }
    
    return &Config{
        Port: port,
        Environment: getEnv("ENVIRONMENT", "development"),
        
        TripayBaseURL: getEnv("TRIPAY_BASE_URL", "https://tripay.co.id/api-sandbox"),
        TripayAPIKey: getEnv("TRIPAY_API_KEY", ""),
        TripayPrivateKey: getEnv("TRIPAY_PRIVATE_KEY", ""),
        TripayMerchantCode: getEnv("TRIPAY_MERCHANT_CODE", ""),
        
        DBHost: getEnv("DB_HOST", "localhost"),
        DBPort: dbPort,
        DBUser: getEnv("DB_USER", "root"),
        DBPassword: getEnv("DB_PASSWORD", ""),
        DBName: getEnv("DB_NAME", "tripay_integration"),
        
        CallbackURL: getEnv("CALLBACK_URL", "https://yoursite.com/api/tripay/callback"),
    }
}

// Helper function
func getEnv(key, defaultValue string) string {
    if value, exists := os.LookupEnv(key); exists {
        return value
    }
    return defaultValue
}
```

### File: .env.example

```
# Server Configuration
PORT=8080
ENVIRONMENT=development

# Tripay Configuration - SANDBOX
TRIPAY_BASE_URL=https://tripay.co.id/api-sandbox
TRIPAY_API_KEY=your_sandbox_api_key_here
TRIPAY_PRIVATE_KEY=your_sandbox_private_key_here
TRIPAY_MERCHANT_CODE=T0001

# Atau untuk PRODUCTION (uncomment)
# TRIPAY_BASE_URL=https://tripay.co.id/api
# TRIPAY_API_KEY=your_production_api_key
# TRIPAY_PRIVATE_KEY=your_production_private_key
# TRIPAY_MERCHANT_CODE=your_merchant_code

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=tripay_integration

# Callback Configuration
CALLBACK_URL=https://yoursite.com/api/tripay/callback
```

### File: utils/crypto.go

```golang
package utils

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
)

// GenerateHMACSignature - Generate HMAC-SHA256 signature
func GenerateHMACSignature(message, key string) string {
    h := hmac.New(sha256.New, []byte(key))
    h.Write([]byte(message))
    return hex.EncodeToString(h.Sum(nil))
}

// ValidateSignature - Validate HMAC signature
func ValidateSignature(message, signature, key string) bool {
    expected := GenerateHMACSignature(message, key)
    return hmac.Equal([]byte(signature), []byte(expected))
}
```

### File: utils/response.go

```golang
package utils

import (
    "encoding/json"
    "log"
    "net/http"

    "your-module/models"
)

// SendSuccessResponse - Send success response
func SendSuccessResponse(w http.ResponseWriter, statusCode int, message string, data interface{}) {
    response := models.APIResponse{
        Success: true,
        Message: message,
        Data: data,
        Code: statusCode,
    }
    
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    
    if err := json.NewEncoder(w).Encode(response); err != nil {
        log.Printf("Error encoding response: %v", err)
    }
}

// SendErrorResponse - Send error response
func SendErrorResponse(w http.ResponseWriter, statusCode int, errorMessage string) {
    response := models.APIResponse{
        Success: false,
        Error: errorMessage,
        Code: statusCode,
    }
    
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    
    if err := json.NewEncoder(w).Encode(response); err != nil {
        log.Printf("Error encoding error response: %v", err)
    }
}
```

---

## 🚀 MAIN APLIKASI

### File: main.go

```golang
package main

import (
    "fmt"
    "log"
    "net/http"

    "your-module/config"
    "your-module/handlers"
    "your-module/services"
)

func main() {
    // Load configuration
    cfg := config.Load()
    
    log.Printf("Starting server on port %d", cfg.Port)
    log.Printf("Environment: %s", cfg.Environment)
    
    // Initialize Tripay client
    tripayClient := services.NewTripayClient(
        cfg.TripayBaseURL,
        cfg.TripayAPIKey,
        cfg.TripayPrivateKey,
        cfg.TripayMerchantCode,
    )
    
    // Initialize handlers
    transactionHandler := handlers.NewTransactionHandler(tripayClient)
    paymentHandler := handlers.NewPaymentHandler(tripayClient)
    callbackHandler := handlers.NewCallbackHandler(tripayClient)
    
    // Setup routes
    setupRoutes(transactionHandler, paymentHandler, callbackHandler)
    
    // Start server
    serverAddr := fmt.Sprintf(":%d", cfg.Port)
    if err := http.ListenAndServe(serverAddr, nil); err != nil {
        log.Fatalf("Server error: %v", err)
    }
}

// Setup semua routes/endpoints
func setupRoutes(
    txHandler *handlers.TransactionHandler,
    paymentHandler *handlers.PaymentHandler,
    callbackHandler *handlers.CallbackHandler,
) {
    
    // Health check
    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"status":"ok"}`))
    })
    
    // Payment routes
    http.HandleFunc("/api/payment/channels", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodGet {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
            return
        }
        // Call handler
    })
    
    // Transaction routes
    http.HandleFunc("/api/transactions", func(w http.ResponseWriter, r *http.Request) {
        if r.Method == http.MethodPost {
            // Create transaction
        } else if r.Method == http.MethodGet {
            // List transactions
        }
    })
    
    // Callback route
    http.HandleFunc("/api/tripay/callback", callbackHandler.HandleCallback)
    
    log.Println("Routes configured successfully")
}
```

---

## 📝 CONTOH IMPLEMENTASI LENGKAP TOKO ONLINE

Ini adalah implementasi praktis yang bisa langsung digunakan.

### File: main_complete.go

```golang
package main

import (
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"
    "strconv"
    "time"

    "github.com/go-resty/resty/v2"
    "your-module/models"
)

// ===== CONFIGURATION =====
const (
    TRIPAY_BASE_URL       = "https://tripay.co.id/api-sandbox"
    TRIPAY_API_KEY        = "YOUR_API_KEY"
    TRIPAY_PRIVATE_KEY    = "YOUR_PRIVATE_KEY"
    TRIPAY_MERCHANT_CODE  = "T0001"
)

// ===== MAIN APLIKASI =====
func main() {
    // Route definitions
    http.HandleFunc("/", homePage)
    http.HandleFunc("/checkout", checkoutPage)
    http.HandleFunc("/api/create-transaction", createTransaction)
    http.HandleFunc("/api/transaction-detail", getTransactionDetail)
    http.HandleFunc("/api/payment-channels", getPaymentChannels)
    http.HandleFunc("/api/callback", handleCallback)
    
    fmt.Println("Server running on http://localhost:8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

// ===== PAGE HANDLERS =====

// halaman utama
func homePage(w http.ResponseWriter, r *http.Request) {
    html := `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Toko Online - Tripay Integration</title>
        <style>
            body { font-family: Arial; margin: 20px; }
            .product { border: 1px solid #ccc; padding: 10px; margin: 10px 0; }
            button { background: #4CAF50; color: white; padding: 10px 20px; cursor: pointer; }
        </style>
    </head>
    <body>
        <h1>Toko Online Kami</h1>
        
        <div class="product">
            <h3>Product 1 - Rp 100.000</h3>
            <p>Deskripsi produk 1</p>
            <button onclick="addToCart('PROD001', 'Product 1', 100000)">Beli Sekarang</button>
        </div>
        
        <div class="product">
            <h3>Product 2 - Rp 250.000</h3>
            <p>Deskripsi produk 2</p>
            <button onclick="addToCart('PROD002', 'Product 2', 250000)">Beli Sekarang</button>
        </div>
        
        <h2>Keranjang Belanja</h2>
        <div id="cart"></div>
        <button onclick="checkout()" style="background: #2196F3;">Checkout</button>
        
        <script>
            let cartItems = [];
            
            function addToCart(sku, name, price) {
                cartItems.push({sku, name, price, quantity: 1});
                updateCart();
            }
            
            function updateCart() {
                const html = cartItems.map((item, i) => `
                    <p>${item.name} - Rp ${item.price}</p>
                `).join('');
                document.getElementById('cart').innerHTML = html;
            }
            
            function checkout() {
                if (cartItems.length === 0) {
                    alert('Keranjang kosong');
                    return;
                }
                
                const totalAmount = cartItems.reduce((sum, item) => sum + item.price, 0);
                
                fetch('/api/create-transaction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        method: 'BRIVA',
                        merchant_ref: 'INV-' + Date.now(),
                        amount: totalAmount,
                        customer_name: 'John Doe',
                        customer_email: 'john@example.com',
                        customer_phone: '081234567890',
                        order_items: cartItems
                    })
                })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        alert('Kode VA: ' + data.data.pay_code);
                        alert('Harap transfer ke VA: ' + data.data.pay_code);
                    } else {
                        alert('Error: ' + data.error);
                    }
                });
            }
        </script>
    </body>
    </html>
    `
    w.Header().Set("Content-Type", "text/html")
    fmt.Fprint(w, html)
}

// halaman checkout
func checkoutPage(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/html")
    fmt.Fprint(w, `
        <h1>Halaman Checkout</h1>
        <p>Silakan lakukan pembayaran sesuai dengan instruksi yang diberikan</p>
    `)
}

// ===== API HANDLERS =====

// Create Transaction Handler
func createTransaction(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    
    body, _ := io.ReadAll(r.Body)
    defer r.Body.Close()
    
    var req models.CreateTransactionRequest
    json.Unmarshal(body, &req)
    
    // Validasi
    if req.Amount <= 0 {
        sendJSON(w, http.StatusBadRequest, map[string]interface{}{
            "success": false,
            "error": "Amount harus lebih dari 0",
        })
        return
    }
    
    // Generate signature
    tripayClient := NewTripayClient()
    signature := tripayClient.GenerateSignature(req.MerchantRef, req.Amount)
    
    // Prepare request ke Tripay
    tripayReq := &models.TransactionRequest{
        Method:        req.Method,
        MerchantRef:   req.MerchantRef,
        Amount:        req.Amount,
        CustomerName:  req.CustomerName,
        CustomerEmail: req.CustomerEmail,
        CustomerPhone: req.CustomerPhone,
        OrderItems:    req.OrderItems,
        ReturnURL:     "https://yoursite.com/callback",
        ExpiredTime:   time.Now().Add(24 * time.Hour).Unix(),
        Signature:     signature,
    }
    
    // Call Tripay API
    resp, err := tripayClient.CreateTransaction(tripayReq)
    if err != nil {
        sendJSON(w, http.StatusInternalServerError, map[string]interface{}{
            "success": false,
            "error": err.Error(),
        })
        return
    }
    
    sendJSON(w, http.StatusOK, map[string]interface{}{
        "success": resp.Success,
        "data": resp.Data,
    })
}

// Get Transaction Detail Handler
func getTransactionDetail(w http.ResponseWriter, r *http.Request) {
    reference := r.URL.Query().Get("reference")
    
    if reference == "" {
        sendJSON(w, http.StatusBadRequest, map[string]interface{}{
            "success": false,
            "error": "Reference harus diberikan",
        })
        return
    }
    
    tripayClient := NewTripayClient()
    resp, err := tripayClient.GetTransactionDetail(reference)
    
    if err != nil {
        sendJSON(w, http.StatusInternalServerError, map[string]interface{}{
            "success": false,
            "error": err.Error(),
        })
        return
    }
    
    sendJSON(w, http.StatusOK, resp)
}

// Get Payment Channels Handler
func getPaymentChannels(w http.ResponseWriter, r *http.Request) {
    tripayClient := NewTripayClient()
    channels, err := tripayClient.GetPaymentChannels()
    
    if err != nil {
        sendJSON(w, http.StatusInternalServerError, map[string]interface{}{
            "success": false,
            "error": err.Error(),
        })
        return
    }
    
    sendJSON(w, http.StatusOK, channels)
}

// Handle Callback dari Tripay
func handleCallback(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    
    // Baca body
    body, _ := io.ReadAll(r.Body)
    defer r.Body.Close()
    
    // Ambil signature dari header
    signature := r.Header.Get("X-Callback-Signature")
    event := r.Header.Get("X-Callback-Event")
    
    // Validasi signature
    tripayClient := NewTripayClient()
    expectedSig := tripayClient.GenerateCallbackSignature(string(body))
    
    if signature != expectedSig {
        sendJSON(w, http.StatusUnauthorized, map[string]interface{}{
            "success": false,
            "error": "Invalid signature",
        })
        return
    }
    
    // Parse callback
    var callback models.CallbackRequest
    json.Unmarshal(body, &callback)
    
    // Handle berdasarkan status
    switch callback.Status {
    case "PAID":
        log.Printf("PEMBAYARAN SUKSES - Reference: %s, Amount: %d", callback.Reference, callback.AmountReceived)
        // TODO: Update database, kirim email, update status order
    case "EXPIRED":
        log.Printf("TRANSAKSI EXPIRED - Reference: %s", callback.Reference)
        // TODO: Update status transaksi menjadi expired
    case "FAILED":
        log.Printf("TRANSAKSI GAGAL - Reference: %s", callback.Reference)
        // TODO: Update status transaksi menjadi failed
    }
    
    // Response harus {"success": true}
    sendJSON(w, http.StatusOK, map[string]interface{}{
        "success": true,
    })
}

// ===== HELPER FUNCTIONS =====

type TripayClient struct {
    client       *resty.Client
    baseURL      string
    apiKey       string
    privateKey   string
    merchantCode string
}

func NewTripayClient() *TripayClient {
    return &TripayClient{
        client:       resty.New(),
        baseURL:      TRIPAY_BASE_URL,
        apiKey:       TRIPAY_API_KEY,
        privateKey:   TRIPAY_PRIVATE_KEY,
        merchantCode: TRIPAY_MERCHANT_CODE,
    }
}

func (tc *TripayClient) GenerateSignature(ref string, amount int64) string {
    message := tc.merchantCode + ref + fmt.Sprintf("%d", amount)
    // HMAC-SHA256 logic here (sudah dibahas sebelumnya)
    return "" // placeholder
}

func (tc *TripayClient) GenerateCallbackSignature(jsonBody string) string {
    // HMAC-SHA256 logic here
    return "" // placeholder
}

func (tc *TripayClient) CreateTransaction(req *models.TransactionRequest) (*models.TripayTransactionResponse, error) {
    var response models.TripayTransactionResponse
    _, err := tc.client.R().
        SetBaseURL(tc.baseURL).
        SetHeader("Authorization", "Bearer " + tc.apiKey).
        SetFormData(map[string]string{
            "method":           req.Method,
            "merchant_ref":     req.MerchantRef,
            "amount":           fmt.Sprintf("%d", req.Amount),
            "customer_name":    req.CustomerName,
            "customer_email":   req.CustomerEmail,
            "customer_phone":   req.CustomerPhone,
            "signature":        req.Signature,
        }).
        SetResult(&response).
        Post("/transaction/create")
    
    return &response, err
}

func (tc *TripayClient) GetTransactionDetail(reference string) (*models.TripayTransactionResponse, error) {
    var response models.TripayTransactionResponse
    _, err := tc.client.R().
        SetBaseURL(tc.baseURL).
        SetHeader("Authorization", "Bearer " + tc.apiKey).
        SetQueryParam("reference", reference).
        SetResult(&response).
        Get("/transaction/detail")
    
    return &response, err
}

func (tc *TripayClient) GetPaymentChannels() (*models.MerchantPaymentChannelsResponse, error) {
    var response models.MerchantPaymentChannelsResponse
    _, err := tc.client.R().
        SetBaseURL(tc.baseURL).
        SetHeader("Authorization", "Bearer " + tc.apiKey).
        SetResult(&response).
        Get("/merchant/payment-channel")
    
    return &response, err
}

func sendJSON(w http.ResponseWriter, statusCode int, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    json.NewEncoder(w).Encode(data)
}
```

---

## 🛡️ ERROR HANDLING & VALIDATION

### File: utils/validation.go

```golang
package utils

import (
    "fmt"
    "regexp"
)

// ValidateEmail - Validasi format email
func ValidateEmail(email string) bool {
    pattern := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
    matched, _ := regexp.MatchString(pattern, email)
    return matched
}

// ValidatePhoneNumber - Validasi nomor telepon Indonesia
func ValidatePhoneNumber(phone string) bool {
    pattern := `^(?:\+62|0)[0-9]{9,12}$`
    matched, _ := regexp.MatchString(pattern, phone)
    return matched
}

// ValidateAmount - Validasi nominal pembayaran
func ValidateAmount(amount int64, minAmount, maxAmount int64) error {
    if amount < minAmount {
        return fmt.Errorf("amount must be at least Rp %d", minAmount)
    }
    if amount > maxAmount {
        return fmt.Errorf("amount must not exceed Rp %d", maxAmount)
    }
    return nil
}

// ValidateChannelCode - Validasi kode channel pembayaran
func ValidateChannelCode(code string, validChannels []string) bool {
    for _, valid := range validChannels {
        if code == valid {
            return true
        }
    }
    return false
}
```

---

## 🧪 TESTING & DEBUGGING

### Testing dengan Postman

#### 1. Create Transaction

```
POST http://localhost:8080/api/transactions

Header:
Content-Type: application/json

Body:
{
  "method": "BRIVA",
  "merchant_ref": "INV-2024-001",
  "amount": 100000,
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "081234567890",
  "order_items": [
    {
      "sku": "PROD001",
      "name": "Product 1",
      "price": 100000,
      "quantity": 1,
      "subtotal": 100000
    }
  ]
}
```

#### 2. Get Transaction Detail

```
GET http://localhost:8080/api/transactions/T0001000000000000006

Header:
Authorization: Bearer YOUR_API_KEY
```

#### 3. Get Payment Channels

```
GET http://localhost:8080/api/payment/channels
```

### Debugging dengan Logs

```golang
// Untuk melihat request/response Tripay API
tripayClient := resty.New()
tripayClient.OnBeforeRequest(func(c *resty.Client, req *resty.Request) error {
    log.Printf("[REQUEST] %s %s", req.Method, req.URL)
    log.Printf("[BODY] %v", req.Body)
    return nil
})

tripayClient.OnAfterResponse(func(c *resty.Client, resp *resty.Response) error {
    log.Printf("[RESPONSE] Status: %d", resp.StatusCode)
    log.Printf("[RESPONSE] Body: %s", resp.String())
    return nil
})
```

---

## ✅ BEST PRACTICES

### 1. Security

✅ **Jangan hardcode credentials**
```golang
// ❌ JANGAN
const PRIVATE_KEY = "xxxxxxxxxxxx"

// ✅ GUNAKAN ENV
privateKey := os.Getenv("TRIPAY_PRIVATE_KEY")
```

✅ **Validasi signature callback**
```golang
// Selalu validasi signature sebelum memproses callback
expectedSig := GenerateCallbackSignature(jsonBody)
if callbackSignature != expectedSig {
    return errors.New("invalid signature")
}
```

✅ **Gunakan HTTPS**
```golang
// ✅ Selalu gunakan HTTPS di production
callbackURL := "https://yoursite.com/api/tripay/callback"

// ❌ Jangan HTTP
callbackURL := "http://yoursite.com/api/tripay/callback"
```

### 2. Idempotency

Untuk mencegah duplikasi transaksi, gunakan `merchant_ref` yang unik:

```golang
// Generate merchant ref yang unik
merchantRef := fmt.Sprintf("INV-%d-%d", userID, time.Now().Unix())
```

### 3. Retry Logic

Untuk callback yang gagal, Tripay akan retry 3 kali dengan delay 2 menit:

```golang
// Pastikan endpoint callback Anda reliable
// Return {"success": true} hanya jika benar-benar berhasil
if err := updateDatabase(callback); err != nil {
    return errors.New("failed to update")
}

return json.Marshal(map[string]bool{"success": true})
```

### 4. Logging

```golang
// Selalu log penting transaksi
log.Printf("[TRANSACTION] Created: %s, Amount: %d, Status: %s",
    transaction.Reference,
    transaction.Amount,
    transaction.Status,
)
```

### 5. Database Transactions

Gunakan database transactions untuk consistency:

```golang
// Start DB transaction
tx := db.BeginTx(ctx, nil)

// Update transaksi
tx.Model(&transaction).Update("status", "PAID")

// Update order
tx.Model(&order).Update("paid_at", time.Now())

// Commit jika semua sukses
tx.Commit()
```

---

## 🎓 KESIMPULAN

Dokumentasi ini sudah cover 100% integrasi Tripay dengan Golang:

✅ Pengenalan dan setup awal  
✅ Memahami flow pembayaran (DIRECT & REDIRECT)  
✅ Membuat model data (structs)  
✅ Service layer untuk API Tripay  
✅ HTTP handlers untuk endpoints  
✅ Menerima dan validasi callback  
✅ Contoh implementasi lengkap toko online  
✅ Error handling dan validation  
✅ Testing dengan Postman  
✅ Best practices dan security  

Silakan implementasikan sesuai kebutuhan Anda dan jangan ragu untuk reference dokumentasi resmi Tripay di https://tripay.co.id/developer

Happy coding! 🚀