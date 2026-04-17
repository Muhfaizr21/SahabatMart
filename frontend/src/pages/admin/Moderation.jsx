import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, TablePanel, idr, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

export default function AdminModeration() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/products?status=pending&search=${search}`)
      .then(d => setProducts(d.data || []))
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const moderate = (id, status, note) => {
    if (!window.confirm('Konfirmasi tindakan moderasi ini?')) return;
    setLoading(true);
    fetchJson(`${API}/products/moderate`, { method:'PUT', body:JSON.stringify({id,status,note}) })
      .then(load).catch(e => alert(e.message));
  };

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Moderation Queue" subtitle="Tinjau dan validasi produk baru sebelum dipublikasikan.">
        <div style={A.searchWrap}>
          <i className="bx bx-search" style={A.searchIcon} />
          <input style={A.searchInput} placeholder="Cari nama produk..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} />
        </div>
        <button style={A.btnGhost} onClick={load}><i className="bx bx-refresh" /></button>
      </PageHeader>

      {products.length > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', background:'#fffbeb', borderRadius:14, border:'1px solid #fde68a' }}>
          <div style={{ width:40, height:40, borderRadius:11, background:'#f59e0b', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <i className="bx bxs-bell-ring" style={{ fontSize:20, color:'#fff' }} />
          </div>
          <div>
            <div style={{ fontSize:13.5, fontWeight:800, color:'#92400e' }}>Moderasi Antrian Terbuka</div>
            <div style={{ fontSize:12, color:'#b45309' }}><strong>{products.length} produk</strong> menunggu tinjauan administrator.</div>
          </div>
        </div>
      )}

      <TablePanel loading={loading}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:680 }}>
          <thead>
            <tr>
              {['Produk','Toko','Harga','Aksi Moderasi'].map((h,i)=>(
                <th key={h} style={{ ...A.th, textAlign:i===3?'right':'left', paddingLeft:i===0?24:16, paddingRight:i===3?24:16 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={4} style={{ padding:'64px', textAlign:'center', color:'#94a3b8' }}>
                <i className="bx bxs-check-shield" style={{ fontSize:52, display:'block', marginBottom:12, opacity:0.2, color:'#10b981' }} />
                <div style={{ fontWeight:700, fontSize:15, color:'#475569', marginBottom:4 }}>Semua Bersih!</div>
                <div style={{ fontSize:13 }}>Tidak ada produk dalam antrian moderasi.</div>
              </td></tr>
            ) : products.map((p, idx) => (
              <tr key={p.id}
                style={{ background:idx%2===0?'#fff':'#fafafa' }}
                onMouseEnter={e=>e.currentTarget.style.background='#f5f7ff'}
                onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'#fff':'#fafafa'}
              >
                <td style={{ ...A.td, paddingLeft:24 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <img src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=eef2ff&color=6366f1`} alt="" style={{ width:48, height:48, borderRadius:10, objectFit:'cover', border:'1px solid #f1f5f9', flexShrink:0 }} />
                    <div>
                      <div style={{ fontWeight:700, color:'#0f172a', fontSize:14 }}>{p.name}</div>
                      <div style={{ fontSize:11, fontFamily:'monospace', color:'#94a3b8' }}>#{p.id?.slice(0,8).toUpperCase()}</div>
                    </div>
                  </div>
                </td>
                <td style={A.td}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background:'#eff6ff', color:'#2563eb', fontSize:12, fontWeight:700 }}>
                    <i className="bx bx-store" style={{ fontSize:13 }} />{p.store_name||'Platform'}
                  </span>
                </td>
                <td style={A.td}><span style={{ fontWeight:800, color:'#0f172a', fontSize:15 }}>{idr(p.price)}</span></td>
                <td style={{ ...A.td, paddingRight:24, textAlign:'right' }}>
                  <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                    <button
                      onClick={() => moderate(p.id, 'active', 'Disetujui Admin')}
                      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:11, border:'none', background:'#f0fdf4', color:'#16a34a', fontSize:12.5, fontWeight:700, cursor:'pointer' }}
                    >
                      <i className="bx bx-check-circle" style={{ fontSize:16 }} /> Setujui
                    </button>
                    <button
                      onClick={() => moderate(p.id, 'taken_down', 'Tidak memenuhi syarat')}
                      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:11, border:'none', background:'#fff1f2', color:'#dc2626', fontSize:12.5, fontWeight:700, cursor:'pointer' }}
                    >
                      <i className="bx bx-x-circle" style={{ fontSize:16 }} /> Tolak
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
