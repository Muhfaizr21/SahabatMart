# 🏪 SahabatMart Merchant Portal - 100% Comprehensive Feature Specification

Dokumen ini adalah cetak biru (blueprint) final dan **komprehensif 100%** untuk pengembangan **Portal Merchant (Sisi Penjual)** pada ekosistem SahabatMart. Sebagai platform *Multi-Merchant dengan Affiliate terintegrasi*, Portal Merchant tidak hanya berfungsi sebagai alat input barang, tetapi sebagai *Command Center* bisnis setiap penjual.

Semua fitur yang tercantum di bawah ini wajib diimplementasikan untuk mencapai standar siap-produksi (*Production-Ready*).

---

## 📈 1. Advanced Dashboard & Analytics
Pusat intelijen komprehensif bagi merchant untuk melihat performa tokonya secara *real-time*.
- **Live KPI Metrics:** Pendapatan Kotor (GMV), Keuntungan Bersih (setelah potongan fee & komisi), Total Pesanan (Baru, Diproses, Selesai, Dibatalkan), dan Total Pengunjung Toko.
- **Tingkat Konversi (Conversion Rate):** Mengukur rasio pengunjung yang akhirnya melakukan pembelian.
- **Grafik Tren Resolusi Tinggi:** Chart interaktif (Line/Bar) dengan filter waktu dinamis (Hari ini, 7 Hari, 30 Hari, YTD).
- **Notifikasi Keamanan & Operasional:** Peringatan stok menipis (*low-stock alert*), pesanan mendekati batas waktu pengiriman (*deadline breach warning*), dan pesan/komplain pembeli.

## 🛍️ 2. Katalog & Inventori Kelas Enterprise (Product Management)
Sistem manajemen produk yang kuat dengan dukungan matriks variasi yang rumit.
- **Multi-tenant Isolation CRUD:** Merchant mutlak hanya bisa Create, Read, Update, Delete (CRUD) produk milik ID-nya sendiri.
- **Matriks Variasi Ekstensif (Multivariant):** Mendukung hingga 2 level atribut produk (misal: "Ukuran" x "Warna"). Setiap kombinasi menghasilkan tabel SKU independen yang memiliki:
  - SKU Unik (Stock Keeping Unit)
  - Harga spesifik (beda size bisa beda harga)
  - Stok individu
  - Berat spesifik (opsional)
- **Bulk Operations:** Modul unggah & unduh katalog massal menggunakan file `.csv` atau `.xlsx` berformat standar (template provided by platform).
- **Manajemen Visibilitas:** Kemampuan menyimpan produk sebagai *Draft*, atau *Arsip* tanpa menghapusnya secara permanen dari *database*.
- **Media Library:** Mendukung unggah banyak gambar (Galeri) hingga 5 foto per produk dengan kompresi bawaan platform.

## 📦 3. Manajemen Pesanan Terintegrasi (Order Pipeline)
Alur pemrosesan pesanan yang dirancang meminimalisir kesalahan operasional saat mengirim barang (terhubung dengan konsep *Order Merchant Group* atau *Split Order Checkout*).
- **Kanban Flow Status Pesanan:**
  - **Pesanan Baru / Perlu Diproses:** Dana telah diamankan. Rekap *invoice* & *packing list* siap dicetak.
  - **Telah Diproses / Menunggu Kurir:** Merchant sudah meng-klik "Terima Pesanan". Batas waktu pengiriman mulai dihitung balik (*Countdown Timer*).
  - **Kirim / Input Resi Cepat:** Modul ketik *Tracking Number* manual atau cetak resi AWB Otomatis (Airway Bill) berbasis dukungan Logistic API.
  - **Dalam Pengiriman:** Pesanan telah diverifikasi oleh pihak logistik dan beralih ke status *In Transit*.
  - **Selesai / Auto-Complete:** Dana berhasil dicairkan (Escrow Released) ke dompet toko setelah batas waktu retur (misal: H+3 dari paket tiba) lewat.
  - **Dispute / Dibatalkan:** Penanganan khusus jika pembeli komplain rusak / pengajuan *refund*, langsung terhubung ke panel Super Admin.
- **Cetak Dokumen Massal:** Fitur *Mass Print* Label Pengiriman dan Daftar Kemas (Packing List) format PDF untuk ratusan order sekaligus.

