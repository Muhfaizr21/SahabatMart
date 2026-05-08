import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const BusinessOpportunity = () => {
  const [activeSim, setActiveSim] = useState(5);
  const [dynamicContent, setDynamicContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/public/config');
        const result = await response.json();
        if (result.data && result.data.business_opportunity_content) {
          setDynamicContent(JSON.parse(result.data.business_opportunity_content));
        }
      } catch (error) {
        console.error('Error fetching content:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  const stats = [
    { label: 'Tanpa Modal', icon: 'payments', desc: 'Mulai bisnis tanpa mengeluarkan uang sepeserpun.' },
    { label: 'Tanpa Stok', icon: 'inventory_2', desc: 'Tidak perlu menumpuk barang di rumah.' },
    { label: 'Tanpa Kirim', icon: 'local_shipping', desc: 'Pusat yang mengurus semua pengiriman.' },
    { label: 'Cukup dari HP', icon: 'smartphone', desc: 'Kelola bisnis kapan saja dan di mana saja.' },
  ];

  // Default values for fallback
  const defaultHero = {
    badge: 'Peluang Bisnis Masa Depan',
    title: 'Bisnis Skincare Premium Tanpa Modal & Stok Barang',
    subtitle: 'Pelanggan Jadi Asetmu, Komisi Masuk Selamanya. Cukup bagikan link, ajak mitra, dan dapatkan penghasilan jutaan rupiah setiap bulan.'
  };

  const defaultSimulationData = {
    5: {
      title: 'Duplikasi 5 Orang',
      desc: 'Jika Anda mengajak 5 orang, dan masing-masing mengajak 5 orang lagi dengan belanja Rp100rb/bulan.',
      free: 'Rp 175.000',
      premium: 'Rp 5.250.000',
      levels: [
        { name: 'Level 1 (5 org)', income: 'Rp 75.000' },
        { name: 'Level 2 (25 org)', income: 'Rp 125.000' },
        { name: 'Level 3 (125 org)', income: 'Rp 625.000' },
        { name: 'Level 4 (625 org)', income: 'Rp 1.250.000' },
        { name: 'Level 5 (3125 org)', income: 'Rp 3.125.000' },
      ]
    },
    10: {
      title: 'Duplikasi 10 Orang',
      desc: 'Jika Anda mengajak 10 orang, dan masing-masing mengajak 10 orang lagi dengan belanja Rp100rb/bulan.',
      free: 'Rp 600.000',
      premium: 'Rp 125.850.000',
      levels: [
        { name: 'Level 1 (10 org)', income: 'Rp 150.000' },
        { name: 'Level 2 (100 org)', income: 'Rp 700.000' },
        { name: 'Level 3 (1000 org)', income: 'Rp 5.000.000' },
        { name: 'Level 4 (10rb org)', income: 'Rp 20.000.000' },
        { name: 'Level 5 (100rb org)', income: 'Rp 100.000.000' },
      ]
    }
  };

  const hero = dynamicContent?.hero || defaultHero;
  const simulationData = dynamicContent?.simulationData || defaultSimulationData;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-['Plus_Jakarta_Sans'] overflow-hidden">
      {/* Hero Section - Styling Updated */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-32 px-6 overflow-hidden">
        {/* Background Accents with softer blur */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-100 blur-[100px] rounded-full opacity-50" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-100 blur-[100px] rounded-full opacity-50" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center">
            <span className="inline-block py-2 px-5 rounded-full bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 text-purple-700 text-xs font-bold tracking-wider uppercase mb-6 shadow-sm">
              {hero.badge}
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-[1.2] text-gray-900 tracking-tight">
              {hero.title.includes('<br />') ? (
                <span dangerouslySetInnerHTML={{ __html: hero.title }} />
              ) : (
                hero.title
              )}
            </h1>
            <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
              {hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link
                to="/register"
                className="w-full sm:w-auto px-10 py-4.5 bg-gradient-to-r from-purple-700 to-purple-800 rounded-full font-bold text-white shadow-xl shadow-purple-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                Daftar Gratis Sekarang
              </Link>
              <a
                href="#cara-kerja"
                className="w-full sm:w-auto px-10 py-4.5 bg-white border-2 border-gray-200 rounded-full font-bold text-gray-700 hover:border-purple-300 hover:bg-purple-50/30 transition-all duration-300"
              >
                Pelajari Cara Kerjanya
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/USP Section - Card style updated */}
      <section className="py-20 px-6 bg-gradient-to-b from-white to-purple-50/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((item, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white border border-purple-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-purple-600 text-2xl">{item.icon}</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">{item.label}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video & PDF Section */}
      <section id="cara-kerja" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-black mb-8 leading-tight tracking-tight">Mulai Dengan <br /><span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Sangat Simpel</span></h2>
              <div className="space-y-8">
                <div className="flex gap-5 group">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 font-black text-sm text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">1</div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Daftar Mitra</h4>
                    <p className="text-gray-500 text-sm">Daftar sebagai mitra di SahabatMart.com secara gratis tanpa biaya admin.</p>
                  </div>
                </div>
                <div className="flex gap-5 group">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 font-black text-sm text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">2</div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Ambil Link</h4>
                    <p className="text-gray-500 text-sm">Gunakan link produk atau link pendaftaran unik dari Dashboard Member Anda.</p>
                  </div>
                </div>
                <div className="flex gap-5 group">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 font-black text-sm text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">3</div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Bagikan Konten</h4>
                    <p className="text-gray-500 text-sm">Share ke WhatsApp, TikTok, atau IG. Foto & video promosi sudah kami siapkan.</p>
                  </div>
                </div>
                <div className="flex gap-5 group">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 font-black text-sm text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">4</div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Terima Komisi</h4>
                    <p className="text-gray-500 text-sm">Dapatkan komisi otomatis dari setiap transaksi yang terjadi melalui link Anda.</p>
                  </div>
                </div>
              </div>
              <div className="mt-12">
                <button className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-xl text-rose-600 font-bold text-sm hover:from-rose-100 hover:to-pink-100 transition-all duration-300 shadow-sm">
                  <span className="material-symbols-outlined">picture_as_pdf</span>
                  Download PDF Presentasi Bisnis
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 relative group shadow-xl">
                <img src="https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800" alt="Video Placeholder" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="w-16 h-16 rounded-full bg-white text-purple-600 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-3xl">play_arrow</span>
                  </button>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl hidden md:block border border-gray-700">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Total Komisi Terbayar</p>
                <p className="text-2xl font-black text-white">Rp 2.4 Miliar+</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tiers Section - Card style elevated */}
      <section className="py-24 px-6 bg-gradient-to-b from-purple-50/20 to-white">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Pilihan Keanggotaan</h2>
          <p className="text-gray-500">Mulai langkah Anda sekarang, sesuaikan dengan target penghasilan Anda</p>
        </div>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10">
          {(dynamicContent?.tiers || []).map((tier, idx) => (
            <div
              key={idx}
              className={`p-8 md:p-10 rounded-3xl bg-white border relative overflow-hidden transition-all duration-500 hover:-translate-y-2 ${tier.isPopular ? 'border-2 border-purple-400 shadow-2xl shadow-purple-200/50' : 'border-gray-100 shadow-lg hover:shadow-xl'
                }`}
            >
              {tier.isPopular && (
                <div className="absolute top-0 right-0 px-5 py-2 bg-gradient-to-l from-purple-500 to-purple-600 text-[10px] font-black uppercase tracking-wider text-white rounded-bl-2xl shadow-md">
                  Paling Populer
                </div>
              )}
              <h3 className={`text-2xl font-black mb-2 ${tier.isPopular ? 'bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent' : 'text-gray-900'}`}>{tier.name}</h3>
              <p className="text-gray-500 text-sm mb-8">{tier.desc}</p>

              <div className="space-y-4 mb-10">
                {tier.benefits.map((benefit, bIdx) => (
                  <div key={bIdx} className={`flex justify-between items-center py-3 ${tier.isPopular ? 'border-b border-purple-50' : 'border-b border-gray-50'}`}>
                    <span className={`text-sm ${tier.isPopular ? 'text-gray-700 font-medium' : 'text-gray-600'}`}>{benefit.label}</span>
                    {benefit.value === 'check' ? (
                      <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                    ) : (
                      <span className={`font-black ${tier.isPopular ? 'text-purple-600 text-xl' : 'text-gray-900'}`}>{benefit.value}</span>
                    )}
                  </div>
                ))}
              </div>

              {tier.promoText && (
                <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 mb-8">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-1">✨ PEMBERITAHUAN</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{tier.promoText}</p>
                </div>
              )}

              <Link
                to="/register"
                className={`block text-center py-4 rounded-xl font-bold transition-all duration-300 ${tier.isPopular
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.02] py-4'
                    : 'bg-gray-100 border border-gray-200 text-gray-800 hover:bg-gray-200'
                  }`}
              >
                {tier.buttonText}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Simulation Section - Modernized */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-3xl p-8 md:p-12 shadow-xl relative">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black mb-6 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Simulasi Potensi Komisi</h2>
            <div className="flex justify-center gap-2 p-1.5 bg-gray-100 rounded-2xl w-fit mx-auto">
              <button
                onClick={() => setActiveSim(5)}
                className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeSim === 5 ? 'bg-white text-purple-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Duplikasi 5
              </button>
              <button
                onClick={() => setActiveSim(10)}
                className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeSim === 10 ? 'bg-white text-purple-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Duplikasi 10
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">{simulationData[activeSim].title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{simulationData[activeSim].desc}</p>
              </div>

              <div className="space-y-3">
                {simulationData[activeSim].levels.map((lvl, i) => (
                  <div key={i} className="flex justify-between items-center p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                    <span className="text-xs font-bold text-gray-500">{lvl.name}</span>
                    <span className="text-sm font-black text-gray-900">{lvl.income}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-xl shadow-purple-200 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full" />
                <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-3">Total Potensi Pasif Income</p>
                <p className="text-4xl md:text-5xl font-black mb-4">{simulationData[activeSim].premium}</p>
                <div className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-[10px] font-bold tracking-wide">KHUSUS PREMIUM MEMBER</div>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 text-center shadow-sm">
                <p className="text-[11px] font-black text-rose-500 uppercase tracking-wider mb-2">⚡ Bandingkan dengan Free Member</p>
                <p className="text-2xl font-black text-gray-900 mb-1">Maksimal {simulationData[activeSim].free}</p>
                <p className="text-xs text-gray-500">Upgrade ke Premium untuk membuka 3 Level komisi tambahan!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section (Cards) - Enhanced visuals */}
      {dynamicContent?.mission && (
        <section className="py-24 px-6 bg-gradient-to-b from-white to-purple-50/10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black mb-4 text-gray-900">{dynamicContent.mission.title}</h2>
              <div className="w-20 h-1 bg-gradient-to-r from-purple-500 to-pink-400 mx-auto rounded-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {dynamicContent.mission.items.map((item, i) => (
                <div
                  key={i}
                  className="p-8 rounded-2xl bg-white border border-purple-100 shadow-md hover:shadow-xl transition-all duration-500 flex flex-col items-center text-center group hover:-translate-y-2"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-6 group-hover:bg-gradient-to-br group-hover:from-purple-500 group-hover:to-pink-500 transition-all duration-500 shadow-md">
                    <span className="material-symbols-outlined text-4xl text-purple-600 group-hover:text-white transition-colors duration-500">
                      {item.icon}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-3 tracking-tight">{item.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-sm">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Target Audience - Card style updated */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4 text-gray-900">Cocok Untuk Siapa?</h2>
            <p className="text-gray-500 text-lg">Peluang inklusif untuk siapa saja yang ingin berkembang</p>
            <div className="w-16 h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto mt-6 rounded-full" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: 'Ibu Rumah Tangga', icon: 'home_repair_service', color: 'from-rose-100 to-rose-50 text-rose-600' },
              { label: 'Karyawan', icon: 'business_center', color: 'from-blue-100 to-blue-50 text-blue-600' },
              { label: 'Mahasiswa', icon: 'school', color: 'from-amber-100 to-amber-50 text-amber-600' },
              { label: 'Pemula Bisnis', icon: 'rocket_launch', color: 'from-purple-100 to-purple-50 text-purple-600' }
            ].map((item, i) => (
              <div key={i} className="text-center p-8 rounded-2xl bg-white border border-gray-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-6 shadow-sm`}>
                  <span className="material-symbols-outlined text-3xl">{item.icon}</span>
                </div>
                <h4 className="font-black text-gray-900 text-lg">{item.label}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA - Dramatic but same colors */}
      <section className="py-32 px-6 relative bg-white overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl bg-gradient-to-r from-purple-100/60 to-pink-100/60 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-7xl font-black mb-10 leading-tight tracking-tight">Saatnya Bangun <br /> <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Masa Depanmu!</span></h2>
          <p className="text-gray-500 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
            Tidak perlu modal besar untuk memulai perubahan. Cukup gunakan produknya, bagikan linknya, dan nikmati hasilnya.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link to="/register" className="w-full sm:w-auto px-12 py-5 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl font-black text-xl hover:from-purple-700 hover:to-purple-800 hover:scale-105 transition-all duration-300 shadow-xl">🚀 GABUNG SEKARANG</Link>
            <Link to="/shop" className="w-full sm:w-auto px-12 py-5 bg-white border-2 border-gray-300 text-gray-800 rounded-xl font-black text-xl hover:border-purple-400 hover:bg-purple-50/30 transition-all duration-300">🛍️ BELANJA DULU</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BusinessOpportunity;