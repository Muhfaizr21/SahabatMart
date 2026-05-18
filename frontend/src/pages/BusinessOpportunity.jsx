import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../lib/api';
import SEO from '../components/SEO';

const BusinessOpportunity = () => {
  const [activeSim, setActiveSim] = useState(5);

  const simulationData = {
    5: {
      title: 'Simulasi Duplikasi 5 Orang',
      desc: 'Asumsi setiap orang mengajak 5 mitra baru dan belanja Rp 250rb/bln.',
      premium: 'Rp 5.250.000',
      free: 'Rp 175.000',
      levels: [
        { name: 'Level 1 (5 org)', income: 'Rp 187.500' },
        { name: 'Level 2 (25 org)', income: 'Rp 437.500' },
        { name: 'Level 3 (125 org)', income: 'Rp 1.562.500' },
        { name: 'Level 4 (625 org)', income: 'Rp 3.125.000' },
        { name: 'Level 5 (3125 org)', income: 'Rp 7.812.500' },
      ]
    },
    10: {
      title: 'Simulasi Duplikasi 10 Orang',
      desc: 'Asumsi setiap orang mengajak 10 mitra baru dan belanja Rp 250rb/bln.',
      premium: 'Rp 45.000.000+',
      free: 'Rp 850.000',
      levels: [
        { name: 'Level 1 (10 org)', income: 'Rp 375.000' },
        { name: 'Level 2 (100 org)', income: 'Rp 1.750.000' },
        { name: 'Level 3 (1000 org)', income: 'Rp 12.500.000' },
        { name: 'Level 4 (10000 org)', income: 'Rp 50.000.000' },
        { name: 'Level 5 (100000 org)', income: 'Rp 250.000.000' },
      ]
    }
  };

  return (
    <div className="min-h-screen overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <SEO 
        title="Peluang Bisnis Skincare - SahabatMart"
        description="Bangun bisnis skincare premium tanpa modal dan tanpa stok. Jadilah mitra SahabatMart dan nikmati komisi berkelanjutan melalui sistem afiliasi kami."
      />

      {/* ===== HERO ===== */}
      <section className="bg-[#C62828] text-white pt-28 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-black/10 translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-block bg-[#FFC107] text-gray-900 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider mb-6">
            ✨ Peluang Bisnis Skincare Resmi
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 leading-tight">
            Pelanggan Jadi Asetmu,<br />
            <span className="text-[#FFC107]">Komisi Masuk Selamanya</span>
          </h1>
          <p className="text-white/80 text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Bisnis skincare premium <strong>tanpa modal, tanpa stok</strong>. Cukup bagikan link, ajak mitra, dan dapatkan penghasilan jutaan rupiah setiap bulan — bahkan saat tidur sekalipun.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-10 py-4 bg-[#FFC107] text-gray-900 font-black text-base rounded-full shadow-lg hover:bg-yellow-300 hover:-translate-y-1 transition-all duration-300"
            >
              🚀 Daftar Gratis Sekarang
            </Link>
            <a
              href="#simulasi"
              className="w-full sm:w-auto px-10 py-4 bg-white/10 border border-white/30 text-white font-bold text-base rounded-full hover:bg-white/20 transition-all duration-300"
            >
              Lihat Simulasi Komisi
            </a>
          </div>
        </div>
      </section>

      {/* ===== USP / KEUNGGULAN ===== */}
      <section className="bg-[#FFC107] py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">Kenapa Bisnis Ini Berbeda?</h2>
            <p className="text-gray-700 text-sm">Tidak ada bisnis lain yang semudah dan sefleksibel ini.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '💸', title: 'Tanpa Modal', desc: 'Mulai bisnis 100% gratis, tidak ada biaya apapun.' },
              { icon: '📦', title: 'Tanpa Stok', desc: 'Tidak perlu gudang atau menumpuk barang di rumah.' },
              { icon: '🚚', title: 'Tanpa Kirim', desc: 'Semua pengiriman ke pelanggan diurus oleh pusat.' },
              { icon: '📱', title: 'Cukup dari HP', desc: 'Kelola bisnis kapan saja dan di mana saja.' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 text-center shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-black text-gray-900 mb-1 text-sm md:text-base">{item.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CARA KERJA ===== */}
      <section className="bg-[#FDF8F3] py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">Cara Kerjanya Sangat Simpel</h2>
            <p className="text-gray-500 text-sm">Hanya 4 langkah untuk mulai menghasilkan komisi</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { num: '01', title: 'Daftar Mitra Gratis', desc: 'Daftar sebagai mitra di SahabatMart.com tanpa biaya apapun. Tidak ada minimum pembelian.' },
              { num: '02', title: 'Ambil Link Unikmu', desc: 'Gunakan link produk atau link pendaftaran unik dari Dashboard Member Anda.' },
              { num: '03', title: 'Bagikan Konten', desc: 'Share ke WhatsApp, TikTok, atau Instagram. Foto & video promosi sudah kami siapkan.' },
              { num: '04', title: 'Komisi Masuk Otomatis', desc: 'Dapatkan komisi otomatis dari setiap transaksi yang terjadi melalui link Anda.' },
            ].map((step, i) => (
              <div key={i} className="flex gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="text-3xl font-black text-[#C62828] opacity-30 shrink-0 leading-none">{step.num}</div>
                <div>
                  <h3 className="font-black text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== KOMISI COMPARISON ===== */}
      <section className="bg-[#C62828] py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">Struktur Komisi Member</h2>
            <p className="text-white/70 text-sm">Pilih paket yang sesuai dengan target penghasilan Anda</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Member */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
              <div className="bg-gray-800 px-6 py-4 text-center">
                <h3 className="text-white font-black text-lg">FREE MEMBER</h3>
                <p className="text-gray-400 text-xs mt-1">Gratis, tanpa biaya pendaftaran</p>
              </div>
              <div className="p-6">
                <div className="space-y-3 mb-6">
                  {[
                    { level: 'Level 1', persen: '10%', desc: 'Komisi langsung dari jaringan Anda' },
                    { level: 'Level 2', persen: '5%', desc: 'Komisi dari jaringan level 2' },
                    { level: 'Level 3–5', persen: '❌', desc: 'Tidak tersedia untuk Free Member', locked: true },
                  ].map((row, i) => (
                    <div key={i} className={`flex justify-between items-center p-3 rounded-xl bg-gray-50 ${row.locked ? 'opacity-40' : ''}`}>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{row.level}</p>
                        <p className="text-gray-400 text-xs">{row.desc}</p>
                      </div>
                      <span className={`font-black text-lg ${row.locked ? 'text-gray-300' : 'text-gray-900'}`}>{row.persen}</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-gray-50 rounded-xl text-center mb-5">
                  <p className="text-xs text-gray-400 mb-1">Potensi Komisi Duplikasi 5 Orang</p>
                  <p className="text-2xl font-black text-gray-900">Maks. Rp 175.000/bln</p>
                </div>
                <Link to="/register" className="block text-center py-3.5 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 transition-all duration-300">
                  Mulai Gratis
                </Link>
              </div>
            </div>

            {/* Premium Member */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl ring-4 ring-[#FFC107]">
              <div className="bg-[#FFC107] px-6 py-4 text-center relative">
                <div className="absolute top-2 right-3 bg-[#C62828] text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide">
                  Paling Populer
                </div>
                <h3 className="text-gray-900 font-black text-lg">PREMIUM MEMBER</h3>
                <p className="text-gray-700 text-xs mt-1">Beli produk bundle, unlock 5 level komisi</p>
              </div>
              <div className="p-6">
                <div className="space-y-3 mb-6">
                  {[
                    { level: 'Level 1', persen: '15%', desc: 'Komisi langsung lebih besar' },
                    { level: 'Level 2', persen: '7%', desc: 'Komisi dari jaringan level 2' },
                    { level: 'Level 3', persen: '5%', desc: 'Komisi dari jaringan level 3' },
                    { level: 'Level 4', persen: '2%', desc: 'Komisi dari jaringan level 4' },
                    { level: 'Level 5', persen: '1%', desc: 'Komisi dari jaringan level 5' },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-yellow-50 border border-yellow-100">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{row.level}</p>
                        <p className="text-gray-400 text-xs">{row.desc}</p>
                      </div>
                      <span className="font-black text-lg text-[#C62828]">{row.persen}</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-red-50 rounded-xl text-center border border-red-100 mb-5">
                  <p className="text-xs text-red-400 mb-1">Potensi Komisi Duplikasi 5 Orang</p>
                  <p className="text-2xl font-black text-[#C62828]">Hingga Rp 5.250.000/bln</p>
                </div>
                <Link to="/register" className="block text-center py-3.5 bg-[#C62828] text-white font-bold rounded-xl hover:bg-red-800 transition-all duration-300 shadow-lg">
                  Upgrade ke Premium
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SIMULASI ===== */}
      <section id="simulasi" className="bg-[#FDF8F3] py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">Simulasi Potensi Komisi</h2>
            <p className="text-gray-500 text-sm">Lihat berapa yang bisa Anda hasilkan dengan sistem duplikasi</p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setActiveSim(5)}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${activeSim === 5 ? 'bg-[#C62828] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'}`}
              >
                Duplikasi 5 Orang
              </button>
              <button
                onClick={() => setActiveSim(10)}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${activeSim === 10 ? 'bg-[#C62828] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'}`}
              >
                Duplikasi 10 Orang
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
            <div className="bg-gray-800 px-6 py-4">
              <h3 className="text-white font-black text-base">{simulationData[activeSim].title}</h3>
              <p className="text-gray-400 text-xs mt-1">{simulationData[activeSim].desc}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Level</th>
                    <th className="text-right px-6 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Free Member</th>
                    <th className="text-right px-6 py-3 text-xs font-black text-[#C62828] uppercase tracking-wider">Premium Member</th>
                  </tr>
                </thead>
                <tbody>
                  {simulationData[activeSim].levels.map((lvl, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-red-50/30 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-600">{lvl.name}</td>
                      <td className="px-6 py-4 text-right text-sm text-gray-400">
                        {i < 2 ? lvl.income : <span className="text-gray-200">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-black text-[#C62828]">{lvl.income}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-800">
                    <td className="px-6 py-4 text-white font-black text-sm">TOTAL / BULAN</td>
                    <td className="px-6 py-4 text-right font-black text-gray-400 text-sm">Maks. {simulationData[activeSim].free}</td>
                    <td className="px-6 py-4 text-right font-black text-[#FFC107] text-base">{simulationData[activeSim].premium}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="p-5 bg-yellow-50 border-t border-yellow-100">
              <p className="text-xs text-yellow-700 text-center leading-relaxed">
                ⚡ <strong>Upgrade ke Premium</strong> dan buka akses ke 3 level komisi tambahan! Selisihnya bisa mencapai <strong>30x lipat</strong> lebih besar dari Free Member.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== COCOK UNTUK SIAPA ===== */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-4xl auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">Cocok untuk Siapa?</h2>
            <p className="text-gray-500 text-sm">Bisnis ini terbuka untuk semua kalangan</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: '👩‍🏠', label: 'Ibu Rumah Tangga' },
              { icon: '🎓', label: 'Mahasiswa' },
              { icon: '👨‍💼', label: 'Karyawan Kantoran' },
              { icon: '🧑‍💻', label: 'Freelancer' },
              { icon: '🏪', label: 'Pemilik Usaha' },
              { icon: '✨', label: 'Semua Orang!' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-[#FDF8F3] border border-gray-100 hover:border-red-200 hover:bg-red-50/30 transition-all duration-300">
                <span className="text-2xl">{item.icon}</span>
                <span className="font-bold text-gray-800 text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="bg-[#C62828] py-20 px-6 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/3 -translate-x-1/3 pointer-events-none" />
        <div className="max-w-2xl mx-auto relative z-10">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
            Saatnya Bangun<br />
            <span className="text-[#FFC107]">Masa Depanmu!</span>
          </h2>
          <p className="text-white/75 text-base mb-10 max-w-lg mx-auto leading-relaxed">
            Tidak perlu modal besar untuk memulai perubahan. Cukup gunakan produknya, bagikan linknya, dan nikmati komisinya.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-10 py-4 bg-[#FFC107] text-gray-900 font-black text-base rounded-full shadow-xl hover:bg-yellow-300 hover:-translate-y-1 transition-all duration-300"
            >
              🚀 GABUNG SEKARANG
            </Link>
            <Link
              to="/shop"
              className="w-full sm:w-auto px-10 py-4 bg-white/10 border border-white/30 text-white font-bold text-base rounded-full hover:bg-white/20 transition-all duration-300"
            >
              🛍️ Lihat Produk Dulu
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BusinessOpportunity;