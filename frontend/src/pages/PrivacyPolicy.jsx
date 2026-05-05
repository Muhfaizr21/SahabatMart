import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Hero Section */}
      <div className="bg-gray-900 py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(190,18,60,0.1),transparent)]" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Kebijakan Privasi</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Komitmen kami untuk melindungi data pribadi Anda dan memberikan transparansi mengenai cara kami mengelola informasi Anda.
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
                <span className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center text-sm">01</span>
                Pengumpulan Informasi
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Kami mengumpulkan informasi yang Anda berikan langsung kepada kami saat Anda membuat akun, melakukan pembelian, atau berkomunikasi dengan kami. Informasi ini mencakup:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Nama lengkap dan informasi kontak (email, nomor telepon, alamat).</li>
                <li>Detail pembayaran (diproses secara aman melalui mitra payment gateway kami).</li>
                <li>Data profil (nama pengguna, foto profil, preferensi produk).</li>
                <li>Informasi yang Anda berikan melalui ulasan produk atau layanan pelanggan.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center text-sm">02</span>
                Penggunaan Informasi
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Kami menggunakan informasi yang dikumpulkan untuk tujuan berikut:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Memproses dan mengirimkan pesanan Anda.</li>
                <li>Mengelola akun dan memberikan dukungan pelanggan.</li>
                <li>Mengirimkan informasi pemasaran, promosi, dan pembaruan produk (Anda dapat berhenti berlangganan kapan saja).</li>
                <li>Meningkatkan pengalaman belanja Anda dan mengoptimalkan layanan kami.</li>
                <li>Mendeteksi, mencegah, dan menangani masalah keamanan atau teknis.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center text-sm">03</span>
                Keamanan Data
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Keamanan data Anda adalah prioritas kami. Kami menerapkan langkah-langkah teknis dan organisasi yang sesuai untuk melindungi data pribadi Anda dari akses tidak sah, kehilangan, atau penyalahgunaan.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Semua transaksi pembayaran dilakukan melalui gateway pembayaran yang terenkripsi dan aman. Kami tidak menyimpan informasi kartu kredit atau detail pembayaran sensitif di server kami.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center text-sm">04</span>
                Berbagi Informasi
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Kami tidak menjual informasi pribadi Anda kepada pihak ketiga. Kami hanya membagikan data Anda dengan:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Mitra logistik (kurir) untuk tujuan pengiriman barang.</li>
                <li>Penyedia layanan pembayaran untuk memproses transaksi.</li>
                <li>Otoritas hukum jika diwajibkan oleh undang-undang.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center text-sm">05</span>
                Hak Anda
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Anda memiliki hak untuk:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Mengakses dan menerima salinan data pribadi Anda.</li>
                <li>Meminta koreksi atas data yang tidak akurat.</li>
                <li>Meminta penghapusan data pribadi Anda (hak untuk dilupakan).</li>
                <li>Menarik persetujuan untuk pemasaran langsung.</li>
              </ul>
            </section>

            <div className="mt-12 p-6 bg-gray-50 rounded-2xl border border-gray-100 text-center">
              <p className="text-gray-600 mb-4">Punya pertanyaan mengenai kebijakan privasi kami?</p>
              <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-rose-600 transition-colors">
                <i className="bx bx-support text-lg" />
                Hubungi Kami
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
