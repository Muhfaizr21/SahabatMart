import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchJson, MERCHANT_API_BASE, formatImage } from '../../lib/api';
import { PageHeader, TablePanel, A, idr, statusBadge } from '../../lib/adminStyles.jsx';

export default function MerchantProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchJson(`${MERCHANT_API_BASE}/products`);
      setProducts(data.data || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus produk ini secara permanen?')) return;
    try {
      await fetchJson(`${MERCHANT_API_BASE}/products/delete?id=${id}`, { method: 'DELETE' });
      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  const filteredProducts = products.filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Luxury Inventory" subtitle="Manage and curate your high-end collection.">
        <Link to="/merchant/products/add" style={A.btnPrimary}>
           <i className="bx bx-plus-circle" /> New Masterpiece
        </Link>
      </PageHeader>

      <div style={{ ...A.card, padding: 24, display: 'flex', gap: 16 }}>
         <div style={{ flex: 1, position: 'relative' }}>
           <i className="bx bx-search" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 20 }} />
           <input 
             type="text" 
             style={{ ...A.input, paddingLeft: 48 }} 
             placeholder="Search by name or category..." 
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
         </div>
      </div>

      <div style={A.card}>
        <TablePanel loading={loading}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr>
                <th style={{ ...A.th, paddingLeft: 24, width: '40%' }}>PRODUCT DETAIL</th>
                <th style={A.th}>CATEGORY</th>
                <th style={A.th}>PRICING</th>
                <th style={A.th}>STOCK</th>
                <th style={A.th}>STATUS</th>
                <th style={{ ...A.th, paddingRight: 24, textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 && !loading ? (
                 <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>No products found. Start by adding your first luxury item.</td></tr>
              ) : filteredProducts.map((p, i) => (
                 <tr key={p.id} style={{ borderBottom: i === filteredProducts.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
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
                       <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.stock > 10 ? '#10b981' : '#f59e0b' }} />
                       <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>{p.stock} Units</span>
                     </div>
                   </td>
                   <td style={A.td}>
                     <span style={statusBadge(p.status === 'active' ? 'active' : p.status === 'pending' ? 'pending' : 'error')}>
                       {p.status || 'pending'}
                     </span>
                   </td>
                   <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                     <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                       <Link to={`/merchant/products/edit/${p.id}`} style={{ ...A.btnGhost, padding: '8px 12px' }}>
                         <i className="bx bx-edit" style={{ fontSize: 16 }} />
                       </Link>
                       <button style={{ ...A.btnGhost, padding: '8px 12px', color: '#ef4444' }} onClick={() => handleDelete(p.id)}>
                         <i className="bx bx-trash" style={{ fontSize: 16 }} />
                       </button>
                     </div>
                   </td>
                 </tr>
              ))}
            </tbody>
          </table>
        </TablePanel>
      </div>
    </div>
  );
}
