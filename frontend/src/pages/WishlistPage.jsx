import { Link } from 'react-router-dom';

export default function WishlistPage() {
  const wishlistItems = [
    { id: 1, name: 'Apple AirPods Pro Modern (Gen 2)', price: 'Rp3.999.000', stock: 'Tersedia', status: 'In Stock', img: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=200&h=200&fit=crop' },
    { id: 2, name: 'Sony PlayStation 5 Digital Edition', price: 'Rp7.500.000', stock: 'Kosong', status: 'Out of Stock', img: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=200&h=200&fit=crop' },
    { id: 3, name: 'Logitech MX Master 3S Wireless Mouse', price: 'Rp1.699.000', stock: 'Tersedia', status: 'In Stock', img: 'https://images.unsplash.com/photo-1615663245857-ac93100388d7?w=200&h=200&fit=crop' },
  ];

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-500">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Favorit Saya</h1>
          <span className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">{wishlistItems.length} Produk</span>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-6 border-b border-gray-100 bg-gray-50/50 text-sm font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-6">Produk Detail</div>
            <div className="col-span-2 text-center">Harga Jual</div>
            <div className="col-span-2 text-center">Status Stok</div>
            <div className="col-span-2 text-center">Aksi</div>
          </div>
          
          {/* List Items */}
          <div className="divide-y divide-gray-100">
            {wishlistItems.map((item) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 items-center">
                <div className="col-span-1 md:col-span-6 flex items-center gap-5">
                  <div className="w-24 h-24 rounded-2xl bg-gray-50 flex-shrink-0 p-2 overflow-hidden border border-gray-100">
                    <img src={item.img} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1 hover:text-blue-600 transition-colors cursor-pointer">{item.name}</h3>
                    <button className="text-red-500 text-sm font-semibold hover:underline flex items-center gap-1 mt-2">
                      Hapus
                    </button>
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2 text-center">
                  <span className="md:hidden text-xs text-gray-500 mr-2">Harga:</span>
                  <span className="font-bold text-gray-900">{item.price}</span>
                </div>
                <div className="col-span-1 md:col-span-2 text-center">
                  <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${item.status === 'In Stock' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.stock}
                  </span>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <button 
                    disabled={item.status !== 'In Stock'}
                    className={`w-full py-3 rounded-xl font-bold transition-all text-sm ${item.status === 'In Stock' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                  >
                    + Keranjang
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-8 flex justify-center">
           <Link to="/shop" className="text-gray-600 font-bold hover:text-blue-600 transition-colors border-b-2 border-transparent hover:border-blue-600 pb-1">
             ← Lanjutkan Pencarian
           </Link>
        </div>
      </div>
    </main>
  );
}
