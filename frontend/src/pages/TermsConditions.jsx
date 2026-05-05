import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsConditions() {
  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Hero Section */}
      <div className="bg-gray-900 py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(190,18,60,0.1),transparent)]" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Syarat & Ketentuan</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Aturan dan panduan penggunaan layanan platform kami untuk memastikan pengalaman terbaik bagi semua pengguna.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 -mt-8 relative z-20">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 md:p-12 border border-gray-100">
          <div className="prose prose-rose max-w-none">
            <p className="text-gray-600 leading-relaxed mb-8">
              Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-sm">01</span>
                Penerimaan Ketentuan
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Dengan mengakses dan menggunakan platform kami, Anda dianggap telah membaca, memahami, dan menyetujui untuk terikat oleh Syarat dan Ketentuan ini. Jika Anda tidak setuju, mohon untuk tidak menggunakan layanan kami.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-sm">02</span>
                Akun Pengguna
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Untuk melakukan transaksi, Anda mungkin diwajibkan membuat akun. Anda bertanggung jawab untuk:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Menjaga kerahasiaan informasi akun dan kata sandi Anda.</li>
                <li>Menyediakan informasi yang akurat, terkini, dan lengkap.</li>
                <li>Memberitahu kami segera jika ada penggunaan akun tanpa izin.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-sm">03</span>
                Pemesanan dan Pembayaran
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Semua harga tercantum dalam Rupiah (IDR).</li>
                <li>Pemesanan dianggap sah setelah kami menerima konfirmasi pembayaran.</li>
                <li>Kami berhak menolak atau membatalkan pesanan jika terjadi kesalahan harga atau ketersediaan stok.</li>
                <li>Pembayaran diproses melalui mitra resmi (Tripay/Midtrans) sesuai metode yang tersedia.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-sm">04</span>
                Pengiriman Barang
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Estimasi waktu pengiriman bergantung pada lokasi Anda dan layanan kurir yang dipilih. Kami tidak bertanggung jawab atas keterlambatan yang disebabkan oleh pihak ketiga (ekspedisi) atau keadaan kahar (*Force Majeure*).
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-sm">05</span>
                Kebijakan Pengembalian
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Pengembalian barang atau dana hanya dapat diproses jika barang yang diterima rusak, cacat, atau tidak sesuai pesanan, dengan syarat menyertakan video *unboxing* yang jelas tanpa terpotong.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-sm">06</span>
                Hak Kekayaan Intelektual
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Seluruh konten dalam platform ini, termasuk logo, teks, grafis, dan gambar adalah milik kami atau pemberi lisensi kami dan dilindungi oleh undang-undang hak cipta.
              </p>
            </section>

            <div className="mt-12 p-6 bg-amber-50/50 rounded-2xl border border-amber-100 text-center">
              <p className="text-gray-600 mb-4">Perlu bantuan lebih lanjut mengenai ketentuan layanan?</p>
              <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors">
                <i className="bx bx-help-circle text-lg" />
                Hubungi Bantuan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
