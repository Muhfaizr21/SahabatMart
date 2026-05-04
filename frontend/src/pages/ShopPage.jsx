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
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [minRating, setMinRating] = useState(0);
  const [allProducts, setAllProducts] = useState([]);
  const [allCategories, setAllCategories] = useState(['Semua']);
  const [loading, setLoading] = useState(true);
  const isLoggedIn = !!localStorage.getItem('token');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  // Search State
  const [searchTerm, setSearchTerm] = useState(searchParam || '');

  useEffect(() => {
    setActiveCategory(catParam || 'Semua');
    setSearchTerm(searchParam || '');
  }, [catParam, searchParam]);

  useEffect(() => {
    Promise.all([
      fetchJson(`${PUBLIC_API_BASE}/products`),
      fetchJson(`${PUBLIC_API_BASE}/categories`),
    ]).then(([p, c]) => {
      // fetchJson automatically unwraps {status: 'success', data: [...]}, so p and c are likely arrays
      const productListData = Array.isArray(p) ? p : (p.data || []);
      const categoryListData = Array.isArray(c) ? c : (c.data || []);
      
      setAllProducts(productListData);
      const categoriesFromProducts = Array.from(new Set(productListData.map(p => p.category).filter(Boolean)));
      const uniqueCats = Array.from(new Set([...categoryListData.map(cat => cat.name), ...categoriesFromProducts])).sort();
      setAllCategories(['Semua', ...uniqueCats]);
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
          merchant_id: product.merchant_id || '00000000-0000-0000-0000-000000000000',
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
    
    // Global Search Sync (Live per word)
    if (searchTerm) {
      const words = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 0);
      const productName = p.name.toLowerCase();
      const isMatch = words.every(word => productName.includes(word));
      if (!isMatch) return false;
    }

    const price = p.price || 0;
    const range = priceRanges[priceRange];
    if (price < range.min || price > range.max) return false;

    // Rating Filter Sync
    if (minRating > 0 && (p.rating || 0) < minRating) return false;

    // Brand Filter Sync
    if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) return false;

    return true;
  });

  const allBrands = Array.from(new Set(allProducts.map(p => p.brand).filter(b => b && b.trim() !== ""))).sort();

  if (sortBy === 'Harga Terendah') filtered = [...filtered].sort((a, b) => a.price - b.price);
  else if (sortBy === 'Harga Tertinggi') filtered = [...filtered].sort((a, b) => b.price - a.price);
  else if (sortBy === 'Rating Tertinggi') filtered = [...filtered].sort((a, b) => b.rating - a.rating);

  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / productsPerPage);
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filtered.slice(indexOfFirstProduct, indexOfLastProduct);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, sortBy, priceRange, searchParam, selectedBrands, minRating]);

  const handleLocalSearch = (val) => {
    setSearchTerm(val);
    setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        if (val) newParams.set('search', val);
        else newParams.delete('search');
        return newParams;
    }, { replace: true });
  };

  return (
    <main className="bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="relative bg-[#0A0A0B] overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -mr-64 -mt-64 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full -ml-32 -mb-32"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <nav className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase tracking-[0.2em] mb-4">
              <Link to="/" className="hover:text-blue-300 transition-colors">Beranda</Link>
              <span className="text-gray-700">/</span>
              <span className="text-white">Katalog Produk</span>
            </nav>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
              Toko <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">AkuGlow</span>
            </h1>
            <p className="text-gray-400 text-sm md:text-base max-w-lg leading-relaxed font-medium">
              Temukan koleksi produk kecantikan premium terbaik yang dikurasi khusus untuk kesehatan dan kemilau kulit Anda.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filter */}
          <aside className="lg:w-64 flex-shrink-0 space-y-6">
            {/* Category */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <h3 className="font-black text-gray-900 mb-5 flex items-center gap-2">
                <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                Kategori
              </h3>
              <div className="space-y-1">
                {allCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`group w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all ${
                      activeCategory === cat
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className={activeCategory === cat ? 'font-bold' : 'font-medium'}>{cat}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${
                      activeCategory === cat ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                    }`}>
                      {cat === 'Semua' ? allProducts.length : allProducts.filter(p => p.category === cat).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <h3 className="font-black text-gray-900 mb-5 flex items-center gap-2">
                <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                Rentang Harga
              </h3>
              <div className="space-y-3">
                {priceRanges.map((range, i) => (
                  <label key={i} className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="radio"
                        name="price"
                        checked={priceRange === i}
                        onChange={() => setPriceRange(i)}
                        className="peer appearance-none w-5 h-5 border-2 border-gray-200 rounded-full checked:border-blue-600 transition-all"
                      />
                      <div className="absolute w-2.5 h-2.5 bg-blue-600 rounded-full scale-0 peer-checked:scale-100 transition-transform"></div>
                    </div>
                    <span className={`text-sm transition-colors ${priceRange === i ? 'text-blue-700 font-bold' : 'text-gray-500 font-medium group-hover:text-gray-900'}`}>
                      {range.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Category Filter (Sidebar Sync) */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Kategori</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {allCategories.map(cat => (
                  <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="radio" 
                        name="category_filter"
                        checked={activeCategory === cat}
                        onChange={() => setActiveCategory(cat)}
                        className="peer appearance-none w-5 h-5 border-2 border-gray-200 rounded-full checked:border-blue-600 transition-all"
                      />
                      <div className="absolute w-2.5 h-2.5 bg-blue-600 rounded-full scale-0 peer-checked:scale-100 transition-transform"></div>
                    </div>
                    <span className={`text-sm transition-colors ${activeCategory === cat ? 'text-blue-700 font-bold' : 'text-gray-600 group-hover:text-gray-900 font-medium'}`}>
                      {cat}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rating Filter */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Rating</h3>
              <div className="space-y-3">
                {[5,4,3,2,1].map(r => (
                  <label key={r} className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="radio" 
                        name="rating_filter"
                        checked={minRating === r}
                        onChange={() => setMinRating(prev => prev === r ? 0 : r)}
                        className="peer appearance-none w-5 h-5 border-2 border-gray-200 rounded-full checked:border-blue-600 transition-all"
                      />
                      <div className="absolute w-2.5 h-2.5 bg-blue-600 rounded-full scale-0 peer-checked:scale-100 transition-transform"></div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StarRating rating={r} />
                      <span className={`text-xs transition-colors ${minRating === r ? 'text-blue-700 font-bold' : 'text-gray-500 font-medium group-hover:text-gray-900'}`}>
                        {r === 5 ? 'Hanya Bintang 5' : `Bintang ${r} & ke atas`}
                      </span>
                    </div>
                  </label>
                ))}
                {minRating > 0 && (
                  <button 
                    onClick={() => setMinRating(0)}
                    className="text-[10px] text-red-500 font-bold hover:underline mt-2 ml-8"
                  >
                    Reset Rating
                  </button>
                )}
              </div>
            </div>

            {/* Brands */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Brand</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {allBrands.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Tidak ada brand tersedia</p>
                ) : (
                  allBrands.map(brand => (
                    <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="accent-blue-600 w-4 h-4 rounded" 
                        checked={selectedBrands.includes(brand)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedBrands(prev => [...prev, brand]);
                          else setSelectedBrands(prev => prev.filter(b => b !== brand));
                        }}
                      />
                      <span className={`text-sm transition-colors ${selectedBrands.includes(brand) ? 'text-blue-700 font-bold' : 'text-gray-600 group-hover:text-gray-900 font-medium'}`}>
                        {brand}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {selectedBrands.length > 0 && (
                <button 
                  onClick={() => setSelectedBrands([])}
                  className="text-[10px] text-red-500 font-bold hover:underline mt-4"
                >
                  Reset Brand
                </button>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 bg-white p-6 rounded-[32px] border border-gray-100/80 shadow-sm">
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow-md text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <span className="material-symbols-outlined font-black text-xl">grid_view</span>
                    </button>
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow-md text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <span className="material-symbols-outlined font-black text-xl">view_list</span>
                    </button>
                 </div>
                 
                 {/* Local Search Input */}
                 <div className="relative flex-1 min-w-[200px] lg:min-w-[300px]">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-xl font-black">search</span>
                    <input 
                      type="text"
                      placeholder="Cari di toko ini..."
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-blue-500 transition-all text-sm font-bold"
                      value={searchTerm}
                      onChange={(e) => handleLocalSearch(e.target.value)}
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => handleLocalSearch('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg font-black">close</span>
                      </button>
                    )}
                 </div>
              </div>

              <div className="flex items-center gap-4">
                 <p className="text-sm font-bold text-gray-400 hidden lg:block">Urutkan:</p>
                 <select 
                   value={sortBy}
                   onChange={(e) => setSortBy(e.target.value)}
                   className="bg-gray-50 border border-gray-100 text-gray-800 text-sm font-black px-6 py-3 rounded-2xl outline-none focus:border-blue-500 transition-all"
                 >
                   {sortOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                 </select>
              </div>
            </div>

            {/* Search Indicator */}
            {searchParam && (
              <div className="mb-8 flex items-center gap-3 animate-in fade-in slide-in-from-left duration-500">
                <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 flex items-center gap-3">
                  <span className="text-sm text-blue-600 font-bold">Hasil pencarian:</span>
                  <span className="text-sm text-blue-900 font-black italic">"{searchParam}"</span>
                  <button 
                    onClick={() => setSearchParams(prev => {
                      const newParams = new URLSearchParams(prev);
                      newParams.delete('search');
                      return newParams;
                    })}
                    className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                  >
                    <span className="material-symbols-outlined text-[14px] font-black">close</span>
                  </button>
                </div>
                <p className="text-sm text-gray-400 font-bold">Menampilkan {filtered.length} produk</p>
              </div>
            )}

            {loading ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center">
                    <div className="spinner-border text-blue-600"></div>
                    <p className="text-gray-500 mt-3">Memuat produk...</p>
                </div>
            ) : currentProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Produk Tidak Ditemukan</h3>
                <p className="text-gray-500 text-sm">Coba ubah filter atau kategori yang dipilih.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8">
                {currentProducts.map(product => (
                  <div key={product.id} className="group bg-white rounded-[32px] border border-gray-100/80 hover:shadow-[0_30px_60px_rgba(0,0,0,0.08)] transition-all duration-700 overflow-hidden hover:-translate-y-3 flex flex-col relative">
                    {/* Image Container */}
                    <Link to={`/product/${product.id}`} className="block relative overflow-hidden bg-gray-50 aspect-[1/1.1]">
                      <img src={formatImage(product.image)} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" />
                      
                      {/* Glass Badge Overlay */}
                      {product.badge && (
                        <div className="absolute top-4 left-4 z-10">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-xl backdrop-blur-md ${badgeColors[product.badgeClass] || 'bg-blue-600/90'}`}>
                                {product.badge}
                            </span>
                        </div>
                      )}

                      {/* Floating Wishlist - Only if Logged In */}
                      {isLoggedIn && (
                        <button
                          onClick={e => { e.preventDefault(); handleToggleWishlist(product.id); }}
                          className={`absolute top-4 right-4 z-10 w-10 h-10 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${liked[product.id] ? 'bg-red-500 text-white' : 'bg-white/80 backdrop-blur-md text-gray-400 hover:bg-white hover:text-red-500'}`}
                        >
                          <svg width="18" height="18" fill={liked[product.id] ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                          </svg>
                        </button>
                      )}
                    </Link>

                    {/* Content */}
                    <div className="p-5 sm:p-7 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-3">
                        <Link to={`/shop?cat=${product.category}`} className="text-[10px] text-blue-600 font-black uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-lg">
                           {product.category}
                        </Link>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-yellow-50">
                          <svg width="12" height="12" fill="#facc15" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                          <span className="text-[10px] font-black text-yellow-700">{(product.rating || 0).toFixed(1)}</span>
                          <span className="text-[9px] text-gray-400 font-bold">({product.reviews || 0})</span>
                        </div>
                      </div>
                      
                      <Link to={`/product/${product.id}`} className="text-[14px] sm:text-[16px] font-black text-gray-900 hover:text-blue-700 transition-colors leading-snug mb-4 block line-clamp-2 min-h-[2.8em]">
                        {product.name}
                      </Link>

                      {/* Store Info */}
                      <div className="flex items-center gap-2 mb-6 group/store">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[8px] text-blue-600 font-black">
                             {product.store_name?.charAt(0) || "A"}
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 group-hover/store:text-blue-600 transition-colors truncate">{product.store_name || "AkuGlow Official"}</span>
                      </div>

                      {/* Price & Buy Section */}
                      <div className="mt-auto pt-5 border-t border-gray-50">
                        <div className="flex items-center justify-between mb-3">
                           <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Mulai Dari</p>
                              <h4 className="font-black text-gray-900 text-base sm:text-xl">Rp{(product.price || 0).toLocaleString('id')}</h4>
                           </div>
                           {isLoggedIn && (
                             <button 
                               onClick={() => handleAddToCart(product)}
                               className="w-11 h-11 rounded-2xl bg-[#0A0A0B] hover:bg-blue-600 text-white shadow-lg shadow-gray-200 transition-all active:scale-90 flex items-center justify-center flex-shrink-0"
                             >
                               <span className="material-symbols-outlined font-black text-xl">shopping_cart</span>
                             </button>
                           )}
                        </div>
                        
                        {!isLoggedIn && (
                           <Link to="/login" className="block w-full py-2.5 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all text-center">
                             Login untuk beli
                           </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {currentProducts.map(product => (
                  <div key={product.id} className="bg-white rounded-[32px] border border-gray-100/80 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500 p-6 flex flex-col md:flex-row gap-8 group relative overflow-hidden">
                    <Link to={`/product/${product.id}`} className="w-full md:w-56 h-56 flex-shrink-0 rounded-3xl overflow-hidden bg-gray-50 relative">
                      <img src={formatImage(product.image)} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                      {product.badge && (
                        <div className="absolute top-3 left-3 z-10">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-md ${badgeColors[product.badgeClass] || 'bg-blue-600/90'}`}>
                            {product.badge}
                          </span>
                        </div>
                      )}
                    </Link>
                    
                    <div className="flex-1 flex flex-col py-2">
                      <div className="flex items-center gap-3 mb-3">
                        <Link to={`/shop?cat=${product.category}`} className="text-[10px] text-blue-600 font-black uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                          {product.category}
                        </Link>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-yellow-50">
                          <StarRating rating={product.rating || 0} />
                          <span className="text-[10px] font-black text-yellow-700">{(product.rating || 0).toFixed(1)}</span>
                          <span className="text-[10px] text-gray-400 font-bold">({product.reviews || 0} Ulasan)</span>
                        </div>
                      </div>

                      <Link to={`/product/${product.id}`} className="text-xl sm:text-2xl font-black text-gray-900 hover:text-blue-700 transition-colors leading-tight mb-4 line-clamp-2">
                        {product.name}
                      </Link>

                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 font-black">
                          {product.store_name?.charAt(0) || "A"}
                        </div>
                        <span className="text-xs font-bold text-gray-400">{product.store_name || "AkuGlow Official"}</span>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-50">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Mulai Dari</span>
                           <h4 className="font-black text-gray-900 text-2xl">Rp{(product.price || 0).toLocaleString('id')}</h4>
                        </div>
                        
                         {isLoggedIn ? (
                           <div className="flex items-center gap-3">
                             <button
                               onClick={() => handleToggleWishlist(product.id)}
                               className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${liked[product.id] ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500'}`}
                             >
                               <span className="material-symbols-outlined font-black">{liked[product.id] ? 'favorite' : 'favorite_border'}</span>
                             </button>
                             <button 
                               onClick={() => handleAddToCart(product)}
                               className="bg-[#0A0A0B] hover:bg-blue-600 text-white font-black px-8 py-3.5 rounded-2xl shadow-xl shadow-gray-200 transition-all flex items-center gap-3 active:scale-95"
                             >
                               <span className="material-symbols-outlined font-black text-xl">shopping_cart</span>
                               <span>Beli Sekarang</span>
                             </button>
                           </div>
                         ) : (
                           <Link to="/login" className="bg-blue-50 text-blue-600 px-6 py-3 rounded-2xl text-xs font-black hover:bg-blue-100 transition-all">
                             Login untuk Berbelanja
                           </Link>
                         )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-16">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`w-12 h-12 rounded-2xl border border-gray-200 flex items-center justify-center transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blue-600 hover:text-white hover:border-blue-600 text-gray-600'}`}
                >
                  <span className="material-symbols-outlined font-black">chevron_left</span>
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button 
                    key={n} 
                    onClick={() => setCurrentPage(n)}
                    className={`w-12 h-12 rounded-2xl text-sm font-black transition-all ${n === currentPage ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {n}
                  </button>
                ))}
                
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`w-12 h-12 rounded-2xl border border-gray-200 flex items-center justify-center transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blue-600 hover:text-white hover:border-blue-600 text-gray-600'}`}
                >
                  <span className="material-symbols-outlined font-black">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
