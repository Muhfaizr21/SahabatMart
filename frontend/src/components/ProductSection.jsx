import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PUBLIC_API_BASE, BUYER_API_BASE, fetchJson, formatImage } from '../lib/api';
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

export function ProductCard({ product }) {
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [wishlisting, setWishlisting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Cek apakah item ini sudah ada di wishlist saat mount/login
  useEffect(() => {
    if (isAuthenticated() && product.id) {
       fetchJson(`${BUYER_API_BASE}/wishlist/check?product_id=${product.id}`)
         .then(d => setIsSaved(d.is_wishlisted))
         .catch(() => {});
    }
  }, [product.id]);

  const toggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated()) {
      alert('Silakan login untuk menyimpan produk favorit.');
      navigate('/login');
      return;
    }

    setWishlisting(true);
    try {
      if (isSaved) {
        await fetchJson(`${BUYER_API_BASE}/wishlist/remove?product_id=${product.id}`, { method: 'DELETE' });
        setIsSaved(false);
      } else {
        await fetchJson(`${BUYER_API_BASE}/wishlist/add`, {
          method: 'POST',
          body: JSON.stringify({ product_id: product.id })
        });
        setIsSaved(true);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setWishlisting(false);
    }
  };

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
          merchant_id: product.merchant_id || '00000000-0000-0000-0000-000000000000',
          quantity: 1
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
      alert(err.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="group bg-white rounded-3xl border border-gray-100 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden flex flex-col h-full relative">
      <Link to={`/product/${product.id}`} className="block relative overflow-hidden bg-gray-50 aspect-[4/5]">
        <img src={formatImage(product.image)} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        
        {/* Badge Stok Habis - Overlay */}
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg uppercase tracking-widest">Stok Habis</span>
          </div>
        )}

        <button 
          onClick={toggleWishlist}
          disabled={wishlisting}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center transition-all shadow-sm z-20 ${isSaved ? 'text-red-500 scale-110' : 'text-gray-400 hover:text-red-500 hover:scale-110'}`}
        >
          <i className={`bx ${wishlisting ? 'bx-loader-alt animate-spin' : (isSaved ? 'bxs-heart' : 'bx-heart')}`} style={{ fontSize: 18 }}></i>
        </button>
      </Link>

      <div className="p-3 sm:p-5 flex flex-col flex-1">
        <Link to={`/shop?cat=${product.category}`} className="text-[9px] sm:text-[10px] text-primary font-bold uppercase tracking-widest mb-1 block">{product.category}</Link>
        <Link to={`/product/${product.id}`} className="text-xs sm:text-base font-bold text-gray-900 hover:text-primary transition-colors leading-tight mb-2 block line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </Link>
        
        <div className="flex items-center gap-1 mb-3 sm:mb-4">
          <StarRating rating={product.rating || 0} />
          <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium">({product.reviews || 0})</span>
        </div>

        <div className="mt-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="font-black text-gray-900 text-sm sm:text-lg">Rp{(product.price || 0).toLocaleString('id-ID')}</span>
          </div>
          <button 
            onClick={addToCart}
            disabled={adding || product.stock <= 0}
            className={`text-[10px] sm:text-xs font-black px-4 py-2.5 rounded-xl sm:rounded-2xl transition-all flex-shrink-0 uppercase tracking-widest shadow-sm ${product.stock <= 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-primary text-white active:scale-95'}`}
          >
            {adding ? '...' : (product.stock <= 0 ? 'Habis' : 'BELI')}
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
    // Fetch top 3 products sorted by popular (sales)
    fetchJson(`${PUBLIC_API_BASE}/products?sort=popular&limit=3`)
      .then(d => {
        const data = Array.isArray(d) ? d : (d.data || []);
        setTrending(data);
      })
      .catch(() => setTrending([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-14 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-10 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900">Koleksi Terpopuler AkuGlow ✨</h2>
          <p className="text-gray-500 text-sm mt-1">Pilihan produk skincare terbaik yang paling dicintai oleh komunitas kami.</p>
        </div>
        
        {loading ? (
             <div className="text-center py-20"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
        ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                {trending.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
        )}
        
        <div className="mt-12 text-center">
          <Link to="/shop" className="inline-flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all">
            Lihat Semua Produk <i className='bx bx-right-arrow-alt'></i>
          </Link>
        </div>
      </div>
    </section>
  );
}
