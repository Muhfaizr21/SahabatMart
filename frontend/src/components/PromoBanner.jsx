export default function PromoBanner() {
  return (
    <section className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 to-blue-700 min-h-[200px] flex items-center p-8">
            <div className="relative z-10">
              <span className="text-blue-300 text-sm font-medium uppercase tracking-wider">Produk Baru</span>
              <h3 className="text-2xl font-bold text-white mt-1 mb-4 max-w-sm">Koleksi Smartphone Terbaik 2024</h3>
              <a href="#" className="inline-flex items-center gap-1 text-sm font-semibold text-white border-b border-blue-400 hover:border-white transition-colors">
                Belanja Sekarang
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </a>
            </div>
            <div className="absolute right-0 bottom-0 opacity-20">
              <div className="w-48 h-48 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
            </div>
            <img src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=200&fit=crop" alt="" className="absolute right-8 bottom-0 h-40 w-auto object-cover rounded-xl hidden md:block" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 min-h-[90px] flex items-center px-6 py-5">
              <div>
                <span className="text-orange-100 text-xs font-medium">Flash Sale</span>
                <h3 className="text-lg font-bold text-white">Gaming Console</h3>
                <a href="#" className="text-xs text-orange-100 hover:text-white flex items-center gap-1 mt-1">
                  Beli Sekarang
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </a>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 min-h-[90px] flex items-center px-6 py-5">
              <div>
                <span className="text-emerald-100 text-xs font-medium">Best Seller</span>
                <h3 className="text-lg font-bold text-white">Smart Watches</h3>
                <a href="#" className="text-xs text-emerald-100 hover:text-white flex items-center gap-1 mt-1">
                  Beli Sekarang
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
