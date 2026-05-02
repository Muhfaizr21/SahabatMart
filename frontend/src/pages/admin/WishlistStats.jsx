import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import { PageHeader, TablePanel, idr, fmtDate, A } from '../../lib/adminStyles.jsx';
import toast from 'react-hot-toast';

const API = ADMIN_API_BASE;

export default function WishlistStats() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/wishlist/stats`)
      .then(data => {
        setStats(data || []);
      })
      .catch(err => {
        console.error("WISH-FETCH-ERROR:", err);
        if (err.message === "Load failed") {
          toast.error('Gagal terhubung ke server (CORS/Down)');
        } else {
          toast.error('Gagal mengambil data wishlist: ' + err.message);
        }
      })
      .finally(() => setLoading(false));
  };

  const formatUserNames = (names) => {
    if (!names) return '-';
    const arr = names.split(', ');
    if (arr.length <= 2) return names;
    return `${arr[0]}, ${arr[1]} dan ${arr.length - 2} lainnya`;
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={A.page} className="fade-in">
      <PageHeader 
        title="Market Insight: Wishlist" 
        subtitle="Analisis produk yang paling banyak diinginkan oleh pelanggan untuk strategi stok."
      >
        <button style={A.btnGhost} onClick={load}><i className="bx bx-refresh" /> Refresh</button>
      </PageHeader>

      <TablePanel
        loading={loading}
        toolbar={
          <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
            {stats.length} produk dalam radar minat
          </span>
        }
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr>
              {['Peringkat', 'Produk', 'Merchant', 'Harga', 'Total Wishlist', 'Daftar Peminat', 'Tingkat Minat'].map((h, i) => (
                <th key={i} style={{ ...A.th, textAlign: i === 0 || i === 4 ? 'center' : 'left', paddingLeft: i === 0 ? 24 : 16, paddingRight: 16 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <i className="bx bx-heart" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.3 }} />
                Belum ada data wishlist yang terkumpul.
              </td></tr>
            ) : stats.map((s, idx) => (
              <tr key={s.product_id}
                style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
              >
                <td style={{ ...A.td, paddingLeft: 24, textAlign: 'center' }}>
                  <div style={{ 
                    width: 32, height: 32, borderRadius: '50%', 
                    background: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#d97706' : '#f1f5f9',
                    color: idx < 3 ? '#fff' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto', fontSize: 13, fontWeight: 900
                  }}>
                    {idx + 1}
                  </div>
                </td>
                <td style={A.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img 
                      src={formatImage(s.image)} 
                      alt={s.product_name}
                      style={{ width: 44, height: 44, borderRadius: 10, objectCover: 'cover', background: '#f8fafc' }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, lineHeight: '1.2' }}>{s.product_name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>ID: {s.product_id?.slice(0,8)}</div>
                    </div>
                  </div>
                </td>
                <td style={A.td}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 700 }}>
                    <i className="bx bx-store" style={{ fontSize: 12 }} />{s.store_name}
                  </span>
                </td>
                <td style={A.td}>
                  <div style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>{idr(s.price)}</div>
                </td>
                <td style={{ ...A.td, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <i className="bx bxs-heart" style={{ color: '#ec4899', fontSize: 14 }} />
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 16 }}>{s.count}</span>
                  </div>
                </td>
                <td style={A.td}>
                  <div style={{ fontSize: 11, color: '#64748b', maxWidth: 180 }} title={s.user_names}>
                    <i className="bx bx-user" style={{ marginRight: 4, color: '#94a3b8' }} />
                    {formatUserNames(s.user_names)}
                  </div>
                </td>
                <td style={A.td}>
                  <div style={{ width: '100%', maxWidth: 120 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4, fontWeight: 800, color: '#94a3b8' }}>
                      <span>PROGRESS</span>
                      <span style={{ color: '#0f172a' }}>{Math.min(100, (s.count / (stats[0].count || 1)) * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ width: '100%', height: 6, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${(s.count / (stats[0].count || 1)) * 100}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, #ec4899, #f43f5e)',
                        borderRadius: 3
                      }} />
                    </div>
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
