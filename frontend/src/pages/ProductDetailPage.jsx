import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PUBLIC_API_BASE, BUYER_API_BASE, fetchJson, formatImage } from '../lib/api';
import { isAuthenticated } from '../lib/auth';

function StarRating({ rating, size = 16 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24" fill={s <= Math.floor(rating || 0) ? '#facc15' : '#e5e7eb'}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );
}

const tabs = ['Deskripsi', 'Informasi Tambahan', 'Ulasan'];

const reviewsData = [
  { id: 1, name: 'Ahmad Fauzi', rating: 5, date: '15 Mar 2024', comment: 'Produk sangat bagus, sesuai deskripsi. Pengiriman cepat dan packaging aman. Sangat merekomendasikan seller ini!' },
  { id: 2, name: 'Siti Rahma', rating: 4, date: '10 Mar 2024', comment: 'Kualitas produk memuaskan, harga terjangkau. Hanya saja pengirimannya agak lama, tapi overall puas.' },
];

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState('Deskripsi');
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const loadProduct = async () => {
      try {
        const d = await fetchJson(`${PUBLIC_API_BASE}/products/detail?id=${id}`);
        if (d && d.data) {
          if (cancelled) return;
          setProduct(d.data);
          const pd = await fetchJson(`${PUBLIC_API_BASE}/products`);
          const filtered = (pd.data || []).filter(p => String(p.id) !== String(d.data.id) && p.category === d.data.category).slice(0, 4);
          setRelated(filtered);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadProduct();
    return () => { cancelled = true; };
  }, [id]);

  const handleAddToCart = async () => {
    if (!isAuthenticated()) {
      alert('Silakan login terlebih dahulu untuk menambah barang ke keranjang.');
      navigate('/login');
      return;
    }

    setAddedToCart(true);
    try {
      await fetchJson(`${BUYER_API_BASE}/cart/add`, {
        method: 'POST',
        body: JSON.stringify({
          product_id: product.id,
          product_variant_id: product.id, // Using product ID as default variant
          quantity: qty
        })
      });
      alert('Berhasil ditambahkan ke keranjang!');
      window.location.reload(); 
    } catch (err) {
      alert('Gagal: ' + err.message);
      setAddedToCart(false);
    }
  };

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const checkWish = async () => {
      if (!isAuthenticated() || !id) return;
      try {
        const d = await fetchJson(`${BUYER_API_BASE}/wishlist/check?product_id=${id}`);
        if (!cancelled) setIsWishlisted(d.is_wishlisted);
      } catch (e) { console.error('Wishlist check failed:', e); }
    };
    checkWish();
    return () => { cancelled = true; };
  }, [id]);

  const toggleWishlist = async () => {
    if (!isAuthenticated()) return navigate('/login');
    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        await fetchJson(`${BUYER_API_BASE}/wishlist/remove?product_id=${product.id}`, { method: 'DELETE' });
        setIsWishlisted(false);
      } else {
        await fetchJson(`${BUYER_API_BASE}/wishlist/add`, {
          method: 'POST',
          body: JSON.stringify({ product_id: product.id })
        });
        setIsWishlisted(true);
      }
    } catch(e) { 
      alert(e.message); 
    } finally {
      setWishlistLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-gray-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500 font-medium">Menyinkronkan data produk...</p>
    </div>
  );
  
  if (!product) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-white px-6">
        <div className="text-7xl mb-6">🏜️</div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Produk Tidak Ditemukan</h2>
        <p className="text-gray-500 text-center max-w-sm mb-8">Maaf, produk yang Anda cari mungkin sudah tidak tersedia atau telah dihapus oleh admin.</p>
        <Link to="/shop" className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">Kembali ke Toko</Link>
    </div>
  );

  return (
    <main className="bg-gray-50/30 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          
          {/* Visual Gallery Partition */}
          <div className="sticky top-24">
            <div className="bg-white rounded-[2.5rem] overflow-hidden aspect-square border-8 border-white shadow-2xl shadow-gray-200/50 group relative">
              <img 
                src={formatImage(selectedImage || product.image) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'} 
                alt={product.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
              />
              <div className="absolute top-6 left-6">
                <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">Premium Quality</span>
              </div>
            </div>

            {/* Gallery Thumbnails */}
            {(() => {
                try {
                   const gallery = JSON.parse(product.images || '[]');
                   const all = [product.image, ...gallery].filter(x => x);
                   if (all.length <= 1) return null;
                   return (
                      <div className="flex gap-4 mt-8 overflow-x-auto pb-4 scrollbar-hide">
                         {all.map((img, idx) => (
                            <button 
                               key={idx} 
                               onClick={() => setSelectedImage(img)}
                               className={`w-20 h-20 rounded-2xl overflow-hidden border-4 transition-all flex-shrink-0 ${ (selectedImage === img || (!selectedImage && idx === 0)) ? 'border-blue-600 scale-105 shadow-lg' : 'border-white hover:border-gray-200'}`}
                            >
                               <img src={formatImage(img)} className="w-full h-full object-cover" alt="" />
                            </button>
                         ))}
                      </div>
                   );
                } catch(e) { return null; }
            })()}
          </div>

          {/* Configuration & Detail Partition */}
          <div className="flex flex-col pt-4">
            <nav className="flex items-center gap-3 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-6">
              <Link to="/" className="hover:opacity-70 transition-opacity">Marketplace</Link> 
              <span className="text-gray-300">/</span> 
              <Link to="/shop" className="hover:opacity-70 transition-opacity">{product.category}</Link>
            </nav>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-[1.1] mb-6">{product.name}</h1>
            
            <div className="flex items-center gap-6 mb-8 bg-white/50 w-fit p-2 rounded-2xl border border-white">
              <div className="flex items-center gap-2">
                <StarRating rating={product.rating || 4.5} size={20} />
                <span className="text-sm font-black text-gray-900">{(product.rating || 4.5).toFixed(1)}</span>
              </div>
              <div className="w-px h-4 bg-gray-200"></div>
              <span className="text-sm font-bold text-gray-400">Sold {product.sold || '2.4k'}+</span>
            </div>

            <div className="flex items-baseline gap-4 mb-10">
              <div className="text-5xl font-black text-blue-600">
                Rp{(product.price || 0).toLocaleString('id-ID')}
              </div>
              {product.old_price > 0 && (
                <div className="text-xl text-gray-300 line-through font-bold">
                   Rp{product.old_price.toLocaleString('id-ID')}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/20 mb-10 overflow-hidden relative group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                        {product.store_name?.charAt(0) || "S"}
                    </div>
                    <div className="flex-1">
                        <div className="text-xs font-black text-gray-400 uppercase tracking-tighter mb-0.5">Sold & Shipped By</div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-black text-gray-900">{product.store_name || "SahabatMart Official"}</h4>
                            {product.store_verified && (
                                <svg width="14" height="14" fill="#3b82f6" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                            )}
                        </div>
                    </div>
                    <Link to={`/merchant/${product.store_slug}`} className="bg-gray-900 text-white text-[10px] font-black px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors uppercase">Visit Shop</Link>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-4">
              <div className="flex items-center bg-white border border-gray-100 rounded-[1.25rem] p-1.5 shadow-sm">
                <button 
                    onClick={() => qty > 1 && setQty(qty-1)} 
                    className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-gray-50 transition-all font-black text-xl text-gray-400 hover:text-gray-900"
                >
                    −
                </button>
                <span className="w-12 text-center font-black text-xl text-gray-900">{qty}</span>
                <button 
                    onClick={() => setQty(qty+1)} 
                    className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-gray-50 transition-all font-black text-xl text-gray-400 hover:text-gray-900"
                >
                    +
                </button>
              </div>
              
              <button 
                onClick={handleAddToCart}
                disabled={addedToCart}
                className="flex-1 bg-gray-900 hover:bg-blue-600 disabled:bg-gray-300 text-white font-black px-10 rounded-[1.25rem] shadow-2xl shadow-gray-200 transition-all flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-95"
              >
                <i className="bx bx-shopping-bag text-xl" />
                {addedToCart ? 'Product Added!' : 'Add to Bag'}
              </button>

              {/* Wishlist Toggle Button */}
              <button 
                onClick={toggleWishlist}
                disabled={wishlistLoading}
                className={`w-14 h-14 flex items-center justify-center rounded-[1.25rem] border transition-all ${isWishlisted ? 'bg-red-50 border-red-100 text-red-500 shadow-lg shadow-red-100' : 'bg-white border-gray-100 text-gray-400 hover:text-red-500 hover:bg-gray-50'}`}
              >
                 {wishlistLoading ? (
                   <i className="bx bx-loader-alt animate-spin text-xl" />
                 ) : (
                   <svg width="24" height="24" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                 )}
              </button>
            </div>
          </div>
        </div>

        {/* Informational Tabs Region */}
        <div className="mt-24 border-t border-gray-100 pt-16">
           <div className="flex gap-12 mb-12 border-b border-gray-100 overflow-x-auto scrollbar-hide">
             {tabs.map(t => (
               <button 
                key={t} 
                onClick={() => setActiveTab(t)} 
                className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === t ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
               >
                 {t}
                 {activeTab === t && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
               </button>
             ))}
           </div>
           
           <div className="max-w-4xl">
             {activeTab === 'Deskripsi' && (
                <div className="text-gray-500 leading-loose text-lg font-medium space-y-6">
                    {product.description || 'Tidak ada deskripsi detail untuk produk ini.'}
                </div>
             )}
             {activeTab === 'Informasi Tambahan' && (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {[
                    { l: 'Brand / Merek', v: product.brand },
                    { l: 'Kategori', v: product.category },
                    { l: 'SKU Identifier', v: `SM-${id.slice(0,5).toUpperCase()}` },
                    { l: 'Stok Gudang', v: `${product.stock || 0} Units Available` },
                    // Injeksi Atribut Dinamis dari Admin
                    ...(() => {
                        try {
                           const extra = JSON.parse(product.attributes || '{}');
                           return Object.entries(extra).map(([k, v]) => ({
                              l: k,
                              v: Array.isArray(v) ? v.join(", ") : v
                           }));
                        } catch(e) { return []; }
                    })()
                 ].map(item => (
                    <div key={item.l} className="flex flex-col p-6 rounded-[1.5rem] bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 group-hover:text-blue-600 transition-colors">{item.l}</span>
                        <div className="flex items-center gap-2">
                           {item.v ? (
                              <span className="font-bold text-gray-900 leading-tight">{item.v}</span>
                           ) : (
                              <span className="text-gray-300 italic text-sm">Not specified</span>
                           )}
                        </div>
                    </div>
                 ))}
               </div>
             )}
             {activeTab === 'Ulasan' && (
               <div className="space-y-8">
                 {reviewsData.map(r => (
                   <div key={r.id} className="bg-white p-8 rounded-3xl border border-gray-50 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center font-black text-blue-600">{r.name.charAt(0)}</div>
                            <div>
                                <div className="font-black text-gray-900">{r.name}</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase">{r.date}</div>
                            </div>
                        </div>
                        <StarRating rating={r.rating} size={14} />
                      </div>
                      <p className="text-gray-500 leading-relaxed italic">"{r.comment}"</p>
                   </div>
                 ))}
               </div>
             )}
           </div>
        </div>
      </div>
    </main>
  );
}
