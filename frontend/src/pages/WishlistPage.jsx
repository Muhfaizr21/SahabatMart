import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BUYER_API_BASE, fetchJson, formatImage } from '../lib/api';

export default function WishlistPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchJson(`${BUYER_API_BASE}/wishlist`);
      // Standardizing data access
      const products = Array.isArray(d) ? d : (d.data || d.products || []);
      setItems(products);
    } catch (err) {
      console.error('Wishlist Fetch Error:', err);
      setError(err.message || 'Gagal terhubung ke server');
      // Set items to null to trigger the "Server Sync Failed" UI segment
      setItems(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleRemove = async (id) => {
    if (!window.confirm('Hapus produk ini dari wishlist?')) return;
    try {
      await fetchJson(`${BUYER_API_BASE}/wishlist/remove?product_id=${id}`, { method: 'DELETE' });
      window.dispatchEvent(new Event('cartUpdate'));
      setItems(prev => prev.filter(x => x.id !== id));
    } catch (err) { alert(err.message); }
  };

  const moveToCart = async (p) => {
    setActing(p.id);
    try {
      // Find the first variant ID, or fallback to product ID if no variants preloaded
      const variantId = p.variants && p.variants.length > 0 ? p.variants[0].id : p.id;
      
      await fetchJson(`${BUYER_API_BASE}/cart/move-from-wishlist`, {
        method: 'POST',
        body: JSON.stringify({
          product_id: p.id,
          product_variant_id: variantId,
          quantity: 1
        })
      });
      window.dispatchEvent(new Event('cartUpdate'));
      
      // Update UI: Remove from list after successful move
      setItems(prev => prev.filter(x => x.id !== p.id));
      alert('Produk berhasil dipindahkan ke keranjang belanja! 🛒✨');
    } catch (err) { 
      alert(err.message || 'Gagal memindahkan produk'); 
    } finally { 
      setActing(null); 
    }
  };

  if (loading) return (
    <main className="min-h-screen bg-[#f6fafe] flex flex-col items-center justify-center p-6 text-center">
       <div className="relative mb-8">
          <div className="w-20 h-20 rounded-2xl bg-white shadow-xl animate-pulse flex items-center justify-center">
             <div className="w-12 h-12 rounded-xl bg-indigo-50 border-2 border-indigo-100 animate-spin"></div>
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-600 rounded-lg shadow-lg flex items-center justify-center text-white text-xs">
             <i className="bx bx-loader-alt animate-spin"></i>
          </div>
       </div>
       <h2 className="text-xl font-bold text-slate-900 mb-2">Sinkronisasi Data...</h2>
       <p className="text-slate-500 text-sm max-w-xs">Kami sedang menyiapkan daftar produk impian Anda dari server premium AkuGlow.</p>
    </main>
  );

  const hasItems = Array.isArray(items) && items.length > 0;
  const isSyncError = items === null || error;

  return (
    <main className="min-h-screen bg-[#f6fafe] py-12 md:py-20">
      <div className="max-w-6xl mx-auto px-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="fade-in">
            <div className="flex items-center gap-3 mb-3">
               <span className="px-3 py-1 bg-indigo-100 text-indigo-600 text-[10px] font-extrabold uppercase tracking-widest rounded-full">Koleksi Pribadi</span>
               {hasItems && <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">• {items.length} Item</span>}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">Wishlist <span className="text-indigo-600">Saya</span></h1>
            <p className="text-slate-500 mt-4 max-w-md font-medium">Tempat menyimpan semua produk impian yang ingin Anda beli di kemudian hari.</p>
          </div>
          
          <Link to="/shop" className="group flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-indigo-100 transition-all font-bold text-slate-700 text-sm">
             <i className="bx bx-shopping-bag text-indigo-600 text-xl group-hover:scale-110 transition-transform"></i>
             Lanjut Belanja
          </Link>
        </div>

        {/* Empty State or Error State */}
        {!hasItems ? (
           <div className="bg-white rounded-[2.5rem] p-16 md:p-24 text-center border-2 border-dashed border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] fade-in">
              <div className="relative inline-block mb-10">
                 <div className="text-8xl filter drop-shadow-2xl grayscale opacity-20">💖</div>
                 <div className="absolute inset-0 flex items-center justify-center text-6xl">💖</div>
              </div>
              
              <h2 className="text-2xl font-black text-slate-900 mb-3">
                {isSyncError ? 'Koneksi Terputus' : 'Belum ada wishlist'}
              </h2>
              <p className="text-slate-500 mb-10 max-w-md mx-auto leading-relaxed">
                {isSyncError 
                  ? 'Kami mengalami kesulitan saat mengambil data dari server. Pastikan koneksi internet Anda stabil.' 
                  : 'Cari produk impianmu dan simpan di sini untuk dibeli nanti agar tidak terlewatkan.'}
              </p>
              
              {isSyncError && (
                 <div className="mb-8 p-4 bg-red-50 rounded-2xl border border-red-100 inline-flex items-center gap-3 text-red-600 animate-bounce">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                    <span className="text-xs font-black uppercase tracking-tighter">⚠️ Sinkronisasi Server Gagal</span>
                 </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {isSyncError ? (
                  <button onClick={loadItems} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold shadow-2xl hover:bg-indigo-600 transition-all active:scale-95">
                    Coba Sinkron Ulang
                  </button>
                ) : (
                  <Link to="/shop" className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95">
                    Mulai Eksplorasi Produk
                  </Link>
                )}
                <Link to="/" className="text-slate-400 font-bold hover:text-indigo-600 py-4 px-6 transition-colors">Kembali ke Beranda</Link>
              </div>
           </div>
        ) : (
          /* Products Grid (Premium Design) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 fade-in">
            {items.map((item) => (
              <div key={item.id} className="group bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 transition-all duration-500">
                <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-50 border border-slate-50 mb-6">
                  <img src={formatImage(item.image)} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  
                  {/* Action Badges */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                     <button onClick={() => handleRemove(item.id)} className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center text-red-500 shadow-lg hover:bg-red-500 hover:text-white transition-colors">
                        <i className="bx bx-trash text-xl"></i>
                     </button>
                  </div>

                  <div className="absolute bottom-4 left-4">
                     <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg ${item.stock > 0 ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                        {item.stock > 0 ? 'Available' : 'Sold Out'}
                     </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <Link to={`/product/${item.id}`} className="block">
                      <h3 className="font-extrabold text-slate-800 text-lg leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight line-clamp-1">
                        {item.name}
                      </h3>
                    </Link>
                    <div className="flex items-center justify-between">
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        ID: #{item.id?.slice(-6).toUpperCase() || 'N/A'}
                      </p>
                      <p className="text-indigo-600 font-black text-xl tracking-tight">
                        Rp{(item.price || 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={() => moveToCart(item)}
                      disabled={acting === item.id || item.stock <= 0}
                      className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${item.stock > 0 ? 'bg-slate-900 text-white hover:bg-indigo-600 shadow-xl shadow-slate-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    >
                      {acting === item.id ? (
                        <i className="bx bx-loader-alt animate-spin text-lg"></i>
                      ) : (
                        <><i className="bx bx-cart-add text-lg"></i> Pindahkan Ke Keranjang</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Decorative Footer info */}
        {hasItems && (
           <div className="mt-20 text-center border-t border-slate-100 pt-10">
              <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mb-4">Butuh bantuan mencari sesuatu yang lain?</p>
              <Link to="/shop" className="text-indigo-600 font-black flex items-center justify-center gap-2 hover:gap-4 transition-all">
                Pencarian Produk Baru <i className="bx bx-right-arrow-alt text-2xl"></i>
              </Link>
           </div>
        )}
      </div>
    </main>
  );
}

