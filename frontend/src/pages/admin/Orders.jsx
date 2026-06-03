import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, TablePanel, statusBadge, idr, fmtDate, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

const STATUS_TABS = [
  { val: '', label: 'Semua', icon: 'bx-grid-alt', count: null },
  { val: 'pending_payment', label: 'Belum Bayar', icon: 'bx-time', color: '#d97706' },
  { val: 'paid', label: 'Sudah Bayar', icon: 'bx-check-circle', color: '#2563eb' },
  { val: 'processing', label: 'Diproses', icon: 'bx-loader-circle', color: '#7c3aed' },
  { val: 'shipped', label: 'Dikirim', icon: 'bx-truck', color: '#6366f1' },
  { val: 'completed', label: 'Selesai', icon: 'bx-check-shield', color: '#16a34a' },
  { val: 'cancelled', label: 'Batal', icon: 'bx-x-circle', color: '#dc2626' },
];

const STATUS_MAP = {
  pending_payment: { color: '#d97706', bg: '#fffbeb', label: 'Belum Bayar' },
  paid: { color: '#2563eb', bg: '#eff6ff', label: 'Sudah Bayar' },
  new: { color: '#64748b', bg: '#f1f5f9', label: 'Baru' },
  confirmed: { color: '#7c3aed', bg: '#f5f3ff', label: 'Konfirmasi' },
  processing: { color: '#7c3aed', bg: '#f5f3ff', label: 'Diproses' },
  packed: { color: '#0891b2', bg: '#ecfeff', label: 'Dikemas' },
  shipped: { color: '#6366f1', bg: '#eef2ff', label: 'Dikirim' },
  delivered: { color: '#16a34a', bg: '#f0fdf4', label: 'Sampai' },
  completed: { color: '#16a34a', bg: '#dcfce7', label: 'Selesai' },
  cancelled: { color: '#dc2626', bg: '#fff1f2', label: 'Batal' },
};

