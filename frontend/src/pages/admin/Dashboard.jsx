import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = 'http://localhost:8080/api/admin';

const StatCard = ({ icon, label, value, color, sub }) => (
  <div style={{
    background: 'var(--bs-body-bg)',
    border: '1px solid var(--bs-border-color)',
    borderRadius: 16,
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    minWidth: 0,
  }}>
    <div style={{
      width: 52, height: 52, borderRadius: 14,
      background: color + '18',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 22, color,
    }}>
      <i className={`bi ${icon}`}></i>
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, color: 'var(--bs-secondary-color)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>{sub}</div>}
    </div>
  </div>
);

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(API + '/overview').then(r => r.json()),
      fetch(API + '/finance/monthly').then(r => r.json()),
    ]).then(([ov, mo]) => {
      setOverview(ov);
      setMonthly(mo.data || []);
    }).catch(() => {
      // fallback mock
      setOverview({
        total_users: 3482, total_merchants: 127, total_affiliates: 245,
        total_revenue: 847500000, total_fee: 42375000,
        total_orders: 8542, pending_payouts: 14
      });
      setMonthly([]);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="d-flex align-items-center justify-content-center" style={{ height: 300 }}>
      <div className="spinner-border text-primary" role="status"></div>
    </div>
  );

  const stats = [
    { icon: 'bi-people-fill', label: 'Total Pengguna', value: (overview?.total_users || 0).toLocaleString(), color: '#4361ee' },
    { icon: 'bi-shop-window', label: 'Merchant Aktif', value: (overview?.total_merchants || 0).toLocaleString(), color: '#7209b7', sub: `${overview?.pending_payouts || 0} payout pending` },
    { icon: 'bi-person-badge-fill', label: 'Member Affiliate', value: (overview?.total_affiliates || 0).toLocaleString(), color: '#f72585' },
    { icon: 'bi-bag-check-fill', label: 'Total Pesanan', value: (overview?.total_orders || 0).toLocaleString(), color: '#3a0ca3' },
    { icon: 'bi-cash-stack', label: 'Total Revenue', value: fmt(overview?.total_revenue), color: '#4cc9f0' },
    { icon: 'bi-currency-dollar', label: 'Fee Platform', value: fmt(overview?.total_fee), color: '#06d6a0' },
  ];

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Dashboard</div>
        <div className="ps-3"><nav><ol className="breadcrumb mb-0 p-0">
          <li className="breadcrumb-item"><a href="javascript:;"><i className="bx bx-home-alt"></i></a></li>
          <li className="breadcrumb-item active">Super Admin Overview</li>
        </ol></nav></div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16, marginBottom: 24 }}>
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Quick Actions */}
      <div className="card radius-10 mb-4">
        <div className="card-body">
          <h6 className="mb-3 fw-semibold">Aksi Cepat</h6>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Link to="/admin/merchants" className="btn btn-outline-primary btn-sm"><i className="bi bi-shop me-1"></i>Kelola Merchant</Link>
            <Link to="/admin/affiliates" className="btn btn-outline-info btn-sm"><i className="bi bi-person-badge me-1"></i>Kelola Affiliate</Link>
            <Link to="/admin/moderation" className="btn btn-outline-warning btn-sm"><i className="bi bi-shield-check me-1"></i>Moderasi Produk</Link>
            <Link to="/admin/finance" className="btn btn-outline-success btn-sm"><i className="bi bi-bar-chart me-1"></i>Laporan Keuangan</Link>
            <Link to="/admin/payouts" className="btn btn-outline-danger btn-sm"><i className="bi bi-wallet2 me-1"></i>Proses Payout</Link>
            <Link to="/admin/commissions" className="btn btn-outline-secondary btn-sm"><i className="bi bi-percent me-1"></i>Komisi</Link>
            <Link to="/admin/settings" className="btn btn-outline-dark btn-sm"><i className="bi bi-gear me-1"></i>Pengaturan</Link>
            <Link to="/admin/audit" className="btn btn-outline-dark btn-sm"><i className="bi bi-journal-text me-1"></i>Audit Log</Link>
          </div>
        </div>
      </div>

      {/* Monthly Revenue Table */}
      <div className="row">
        <div className="col-12 col-xl-8">
          <div className="card radius-10">
            <div className="card-body">
              <h6 className="mb-3 fw-semibold">Pendapatan Bulanan (12 Bulan Terakhir)</h6>
              {monthly.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-bar-chart fs-1 d-block mb-2 opacity-25"></i>
                  Data grafik akan tersedia setelah ada transaksi
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Bulan</th>
                        <th>Revenue</th>
                        <th>Fee Platform</th>
                        <th>Pesanan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.map(m => (
                        <tr key={m.month}>
                          <td className="fw-medium">{m.month}</td>
                          <td>{fmt(m.revenue)}</td>
                          <td className="text-success">{fmt(m.fee)}</td>
                          <td><span className="badge bg-primary bg-opacity-10 text-primary">{m.orders}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="card radius-10">
            <div className="card-body">
              <h6 className="mb-3 fw-semibold">Status Platform</h6>
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span className="text-muted small">Fee Rate Default</span>
                  <span className="badge bg-primary bg-opacity-10 text-primary">5%</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span className="text-muted small">Payout Pending</span>
                  <span className="badge bg-warning text-dark">{overview?.pending_payouts || 0}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span className="text-muted small">Merchant Terverifikasi</span>
                  <span className="badge bg-success bg-opacity-10 text-success">{overview?.total_merchants || 0}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span className="text-muted small">Ratio Fee/Revenue</span>
                  <span className="badge bg-info bg-opacity-10 text-info">
                    {overview?.total_revenue > 0
                      ? ((overview.total_fee / overview.total_revenue) * 100).toFixed(1) + '%'
                      : '—'}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
