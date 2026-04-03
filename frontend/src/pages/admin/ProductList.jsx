import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

/* ─── Shared Styles ─────────────────────────────────────── */
const S = {
  page: { fontFamily: "'Inter', sans-serif" },
  card: { background: '#fff', borderRadius: 16, border: '1px solid #f0f0f5', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' },
  cardHeader: { padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  tableTitle: { fontSize: 16, fontWeight: 700, color: '#0f172a' },
  tableSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  searchWrap: { position: 'relative' },
  searchInput: { paddingLeft: 36, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#334155', background: '#f8fafc', outline: 'none', width: 220 },
  searchIcon: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 17 },
  filterTab: (active) => ({
    padding: '7px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: active ? '#4361ee' : 'transparent', color: active ? '#fff' : '#64748b', transition: 'all 0.15s',
  }),
  thCell: { padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.6px', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', background: '#f8fafc' },
  tdCell: { padding: '14px 16px', borderBottom: '1px solid #f8fafc', verticalAlign: 'middle' },
  avatar: { width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid #f1f5f9', background: '#f8fafc' },
  productName: { fontSize: 14, fontWeight: 600, color: '#0f172a' },
  productId: { fontSize: 11.5, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 },
  storePill: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 600 },
  actionBtn: (variant) => {
    const map = { edit: { bg: '#eff6ff', color: '#2563eb' }, hide: { bg: '#fef3c7', color: '#92400e' }, show: { bg: '#f0fdf4', color: '#16a34a' }, del: { bg: '#fff1f2', color: '#e11d48' } };
    const s = map[variant];
    return { width: 34, height: 34, borderRadius: 9, border: 'none', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 17, transition: 'opacity 0.15s', flexShrink: 0 };
  },
};

const StatusDot = ({ status }) => {
  const map = {
    active:     { bg: '#d1fae5', color: '#065f46', dot: '#10b981', label: 'Aktif' },
    taken_down: { bg: '#ffe4e6', color: '#9f1239', dot: '#f43f5e', label: 'Ditarik' },
    pending:    { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b', label: 'Pending' },
  };
  const s = map[status] || { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8', label: status };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: s.bg, color: s.color, fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {s.label}
    </span>
  );
};

const FILTER_TABS = [
  { value: '', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'taken_down', label: 'Ditarik' },
  { value: 'pending', label: 'Pending' },
];

export default function AdminProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadProducts = () => {
    setLoading(true);
    fetchJson(`${API}/products?status=${statusFilter}&search=${search}`)
      .then(d => setProducts(d.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProducts(); }, [statusFilter]);

  const deleteProduct = (id) => {
    if (!window.confirm('Hapus produk ini secara permanen?')) return;
    setLoading(true);
    fetchJson(`${API}/products/delete?id=${id}`, { method: 'DELETE' })
      .then(() => loadProducts())
      .catch(err => alert(err.message));
  };

  const toggleStatus = (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'taken_down' : 'active';
    setLoading(true);
    fetchJson(`${API}/products/moderate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: nextStatus, note: 'Toggled via Super Admin' })
    }).then(() => loadProducts());
  };

  return (
    <div style={S.page} className="fade-in">
      {/* Breadcrumb */}
      <div className="d-none d-sm-flex align-items-center justify-content-between mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Product Catalog</span>
          <i className="bx bx-chevron-right" style={{ color: '#cbd5e1', fontSize: 20 }} />
          <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>Monitoring</span>
        </div>
        <Link to="/admin/products/add" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: '#4361ee', color: '#fff', fontSize: 13.5, fontWeight: 600, textDecoration: 'none', border: 'none' }}>
          <i className="bx bx-plus" style={{ fontSize: 18 }} />
          Tambah Produk
        </Link>
      </div>

      <div style={S.card}>
        {/* Header */}
        <div style={S.cardHeader}>
          <div>
            <div style={S.tableTitle}>Master Katalog</div>
            <div style={S.tableSub}>{products.length} produk ditemukan</div>
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
                onKeyDown={e => e.key === 'Enter' && loadProducts()}
              />
            </div>
            <button onClick={loadProducts} style={{ ...S.actionBtn('edit'), width: 'auto', padding: '0 12px', fontSize: 13, fontWeight: 600, gap: 6, display: 'flex' }}>
              <i className="bx bx-refresh" style={{ fontSize: 18 }} /> Refresh
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 4 }}>
          {FILTER_TABS.map(tab => (
            <button key={tab.value} onClick={() => setStatusFilter(tab.value)} style={S.filterTab(statusFilter === tab.value)}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="spinner-border" style={{ color: '#4361ee', width: 32, height: 32, borderWidth: 3 }} />
            <div style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>Memuat katalog produk...</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead>
                <tr>
                  {[['Produk', 'left', 24], ['Merchant', 'left', 16], ['Kategori', 'left', 16], ['Harga & Status', 'left', 16], ['Ditambahkan', 'left', 16], ['Aksi', 'right', 24]].map(([h, align, pl]) => (
                    <th key={h} style={{ ...S.thCell, textAlign: align, paddingLeft: pl, paddingRight: h === 'Aksi' ? 24 : 16 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '64px 0', color: '#94a3b8' }}>
                      <i className="bx bx-package" style={{ fontSize: 48, display: 'block', marginBottom: 12, opacity: 0.3 }} />
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#475569', marginBottom: 6 }}>Katalog kosong</div>
                      <div style={{ fontSize: 13 }}>Tidak ada produk yang sesuai dengan filter.</div>
                    </td>
                  </tr>
                ) : products.map((p, idx) => (
                  <tr key={p.id}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                  >
                    {/* Produk */}
                    <td style={{ ...S.tdCell, paddingLeft: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img
                          src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=e0e7ff&color=4361ee&size=100`}
                          style={S.avatar} alt=""
                        />
                        <div>
                          <div style={S.productName}>{p.name}</div>
                          <div style={S.productId}>#{p.id.slice(0, 8).toUpperCase()}</div>
                        </div>
                      </div>
                    </td>

                    {/* Merchant */}
                    <td style={S.tdCell}>
                      <span style={S.storePill}>
                        <i className="bx bx-store" style={{ fontSize: 13 }} />
                        {p.store_name || 'Official'}
                      </span>
                    </td>

                    {/* Kategori */}
                    <td style={S.tdCell}>
                      <span style={{ fontSize: 13.5, color: '#475569', fontWeight: 500 }}>
                        {p.category || <span style={{ color: '#cbd5e1' }}>—</span>}
                      </span>
                    </td>

                    {/* Harga & Status */}
                    <td style={S.tdCell}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 5 }}>{fmt(p.price)}</div>
                      <StatusDot status={p.status} />
                    </td>

                    {/* Tanggal */}
                    <td style={S.tdCell}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#334155' }}>
                        {new Date(p.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {new Date(p.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Aksi */}
                    <td style={{ ...S.tdCell, paddingRight: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <Link to={`/admin/products/edit?id=${p.id}`} style={{ ...S.actionBtn('edit'), textDecoration: 'none' }} title="Edit Produk">
                          <i className="bx bx-pencil" />
                        </Link>
                        <button
                          style={S.actionBtn(p.status === 'active' ? 'hide' : 'show')}
                          onClick={() => toggleStatus(p.id, p.status)}
                          title={p.status === 'active' ? 'Tarik Produk' : 'Aktifkan Produk'}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          <i className={`bx ${p.status === 'active' ? 'bx-hide' : 'bx-show'}`} />
                        </button>
                        <button
                          style={S.actionBtn('del')}
                          onClick={() => deleteProduct(p.id)}
                          title="Hapus Produk"
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          <i className="bx bx-trash" />
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
              Total <strong style={{ color: '#475569' }}>{products.length}</strong> produk
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
