import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { fetchJson, ADMIN_API_BASE } from '../../lib/api';

// ─── Design Tokens ─────────────────────────────
const C = {
  primary:  '#6366f1',
  primaryDark: '#4f46e5',
  green:    '#10b981',
  greenBg:  '#ecfdf5',
  greenText: '#065f46',
  amber:    '#f59e0b',
  amberBg:  '#fffbeb',
  amberText: '#92400e',
  red:      '#ef4444',
  redBg:    '#fef2f2',
  redText:  '#991b1b',
  bg:       '#f8fafc',
  card:     '#ffffff',
  border:   '#e2e8f0',
  muted:    '#64748b',
  text:     '#0f172a',
};

function formatRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function formatImage(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_BASE_URL || ''}${url}`;
}

// ─── Progress Bar component ─────────────────
function StockProgressBar({ inStock, lowStock, outOfStock }) {
  const total = inStock + lowStock + outOfStock || 1;
  const okPct = Math.max(0, Math.round((inStock - lowStock) / total * 100));
  const lowPct = Math.max(0, Math.round(lowStock / total * 100));
  const outPct = Math.max(0, Math.round(outOfStock / total * 100));

  return (
    <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', background: '#f1f5f9', width: '100%' }}>
      {okPct > 0 && <div style={{ width: `${okPct}%`, background: C.green }} title={`${okPct}% Aman`} />}
      {lowPct > 0 && <div style={{ width: `${lowPct}%`, background: C.amber }} title={`${lowPct}% Kritis`} />}
      {outPct > 0 && <div style={{ width: `${outPct}%`, background: C.red }} title={`${outPct}% Habis`} />}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────
function StockBadge({ status }) {
  const map = {
    available: { bg: C.greenBg, color: C.greenText, label: 'Tersedia', icon: 'bx-check-circle' },
    low:       { bg: C.amberBg, color: C.amberText, label: 'Kritis',   icon: 'bx-error' },
    out:       { bg: C.redBg,   color: C.redText,   label: 'Habis',    icon: 'bx-x-circle' },
  };
  const m = map[status] || map.available;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: m.bg, color: m.color }}>
      <i className={`bx ${m.icon}`} style={{ fontSize: 12 }} />
      {m.label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────
export default function MerchantStock() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(''); // '' | 'low' | 'out'
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [detailSearch, setDetailSearch] = useState('');
  const [detailFilter, setDetailFilter] = useState(''); // '' | 'low' | 'out'

  // Aggregated stats
  const [stats, setStats] = useState({ merchants: 0, totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filter) params.set('filter', filter);
      const res = await fetchJson(`${ADMIN_API_BASE}/merchants/stock-overview?${params}`);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setData(list);

      // Calculate aggregates
      let tP = 0, iS = 0, lS = 0, oS = 0;
      list.forEach(m => {
        tP += m.total_products;
        iS += m.in_stock;
        lS += m.low_stock;
        oS += m.out_of_stock;
      });
      setStats({ merchants: list.length, totalProducts: tP, inStock: iS, lowStock: lS, outOfStock: oS });
    } catch (err) {
      console.error('Failed to fetch stock overview', err);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  // Handle active merchant selection updates
  const activeMerchantData = selectedMerchant 
    ? data.find(m => m.merchant_id === selectedMerchant.merchant_id) || selectedMerchant
    : null;

  const getFilteredProducts = (merchant) => {
    if (!merchant) return [];
    return (merchant.products || []).filter(p => {
      const matchSearch = !detailSearch || 
        p.product_name.toLowerCase().includes(detailSearch.toLowerCase()) || 
        (p.sku || '').toLowerCase().includes(detailSearch.toLowerCase());
      const matchFilter = !detailFilter || p.status === detailFilter;
      return matchSearch && matchFilter;
    });
  };

  return (
    <div className="fade-in" style={{ padding: '0', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.2)' }}>
            <i className="bx bxs-bar-chart-alt-2" style={{ color: '#fff', fontSize: 24 }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: C.text, letterSpacing: '-0.5px' }}>Stok Monitor Merchant</h1>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Pantau ketersediaan dan tingkat kritis produk di setiap toko cabang</p>
          </div>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 28 }}>
        {[
          { label: 'Total Toko', value: stats.merchants, icon: 'bxs-store-alt', color: C.primary, bg: '#eef2ff' },
          { label: 'Total Produk Terdaftar', value: stats.totalProducts, icon: 'bxs-cube', color: '#0891b2', bg: '#ecfeff' },
          { label: 'Stok Aman', value: stats.inStock - stats.lowStock, icon: 'bx-shield-quarter', color: C.green, bg: C.greenBg },
          { label: 'Stok Kritis (≤5)', value: stats.lowStock, icon: 'bx-error', color: C.amber, bg: C.amberBg },
          { label: 'Stok Habis (0)', value: stats.outOfStock, icon: 'bx-x-circle', color: C.red, bg: C.redBg },
        ].map((s, idx) => (
          <div key={idx} style={{ background: C.card, borderRadius: 20, padding: '20px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', transition: 'transform 0.2s', cursor: 'default' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <div style={{ width: 48, height: 48, borderRadius: 14, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`bx ${s.icon}`} style={{ fontSize: 24, color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.text, lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ background: C.card, borderRadius: 20, padding: '18px 24px', border: `1px solid ${C.border}`, marginBottom: 28, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <i className="bx bx-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 18 }} />
          <input
            type="text"
            placeholder="Cari merchant atau nama toko cabang..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 42, paddingRight: 14, height: 42, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#f8fafc', transition: 'border-color 0.2s, background 0.2s' }}
            onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.background = '#fff'; }}
            onBlur={e => { e.target.style.borderColor = C.border; e.target.style.background = '#f8fafc'; }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { v: '',    label: 'Semua Toko',  icon: 'bx-list-ul' },
            { v: 'low', label: 'Toko Kritis', icon: 'bx-error', color: C.amber },
            { v: 'out', label: 'Toko Habis',  icon: 'bx-x-circle', color: C.red },
          ].map(f => (
            <button key={f.v} onClick={() => setFilter(f.v)} style={{
              padding: '10px 16px', borderRadius: 12, border: '1px solid',
              borderColor: filter === f.v ? (f.color || C.primary) : C.border,
              background: filter === f.v ? (f.color ? f.color + '15' : '#eef2ff') : '#fff',
              color: filter === f.v ? (f.color || C.primary) : C.muted,
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { if (filter !== f.v) e.currentTarget.style.borderColor = C.primary; }}
            onMouseLeave={e => { if (filter !== f.v) e.currentTarget.style.borderColor = C.border; }}
            >
              <i className={`bx ${f.icon}`} style={{ fontSize: 16 }} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content Grid ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${C.primary}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: C.muted, fontSize: 14, fontWeight: 500 }}>Mengambil data inventori merchant...</p>
        </div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: C.card, borderRadius: 24, border: `1px solid ${C.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.01)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <i className="bx bxs-store" style={{ fontSize: 32, color: C.muted }} />
          </div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 800, color: C.text }}>Toko Tidak Ditemukan</h3>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Tidak ada data stok toko cabang yang cocok dengan pencarian Anda.</p>
        </div>
      ) : (
        <div className="merchant-grid">
          {data.map(merchant => {
            const okCount = merchant.in_stock - merchant.low_stock;
            const healthPercent = merchant.total_products > 0 
              ? Math.round((okCount / merchant.total_products) * 100) 
              : 0;

            return (
              <div key={merchant.merchant_id} className="merchant-card">
                {/* Visual Accent for Health */}
                <div style={{ height: 4, width: '100%', background: healthPercent >= 80 ? C.green : healthPercent >= 50 ? C.amber : C.red }} />

                <div className="merchant-card-inner" style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column' }}>
                  {/* Card Header */}
                  <div className="card-header-area">
                    <div className="card-logo">
                      {merchant.logo_url ? (
                        <img src={formatImage(merchant.logo_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <i className="bx bxs-store-alt" style={{ fontSize: 24, color: C.muted }} />
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 className="card-title">
                        {merchant.store_name}
                      </h3>
                      <div className="card-location">
                        <i className="bx bx-map-pin" style={{ fontSize: 13 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {merchant.city ? `${merchant.city}, ${merchant.province || ''}` : 'Lokasi belum diatur'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Metrics summary */}
                  <div style={{ background: '#f8fafc', borderRadius: 16, padding: '14px 16px', marginBottom: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Kesehatan Stok Toko</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: healthPercent >= 80 ? C.green : healthPercent >= 50 ? C.amber : C.red, marginLeft: 'auto' }}>
                        {healthPercent}% Sehat
                      </span>
                    </div>
                    <StockProgressBar inStock={merchant.in_stock} lowStock={merchant.low_stock} outOfStock={merchant.out_of_stock} />
                  </div>

                  {/* Detail counts */}
                  <div className="card-stats-grid">
                    <div className="stats-box" style={{ background: C.greenBg, border: '1px solid #d1fae5' }}>
                      <div className="stats-val" style={{ color: C.green }}>{okCount}</div>
                      <div className="stats-lbl" style={{ color: C.greenText }}>Aman</div>
                    </div>
                    <div className="stats-box" style={{ background: C.amberBg, border: '1px solid #fef3c7' }}>
                      <div className="stats-val" style={{ color: C.amber }}>{merchant.low_stock}</div>
                      <div className="stats-lbl" style={{ color: C.amberText }}>Kritis</div>
                    </div>
                    <div className="stats-box" style={{ background: C.redBg, border: '1px solid #fee2e2' }}>
                      <div className="stats-val" style={{ color: C.red }}>{merchant.out_of_stock}</div>
                      <div className="stats-lbl" style={{ color: C.redText }}>Habis</div>
                    </div>
                  </div>

                  {/* Footer Stats & Button */}
                  <div className="card-footer-area">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Catalog</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: C.text, marginTop: 2 }}>{merchant.total_products} Item</span>
                    </div>

                    <button
                      onClick={() => {
                        setDetailSearch('');
                        setDetailFilter('');
                        setSelectedMerchant(merchant);
                      }}
                      className="card-btn"
                    >
                      <span>Lihat Detail</span>
                      <i className="bx bx-right-arrow-alt" style={{ fontSize: 16 }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Slide-Over Panel (Detail view) ── */}
      {activeMerchantData && createPortal(
        <>
          {/* Backdrop Blur */}
          <div 
            onClick={() => setSelectedMerchant(null)} 
            className="drawer-backdrop"
          />

          {/* Drawer Slide-in */}
          <div className="drawer-container">
            {/* Drawer Header */}
            <div className="drawer-header">
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {activeMerchantData.logo_url ? (
                    <img src={formatImage(activeMerchantData.logo_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <i className="bx bxs-store-alt" style={{ fontSize: 20, color: C.muted }} />
                  )}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: C.text }}>{activeMerchantData.store_name}</h2>
                  <p style={{ margin: '2px 0 0 0', fontSize: 12, color: C.muted, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className="bx bx-map-pin" />
                    {activeMerchantData.city ? `${activeMerchantData.city}, ${activeMerchantData.province || ''}` : 'Lokasi belum diatur'}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedMerchant(null)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  background: '#fff',
                  color: C.muted,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = C.text; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = C.muted; }}
              >
                <i className="bx bx-x" style={{ fontSize: 22 }} />
              </button>
            </div>

            {/* Quick Stats banner inside drawer */}
            <div className="drawer-stats">
              {[
                { label: 'Total Produk', val: activeMerchantData.total_products, color: C.text, bg: '#f1f5f9', border: C.border },
                { label: 'Stok Aman', val: activeMerchantData.in_stock - activeMerchantData.low_stock, color: C.green, bg: C.greenBg, border: '#d1fae5' },
                { label: 'Stok Kritis', val: activeMerchantData.low_stock, color: C.amber, bg: C.amberBg, border: '#fef3c7' },
                { label: 'Stok Habis', val: activeMerchantData.out_of_stock, color: C.red, bg: C.redBg, border: '#fee2e2' }
              ].map((pill, pIdx) => (
                <div key={pIdx} style={{ flex: 1, padding: '12px 14px', borderRadius: 16, background: pill.bg, border: `1px solid ${pill.border}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{pill.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: pill.color, marginTop: 4 }}>{pill.val}</div>
                </div>
              ))}
            </div>

            {/* Product Table Header Filters */}
            <div className="drawer-filters">
              <div style={{ position: 'relative', flex: 1 }}>
                <i className="bx bx-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 16 }} />
                <input
                  type="text"
                  placeholder="Cari nama produk atau SKU..."
                  value={detailSearch}
                  onChange={e => setDetailSearch(e.target.value)}
                  style={{ width: '100%', paddingLeft: 36, paddingRight: 12, height: 38, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { v: '', label: 'Semua' },
                  { v: 'low', label: 'Kritis', color: C.amber },
                  { v: 'out', label: 'Habis', color: C.red }
                ].map(df => (
                  <button key={df.v} onClick={() => setDetailFilter(df.v)} style={{
                    padding: '8px 12px', borderRadius: 8, border: '1px solid',
                    borderColor: detailFilter === df.v ? (df.color || C.primary) : C.border,
                    background: detailFilter === df.v ? (df.color ? df.color + '15' : '#eef2ff') : '#fff',
                    color: detailFilter === df.v ? (df.color || C.primary) : C.muted,
                    fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s'
                  }}>
                    {df.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Table Area */}
            <div className="drawer-content">
              {(() => {
                const plist = getFilteredProducts(activeMerchantData);
                if (plist.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: 16, border: `1px solid ${C.border}`, marginTop: 16 }}>
                      <i className="bx bx-package" style={{ fontSize: 32, color: C.muted, marginBottom: 8, display: 'block' }} />
                      <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Tidak ada produk yang cocok dengan pencarian / filter.</p>
                    </div>
                  );
                }

                return (
                  <div style={{ overflowX: 'auto', borderRadius: 16, border: `1px solid ${C.border}`, marginTop: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['Produk', 'SKU', 'Kategori', 'Stok', 'Harga', 'Status'].map(th => (
                            <th key={th} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${C.border}` }}>
                              {th}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {plist.map((prod, pIdx) => (
                          <tr key={prod.product_id} style={{ borderBottom: pIdx < plist.length - 1 ? `1px solid #f1f5f9` : 'none', background: '#fff', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                          >
                            {/* Product Info */}
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}`, flexShrink: 0, background: '#f1f5f9' }}>
                                  {formatImage(prod.image) ? (
                                    <img src={formatImage(prod.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <i className="bx bx-image" style={{ fontSize: 16, color: '#cbd5e1' }} />
                                    </div>
                                  )}
                                </div>
                                <span style={{ fontWeight: 600, color: C.text, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={prod.product_name}>
                                  {prod.product_name}
                                </span>
                              </div>
                            </td>
                            {/* SKU */}
                            <td style={{ padding: '12px 16px', color: C.muted, fontSize: 12, fontFamily: 'monospace' }}>{prod.sku || '—'}</td>
                            {/* Category */}
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: 6, background: '#f1f5f9', color: C.muted, fontSize: 11, fontWeight: 600 }}>
                                {prod.category || 'Uncategorized'}
                              </span>
                            </td>
                            {/* Stock */}
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{
                                  fontSize: 16,
                                  fontWeight: 900,
                                  color: prod.status === 'out' ? C.red : prod.status === 'low' ? C.amber : C.green
                                }}>
                                  {prod.stock}
                                </span>
                                <span style={{ fontSize: 11, color: C.muted }}>pcs</span>
                              </div>
                            </td>
                            {/* Price */}
                            <td style={{ padding: '12px 16px', fontWeight: 700, color: C.text }}>{formatRupiah(prod.price)}</td>
                            {/* Status */}
                            <td style={{ padding: '12px 16px' }}>
                              <StockBadge status={prod.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Global CSS for animations and responsive styles */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

        .drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          z-index: 9999;
          animation: fadeIn 0.25s ease;
        }

        .drawer-container {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          max-width: 680px;
          background: #ffffff;
          box-shadow: -10px 0 40px rgba(0,0,0,0.1);
          z-index: 10000;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-sizing: border-box;
        }

        .drawer-header {
          padding: 24px 30px;
          border-bottom: 1px solid ${C.border};
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
        }

        .drawer-stats {
          padding: 20px 30px;
          background: #ffffff;
          border-bottom: 1px solid ${C.border};
          display: flex;
          gap: 12px;
        }

        .drawer-filters {
          padding: 16px 30px 10px;
          background: #fff;
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .drawer-content {
          flex: 1;
          overflow-y: auto;
          padding: 0 30px 30px;
        }

        .merchant-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }

        .merchant-card {
          background: #ffffff;
          border-radius: 24px;
          border: 1px solid ${C.border};
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .merchant-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(99,102,241,0.08);
          border-color: #c7d2fe;
        }

        .merchant-card-inner {
          padding: 24px;
        }

        .card-header-area {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .card-logo {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid ${C.border};
          flex-shrink: 0;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
        }

        .card-title {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 800;
          color: ${C.text};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .card-location {
          display: flex;
          align-items: center;
          gap: 4px;
          color: ${C.muted};
          font-size: 12px;
          font-weight: 500;
          min-width: 0;
        }

        .card-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        .stats-box {
          padding: 10px 8px;
          border-radius: 12px;
          text-align: center;
        }

        .stats-val {
          font-size: 16px;
          font-weight: 900;
        }

        .stats-lbl {
          font-size: 10px;
          font-weight: 700;
          margin-top: 2px;
        }

        .card-footer-area {
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid ${C.border};
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .card-btn {
          padding: 10px 18px;
          background: ${C.primary};
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 8px rgba(99,102,241,0.2);
          transition: all 0.2s;
        }

        .card-btn:hover {
          background: ${C.primaryDark};
          box-shadow: 0 4px 12px rgba(99,102,241,0.3);
        }

        @media (max-width: 768px) {
          .merchant-grid {
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 16px;
          }
        }

        @media (max-width: 640px) {
          .drawer-container {
            max-width: calc(100% - 48px);
            border-top-left-radius: 24px;
            border-bottom-left-radius: 24px;
          }
          .drawer-header {
            padding: 16px 20px;
          }
          .drawer-stats {
            padding: 16px 20px;
            gap: 8px;
            flex-wrap: wrap;
          }
          .drawer-stats > div {
            flex: unset !important;
            width: calc(50% - 4px);
            padding: 10px !important;
          }
          .drawer-filters {
            padding: 12px 20px 8px;
            flex-direction: column;
            align-items: stretch;
          }
          .drawer-filters > div {
            width: 100%;
          }
          .drawer-filters > div:last-child {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
          }
          .drawer-filters > div:last-child button {
            flex: 1;
            text-align: center;
            justify-content: center;
          }
          .drawer-content {
            padding: 0 20px 20px;
          }
        }

        @media (max-width: 600px) {
          .merchant-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .merchant-card {
            border-radius: 16px;
          }

          .merchant-card-inner {
            padding: 16px;
          }

          .card-header-area {
            gap: 8px;
            margin-bottom: 12px;
          }

          .card-logo {
            width: 36px;
            height: 36px;
            border-radius: 10px;
          }

          .card-logo i {
            font-size: 18px !important;
          }

          .card-title {
            font-size: 13px;
          }

          .card-location {
            font-size: 10px;
          }

          .card-location i {
            font-size: 11px !important;
          }

          .card-stats-grid {
            gap: 6px;
            margin-bottom: 14px;
          }

          .stats-box {
            padding: 6px 4px;
            border-radius: 8px;
          }

          .stats-val {
            font-size: 13px;
          }

          .stats-lbl {
            font-size: 8px;
          }

          .card-footer-area {
            padding-top: 12px;
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }

          .card-footer-area > div {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .card-footer-area > div span:first-child {
            font-size: 8px !important;
          }

          .card-footer-area > div span:last-child {
            font-size: 12px !important;
            margin-top: 0 !important;
          }

          .card-btn {
            padding: 8px 12px;
            border-radius: 10px;
            font-size: 11px;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
