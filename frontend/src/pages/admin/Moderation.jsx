import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

/* ─── Styles ─────────────────────────────────────────────── */
const S = {
  page: { fontFamily: "'Inter', sans-serif" },
  alertBox: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
    background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, marginBottom: 20,
  },
  card: { background: '#fff', borderRadius: 16, border: '1px solid #f0f0f5', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' },
  cardHeader: { padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  tableTitle: { fontSize: 16, fontWeight: 700, color: '#0f172a' },
  tableSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  searchWrap: { position: 'relative' },
  searchInput: { paddingLeft: 36, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#334155', background: '#f8fafc', outline: 'none', width: 220 },
  searchIcon: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 17 },
  thCell: { padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.6px', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', background: '#f8fafc' },
  tdCell: { padding: '14px 16px', borderBottom: '1px solid #f8fafc', verticalAlign: 'middle' },
  avatar: { width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid #f1f5f9', background: '#f8fafc' },
  approveBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: 'none', background: '#d1fae5', color: '#065f46', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' },
  rejectBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: 'none', background: '#fff1f2', color: '#be123c', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' },
};

export default function AdminModeration() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadPending = () => {
    setLoading(true);
    fetchJson(`${API}/products?status=pending&search=${search}`)
      .then(d => setProducts(d.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPending(); }, []);

  const moderate = (id, status, note) => {
    if (!window.confirm('Konfirmasi tindakan moderasi ini?')) return;
    setLoading(true);
    fetchJson(`${API}/products/moderate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, note })
    }).then(() => loadPending())
      .catch(err => alert(err.message));
  };

  return (
    <div style={S.page} className="fade-in">
      {/* Breadcrumb */}
      <div className="d-none d-sm-flex align-items-center gap-2 mb-4">
        <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Quality Control</span>
        <i className="bx bx-chevron-right" style={{ color: '#cbd5e1', fontSize: 20 }} />
        <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>Moderasi Konten</span>
      </div>

      {/* Alert Banner */}
      <div style={S.alertBox}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
          <i className="bx bx-shield-quarter" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>Antrian Moderasi Aktif</div>
          <div style={{ fontSize: 12.5, color: '#b45309', marginTop: 2 }}>
            Semua produk yang disubmit oleh merchant membutuhkan persetujuan sebelum ditampilkan ke storefront.
          </div>
        </div>
        <span style={{ padding: '4px 12px', borderRadius: 20, background: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: 700, border: '1px solid #fde68a', whiteSpace: 'nowrap' }}>
          {products.length} Menunggu
        </span>
      </div>

      <div style={S.card}>
        {/* Header */}
        <div style={S.cardHeader}>
          <div>
            <div style={S.tableTitle}>Produk Menunggu Review</div>
            <div style={S.tableSub}>Tinjau dan berikan keputusan untuk setiap produk</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={S.searchWrap}>
              <i className="bx bx-search" style={S.searchIcon} />
              <input
                type="search"
                style={S.searchInput}
                placeholder="Cari produk..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadPending()}
              />
            </div>
            <button onClick={loadPending} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <i className="bx bx-refresh" style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="spinner-border" style={{ color: '#4361ee', width: 32, height: 32, borderWidth: 3 }} />
            <div style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>Memuat antrian moderasi...</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead>
                <tr>
                  {[['Produk', 'left', 24], ['Merchant', 'left', 16], ['Trust Score', 'left', 16], ['Harga', 'left', 16], ['Keputusan', 'right', 24]].map(([h, align, pl]) => (
                    <th key={h} style={{ ...S.thCell, textAlign: align, paddingLeft: pl, paddingRight: h === 'Keputusan' ? 24 : 16 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '64px 0', color: '#94a3b8' }}>
                      <i className="bx bx-check-shield" style={{ fontSize: 48, display: 'block', marginBottom: 12, opacity: 0.3 }} />
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#475569', marginBottom: 6 }}>Antrian bersih</div>
                      <div style={{ fontSize: 13 }}>Tidak ada produk yang menunggu review saat ini.</div>
                    </td>
                  </tr>
                ) : products.map((p, idx) => (
                  <tr key={p.id}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fffdf0'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                  >
                    {/* Produk */}
                    <td style={{ ...S.tdCell, paddingLeft: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img
                          src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=fef3c7&color=b45309&size=100`}
                          style={S.avatar} alt=""
                        />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                          <div style={{ fontSize: 11.5, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>
                            #{p.id.slice(0, 8).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Merchant */}
                    <td style={S.tdCell}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 600 }}>
                        <i className="bx bx-store" style={{ fontSize: 13 }} />
                        {p.store_name || '—'}
                      </span>
                    </td>

                    {/* Trust Score */}
                    <td style={S.tdCell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
                          <div style={{ width: '85%', height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', width: 34, textAlign: 'right' }}>85%</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Skor kepercayaan optimal</div>
                    </td>

                    {/* Harga */}
                    <td style={S.tdCell}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{fmt(p.price)}</div>
                    </td>

                    {/* Actions */}
                    <td style={{ ...S.tdCell, paddingRight: 24, textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          style={S.approveBtn}
                          onClick={() => moderate(p.id, 'active', 'Disetujui oleh Admin')}
                          onMouseEnter={e => { e.currentTarget.style.background = '#a7f3d0'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#d1fae5'; }}
                        >
                          <i className="bx bx-check-circle" style={{ fontSize: 16 }} /> Setujui
                        </button>
                        <button
                          style={S.rejectBtn}
                          onClick={() => moderate(p.id, 'taken_down', 'Melanggar kebijakan platform')}
                          onMouseEnter={e => { e.currentTarget.style.background = '#fecdd3'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; }}
                        >
                          <i className="bx bx-x-circle" style={{ fontSize: 16 }} /> Tolak
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!loading && products.length > 0 && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>
              <strong style={{ color: '#d97706' }}>{products.length}</strong> produk menunggu keputusan
            </span>
            <span style={{ fontSize: 12, color: '#cbd5e1' }}>
              Diperbarui: {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
