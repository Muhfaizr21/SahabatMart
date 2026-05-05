import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PUBLIC_API_BASE, BUYER_API_BASE, fetchJson, formatImage } from '../lib/api';
import { isAuthenticated } from '../lib/auth';
import { ShoppingBag } from 'lucide-react';
import ReviewSection from '../components/ReviewSection';
import RecommendedSection from '../components/RecommendedSection';

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
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({}); // Track user selections
  const [merchantPage, setMerchantPage] = useState(1);

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // ── AFFILIATE TRACKING SYNC ───────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && id) {
      fetchJson(`${PUBLIC_API_BASE}/affiliate/track?ref=${ref}&product_id=${id}`)
        .then(res => {
          if (res && res.affiliate_id) {
            localStorage.setItem('affiliate_id', res.affiliate_id);
            console.log('Affiliate tracked:', res.affiliate_id);
          }
        })
        .catch(err => console.error('Tracking failed:', err));
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const loadProduct = async () => {
      try {
        const d = await fetchJson(`${PUBLIC_API_BASE}/products/detail?id=${id}`);
        // Because fetchJson in lib/api.js already unwraps the "data" layer:
        // d is now { product: {...}, sellers: [...] }
        const productData = d?.product || d;
        const sellersData = d?.sellers || [];
        
        if (productData && productData.id) {
          if (cancelled) return;
          setProduct(productData);
          // [Akuglow Update] Sort merchants: Prefer local merchant
          let sortedSellers = sellersData;
          if (sellersData.length > 0) {
            const currentUser = isAuthenticated() ? JSON.parse(localStorage.getItem('user')) : null;
            
            sortedSellers = [...sellersData].sort((a, b) => {
              // 1. Prioritas Pusat (AkuGlow Asli/Gudang Pusat)
              const isAPusat = a.merchant_id === '00000000-0000-0000-0000-000000000000' || (a.city && a.city.toLowerCase() === 'pusat') || a.store_name?.toLowerCase().includes('pusat');
              const isBPusat = b.merchant_id === '00000000-0000-0000-0000-000000000000' || (b.city && b.city.toLowerCase() === 'pusat') || b.store_name?.toLowerCase().includes('pusat');
              if (isAPusat && !isBPusat) return -1;
              if (!isAPusat && isBPusat) return 1;

              // 2. Prioritas Terdekat (City Match)
              const isANear = currentUser?.profile?.city && a.city && a.city.toLowerCase() === currentUser.profile.city.toLowerCase();
              const isBNear = currentUser?.profile?.city && b.city && b.city.toLowerCase() === currentUser.profile.city.toLowerCase();
              if (isANear && !isBNear) return -1;
              if (!isANear && isBNear) return 1;
              
              return 0;
            });

            setSelectedMerchant(sortedSellers[0]);
          }
          setSellers(sortedSellers);
          
          // Initial Attribute Selection (Default to first value of each)
          try {
             const attrs = JSON.parse(productData.attributes || '{}');
             const initial = {};
             Object.entries(attrs).forEach(([k, v]) => {
                if (Array.isArray(v) && v.length > 0) initial[k] = v[0];
             });
             setSelectedAttributes(initial);
          } catch(e){}

          if (productData.variants && productData.variants.length > 0) {
            setSelectedVariant(productData.variants[0]);
          }
          const pd = await fetchJson(`${PUBLIC_API_BASE}/products`);
          const productList = Array.isArray(pd) ? pd : (pd.data || []);
          const filtered = productList.filter(p => String(p.id) !== String(productData.id) && p.category === productData.category).slice(0, 4);
          setRelated(filtered);

          // [Akuglow AI Recommendation] Track Interaction
          fetchJson(`${PUBLIC_API_BASE}/products/track`, {
            method: 'POST',
            body: JSON.stringify({ product_id: productData.id, type: 'view' })
          }).catch(e => console.error('Tracking failed:', e));
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

    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      alert('Silakan pilih varian produk terlebih dahulu.');
      return;
    }

    if (!selectedMerchant) {
      alert('Silakan pilih merchant/pengiriman terlebih dahulu.');
      return;
    }

    setAddedToCart(true);
    try {
      await fetchJson(`${BUYER_API_BASE}/cart/add`, {
        method: 'POST',
        body: JSON.stringify({
          product_id: product.id,
          product_variant_id: selectedVariant ? selectedVariant.id : product.id,
          merchant_id: selectedMerchant.merchant_id, // [Akuglow Update] Send selected merchant
          quantity: qty,
          metadata: JSON.stringify(selectedAttributes) // Send selected attributes as metadata
        })
      });
      window.dispatchEvent(new Event('cartUpdate'));
      window.dispatchEvent(new Event('openCart'));

      // [Akuglow AI Recommendation] Track Interaction
      fetchJson(`${PUBLIC_API_BASE}/products/track`, {
        method: 'POST',
        body: JSON.stringify({ product_id: product.id, type: 'click' })
      }).catch(() => {});
    } catch (err) {
      alert('Gagal menambah ke keranjang: ' + err.message);
      setAddedToCart(false);
    }
  };

  const [copying, setCopying] = useState(false);
  const user = isAuthenticated() ? JSON.parse(localStorage.getItem('user')) : null;
  // [Akuglow Update] Both Affiliates AND Merchants can share affiliate links
  const isAffiliateMode = user && (user.role === 'affiliate' || user.role === 'merchant');
  
  // Use ref_code from user profile OR fallback to affiliate tracking data
  const refCode = user?.affiliate_ref_code || user?.ref_code || null;

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
    <>
    <main className="bg-gray-50/30 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:py-12 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
          
          {/* Visual Gallery Partition */}
          <div className="lg:col-span-6 xl:col-span-7 lg:sticky lg:top-24">
            <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden aspect-square sm:aspect-[4/5] lg:aspect-square border-4 sm:border-8 border-white shadow-2xl shadow-gray-200/50 group relative">
              <img 
                src={formatImage(selectedImage || product.image)} 
                alt={product.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
              />
              <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
                <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg">Premium Quality</span>
              </div>
            </div>

            {/* Gallery Thumbnails */}
            {(() => {
                try {
                   const gallery = JSON.parse(product.images || '[]');
                   const all = [product.image, ...gallery].filter(x => x);
                   if (all.length <= 1) return null;
                   return (
                      <div className="flex gap-3 sm:gap-4 mt-6 sm:mt-8 overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
                         {all.map((img, idx) => (
                            <button 
                               key={idx} 
                               onClick={() => setSelectedImage(img)}
                               className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden border-2 sm:border-4 transition-all flex-shrink-0 ${ (selectedImage === img || (!selectedImage && idx === 0)) ? 'border-blue-600 scale-105 shadow-lg' : 'border-white hover:border-gray-200'}`}
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
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col pt-4 sm:pt-0">
            <nav className="flex items-center gap-2 sm:gap-3 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 sm:mb-6">
              <Link to="/" className="hover:opacity-70 transition-opacity">Marketplace</Link> 
              <span className="text-gray-300">/</span> 
              <Link to="/shop" className="hover:opacity-70 transition-opacity">{product.category}</Link>
            </nav>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-4 sm:mb-6">{product.name}</h1>
            
            <div className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-8 bg-white/50 w-fit p-2 rounded-2xl border border-white backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <StarRating rating={product.rating || 0} size={18} />
                <span className="text-xs sm:text-sm font-black text-gray-900">{(product.rating || 0).toFixed(1)}</span>
                <span className="text-[10px] text-gray-400 font-bold">({product.reviews || 0} Ulasan)</span>
              </div>
              <div className="w-px h-4 bg-gray-200"></div>
              <span className="text-xs sm:text-sm font-bold text-gray-400">Sold {(product.sold || 0).toLocaleString('id-ID')}+</span>
            </div>

            <div className="flex items-baseline gap-4 mb-2">
              <div className="text-4xl sm:text-5xl font-black text-blue-600">
                Rp{(user?.role === 'mitra' && product.wholesale_price > 0 
                  ? product.wholesale_price 
                  : (selectedVariant ? selectedVariant.price : product.price || 0)).toLocaleString('id-ID')}
              </div>
              {product.old_price > 0 && (
                <div className="text-lg sm:text-xl text-gray-300 line-through font-bold">
                   Rp{product.old_price.toLocaleString('id-ID')}
                </div>
              )}
            </div>
            
            <div className="text-sm font-bold text-gray-400 mb-10 flex items-center gap-2">
               <i className="bx bx-package"></i> Stock: {selectedMerchant ? selectedMerchant.stock : (selectedVariant ? selectedVariant.stock : product.stock)} pcs
            </div>

            {/* GLOBAL ATTRIBUTES SELECTOR (Dynamic from Super Admin) */}
            {(() => {
                try {
                  const attrs = JSON.parse(product.attributes || '{}');
                  if (Object.keys(attrs).length === 0) return null;
                  return (
                    <div className="mb-8 flex flex-col gap-6">
                      {Object.entries(attrs).map(([key, vals]) => (
                        <div key={key}>
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{key}</h4>
                          <div className="flex flex-wrap gap-2">
                            {vals.map(v => (
                              <button 
                                key={v}
                                onClick={() => setSelectedAttributes(prev => ({ ...prev, [key]: v }))}
                                className={`px-4 py-2 rounded-xl border-2 text-xs font-black transition-all ${
                                  selectedAttributes[key] === v 
                                    ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-md' 
                                    : 'border-gray-100 bg-white text-gray-400 hover:border-gray-300'
                                }`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                } catch(e) { return null; }
            })()}

            {/* Variants Selector */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-10">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Pilih Varian</h4>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-5 py-3 rounded-xl border-2 transition-all text-sm font-black ${
                        selectedVariant?.id === v.id
                          ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-lg shadow-blue-100'
                          : 'border-gray-100 bg-white text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* [Akuglow] Merchant Source Selector */}
            {sellers.length > 0 ? (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                   <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Pilih Pengiriman (Merchant)</h4>
                   {user?.profile?.city && (
                     <div className="flex items-center gap-1 bg-blue-100 text-blue-600 px-2 py-1 rounded-lg">
                        <span className="material-symbols-outlined text-[12px]">location_on</span>
                        <span className="text-[10px] font-black uppercase">{user.profile.city}</span>
                     </div>
                   )}
                </div>
                <div className="flex flex-col gap-3">
                  {sellers.slice((merchantPage - 1) * 3, merchantPage * 3).map((s) => {
                    const isNear = user?.profile?.city && s.city && s.city.toLowerCase() === user.profile.city.toLowerCase();
                    const isPusat = s.merchant_id === '00000000-0000-0000-0000-000000000000' || (s.city && s.city.toLowerCase() === 'pusat') || s.store_name?.toLowerCase().includes('pusat');
                    
                    return (
                      <button
                        key={s.merchant_id}
                        onClick={() => setSelectedMerchant(s)}
                        className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between group relative overflow-hidden ${
                          selectedMerchant?.merchant_id === s.merchant_id
                            ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-md'
                            : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                        }`}
                      >
                        {isPusat ? (
                          <div className="absolute top-0 right-0">
                             <div className="bg-gradient-to-l from-blue-600 to-blue-400 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl shadow-sm uppercase tracking-tighter">Official Pusat</div>
                          </div>
                        ) : isNear ? (
                          <div className="absolute top-0 right-0">
                             <div className="bg-gradient-to-l from-orange-500 to-amber-400 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl shadow-sm uppercase tracking-tighter">Terdekat</div>
                          </div>
                        ) : null}
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white transition-colors ${selectedMerchant?.merchant_id === s.merchant_id ? 'bg-blue-600' : 'bg-gray-300'}`}>
                            {s.store_name.charAt(0)}
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                                <p className="font-black text-sm">{s.store_name}</p>
                                {isNear && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>}
                            </div>
                            <p className="text-[10px] uppercase tracking-tighter opacity-70 font-bold">{s.city || 'Pusat'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Stok</p>
                          <p className="font-black text-xs">{s.stock} Unit</p>
                        </div>
                      </button>
                    );
                  })}

                  {/* Pagination Controls */}
                  {sellers.length > 3 && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <button 
                        onClick={() => setMerchantPage(prev => Math.max(prev - 1, 1))}
                        disabled={merchantPage === 1}
                        className="text-xs font-bold text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-gray-400 flex items-center gap-1 px-2 py-1"
                      >
                        <i className="bx bx-chevron-left text-lg"></i> Prev
                      </button>
                      <span className="text-xs font-bold text-gray-400">
                        {merchantPage} / {Math.ceil(sellers.length / 3)}
                      </span>
                      <button 
                        onClick={() => setMerchantPage(prev => Math.min(prev + 1, Math.ceil(sellers.length / 3)))}
                        disabled={merchantPage === Math.ceil(sellers.length / 3)}
                        className="text-xs font-bold text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-gray-400 flex items-center gap-1 px-2 py-1"
                      >
                        Next <i className="bx bx-chevron-right text-lg"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
                <div className="mb-10 p-6 rounded-3xl bg-red-50 border border-red-100 flex items-center gap-4">
                    <div className="text-2xl text-red-500">📵</div>
                    <div>
                        <h4 className="font-black text-red-600 text-sm">Stok Tidak Tersedia</h4>
                        <p className="text-xs text-red-400">Maaf, produk ini sedang kosong di semua gudang merchant.</p>
                    </div>
                </div>
            )}

            {selectedMerchant && (
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/20 mb-10 overflow-hidden relative group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                            {selectedMerchant.store_name.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-black text-gray-400 uppercase tracking-tighter mb-0.5">Sold & Shipped By</div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-black text-gray-900">{selectedMerchant.store_name}</h4>
                                <span className="bg-green-100 text-green-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Ready Stock</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-6 sm:mt-10">
              <div className="flex items-center justify-between bg-white/50 backdrop-blur-sm border border-white rounded-[1.25rem] p-1.5 shadow-sm sm:w-fit">
                <button 
                  onClick={() => qty > 1 && setQty(qty-1)} 
                  className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl hover:bg-white transition-all font-black text-xl text-gray-400 hover:text-gray-900"
                >-</button>
                <span className="px-4 text-center font-black text-lg sm:text-xl text-gray-900">{qty}</span>
                <button 
                  onClick={() => setQty(qty+1)} 
                  className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl hover:bg-white transition-all font-black text-xl text-gray-400 hover:text-gray-900"
                >+</button>
              </div>
              
              <div className="flex gap-3 flex-1">
                <button 
                  onClick={handleAddToCart}
                  disabled={addedToCart}
                  className="flex-1 h-14 sm:h-16 bg-gray-900 hover:bg-blue-600 disabled:bg-gray-300 text-white font-black px-6 sm:px-10 rounded-[1.25rem] shadow-2xl shadow-gray-200/50 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <ShoppingBag size={20} />
                  <span className="text-sm sm:text-base uppercase tracking-widest">{addedToCart ? 'Redirecting...' : 'Beli Sekarang'}</span>
                </button>

                <button 
                  onClick={toggleWishlist}
                  disabled={wishlistLoading}
                  className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-[1.25rem] border-2 transition-all flex-shrink-0 ${isWishlisted ? 'bg-red-50 border-red-100 text-red-500 shadow-lg shadow-red-100' : 'bg-white border-white text-gray-400 hover:text-red-500 hover:bg-gray-50'}`}
                >
                   {wishlistLoading ? (
                     <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                   ) : (
                     <svg width="24" height="24" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                   )}
                </button>
              </div>
            </div>

            {/* Affiliate Share Section - Premium Magic UI */}
            {isAffiliateMode && refCode && (
              <div className="mt-8 p-6 rounded-[2rem] bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Affiliate Partner Program</span>
                  </div>
                  <h4 className="font-black text-gray-900 mb-1">Dapatkan Komisi dari Produk Ini!</h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">Bagikan link khusus Anda dan dapatkan komisi hingga {(product.commission_rate * 100) || 5}% untuk setiap pembelian.</p>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const url = `${window.location.origin}${window.location.pathname}?ref=${refCode}`;
                        navigator.clipboard.writeText(url);
                        setCopying(true);
                        setTimeout(() => setCopying(false), 2000);
                      }}
                      className="flex-1 bg-white border border-indigo-200 text-indigo-600 font-black text-xs py-3 px-4 rounded-xl shadow-sm hover:shadow-md hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      {copying ? (
                        <><i className="bx bx-check text-lg" /> Berhasil Disalin!</>
                      ) : (
                        <><i className="bx bx-copy-alt text-lg" /> Salin Link Affiliate</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                <div className="text-slate-600 leading-relaxed text-base sm:text-lg whitespace-pre-wrap">
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
              {activeTab === "Ulasan" && <ReviewSection productID={product.id} />}
           </div>
        </div>
      </div>
      
      <RecommendedSection 
        limit={5} 
        title="Mungkin Kamu Juga Suka 💖" 
        subtitle="Produk lain yang sesuai dengan selera kamu." 
        className="mt-20 border-t border-gray-100/50"
      />
    </main>
  </>
  );
}
