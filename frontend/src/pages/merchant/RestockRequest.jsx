import React, { useState, useEffect } from 'react';
import { fetchJson, MERCHANT_API_BASE, formatImage } from '../../lib/api';

export default function RestockRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [masterProducts, setMasterProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);

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
      const prodRaw = await fetchJson(`${MERCHANT_API_BASE}/catalog`);
      setMasterProducts(prodRaw || []);
      setFilteredProducts(prodRaw || []);
    } catch (err) {}
  };

  useEffect(() => {
    let result = masterProducts;
    if (searchTerm) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredProducts(result);
  }, [searchTerm, masterProducts]);

  const addToCart = (p, v = null) => {
    if (p.variants && p.variants.length > 0 && !v) {
      setSelectedProductForVariant(p);
      return;
    }

    const itemId = v ? `${p.id}-${v.id}` : p.id;
    const ex = cart.find(i => (i.variant_id ? `${i.product_id}-${i.variant_id}` : i.product_id) === itemId);
    
    if (ex) {
      setCart(cart.map(i => (i.variant_id ? `${i.product_id}-${i.variant_id}` : i.product_id) === itemId ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { 
        product_id: p.id, 
        variant_id: v?.id || null,
        qty: 1, 
        name: v ? `${p.name} - ${v.name}` : p.name, 
        image: p.image 
      }]);
    }
    setSelectedProductForVariant(null);
  };

  const updateQty = (itemId, val) => {
    const q = parseInt(val);
    if (isNaN(q) || q < 0) return;
    if (q === 0) {
      setCart(cart.filter(i => (i.variant_id ? `${i.product_id}-${i.variant_id}` : i.product_id) !== itemId));
      return;
    }
    setCart(cart.map(i => (i.variant_id ? `${i.product_id}-${i.variant_id}` : i.product_id) === itemId ? { ...i, qty: q } : i));
  };

  const submitRestock = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      await fetchJson(`${MERCHANT_API_BASE}/restock/request`, {
        method: 'POST',
        body: JSON.stringify({ 
          items: cart.map(i => ({ 
            product_id: i.product_id, 
            product_variant_id: i.variant_id,
            quantity: i.qty 
          }))
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

  const getStatusInfo = (s) => {
    switch(s) {
      case 'received': return { color: '#10b981', label: 'SELESAI', icon: 'check_circle' };
      case 'approved': return { color: '#10b981', label: 'DISETUJUI', icon: 'verified' };
      case 'rejected': return { color: '#ef4444', label: 'DITOLAK', icon: 'cancel' };
      case 'shipped': return { color: '#3b82f6', label: 'DIKIRIM', icon: 'local_shipping' };
      default: return { color: '#f59e0b', label: 'PENDING', icon: 'pending' };
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
    <div className="premium-restock-page">
      {/* HEADER SECTION */}
      <header className="page-header">
        <div className="header-content">
          <div className="title-group">
            <span className="badge">LOGISTIK & DISTRIBUSI</span>
            <h1>Manajemen Stok Pusat</h1>
            <p>Sinkronkan inventori merchant Anda langsung dari gudang pusat tanpa biaya transfer.</p>
          </div>
          <button className="btn-add-restock" onClick={openModal}>
            <span className="material-symbols-outlined">inventory_2</span>
            Buat Permintaan Baru
          </button>
        </div>
      </header>

      {/* STATS OVERVIEW */}
      <section className="stats-grid">
        <div className="stat-card pending">
          <div className="stat-icon"><span className="material-symbols-outlined">hourglass_top</span></div>
          <div className="stat-data">
            <span className="stat-label">Permintaan Aktif</span>
            <span className="stat-value">{requests.filter(r => ['requested', 'approved', 'shipped'].includes(r.status)).length}</span>
          </div>
          <div className="stat-bg-icon"><span className="material-symbols-outlined">hourglass_top</span></div>
        </div>
        <div className="stat-card shipping">
          <div className="stat-icon"><span className="material-symbols-outlined">local_shipping</span></div>
          <div className="stat-data">
            <span className="stat-label">Sedang Dikirim</span>
            <span className="stat-value">{requests.filter(r => r.status === 'shipped').length}</span>
          </div>
          <div className="stat-bg-icon"><span className="material-symbols-outlined">local_shipping</span></div>
        </div>
        <div className="stat-card completed">
          <div className="stat-icon"><span className="material-symbols-outlined">task_alt</span></div>
          <div className="stat-data">
            <span className="stat-label">Restok Selesai</span>
            <span className="stat-value">{requests.filter(r => r.status === 'received').length}</span>
          </div>
          <div className="stat-bg-icon"><span className="material-symbols-outlined">task_alt</span></div>
        </div>
      </section>

      {/* ACTIVITY LIST */}
      <main className="activity-section">
        <div className="section-header">
          <h2>Riwayat Aktivitas</h2>
          <div className="filter-group">
            <span className="total-indicator">{requests.length} Transaksi Terarsip</span>
          </div>
        </div>

        {loading ? (
          <div className="loader-container">
            <div className="premium-spinner"></div>
            <p>Sinkronisasi data gudang...</p>
          </div>
        ) : (
          <div className="requests-table-container">
            {requests.length === 0 ? (
              <div className="empty-state-v2">
                <div className="empty-icon"><span className="material-symbols-outlined">package_2</span></div>
                <h3>Belum Ada Riwayat</h3>
                <p>Klik tombol "Buat Permintaan Baru" untuk mulai mengisi stok toko Anda.</p>
              </div>
            ) : (
              <div className="requests-grid-v2">
                {requests.map(req => {
                  const statusInfo = getStatusInfo(req.status);
                  return (
                    <div key={req.id} className={`request-card-v2 ${req.status}`}>
                      <div className="card-head">
                        <div className="id-badge">#{req.id.slice(-6).toUpperCase()}</div>
                        <div className="status-pill" style={{ '--status-color': statusInfo.color }}>
                          <span className="material-symbols-outlined">{statusInfo.icon}</span>
                          {statusInfo.label}
                        </div>
                      </div>
                      
                      <div className="card-body">
                        <div className="date-box">
                          <span className="material-symbols-outlined">calendar_today</span>
                          {new Date(req.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="items-summary">
                          <div className="summary-row">
                            <span className="label">Varian Produk</span>
                            <span className="value">{req.items?.length || 0}</span>
                          </div>
                          <div className="summary-row">
                            <span className="label">Total Kuantitas</span>
                            <span className="value highlight">{req.total_items || 0} Pcs</span>
                          </div>
                        </div>
                        {req.admin_note && (
                          <div className="admin-note-box">
                            <span className="note-label">Catatan Admin:</span>
                            <p className="note-content">"{req.admin_note}"</p>
                          </div>
                        )}
                      </div>

                      <div className="card-footer-v2">
                        {req.status === 'shipped' ? (
                          <button className="btn-receive-confirm" onClick={() => handleReceive(req.id)}>
                            <span className="material-symbols-outlined">front_loader</span>
                            Konfirmasi Penerimaan
                          </button>
                        ) : (
                          <div className="footer-info">
                            <span className="material-symbols-outlined">info</span>
                            {req.status === 'received' ? 'Stok telah masuk ke inventori' : 'Menunggu pemrosesan gudang'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* PREMIUM SELECTION MODAL */}
      {showModal && (
        <div className="premium-modal-overlay">
          <div className="premium-modal-container">
            {/* MODAL LEFT: CATALOG */}
            <div className="catalog-area">
              <div className="modal-top-nav">
                <div className="search-box-v2">
                  <span className="material-symbols-outlined">search</span>
                  <input 
                    type="text" 
                    placeholder="Cari Produk atau SKU..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    autoFocus
                  />
                </div>
                <button className="btn-close-modal" onClick={() => setShowModal(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="catalog-grid-v2 custom-scrollbar">
                {filteredProducts.map(p => (
                  <div key={p.id} className="catalog-item-v2" onClick={() => addToCart(p)}>
                    <div className="item-image-v2">
                      <img src={formatImage(p.image)} alt={p.name} />
                      <div className="item-overlay-v2">
                        <span className="material-symbols-outlined">add</span>
                      </div>
                    </div>
                    <div className="item-info-v2">
                      <span className="item-cat-v2">{p.category}</span>
                      <h4 className="item-name-v2">{p.name}</h4>
                      <div className="item-stock-v2">
                        <span className="material-symbols-outlined">database</span>
                        Tersedia di Pusat
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MODAL RIGHT: CART */}
            <div className="cart-area">
              <div className="cart-head-v2">
                <h3>Permintaan Restok</h3>
                <div className="item-count-badge">{cart.length}</div>
              </div>

              <div className="cart-items-v2 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="cart-empty-v2">
                    <span className="material-symbols-outlined">shopping_basket</span>
                    <p>Pilih produk dari katalog untuk menambah daftar restok.</p>
                  </div>
                ) : cart.map(item => {
                  const itemId = item.variant_id ? `${item.product_id}-${item.variant_id}` : item.product_id;
                  return (
                    <div key={itemId} className="cart-card-v2">
                      <img src={formatImage(item.image)} alt="" className="cart-item-img-v2" />
                      <div className="cart-item-details-v2">
                        <div className="ci-top">
                          <h5>{item.name}</h5>
                          <button className="btn-remove-v2" onClick={() => updateQty(itemId, 0)}>
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        </div>
                        <div className="ci-bottom">
                          <div className="qty-control-v2">
                            <button onClick={() => updateQty(itemId, item.qty - 1)}>-</button>
                            <input 
                              type="number" 
                              value={item.qty} 
                              onChange={e => updateQty(itemId, e.target.value)}
                            />
                            <button onClick={() => updateQty(itemId, item.qty + 1)}>+</button>
                          </div>
                          <span className="unit-label">Pcs</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="cart-footer-v2">
                <div className="total-summary-v2">
                  <div className="summary-line">
                    <span>Total Barang</span>
                    <span>{cart.length} Varian</span>
                  </div>
                  <div className="summary-line main">
                    <span>Total Kuantitas</span>
                    <span>{cart.reduce((s, i) => s + i.qty, 0)} Pcs</span>
                  </div>
                </div>
                <button 
                  className="btn-submit-restock" 
                  disabled={isSubmitting || cart.length === 0} 
                  onClick={submitRestock}
                >
                  {isSubmitting ? (
                    <>
                      <div className="mini-spinner"></div>
                      Mengirim...
                    </>
                  ) : (
                    <>
                      Konfirmasi Permintaan
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VARIANT PICKER MODAL */}
      {selectedProductForVariant && (
        <div className="premium-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="variant-picker-container">
            <div className="vp-header">
              <div className="vp-prod-info">
                <img src={formatImage(selectedProductForVariant.image)} alt="" />
                <div>
                  <h4>Pilih Varian</h4>
                  <p>{selectedProductForVariant.name}</p>
                </div>
              </div>
              <button className="btn-close-vp" onClick={() => setSelectedProductForVariant(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="vp-body custom-scrollbar">
              {selectedProductForVariant.variants.map(v => (
                <div key={v.id} className="vp-item" onClick={() => addToCart(selectedProductForVariant, v)}>
                  <div className="vp-item-left">
                    <span className="vp-name">{v.name}</span>
                    <span className="vp-sku">{v.sku}</span>
                  </div>
                  <div className="vp-item-right">
                    <span className="material-symbols-outlined">add_circle</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* VARIANT PICKER STYLES */
        .variant-picker-container {
          background: white;
          width: 100%;
          max-width: 440px;
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 30px 60px -12px rgba(0,0,0,0.25);
          animation: modalSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .vp-header { padding: 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .vp-prod-info { display: flex; align-items: center; gap: 16px; }
        .vp-prod-info img { width: 50px; height: 50px; border-radius: 12px; object-fit: cover; }
        .vp-prod-info h4 { margin: 0; font-size: 14px; font-weight: 800; color: #4338ca; text-transform: uppercase; letter-spacing: 1px; }
        .vp-prod-info p { margin: 2px 0 0 0; font-size: 15px; font-weight: 700; color: #1e293b; }
        .btn-close-vp { border: none; background: #f1f5f9; color: #64748b; width: 36px; height: 36px; border-radius: 10px; cursor: pointer; }
        .btn-close-vp:hover { background: #fee2e2; color: #ef4444; }

        .vp-body { max-height: 400px; overflow-y: auto; padding: 12px; }
        .vp-item { 
          padding: 16px 20px; 
          border-radius: 16px; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          cursor: pointer; 
          transition: 0.2s;
          margin-bottom: 4px;
        }
        .vp-item:hover { background: #f8faff; transform: translateX(4px); }
        .vp-item-left { display: flex; flex-direction: column; }
        .vp-name { font-size: 15px; font-weight: 700; color: #1e293b; }
        .vp-sku { font-size: 12px; font-weight: 600; color: #94a3b8; font-family: monospace; }
        .vp-item-right { color: #4338ca; opacity: 0.3; transition: 0.2s; }
        .vp-item:hover .vp-item-right { opacity: 1; transform: scale(1.1); }

        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .premium-restock-page {
          padding: 40px;
          background: #f8fafc;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: #0f172a;
          animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* HEADER */
        .page-header {
          margin-bottom: 40px;
        }
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .title-group .badge {
          background: #e0e7ff;
          color: #4338ca;
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          margin-bottom: 12px;
          display: inline-block;
        }
        .title-group h1 {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -1px;
          margin: 0;
          color: #1e293b;
        }
        .title-group p {
          color: #64748b;
          margin: 8px 0 0 0;
          font-size: 16px;
        }

        .btn-add-restock {
          background: #0f172a;
          color: white;
          border: none;
          padding: 16px 28px;
          border-radius: 16px;
          font-weight: 700;
          font-size: 15px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.2);
        }
        .btn-add-restock:hover {
          background: #4338ca;
          transform: translateY(-2px);
          box-shadow: 0 20px 40px -10px rgba(67, 56, 202, 0.3);
        }

        /* STATS */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 40px;
        }
        .stat-card {
          background: white;
          padding: 24px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          position: relative;
          overflow: hidden;
          border: 1px solid #f1f5f9;
          transition: all 0.3s ease;
        }
        .stat-card:hover {
          transform: translateY(-4px);
          border-color: #e2e8f0;
          box-shadow: 0 20px 30px -10px rgba(0,0,0,0.05);
        }
        .stat-icon {
          width: 60px;
          height: 60px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-icon span { font-size: 28px; }
        .pending .stat-icon { background: #fff7ed; color: #f59e0b; }
        .shipping .stat-icon { background: #eff6ff; color: #3b82f6; }
        .completed .stat-icon { background: #ecfdf5; color: #10b981; }

        .stat-data { display: flex; flex-direction: column; }
        .stat-label { font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 4px; }
        .stat-value { font-size: 28px; font-weight: 800; color: #1e293b; }

        .stat-bg-icon {
          position: absolute;
          right: -20px;
          bottom: -20px;
          opacity: 0.03;
          transform: rotate(-15deg);
        }
        .stat-bg-icon span { font-size: 120px; }

        /* ACTIVITY SECTION */
        .activity-section {
          background: white;
          border-radius: 32px;
          padding: 32px;
          border: 1px solid #f1f5f9;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }
        .section-header h2 { font-size: 20px; font-weight: 800; margin: 0; }
        .total-indicator { font-size: 13px; font-weight: 700; color: #64748b; background: #f8fafc; padding: 6px 14px; border-radius: 10px; }

        .requests-grid-v2 {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }
        .request-card-v2 {
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 24px;
          padding: 24px;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        .request-card-v2:hover {
          background: white;
          border-color: #cbd5e1;
          box-shadow: 0 15px 30px -10px rgba(0,0,0,0.05);
        }
        .card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .id-badge { font-family: monospace; font-size: 13px; font-weight: 800; color: #64748b; background: #e2e8f0; padding: 4px 10px; border-radius: 8px; }
        .status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 800;
          color: var(--status-color);
          background: white;
          border: 1px solid var(--status-color);
          box-shadow: 0 4px 10px -2px rgba(0,0,0,0.05);
        }
        .status-pill span { font-size: 16px; }

        .card-body { flex: 1; }
        .date-box { display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
        .date-box span { font-size: 16px; }

        .items-summary {
          background: white;
          padding: 16px;
          border-radius: 16px;
          margin-bottom: 20px;
        }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .summary-row:last-child { margin-bottom: 0; }
        .summary-row .label { font-size: 12px; font-weight: 600; color: #94a3b8; }
        .summary-row .value { font-size: 14px; font-weight: 700; color: #1e293b; }
        .summary-row .value.highlight { color: #4338ca; font-size: 15px; }

        .admin-note-box {
          background: #fffbeb;
          padding: 12px;
          border-radius: 12px;
          border-left: 4px solid #f59e0b;
        }
        .note-label { display: block; font-size: 10px; font-weight: 800; color: #b45309; text-transform: uppercase; margin-bottom: 4px; }
        .note-content { margin: 0; font-size: 12px; color: #92400e; font-style: italic; line-height: 1.4; }

        .card-footer-v2 { margin-top: 24px; }
        .btn-receive-confirm {
          width: 100%;
          background: linear-gradient(135deg, #4338ca, #6366f1);
          color: white;
          border: none;
          padding: 14px;
          border-radius: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 20px -5px rgba(67, 56, 202, 0.4);
        }
        .btn-receive-confirm:hover { filter: brightness(1.1); transform: translateY(-2px); }
        .footer-info { display: flex; align-items: center; gap: 8px; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; justify-content: center; }
        .footer-info span { font-size: 16px; }

        /* MODAL */
        .premium-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          animation: modalFade 0.3s ease-out;
        }
        @keyframes modalFade { from { opacity: 0; } to { opacity: 1; } }

        .premium-modal-container {
          width: 100%;
          max-width: 1280px;
          height: 85vh;
          background: white;
          border-radius: 32px;
          display: flex;
          overflow: hidden;
          box-shadow: 0 50px 100px -20px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.2);
        }

        .catalog-area { 
          flex: 2; 
          display: flex; 
          flex-direction: column; 
          background: #f8fafc; 
          min-height: 0; 
        }
        .modal-top-nav { padding: 32px; display: flex; justify-content: space-between; align-items: center; background: white; border-bottom: 1px solid #f1f5f9; }
        .search-box-v2 {
          background: #f1f5f9;
          padding: 4px 16px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 380px;
          transition: all 0.3s ease;
        }
        .search-box-v2:focus-within { background: white; box-shadow: 0 0 0 4px rgba(67, 56, 202, 0.1); border: 1px solid #4338ca; }
        .search-box-v2 input { border: none; background: transparent; outline: none; padding: 12px 0; font-weight: 600; width: 100%; font-family: inherit; }
        .btn-close-modal { width: 44px; height: 44px; border-radius: 12px; border: none; background: #f1f5f9; color: #64748b; cursor: pointer; transition: 0.2s; }
        .btn-close-modal:hover { background: #fee2e2; color: #ef4444; transform: rotate(90deg); }
        
        .catalog-grid-v2 { 
          flex: 1; 
          overflow-y: auto; 
          -webkit-overflow-scrolling: touch;
          padding: 32px; 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); 
          gap: 24px; 
        }
        .catalog-item-v2 { cursor: pointer; transition: 0.3s; }
        .catalog-item-v2:hover { transform: translateY(-6px); }
        .item-image-v2 { position: relative; padding-top: 100%; border-radius: 20px; overflow: hidden; background: white; border: 1px solid #f1f5f9; margin-bottom: 12px; }
        .item-image-v2 img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: 0.5s ease; }
        .catalog-item-v2:hover .item-image-v2 img { transform: scale(1.1); }
        .item-overlay-v2 { position: absolute; inset: 0; background: rgba(67, 56, 202, 0.6); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; }
        .item-overlay-v2 span { color: white; font-size: 40px; transform: scale(0.5); transition: 0.3s; }
        .catalog-item-v2:hover .item-overlay-v2 { opacity: 1; }
        .catalog-item-v2:hover .item-overlay-v2 span { transform: scale(1); }

        .item-cat-v2 { font-size: 9px; font-weight: 800; color: #6366f1; text-transform: uppercase; letter-spacing: 1px; }
        .item-name-v2 { font-size: 14px; font-weight: 700; margin: 4px 0 8px 0; color: #1e293b; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 40px; }
        .item-stock-v2 { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #94a3b8; }
        .item-stock-v2 span { font-size: 14px; }

        .cart-area { width: 400px; display: flex; flex-direction: column; background: white; border-left: 1px solid #f1f5f9; }
        .cart-head-v2 { padding: 32px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }
        .cart-head-v2 h3 { font-size: 18px; font-weight: 800; margin: 0; }
        .item-count-badge { background: #4338ca; color: white; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 800; }

        .cart-items-v2 { flex: 1; overflow-y: auto; padding: 24px; }
        .cart-card-v2 { display: flex; gap: 16px; background: #f8fafc; padding: 12px; border-radius: 16px; margin-bottom: 16px; border: 1px solid #f1f5f9; animation: slideIn 0.3s ease-out; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .cart-item-img-v2 { width: 64px; height: 64px; border-radius: 12px; object-fit: cover; }
        .cart-item-details-v2 { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .ci-top { display: flex; justify-content: space-between; align-items: flex-start; }
        .ci-top h5 { font-size: 13px; font-weight: 700; margin: 0; color: #1e293b; padding-right: 12px; }
        .btn-remove-v2 { border: none; background: transparent; color: #94a3b8; cursor: pointer; padding: 0; }
        .btn-remove-v2:hover { color: #ef4444; }

        .ci-bottom { display: flex; justify-content: space-between; align-items: center; }
        .qty-control-v2 { display: flex; align-items: center; background: white; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
        .qty-control-v2 button { border: none; background: transparent; width: 28px; height: 28px; cursor: pointer; font-weight: 800; color: #4338ca; transition: 0.2s; }
        .qty-control-v2 button:hover { background: #f1f5f9; }
        .qty-control-v2 input { width: 40px; border: none; text-align: center; font-size: 13px; font-weight: 800; color: #1e293b; outline: none; }
        .unit-label { font-size: 11px; font-weight: 700; color: #94a3b8; }

        .cart-footer-v2 { padding: 32px; border-top: 1px solid #f1f5f9; background: #f8fafc; }
        .total-summary-v2 { margin-bottom: 24px; }
        .summary-line { display: flex; justify-content: space-between; font-size: 13px; color: #64748b; font-weight: 600; margin-bottom: 8px; }
        .summary-line.main { font-size: 18px; color: #1e293b; font-weight: 800; margin-top: 12px; padding-top: 12px; border-top: 1px dashed #cbd5e1; }

        .btn-submit-restock {
          width: 100%;
          background: #0f172a;
          color: white;
          border: none;
          padding: 18px;
          border-radius: 16px;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          box-shadow: 0 10px 20px -5px rgba(0,0,0,0.1);
        }
        .btn-submit-restock:hover:not(:disabled) { background: #4338ca; transform: translateY(-2px); box-shadow: 0 20px 40px -10px rgba(67, 56, 202, 0.3); }
        .btn-submit-restock:disabled { opacity: 0.3; cursor: not-allowed; }

        .mini-spinner { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* SCROLLBAR */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }

        .empty-state-v2 { text-align: center; padding: 80px 40px; color: #94a3b8; }
        .empty-icon { font-size: 64px; margin-bottom: 20px; opacity: 0.3; }
        .empty-state-v2 h3 { color: #64748b; font-size: 18px; font-weight: 800; margin: 0 0 8px 0; }
        .empty-state-v2 p { font-size: 14px; margin: 0; }

        .cart-empty-v2 { text-align: center; padding: 40px 20px; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 12px; height: 100%; justify-content: center; }
        .cart-empty-v2 span { font-size: 48px; opacity: 0.2; }
        .cart-empty-v2 p { font-size: 13px; font-weight: 600; margin: 0; }

        .premium-spinner { width: 40px; height: 40px; border: 4px solid #f1f5f9; border-top-color: #4338ca; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
        .loader-container { text-align: center; padding: 60px; color: #64748b; font-weight: 700; font-size: 14px; }

        @media (max-width: 768px) {
          .premium-restock-page { padding: 16px; }
          
          .header-content { 
            flex-direction: column; 
            align-items: flex-start; 
            gap: 16px; 
          }
          
          .btn-add-restock { width: 100%; justify-content: center; padding: 14px; }
          
          .title-group h1 { font-size: 24px; }
          .title-group p { font-size: 14px; }
          
          .stats-grid { grid-template-columns: 1fr; gap: 12px; }
          .stat-card { padding: 20px; }
          .stat-value { font-size: 24px; }
          
          .activity-section { padding: 20px; border-radius: 24px; }
          .requests-grid-v2 { grid-template-columns: 1fr; gap: 16px; }

          /* Modal Mobile Optimization (Bottom Sheet Style) */
          .premium-modal-overlay { 
            padding: 0; 
            align-items: flex-end; 
          }
          
          .premium-modal-container { 
            height: 94vh; 
            border-radius: 32px 32px 0 0; 
            flex-direction: column;
            animation: sheetUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }
          @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          
          .modal-top-nav { 
            padding: 16px 20px; 
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 12px;
            background: white;
            z-index: 10;
          }
          
          .search-box-v2 { 
            flex: 1;
            width: auto;
            padding: 2px 12px;
            border-radius: 12px;
          }
          .search-box-v2 input { padding: 10px 0; font-size: 14px; }
          
          .btn-close-modal { 
            width: 40px;
            height: 40px;
            flex-shrink: 0;
            background: #f1f5f9;
          }
          
          .catalog-grid-v2 { 
            padding: 16px; 
            grid-template-columns: repeat(2, 1fr); 
            gap: 12px; 
          }
          
          .cart-area { 
            width: 100%; 
            height: auto;
            max-height: 40%; 
            border-left: none; 
            border-top: 1px solid #f1f5f9; 
            box-shadow: 0 -10px 30px rgba(0,0,0,0.1);
            overflow-y: auto;
          }
          
          .cart-head-v2 { padding: 16px 20px; }
          .cart-head-v2 h3 { font-size: 16px; }
          
          .cart-items-v2 { padding: 0 20px 10px 20px; }
          .cart-card-v2 { padding: 10px; margin-bottom: 12px; gap: 12px; }
          .cart-item-img-v2 { width: 48px; height: 48px; border-radius: 10px; }
          .ci-top h5 { font-size: 12px; }
          
          .cart-footer-v2 { padding: 20px; }
          .btn-submit-restock { padding: 16px; font-size: 15px; border-radius: 14px; }
          .summary-line.main { font-size: 16px; margin-top: 8px; padding-top: 8px; }
        }

        @media (min-width: 769px) and (max-width: 1100px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .premium-modal-container { max-width: 95%; height: 90vh; }
          .cart-area { width: 320px; }
        }
      `}</style>
    </div>
  );
}
