import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import { PageHeader, StatRow, TablePanel, statusBadge, idr, fmtDate, A, Modal } from '../../lib/adminStyles.jsx';
import { QRCodeCanvas } from 'qrcode.react';

const API = ADMIN_API_BASE;

const STATUS_TABS = [
  { val: '', label: 'Semua' },
  { val: 'active', label: 'Aktif' },
  { val: 'out_of_stock', label: 'Stok Habis' },
  { val: 'taken_down', label: 'Ditarik' },
  { val: 'pending', label: 'Pending' },
];

const STATUS_CFG = {
  active:     { label: 'Aktif',    next: 'taken_down', actionLabel: 'Tarik dari toko', icon: 'bx-hide' },
  taken_down: { label: 'Ditarik', next: 'active',     actionLabel: 'Aktifkan',        icon: 'bx-show' },
  pending:    { label: 'Pending',  next: 'active',     actionLabel: 'Aktifkan',        icon: 'bx-show' },
};

// Dropdown state per row
function ActionDropdown({ product, onToggle, onDelete, onViewQR }) {
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
              onClick={() => { onViewQR(product); setOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', border: 'none', background: 'none', cursor: 'pointer', color: '#334155', fontSize: 13.5, fontWeight: 500, textAlign: 'left' }}
            >
              <i className="bx bx-qr-scan" style={{ fontSize: 16, color: '#ec4899' }} /> Generate QR Code
            </button>
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
      <style>{`
        @keyframes dropIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
        .product-name-hover:hover { color: #6366f1 !important; text-decoration: underline; }
      `}</style>
    </div>
  );
}

export default function AdminProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');
  const [showQR, setShowQR] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const load = () => {
    setLoading(true);
    setSelectedIds([]); // Reset selection on reload
    fetchJson(`${API}/products?status=${tab}&search=${search}`)
      .then(d => setProducts(Array.isArray(d) ? d : (d?.data || [])))
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

  const bulkDelete = () => {
    if (!window.confirm(`Hapus ${selectedIds.length} produk terpilih secara permanen?`)) return;
    setLoading(true);
    fetchJson(`${API}/products/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids: selectedIds })
    }).then(load).catch(e => { alert(e.message); setLoading(false); });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) setSelectedIds([]);
    else setSelectedIds(products.map(p => p.id));
  };

  const toggle = (id, status) => {
    const next = STATUS_CFG[status]?.next || 'active';
    setLoading(true);
    fetchJson(`${API}/products/moderate`, {
      method: 'PUT',
      body: JSON.stringify({ id, status: next, note: 'Toggled via Super Admin' }),
    }).then(load).catch(e => { alert(e.message); setLoading(false); });
  };

  const stats = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    return {
      total:    list.length,
      active:   list.filter(p => p.status === 'active').length,
      takenDown:list.filter(p => p.status === 'taken_down').length,
      pending:  list.filter(p => p.status === 'pending').length,
    };
  }, [products]);

  return (
    <div style={A.page} className="fade-in">
      {showQR && (
        <Modal title="Digital Product ID" onClose={() => setShowQR(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, padding: '8px 0', textAlign: 'center' }}>
            {/* The QR Stage */}
            <div style={{ 
              padding: 24, 
              background: '#fff', 
              borderRadius: 36, 
              boxShadow: '0 25px 60px rgba(99,102,241,0.14), 0 8px 16px rgba(0,0,0,0.03)',
              border: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <QRCodeCanvas 
                value={showQR.id} 
                size={230} 
                level="H" 
                marginSize={1}
                fgColor="#0f172a"
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

            {/* Content Area */}
            <div style={{ width: '100%' }}>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1.2, margin: '0 0 12px 0' }}>{showQR.name}</h3>
              <div style={{ 
                display: 'inline-flex', alignItems: 'center', gap: 7, 
                padding: '7px 14px', borderRadius: 12, background: '#f8fafc',
                color: '#64748b', fontSize: 12, fontWeight: 800,
                fontFamily: 'monospace', border: '1px solid #f1f5f9'
              }}>
                <i className="bx bx-barcode-reader" style={{ fontSize: 16, color: '#6366f1' }} />
                #{String(showQR.id).toUpperCase()}
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: '100%', height: 1, background: 'linear-gradient(90deg, transparent, #f1f5f9, transparent)' }} />

            {/* Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, width: '100%' }}>
              <button 
                style={{ ...A.btnPrimary, height: 52, borderRadius: 16, justifyContent: 'center', fontSize: 14 }} 
                onClick={() => window.print()}
              >
                <i className="bx bx-printer" style={{ fontSize: 18 }} /> Print Label
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

      <PageHeader title="Product Catalog" subtitle="Kelola dan moderasi seluruh listing produk platform SahabatMart.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, width: '100%' }}>
          <div style={{ ...A.searchWrap, minWidth: 250, flex: 1 }}>
            <i className="bx bx-search" style={A.searchIcon} />
            <input
              style={A.searchInput}
              placeholder="Cari nama produk..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={{ ...A.btnGhost, flex: '1 1 auto' }} onClick={load}><i className="bx bx-refresh" /> Refresh</button>
            <Link to="/admin/products/add" style={{ ...A.btnPrimary, flex: '1 1 auto', textDecoration: 'none' }}>
              <i className="bx bx-plus" /> Tambah Produk
            </Link>
          </div>
        </div>
      </PageHeader>

      <StatRow stats={[
        { label: 'Total Produk', val: stats.total,    icon: 'bxs-package',      color: '#6366f1' },
        { label: 'Aktif',        val: stats.active,   icon: 'bxs-check-circle', color: '#10b981' },
        { label: 'Ditarik',      val: stats.takenDown,icon: 'bxs-hide',         color: '#ef4444' },
        { label: 'Pending',      val: stats.pending,  icon: 'bxs-hourglass',    color: '#f59e0b' },
      ]} />

      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9' }}>
        <TablePanel
          loading={loading}
          tabs={
            <div style={{ display: 'flex', overflowX: 'auto', gap: 10, paddingBottom: 4 }}>
              {STATUS_TABS.map(t => (
                <button key={t.val} style={{ ...A.tab(tab === t.val), whiteSpace: 'nowrap' }} onClick={() => setTab(t.val)}>{t.label}</button>
              ))}
            </div>
          }
          toolbar={
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {selectedIds.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 12px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fee2e2' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>{selectedIds.length} Terpilih</span>
                  <button 
                    onClick={bulkDelete}
                    style={{ ...A.btnPrimary, background: '#ef4444', height: 32, padding: '0 12px', fontSize: 12 }}
                  >
                    <i className="bx bx-trash" /> Hapus Terpilih
                  </button>
                </div>
              )}
              <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
                {loading ? 'Memuat...' : `${products.length} produk`}
              </span>
            </div>
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
                <th style={{ ...A.th, width: 40, paddingLeft: 24 }}>
                  <input 
                    type="checkbox" 
                    checked={products.length > 0 && selectedIds.length === products.length} 
                    onChange={toggleSelectAll}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                </th>
                {['Produk', 'Merchant', 'Kategori', 'Berat', 'Harga', 'Status', 'Ditambahkan', ''].map((h, i) => (
                  <th key={i} style={{ ...A.th, textAlign: i === 7 ? 'right' : 'left', paddingLeft: 16, paddingRight: i === 7 ? 24 : 16 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => {
                const sCfg = STATUS_CFG[p.status];
                const isSelected = selectedIds.includes(p.id);
                return (
                  <tr key={p.id}
                    style={{ background: isSelected ? '#f5f7ff' : (idx % 2 === 0 ? '#fff' : '#fafafa') }}
                    onMouseEnter={e => !isSelected && (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => !isSelected && (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa')}
                  >
                    <td style={{ ...A.td, paddingLeft: 24 }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => toggleSelect(p.id)}
                        style={{ width: 17, height: 17, cursor: 'pointer' }}
                      />
                    </td>
                    {/* Product */}
                    <td style={{ ...A.td }}>
                      <Link to={`/admin/products/edit?id=${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                        <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
                          <img
                            src={formatImage(p.image) || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'P')}&background=eef2ff&color=6366f1&size=80`}
                            alt={p.name}
                            style={{ width: '100%', height: '100%', borderRadius: 10, objectFit: 'cover', border: '1px solid #f1f5f9', transition: 'transform 0.2s' }}
                          />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5, marginBottom: 2 }} className="product-name-hover">{p.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
                            SKU #{String(p.id).slice(0, 8).toUpperCase()}
                            <button 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowQR(p); }}
                              style={{ color: '#ec4899', cursor: 'pointer', border: 'none', background: 'none', padding: 0, display: 'flex', alignItems: 'center' }}
                            >
                              <i className="bx bx-qr-scan" style={{ fontSize: 14 }} />
                            </button>
                          </div>
                        </div>
                      </Link>
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
                    {/* Weight */}
                    <td style={A.td}>
                      <span style={{ fontSize: 13, color: p.weight > 0 ? '#475569' : '#ef4444', fontWeight: p.weight > 0 ? 400 : 800 }}>
                        {p.weight || 0}g
                      </span>
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
                      {p.stock <= 0 ? (
                        <span style={statusBadge('out_of_stock')}>Stok Habis</span>
                      ) : (
                        <span style={statusBadge(p.status)}>{sCfg?.label || p.status}</span>
                      )}
                    </td>
                    {/* Date */}
                    <td style={A.td}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{fmtDate(p.created_at)}</div>
                    </td>
                    {/* Actions */}
                    <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                      <ActionDropdown product={p} onToggle={toggle} onDelete={del} onViewQR={setShowQR} />
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

    </div>
  );
}
