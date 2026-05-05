import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BUYER_API_BASE, fetchJson, formatImage } from '../lib/api';
import { isAuthenticated } from '../lib/auth';

export default function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(null);
  const navigate = useNavigate();

  const loadCart = useCallback(async () => {
    if (!isAuthenticated()) return;
    setLoading(true);
    try {
      const resp = await fetchJson(`${BUYER_API_BASE}/cart`);
      const cartItems = resp.items || resp.Items || [];
      setItems(cartItems);
    } catch (err) {
      console.error('CartDrawer Load Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      loadCart();
    };
    const handleUpdate = () => {
      loadCart();
    };

    window.addEventListener('openCart', handleOpen);
    window.addEventListener('cartUpdate', handleUpdate);
    return () => {
      window.removeEventListener('openCart', handleOpen);
      window.removeEventListener('cartUpdate', handleUpdate);
    };
  }, [loadCart]);

  const updateQty = async (id, variantId, productId, merchantId, currentQty, delta) => {
    const newQty = Math.max(1, currentQty + delta);
    if (newQty === currentQty) return;

    setActing(id);
    try {
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
    } catch (err) {
      alert(err.message);
    } finally {
      setActing(null);
    }
  };

  const removeItem = async (productId, variantId) => {
    try {
      let url = `${BUYER_API_BASE}/cart/item?product_id=${productId}`;
      if (variantId) url += `&variant_id=${variantId}`;
      
      await fetchJson(url, { method: 'DELETE' });
      window.dispatchEvent(new Event('cartUpdate'));
    } catch (err) {
      alert(err.message);
    }
  };

  const subtotal = items.reduce((sum, item) => {
    const price = item.product_variant?.price || item.product?.price || 0;
    return sum + price * item.quantity;
  }, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer Content */}
      <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col transform animate-slide-in-right">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Keranjang Belanja</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{items.length} Item Tersimpan</p>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <i className="bx bx-x text-2xl"></i>
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {loading && items.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <i className="bx bx-shopping-bag text-4xl text-gray-200"></i>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Keranjang Kosong</h3>
              <p className="text-gray-400 text-sm max-w-[240px] mb-8">Wah, belum ada produk nih. Yuk eksplorasi sekarang!</p>
              <button 
                onClick={() => { setIsOpen(false); navigate('/shop'); }}
                className="bg-primary text-white px-8 py-3 rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary-light/30 active:scale-95"
              >
                Mulai Belanja
              </button>
            </div>
          ) : (
            Object.entries(
              items.reduce((acc, item) => {
                const mId = item.merchant_id || '00000000-0000-0000-0000-000000000000';
                const mName = item.merchant?.store_name || 'AkuGlow (Pusat)';
                if (!acc[mId]) acc[mId] = { name: mName, items: [] };
                acc[mId].items.push(item);
                return acc;
              }, {})
            ).map(([mId, group]) => (
              <div key={mId} className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                  <i className="bx bx-store text-primary"></i>
                  <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">{group.name}</span>
                </div>
                <div className="space-y-6">
                  {group.items.map((item) => (
                    <div key={item.id} className="flex gap-4 group/item animate-fade-in">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100 relative">
                        <img src={formatImage(item.product?.image)} alt={item.product?.name} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-xs font-bold text-gray-800 line-clamp-2 leading-snug group-hover/item:text-primary transition-colors">
                              {item.product?.name}
                            </h4>
                            <button 
                              onClick={() => removeItem(item.product_id, item.product_variant_id)}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <i className="bx bx-trash text-lg"></i>
                            </button>
                          </div>
                          {item.product_variant?.name !== "Default" && (
                            <span className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 block">Varian: {item.product_variant?.name}</span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center bg-gray-50 rounded-xl p-1 scale-90 origin-left">
                            <button 
                              onClick={() => updateQty(item.id, item.product_variant_id, item.product_id, item.merchant_id, item.quantity, -1)}
                              disabled={acting === item.id}
                              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-primary transition-colors font-black"
                            >
                              {acting === item.id ? '...' : '-'}
                            </button>
                            <span className="w-8 text-center text-[10px] font-black text-gray-800">{item.quantity}</span>
                            <button 
                              onClick={() => updateQty(item.id, item.product_variant_id, item.product_id, item.merchant_id, item.quantity, 1)}
                              disabled={acting === item.id}
                              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-primary transition-colors font-black"
                            >
                              {acting === item.id ? '...' : '+'}
                            </button>
                          </div>
                          <span className="font-black text-primary text-sm">
                            Rp{((item.product_variant?.price || item.product?.price || 0) * item.quantity).toLocaleString('id')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Summary */}
        {items.length > 0 && (
          <div className="p-6 bg-white border-t border-gray-100 space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Estimasi Total</p>
                <p className="text-2xl font-black text-gray-900 tracking-tight">Rp{subtotal.toLocaleString('id')}</p>
              </div>
              <p className="text-[10px] text-green-600 font-black uppercase tracking-widest bg-green-50 px-2 py-1 rounded-lg">Pajak Termasuk</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setIsOpen(false)}
                className="py-4 rounded-2xl font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 transition-all text-sm"
              >
                Lanjut Belanja
              </button>
              <button 
                onClick={() => { setIsOpen(false); navigate('/checkout'); }}
                className="py-4 rounded-2xl font-black text-white bg-primary hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 text-sm flex items-center justify-center gap-2"
              >
                Checkout <i className="bx bx-right-arrow-alt text-xl"></i>
              </button>
            </div>
            
            <p className="text-[10px] text-center text-gray-400 font-medium">
              Aman & Terenkripsi • Pengiriman Cepat • Produk Original
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
