import React from 'react';
import { Link } from 'react-router-dom';
import aboutImg from '../assets/9bc151cb-21ca-4872-9afb-cad0c087c661.webp';
import SEO from '../components/SEO';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-['Plus_Jakarta_Sans']">
      <SEO 
        title="Tentang Kami - SahabatMart"
        description="Kenali lebih dekat SahabatMart (AkuGlow). Misi kami adalah memberdayakan individu melalui produk kecantikan premium dan peluang bisnis yang adil."
      />
      {/* Intro Section */}
      <section className="pt-32 pb-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Image with Decorative Elements */}
            <div className="relative">
              <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src={aboutImg} 
                  alt="Kenalan Lebih Dekat dengan Akuglow" 
                  className="w-full h-auto object-cover"
                />
              </div>
              {/* Decorative Red Star/Icon */}
              <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-rose-600 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                <span className="material-symbols-outlined text-white text-4xl">star</span>
              </div>
              {/* Decorative Background Shape */}
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-rose-50 rounded-full -z-10"></div>
            </div>

            {/* Right: Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-50 text-rose-600 rounded-full text-xs font-black uppercase tracking-widest">
                TENTANG AKUGLOW
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight">
                Kenalan Lebih Dekat dengan Akuglow
              </h2>
              <div className="space-y-4 text-gray-500 text-lg leading-relaxed">
                <p>
                  AkuGlow lahir dari semangat untuk memberdayakan setiap individu agar memiliki kepercayaan diri melalui kulit yang sehat dan bercahaya. Kami memahami bahwa kecantikan bukan sekadar tampilan luar, melainkan refleksi dari kesehatan dan kebahagiaan batin.
                </p>
                <p>
                  Dengan riset mendalam dan kolaborasi bersama para ahli dermatologi, kami menghadirkan rangkaian produk skincare premium yang diformulasikan khusus untuk iklim tropis. Setiap tetes produk kami mengandung bahan aktif berkualitas tinggi yang aman dan teruji.
                </p>
              </div>
              <div className="pt-6">
                <Link 
                  to="/shop" 
                  className="inline-flex items-center gap-3 px-8 py-4 bg-rose-600 text-white rounded-full font-black text-sm hover:bg-rose-700 hover:-translate-y-1 transition-all duration-300 shadow-lg shadow-rose-200"
                >
                  BELANJA SEKARANG
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission Section */}
      <section className="py-24 px-4 md:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900">Our Mission</h2>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {[
              { title: 'Innovation', desc: 'Terus berinovasi dalam menghadirkan formula skincare premium berbasis riset dermatologi terbaru.', icon: 'lightbulb' },
              { title: 'Sustainability', desc: 'Berkomitmen pada praktik bisnis yang berkelanjutan dan penggunaan bahan baku yang ramah lingkungan.', icon: 'sync' },
              { title: 'Empowerment', desc: 'Memberdayakan mitra affiliate kami dengan sistem bagi hasil yang adil dan pelatihan bisnis intensif.', icon: 'person' },
              { title: 'Quality', desc: 'Menjamin setiap produk memiliki standar kualitas tertinggi dan telah lulus uji klinis BPOM.', icon: 'verified' },
              { title: 'Distribution', desc: 'Membangun jaringan distribusi yang efisien untuk memastikan produk sampai ke tangan Anda dengan aman.', icon: 'local_shipping' },
              { title: 'Target', desc: 'Menjadi solusi kecantikan utama bagi seluruh masyarakat Indonesia dengan produk yang inklusif.', icon: 'target' }
            ].map((mission, idx) => (
              <div key={idx} className="p-6 md:p-10 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center flex flex-col items-center group">
                <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-rose-50 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-rose-600 transition-colors duration-300">
                  <span className="material-symbols-outlined text-rose-600 text-2xl md:text-4xl group-hover:text-white transition-colors duration-300">{mission.icon}</span>
                </div>
                <h3 className="text-sm md:text-xl font-bold text-gray-900 mb-2 md:mb-3">{mission.title}</h3>
                <p className="text-gray-500 text-[10px] md:text-sm leading-relaxed max-w-[240px]">
                  {mission.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cards Section */}
      <section className="py-20 bg-[#FDFBF7] px-4 md:px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                title: 'Good Quality', 
                desc: 'Produk kami melewati standar kontrol kualitas yang ketat untuk memastikan hasil terbaik bagi kulit Anda.', 
                icon: 'verified' 
              },
              { 
                title: 'Best Service', 
                desc: 'Kami berkomitmen memberikan pelayanan terbaik mulai dari konsultasi hingga dukungan purna jual.', 
                icon: 'volunteer_activism' 
              },
              { 
                title: 'Fast & Save', 
                desc: 'Pengiriman cepat dan terjamin keamanannya ke seluruh wilayah Indonesia dengan partner logistik terpercaya.', 
                icon: 'local_shipping' 
              }
            ].map((feature, idx) => (
              <div 
                key={idx} 
                className="group relative bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] border border-gray-100 shadow-xl hover:shadow-2xl hover:shadow-rose-600/10 hover:-translate-y-3 transition-all duration-500 overflow-hidden"
              >
                {/* Decorative Background Shape */}
                <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-rose-50 rounded-bl-[4rem] md:rounded-bl-[5rem] -z-0 group-hover:bg-rose-600 transition-colors duration-500"></div>
                
                <div className="relative z-10">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 md:mb-10 group-hover:bg-white group-hover:rotate-12 transition-all duration-500 shadow-sm">
                    <span className="material-symbols-outlined text-rose-600 text-2xl md:text-3xl transition-colors duration-500">
                      {feature.icon}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-4 md:mb-6 group-hover:text-rose-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-500 leading-relaxed text-sm md:text-lg">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision & Mission Section */}
      <section className="py-24 px-4 md:px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-gray-900">Visi & Misi Kami</h2>
            <div className="w-20 h-1.5 bg-rose-600 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 text-left">
            <div className="p-6 md:p-8 rounded-3xl bg-gray-50 border border-gray-100">
              <h4 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs">1</span>
                Visi
              </h4>
              <p className="text-gray-500 leading-relaxed text-sm md:text-base">
                Menjadi brand skincare nomor satu yang dipercaya masyarakat Indonesia untuk solusi kecantikan kulit sehat alami yang berkelanjutan.
              </p>
            </div>
            <div className="p-6 md:p-8 rounded-3xl bg-gray-50 border border-gray-100">
              <h4 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs">2</span>
                Misi
              </h4>
              <p className="text-gray-500 leading-relaxed text-sm md:text-base">
                Memberikan edukasi kecantikan yang tepat, menyediakan produk berkualitas tinggi dengan harga terjangkau, dan membangun komunitas yang sehat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 px-4 md:px-6 bg-[#FDFBF7] relative overflow-hidden">
        {/* Subtle Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-rose-50/30 to-transparent -z-0"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-600/10 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
              CULTURE & BELIEF
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">Values of AkuGlow</h2>
            <p className="text-gray-500 mt-4 max-w-2xl mx-auto text-sm md:text-base">Prinsip dasar yang menjadi landasan kami dalam setiap langkah dan keputusan.</p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {[
              { title: 'Creative and Innovative', desc: 'Solusi cerdas untuk setiap masalah.', icon: 'lightbulb' },
              { title: 'Respect', desc: 'Menghargai setiap perbedaan.', icon: 'handshake' },
              { title: 'Humility', desc: 'Tetap rendah hati dalam kesuksesan.', icon: 'person_check' },
              { title: 'Skillful', desc: 'Keahlian terasah dan profesional.', icon: 'settings' },
              { title: 'Teamwork', desc: 'Sinergi mencapai tujuan bersama.', icon: 'groups' },
              { title: 'Ethics and Integrity', desc: 'Integritas dalam setiap tindakan.', icon: 'shield_check' },
              { title: 'Adaptive', desc: 'Cepat beradaptasi dengan perubahan.', icon: 'sync' }
            ].map((value, idx) => (
              <div 
                key={idx} 
                className="group relative p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] bg-white border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-rose-600/5 hover:-translate-y-2 transition-all duration-500 overflow-hidden text-center flex flex-col items-center"
              >
                {/* Decorative Expanding Circle on Hover */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-50 rounded-full group-hover:scale-[6] group-hover:bg-rose-50/50 transition-transform duration-700 -z-0"></div>
                
                <div className="relative z-10">
                  <div className="w-14 h-14 md:w-20 md:h-20 mx-auto mb-4 md:mb-8 bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-50 flex items-center justify-center group-hover:bg-rose-600 group-hover:rotate-12 transition-all duration-500">
                    <span className="material-symbols-outlined text-rose-600 text-2xl md:text-4xl group-hover:text-white transition-colors duration-500">
                      {value.icon}
                    </span>
                  </div>
                  <h4 className="text-xs md:text-xl font-black text-gray-900 mb-2 md:mb-3 group-hover:text-rose-600 transition-colors leading-tight">
                    {value.title}
                  </h4>
                  <p className="text-gray-500 text-[10px] md:text-sm leading-relaxed opacity-0 md:opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 hidden md:block">
                    {value.desc}
                  </p>
                </div>
                
                {/* Bottom Accent Bar */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
