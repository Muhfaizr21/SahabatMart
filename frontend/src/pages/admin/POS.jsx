import React, { useState, useEffect, useRef } from 'react';
import { fetchJson, ADMIN_API_BASE, formatImage } from '../../lib/api';
import toast from 'react-hot-toast';

const POS = () => {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const searchInputRef = useRef(null);

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  const fetchProducts = async (q) => {
    setLoading(true);
    try {
      const data = await fetchJson(`${ADMIN_API_BASE}/pos/products?q=${q || ''}`);
      setProducts(data || []);
      
      // Auto-add logic for Scanners
      if (data && data.length === 1 && q) {
        const p = data[0];
        if (q.toLowerCase() === p.id.toLowerCase() || (p.sku && q.toLowerCase() === p.sku.toLowerCase())) {
          addToCart(p);
          setSearch('');
          toast.success(`${p.name} ditambahkan`);
        }
      }
    } catch (err) {
      console.error('POS Fetch Error:', err);
      toast.error('Gagal mengambil produk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts(search);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const addToCart = (product, variant = null) => {
    const cartId = variant ? variant.id : product.id;
    const existing = cart.find(item => item.cartId === cartId);

    if (existing) {
      setCart(cart.map(item => 
        item.cartId === cartId ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, {
        cartId,
        productId: product.id,
        variantId: variant ? variant.id : null,
        name: product.name,
        variantName: variant ? variant.name : '',
        price: variant ? variant.price : product.price,
        image: product.image,
        quantity: 1
      }]);
    }
  };

  const updateQuantity = (cartId, delta) => {
    setCart(cart.map(item => {
      if (item.cartId === cartId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const formatIDR = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const handleCameraScan = (decodedText) => {
    setIsScannerOpen(false);
    setSearch(decodedText);
    handleDirectScan(decodedText);
  };

  const handleDirectScan = async (q) => {
    if (!q) return;
    
    let matchedP = null;
    let matchedV = null;
    for (const p of products) {
      if (p.id.toLowerCase() === q.toLowerCase() || (p.sku && p.sku.toLowerCase() === q.toLowerCase())) {
        matchedP = p; break;
      }
      if (p.variants) {
        const v = p.variants.find(vv => vv.sku && vv.sku.toLowerCase() === q.toLowerCase());
        if (v) { matchedP = p; matchedV = v; break; }
      }
    }

    if (matchedP) {
      addToCart(matchedP, matchedV);
      setSearch('');
      toast.success(`${matchedP.name} ditambahkan`);
      searchInputRef.current?.focus();
      return;
    }

    try {
      const data = await fetchJson(`${ADMIN_API_BASE}/pos/products?q=${q}`);
      if (data && data.length > 0) {
        const p = data[0];
        let v = p.variants?.find(vv => vv.sku && vv.sku.toLowerCase() === q.toLowerCase());
        addToCart(p, v);
        setSearch('');
        toast.success(`${p.name} ditambahkan`);
      } else {
        toast.error('Produk tidak ditemukan');
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    let scanner = null;
    if (isScannerOpen) {
      /* global Html5Qrcode */
      scanner = new window.Html5Qrcode("reader");
      const config = { fps: 15, qrbox: { width: 250, height: 250 } };
      
      scanner.start(
        { facingMode: "environment" }, 
        config, 
        (text) => handleCameraScan(text)
      ).catch(err => {
        console.error("Camera start error:", err);
        toast.error("Gagal membuka kamera. Pastikan izin diberikan.");
      });

      return () => {
        if (scanner && scanner.isScanning) {
          scanner.stop().then(() => scanner.clear()).catch(e => console.error(e));
        }
      };
    }
  }, [isScannerOpen]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang masih kosong');
      return;
    }

    const total = calculateTotal();
    if (paymentMethod === 'cash' && amountPaid < total) {
      toast.error('Pembayaran kurang');
      return;
    }

    setProcessing(true);
    try {
      const resp = await fetchJson(`${ADMIN_API_BASE}/pos/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({
            product_id: item.productId,
            product_variant_id: item.variantId,
            quantity: item.quantity,
            price: item.price
          })),
          payment_method: paymentMethod,
          amount_paid: paymentMethod === 'cash' ? amountPaid : total,
          notes: 'POS Transaction'
        })
      });

      setLastOrder(resp);
      setShowReceipt(true);
      setCart([]);
      setAmountPaid(0);
      setSearch('');
      toast.success('Checkout Berhasil!');
    } catch (err) {
      console.error('Checkout Error:', err);
      toast.error('Gagal memproses checkout');
    } finally {
      setProcessing(false);
    }
  };

  const quickPay = [50000, 100000, 200000, 500000];

  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div className="flex flex-col lg:flex-row bg-slate-50 h-[calc(100vh-120px)] -m-4 md:-m-8 overflow-hidden relative">
      {/* Header Mobile - Only visible on small screens */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-slate-900 text-white shadow-lg z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-black italic">SM</div>
          <h2 className="text-sm font-black italic tracking-tighter">POS TERMINAL</h2>
        </div>
        <button 
          onClick={() => setIsCartOpen(true)}
          className="relative w-10 h-10 flex items-center justify-center bg-indigo-600 rounded-xl active:scale-95 transition-all"
        >
          <i className="bx bx-shopping-bag text-xl" />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* List Produk */}
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
        <div className="mb-4 md:mb-6 relative">
          <i className="bx bx-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Cari produk atau scan barcode..."
            className="w-full pl-12 pr-12 md:pr-32 py-3.5 md:py-4 bg-white border-0 shadow-sm rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700 text-sm md:text-base"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { 
              if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleDirectScan(search); 
              } 
            }}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
             <div className="hidden lg:flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Scanner Ready
            </div>
            <button 
              onClick={() => setIsScannerOpen(true)}
              className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all group active:scale-90"
              title="Gunakan Kamera"
            >
              <i className="bx bx-camera text-xl" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 animate-pulse">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-slate-200 h-48 md:h-64 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {products.map(p => (
                <div 
                  key={p.id} 
                  className="bg-white p-3 md:p-4 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col items-start text-left relative active:scale-95"
                >
                  <div 
                    className="relative w-full aspect-square mb-3 md:mb-4 rounded-xl overflow-hidden bg-slate-100"
                    onClick={() => !p.variants?.length && addToCart(p)}
                  >
                    <img src={formatImage(p.image)} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    {p.variants && p.variants.length > 0 && (
                      <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase shadow-lg">
                        {p.variants.length} Varian
                      </div>
                    )}
                  </div>
                  <h3 className="text-[13px] md:text-sm font-bold text-slate-800 line-clamp-2 h-9 md:h-10 mb-1 leading-snug">{p.name}</h3>
                  <div className="text-indigo-600 font-extrabold text-[13px] md:text-sm mb-2 md:mb-3">{formatIDR(p.price)}</div>
                  
                  {p.variants && p.variants.length > 0 ? (
                    <div className="w-full flex flex-wrap gap-1 md:gap-1.5 mt-auto">
                      {p.variants.map(v => (
                        <button key={v.id} onClick={() => addToCart(p, v)} className="text-[8px] md:text-[9px] font-bold bg-slate-50 border border-slate-100 hover:bg-indigo-600 hover:text-white px-1.5 md:px-2 py-1 rounded-md transition-all active:scale-90">
                          {v.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button onClick={() => addToCart(p)} className="w-full mt-auto bg-slate-900 hover:bg-indigo-600 text-white py-2 rounded-xl text-[11px] md:text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md active:shadow-none">
                       <i className="bx bx-plus" /> Tambah
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart & Checkout Overlay (Mobile) / Side Panel (Desktop) */}
      <div className={`
        fixed inset-0 lg:relative lg:inset-auto z-40 lg:z-0
        flex lg:block
        ${isCartOpen ? 'opacity-100' : 'opacity-0 lg:opacity-100 pointer-events-none lg:pointer-events-auto'}
        transition-opacity duration-300
      `}>
        {/* Backdrop - Only on mobile */}
        <div 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsCartOpen(false)}
        />
        
        {/* Sidebar cart content */}
        <div className={`
          ml-auto lg:ml-0 w-[85%] sm:w-[400px] lg:w-[420px] 
          bg-white shadow-2xl flex flex-col border-l border-slate-100 h-full
          transition-transform duration-300 transform
          ${isCartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsCartOpen(false)}
                className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400"
              >
                <i className="bx bx-chevron-right text-xl" />
              </button>
              <div>
                <h2 className="text-lg md:text-xl font-black italic tracking-tighter leading-none">ORDER DETAILS</h2>
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-1">{cart.length} Item terdaftar</p>
              </div>
            </div>
            <button onClick={() => setCart([])} className="p-2 hover:bg-red-500/20 text-slate-500 hover:text-red-500 rounded-lg transition-all active:scale-90">
              <i className="bx bx-trash text-xl" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {cart.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center opacity-20 py-10 md:py-20 text-center">
                  <i className="bx bx-barcode-reader text-7xl md:text-8xl mb-4" />
                  <p className="font-black text-base md:text-lg">BELUM ADA ITEM</p>
                  <p className="text-[10px] md:text-xs">Scan Barcode untuk Memulai</p>
               </div>
            ) : (
              cart.map(item => (
                <div key={item.cartId} className="flex items-center gap-3 md:gap-4 bg-slate-50 p-2.5 md:p-3 rounded-2xl border border-slate-100 group transition-all">
                  <img src={formatImage(item.image)} className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover shadow-sm bg-white" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[11px] md:text-xs font-bold text-slate-800 truncate">{item.name}</h4>
                    {item.variantName && <p className="text-[8px] md:text-[9px] text-indigo-500 font-black uppercase mt-0.5">{item.variantName}</p>}
                    <div className="text-slate-900 font-black text-[12px] md:text-sm mt-0.5 md:mt-1">{formatIDR(item.price)}</div>
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2 bg-white p-1 rounded-xl border border-slate-200">
                    <button onClick={() => updateQuantity(item.cartId, -1)} className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600"><i className="bx bx-minus" /></button>
                    <span className="font-bold text-[11px] md:text-xs w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.cartId, 1)} className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center hover:bg-indigo-50 rounded-lg text-indigo-600"><i className="bx bx-plus" /></button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-5 md:p-8 bg-slate-50 border-t border-slate-100 space-y-4 md:space-y-6">
            <div className="space-y-2">
               <div className="flex justify-between items-center text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                 <span>Sub Total</span>
                 <span>{formatIDR(calculateTotal())}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-base md:text-lg font-black text-slate-800 italic tracking-tighter uppercase">Grand Total</span>
                 <span className="text-2xl md:text-3xl font-black text-indigo-600 leading-none">{formatIDR(calculateTotal())}</span>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:gap-3">
               <button onClick={() => setPaymentMethod('cash')} className={`py-3 md:py-3.5 rounded-2xl border-2 font-bold text-[11px] md:text-xs flex items-center justify-center gap-2 transition-all ${paymentMethod === 'cash' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-white bg-white text-slate-400'}`}>
                  <i className="bx bx-money" /> TUNAI
               </button>
               <button onClick={() => { setPaymentMethod('qris'); setAmountPaid(calculateTotal()); }} className={`py-3 md:py-3.5 rounded-2xl border-2 font-bold text-[11px] md:text-xs flex items-center justify-center gap-2 transition-all ${paymentMethod === 'qris' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-white bg-white text-slate-400'}`}>
                  <i className="bx bx-qr" /> QRIS / NON-TUNAI
               </button>
            </div>

            {paymentMethod === 'cash' && (
               <div className="space-y-3 md:space-y-4">
                  <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">Rp</span>
                     <input type="number" placeholder="Jumlah bayar..." className="w-full pl-12 pr-4 py-3 md:py-4 rounded-2xl border-0 shadow-inner bg-white font-black text-xl md:text-2xl focus:ring-0" value={amountPaid || ''} onChange={e => setAmountPaid(Number(e.target.value))} />
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                     {quickPay.map(v => (
                       <button key={v} onClick={() => setAmountPaid(v)} className="py-2.5 bg-slate-200/80 hover:bg-slate-300 rounded-xl text-[9px] md:text-[10px] font-black text-slate-600 transition-all active:scale-90">{v/1000}K</button>
                     ))}
                  </div>
                  {amountPaid > 0 && amountPaid >= calculateTotal() && (
                     <div className="bg-emerald-50 p-3 md:p-4 rounded-2xl border border-emerald-100 flex justify-between items-center group overflow-hidden relative">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase">Kembalian</span>
                        <span className="text-xl md:text-2xl font-black text-emerald-700 font-mono tracking-tighter">{formatIDR(amountPaid - calculateTotal())}</span>
                     </div>
                  )}
               </div>
            )}

            <button onClick={handleCheckout} disabled={processing || cart.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white py-4 md:py-5 rounded-[24px] md:rounded-3xl font-black text-base md:text-xl shadow-xl shadow-indigo-100 active:shadow-none transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
              {processing ? <i className="bx bx-loader-alt animate-spin text-2xl" /> : (
                <>PROSES CHECKOUT <i className="bx bx-right-arrow-alt text-2xl" /></>
              )}
            </button>
          </div>
        </div>
      </div>
      {/* Camera Scanner Modal - High Z-Index */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-2xl p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <i className="bx bx-qr-scan text-xl" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 leading-tight tracking-tight">Camera Scanner</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Ready to scan items</p>
                </div>
              </div>
              <button onClick={() => setIsScannerOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white text-slate-400 hover:text-red-500 transition-all shadow-sm border border-slate-100">
                <i className="bx bx-x text-2xl" />
              </button>
            </div>
            <div className="p-6">
              <div id="reader" className="w-full rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-900 aspect-square"></div>
              <div className="mt-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-4">
                <i className="bx bxs-info-circle text-2xl text-indigo-500 flex-shrink-0" />
                <p className="text-[11px] text-indigo-900/80 leading-relaxed font-bold">Pastikan pencahayaan cukup agar kode produk dapat terbaca dengan akurat oleh sensor kamera.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Receipt Modal */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xl z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[44px] shadow-2xl overflow-hidden animate-receipt-in">
            <div className="bg-indigo-600 p-10 text-center text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
               <div className="w-20 h-20 bg-white rounded-[28px] flex items-center justify-center shadow-xl mx-auto mb-6 text-indigo-600 scale-110">
                  <i className="bx bx-check text-5xl" />
               </div>
               <h2 className="text-3xl font-black mb-1 letter-spacing-tighter italic">SUCCESS!</h2>
               <p className="text-indigo-200 text-xs font-black tracking-[0.2em] uppercase">{lastOrder.order_number}</p>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="space-y-4 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                {lastOrder.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-4 text-xs font-black">
                    <span className="text-slate-600 leading-snug">{item.product_name} <span className="text-[10px] text-slate-300">x{item.quantity}</span></span>
                    <span className="text-slate-900 whitespace-nowrap">{formatIDR(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-dashed border-slate-100 pt-8 space-y-3">
                 <div className="flex justify-between items-center text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                    <span>Platform Transaction</span>
                    <span>TID#{lastOrder.id?.slice(-6).toUpperCase()}</span>
                 </div>
                 <div className="flex justify-between items-center text-slate-800 font-black italic text-3xl tracking-tighter">
                    <span>TOTAL</span>
                    <span className="text-indigo-600">{formatIDR(lastOrder.grand_total)}</span>
                 </div>
              </div>

              <div className="flex gap-4 pt-4">
                 <button onClick={() => window.print()} className="flex-1 bg-slate-900 hover:bg-black text-white py-4.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                   <i className="bx bx-printer text-xl" /> CETAK
                 </button>
                 <button onClick={() => setShowReceipt(false)} className="px-8 bg-slate-100 hover:bg-slate-200 text-slate-500 py-4.5 rounded-2xl font-black text-sm transition-all active:scale-95">OK</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        @keyframes receipt-in {
          from { opacity: 0; transform: scale(0.9) translateY(40px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-receipt-in { animation: receipt-in 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
      ` }} />
    </div>
  );
};

export default POS;
