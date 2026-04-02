import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PUBLIC_API_BASE, fetchJson } from '../lib/api';

const badgeColors = { hot: 'bg-red-500', trending: 'bg-blue-500', offer: 'bg-green-500', sale: 'bg-orange-500' };

const tabs = ['New', 'Featured', 'Top Sellers'];

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

function ProductCard({ product }) {
  const [liked, setLiked] = useState(false);
  return (
    <div className="group bg-white rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1">
      <Link to={`/product/${product.id}`} className="block relative overflow-hidden bg-gray-50 aspect-square">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {product.badge && (
          <span className={`absolute top-3 left-3 ${badgeColors[product.badgeClass]} text-white text-xs font-bold px-2.5 py-1 rounded-full`}>{product.badge}</span>
        )}
        {/* Hover actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all duration-300">
          <button onClick={() => setLiked(!liked)} className="w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors">
            <svg width="14" height="14" fill={liked ? '#ef4444' : 'none'} stroke={liked ? '#ef4444' : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          </button>
          <button className="w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button className="w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          </button>
        </div>
      </Link>

      <div className="p-4">
        <Link to={`/shop?cat=${product.category}`} className="text-xs text-blue-600 font-medium hover:underline mb-1 block">{product.category}</Link>
        <Link to={`/product/${product.id}`} className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors leading-snug mb-2 block" style={{display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
          {product.name}
        </Link>
        <div className="flex items-center gap-1.5 mb-3">
          <StarRating rating={product.rating} />
          <span className="text-xs text-gray-400">({product.reviews} Ulasan)</span>
        </div>
        <div className="flex items-end justify-between mt-auto">
          <div className="flex flex-col">
            {product.oldPrice && <span className="text-[11px] text-gray-400 line-through mb-0.5">Rp{(product.oldPrice).toLocaleString('id')}</span>}
            <span className="font-bold text-gray-900 text-sm leading-none">Rp{(product.price || 0).toLocaleString('id')}</span>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ml-2">
            + Beli
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductSection() {
  const [activeTab, setActiveTab] = useState('New');
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson(`${PUBLIC_API_BASE}/products`)
      .then(d => {
        if (d && d.data) setTrending(d.data.slice(0, 10));
      })
      .catch(() => setTrending([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-14 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Produk Trending</h2>
            <div className="w-12 h-1 bg-blue-600 rounded-full mt-2" />
          </div>
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
        
        {loading ? (
             <div className="text-center py-20"><div className="spinner-border text-blue-600"></div></div>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {trending.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
        )}

        <div className="text-center mt-10">
          <Link to="/shop" className="inline-flex items-center gap-2 border-2 border-blue-600 text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
            Lihat Semua Produk
          </Link>
        </div>
      </div>
    </section>
  );
}
