import { Link } from 'react-router-dom';

export default function PromoBanner() {
  return (
    <section className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 to-primary-dark min-h-[200px] flex items-center p-8">
            <div className="relative z-10">
              <span className="text-primary-light text-sm font-black uppercase tracking-widest">Premium Care</span>
              <h3 className="text-3xl font-black text-white mt-1 mb-4 max-w-sm">Dapatkan Set Glowing Eksklusif AkuGlow</h3>
              <a href="/shop" className="inline-flex items-center gap-1 text-sm font-bold text-white border-b-2 border-primary-light/50 hover:border-white transition-colors">
                Belanja Sekarang
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </a>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10">
               <i className="bx bxs-spa text-[12rem] text-white"></i>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-pink-600 min-h-[90px] flex items-center px-6 py-5">
              <div className="relative z-10">
                <span className="text-white/80 text-[10px] font-black uppercase tracking-widest">Bundling Hemat</span>
                <h3 className="text-lg font-black text-white">Anti-Aging Set</h3>
                <Link to="/shop" className="text-xs text-white/90 hover:text-white flex items-center gap-1 mt-1 font-bold">
                  Beli Sekarang
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </Link>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 min-h-[90px] flex items-center px-6 py-5">
              <div className="relative z-10">
                <span className="text-white/80 text-[10px] font-black uppercase tracking-widest">Travel Size</span>
                <h3 className="text-lg font-black text-white">Mini Glow Kit</h3>
                <Link to="/shop" className="text-xs text-white/90 hover:text-white flex items-center gap-1 mt-1 font-bold">
                  Beli Sekarang
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
