import React, { useState, useEffect } from 'react';
import { fetchJson, MERCHANT_API_BASE, PUBLIC_API_BASE, API_BASE, formatImage } from '../../lib/api';
import { idr } from '../../lib/adminStyles';

export default function RestockRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [masterProducts, setMasterProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' or 'transfer'
  const [wallet, setWallet] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCat, setSelectedCat] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await fetchJson(`${MERCHANT_API_BASE}/restock`);
      setRequests(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = async () => {
    setShowModal(true);
    try {
      const [prodRaw, walletRaw] = await Promise.all([
        fetchJson(`${MERCHANT_API_BASE}/catalog`),
        fetchJson(`${MERCHANT_API_BASE}/wallet`)
      ]);
      setMasterProducts(prodRaw || []);
      setFilteredProducts(prodRaw || []);
      setWallet(walletRaw?.data || walletRaw);
    } catch (err) {}
  };

  useEffect(() => {
    let result = masterProducts;
    if (searchTerm) result = result.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    setFilteredProducts(result);
  }, [searchTerm, masterProducts]);

  const addToCart = (p) => {
    const buyPrice = p.wholesale_price || (p.price * 0.8);
    const ex = cart.find(i => i.product_id === p.id);
    if (ex) setCart(cart.map(i => i.product_id === p.id ? { ...i, qty: i.qty + 1 } : i));
    else setCart([...cart, { product_id: p.id, qty: 1, name: p.name, price: buyPrice, image: p.image }]);
  };

  const updateQty = (id, val) => {
    const q = parseInt(val);
    if (isNaN(q) || q < 0) return; // Allow empty or 0 temporarily while typing
    if (q === 0) {
      setCart(cart.filter(i => i.product_id !== id));
      return;
    }
    setCart(cart.map(i => i.product_id === id ? { ...i, qty: q } : i));
  };

  const submitRestock = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      await fetchJson(`${MERCHANT_API_BASE}/restock/request`, {
        method: 'POST',
        body: JSON.stringify({ 
          items: cart.map(i => ({ product_id: i.product_id, quantity: i.qty })),
          payment_method: paymentMethod
        })
      });
      setCart([]);
      setShowModal(false);
      loadRequests();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (s) => {
    switch(s) {
      case 'received': return '#10b981';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'shipped': return '#3b82f6';
      default: return '#f59e0b';
    }
  };

  const handleReceive = async (rid) => {
    if (!confirm("Konfirmasi bahwa Anda telah menerima stok ini?")) return;
    try {
      await fetchJson(`${MERCHANT_API_BASE}/restock/receive`, {
        method: 'POST',
        body: JSON.stringify({ request_id: rid })
      });
      loadRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="artisan-page">
      {/* HEADER SECTION */}
      <div className="artisan-header">
         <div className="header-left">
            <div className="breadcrumb">AkuGlow &bull; Merchant</div>
            <h1>Ringkasan Stok</h1>
            <p className="subtitle">Kelola inventori toko Anda dengan sinkronisasi langsung dari pusat.</p>
         </div>
         <div className="header-right">
            <button className="primary-glass-btn" onClick={openModal}>
               <span className="material-symbols-outlined">add_business</span>
               Restock Baru
            </button>
         </div>
      </div>

      {/* STATS BENTO */}
      <div className="artisan-bento">
         <div className="bento-card main">
            <div className="card-lbl">PERMINTAAN TERTUNDA</div>
            <div className="card-val">{requests.filter(r => r.status === 'requested').length}</div>
            <div className="card-trend text-amber-500">Menunggu Verifikasi</div>
         </div>
         <div className="bento-card">
            <div className="card-lbl">DALAM PENGIRIMAN</div>
            <div className="card-val">{requests.filter(r => r.status === 'shipped').length}</div>
            <div className="card-trend text-indigo-500">Barang Sedang Dikirim</div>
         </div>
         <div className="bento-card">
            <div className="card-lbl">TOTAL RESTOK SELESAI</div>
            <div className="card-val">{requests.filter(r => r.status === 'received').length}</div>
            <div className="card-trend text-emerald-500">Permintaan Selesai</div>
         </div>
      </div>

      {/* REQUEST LIST */}
      <div className="artisan-list-container">
         <div className="list-title">Riwayat Aktivitas</div>
         {loading ? (
           <div className="shimmer-list">Memuat database restok...</div>
         ) : (
           <div className="requests-grid">
              {requests.length === 0 ? (
                <div className="empty-state">
                   <span className="material-symbols-outlined">inbox</span>
                   <p>Belum ada riwayat permintaan restok.</p>
                </div>
              ) : requests.map(req => (
                <div key={req.id} className="req-card">
                   <div className="req-header">
                      <div className="req-id">CODE: SM-{req.id.slice(0,5).toUpperCase()}</div>
                      <div className="status-dot" style={{ backgroundColor: getStatusColor(req.status) }}></div>
                   </div>
                   <div className="req-date">{new Date(req.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                   <div className="req-body">
                      <div className="req-item-count">{req.items?.length || 0} Produk</div>
                      <div className="req-qty-total">{req.total_items || 0} pcs Total</div>
                   </div>
                    <div className="req-footer">
                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                          <div className="req-status-lbl" style={{ color: getStatusColor(req.status) }}>{req.status?.toUpperCase()}</div>
                          <div className="req-note" title={req.admin_note}>{req.admin_note || 'Menunggu respon pusat...'}</div>
                       </div>
                    </div>

                   {req.status === 'shipped' && (
                     <button className="elite-receive-btn" onClick={() => handleReceive(req.id)}>
                        Konfirmasi Terima
                     </button>
                   )}
                </div>
              ))}
           </div>
         )}
      </div>

      {/* ELITE RESTOCK MODAL */}
      {showModal && (
        <div className="elite-modal-overlay">
           <div className="elite-modal-body">
              {/* CONTENT LEFT: PRODUCT LIST */}
              <div className="elite-content-area">
                 <div className="elite-search-header">
                    <div className="search-pill">
                       <span className="material-symbols-outlined">search</span>
                       <input type="text" placeholder="Cari Master SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <button className="elite-close" onClick={() => setShowModal(false)}>
                       <span className="material-symbols-outlined">close</span>
                    </button>
                 </div>
                 
                 <div className="elite-product-grid custom-scroll">
                    {filteredProducts.map(p => (
                      <div key={p.id} className="elite-p-card" onClick={() => addToCart(p)}>
                         <div className="p-img">
                            <img src={formatImage(p.image)} alt="" />
                            <div className="p-hover-add"><span className="material-symbols-outlined">add</span></div>
                         </div>
                         <div className="p-details">
                            <div className="p-tag">{p.category}</div>
                            <div className="p-name">{p.name}</div>
                            <div className="p-price">{idr(p.price)}</div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

              {/* SIDEBAR RIGHT: CART */}
              <div className="elite-cart-sidebar">
                 <div className="cart-header">
                    <h3>Daftar Kulakan</h3>
                    <div className="cart-badge">{cart.length}</div>
                 </div>

                 <div className="cart-list-elite custom-scroll">
                    {cart.length === 0 ? (
                      <div className="cart-empty-elite">Pilih produk di samping untuk mengisi daftar kulakan toko Anda.</div>
                    ) : cart.map(item => (
                      <div key={item.product_id} className="cart-item-elite">
                         <div className="ce-info">
                            <div className="ce-name">{item.name}</div>
                            <div className="ce-qty-input">
                               <span>Qty</span>
                               <input 
                                 type="number" 
                                 min="0" 
                                 value={item.qty} 
                                 onChange={e => updateQty(item.product_id, e.target.value)}
                               />
                            </div>
                         </div>
                         <div className="ce-actions">
                            <button onClick={() => setCart(cart.filter(i => i.product_id !== item.product_id))} className="ce-del">
                               <span className="material-symbols-outlined">delete</span>
                            </button>
                            <div className="ce-price">{idr(item.price * item.qty)}</div>
                         </div>
                      </div>
                    ))}
                 </div>

                 <div style={{ padding: '0 40px', marginBottom: 20 }}>
                    <div style={{ fontSize:11, fontWeight:900, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Metode Pembayaran</div>
                    <div style={{ display:'flex', gap:10 }}>
                       <button 
                         onClick={() => setPaymentMethod('wallet')}
                         style={{ 
                           flex:1, padding:'12px', borderRadius:10, border:'1px solid '+(paymentMethod==='wallet'?'#4f46e5':'#e2e8f0'),
                           background: paymentMethod==='wallet'?'#eef2ff':'white', color: paymentMethod==='wallet'?'#4f46e5':'#64748b',
                           fontSize:12, fontWeight:800, cursor:'pointer'
                         }}
                       >
                          Saldo Dompet
                       </button>
                       <button 
                         onClick={() => setPaymentMethod('transfer')}
                         style={{ 
                           flex:1, padding:'12px', borderRadius:10, border:'1px solid '+(paymentMethod==='transfer'?'#4f46e5':'#e2e8f0'),
                           background: paymentMethod==='transfer'?'#eef2ff':'white', color: paymentMethod==='transfer'?'#4f46e5':'#64748b',
                           fontSize:12, fontWeight:800, cursor:'pointer'
                         }}
                       >
                          Transfer Manual
                       </button>
                    </div>
                    {paymentMethod === 'wallet' && wallet && (
                      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Saldo Tersedia:</span>
                         <span style={{ fontSize: 12, fontWeight: 800, color: (wallet.available_balance < cart.reduce((s, i) => s + (i.price * i.qty), 0)) ? '#ef4444' : '#10b981' }}>
                            {idr(wallet.available_balance)}
                         </span>
                      </div>
                    )}
                    {paymentMethod === 'wallet' && wallet && (wallet.available_balance < cart.reduce((s, i) => s + (i.price * i.qty), 0)) && (
                      <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, marginTop: 4 }}>
                         <i className="bx bx-error-circle" /> Saldo tidak mencukupi untuk kulakan ini.
                      </div>
                    )}
                 </div>

                 <div className="cart-footer-elite">
                    <div className="total-box">
                       <span>ESTIMASI BIAYA</span>
                       <h4>{idr(cart.reduce((s, i) => s + (i.price * i.qty), 0))}</h4>
                    </div>
                    <button 
                       className="submit-elite-btn" 
                       disabled={isSubmitting || cart.length === 0 || (paymentMethod === 'wallet' && wallet && wallet.available_balance < cart.reduce((s, i) => s + (i.price * i.qty), 0))} 
                       onClick={submitRestock}
                    >
                       {isSubmitting ? 'MEMPROSES...' : 'KIRIM PERMINTAAN'} 
                       {!isSubmitting && <span className="material-symbols-outlined">send</span>}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <style>{`
        /* ARTISAN COLLECTION: UI V6 */
        .artisan-page { padding: 40px; background: #fdfdfd; min-height: 100vh; animation: pageFade 0.8s ease-out; font-family: 'Inter', sans-serif; }
        @keyframes pageFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .artisan-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 50px; }
        .header-left .breadcrumb { font-size: 11px; font-weight: 800; color: #6366f1; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; }
        .header-left h1 { font-size: 42px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -2px; line-height: 1; }
        .header-left .subtitle { color: #64748b; font-weight: 500; margin-top: 10px; font-size: 16px; }
        
        .primary-glass-btn { border: none; background: #0f172a; color: white; padding: 16px 30px; border-radius: 20px; font-weight: 900; font-size: 14px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.3); }
        .primary-glass-btn:hover { transform: translateY(-5px); background: #4f46e5; box-shadow: 0 30px 60px -15px rgba(79, 70, 229, 0.4); }

        .artisan-bento { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 24px; margin-bottom: 60px; }
        .bento-card { background: white; padding: 32px; border-radius: 35px; border: 1px solid #f1f5f9; position: relative; overflow: hidden; transition: 0.3s; }
        .bento-card:hover { border-color: #6366f1; transform: scale(1.02); }
        .bento-card.main { background: #4f46e5; color: white; border: none; box-shadow: 0 40px 80px -20px rgba(79, 70, 229, 0.3); }
        .bento-card.main .card-lbl { color: rgba(255,255,255,0.7); }
        .bento-card.main .card-val { color: white; }
        .bento-card.main .card-trend { color: white; opacity: 0.8; }
        
        .card-lbl { font-size: 11px; font-weight: 900; color: #94a3b8; letter-spacing: 1.5px; text-transform: uppercase; }
        .card-val { font-size: 48px; font-weight: 900; color: #0f172a; margin: 10px 0; }
        .card-trend { font-size: 13px; font-weight: 700; }

        .artisan-list-container { }
        .list-title { font-size: 20px; font-weight: 900; color: #0f172a; margin-bottom: 30px; letter-spacing: -0.5px; }
        .requests-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
        
        .req-card { background: white; border-radius: 30px; padding: 24px; border: 1px solid #f1f5f9; transition: 0.3s; }
        .req-card:hover { transform: translateY(-5px); border-color: #e2e8f0; box-shadow: 0 30px 60px -20px rgba(0,0,0,0.05); }
        .req-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .req-id { font-size: 12px; font-weight: 900; color: #0f172a; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 10px currentColor; }
        .req-date { font-size: 13px; color: #94a3b8; font-weight: 600; margin-bottom: 20px; }
        .req-body { display: flex; justify-content: space-between; padding-bottom: 20px; border-bottom: 1px dashed #f1f5f9; margin-bottom: 20px; }
        .req-item-count { font-weight: 800; font-size: 14px; color: #475569; }
        .req-qty-total { font-weight: 900; font-size: 14px; color: #0f172a; }
        .req-footer { display: flex; justify-content: space-between; align-items: baseline; }
        .req-status-lbl { font-size: 11px; font-weight: 900; letter-spacing: 1px; }
        .req-note { font-size: 12px; font-weight: 500; color: #94a3b8; text-align: right; font-style: italic; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* ELITE MODAL DESIGN */
        .elite-modal-overlay { position: fixed; inset: 0; z-index: 99999; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(25px); display: flex; align-items: center; justify-content: center; padding: 20px; }
        .elite-modal-body { width: 100%; max-width: 1400px; height: 90vh; background: white; border-radius: 40px; display: flex; overflow: hidden; box-shadow: 0 80px 150px -40px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.5); position: relative; }
        
        .elite-content-area { flex: 1; display: flex; flex-direction: column; background: #fdfdfd; }
        .elite-search-header { padding: 35px 50px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }
        .search-pill { background: #f1f5f9; padding: 4px 20px; border-radius: 20px; display: flex; align-items: center; gap: 12px; width: 400px; border: 2px solid transparent; transition: 0.3s; }
        .search-pill:focus-within { background: white; border-color: #4f46e5; box-shadow: 0 0 0 5px rgba(79, 70, 229, 0.05); }
        .search-pill input { border: none; background: transparent; outline: none; padding: 12px 0; font-weight: 600; flex: 1; }
        .elite-close { width: 44px; height: 44px; border-radius: 14px; border: none; background: #fee2e2; color: #ef4444; cursor: pointer; transition: 0.3s; }
        .elite-close:hover { transform: rotate(90deg); background: #ef4444; color: white; }

        .elite-product-grid { flex: 1; overflow-y: auto; padding: 50px; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 35px; }
        .elite-p-card { cursor: pointer; transition: 0.3s; }
        .elite-p-card:hover { transform: translateY(-8px); }
        .elite-p-card .p-img { position: relative; padding-top: 100%; border-radius: 35px; overflow: hidden; background: #f8fafc; margin-bottom: 18px; border: 1px solid #f1f5f9; }
        .elite-p-card .p-img img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: 0.5s; }
        .elite-p-card:hover .p-img img { transform: scale(1.1); }
        .p-hover-add { position: absolute; inset: 0; background: rgba(79, 70, 229, 0.05); opacity: 0; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); transition: 0.3s; }
        .p-hover-add span { font-size: 56px; color: #4f46e5; font-weight: 200; transform: scale(0.6); transition: 0.4s; }
        .elite-p-card:hover .p-hover-add { opacity: 1; }
        .elite-p-card:hover .p-hover-add span { transform: scale(1); }

        .p-details { padding: 4px; }
        .p-tag { font-size: 9px; font-weight: 900; color: #a5b4fc; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
        .p-name { font-size: 15px; font-weight: 900; color: #0f172a; margin-bottom: 6px; height: 36px; overflow: hidden; line-height: 1.25; }
        .p-price { font-size: 16px; font-weight: 900; color: #0f172a; opacity: 0.7; }

        .elite-cart-sidebar { width: 380px; min-width: 380px; border-left: 1px solid #f1f5f9; background: #ffffff; display: flex; flex-direction: column; }
        .cart-header { padding: 40px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .cart-header h3 { margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; }
        .cart-badge { background: #0f172a; color: white; padding: 4px 12px; border-radius: 10px; font-size: 12px; font-weight: 900; }
        
        .cart-list-elite { flex: 1; overflow-y: auto; padding: 20px 40px; }
        .cart-item-elite { padding: 20px; background: #fbfbfd; border-radius: 25px; border: 1px solid #f1f5f9; margin-bottom: 16px; transition: 0.2s; }
        .ce-name { font-size: 14px; font-weight: 900; color: #0f172a; margin-bottom: 15px; }
        .ce-qty { font-size: 12px; font-weight: 700; color: #94a3b8; }
        .ce-actions { display: flex; justify-content: space-between; align-items: center; }
        .ce-del { border: none; background: #fee2e2; color: #ef4444; width: 32px; height: 32px; border-radius: 10px; cursor: pointer; transition: 0.2s; }
        .ce-del:hover { background: #ef4444; color: white; transform: scale(1.1); }
        .ce-price { font-size: 16px; font-weight: 900; color: #0f172a; }

        .ce-qty-input { display: flex; align-items: center; gap: 8px; margin-bottom: 15px; }
        .ce-qty-input span { font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase; }
        .ce-qty-input input { width: 80px; border: 1px solid #e2e8f0; background: white; padding: 6px 12px; border-radius: 10px; font-weight: 900; color: #0f172a; outline: none; transition: 0.2s; }
        .ce-qty-input input:focus { border-color: #4f46e5; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.05); }
        .ce-qty-input input::-webkit-inner-spin-button { opacity: 1; }

        .cart-footer-elite { padding: 40px; border-top: 1px solid #f1f5f9; }
        .total-box { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
        .total-box span { font-size: 11px; font-weight: 900; color: #94a3b8; letter-spacing: 1.5px; }
        .total-box h4 { font-size: 28px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -1px; }

        .submit-elite-btn { width: 100%; border: none; padding: 24px; border-radius: 24px; background: #0f172a; color: white; font-weight: 900; font-size: 16px; cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 15px; box-shadow: 0 30px 60px -15px rgba(15,23,42,0.4); }
        .submit-elite-btn:hover:not(:disabled) { background: #4f46e5; transform: translateY(-5px); box-shadow: 0 40px 80px -20px rgba(79, 70, 229, 0.4); }
        .submit-elite-btn:disabled { opacity: 0.2; transform: none; box-shadow: none; cursor: not-allowed; }

        .elite-receive-btn { width: 100%; border: none; padding: 12px; border-radius: 15px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; font-weight: 900; font-size: 13px; cursor: pointer; transition: 0.3s; margin-top: 20px; box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.3); }
        .elite-receive-btn:hover { transform: translateY(-3px); box-shadow: 0 15px 30px -8px rgba(79, 70, 229, 0.4); filter: brightness(1.1); }

        /* CUSTOM SCROLLBAR */
        .custom-scroll::-webkit-scrollbar { width: 8px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; border: 2px solid white; }
        
        @media (max-width: 1200px) {
           .artisan-bento { grid-template-columns: 1fr; }
           .elite-modal-body { border-radius: 0; height: 100vh; }
           .elite-cart-sidebar { width: 350px; }
        }
      `}</style>
    </div>
  );
}
