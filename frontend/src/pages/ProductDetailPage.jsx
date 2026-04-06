import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PUBLIC_API_BASE, fetchJson, formatImage } from '../lib/api';

function StarRating({ rating, size = 16 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24" fill={s <= Math.floor(rating) ? '#facc15' : s - 0.5 <= rating ? '#facc15' : '#e5e7eb'}>
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
  { id: 3, name: 'Budi Santoso', rating: 5, date: '5 Mar 2024', comment: 'Mantap! Barang original, kondisi mulus. Penjual responsif dan ramah. Pasti order lagi!' },
];

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadProduct = async () => {
      try {
        const d = await fetchJson(`${PUBLIC_API_BASE}/product?id=${id}`);
        if (d && d.data) {
          if (cancelled) return;
          setProduct(d.data);

          const pd = await fetchJson(`${PUBLIC_API_BASE}/products`);
          if (cancelled) return;

          const filtered = (pd.data || []).filter(p => p.id !== d.data.id && p.category === d.data.category).slice(0, 4);
          setRelated(filtered);
          return;
        }

        if (!cancelled) {
          setProduct(null);
          setRelated([]);
        }
      } catch {
        if (!cancelled) {
          setProduct(null);
          setRelated([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState('Deskripsi');
  const activeImg = 0;
  const [addedToCart, setAddedToCart] = useState(false);

  if (loading) {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium animate-pulse">Memuat detail produk...</p>
        </div>
    );
  }

  if (!product) {
    return (
      <main className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
        <div className="text-7xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Produk Tidak Ditemukan</h1>
        <p className="text-gray-500 mb-6">Produk yang kamu cari tidak tersedia atau mungkin telah dihapus.</p>
        <Link to="/shop" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          Kembali ke Toko
        </Link>
      </main>
    );
  }

  const baseImg = formatImage(product.image);
  const images = [
    baseImg,
    baseImg.includes('unsplash') ? baseImg + "&auto=format&fit=crop&q=60" : baseImg
  ];

  const priceIDR = (product.price || 0).toLocaleString('id');
  const oldPriceIDR = product.old_price ? (product.old_price || 0).toLocaleString('id') : null;
  const discount = product.old_price ? Math.round((1 - product.price / product.old_price) * 100) : null;

  const handleAddToCart = () => {
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  return (
    <main className="bg-gray-50 min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-blue-600 transition-colors">Beranda</Link>
            <span>/</span>
            <Link to="/shop" className="hover:text-blue-600 transition-colors">Toko</Link>
            <span>/</span>
            <span className="text-gray-400">{product.category}</span>
            <span>/</span>
            <span className="text-gray-700 font-medium truncate max-w-xs">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="flex flex-col gap-4">
              <div className="relative rounded-2xl overflow-hidden bg-gray-50 aspect-square border border-gray-100">
                <img src={images[activeImg]} alt={product.name} className="w-full h-full object-contain p-4" />
                {product.badge && (
                  <span className={`absolute top-4 left-4 text-white text-sm font-bold px-3 py-1 rounded-full ${product.badge_class === 'hot' ? 'bg-red-500' : 'bg-blue-500'}`}>
                    {product.badge}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <div className="mb-6">
                <span className="text-blue-600 font-bold text-sm tracking-wider uppercase mb-2 block">{product.category}</span>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">{product.name}</h1>
                <div className="flex items-center gap-4">
                  <StarRating rating={product.rating || 0} />
                  <span className="text-sm text-gray-400">({product.reviews || 0} Ulasan Pelanggan)</span>
                </div>
              </div>

              <div className="flex items-baseline gap-4 mb-8">
                <span className="text-3xl font-black text-blue-700">Rp{priceIDR}</span>
                {oldPriceIDR && (
                  <>
                    <span className="text-xl text-gray-300 line-through">Rp{oldPriceIDR}</span>
                    <span className="bg-red-50 text-red-500 text-xs font-bold px-2 py-1 rounded-lg">-{discount}%</span>
                  </>
                )}
              </div>

              <p className="text-gray-500 leading-relaxed mb-6">
                {product.description || "Tidak ada deskripsi untuk produk ini."}
              </p>

              {/* Dynamic Attributes (Master Setup) */}
              {product.attributes && (
                <div className="space-y-4 mb-8 pt-6 border-t border-gray-100">
                  {(() => {
                    try {
                      const attrs = JSON.parse(product.attributes);
                      return Object.entries(attrs).map(([name, values]) => (
                        <div key={name}>
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 block">{name}</label>
                          <div className="flex flex-wrap gap-2">
                            {Array.isArray(values) && values.map(val => (
                              <button key={val} className="px-4 py-2 rounded-xl border-2 border-gray-100 text-sm font-bold text-gray-700 hover:border-blue-600 hover:text-blue-600 transition-all bg-white shadow-sm">
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      ));
                    } catch (e) {
                      console.error("Parse attributes error:", e);
                      return null;
                    }
                  })()}
                </div>
              )}

              <div className="flex items-center gap-4 mb-8 pt-6 border-t border-gray-100">
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden h-14">
                  <button onClick={() => qty > 1 && setQty(qty-1)} className="px-5 hover:bg-gray-50 transition-colors text-xl">-</button>
                  <span className="w-12 text-center font-bold text-gray-900 border-x border-gray-200 h-full flex items-center justify-center">{qty}</span>
                  <button onClick={() => setQty(qty+1)} className="px-5 hover:bg-gray-50 transition-colors text-xl">+</button>
                </div>
                <button onClick={handleAddToCart} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-black h-14 rounded-xl shadow-lg shadow-yellow-100 transition-all flex items-center justify-center gap-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                  {addedToCart ? 'Berhasil Masuk Keranjang!' : 'Tambah ke Keranjang'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-12">
           <div className="flex border-b border-gray-100 px-6">
             {tabs.map(tab => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`py-5 px-6 font-bold text-sm tracking-wide transition-all relative ${activeTab === tab ? 'text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
               >
                 {tab}
                 {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>}
               </button>
             ))}
           </div>
                     <div className="p-8 md:p-10 text-gray-500 leading-loose">
              {activeTab === 'Deskripsi' && (
                <div className="prose prose-blue max-w-none whitespace-pre-wrap">
                  {product.description || "Produk berkualitas tinggi dari SahabatMart. Jaminan original dan bergaransi resmi."}
                </div>
              )}
              {activeTab === 'Informasi Tambahan' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      ['Brand', product.brand || 'No Brand'],
                      ['Kategori', product.category || 'Lainnya'],
                      ['Stok', `${product.stock || 0} unit`],
                      ['Status', product.status === 'active' ? 'Tersedia' : 'Kosong'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">{k}</span>
                        <span className="text-gray-900 font-black">{v}</span>
                      </div>
                    ))}
                  </div>
                  {product.attributes && (
                    <div className="pt-6 border-t border-gray-100">
                      <h4 className="text-sm font-black text-gray-900 mb-4 tracking-wider">Spesifikasi Detail</h4>
                      <div className="space-y-3">
                        {(() => {
                          try {
                            const attrs = JSON.parse(product.attributes);
                            return Object.entries(attrs).map(([k, v]) => (
                              <div key={k} className="flex gap-4 text-sm py-1 border-b border-gray-50 last:border-0 pb-3">
                                <span className="w-32 text-gray-400 font-bold">{k}</span>
                                <span className="flex-1 text-gray-700 font-medium">{(Array.isArray(v) ? v : [v]).join(', ')}</span>
                              </div>
                            ));
                          } catch(e) { return null; }
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
             {activeTab === 'Ulasan' && (
               <div className="space-y-10">
                 {reviewsData.map(rev => (
                   <div key={rev.id} className="flex gap-6">
                     <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center font-black text-blue-600 shrink-0 text-xl shadow-inner border border-white">
                       {rev.name.charAt(0)}
                     </div>
                     <div className="flex-1">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                         <h4 className="font-bold text-gray-900 text-lg">{rev.name}</h4>
                         <span className="text-xs font-medium text-gray-400 bg-gray-50 py-1 px-3 rounded-full border border-gray-100">{rev.date}</span>
                       </div>
                       <div className="mb-4">
                        <StarRating rating={rev.rating} size={14} />
                       </div>
                       <p className="text-gray-500 leading-relaxed italic border-l-4 border-gray-100 pl-4">{rev.comment}</p>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
        </div>

        {related.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-gray-900">Produk Terkait</h2>
              <Link to="/shop" className="text-blue-600 font-bold hover:gap-3 transition-all flex items-center gap-2 group">
                Lihat Semua <span className="translate-x-0 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map(p => (
                <Link to={`/product/${p.id}`} key={p.id} className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-xl transition-all group shadow-sm flex flex-col">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 mb-4 border border-gray-100">
                        <img src={formatImage(p.image)} alt={p.name} className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform" />
                    </div>
                    <h3 className="font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors h-10">{p.name}</h3>
                    <div className="mt-auto">
                        <div className="flex items-center gap-2 mb-3">
                            <StarRating rating={p.rating || 0} size={10} />
                            <span className="text-[10px] text-gray-400">({p.reviews || 0})</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-black text-blue-700">Rp{(p.price || 0).toLocaleString('id')}</span>
                        </div>
                    </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