const StatusDot = ({ status, label, size = 'normal' }) => {
  const s = STATUS_MAP[status] || { color: '#64748b', bg: '#f1f5f9', label: status };
  const padding = size === 'small' ? '2px 8px' : '4px 12px';
  const fontSize = size === 'small' ? 10 : 11;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: padding, borderRadius: 30,
      background: s.bg, color: s.color, fontSize: fontSize, fontWeight: 600,
      border: `1px solid ${s.color}15`, letterSpacing: '0.3px'
    }}>
      <span style={{ width: size === 'small' ? 5 : 6, height: size === 'small' ? 5 : 6, borderRadius: '50%', background: s.color }} />
      {label || s.label || status || '—'}
    </span>
  );
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const load = (targetPage = page) => {
    setLoading(true);
    fetchJson(`${API}/orders?status=${tab}&search=${search}&from=${dateFrom}&to=${dateTo}&page=${targetPage}&limit=${limit}`)
      .then(d => {
        setOrders(Array.isArray(d) ? d : (d?.data || []));
        if (d?.total) {
          setTotalPages(Math.ceil(d.total / limit) || 1);
        } else {
          setTotalPages(1);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
    load(1);
  }, [tab]);

  const handlePageChange = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    load(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderMobileCard = (o, idx) => (
    <div key={`${o.order_id}-${o.merchant_id}`} style={{
      background: 'linear-gradient(135deg, #fff 0%, #fefefe 100%)',
      borderRadius: 20,
      padding: 0,
      marginBottom: 16,
      border: '1px solid #eef2ff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.03)',
      transition: 'all 0.2s ease',
      overflow: 'hidden'
    }}>
      {/* Card Header */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
        padding: '16px 16px 12px 16px',
        borderBottom: '1px solid #f0f2f5'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{
                fontFamily: "'SF Mono', 'Monaco', 'Cascadia Code', monospace",
                fontWeight: 800,
                color: '#0f172a',
                fontSize: 14,
                letterSpacing: '-0.3px',
                background: '#f1f5f9',
                padding: '2px 8px',
                borderRadius: 6,
              }}>
                #{o.order_id.slice(0, 8).toUpperCase()}
              </span>
              {o.order_type === 'pos' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700 }}>
                  <i className="bx bx-calculator" style={{ fontSize: 12 }} /> POS
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8' }}>
              <i className="bx bx-calendar" style={{ fontSize: 12 }} />
              <span>{fmtDate(o.created_at)}</span>
            </div>
          </div>
          <Link to={`/admin/orders/detail/${o.id}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 12,
            background: '#6366f1', border: 'none',
            color: '#fff', fontSize: 12, fontWeight: 600,
            textDecoration: 'none', transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(99,102,241,0.2)'
          }}>
            Detail <i className="bx bx-chevron-right" style={{ fontSize: 14 }} />
          </Link>
        </div>
      </div>

      {/* Card Body */}
      <div style={{ padding: '16px' }}>
        {/* Merchant Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '8px 12px', background: '#f8fafc', borderRadius: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            <i className="bx bx-store" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 2 }}>{o.store_name || '—'}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>ID: {o.merchant_id.slice(0, 8)}</div>
          </div>
        </div>

        {/* Customer Info */}
        <div style={{ marginBottom: 16, padding: '0 4px' }}>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <i className="bx bx-user" style={{ fontSize: 11, marginRight: 4 }} /> Pelanggan
          </div>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, marginBottom: 4 }}>{o.buyer_name}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{o.buyer_email}</div>
        </div>

        {/* Status Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, padding: '10px 0' }}>
          <div style={{ padding: '8px', background: '#fafbff', borderRadius: 12 }}>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Pembayaran</div>
            <StatusDot status={o.payment_status} size="small" />
          </div>
          <div style={{ padding: '8px', background: '#fafbff', borderRadius: 12 }}>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Pesanan</div>
            <StatusDot status={o.shipping_status} size="small" />
          </div>
        </div>

        {/* Total */}
        <div style={{
          paddingTop: 12,
          borderTop: '2px dashed #eef2ff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 4
        }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>TOTAL BELANJA</span>
          <span style={{ fontWeight: 800, color: '#6366f1', fontSize: 18, letterSpacing: '-0.5px' }}>{idr(o.total_amount)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ ...A.page, padding: '24px 20px', background: '#fafbff' }} className="fade-in admin-page-container">
      <style>{`
        @media (max-width: 768px) {
          .admin-desktop-table { display: none; }
          .admin-mobile-cards { display: block; }
        }
        @media (min-width: 769px) {
          .admin-desktop-table { display: block; }
          .admin-mobile-cards { display: none; }
        }
        
        * {
          scrollbar-width: thin;
        }
        
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* Header Section */}
      <div style={{ marginBottom: 28 }}>
        <PageHeader
          title="Manajemen Pesanan"
          subtitle="Kelola dan pantau semua transaksi yang terjadi di platform"
          noMargin
        />
      </div>

      {/* Filter Section - Modern Design */}
      <div style={{
        background: '#fff',
        borderRadius: 20,
        padding: '20px 24px',
        marginBottom: 24,
        border: '1px solid #eef2ff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', width: '100%' }}>
            <i className="bx bx-search" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 18 }} />
            <input
              style={{
                width: '100%', padding: '12px 16px 12px 44px',
                border: '1px solid #e2e8f0', borderRadius: 14,
                fontSize: 14, transition: 'all 0.2s',
                outline: 'none', background: '#fafbff'
              }}
              placeholder="Cari berdasarkan ID pesanan, nama pembeli, atau merchant..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (setPage(1), load(1))}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Date Range & Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8, flex: '1 1 auto', minWidth: 200 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <i className="bx bx-calendar" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }} />
                <input
                  type="date"
                  style={{ ...A.select, padding: '10px 12px 10px 36px', width: '100%', borderRadius: 12 }}
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center', fontWeight: 500 }}>—</span>
              <div style={{ position: 'relative', flex: 1 }}>
                <i className="bx bx-calendar" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }} />
                <input
                  type="date"
                  style={{ ...A.select, padding: '10px 12px 10px 36px', width: '100%', borderRadius: 12 }}
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                padding: '10px 24px', borderRadius: 12,
                background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                border: 'none', color: '#fff', fontWeight: 600, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                transition: 'transform 0.1s', boxShadow: '0 2px 6px rgba(99,102,241,0.2)'
              }} onClick={() => { setPage(1); load(1); }}>
                <i className="bx bx-filter-alt" /> Filter
              </button>
              <button style={{
                padding: '10px 16px', borderRadius: 12,
                background: '#fff', border: '1px solid #e2e8f0',
                color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6
              }} onClick={() => {
                setSearch(''); setDateFrom(''); setDateTo(''); setTab('');
                setPage(1); setTimeout(() => load(1), 50);
              }}>
                <i className="bx bx-reset" /> Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - Modern */}
      <div style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #eef2ff',
        marginBottom: 24,
        padding: '4px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div style={{ display: 'flex', gap: 4, padding: '4px', minWidth: 'min-content' }}>
          {STATUS_TABS.map(t => {
            const isActive = tab === t.val;
            return (
              <button
                key={t.val}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' : 'transparent',
                  color: isActive ? '#fff' : '#64748b',
                  fontWeight: isActive ? 700 : 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 2px 8px rgba(99,102,241,0.25)' : 'none'
                }}
                onClick={() => setTab(t.val)}
              >
                <i className={`bx ${t.icon}`} style={{ fontSize: 16 }} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: 20, border: '1px solid #eef2ff' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bx bx-loader-alt bx-spin" style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <p style={{ color: '#64748b', fontWeight: 500 }}>Memuat data pesanan...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Desktop Table View */}
          <div className="admin-desktop-table" style={{ background: '#fff', borderRadius: 20, border: '1px solid #eef2ff', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f2f5', background: '#fafbff' }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="bx bx-receipt" /> {orders.length} pesanan ditemukan
              </span>
            </div>
            <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0f2f5', background: '#fafbff' }}>
                    {['Pesanan', 'Merchant', 'Pelanggan', 'Pembayaran', 'Status', 'Total', 'Tanggal', ''].map((h, i) => (
                      <th key={i} style={{
                        textAlign: 'left', padding: '16px 16px', fontSize: 12, fontWeight: 700, color: '#64748b',
                        letterSpacing: '0.3px', textTransform: 'uppercase',
                        paddingLeft: i === 0 ? 24 : 16, paddingRight: i === 7 ? 24 : 16
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '80px 20px', textAlign: 'center', color: '#94a3b8' }}>
                      <i className="bx bx-inbox" style={{ fontSize: 48, display: 'block', marginBottom: 12, opacity: 0.3 }} />
                      Tidak ada pesanan yang ditemukan
                    </td></tr>
                  ) : orders.map((o, idx) => (
                    <tr key={`${o.order_id}-${o.merchant_id}`} style={{ borderBottom: '1px solid #f0f2f5', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <td style={{ padding: '16px 16px', paddingLeft: 24 }}>
                        <div>
                          <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', fontSize: 12, marginBottom: 4 }}>
                            #{o.order_id.slice(0, 8).toUpperCase()}
                          </div>
                          {o.order_type === 'pos' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontSize: 9, fontWeight: 700 }}>
                              <i className="bx bx-calculator" style={{ fontSize: 10 }} /> POS
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 2 }}>{o.store_name || '—'}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>ID: {o.merchant_id.slice(0, 8)}</div>
                      </td>
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13, marginBottom: 2 }}>{o.buyer_name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{o.buyer_email}</div>
                      </td>
                      <td style={{ padding: '16px 16px' }}><StatusDot status={o.payment_status} size="small" /></td>
                      <td style={{ padding: '16px 16px' }}><StatusDot status={o.shipping_status} size="small" /></td>
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#6366f1', fontSize: 14 }}>{idr(o.total_amount)}</div>
                      </td>
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>{fmtDate(o.created_at)}</div>
                      </td>
                      <td style={{ padding: '16px 24px 16px 16px', textAlign: 'right' }}>
                        <Link to={`/admin/orders/detail/${o.id}`} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '6px 14px', borderRadius: 10,
                          background: '#f1f5f9', border: 'none',
                          color: '#475569', fontSize: 12, fontWeight: 600,
                          textDecoration: 'none', transition: 'all 0.2s'
                        }}>
                          Detail <i className="bx bx-chevron-right" style={{ fontSize: 13 }} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="admin-mobile-cards">
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: 20, border: '1px solid #eef2ff' }}>
                <i className="bx bx-inbox" style={{ fontSize: 48, display: 'block', marginBottom: 12, opacity: 0.3, color: '#94a3b8' }} />
                <p style={{ color: '#94a3b8' }}>Tidak ada pesanan yang ditemukan</p>
              </div>
            ) : (
              orders.map((o, idx) => renderMobileCard(o, idx))
            )}
          </div>
        </>
      )}

      {/* Pagination - Simplified & Beautiful */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
          marginTop: 32, padding: '20px 0', flexWrap: 'wrap'
        }}>
          <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}
            style={{ padding: '8px 16px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>
            <i className="bx bx-chevron-left" /> Sebelumnya
          </button>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {(() => {
              const pages = [];
              const maxVisible = 5;
              let start = Math.max(1, page - Math.floor(maxVisible / 2));
              let end = Math.min(totalPages, start + maxVisible - 1);
              if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

              if (start > 1) pages.push(1);
              if (start > 2) pages.push('...');
              for (let i = start; i <= end; i++) pages.push(i);
              if (end < totalPages - 1) pages.push('...');
              if (end < totalPages) pages.push(totalPages);

              return pages.map((p, idx) => p === '...' ? (
                <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: '#94a3b8' }}>...</span>
              ) : (
                <button key={p} onClick={() => handlePageChange(p)}
                  style={{
                    minWidth: 38, height: 38, borderRadius: 12, fontSize: 13, fontWeight: 700,
                    background: page === p ? 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' : '#fff',
                    color: page === p ? '#fff' : '#475569', border: page === p ? 'none' : '1px solid #e2e8f0',
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}>{p}</button>
              ));
            })()}
          </div>

          <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}
            style={{ padding: '8px 16px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}>
            Selanjutnya <i className="bx bx-chevron-right" />
          </button>
        </div>
      )}
    </div>
  );
}