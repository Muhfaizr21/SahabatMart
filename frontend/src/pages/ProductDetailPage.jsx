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

  useEffect(() => {
    let cancelled = false;
    const loadProduct = async () => {
      try {
        const d = await fetchJson(`${PUBLIC_API_BASE}/product?id=${id}`);
        if (d && d.data) {
          if (cancelled) return;
          setProduct(d.data);
          const pd = await fetchJson(`${PUBLIC_API_BASE}/products`);
          const filtered = (pd.data || []).filter(p => p.id !== d.data.id && p.category === d.data.category).slice(0, 4);
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
          product_variant_id: product.variants?.[0]?.id || product.id,
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

  if (loading) return <div className="min-h-[70vh] flex items-center justify-center">Memuat...</div>;
  if (!product) return <div className="min-h-[70vh] flex items-center justify-center">Produk tidak ditemukan.</div>;

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <div className="bg-gray-50 rounded-3xl overflow-hidden aspect-square border border-gray-100">
            <img src={formatImage(product.image)} alt={product.name} className="w-full h-full object-contain" />
          </div>

          <div className="flex flex-col">
            <nav className="flex gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest mb-4">
              <Link to="/">Beranda</Link> <span>/</span> <Link to="/shop">Toko</Link>
            </nav>
            
            <h1 className="text-4xl font-black text-gray-900 mb-4">{product.name}</h1>
            
            <div className="flex items-center gap-4 mb-6">
              <StarRating rating={product.rating || 0} />
              <span className="text-sm text-gray-400">({product.reviews || 0} Ulasan)</span>
            </div>

            <div className="text-3xl font-black text-blue-600 mb-6">
              Rp{(product.price || 0).toLocaleString('id-ID')}
            </div>

            <p className="text-gray-500 leading-relaxed mb-10 border-l-4 border-blue-50 pl-6 italic">
              {product.description || "Produk berkualitas tinggi khusus untuk pelanggan SahabatMart."}
            </p>

            <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
              <div className="flex items-center border border-gray-200 rounded-2xl h-14 overflow-hidden">
                <button onClick={() => qty > 1 && setQty(qty-1)} className="px-6 hover:bg-gray-50 transition-all font-bold text-lg">-</button>
                <span className="w-10 text-center font-black text-gray-900">{qty}</span>
                <button onClick={() => setQty(qty+1)} className="px-6 hover:bg-gray-50 transition-all font-bold text-lg">+</button>
              </div>
              
              <button 
                onClick={handleAddToCart}
                disabled={addedToCart}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-black h-14 rounded-2xl shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                {addedToCart ? 'Berhasil Ditambah!' : 'Tambah ke Keranjang'}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-10">
           <div className="flex gap-8 mb-8">
             {tabs.map(t => (
               <button key={t} onClick={() => setActiveTab(t)} className={`pb-2 text-sm font-bold transition-all relative ${activeTab === t ? 'text-blue-600' : 'text-gray-400'}`}>
                 {t}
                 {activeTab === t && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
               </button>
             ))}
           </div>
           
           <div className="text-gray-600 leading-relaxed max-w-3xl">
             {activeTab === 'Deskripsi' && (product.description || 'Tidak ada deskripsi.')}
             {activeTab === 'Informasi Tambahan' && (
               <div className="space-y-4">
                 <div className="flex justify-between border-b pb-2"><span className="font-bold text-gray-400">Brand</span> <span>{product.brand || '-'}</span></div>
                 <div className="flex justify-between border-b pb-2"><span className="font-bold text-gray-400">Kategori</span> <span>{product.category || '-'}</span></div>
                 <div className="flex justify-between border-b pb-2"><span className="font-bold text-gray-400">Stok</span> <span>{product.stock || 0} unit</span></div>
               </div>
             )}
             {activeTab === 'Ulasan' && (
               <div className="space-y-8">
                 {reviewsData.map(r => (
                   <div key={r.id} className="border-b border-gray-50 pb-6">
                     <div className="font-bold text-gray-900 mb-1">{r.name}</div>
                     <StarRating rating={r.rating} size={12} />
                     <p className="mt-3 text-sm italic">"{r.comment}"</p>
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
