import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gray-50 py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative z-10">
            <span className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-3 block">Cerita Kami</span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-6">
              Membangun Ekosistem Belanja Masa Depan.
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-lg">
              Berawal dari mimpi sederhana di tahun 2018, SahabatMart hadir untuk menjembatani jarak antara produsen berkualitas dan konsumen yang mencari kemudahan serta transparansi bertransaksi.
            </p>
            <div className="flex gap-4">
              <Link to="/contact" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl transition-colors shadow-lg shadow-blue-600/20">
                Hubungi Kami
              </Link>
            </div>
          </div>
          <div className="relative z-10 hidden lg:block">
            <div className="flex gap-4 items-center">
              <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=500&fit=crop" className="w-1/2 h-96 object-cover rounded-3xl" alt="Tim 1" />
              <div className="flex flex-col gap-4 w-1/2">
                <img src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=300&fit=crop" className="w-full h-44 object-cover rounded-3xl" alt="Tim 2" />
                <img src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=300&fit=crop" className="w-full h-44 object-cover rounded-3xl" alt="Tim 3" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visi Misi Stats */}
      <section className="py-20 max-w-7xl mx-auto px-6 border-b border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { num: "5K+", label: "Produk Berkualitas Aktif" },
            { num: "1.2M", label: "Pelanggan Setia" },
            { num: "99%", label: "Tingkat Kepuasan" }
          ].map((stat, i) => (
            <div key={i} className="text-center p-8 rounded-3xl bg-gray-50/50 border border-gray-100">
              <div className="text-5xl font-black text-blue-600 mb-2">{stat.num}</div>
              <div className="text-sm font-semibold text-gray-800 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Nilai Inti */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Core Values Kami</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">Kami tidak sekadar berjualan produk, namun menyajikan solusi dan pengalaman tak terlupakan dari awal hingga akhir transaksi.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "Kualitas Premium", desc: "Produk yang lolos kurasi ketat melalui pengecekan spesifikasi dari produsen paling andal.", icon: "💎" },
            { title: "Keamanan Prioritas", desc: "Perlindungan privasi hingga gateway pembayaran ganda untuk menjaga transaksi tetap 100% aman.", icon: "🔒" },
            { title: "Eksekusi Kilat", desc: "Sistem logistik yang diperkuat dengan kecerdasan mesin memastikan produk sampai tepat waktu.", icon: "🚀" }
          ].map((val, i) => (
            <div key={i} className="p-8 rounded-3xl border border-gray-100 hover:border-blue-600 transition-colors bg-white hover:shadow-xl group">
              <div className="text-4xl mb-6 bg-gray-50 w-16 h-16 flex items-center justify-center rounded-2xl group-hover:bg-blue-50 transition-colors">{val.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{val.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{val.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
