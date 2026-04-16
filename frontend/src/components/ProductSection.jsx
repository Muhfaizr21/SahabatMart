import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PUBLIC_API_BASE, BUYER_API_BASE, fetchJson } from '../lib/api';
import { isAuthenticated } from '../lib/auth';

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} width="10" height="10" viewBox="0 0 24 24" fill={s <= Math.floor(rating || 0) ? '#facc15' : '#e5e7eb'}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );
}

function ProductCard({ product }) {
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  const addToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Logika Proteksi: Wajib Login
    if (!isAuthenticated()) {
      alert('Silakan login terlebih dahulu untuk menambah barang ke keranjang.');
      navigate('/login');
      return;
    }

    setAdding(true);
    try {
      await fetchJson(`${BUYER_API_BASE}/cart/add`, {
        method: 'POST',
        body: JSON.stringify({
          product_id: product.id,
          product_variant_id: product.variants?.[0]?.id || product.id,
          quantity: 1
        })
      });
      alert('Berhasil ditambah ke keranjang!');
      window.location.reload(); 
    } catch (err) {
      alert(err.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full">
      <Link to={`/product/${product.id}`} className="block relative overflow-hidden bg-gray-50 aspect-square">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <Link to={`/shop?cat=${product.category}`} className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-1 block">{product.category}</Link>
        <Link to={`/product/${product.id}`} className="text-sm font-semibold text-gray-800 hover:text-blue-600 transition-colors leading-tight mb-2 block line-clamp-2 h-10">
          {product.name}
        </Link>
        
        <div className="flex items-center gap-1.5 mb-4">
          <StarRating rating={product.rating} />
          <span className="text-[10px] text-gray-400">({product.reviews})</span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 text-sm">Rp{(product.price || 0).toLocaleString('id-ID')}</span>
          </div>
          <button 
            onClick={addToCart}
            disabled={adding}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-[11px] font-bold px-3 py-2 rounded-xl transition-all flex-shrink-0"
          >
            {adding ? '...' : '+ Keranjang'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductSection() {
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
        <div className="mb-10 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Produk Pilihan ✨</h2>
          <p className="text-gray-500 text-sm mt-1">Koleksi terbaik untuk kebutuhan harian Anda.</p>
        </div>
        
        {loading ? (
             <div className="text-center py-20"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {trending.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
        )}
      </div>
    </section>
  );
}