## 💰 4. Financial Clearing & Merchant Wallet
Sistem pencairan dana dan transparansi biaya yang merupakan nyawa bagi kepercayaan penjual.
- **Transparansi Revenue Splitting:** Setiap _Order Item_ menampilkan rincian matematis absolut: 
  `(Harga Barang x Qty) - (Platform Fee %) - (Komisi Affiliate % jika ada) = Net Pendapatan Merchant`
- **Isolasi Saldo (Escrow System):**
  - **Saldo Ditahan (Pending/Reserved Balance):** Omzet transaksi yang sedang berjalan.
  - **Saldo Tersedia (Available Balance):** Uang pasti yang bisa ditarik ke rekening.
- **Sistem Penarikan (Payout/Withdrawal):** 
  - Form pencairan instan (terintegrasi API *Disbursement* e.g., Xendit) atau manual transfer approval ke Super Admin.
  - Validasi minimum penarikan (contoh: Rp 50.000).
- **Buku Besar (Ledger/Mutasi):** Catatan historis *immutable* uang masuk (dari transaksi), uang tertunda (pesanan diproses), uang keluar (pencairan), dan potongan wajib (refund/denda).

## 📣 5. Pemasaran & Kolaborasi Affiliate (Marketing Tools)
Memberikan kuasa bagi merchant untuk meningkatkan omzetnya sendiri.
- **Custom Affiliate Override:** Jika sistem platform menetapkan komisi *affiliate* standar adalah 5%, merchant bisa secara individu mendongkrak komisi menjadi 10% untuk tokonya demi memicu afiliator lebih rajin mempromosikan barang mereka.
- **Kupon Toko Mandiri:** Merchant dapat menerbitkan Voucher Diskon (Nominal atau Persentase) khusus tokonya, di mana potongan ini ditanggung sepenuhnya oleh profit Merchant, bukan Platform.

## ⚙️ 6. Store Branding & KYC (Pengaturan Toko)
Identitas legal dan visual merchant.
- **KYC & Onboarding Strict:** Sebelum bisa berjualan, wajib melengkapi profil dan dokumen verifikasi (KTP, NPWP Opsional, dan detail Buku Rekening). Status verifikasi ditinjau Super Admin.
- **Kustomisasi Visual:** Pengaturan Logo Toko, Banner Header Etalase, dan Slogan/Biografi.
- **Konfigurasi Logistik & Gudang:** Penentuan *Titik Asal / ZIP Code* utama untuk kalkulasi tarif ongkir publik bagi pembelanja. Menentukan jasa ekspedisi mana (JNE, Sicepat, GoSend) yang ingin mereka aktifkan/matikan secara lokal untuk tokonya.

---

## 🔒 Arsitektur Keamanan & Teknis Implementasi (Wajib Terap)

Pemisahan data antartoko (Multi-tenant Privacy) adalah *Zero-Tolerance Policy*.

1. **Routing UI Terpisah:**
   - Direktori `frontend/src/pages/merchant/...` menggunakan *wrapper layout* tersendiri (`MerchantLayout.jsx`) yang benar-benar memisahkan navigasi mereka dari Super Admin dan *General Shopper*.

2. **Middleware Eksklusif (`merchantOnly`):**
   - Rute di `backend/main.go` yang berawalan `/api/merchant/...` akan dikunci oleh JWT filter. Request akan ditolak dengan `403 Forbidden` jika `role != 'merchant'`.

3. **Data Context Injections (Blind Request Guard):**
   - Semua modifikasi (*Add*, *Update*, *Delete*, apalagi ke ranah pesanan dan keuangan) di dalam `backend/controllers/merchant_controller.go` wajib menyisipkan skema kepemilikan. 
   - **Contoh Penting:** Endpoint `/api/merchant/products/delete/:id` **TIDAK BOLEH** hanya menjalankan `DELETE FROM products WHERE id = ?`. Melainkan wajib `WHERE id = ? AND merchant_id = {Decoded.JWT.User.ID}`. Cara ini mustahil dibobol.

4. **Pencegahan Fraud Mandiri (Self-Affiliation Block):**
   - Apabila seorang pemilik toko terdaftar sebagai pembeli dan Affiliate (memakai link referral sendiri) untuk membeli barang *di tokonya sendiri*, sistem Backend Cashflow harus me-nol-kan (*void*) persentase komisi afiliasi untuk menghindari kecurangan rekayasa perputaran uang.
