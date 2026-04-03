import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const StatCard = ({ icon, label, value, color, sub }) => (
  <div className="card radius-10 border-0 shadow-sm h-100 fade-in">
    <div className="card-body">
      <div className="d-flex align-items-center gap-3">
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: color + '12',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color,
          boxShadow: `0 8px 16px -4px ${color}22`
        }}>
          <i className={`bi ${icon}`}></i>
        </div>
        <div className="min-w-0">
          <div className="text-muted small fw-medium mb-1" style={{ fontSize: '0.75rem', letterSpacing: '0.02em', textTransform: 'uppercase' }}>{label}</div>
          <div className="h4 mb-0 fw-bold" style={{ letterSpacing: '-0.02em' }}>{value}</div>
          {sub && <div className="text-muted x-small mt-1" style={{ fontSize: '0.7rem' }}>{sub}</div>}
        </div>
      </div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchJson(API + '/overview'),
      fetchJson(API + '/finance/monthly'),
    ]).then(([ov, mo]) => {
      setOverview(ov);
      setMonthly(mo.data || []);
      setError('');
    }).catch((err) => {
      setError(err.message || 'Gagal memuat dashboard admin');
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return (
    <div className="d-flex align-items-center justify-content-center" style={{ height: '60vh' }}>
      <div className="spinner-border text-primary border-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
    </div>
  );

  if (error) return <div className="alert alert-danger shadow-sm border-0 radius-10">{error}</div>;

  const stats = [
    { icon: 'bi-people', label: 'Total Pengguna', value: (overview?.total_users || 0).toLocaleString(), color: '#4361ee' },
    { icon: 'bi-shop', label: 'Merchant Aktif', value: (overview?.total_merchants || 0).toLocaleString(), color: '#3a0ca3', sub: `${overview?.pending_payouts || 0} payout pending` },
    { icon: 'bi-person-badge', label: 'Affiliates', value: (overview?.total_affiliates || 0).toLocaleString(), color: '#7209b7' },
    { icon: 'bi-bag-check', label: 'Pesanan', value: (overview?.total_orders || 0).toLocaleString(), color: '#f72585' },
    { icon: 'bi-cash-stack', label: 'Revenue', value: fmt(overview?.total_revenue), color: '#4cc9f0' },
    { icon: 'bi-bank', label: 'Fee Platform', value: fmt(overview?.total_fee), color: '#06d6a0' },
  ];

  return (
    <div className="fade-in">
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-4">
        <div className="breadcrumb-title pe-3 border-0 h5 mb-0">Overview</div>
        <div className="ps-3 border-start">
          <nav><ol className="breadcrumb mb-0 p-0 bg-transparent">
            <li className="breadcrumb-item active text-muted">Super Admin Dashboard</li>
          </ol></nav>
        </div>
        <div className="ms-auto">
           <button className="btn btn-primary btn-sm radius-10 px-3 shadow-sm" onClick={loadData}>
             <i className="bi bi-arrow-clockwise me-1"></i> Refresh Data
           </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="row g-3 mb-4">
        {stats.map(s => (
          <div key={s.label} className="col-12 col-sm-6 col-lg-4 col-xl-2">
            <StatCard {...s} />
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-8">
          <div className="card radius-10 border-0 shadow-sm mb-4">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <h6 className="mb-0 fw-bold">Statistik Pendapatan</h6>
                <div className="dropdown">
                  <button className="btn btn-light btn-sm dropdown-toggle radius-10" data-bs-toggle="dropdown">12 Bulan Terakhir</button>
                </div>
              </div>
              
              {monthly.length === 0 ? (
                <div className="text-center text-muted py-5">No transaction data available</div>
              ) : (
                <>
                  <div className="d-flex align-items-end gap-2 mb-4" style={{ height: 180 }}>
                    {monthly.map(m => {
                      const max = Math.max(...monthly.map(x => x.revenue), 1);
                      const height = (m.revenue / max) * 100;
                      return (
                        <div key={m.month} className="flex-grow-1 d-flex flex-column align-items-center gap-2">
                           <div className="bg-primary radius-10 w-100" style={{ height: `${Math.max(height, 5)}%`, opacity: 0.8 }}></div>
                           <div style={{ fontSize: 9 }} className="text-muted">{m.month.split('-')[1]}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr className="small text-uppercase"><th>Bulan</th><th>Revenue</th><th>Fee Platform</th><th>Orders</th></tr>
                      </thead>
                      <tbody className="small">
                        {monthly.map(m => (
                          <tr key={m.month}>
                            <td className="fw-semibold">{m.month}</td>
                            <td>{fmt(m.revenue)}</td>
                            <td className="text-success fw-medium">+{fmt(m.fee)}</td>
                            <td><span className="badge bg-primary bg-opacity-10 text-primary radius-pill">{m.orders}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4 text">
           <div className="card radius-10 border-0 shadow-sm mb-4 bg-primary text-white overflow-hidden position-relative">
              <div className="card-body p-4 position-relative" style={{ zIndex: 1 }}>
                 <h5 className="mb-3 opacity-75 fw-medium">Status Platform</h5>
                 <div className="display-6 fw-bold mb-1">99.9%</div>
                 <p className="mb-4 small opacity-75">Sistem Audit Aktif & Real-time</p>
                 <div className="d-flex gap-2">
                    <Link to="/admin/audit" className="btn btn-light btn-sm radius-10 px-3">Lihat Log Audit</Link>
                    <Link to="/admin/finance" className="btn btn-outline-light btn-sm radius-10 px-3">Ledger</Link>
                 </div>
              </div>
              <div className="position-absolute end-0 bottom-0 p-3 opacity-10">
                 <i className="bi bi-shield-check" style={{ fontSize: '8rem' }}></i>
              </div>
           </div>

           <div className="card radius-10 border-0 shadow-sm">
             <div className="card-body">
               <h6 className="fw-bold mb-3">Aksi Cepat</h6>
               <div className="d-grid gap-2">
                  <Link to="/admin/products/add" className="btn btn-light btn-sm text-start radius-10 p-2 px-3 border">
                    <i className="bi bi-plus-circle-fill text-primary me-2"></i> Tambah Produk Baru
                  </Link>
                  <Link to="/admin/merchants" className="btn btn-light btn-sm text-start radius-10 p-2 px-3 border">
                    <i className="bi bi-shop text-success me-2"></i> Verifikasi Merchant
                  </Link>
                  <Link to="/admin/payouts" className="btn btn-light btn-sm text-start radius-10 p-2 px-3 border">
                    <i className="bi bi-wallet2 text-danger me-2"></i> Proses Penarikan Dana
                  </Link>
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
