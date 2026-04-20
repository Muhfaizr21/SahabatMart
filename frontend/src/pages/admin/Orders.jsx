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
  pending:    { color: '#d97706', bg: '#fffbeb' },
  paid:       { color: '#2563eb', bg: '#eff6ff' },
  processing: { color: '#7c3aed', bg: '#f5f3ff' },
  shipped:    { color: '#0891b2', bg: '#ecfeff' },
  delivered:  { color: '#16a34a', bg: '#f0fdf4' },
  completed:  { color: '#16a34a', bg: '#dcfce7' },
  cancelled:  { color: '#dc2626', bg: '#fff1f2' },
};

const StatusDot = ({ status }) => {
  const s = STATUS_MAP[status] || { color: '#64748b', bg: '#f1f5f9' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 20,
      background: s.bg, color: s.color, fontSize: 12, fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
      {status}
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

      <TablePanel
        loading={loading}
        tabs={STATUS_TABS.map(t => (
          <button key={t.val} style={A.tab(tab === t.val)} onClick={() => setTab(t.val)}>{t.label}</button>
        ))}
        toolbar={
          <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
            {orders.length} transaksi
          </span>
        }
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr>
              {['No. Pesanan', 'Merchant', 'Pelanggan', 'Status', 'Total', 'Tanggal', ''].map((h, i) => (
                <th key={i} style={{ ...A.th, textAlign: i === 6 ? 'right' : 'left', paddingLeft: i === 0 ? 24 : 16, paddingRight: i === 6 ? 24 : 16 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <i className="bx bx-receipt" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.3 }} />
                Belum ada pesanan.
              </td></tr>
            ) : orders.map((o, idx) => (
              <tr key={o.id}
                style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
              >
                <td style={{ ...A.td, paddingLeft: 24 }}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a', fontSize: 14 }}>#{o.id?.slice(0,8).toUpperCase()}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>ID Pesanan</div>
                </td>
                <td style={A.td}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 700 }}>
                    <i className="bx bx-store" style={{ fontSize: 13 }} />{o.store_name || '—'}
                  </span>
                </td>
                <td style={A.td}>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13.5 }}>{o.buyer_name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{o.buyer_email}</div>
                </td>
                <td style={A.td}><StatusDot status={o.status} /></td>
                <td style={A.td}>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{idr(o.total_amount)}</div>
                </td>
                <td style={A.td}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{fmtDate(o.created_at)}</div>
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
        {!loading && orders.length > 0 && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, color: '#94a3b8' }}>Total <strong style={{ color: '#475569' }}>{orders.length}</strong> pesanan</span>
            <span style={{ fontSize: 11, color: '#cbd5e1' }}>Updated {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
      </TablePanel>
    </div>
  );
}
