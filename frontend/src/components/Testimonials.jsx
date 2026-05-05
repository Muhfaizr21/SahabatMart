import React from 'react';

const reviews = [
  {
    name: 'Anmiira Zulaika',
    role: 'Loyal Customer',
    text: 'Suka banget sama teksturnya yang ringan dan cepat meresap. Dalam 2 minggu kulit aku jadi lebih cerah dan noda hitam mulai memudar. AkuGlow bener-bener game changer!',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
  },
  {
    name: 'Melissa J. Talley',
    role: 'Beauty Enthusiast',
    text: 'Awalnya ragu nyobain karena kulit aku sensitif banget. Tapi pas coba Night Cream-nya, paginya muka jadi kenyal banget dan gak ada iritasi sama sekali. Love it!',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop'
  },
  {
    name: 'Rini M.',
    role: 'Verified Buyer',
    text: 'Packaging-nya mewah banget, dapet free konsultasi juga dari adminnya yang ramah. Pengiriman cuma sehari udah nyampe. Hasilnya memuaskan untuk mencerahkan wajah.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop'
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-white overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(var(--primary-rgb),0.03),transparent)] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-primary/10">
            Testimoni Nyata ✨
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">Apa Kata <span className="text-primary">Komunitas</span> Kami?</h2>
          <p className="text-gray-500 text-lg">Ribuan orang telah membuktikan keajaiban produk kami. Sekarang giliran Anda.</p>
        </div>
 
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
          {reviews.map((r, i) => (
            <div key={i} className="bg-white p-10 rounded-[3rem] border border-gray-100 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-700 group relative">
              <div className="absolute top-8 right-10 text-primary/10 group-hover:text-primary/20 transition-colors">
                <svg width="40" height="40" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM3.017 21L3.017 18C3.017 16.8954 3.91243 16 5.017 16H8.017C8.56928 16 9.017 15.5523 9.017 15V9C9.017 8.44772 8.56928 8 8.017 8H4.017C3.46472 8 3.017 8.44772 3.017 9V11C3.017 11.5523 2.56928 12 2.017 12H1.017V5H11.017V15C11.017 18.3137 8.33072 21 5.017 21H3.017Z"/></svg>
              </div>
              <div className="flex items-center gap-0.5 mb-8">
                {[...Array(r.rating)].map((_, idx) => (
                  <i key={idx} className="bx bxs-star text-yellow-400 text-lg sm:text-xl"></i>
                ))}
              </div>
              <p className="text-gray-600 text-base sm:text-lg italic mb-10 leading-relaxed font-medium relative z-10">"{r.text}"</p>
              <div className="flex items-center gap-4 pt-8 border-t border-gray-50">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-md group-hover:blur-lg transition-all"></div>
                  <img src={r.avatar} alt={r.name} className="w-14 h-14 rounded-full object-cover border-2 border-white relative z-10" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-lg">{r.name}</h4>
                  <span className="text-[10px] text-primary font-black uppercase tracking-widest">{r.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
