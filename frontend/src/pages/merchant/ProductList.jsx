import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchJson, MERCHANT_API_BASE, PUBLIC_API_BASE, formatImage } from '../../lib/api';
import { PageHeader, TablePanel, A, idr, statusBadge } from '../../lib/adminStyles.jsx';

export default function MerchantInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  
  // Pagination States
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { loadProducts(1); }, [search, category, stockStatus]);

  const loadCategories = async () => {
    try {
      const data = await fetchJson(`${PUBLIC_API_BASE}/categories`);
      // API returns { data: [...] }
      setCategories(data.data || data || []);
    } catch (err) { console.error('Failed to load categories'); }
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
    } catch (err) {
      console.error('Failed to load products:', err);
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
               ) : products.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: i === products.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <td style={{ ...A.td, paddingLeft: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <img src={formatImage(p.image)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{p.name || 'Unnamed Product'}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>SKU: {String(p.id || '').split('-')[0].toUpperCase()}</div>
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
    </div>
  );
}
