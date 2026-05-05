import React from 'react';
import { Link } from 'react-router-dom';

export default function DiagnosticCTA() {
  return (
    <section className="py-20 bg-gray-900 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4"></div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-black rounded-[3rem] p-8 md:p-16 overflow-hidden relative border border-white/10 shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
          
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-white/10 backdrop-blur-md">
                Smart Diagnostic ✨
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6">
                Tampil Percaya Diri dengan <span className="text-amber-400 italic">Kulit Impian</span> Anda.
              </h2>
              <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto lg:mx-0 font-medium">
                Bingung memilih produk yang tepat? Ikuti tes kesehatan kulit kami dan dapatkan rekomendasi produk yang dipersonalisasi khusus untuk Anda.
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <Link to="/skin/pretest" className="px-8 py-4 bg-white text-rose-600 font-black rounded-2xl hover:bg-gray-100 transition-all shadow-xl shadow-black/10 scale-105 hover:scale-110">
                  Mulai Tes Sekarang
                </Link>
                <Link to="/shop" className="px-8 py-4 bg-white/5 text-white font-black rounded-2xl hover:bg-white/10 transition-all border border-white/20 backdrop-blur-sm">
                  Lihat Semua Produk
                </Link>
              </div>
            </div>
            
            <div className="flex-1 relative hidden lg:block">
              <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white/20">
                <img 
                  src="https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=600&fit=crop" 
                  alt="Skin Care Diagnostic" 
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
