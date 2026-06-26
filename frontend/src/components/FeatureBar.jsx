const defaultFeatures = [
  {
    icon: 'check-circle',
    title: 'Good Quality', desc: 'Bahan alami dan formula premium Korea.'
  },
  {
    icon: 'user-voice',
    title: 'Best Service', desc: 'Layanan pelanggan 24 jam dan konsultasi gratis.'
  },
  {
    icon: 'truck',
    title: 'Fast & Save', desc: 'Pengiriman cepat ke seluruh Indonesia dengan jaminan keaslian.'
  },
  {
    icon: 'badge-check',
    title: 'BPOM Certified', desc: 'Produk kami telah terdaftar resmi dan aman digunakan.'
  },
];

export default function FeatureBar({ data }) {
  const items = data && data.length > 0 ? data : defaultFeatures;

  const renderIcon = (iconName) => {
    if (!iconName) return <i className="bx bxs-star text-2xl"></i>;
    
    // Check if it's an emoji (contains non-ASCII characters)
    const isEmoji = /[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/.test(iconName);
    if (isEmoji) {
      return <span className="text-2xl">{iconName}</span>;
    }
    
    const lowerIcon = iconName.toLowerCase().trim();
    
    // If it has a hyphen, or is exactly 'truck', it's highly likely a boxicon
    if (lowerIcon.includes('-') || lowerIcon === 'truck') {
      return <i className={`bx bxs-${lowerIcon.replace(/^bx[s]?-/, '')} text-2xl`}></i>;
    }
    
    // Fallback for material symbols
    return <span className="material-symbols-outlined text-2xl">{lowerIcon}</span>;
  };

  return (
    <section className="py-16 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
          {items.map((f, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-4 group">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary/5 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-all duration-500 text-primary shadow-sm border border-primary/10">
                {renderIcon(f.icon)}
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
