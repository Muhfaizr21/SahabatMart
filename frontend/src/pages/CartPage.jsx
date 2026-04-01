import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { products } from '../data/products';

const cartItems = [
  { ...products[0], qty: 1 },
  { ...products[2], qty: 2 },
  { ...products[3], qty: 1 },
];

export default function CartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState(cartItems);
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);

  const updateQty = (id, delta) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
    ));
  };

  const removeItem = (id) => setItems(prev => prev.filter(item => item.id !== id));

  const subtotal = items.reduce((sum, item) => sum + (item.price * 16000) * item.qty, 0);
  const discount = couponApplied ? subtotal * 0.1 : 0;
  const shipping = subtotal > 500000 ? 0 : 15000;
  const total = subtotal - discount + shipping;

  return (
    <main className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Keranjang Belanja</h1>
          <nav className="flex items-center gap-2 text-blue-200 text-sm mt-3">
            <Link to="/" className="hover:text-white">Beranda</Link>
            <span>/</span>
            <span className="text-white">Keranjang</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Keranjang Kosong</h2>
            <p className="text-gray-500 mb-8">Kamu belum menambahkan produk ke keranjang.</p>
            <Link to="/shop" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Cart Items */}
            <div className="flex-1">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-600">
                  <div className="col-span-5">Produk</div>
                  <div className="col-span-2 text-center">Harga</div>
                  <div className="col-span-2 text-center">Jumlah</div>
                  <div className="col-span-2 text-center">Total</div>
                  <div className="col-span-1" />
                </div>
                {/* Items */}
                <div className="divide-y divide-gray-100">
                  {items.map(item => (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-5 items-center">
                      {/* Product */}
                      <div className="md:col-span-5 flex items-center gap-4">
                        <Link to={`/product/${item.id}`} className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </Link>
                        <div>
                          <div className="text-xs text-blue-600 mb-0.5 font-medium">{item.category}</div>
                          <Link to={`/product/${item.id}`} className="text-sm font-semibold text-gray-800 hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                            {item.name}
                          </Link>
                        </div>
                      </div>
                      {/* Price */}
                      <div className="md:col-span-2 text-center">
                        <div className="text-sm font-bold text-gray-700">Rp{(item.price * 16000).toLocaleString('id')}</div>
                      </div>
                      {/* Qty */}
                      <div className="md:col-span-2 flex items-center justify-center">
                        <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                          <button onClick={() => updateQty(item.id, -1)} className="w-9 h-9 flex items-center justify-center text-lg font-bold text-gray-500 hover:bg-gray-50">-</button>
                          <span className="w-10 text-center text-sm font-bold">{item.qty}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="w-9 h-9 flex items-center justify-center text-lg font-bold text-gray-500 hover:bg-gray-50">+</button>
                        </div>
                      </div>
                      {/* Total */}
                      <div className="md:col-span-2 text-center">
                        <div className="text-sm font-bold text-gray-900">Rp{(item.price * 16000 * item.qty).toLocaleString('id')}</div>
                      </div>
                      {/* Remove */}
                      <div className="md:col-span-1 flex justify-center">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-colors"
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/>
                            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coupon */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-5">
                <h3 className="font-semibold text-gray-900 mb-3">Kode Kupon</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={coupon}
                    onChange={e => setCoupon(e.target.value)}
                    placeholder="Masukkan kode kupon..."
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors"
                  />
                  <button
                    onClick={() => { if (coupon.toUpperCase() === 'SAHABAT10') setCouponApplied(true); }}
                    className="bg-gray-900 hover:bg-gray-800 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
                  >
                    Terapkan
                  </button>
                </div>
                {couponApplied && (
                  <div className="mt-2 text-sm text-green-600 font-medium">✓ Kupon berhasil diterapkan! Diskon 10%</div>
                )}
                <p className="text-xs text-gray-400 mt-2">Coba kupon: SAHABAT10</p>
              </div>
            </div>

            {/* Summary */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
                <h3 className="font-bold text-gray-900 text-lg mb-5">Ringkasan Pesanan</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({items.length} item)</span>
                    <span className="font-medium text-gray-900">Rp{subtotal.toLocaleString('id')}</span>
                  </div>
                  {couponApplied && (
                    <div className="flex justify-between text-green-600">
                      <span>Diskon Kupon (10%)</span>
                      <span>-Rp{discount.toLocaleString('id')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Ongkos Kirim</span>
                    <span className={shipping === 0 ? 'text-green-600 font-medium' : 'font-medium text-gray-900'}>
                      {shipping === 0 ? 'GRATIS' : `Rp${shipping.toLocaleString('id')}`}
                    </span>
                  </div>
                  {shipping > 0 && (
                    <p className="text-xs text-gray-400">Gratis ongkir untuk pembelian di atas Rp500.000</p>
                  )}
                  <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900 text-base">
                    <span>Total</span>
                    <span>Rp{total.toLocaleString('id')}</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
                >
                  Lanjut ke Checkout →
                </button>
                <Link to="/shop" className="w-full mt-3 border-2 border-gray-200 hover:border-blue-400 text-gray-600 hover:text-blue-600 font-semibold py-3 rounded-xl transition-colors text-sm text-center block">
                  Lanjut Belanja
                </Link>

                {/* Payment icons */}
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 text-center mb-3">Metode Pembayaran</p>
                  <div className="flex justify-center gap-2">
                    {['VISA', 'MC', 'BCA', 'OVO', 'GoPay'].map(m => (
                      <span key={m} className="text-xs bg-gray-50 border border-gray-200 px-2 py-1 rounded font-bold text-gray-500">{m}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
