import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, statusBadge, idr, fmtDate, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

const STATUS_TABS = [
  { val: '', label: 'Semua' },
  { val: 'active', label: 'Aktif' },
  { val: 'taken_down', label: 'Ditarik' },
  { val: 'pending', label: 'Pending' },
];

const STATUS_CFG = {
  active:     { label: 'Aktif',    next: 'taken_down', actionLabel: 'Tarik dari toko', icon: 'bx-hide' },
  taken_down: { label: 'Ditarik', next: 'active',     actionLabel: 'Aktifkan',        icon: 'bx-show' },
  pending:    { label: 'Pending',  next: 'active',     actionLabel: 'Aktifkan',        icon: 'bx-show' },
};

// Dropdown state per row
function ActionDropdown({ product, onToggle, onDelete }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CFG[product.status] || { actionLabel: 'Ubah', icon: 'bx-transfer', next: 'active' };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
          background: '#fff', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: '#334155',
        }}
      >
        Kelola <i className="bx bx-chevron-down" style={{ fontSize: 16 }} />
      </button>
      {open && (
        <>
          {/* Backdrop */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: '110%', zIndex: 50,
            background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9',
            boxShadow: '0 16px 40px rgba(0,0,0,0.12)', minWidth: 180, overflow: 'hidden',
            animation: 'dropIn 0.15s ease',
          }}>
            <Link
              to={`/admin/products/edit?id=${product.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', textDecoration: 'none', color: '#334155', fontSize: 13.5, fontWeight: 500 }}
              onClick={() => setOpen(false)}
            >
              <i className="bx bx-pencil" style={{ fontSize: 16, color: '#6366f1' }} /> Edit Detail
            </Link>
            <button
              onClick={() => { onToggle(product.id, product.status); setOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', border: 'none', background: 'none', cursor: 'pointer', color: '#334155', fontSize: 13.5, fontWeight: 500, textAlign: 'left' }}
            >
              <i className={`bx ${cfg.icon}`} style={{ fontSize: 16, color: '#f59e0b' }} /> {cfg.actionLabel}
            </button>
            <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
            <button
              onClick={() => { onDelete(product.id); setOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13.5, fontWeight: 500, textAlign: 'left' }}
            >
              <i className="bx bx-trash" style={{ fontSize: 16 }} /> Hapus Produk
            </button>
          </div>
        </>
      )}
      <style>{`@keyframes dropIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }`}</style>
    </div>
  );
}

export default function AdminProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/products?status=${tab}&search=${search}`)
      .then(d => setProducts(d || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);

  const del = (id) => {
    if (!window.confirm('Hapus produk ini secara permanen?')) return;
    setLoading(true);
    fetchJson(`${API}/products/delete?id=${id}`, { method: 'DELETE' })
      .then(load).catch(e => { alert(e.message); setLoading(false); });
  };

  const toggle = (id, status) => {
    const next = STATUS_CFG[status]?.next || 'active';
    setLoading(true);
    fetchJson(`${API}/products/moderate`, {
      method: 'PUT',
      body: JSON.stringify({ id, status: next, note: 'Toggled via Super Admin' }),
    }).then(load).catch(e => { alert(e.message); setLoading(false); });
  };

  const stats = useMemo(() => ({
    total:    products.length,
    active:   products.filter(p => p.status === 'active').length,
    takenDown:products.filter(p => p.status === 'taken_down').length,
    pending:  products.filter(p => p.status === 'pending').length,
  }), [products]);

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Product Catalog" subtitle="Kelola dan moderasi seluruh listing produk platform SahabatMart.">
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
        <button style={A.btnGhost} onClick={load}><i className="bx bx-refresh" /> Refresh</button>
        <Link to="/admin/products/add" style={A.btnPrimary}>
          <i className="bx bx-plus" /> Tambah Produk
        </Link>
      </PageHeader>

      <StatRow stats={[
        { label: 'Total Produk', val: stats.total,    icon: 'bxs-package',      color: '#6366f1' },
        { label: 'Aktif',        val: stats.active,   icon: 'bxs-check-circle', color: '#10b981' },
        { label: 'Ditarik',      val: stats.takenDown,icon: 'bxs-hide',         color: '#ef4444' },
        { label: 'Pending',      val: stats.pending,  icon: 'bxs-hourglass',    color: '#f59e0b' },
      ]} />

      <TablePanel
        loading={loading}
        tabs={STATUS_TABS.map(t => (
          <button key={t.val} style={A.tab(tab === t.val)} onClick={() => setTab(t.val)}>{t.label}</button>
        ))}
        toolbar={
          <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
            {loading ? 'Memuat...' : `${products.length} produk`}
          </span>
        }
      >
        {products.length === 0 && !loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px', gap: 12 }}>
            <i className="bx bxs-package" style={{ fontSize: 52, opacity: 0.15, color: '#6366f1' }} />
            <div style={{ fontWeight: 700, fontSize: 15, color: '#475569' }}>Tidak ada produk ditemukan</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>Ubah filter atau tambahkan produk baru.</div>
            <Link to="/admin/products/add" style={{ ...A.btnPrimary, textDecoration: 'none' }}>
              <i className="bx bx-plus" /> Tambah Produk
            </Link>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr>
                {['Produk', 'Merchant', 'Kategori', 'Harga', 'Status', 'Ditambahkan', ''].map((h, i) => (
                  <th key={i} style={{ ...A.th, textAlign: i === 6 ? 'right' : 'left', paddingLeft: i === 0 ? 24 : 16, paddingRight: i === 6 ? 24 : 16 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => {
                const sCfg = STATUS_CFG[p.status];
                return (
                  <tr key={p.id}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                  >
                    {/* Product */}
                    <td style={{ ...A.td, paddingLeft: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img
                          src={formatImage(p.image) || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'P')}&background=eef2ff&color=6366f1&size=80`}
                          alt={p.name}
                          style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid #f1f5f9', flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5, marginBottom: 2 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>SKU #{String(p.id).slice(0, 8).toUpperCase()}</div>
                        </div>
                      </div>
                    </td>
                    {/* Merchant */}
                    <td style={A.td}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 700 }}>
                        <i className="bx bx-store" style={{ fontSize: 13 }} />{p.store_name || 'Platform'}
                      </span>
                    </td>
                    {/* Category */}
                    <td style={A.td}>
                      <span style={{ fontSize: 13, color: '#475569' }}>{p.category || '—'}</span>
                    </td>
                    {/* Price */}
                    <td style={A.td}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{idr(p.price)}</div>
                      {p.old_price > p.price && (
                        <div style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'line-through' }}>{idr(p.old_price)}</div>
                      )}
                    </td>
                    {/* Status */}
                    <td style={A.td}>
                      <span style={statusBadge(p.status)}>{sCfg?.label || p.status}</span>
                    </td>
                    {/* Date */}
                    <td style={A.td}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{fmtDate(p.created_at)}</div>
                    </td>
                    {/* Actions */}
                    <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                      <ActionDropdown product={p} onToggle={toggle} onDelete={del} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && products.length > 0 && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, color: '#94a3b8' }}>
              Total <strong style={{ color: '#475569' }}>{products.length}</strong> produk
            </span>
            <span style={{ fontSize: 11, color: '#cbd5e1' }}>Updated {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
      </TablePanel>
    </div>
  );
}
