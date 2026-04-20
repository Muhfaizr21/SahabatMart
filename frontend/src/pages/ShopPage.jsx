import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PUBLIC_API_BASE, BUYER_API_BASE, fetchJson, formatImage } from '../lib/api';

const badgeColors = { hot: 'bg-red-500', trending: 'bg-blue-500', offer: 'bg-green-500', sale: 'bg-orange-500' };

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} width="12" height="12" viewBox="0 0 24 24" fill={s <= Math.floor(rating) ? '#facc15' : '#e5e7eb'}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );
}

const sortOptions = ['Default', 'Harga Terendah', 'Harga Tertinggi', 'Rating Tertinggi', 'Terbaru'];
const priceRanges = [
  { label: 'Semua Harga', min: 0, max: Infinity },
  { label: 'Di bawah Rp500.000', min: 0, max: 500000 },
  { label: 'Rp500.000 - Rp1.000.000', min: 500000, max: 1000000 },
  { label: 'Rp1.000.000 - Rp3.000.000', min: 1000000, max: 3000000 },
  { label: 'Di atas Rp3.000.000', min: 3000000, max: Infinity },
];

export default function ShopPage() {
  const [searchParams] = useSearchParams();
  const catParam = searchParams.get('cat');
  const searchParam = searchParams.get('search');
  
  const [activeCategory, setActiveCategory] = useState(catParam || 'Semua');
  const [sortBy, setSortBy] = useState('Default');
  const [priceRange, setPriceRange] = useState(0);
  const [viewMode, setViewMode] = useState('grid');
  const [liked, setLiked] = useState({});
  const [allProducts, setAllProducts] = useState([]);
  const [allCategories, setAllCategories] = useState(['Semua']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveCategory(catParam || 'Semua');
  }, [catParam]);

  useEffect(() => {
    Promise.all([
      fetchJson(`${PUBLIC_API_BASE}/products`),
      fetchJson(`${PUBLIC_API_BASE}/categories`),
    ]).then(([p, c]) => {
      // fetchJson automatically unwraps {status: 'success', data: [...]}, so p and c are likely arrays
      const productListData = Array.isArray(p) ? p : (p.data || []);
      const categoryListData = Array.isArray(c) ? c : (c.data || []);
      
      setAllProducts(productListData);
      const cats = ['Semua', ...categoryListData.map(cat => cat.name)];
      setAllCategories(cats);
    }).catch(() => {
      setAllProducts([]);
      setAllCategories(['Semua']);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const fetchWishlist = async () => {
      const token = localStorage.getItem('token');
      if (!token) return; // Jangan panggil jika tidak login agar tidak diarahkan ke /login

      try {
        const d = await fetchJson(`${BUYER_API_BASE}/wishlist`);
        const products = Array.isArray(d) ? d : (d.data || d.products || []);
        const likedMap = {};
        products.forEach(p => { likedMap[p.id] = true; });
        setLiked(likedMap);
      } catch (err) {
        console.error('Wishlist Fetch Error:', err);
      }
    };
    fetchWishlist();
  }, []);

  const handleToggleWishlist = async (productId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Silakan login terlebih dahulu untuk menambah produk ke wishlist.');
      return;
    }

    try {
      const res = await fetchJson(`${BUYER_API_BASE}/wishlist/add`, {
        method: 'POST',
        body: JSON.stringify({ product_id: productId })
      });
      setLiked(prev => ({ ...prev, [productId]: res.saved }));
    } catch (err) {
      alert('Gagal mengelola wishlist: ' + err.message);
    }
  };

  const handleAddToCart = async (product) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Silakan login terlebih dahulu untuk berbelanja.');
      return;
    }

    try {
      // Find default variant or fallback
      const variantId = product.variants && product.variants.length > 0 ? product.variants[0].id : product.id;
      
      await fetchJson(`${BUYER_API_BASE}/cart/add`, {
        method: 'POST',
        body: JSON.stringify({
          product_id: product.id,
          product_variant_id: variantId,
          quantity: 1
        })
      });
      // Global sync for Navbar & others
      window.dispatchEvent(new Event('cartUpdate'));
      alert(`Berhasil menambahkan ${product.name} ke keranjang! 🛒`);
    } catch (err) {
      alert('Gagal menambah ke keranjang: ' + err.message);
    }
  };

  let filtered = allProducts.filter(p => {
    if (activeCategory !== 'Semua' && p.category !== activeCategory) return false;
    
    // Global Search Sync
    if (searchParam && !p.name.toLowerCase().includes(searchParam.toLowerCase())) return false;

    const price = p.price || 0;
    const range = priceRanges[priceRange];
    if (price < range.min || price > range.max) return false;
    return true;
  });

  if (sortBy === 'Harga Terendah') filtered = [...filtered].sort((a, b) => a.price - b.price);
  else if (sortBy === 'Harga Tertinggi') filtered = [...filtered].sort((a, b) => b.price - a.price);
  else if (sortBy === 'Rating Tertinggi') filtered = [...filtered].sort((a, b) => b.rating - a.rating);

  return (
    <main className="bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Toko SahabatMart</h1>
          <nav className="flex items-center gap-2 text-blue-200 text-sm mt-3">
            <Link to="/" className="hover:text-white">Beranda</Link>
            <span>/</span>
            <span className="text-white">Toko</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filter */}
          <aside className="lg:w-64 flex-shrink-0 space-y-6">
            {/* Category */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Kategori</h3>
              <div className="space-y-2">
                {allCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      activeCategory === cat
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                    <span className="float-right text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {cat === 'Semua' ? allProducts.length : allProducts.filter(p => p.category === cat).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Harga</h3>
              <div className="space-y-2">
                {priceRanges.map((range, i) => (
                  <label key={i} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="price"
                      checked={priceRange === i}
                      onChange={() => setPriceRange(i)}
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span className={`text-sm ${priceRange === i ? 'text-blue-700 font-semibold' : 'text-gray-600 group-hover:text-gray-900'}`}>
                      {range.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rating Filter */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Rating</h3>
              <div className="space-y-2">
                {[5,4,3,2,1].map(r => (
                  <label key={r} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="accent-blue-600 w-4 h-4" />
                    <div className="flex items-center gap-1.5">
                      <StarRating rating={r} />
                      <span className="text-xs text-gray-500">& ke atas</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Brands */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Brand</h3>
              <div className="space-y-2">
                {['Samsung', 'Apple', 'Sony', 'Xiaomi', 'Logitech'].map(brand => (
                  <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="accent-blue-600 w-4 h-4" />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900">{brand}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <span className="text-sm text-gray-500">
                Menampilkan <strong className="text-gray-900">{filtered.length}</strong> dari <strong className="text-gray-900">{allProducts.length}</strong> produk
              </span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Urutkan:</span>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white"
                  >
                    {sortOptions.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex gap-1 border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'hover:bg-gray-50 text-gray-500'}`}
                  >
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'hover:bg-gray-50 text-gray-500'}`}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center">
                    <div className="spinner-border text-blue-600"></div>
                    <p className="text-gray-500 mt-3">Memuat produk...</p>
                </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Produk Tidak Ditemukan</h3>
                <p className="text-gray-500 text-sm">Coba ubah filter atau kategori yang dipilih.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-6">
                {filtered.map(product => (
                  <div key={product.id} className="group bg-white rounded-xl sm:rounded-[24px] border border-gray-100 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500 overflow-hidden hover:-translate-y-2 flex flex-col">
                    {/* Image Container */}
                    <Link to={`/product/${product.id}`} className="block relative overflow-hidden bg-gray-50 aspect-square sm:aspect-[4/4.5]">
                      <img src={formatImage(product.image)} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      
                      {/* Badge Overlay - Hidden on small mobile to save space */}
                      {product.badge && (
                        <div className="absolute top-1 left-1 sm:top-4 sm:left-4 z-10 hidden sm:block">
                            <span className={`px-2 py-0.5 sm:px-4 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white shadow-lg ${badgeColors[product.badgeClass] || 'bg-blue-600'}`}>
                                {product.badge}
                            </span>
                        </div>
                      )}

                      {/* Floating Actions - Hidden on small mobile to avoid clutter */}
                      <div className="absolute top-4 right-4 hidden sm:flex flex-col gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500 z-10">
                        <button
                          onClick={e => { e.preventDefault(); handleToggleWishlist(product.id); }}
                          className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-full shadow-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all transform hover:scale-110"
                        >
                          <svg width="18" height="18" fill={liked[product.id] ? 'red' : 'none'} stroke={liked[product.id] ? 'red' : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                          </svg>
                        </button>
                      </div>
                    </Link>

                    {/* Content */}
                    <div className="p-2 sm:p-6 flex-1 flex flex-col">
                      <div className="flex items-center justify-between gap-1 sm:gap-4 mb-1 sm:mb-3">
                        <Link to={`/shop?cat=${product.category}`} className="text-[8px] sm:text-[11px] text-blue-600 font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] hover:text-blue-800 transition-colors bg-blue-50 px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg truncate max-w-[60%]">
                           {product.category}
                        </Link>
                        <div className="flex items-center gap-0.5 sm:gap-1.5 px-1 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg bg-yellow-50">
                          <svg width="10" height="10" className="sm:w-[14px] sm:h-[14px]" fill="#facc15" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                          <span className="text-[8px] sm:text-xs font-black text-yellow-700">{(product.rating || 4.5).toFixed(1)}</span>
                        </div>
                      </div>
                      
                      <Link to={`/product/${product.id}`} className="text-[10px] sm:text-[15px] font-bold text-gray-900 hover:text-blue-700 transition-colors leading-tight sm:leading-[1.3] mb-2 sm:mb-4 block line-clamp-2 sm:line-clamp-3 min-h-[2.4em] sm:min-h-[3.9em] group-hover:underline decoration-blue-600/30 underline-offset-4">
                        {product.name}
                      </Link>

                      {/* Merchant Row - Hidden on mobile to save vertical space */}
                      <div className="hidden sm:flex items-center gap-2 mb-6 p-2 rounded-xl bg-gray-50/50 border border-gray-100/50">
                        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-[10px] text-white font-black shadow-inner">
                             {product.store_name?.charAt(0) || "S"}
                        </div>
                        <span className="text-[11px] font-bold text-gray-500 truncate">{product.store_name || "SahabatMart Official"}</span>
                      </div>

                      {/* Footer */}
                      <div className="mt-auto flex items-center justify-between pt-1 sm:pt-4 border-t border-gray-50 sm:border-gray-100">
                        <div className="flex flex-col">
                           <span className="hidden sm:block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Mulai dari</span>
                           <div className="font-black text-blue-700 text-[10px] sm:text-lg">Rp{(product.price || 0).toLocaleString('id')}</div>
                        </div>
                        <button 
                          onClick={() => handleAddToCart(product)}
                          className="bg-gray-100 sm:bg-gray-900 hover:bg-blue-600 text-gray-600 sm:text-white w-6 h-6 sm:w-12 sm:h-12 rounded-md sm:rounded-2xl shadow-sm sm:shadow-lg flex items-center justify-center transition-all active:scale-90"
                        >
                           <span className="material-symbols-outlined text-[14px] sm:text-[20px] font-black">shopping_bag</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map(product => (
                  <div key={product.id} className="bg-white rounded-2xl border border-gray-100 hover:shadow-lg transition-all p-4 flex gap-5 group">
                    <Link to={`/product/${product.id}`} className="w-36 h-36 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50">
                      <img src={formatImage(product.image)} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </Link>
                    <div className="flex-1 flex flex-col gap-2">
                      <Link to={`/shop?cat=${product.category}`} className="text-xs text-blue-600 font-medium hover:underline">{product.category}</Link>
                      <Link to={`/product/${product.id}`} className="text-base font-bold text-gray-900 hover:text-blue-600 transition-colors leading-snug line-clamp-2">
                        {product.name}
                      </Link>
                      <div className="flex items-center gap-2">
                        <StarRating rating={product.rating} />
                        <span className="text-xs text-gray-400">({product.reviews} Ulasan)</span>
                      </div>
                      <div className="flex items-center gap-3 mt-auto">
                        {product.oldPrice && <span className="text-sm text-gray-400 line-through">Rp{(product.oldPrice).toLocaleString('id')}</span>}
                        <span className="font-bold text-lg text-gray-900">Rp{(product.price || 0).toLocaleString('id')}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 justify-center">
                      <button 
                        onClick={() => handleAddToCart(product)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
                      >
                        + Beli
                      </button>
                      <Link to={`/product/${product.id}`} className="border border-gray-200 hover:border-blue-400 text-gray-600 hover:text-blue-600 text-sm font-medium px-5 py-2 rounded-xl transition-colors text-center">
                        Detail
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-10">
              <button className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              {[1,2,3,4,5].map(n => (
                <button key={n} className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${n === 1 ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {n}
                </button>
              ))}
              <button className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
