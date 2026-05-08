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
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-32 px-6 overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-100 blur-[120px] rounded-full opacity-60" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 blur-[120px] rounded-full opacity-60" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center">
            <span className="inline-block py-1.5 px-4 rounded-full bg-purple-50 border border-purple-100 text-purple-600 text-xs font-bold tracking-widest uppercase mb-6 animate-bounce">
              {hero.badge}
            </span>
            <h1 className="text-4xl md:text-7xl font-black mb-6 leading-tight text-gray-900">
              {hero.title.includes('<br />') ? (
                <span dangerouslySetInnerHTML={{ __html: hero.title }} />
              ) : (
                hero.title
              )}
            </h1>
            <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              {hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto px-10 py-4 bg-gray-900 rounded-2xl font-bold text-white shadow-2xl shadow-gray-200 hover:scale-105 transition-transform"
              >
                Daftar Gratis Sekarang
              </Link>
              <a
                href="#cara-kerja"
                className="w-full sm:w-auto px-10 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-900 hover:bg-gray-50 transition-all"
              >
                Pelajari Cara Kerjanya
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/USP Section */}
      <section className="py-20 px-6 bg-gray-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((item, idx) => (
              <div key={idx} className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-purple-200 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-purple-600">{item.icon}</span>
                </div>
                <h3 className="text-lg font-bold mb-2 text-gray-900">{item.label}</h3>
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
              <h2 className="text-3xl md:text-5xl font-black mb-8 leading-tight">Mulai Dengan <br /><span className="text-purple-600">Sangat Simpel</span></h2>
              <div className="space-y-8">
                <div className="flex gap-5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center shrink-0 font-bold text-sm text-white shadow-lg shadow-purple-200">1</div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Daftar Mitra</h4>
                    <p className="text-gray-500 text-sm">Daftar sebagai mitra di SahabatMart.com secara gratis tanpa biaya admin.</p>
                  </div>
                </div>
                <div className="flex gap-5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center shrink-0 font-bold text-sm text-white shadow-lg shadow-purple-200">2</div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Ambil Link</h4>
                    <p className="text-gray-500 text-sm">Gunakan link produk atau link pendaftaran unik dari Dashboard Member Anda.</p>
                  </div>
                </div>
                <div className="flex gap-5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center shrink-0 font-bold text-sm text-white shadow-lg shadow-purple-200">3</div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Bagikan Konten</h4>
                    <p className="text-gray-500 text-sm">Share ke WhatsApp, TikTok, atau IG. Foto & video promosi sudah kami siapkan.</p>
                  </div>
                </div>
                <div className="flex gap-5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center shrink-0 font-bold text-sm text-white shadow-lg shadow-purple-200">4</div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Terima Komisi</h4>
                    <p className="text-gray-500 text-sm">Dapatkan komisi otomatis dari setiap transaksi yang terjadi melalui link Anda.</p>
                  </div>
                </div>
              </div>
              <div className="mt-12">
                <button className="flex items-center gap-3 px-8 py-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 font-bold text-sm hover:bg-rose-100 transition-all">
                  <span className="material-symbols-outlined">picture_as_pdf</span>
                  Download PDF Presentasi Bisnis
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-video rounded-[40px] overflow-hidden bg-gray-100 border border-gray-200 relative group shadow-2xl">
                <img src="https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800" alt="Video Placeholder" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="w-20 h-20 rounded-full bg-white text-purple-600 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-4xl">play_arrow</span>
                  </button>
                </div>
              </div>
              <div className="absolute -bottom-8 -right-8 p-8 bg-gray-900 rounded-[32px] shadow-2xl hidden md:block">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total Komisi Terbayar</p>
                <p className="text-3xl font-black text-white">Rp 2.4 Miliar+</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tiers Section */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-4">Pilihan Keanggotaan</h2>
          <p className="text-gray-500">Mulai langkah Anda sekarang, sesuaikan dengan target penghasilan Anda</p>
        </div>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10">
          {(dynamicContent?.tiers || []).map((tier, idx) => (
            <div 
              key={idx} 
              className={`p-10 md:p-14 rounded-[48px] bg-white border relative overflow-hidden transition-all shadow-sm ${
                tier.isPopular ? 'border-2 border-purple-500 shadow-2xl shadow-purple-100' : 'border-gray-200 hover:border-purple-200'
              }`}
            >
              {tier.isPopular && (
                <div className="absolute top-0 right-0 p-5 bg-purple-500 text-[10px] font-black uppercase tracking-widest text-white rounded-bl-3xl">
                  Paling Populer
                </div>
              )}
              <h3 className={`text-2xl font-bold mb-2 ${tier.isPopular ? 'text-purple-600' : 'text-gray-900'}`}>{tier.name}</h3>
              <p className="text-gray-500 text-sm mb-10">{tier.desc}</p>
              
              <div className="space-y-5 mb-12">
                {tier.benefits.map((benefit, bIdx) => (
                  <div key={bIdx} className={`flex justify-between items-center py-4 border-b ${tier.isPopular ? 'border-purple-50' : 'border-gray-50'}`}>
                    <span className={`text-sm ${tier.isPopular ? 'text-gray-700' : 'text-gray-600'}`}>{benefit.label}</span>
                    {benefit.value === 'check' ? (
                      <span className="material-symbols-outlined text-green-500">check_circle</span>
                    ) : (
                      <span className={`font-bold ${tier.isPopular ? 'text-purple-600 text-xl' : 'text-gray-900'}`}>{benefit.value}</span>
                    )}
                  </div>
                ))}
              </div>

              {tier.promoText && (
                <div className="p-5 bg-purple-50 rounded-2xl border border-purple-100 mb-8">
                  <p className="text-[10px] font-bold text-purple-700 uppercase tracking-widest mb-1">PEMBERITAHUAN</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{tier.promoText}</p>
                </div>
              )}

              <Link 
                to="/register" 
                className={`block text-center py-4 rounded-2xl font-bold transition-all ${
                  tier.isPopular 
                    ? 'bg-purple-600 text-white font-black hover:bg-purple-700 hover:scale-[1.02] shadow-xl shadow-purple-200 py-5' 
                    : 'bg-gray-50 border border-gray-200 text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tier.buttonText}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Simulation Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto bg-gray-50 border border-gray-200 rounded-[60px] p-10 md:p-20 relative shadow-inner">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-6">Simulasi Potensi Komisi</h2>
            <div className="flex justify-center gap-3 p-1.5 bg-gray-200/50 rounded-[24px] w-fit mx-auto">
              <button 
                onClick={() => setActiveSim(5)}
                className={`px-8 py-3 rounded-[18px] text-sm font-bold transition-all ${activeSim === 5 ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Duplikasi 5
              </button>
              <button 
                onClick={() => setActiveSim(10)}
                className={`px-8 py-3 rounded-[18px] text-sm font-bold transition-all ${activeSim === 10 ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Duplikasi 10
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-20 items-start">
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">{simulationData[activeSim].title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{simulationData[activeSim].desc}</p>
              </div>
              
              <div className="space-y-3">
                {simulationData[activeSim].levels.map((lvl, i) => (
                  <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <span className="text-xs font-bold text-gray-500">{lvl.name}</span>
                    <span className="text-sm font-black text-gray-900">{lvl.income}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <div className="p-10 rounded-[40px] bg-purple-600 text-white shadow-2xl shadow-purple-200 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full" />
                <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-4">Total Potensi Pasif Income</p>
                <p className="text-4xl md:text-6xl font-black mb-4">{simulationData[activeSim].premium}</p>
                <div className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-[10px] font-bold">KHUSUS PREMIUM MEMBER</div>
              </div>

              <div className="p-8 rounded-[32px] bg-white border border-rose-100 text-center shadow-sm">
                <p className="text-[11px] font-bold text-rose-500 uppercase tracking-widest mb-2">Bandingkan dengan Free Member</p>
                <p className="text-2xl font-black text-gray-900 mb-1">Maksimal {simulationData[activeSim].free}</p>
                <p className="text-xs text-gray-400">Upgrade ke Premium untuk membuka 3 Level komisi tambahan!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section (Cards) */}
      {dynamicContent?.mission && (
        <section className="py-24 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black mb-4 text-gray-900">{dynamicContent.mission.title}</h2>
              <div className="w-20 h-1 bg-purple-600 mx-auto rounded-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {dynamicContent.mission.items.map((item, i) => (
                <div 
                  key={i} 
                  className="p-10 rounded-[32px] bg-white border border-gray-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.1)] transition-all duration-500 flex flex-col items-center text-center group hover:-translate-y-2"
                >
                  <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mb-8 group-hover:bg-purple-600 transition-colors duration-500">
                    <span className="material-symbols-outlined text-4xl text-purple-600 group-hover:text-white transition-colors duration-500">
                      {item.icon}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">{item.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-sm">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Target Audience */}
      <section className="py-24 px-6 bg-gray-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black mb-4 text-gray-900">Cocok Untuk Siapa?</h2>
            <p className="text-gray-500 text-lg">Peluang inklusif untuk siapa saja yang ingin berkembang</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: 'Ibu Rumah Tangga', icon: 'home_repair_service', color: 'bg-rose-50 text-rose-600' },
              { label: 'Karyawan', icon: 'business_center', color: 'bg-blue-50 text-blue-600' },
              { label: 'Mahasiswa', icon: 'school', color: 'bg-amber-50 text-amber-600' },
              { label: 'Pemula Bisnis', icon: 'rocket_launch', color: 'bg-purple-50 text-purple-600' }
            ].map((item, i) => (
              <div key={i} className="text-center p-10 rounded-[32px] bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                <div className={`w-20 h-20 rounded-[24px] ${item.color} flex items-center justify-center mx-auto mb-8 shadow-sm`}>
                  <span className="material-symbols-outlined text-4xl">{item.icon}</span>
                </div>
                <h4 className="font-black text-gray-900 text-lg">{item.label}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 relative bg-white overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl bg-purple-50 blur-[120px] rounded-full opacity-50 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-7xl font-black mb-10 leading-tight">Saatnya Bangun <br /> <span className="text-purple-600">Masa Depanmu!</span></h2>
          <p className="text-gray-500 text-xl mb-14 max-w-2xl mx-auto leading-relaxed">
            Tidak perlu modal besar untuk memulai perubahan. Cukup gunakan produknya, bagikan linknya, dan nikmati hasilnya.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
             <Link to="/register" className="w-full sm:w-auto px-16 py-6 bg-gray-900 text-white rounded-3xl font-black text-xl hover:scale-105 transition-transform shadow-2xl shadow-gray-200">GABUNG SEKARANG</Link>
             <Link to="/shop" className="w-full sm:w-auto px-16 py-6 bg-white border-2 border-gray-900 text-gray-900 rounded-3xl font-black text-xl hover:bg-gray-50 transition-all">BELANJA DULU</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BusinessOpportunity;
