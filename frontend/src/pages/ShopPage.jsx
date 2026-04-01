import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { products, categories } from '../data/products';

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

// Extend products for shop page (add more dummy products)
const shopProducts = [
  ...products,
  {
    id: 9,
    name: 'Apple MacBook Air M2 13-inch 8GB 256GB',
    category: 'Laptop',
    price: 1180,
    oldPrice: 1350,
    rating: 5,
    reviews: 24,
    badge: 'Hot',
    badgeClass: 'hot',
    image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=300&h=300&fit=crop',
  },
  {
    id: 10,
    name: 'Sony WH-1000XM5 Wireless Noise Cancelling',
    category: 'Headphone',
    price: 248,
    oldPrice: 300,
    rating: 5,
    reviews: 18,
    badge: 'Sale',
    badgeClass: 'sale',
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=300&h=300&fit=crop',
  },
  {
    id: 11,
    name: 'iPhone 15 Pro Max 256GB Titanium',
    category: 'Smartphone',
    price: 1100,
    oldPrice: null,
    rating: 5,
    reviews: 32,
    badge: 'Trending',
    badgeClass: 'trending',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&h=300&fit=crop',
  },
  {
    id: 12,
    name: 'Samsung Galaxy Watch 6 Classic 47mm',
    category: 'Smart Watch',
    price: 280,
    oldPrice: 350,
    rating: 4.5,
    reviews: 11,
    badge: '-20%',
    badgeClass: 'offer',
    image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=300&h=300&fit=crop',
  },
];

const allCategories = ['Semua', ...new Set(shopProducts.map(p => p.category))];

export default function ShopPage() {
  const [searchParams] = useSearchParams();
  const catParam = searchParams.get('cat');

  const [activeCategory, setActiveCategory] = useState(catParam || 'Semua');
  const [sortBy, setSortBy] = useState('Default');
  const [priceRange, setPriceRange] = useState(0);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [liked, setLiked] = useState({});

  useEffect(() => {
    if (catParam) setActiveCategory(catParam);
  }, [catParam]);

  let filtered = shopProducts.filter(p => {
    if (activeCategory !== 'Semua' && p.category !== activeCategory) return false;
    const priceIDR = p.price * 16000;
    const range = priceRanges[priceRange];
    if (priceIDR < range.min || priceIDR > range.max) return false;
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
                      {cat === 'Semua' ? shopProducts.length : shopProducts.filter(p => p.category === cat).length}
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
                Menampilkan <strong className="text-gray-900">{filtered.length}</strong> dari <strong className="text-gray-900">{shopProducts.length}</strong> produk
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

            {/* Products Grid / List */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Produk Tidak Ditemukan</h3>
                <p className="text-gray-500 text-sm">Coba ubah filter atau kategori yang dipilih.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {filtered.map(product => (
                  <div key={product.id} className="group bg-white rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1">
                    <Link to={`/product/${product.id}`} className="block relative overflow-hidden bg-gray-50 aspect-square">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      {product.badge && (
                        <span className={`absolute top-3 left-3 ${badgeColors[product.badgeClass]} text-white text-xs font-bold px-2.5 py-1 rounded-full`}>{product.badge}</span>
                      )}
                      <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                        <button
                          onClick={e => { e.preventDefault(); setLiked(l => ({ ...l, [product.id]: !l[product.id] })); }}
                          className="w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-red-50"
                        >
                          <svg width="14" height="14" fill={liked[product.id] ? '#ef4444' : 'none'} stroke={liked[product.id] ? '#ef4444' : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                          </svg>
                        </button>
                        <button
                          onClick={e => e.preventDefault()}
                          className="w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-blue-50"
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                      </div>
                    </Link>
                    <div className="p-4">
                      <Link to={`/shop?cat=${product.category}`} className="text-xs text-blue-600 font-medium hover:underline mb-0.5 block">{product.category}</Link>
                      <Link to={`/product/${product.id}`} className="text-sm font-semibold text-gray-800 hover:text-blue-600 transition-colors leading-snug mb-2 block line-clamp-2">
                        {product.name}
                      </Link>
                      <div className="flex items-center gap-1.5 mb-3">
                        <StarRating rating={product.rating} />
                        <span className="text-xs text-gray-400">({product.reviews})</span>
                      </div>
                      <div className="flex items-end justify-between mt-auto">
                        <div className="flex flex-col">
                          {product.oldPrice && <div className="text-[11px] text-gray-400 line-through mb-0.5">Rp{(product.oldPrice * 16000).toLocaleString('id')}</div>}
                          <div className="font-bold text-gray-900 text-sm leading-none">Rp{(product.price * 16000).toLocaleString('id')}</div>
                        </div>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 ml-2 transition-colors">
                          + Beli
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
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
                        {product.oldPrice && <span className="text-sm text-gray-400 line-through">Rp{(product.oldPrice * 16000).toLocaleString('id')}</span>}
                        <span className="font-bold text-lg text-gray-900">Rp{(product.price * 16000).toLocaleString('id')}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 justify-center">
                      <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors">
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
