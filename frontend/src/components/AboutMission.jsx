import React from 'react';

const ingredients = [
  { name: 'Centella Asiatica', desc: 'Menenangkan kulit sensitif dan mempercepat pemulihan.' },
  { name: 'Niacinamide', desc: 'Mencerahkan kulit dan menyamarkan noda hitam.' },
  { name: 'Ceramide Complex', desc: 'Memperkuat skin barrier dan menjaga kelembaban.' },
  { name: 'Aloe Vera', desc: 'Memberikan hidrasi instan dan sensasi dingin.' },
];

export default function AboutMission() {
  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-600/10 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
              Tentang AkuGlow
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-6">
              Formula Premium Korea untuk <span className="text-rose-600">Kecantikan Alami</span> Anda.
            </h2>
            <p className="text-gray-500 text-lg mb-10 leading-relaxed">
              Kami percaya bahwa setiap orang berhak memiliki kulit sehat dan bercahaya. Dengan standar formulasi dari Korea, kami menghadirkan rangkaian perawatan kulit yang aman, lembut, namun sangat efektif.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex flex-col gap-2 p-5 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-rose-600/5 hover:border-rose-600/20 transition-all group">
                  <h4 className="font-bold text-gray-900 group-hover:text-rose-600 transition-colors flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600/40 group-hover:bg-rose-600 transition-colors"></span>
                    {ing.name}
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{ing.desc}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right: Image Overlay */}
          <div className="order-1 lg:order-2 relative">
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-rose-600/5 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-rose-600/10 border-8 border-white">
              <img 
                src="https://images.unsplash.com/photo-1596462502278-27bfdc4033c8?w=800&h=1000&fit=crop" 
                alt="AkuGlow Ingredients" 
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              <div className="absolute bottom-8 left-8 right-8 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                    <i className="bx bxs-shield-check text-2xl"></i>
                  </div>
                  <div>
                    <h5 className="font-bold text-lg">Terdaftar di BPOM</h5>
                    <p className="text-sm text-white/80">Aman & Terpercaya untuk semua jenis kulit.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
