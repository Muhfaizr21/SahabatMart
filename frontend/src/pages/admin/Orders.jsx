import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

/* ─── Style tokens ──────────────────────────────────────── */
const S = {
  page: { fontFamily: "'Inter', sans-serif" },
  card: { background: '#fff', borderRadius: 16, border: '1px solid #f0f0f5', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' },
  cardHeader: { padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  tableTitle: { fontSize: 16, fontWeight: 700, color: '#0f172a' },
  tableSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  filterTab: (active) => ({
    padding: '7px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: active ? '#4361ee' : 'transparent', color: active ? '#fff' : '#64748b', transition: 'all 0.15s',
  }),
  thCell: { padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.6px', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', background: '#f8fafc' },
  tdCell: { padding: '14px 16px', borderBottom: '1px solid #f8fafc', verticalAlign: 'middle' },
};

const STATUS_MAP = {
  pending:    { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b',  label: 'Pending' },
  paid:       { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6',  label: 'Dibayar' },
  processing: { bg: '#ede9fe', color: '#5b21b6', dot: '#8b5cf6',  label: 'Diproses' },
  shipped:    { bg: '#ecfdf5', color: '#065f46', dot: '#10b981',  label: 'Dikirim' },
  delivered:  { bg: '#f0fdf4', color: '#166534', dot: '#22c55e',  label: 'Terkirim' },
  completed:  { bg: '#d1fae5', color: '#065f46', dot: '#10b981',  label: 'Selesai' },
  cancelled:  { bg: '#ffe4e6', color: '#9f1239', dot: '#f43f5e',  label: 'Dibatalkan' },
};

const OrderStatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8', label: status };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: s.bg, color: s.color, fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {s.label}
    </span>
  );
};

const FILTER_TABS = [
  { value: '', label: 'Semua' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Dibayar' },
  { value: 'processing', label: 'Diproses' },
  { value: 'shipped', label: 'Dikirim' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Batal' },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const loadOrders = () => {
    setLoading(true);
    fetchJson(`${API}/orders?status=${statusFilter}`)
      .then(d => setOrders(d.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrders(); }, [statusFilter]);

  return (
    <div style={S.page} className="fade-in">
      {/* Breadcrumb */}
      <div className="d-none d-sm-flex align-items-center gap-2 mb-4">
        <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Order Lifecycle</span>
        <i className="bx bx-chevron-right" style={{ color: '#cbd5e1', fontSize: 20 }} />
        <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>Semua Transaksi</span>
      </div>

      <div style={S.card}>
        {/* Header */}
        <div style={S.cardHeader}>
          <div>
            <div style={S.tableTitle}>Monitoring Pesanan</div>
            <div style={S.tableSub}>{orders.length} pesanan ditemukan</div>
          </div>
          <button onClick={loadOrders} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <i className="bx bx-refresh" style={{ fontSize: 18 }} /> Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div style={{ padding: '10px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
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
            <div style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>Memuat data pesanan...</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr>
                  {[['No. Pesanan', 'left', 24], ['Merchant', 'left', 16], ['Pelanggan', 'left', 16], ['Status', 'left', 16], ['Total', 'left', 16], ['Tanggal', 'left', 16], ['', 'right', 24]].map(([h, align, pl]) => (
                    <th key={h} style={{ ...S.thCell, textAlign: align, paddingLeft: pl, paddingRight: h === '' ? 24 : 16 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '64px 0', color: '#94a3b8' }}>
                      <i className="bx bx-receipt" style={{ fontSize: 48, display: 'block', marginBottom: 12, opacity: 0.3 }} />
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#475569', marginBottom: 6 }}>Belum ada pesanan</div>
                      <div style={{ fontSize: 13 }}>Tidak ada transaksi yang sesuai filter yang dipilih.</div>
                    </td>
                  </tr>
                ) : orders.map((o, idx) => (
                  <tr key={o.id}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                  >
                    {/* Order ID */}
                    <td style={{ ...S.tdCell, paddingLeft: 24 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                        #{o.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>ID Pesanan</div>
                    </td>

                    {/* Merchant */}
                    <td style={S.tdCell}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 600 }}>
                        <i className="bx bx-store" style={{ fontSize: 13 }} />
                        {o.store_name || '—'}
                      </span>
                    </td>

                    {/* Customer */}
                    <td style={S.tdCell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className="bx bx-user" style={{ fontSize: 17, color: '#64748b' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>{o.buyer_name}</div>
                          <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 1 }}>{o.buyer_email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={S.tdCell}>
                      <OrderStatusBadge status={o.status} />
                    </td>

                    {/* Total */}
                    <td style={S.tdCell}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{fmt(o.total_amount)}</div>
                    </td>

                    {/* Date */}
                    <td style={S.tdCell}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#334155' }}>
                        {new Date(o.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {new Date(o.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ ...S.tdCell, paddingRight: 24, textAlign: 'right' }}>
                      <Link
                        to={`/admin/orders/detail?id=${o.id}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', fontSize: 12.5, fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563eb'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#334155'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                      >
                        Detail <i className="bx bx-chevron-right" style={{ fontSize: 16 }} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!loading && orders.length > 0 && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>
              Total <strong style={{ color: '#475569' }}>{orders.length}</strong> pesanan
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
