import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, TablePanel, statusBadge, idr, fmtDate, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

const STATUS_TABS = [
  { val: '', label: 'Semua' },
  { val: 'pending', label: 'Pending' },
  { val: 'paid', label: 'Dibayar' },
  { val: 'processing', label: 'Diproses' },
  { val: 'shipped', label: 'Dikirim' },
  { val: 'completed', label: 'Selesai' },
  { val: 'cancelled', label: 'Batal' },
];

const STATUS_MAP = {
  // Payment Statuses
  pending_payment: { color: '#d97706', bg: '#fffbeb', label: 'Belum Bayar' },
  paid:            { color: '#2563eb', bg: '#eff6ff', label: 'Sudah Bayar' },
  
  // Shipping/Merchant Statuses
  new:             { color: '#64748b', bg: '#f1f5f9', label: 'Baru' },
  confirmed:       { color: '#7c3aed', bg: '#f5f3ff', label: 'Konfirmasi' },
  processing:      { color: '#7c3aed', bg: '#f5f3ff', label: 'Diproses' },
  packed:          { color: '#0891b2', bg: '#ecfeff', label: 'Dikemas' },
  shipped:         { color: '#6366f1', bg: '#eef2ff', label: 'Dikirim' },
  delivered:       { color: '#16a34a', bg: '#f0fdf4', label: 'Sampai' },
  completed:       { color: '#16a34a', bg: '#dcfce7', label: 'Selesai' },
  cancelled:       { color: '#dc2626', bg: '#fff1f2', label: 'Batal' },
};

const StatusDot = ({ status, label }) => {
  const s = STATUS_MAP[status] || { color: '#64748b', bg: '#f1f5f9', label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 20,
      background: s.bg, color: s.color, fontSize: 11, fontWeight: 700,
      border: `1px solid ${s.color}20`
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
      {label || s.label || status || '—'}
    </span>
  );
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('');

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/orders?status=${tab}`)
      .then(d => setOrders(d || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Order Lifecycle" subtitle="Monitoring dan manajemen seluruh transaksi platform.">
        <button style={A.btnGhost} onClick={load}><i className="bx bx-refresh" /> Refresh</button>
      </PageHeader>

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
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
              {orders.length} transaksi
            </span>
          }
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr>
                  {['No. Pesanan', 'Merchant / Gudang', 'Pelanggan', 'Status Pembayaran', 'Status Pesanan', 'Total', 'Tanggal', ''].map((h, i) => (
                    <th key={i} style={{ ...A.th, textAlign: i === 7 ? 'right' : 'left', paddingLeft: i === 0 ? 24 : 16, paddingRight: i === 7 ? 24 : 16 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <i className="bx bx-receipt" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.3 }} />
                    Belum ada pesanan.
                  </td></tr>
                ) : orders.map((o, idx) => (
                  <tr key={`${o.order_id}-${o.merchant_id}`}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                  >
                    <td style={{ ...A.td, paddingLeft: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a', fontSize: 13 }}>#{o.order_id.slice(0,8).toUpperCase()}</div>
                        {o.order_type === 'pos' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 800, marginLeft: 8 }}>
                            <i className="bx bx-calculator" style={{ fontSize: 12 }} /> POS
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={A.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#6366f110', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                          <i className="bx bx-store" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{o.store_name || '—'}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Merchant ID: {o.merchant_id.slice(0,6)}</div>
                        </div>
                      </div>
                    </td>
                    <td style={A.td}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13.5 }}>{o.buyer_name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{o.buyer_email}</div>
                    </td>
                    <td style={A.td}><StatusDot status={o.payment_status} /></td>
                    <td style={A.td}><StatusDot status={o.shipping_status} /></td>
                    <td style={A.td}>
                      <div style={{ fontWeight: 800, color: '#6366f1', fontSize: 14 }}>{idr(o.total_amount)}</div>
                    </td>
                    <td style={A.td}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{fmtDate(o.created_at)}</div>
                    </td>
                    <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                      <Link to={`/admin/orders/detail/${o.id}`} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '7px 14px', borderRadius: 10,
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        color: '#334155', fontSize: 12.5, fontWeight: 700,
                        textDecoration: 'none',
                      }}>
                        Detail <i className="bx bx-chevron-right" style={{ fontSize: 16 }} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TablePanel>
      </div>
    </div>
  );
}
