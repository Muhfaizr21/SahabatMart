import { Link } from 'react-router-dom';
import AboutMission from '../components/AboutMission';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#fafafa] text-gray-900 selection:bg-rose-600 selection:text-white">
      {/* 1. Cinematic Hero Section - Scaled Down */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-white">
        {/* Background Ambient Effects */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-600/10 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-600/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="max-w-6xl mx-auto px-6 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[1.1] tracking-tight mb-8 animate-text-reveal">
            Wujudkan Pancaran <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-amber-500">Kecantikan Sejati.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base md:text-lg text-gray-500 leading-relaxed mb-10 animate-fade-up">
            AkuGlow hadir bukan sekadar produk kecantikan. Kami merancang solusi transformasi kulit yang memadukan keajaiban alam dengan teknologi mutakhir dari Korea.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-fade-up" style={{ animationDelay: '0.4s' }}>
             <Link to="/shop" className="px-10 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-rose-600 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-gray-900/10">
                Lihat Koleksi
             </Link>
             <Link to="/contact" className="px-10 py-4 bg-white border border-gray-200 text-gray-900 font-bold rounded-2xl hover:bg-gray-50 transition-all">
                Hubungi Kami
             </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 animate-bounce opacity-30">
           <div className="w-[1px] h-10 bg-gradient-to-b from-rose-600/0 via-rose-600 to-rose-600/0"></div>
        </div>
      </section>

      {/* 2. The Bento Grid Vision - Translated */}
      <section className="py-24 bg-white border-t border-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
             
             {/* Main Mission Card */}
              <div className="lg:col-span-7 bg-[#f8fafc] rounded-[2.5rem] p-10 flex flex-col justify-between group overflow-hidden relative border border-gray-100">
                 <div className="relative z-10">
                    <h2 className="text-4xl font-black mb-6 leading-tight">Misi Kami: <br /> <span className="text-rose-600 underline decoration-4 underline-offset-4">Kemurnian</span> <br /> & Inovasi.</h2>
                    <p className="text-lg text-gray-500 max-w-sm leading-relaxed">
                       Kami berdedikasi membawa standar kecantikan premium dunia ke tangan Anda, dengan kejujuran dan hasil yang nyata.
                    </p>
                 </div>
                 <div className="relative z-10 flex flex-wrap gap-3 mt-10">
                    <div className="px-5 py-2.5 bg-white rounded-xl shadow-md border border-gray-50 flex items-center gap-3">
                       <i className="bx bxs-award text-rose-600"></i>
                       <span className="text-[10px] font-black uppercase">Standar Global</span>
                    </div>
                    <div className="px-5 py-2.5 bg-white rounded-xl shadow-md border border-gray-50 flex items-center gap-3">
                       <i className="bx bxs-leaf text-green-500"></i>
                       <span className="text-[10px] font-black uppercase">Bahan Alami</span>
                    </div>
                 </div>
                {/* Image overlay with better balance */}
                <img 
                   src="https://images.unsplash.com/photo-1596462502278-27bfdc4033c8?w=800&h=800&fit=crop" 
                   className="absolute -bottom-10 -right-10 w-1/2 h-1/2 object-cover rounded-full opacity-10 group-hover:scale-110 transition-transform duration-1000 grayscale"
                   alt=""
                />
             </div>

             {/* Side Stats */}
              <div className="lg:col-span-5 grid grid-rows-2 gap-6">
                 <div className="bg-gradient-to-br from-rose-600 to-amber-600 rounded-[2.5rem] p-8 text-white flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6">
                       <i className="bx bx-heart text-5xl opacity-20 group-hover:scale-125 transition-transform"></i>
                    </div>
                    <div className="text-6xl font-black mb-1">1.2M+</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-rose-100">Pelanggan Puas</div>
                 </div>
                <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white flex flex-col justify-center group">
                    <div className="flex -space-x-3 mb-5">
                       {[1,2,3,4].map(i => (
                         <img key={i} src={`https://i.pravatar.cc/100?img=${i+20}`} className="w-12 h-12 rounded-full border-2 border-gray-900 shadow-lg" alt="" />
                       ))}
                       <div className="w-12 h-12 rounded-full border-2 border-gray-900 bg-rose-600 flex items-center justify-center text-[10px] font-black">
                          +10K
                       </div>
                    </div>
                   <div className="text-xl font-black mb-1">Komunitas Skin Warrior</div>
                   <p className="text-gray-400 text-xs">Bergabung dengan ribuan pecinta skincare premium.</p>
                </div>
             </div>

          </div>
        </div>
      </section>

      {/* 3. The Science (Ingredients) - Engaging Indonesian */}
      <section className="py-24 bg-[#fafafa]">
         <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-center gap-16">
               <div className="w-full lg:w-1/2 relative">
                  <div className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-xl relative z-10">
                     <img src="https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800&h=1200&fit=crop" className="w-full h-full object-cover" alt="Sains AkuGlow" />
                  </div>
                   <div className="absolute bottom-8 -right-4 p-6 bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-white/50 z-20 max-w-[240px]">
                      <h4 className="text-base font-black mb-2 text-rose-600">Teknologi Korea.</h4>
                      <p className="text-xs text-gray-500 leading-relaxed italic">"Kami menggunakan proses ekstraksi dingin untuk menjaga nutrisi bahan alami tetap utuh."</p>
                   </div>
               </div>
                <div className="w-full lg:w-1/2">
                   <span className="text-rose-600 font-black text-xs uppercase tracking-widest mb-4 block">Kualitas Tanpa Kompromi</span>
                   <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-8">Rahasia di Balik <br/><span className="text-rose-600 italic">Kilau Sempurna Anda.</span></h2>
                  
                  <div className="space-y-6">
                     {[
                        { title: "Bahan Terpilih", desc: "Kami hanya menggunakan bahan mentah bersertifikat dari perkebunan terbaik dunia.", icon: "bx-check-double" },
                        { title: "Uji Klinis", desc: "Setiap formula melalui uji sensitivitas ketat untuk memastikan keamanan bagi semua jenis kulit.", icon: "bx-shield-quarter" },
                        { title: "Ramah Lingkungan", desc: "Komitmen kami pada kemasan berkelanjutan dan proses produksi yang etis.", icon: "bx-planet" }
                     ].map((item, i) => (
                         <div key={i} className="flex gap-5 items-start group p-4 rounded-2xl hover:bg-white hover:shadow-sm transition-all duration-300">
                            <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl group-hover:bg-rose-600 group-hover:text-white transition-all">
                               <i className={`bx ${item.icon}`}></i>
                            </div>
                           <div>
                              <h5 className="text-lg font-black mb-1 text-gray-900">{item.title}</h5>
                              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* 5. Final CTA - Engaging & Balanced */}
       <section className="py-32 bg-white text-center px-6">
          <div className="max-w-4xl mx-auto">
             <h2 className="text-5xl md:text-6xl font-black tracking-tight text-gray-900 mb-10">Jadilah Bagian dari <br /> <span className="text-rose-600 italic">Generasi Glowing.</span></h2>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link to="/shop" className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-rose-600 to-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-600/20 hover:scale-105 transition-all active:scale-95">
                   Mulai Belanja Sekarang
                </Link>
               <Link to="/register" className="w-full sm:w-auto px-10 py-4 bg-gray-50 text-gray-900 border border-gray-200 font-bold rounded-2xl hover:bg-gray-100 transition-all active:scale-95">
                  Gabung Jadi Partner
               </Link>
            </div>
         </div>
      </section>

      <style>{`
        @keyframes text-reveal {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-down {
          from { opacity: 0; transform: translateY(-15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(25px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scroll-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-text-reveal { animation: text-reveal 1s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        .animate-fade-down { animation: fade-down 0.8s ease-out forwards; }
        .animate-fade-up { animation: fade-up 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        .animate-scroll-marquee { 
           animation: scroll-marquee 50s linear infinite; 
           width: max-content;
        }
        .animate-scroll-marquee:hover { animation-play-state: paused; }
      `}</style>
    </main>
  );
}
