import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchJson, MERCHANT_API_BASE, PUBLIC_API_BASE, formatImage } from '../../lib/api';
import { PageHeader, TablePanel, A, idr, statusBadge, Modal } from '../../lib/adminStyles.jsx';

export default function MerchantInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');

  // Row Hover, Barcode, and Quick Info States
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [showQR, setShowQR] = useState(null);
  const [quickEditProduct, setQuickEditProduct] = useState(null);
  const [quickEditData, setQuickEditData] = useState({ name: '', sku: '', price: '', stock: '' });
  
  // Pagination States
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;


  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { loadProducts(1); }, [search, category, stockStatus]);

  const handlePrintLabel = (product) => {
    const dataToEncode = product.variant_sku || product.sku || String(product.id);
    const htmlContent = `
      <html>
        <head>
          <title>Cetak Label - ${product.name}</title>
          <style>
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 0; 
              padding: 20px; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh;
              box-sizing: border-box;
            }
            .barcode-card { 
              border: 1px dashed #ccc; 
              padding: 24px; 
              text-align: center; 
              border-radius: 12px; 
              max-width: 320px;
              width: 100%;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            }
            .barcode-card img { 
              width: 100%; 
              height: auto; 
              margin-bottom: 12px; 
            }
            .title { 
              font-size: 14px; 
              font-weight: 700; 
              margin-bottom: 8px; 
              color: #0f172a;
              line-height: 1.3;
            }
            .sku { 
              font-size: 11px; 
              color: #64748b; 
              font-weight: 600;
              font-family: monospace;
              letter-spacing: 0.05em;
            }
            @media print { 
              body { padding: 0; } 
              .barcode-card { 
                border: none; 
                box-shadow: none; 
                padding: 0;
                margin: auto;
              } 
            }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); window.close(); }, 1000)">
          <div class="barcode-card">
            <div class="title">${product.name}</div>
            <img src="https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(dataToEncode)}&code=Code128&dpi=96&translate-esc=on" alt="${dataToEncode}" />
            <div class="sku">${dataToEncode}</div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const loadCategories = async () => {
    try {
      const data = await fetchJson(`${PUBLIC_API_BASE}/categories`);
      // API returns { data: [...] }
      setCategories(data.data || data || []);
    } catch (_err) { console.error('Failed to load categories'); }
  };

  const loadProducts = async (targetPage = page) => {
    setLoading(true);
    setPage(targetPage);
    try {
      const query = new URLSearchParams({
        search,
        category_id: category,
        stock_status: stockStatus,
        page: targetPage,
        limit
      }).toString();

      const data = await fetchJson(`${MERCHANT_API_BASE}/products?${query}`);
      setProducts(data.data || []);
      setTotalPages(Math.ceil((data.total || 0) / limit) || 1);
    } catch (_err) {
      console.error('Failed to load products:', _err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (p) => {
    if (p < 1 || p > totalPages) return;
    loadProducts(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Stok & Inventori" subtitle="Pantau stok Anda dan ajukan penambahan stok ke Pusat.">
        <Link to="/merchant/restock" style={A.btnPrimary}>
           <i className="bx bx-repost" /> Ajukan Restok
        </Link>
      </PageHeader>

      {/* FILTER BAR */}
      <div style={{ ...A.card, padding: 24, display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24, border: '1px solid #f1f5f9' }}>
         <div style={{ flex: '1 1 300px', position: 'relative' }}>
           <i className="bx bx-search" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 20 }} />
           <input 
             type="text" 
             style={{ ...A.input, paddingLeft: 48 }} 
             placeholder="Cari nama produk..." 
             value={search}
             onChange={e => setSearch(e.target.value)}
           />
         </div>

         <div style={{ flex: '1 1 200px' }}>
           <select 
             style={A.input} 
             value={category}
             onChange={e => setCategory(e.target.value)}
           >
             <option value="">Semua Kategori</option>
             {categories.map(c => (
               <option key={c.id} value={c.id}>{c.name}</option>
             ))}
           </select>
         </div>

         <div style={{ flex: '1 1 200px' }}>
           <select 
             style={A.input} 
             value={stockStatus}
             onChange={e => setStockStatus(e.target.value)}
           >
             <option value="">Semua Status Stok</option>
             <option value="ready">Stok Tersedia {'>'} 5</option>
             <option value="low">Stok Menipis (1-5)</option>
             <option value="out">Stok Habis</option>
           </select>
         </div>
      </div>

      <div style={A.card}>
        <TablePanel loading={loading}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr>
                 <th style={{ ...A.th, paddingLeft: 24, width: '40%' }}>DETAIL PRODUK</th>
                 <th style={A.th}>KATEGORI</th>
                 <th style={A.th}>HARGA RETAIL</th>
                 <th style={A.th}>STOK SAYA</th>
                 <th style={{ ...A.th, paddingRight: 24, textAlign: 'right' }}>STATUS</th>
               </tr>
             </thead>
             <tbody>
                {products.length === 0 && !loading ? (
                   <tr><td colSpan={5} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Produk tidak ditemukan. Sesuaikan filter atau ajukan restok.</td></tr>
                ) : products.map((p, idx) => (
                   <tr key={p.id} 
                     style={{ borderBottom: idx === products.length - 1 ? 'none' : '1px solid #f1f5f9' }}
                     onMouseEnter={() => setHoveredRowId(p.id)}
                     onMouseLeave={() => setHoveredRowId(null)}
                   >
                     <td style={{ ...A.td, paddingLeft: 24 }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                         <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                           <img src={formatImage(p.image)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                         </div>
                         <div>
                           <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                             {p.name} {p.variant_name && <span style={{ color: '#4f46e5', marginLeft: 4 }}>- {p.variant_name}</span>}
                           </div>
                           <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                             SKU: {p.variant_sku || String(p.id || '').split('-')[0].toUpperCase()}
                           </div>
                           <div style={{ 
                             display: 'flex', 
                             flexWrap: 'wrap',
                             gap: 6, 
                             marginTop: 4, 
                             fontSize: 10.5, 
                             color: '#94a3b8',
                             visibility: hoveredRowId === p.id ? 'visible' : 'hidden',
                             minHeight: 16,
                             transition: 'visibility 0.1s',
                             lineHeight: '1.2'
                           }}>
                             <span>ID: <span style={{ fontFamily: 'monospace' }}>{p.id.slice(0, 8)}</span></span>
                             <span>|</span>
                             <button 
                               type="button"
                               onClick={() => {
                                 setQuickEditProduct(p);
                                 setQuickEditData({ 
                                   name: p.name, 
                                   sku: p.variant_sku || p.sku || String(p.id).split('-')[0].toUpperCase(), 
                                   price: p.price || 0, 
                                   stock: p.stock || 0 
                                 });
                               }} 
                               style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', cursor: 'pointer', fontSize: 10.5, fontWeight: 600 }}
                             >
                               Detail & Restok
                             </button>
                             <span>|</span>
                             <button 
                               type="button"
                               onClick={() => setShowQR(p)} 
                               style={{ background: 'none', border: 'none', padding: 0, color: '#ec4899', cursor: 'pointer', fontSize: 10.5, fontWeight: 600 }}
                             >
                               Barcode
                             </button>
                           </div>
                         </div>
                       </div>
                     </td>
                     <td style={A.td}>
                       <span style={{ background: '#eef2ff', color: '#4f46e5', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                         {p.category || 'General'}
                       </span>
                     </td>
                     <td style={{ ...A.td, fontWeight: 800, color: '#0f172a' }}>
                       {idr(p.price)}
                     </td>
                     <td style={A.td}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                         <div style={{ 
                           width: 8, height: 8, borderRadius: '50%', 
                           background: p.stock > 5 ? '#10b981' : p.stock > 0 ? '#f59e0b' : '#ef4444' 
                         }} />
                         <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>{p.stock} Unit</span>
                       </div>
                     </td>
                     <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                       <span style={statusBadge(p.status === 'active' ? 'active' : p.status === 'pending' ? 'pending' : 'error')}>
                         {p.status || 'pending'}
                       </span>
                     </td>
                   </tr>
                ))}
            </tbody>
          </table>
        </TablePanel>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 40, paddingBottom: 40 }}>
          <button 
            onClick={() => handlePageChange(page - 1)} 
            disabled={page === 1}
            style={{ ...A.btnGhost, padding: '8px 16px', opacity: page === 1 ? 0.5 : 1 }}
          >
            <i className="bx bx-chevron-left" /> Sebelumnya
          </button>
          
          <div style={{ display: 'flex', gap: 6 }}>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => handlePageChange(i + 1)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  transition: 'all 0.2s',
                  background: page === i + 1 ? '#4f46e5' : '#fff',
                  color: page === i + 1 ? '#fff' : '#64748b',
                  border: page === i + 1 ? 'none' : '1px solid #e2e8f0',
                  cursor: 'pointer'
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button 
            onClick={() => handlePageChange(page + 1)} 
            disabled={page === totalPages}
            style={{ ...A.btnGhost, padding: '8px 16px', opacity: page === totalPages ? 0.5 : 1 }}
          >
            Berikutnya <i className="bx bx-chevron-right" />
          </button>
        </div>
      )}

      {/* Modal: Barcode Product ID */}
      {showQR && (
        <Modal title="Barcode Product ID" onClose={() => setShowQR(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, padding: '8px 0', textAlign: 'center' }}>
            <div style={{ 
              padding: '24px 16px', 
              background: '#fff', 
              borderRadius: 24, 
              boxShadow: '0 25px 60px rgba(99,102,241,0.14), 0 8px 16px rgba(0,0,0,0.03)',
              border: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              width: '100%',
              maxWidth: 320,
              boxSizing: 'border-box'
            }}>
              <img 
                src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(showQR.variant_sku || showQR.sku || String(showQR.id))}&code=Code128&dpi=96&translate-esc=on`} 
                alt={showQR.variant_sku || showQR.sku || String(showQR.id)} 
                style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
              />
              <div style={{ 
                position: 'absolute', top: -12, right: -12, 
                width: 36, height: 36, borderRadius: '50%', background: '#6366f1',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(99,102,241,0.4)', fontSize: 18
              }}>
                <i className="bx bxs-badge-check" />
              </div>
            </div>

            <div style={{ width: '100%' }}>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1.2, margin: '0 0 12px 0' }}>{showQR.name}</h3>
              <div style={{ 
                display: 'inline-flex', alignItems: 'center', gap: 7, 
                padding: '7px 14px', borderRadius: 12, background: '#f8fafc',
                color: '#64748b', fontSize: 12, fontWeight: 800,
                fontFamily: 'monospace', border: '1px solid #f1f5f9'
              }}>
                <i className="bx bx-barcode-reader" style={{ fontSize: 16, color: '#6366f1' }} />
                {(showQR.variant_sku || showQR.sku || String(showQR.id)).toUpperCase()}
              </div>
            </div>

            <div style={{ width: '100%', height: 1, background: 'linear-gradient(90deg, transparent, #f1f5f9, transparent)' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, width: '100%' }}>
              <button 
                style={{ ...A.btnPrimary, height: 52, borderRadius: 16, justifyContent: 'center', fontSize: 14 }} 
                onClick={() => handlePrintLabel(showQR)}
              >
                <i className="bx bx-printer" style={{ fontSize: 18 }} /> Cetak Label
              </button>
              <button 
                style={{ ...A.btnGhost, height: 52, borderRadius: 16, justifyContent: 'center', fontSize: 14 }} 
                onClick={() => setShowQR(null)}
              >
                Tutup
              </button>
            </div>
            
            <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
              Tempelkan label ini pada produk fisik untuk mempercepat checkout di POS.
            </p>
          </div>
        </Modal>
      )}

      {/* Modal: Detail & Restok */}
      {quickEditProduct && (
        <Modal title="Detail Info & Restok" onClose={() => setQuickEditProduct(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', background: '#fff', border: '1px solid #e2e8f0' }}>
                <img src={formatImage(quickEditProduct.image)} alt={quickEditProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>{quickEditProduct.name}</h4>
                <span style={{ background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                  {quickEditProduct.category || 'General'}
                </span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, display: 'block' }}>Nama Produk</label>
              <input 
                type="text" 
                style={{ ...A.input, background: '#f1f5f9', cursor: 'not-allowed' }} 
                value={quickEditData.name} 
                readOnly 
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, display: 'block' }}>SKU</label>
                <input 
                  type="text" 
                  style={{ ...A.input, background: '#f1f5f9', cursor: 'not-allowed' }} 
                  value={quickEditData.sku} 
                  readOnly 
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, display: 'block' }}>Stok Saya</label>
                <input 
                  type="text" 
                  style={{ ...A.input, background: '#f1f5f9', cursor: 'not-allowed', fontWeight: 'bold' }} 
                  value={`${quickEditData.stock} Unit`} 
                  readOnly 
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, display: 'block' }}>Harga Retail</label>
              <input 
                type="text" 
                style={{ ...A.input, background: '#f1f5f9', cursor: 'not-allowed', fontWeight: 'bold' }} 
                value={idr(quickEditData.price)} 
                readOnly 
              />
            </div>

            <div style={{ padding: 12, background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 10, color: '#b45309', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <i className="bx bx-info-circle" style={{ fontSize: 18, marginTop: 1 }} />
              <div>
                Detail katalog produk dikelola langsung oleh Pusat. Silakan ajukan penambahan stok jika persediaan menipis.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <Link 
                to="/merchant/restock" 
                style={{ ...A.btnPrimary, flex: 1, justifyContent: 'center', height: 44, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
              >
                <i className="bx bx-repost" style={{ fontSize: 18, marginRight: 6 }} /> Ajukan Restok
              </Link>
              <button 
                onClick={() => setQuickEditProduct(null)} 
                style={{ ...A.btnGhost, flex: 1, justifyContent: 'center', height: 44 }}
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
