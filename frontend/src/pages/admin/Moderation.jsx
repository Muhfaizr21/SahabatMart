import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, TablePanel, idr, A, statusBadge } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

export default function AdminModeration() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/products?status=pending&search=${search}`)
      .then(d => setProducts(d.data || []))
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const moderate = (id, status, note) => {
    if (!window.confirm(`Konfirmasi untuk ${status === 'active' ? 'menyetujui' : 'menolak'} produk ini?`)) return;
    setProcessingId(id);
    fetchJson(`${API}/products/moderate`, { 
      method: 'PUT', 
      body: JSON.stringify({ id, status, note }) 
    })
      .then(() => {
        load();
      })
      .catch(e => alert(e.message))
      .finally(() => setProcessingId(null));
  };

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Product Guard & Moderation" subtitle="Pintu gerbang kualitas. Tinjau setiap aset yang didaftarkan merchant sebelum publikasi.">
        <div style={A.searchWrap}>
          <i className="bx bx-search" style={A.searchIcon} />
          <input 
            style={A.searchInput} 
            placeholder="Cari nama produk..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && load()} 
          />
        </div>
        <button style={A.btnGhost} onClick={load}><i className={`bx bx-refresh ${loading ? 'bx-spin' : ''}`} /></button>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ ...A.card, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ ...A.iconBox('#f59e0b'), background: 'rgba(245,158,11,0.1)' }}>
            <i className="bx bxs-hourglass" style={{ fontSize: 20 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Waiting Review</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{products.length} Items</div>
          </div>
        </div>
      </div>

      <TablePanel loading={loading}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead>
            <tr>
              {['Inventory Asset', 'Manufacturer/Merchant', 'Valuation', 'Category', 'Actions'].map((h, i) => (
                <th key={h} style={{ ...A.th, textAlign: i === 4 ? 'right' : 'left', paddingLeft: i === 0 ? 24 : 16, paddingRight: i === 4 ? 24 : 16 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '80px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ marginBottom: 16, opacity: 0.2 }}>
                  <i className="bx bxs-check-shield" style={{ fontSize: 64, color: '#10b981' }} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#475569', marginBottom: 4 }}>Antrian Bersih</div>
                <div style={{ fontSize: 13 }}>Semua produk merchant telah ditinjau dan divalidasi.</div>
              </td></tr>
            ) : products.map((p, idx) => (
              <tr key={p.id}
                style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
              >
                <td style={{ ...A.td, paddingLeft: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ position: 'relative' }}>
                      <img 
                        src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=eef2ff&color=6366f1`} 
                        alt="" 
                        style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', border: '1px solid #f1f5f9' }} 
                      />
                      <div style={{ position: 'absolute', bottom: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#f59e0b', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <i className="bx bx-time" style={{ fontSize: 10, color: '#fff' }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{p.name}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>UID: {p.id?.slice(0, 8)}</div>
                    </div>
                  </div>
                </td>
                <td style={A.td}>
                   <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: '#f0f4ff', color: '#4f46e5', fontSize: 11, fontWeight: 800 }}>
                      <i className="bx bx-store-alt" /> {p.store_name || 'Individual Merchant'}
                   </div>
                </td>
                <td style={A.td}><span style={{ fontWeight: 800, color: '#0f172a', fontSize: 15 }}>{idr(p.price)}</span></td>
                <td style={A.td}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: '#f1f5f9', color: '#64748b', fontSize: 11, fontWeight: 700 }}>
                    {p.category || 'Uncategorized'}
                  </div>
                </td>
                <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      disabled={processingId === p.id}
                      onClick={() => moderate(p.id, 'active', 'Asset verified as per platform luxury standards.')}
                      style={{ ...A.btnPrimary, background: '#ecfdf5', color: '#10b981', border: '1px solid #bbf7d0', boxShadow: 'none', padding: '7px 14px' }}
                    >
                      {processingId === p.id ? '...' : <><i className="bx bx-check-double" /> Approve</>}
                    </button>
                    <button
                      disabled={processingId === p.id}
                      onClick={() => moderate(p.id, 'taken_down', 'Asset failed to meet quality or safety requirements.')}
                      style={{ ...A.btnGhost, background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', padding: '7px 14px' }}
                    >
                      <i className="bx bx-x-circle" /> Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>
    </div>
  );
}
