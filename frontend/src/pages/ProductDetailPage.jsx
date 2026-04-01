import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { products } from '../data/products';

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

const reviews = [
  { id: 1, name: 'Ahmad Fauzi', rating: 5, date: '15 Mar 2024', comment: 'Produk sangat bagus, sesuai deskripsi. Pengiriman cepat dan packaging aman. Sangat merekomendasikan seller ini!' },
  { id: 2, name: 'Siti Rahma', rating: 4, date: '10 Mar 2024', comment: 'Kualitas produk memuaskan, harga terjangkau. Hanya saja pengirimannya agak lama, tapi overall puas.' },
  { id: 3, name: 'Budi Santoso', rating: 5, date: '5 Mar 2024', comment: 'Mantap! Barang original, kondisi mulus. Penjual responsif dan ramah. Pasti order lagi!' },
];

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = products.find(p => p.id === parseInt(id));
  
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState('Deskripsi');
  const [activeImg, setActiveImg] = useState(0);
  const [liked, setLiked] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  if (!product) {
    return (
      <main className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
        <div className="text-7xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Produk Tidak Ditemukan</h1>
        <p className="text-gray-500 mb-6">Produk yang kamu cari tidak tersedia.</p>
        <Link to="/shop" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          Kembali ke Toko
        </Link>
      </main>
    );
  }

  // Generate fake additional images from same product
  const images = [
    product.image,
    product.image.replace('w=300&h=300', 'w=300&h=300&crop=entropy'),
    product.image.replace('fit=crop', 'fit=crop&sat=-20'),
    product.image.replace('fit=crop', 'fit=crop&bri=10'),
  ];

  const relatedProducts = products.filter(p => p.id !== product.id && p.category === product.category).slice(0, 4);
  const otherProducts = products.filter(p => p.id !== product.id).slice(0, 4 - relatedProducts.length);
  const related = [...relatedProducts, ...otherProducts].slice(0, 4);

  const priceIDR = (product.price * 16000).toLocaleString('id');
  const oldPriceIDR = product.oldPrice ? (product.oldPrice * 16000).toLocaleString('id') : null;
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : null;

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
        {/* Product Main */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Image Gallery */}
            <div className="flex flex-col gap-4">
              <div className="relative rounded-2xl overflow-hidden bg-gray-50 aspect-square border border-gray-100">
                <img
                  src={images[activeImg]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {product.badge && (
                  <span className={`absolute top-4 left-4 text-white text-sm font-bold px-3 py-1 rounded-full ${
                    product.badgeClass === 'hot' ? 'bg-red-500' :
                    product.badgeClass === 'trending' ? 'bg-blue-500' :
                    product.badgeClass === 'offer' ? 'bg-green-500' : 'bg-orange-500'
                  }`}>{product.badge}</span>
                )}
                {discount && (
                  <span className="absolute top-4 right-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                    -{discount}%
                  </span>
                )}
              </div>
              {/* Thumbnails */}
              <div className="flex gap-3">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                      activeImg === i ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div className="flex flex-col gap-5">
              {/* Category & Title */}
              <div>
                <Link to={`/shop?cat=${product.category}`} className="text-sm text-blue-600 font-medium hover:underline">
                  {product.category}
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1 leading-snug">
                  {product.name}
                </h1>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <StarRating rating={product.rating} />
                <span className="text-sm text-gray-400">({product.reviews} Ulasan)</span>
                <span className="text-sm text-green-600 font-medium">● Tersedia</span>
              </div>

              {/* Price */}
              <div className="flex items-center gap-4">
                <span className="text-3xl font-extrabold text-gray-900">Rp{priceIDR}</span>
                {oldPriceIDR && (
                  <span className="text-lg text-gray-400 line-through">Rp{oldPriceIDR}</span>
                )}
                {discount && (
                  <span className="bg-red-100 text-red-600 text-sm font-bold px-2.5 py-0.5 rounded-full">
                    Hemat {discount}%
                  </span>
                )}
              </div>

              {/* Short Description */}
              <p className="text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                Produk berkualitas tinggi dengan performa terbaik di kelasnya. Dirancang untuk memenuhi kebutuhan sehari-hari dengan teknologi terkini dan desain yang elegan. Garansi resmi 1 tahun dari distributor resmi.
              </p>

              {/* Variants */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Warna:</label>
                  <div className="flex gap-2">
                    {['#1e293b', '#3b82f6', '#10b981', '#f59e0b'].map((color, i) => (
                      <button
                        key={i}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${i === 0 ? 'border-blue-500 scale-110' : 'border-gray-300 hover:border-gray-500'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Ukuran:</label>
                  <div className="flex gap-2">
                    {['S', 'M', 'L', 'XL'].map((size, i) => (
                      <button
                        key={size}
                        className={`w-10 h-10 rounded-lg text-sm font-medium border-2 transition-all ${i === 1 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-400 text-gray-600'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quantity + Add to Cart */}
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-12 h-12 flex items-center justify-center text-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-14 text-center font-bold text-gray-900 text-lg">{qty}</span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    className="w-12 h-12 flex items-center justify-center text-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  className={`flex-1 h-12 rounded-xl font-semibold text-sm transition-all ${
                    addedToCart
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {addedToCart ? '✓ Ditambahkan ke Keranjang!' : '+ Masukkan Keranjang'}
                </button>
                <button
                  onClick={() => setLiked(!liked)}
                  className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${
                    liked ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-red-400'
                  }`}
                >
                  <svg width="18" height="18" fill={liked ? '#ef4444' : 'none'} stroke={liked ? '#ef4444' : '#6b7280'} strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                  </svg>
                </button>
              </div>

              {/* Buy Now */}
              <button
                onClick={() => navigate('/checkout')}
                className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors"
              >
                Beli Sekarang
              </button>

              {/* Meta info */}
              <div className="border-t border-gray-100 pt-4 space-y-2 text-sm text-gray-500">
                <div className="flex gap-2"><span className="font-medium text-gray-700 w-24">SKU:</span><span>SM-{product.id.toString().padStart(5, '0')}</span></div>
                <div className="flex gap-2"><span className="font-medium text-gray-700 w-24">Kategori:</span><Link to={`/shop?cat=${product.category}`} className="text-blue-600 hover:underline">{product.category}</Link></div>
                <div className="flex gap-2"><span className="font-medium text-gray-700 w-24">Stok:</span><span className="text-green-600 font-medium">In Stock</span></div>
                <div className="flex gap-2"><span className="font-medium text-gray-700 w-24">Garansi:</span><span>1 Tahun Garansi Resmi</span></div>
              </div>

              {/* Share */}
              <div className="flex items-center gap-3 pt-2">
                <span className="text-sm font-medium text-gray-600">Bagikan:</span>
                {['F', 'T', 'W', 'I'].map((s, i) => (
                  <button key={i} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-600 text-xs font-bold transition-colors flex items-center justify-center">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
          <div className="flex border-b border-gray-100">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-4 text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="p-8">
            {activeTab === 'Deskripsi' && (
              <div className="prose max-w-none text-gray-600 text-sm leading-relaxed space-y-4">
                <p>
                  <strong className="text-gray-900">{product.name}</strong> hadir sebagai solusi terbaik untuk memenuhi kebutuhan teknologi Anda sehari-hari. 
                  Didesain dengan material premium dan teknologi terkini, produk ini menawarkan performa yang tidak tertandingi di kelasnya.
                </p>
                <p>
                  Dengan fitur-fitur unggulan yang telah teruji, produk ini memberikan pengalaman penggunaan yang nyaman dan menyenangkan. 
                  Tersedia dalam berbagai pilihan warna dan ukuran untuk memenuhi selera dan kebutuhan yang berbeda.
                </p>
                <ul className="space-y-2 pl-4">
                  {['Bahan premium berkualitas tinggi', 'Garansi resmi 1 tahun', 'Tersedia layanan purna jual', 'Pengiriman cepat ke seluruh Indonesia', 'Telah tersertifikasi SNI'].map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <svg width="16" height="16" className="text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="#10b981" strokeWidth="2.5" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {activeTab === 'Informasi Tambahan' && (
              <div className="text-sm">
                <table className="w-full text-gray-600">
                  <tbody className="divide-y divide-gray-100">
                    {[
                      ['Berat', '0.5 kg'],
                      ['Dimensi', '20 × 15 × 5 cm'],
                      ['Bahan', 'Premium ABS + Metal'],
                      ['Warna', 'Hitam, Putih, Biru, Hijau'],
                      ['Garansi', '12 Bulan'],
                      ['Kondisi', 'Baru'],
                      ['Negara Asal', 'Indonesia'],
                    ].map(([key, val]) => (
                      <tr key={key}>
                        <td className="py-3 pr-8 font-semibold text-gray-700 w-40">{key}</td>
                        <td className="py-3">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {activeTab === 'Ulasan' && (
              <div className="space-y-6">
                {/* Rating summary */}
                <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
                  <div className="text-center">
                    <div className="text-5xl font-extrabold text-gray-900">{product.rating}</div>
                    <StarRating rating={product.rating} size={18} />
                    <div className="text-sm text-gray-400 mt-1">{product.reviews} ulasan</div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[5,4,3,2,1].map(star => (
                      <div key={star} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-3">{star}</span>
                        <svg width="12" height="12" fill="#facc15" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${star === 5 ? 70 : star === 4 ? 20 : star === 3 ? 10 : 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-8">{star === 5 ? '70%' : star === 4 ? '20%' : star === 3 ? '10%' : '0%'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Reviews list */}
                <div className="space-y-5">
                  {reviews.map(review => (
                    <div key={review.id} className="border border-gray-100 rounded-xl p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold text-gray-900">{review.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StarRating rating={review.rating} size={13} />
                            <span className="text-xs text-gray-400">{review.date}</span>
                          </div>
                        </div>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Terverifikasi</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                    </div>
                  ))}
                </div>
                {/* Write review */}
                <div className="border border-gray-100 rounded-xl p-5 mt-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Tulis Ulasan</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">Rating Anda:</span>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(s => (
                          <button key={s} className="hover:scale-110 transition-transform">
                            <svg width="20" height="20" fill="#e5e7eb" stroke="#e5e7eb" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                    <input type="text" placeholder="Nama kamu" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors" />
                    <textarea rows={3} placeholder="Tulis ulasan kamu..." className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors resize-none" />
                    <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors">
                      Kirim Ulasan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Produk Terkait</h2>
              <div className="w-12 h-1 bg-blue-600 rounded-full mt-2" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {related.map(p => (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  className="group bg-white rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1 block"
                >
                  <div className="relative overflow-hidden bg-gray-50 aspect-square">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {p.badge && (
                      <span className={`absolute top-2 left-2 text-white text-xs font-bold px-2 py-0.5 rounded-full ${
                        p.badgeClass === 'hot' ? 'bg-red-500' : p.badgeClass === 'trending' ? 'bg-blue-500' : p.badgeClass === 'offer' ? 'bg-green-500' : 'bg-orange-500'
                      }`}>{p.badge}</span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-xs text-blue-600 font-medium mb-0.5">{p.category}</div>
                    <div className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">{p.name}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">Rp{(p.price * 16000).toLocaleString('id')}</span>
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
