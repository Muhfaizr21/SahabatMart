const features = [
  {
    icon: <i className="bx bxs-check-circle text-2xl"></i>,
    title: 'Good Quality', desc: 'Bahan alami dan formula premium Korea.'
  },
  {
    icon: <i className="bx bxs-user-voice text-2xl"></i>,
    title: 'Best Service', desc: 'Layanan pelanggan 24 jam dan konsultasi gratis.'
  },
  {
    icon: <i className="bx bxs-truck text-2xl"></i>,
    title: 'Fast & Save', desc: 'Pengiriman cepat ke seluruh Indonesia dengan jaminan keaslian.'
  },
  {
    icon: <i className="bx bxs-badge-check text-2xl"></i>,
    title: 'BPOM Certified', desc: 'Produk kami telah terdaftar resmi dan aman digunakan.'
  },
];

export default function FeatureBar() {
  return (
    <section className="py-16 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
          {features.map((f, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-4 group">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary/5 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-all duration-500 text-primary shadow-sm border border-primary/10">
                {f.icon}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1">{f.title}</h3>
                <p className="text-[10px] sm:text-sm text-gray-500 leading-relaxed max-w-[200px] mx-auto">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
