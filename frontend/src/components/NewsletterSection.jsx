import React from 'react';

const NewsletterSection = () => {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary opacity-[0.03]" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="bg-white rounded-[3rem] p-8 md:p-16 border border-slate-100 shadow-2xl shadow-primary/5 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
              Dapatkan Tips Skincare <br className="hidden md:block" /> & Promo Eksklusif ✨
            </h2>
            <p className="text-gray-500 mt-4 text-lg">
              Bergabunglah dengan komunitas AkuGlow dan jadilah yang pertama tahu tentang produk terbaru kami.
            </p>
          </div>
          
          <div className="flex-1 w-full max-w-md">
            <form className="flex flex-col sm:flex-row gap-3" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="Alamat email kamu..." 
                className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 outline-none font-medium"
              />
              <button className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-primary transition-all shadow-lg active:scale-95">
                GABUNG
              </button>
            </form>
            <p className="text-[10px] text-gray-400 mt-4 text-center lg:text-left font-medium">
              *Dengan mendaftar, kamu menyetujui Kebijakan Privasi kami.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;
