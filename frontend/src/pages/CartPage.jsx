import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BUYER_API_BASE, fetchJson, formatImage } from '../lib/api';

export default function CartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
          // For now, guest cart is empty on refresh, but in real apps we use localStorage.
          // We return empty to avoid 401 errors.
          setItems([]);
          setLoading(false);
          return;
      }
      const resp = await fetchJson(`${BUYER_API_BASE}/cart`);
      console.log("DEBUG RESPONSE:", resp);
      
      const cartItems = resp.items || resp.Items || [];
      setItems(cartItems);
    } catch (err) {
      console.error('Cart Load Error:', err);
      setError('Gagal memuat keranjang');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCart(); }, [loadCart]);

  const updateQty = async (id, variantId, productId, merchantId, currentQty, delta) => {
    const newQty = Math.max(1, currentQty + delta);
    if (newQty === currentQty) return;

    try {
      // Logic AddToCart in backend handles updates if exists, 
      // but for decrementing/specific set we might need a dedicated PUT endpoint.
      // However, for now, we'll re-add carefully or provide UX feedback.
      await fetchJson(`${BUYER_API_BASE}/cart/add`, {
        method: 'POST',
        body: JSON.stringify({
          product_id: productId,
          product_variant_id: variantId,
          merchant_id: merchantId,
          quantity: delta
        })
      });
      window.dispatchEvent(new Event('cartUpdate'));
      loadCart();
    } catch (err) {
      alert(err.message);
    }
  };

  const removeItem = async (productId, variantId) => {
    if (!window.confirm('Hapus item ini?')) return;
    try {
      let url = `${BUYER_API_BASE}/cart/item?product_id=${productId}`;
      if (variantId) url += `&variant_id=${variantId}`;
      
      const cartData = await fetchJson(url, { method: 'DELETE' });
      window.dispatchEvent(new Event('cartUpdate'));
      setItems(prev => prev.filter(item => !(item.product_id === productId && item.product_variant_id === variantId)));
    } catch (err) {
      alert(err.message);
    }
  };

  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
  }, []);

  const getItemPrice = (item) => {
    const isMitra = user?.role === 'mitra' || user?.role === 'affiliate';
    if (isMitra) {
      if (item.product_variant?.wholesale_price > 0) return item.product_variant.wholesale_price;
      if (item.product?.wholesale_price > 0) return item.product.wholesale_price;
    }
    return item.product_variant?.price || item.product?.price || 0;
  };

  const subtotal = items.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);
  const discount = couponApplied ? subtotal * 0.1 : 0;
  const shipping = subtotal > 500000 || subtotal === 0 ? 0 : 15000;
  const total = subtotal - discount + shipping;

  if (loading) return (
     <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
           <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
           <p className="text-gray-500 font-bold">Sinkronisasi Keranjang...</p>
        </div>
     </main>
  );

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
                
                {/* Items Grouped by Merchant */}
                <div className="divide-y divide-gray-100">
                  {Object.entries(
                    items.reduce((acc, item) => {
                      const mId = item.merchant_id || '00000000-0000-0000-0000-000000000000';
                      const mName = item.merchant?.store_name || 'AkuGlow (Pusat)';
                      if (!acc[mId]) acc[mId] = { name: mName, items: [] };
                      acc[mId].items.push(item);
                      return acc;
                    }, {})
                  ).map(([mId, group]) => (
                    <div key={mId} className="border-b-4 border-gray-50 last:border-b-0">
                      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-600 text-sm">storefront</span>
                        <span className="font-bold text-gray-800 text-sm uppercase tracking-wide">{group.name}</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {group.items.map(item => (
                          <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-5 items-center bg-white hover:bg-slate-50 transition-colors">
                            {/* Product */}
                            <div className="md:col-span-5 flex items-center gap-4">
                              <Link to={`/product/${item.product_id}`} className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                          <img src={formatImage(item.product?.image)} alt={item.product?.name} className="w-full h-full object-cover" />
                        </Link>
                        <div>
                          <div className="text-[10px] text-blue-600 mb-0.5 font-black uppercase tracking-widest">{item.product?.category}</div>
                          <Link to={`/product/${item.product_id}`} className="text-sm font-bold text-gray-800 hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                            {item.product?.name}
                          </Link>
                          {item.product_variant?.name !== "Default" && (
                             <span className="text-[10px] text-gray-400 font-bold uppercase mt-1 block">Varian: {item.product_variant?.name}</span>
                          )}
                        </div>
                      </div>
                      {/* Price */}
                      <div className="md:col-span-2 text-center">
                        <div className="text-sm font-bold text-gray-700">Rp{getItemPrice(item).toLocaleString('id')}</div>
                      </div>
                      {/* Qty */}
                      <div className="md:col-span-2 flex items-center justify-center">
                        <div className="flex items-center border-2 border-gray-100 rounded-xl overflow-hidden">
                          <button onClick={() => updateQty(item.id, item.product_variant_id, item.product_id, item.merchant_id, item.quantity, -1)} className="w-9 h-9 flex items-center justify-center text-lg font-bold text-gray-400 hover:bg-gray-50 transition-colors">-</button>
                          <span className="w-10 text-center text-sm font-black text-blue-700">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, item.product_variant_id, item.product_id, item.merchant_id, item.quantity, 1)} className="w-9 h-9 flex items-center justify-center text-lg font-bold text-gray-400 hover:bg-gray-50 transition-colors">+</button>
                        </div>
                      </div>
                      {/* Total */}
                      <div className="md:col-span-2 text-center">
                        <div className="text-sm font-black text-gray-900">Rp{(getItemPrice(item) * item.quantity).toLocaleString('id')}</div>
                      </div>
                      {/* Remove */}
                      <div className="md:col-span-1 flex justify-center">
                        <button
                          onClick={() => removeItem(item.product_id, item.product_variant_id)}
                          className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center transition-all group"
                        >
                          <i className="bx bx-trash text-lg"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                  </div>
                  </div>
                  ))}
                </div>
              </div>

              {/* Coupon */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                   <i className="bx bxs-coupon text-blue-600"></i> Kode Kupon
                </h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={coupon}
                    onChange={e => setCoupon(e.target.value)}
                    placeholder="Masukkan kode kupon..."
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 transition-colors font-medium"
                  />
                  <button
                    onClick={() => { if (coupon.toUpperCase() === 'SAHABAT10') setCouponApplied(true); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-lg shadow-blue-100 active:scale-95"
                  >
                    Terapkan
                  </button>
                </div>
                {couponApplied && (
                  <div className="mt-3 text-xs bg-green-50 text-green-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                     <i className="bx bxs-check-circle"></i> Kupon Berhasil! Diskon 10%
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 p-8 sticky top-24">
                <h3 className="font-black text-gray-900 text-xl mb-6">Order Summary</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>Subtotal ({items.length} item)</span>
                    <span className="font-bold text-gray-900">Rp{subtotal.toLocaleString('id')}</span>
                  </div>
                  {couponApplied && (
                    <div className="flex justify-between text-green-600 font-bold">
                      <span>Diskon Kupon</span>
                      <span>-Rp{discount.toLocaleString('id')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>Ongkos Kirim</span>
                    <span className={shipping === 0 ? 'text-green-600 font-bold' : 'font-bold text-gray-900'}>
                      {shipping === 0 ? 'GRATIS' : `Rp${shipping.toLocaleString('id')}`}
                    </span>
                  </div>
                  <div className="border-t border-gray-100 pt-5 flex justify-between font-black text-gray-900 text-xl">
                    <span>Total</span>
                    <span className="text-blue-700">Rp{total.toLocaleString('id')}</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  Checkout Now <i className="bx bx-right-arrow-alt text-xl"></i>
                </button>
                <Link to="/shop" className="w-full mt-4 flex items-center justify-center font-bold text-gray-400 hover:text-blue-600 transition-colors text-sm">
                   Lanjut Belanja
                </Link>

                {/* Secure info */}
                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                   <div className="flex items-center justify-center gap-2 mb-4">
                      <i className="bx bxs-lock-alt text-gray-300"></i>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Secure Payment</span>
                   </div>
                  <div className="flex justify-center gap-3 opacity-30 grayscale hover:grayscale-0 transition-all">
                    {['VISA', 'MC', 'BCA', 'BWA'].map(m => (
                      <span key={m} className="text-[9px] bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded font-black text-gray-500">{m}</span>
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
