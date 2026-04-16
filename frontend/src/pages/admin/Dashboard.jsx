import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const StatCard = ({ icon, label, value, color, sub, trend }) => (
  <div className="card border-0 shadow-sm rounded-4 h-100 transition-all border border-light overflow-hidden">
    <div className="card-body p-4">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div style={{
          width: 48, height: 48, borderRadius: '12px',
          background: color + '15',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', color
        }}>
          <i className={`bx ${icon}`}></i>
        </div>
        {trend && (
           <span className="badge bg-success-subtle text-success rounded-pill px-2 py-1" style={{ fontSize: '0.7rem' }}>
              <i className="bx bx-up-arrow-alt me-1" />{trend}
           </span>
        )}
      </div>
      <div>
        <div className="text-secondary small fw-bold text-uppercase mb-1" style={{ letterSpacing: '0.05em', fontSize: '0.65rem' }}>{label}</div>
        <h3 className="fw-bold mb-0 text-dark" style={{ letterSpacing: '-0.02em' }}>{value}</h3>
        {sub && <div className="text-muted mt-2 small d-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}><i className="bx bxs-info-circle opacity-50" /> {sub}</div>}
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
      <div className="spinner-border text-primary border-3" style={{ width: '2.5rem', height: '2.5rem' }}></div>
    </div>
  );

  if (error) return (
     <div className="alert alert-danger rounded-4 shadow-sm border-0 d-flex align-items-center gap-3">
        <i className="bx bx-error fs-4" /> {error}
     </div>
  );

  const stats = [
    { icon: 'bx-group', label: 'Total Pengguna', value: (overview?.total_users || 0).toLocaleString(), color: '#4361ee', trend: '+12%' },
    { icon: 'bx-store-alt', label: 'Merchant Aktif', value: (overview?.total_merchants || 0).toLocaleString(), color: '#7209b7', sub: `${overview?.pending_payouts || 0} payout menunggu` },
    { icon: 'bx-link-alt', label: 'Global Affiliates', value: (overview?.total_affiliates || 0).toLocaleString(), color: '#3a0ca3' },
    { icon: 'bx-shopping-bag', label: 'Total Pesanan', value: (overview?.total_orders || 0).toLocaleString(), color: '#f72585', trend: '+8%' },
    { icon: 'bx-wallet', label: 'GMV (Gross Merchandise)', value: fmt(overview?.total_revenue), color: '#4cc9f0' },
    { icon: 'bx-line-chart', label: 'Net Platform Fee', value: fmt(overview?.total_fee), color: '#06d6a0', sub: 'Pendapatan Bersih' },
  ];

  return (
    <div className="container-fluid py-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Monster Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 bg-white p-4 rounded-4 shadow-sm border border-light gap-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">Business Analytics Center</h4>
          <p className="text-secondary small mb-0">Selamat datang kembali, Super Admin. Pantau ekosistem SahabatMart Anda hari ini.</p>
        </div>
        <div className="d-flex gap-2">
           <button className="btn btn-outline-primary fw-bold px-4 rounded-3 border shadow-sm" onClick={loadData}>
             <i className="bx bx-refresh me-1" /> Refresh Data
           </button>
           <button className="btn btn-primary fw-bold px-4 rounded-3 shadow-sm">
             <i className="bx bx-cloud-download me-1" /> Report
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
          <div className="card bg-white border-0 rounded-4 shadow-sm h-100 border border-light overflow-hidden">
            <div className="card-header bg-white border-0 p-4 pb-0">
               <div className="d-flex align-items-center justify-content-between">
                  <h6 className="fw-bold text-dark mb-0">Skala Penjualan Bulanan</h6>
                  <span className="badge bg-light text-primary rounded-pill px-3 py-2 border">Real-time Analytics</span>
               </div>
            </div>
            <div className="card-body p-4">
              {monthly.length === 0 ? (
                <div className="text-center text-muted py-5 mt-4">
                   <i className="bx bx-bar-chart-alt text-light-emphasis fs-1 d-block mb-3" />
                   Data transaksi belum masuk.
                </div>
              ) : (
                <>
                  <div className="d-flex align-items-end gap-2 mb-4" style={{ height: 200 }}>
                    {monthly.map(m => {
                      const max = Math.max(...monthly.map(x => x.revenue), 1);
                      const height = (m.revenue / max) * 100;
                      return (
                        <div key={m.month} className="flex-grow-1 d-flex flex-column align-items-center gap-2 group">
                           <div className="bg-primary-subtle border-start border-primary border-4 w-100 transition-all rounded-top-2" 
                                style={{ height: `${Math.max(height, 5)}%`, opacity: 0.8 }} 
                                title={fmt(m.revenue)}></div>
                           <div style={{ fontSize: 9 }} className="text-muted fw-bold">{m.month.split('-')[1]}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 mt-3 border rounded-3 overflow-hidden">
                      <thead className="bg-light">
                        <tr className="small text-uppercase text-secondary fw-bold">
                           <th className="ps-3">Periode</th>
                           <th>Revenue</th>
                           <th>Admin Fee</th>
                           <th className="pe-3 text-end">Orders</th>
                        </tr>
                      </thead>
                      <tbody className="small">
                        {monthly.map(m => (
                          <tr key={m.month}>
                            <td className="ps-3 fw-bold text-dark">{m.month}</td>
                            <td className="fw-bold">{fmt(m.revenue)}</td>
                            <td className="text-success fw-bold">+{fmt(m.fee)}</td>
                            <td className="pe-3 text-end"><span className="badge bg-indigo rounded-pill px-3 py-1 fw-bold">{m.orders} Sales</span></td>
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

        <div className="col-12 col-xl-4">
           {/* System Health Card */}
           <div className="card rounded-4 border-0 shadow-sm mb-4 bg-dark text-white overflow-hidden position-relative" style={{ minHeight: 180 }}>
              <div className="card-body p-4 position-relative" style={{ zIndex: 1 }}>
                 <div className="d-flex align-items-center gap-2 text-success mb-2">
                    <span className="dot dot-success pulse" />
                    <span className="small fw-bold text-uppercase" style={{ letterSpacing: '0.1em' }}>System Operational</span>
                 </div>
                 <h2 className="fw-bold mb-1">99.8% Efficiency</h2>
                 <p className="mb-4 small opacity-50">Node Server & DB Optimized for SahabatMart Enterprise</p>
                 <div className="d-flex gap-2">
                    <Link to="/admin" className="btn btn-primary btn-sm rounded-pill px-3 fw-bold">Live Stats</Link>
                    <Link to="/admin/finance" className="btn btn-outline-light btn-sm rounded-pill px-3 fw-bold">Ledger Overview</Link>
                 </div>
              </div>
              <div className="position-absolute end-0 bottom-0 p-3 opacity-10">
                 <i className="bx bx-analyse" style={{ fontSize: '8rem' }}></i>
              </div>
           </div>

           <div className="card rounded-4 border-0 shadow-sm border border-light">
             <div className="card-body p-4">
               <h6 className="fw-bold text-dark mb-4 d-flex align-items-center gap-2">
                 <i className="bx bxs-bolt text-warning" /> Quick Shortcuts
               </h6>
               <div className="d-grid gap-3">
                  <Link to="/admin/products/add" className="btn btn-light text-start rounded-3 p-3 border shadow-sm d-flex align-items-center gap-3">
                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                       <i className="bx bx-plus" />
                    </div>
                    <div>
                       <div className="fw-bold text-dark small">Tambah Inventori</div>
                       <div className="text-muted" style={{ fontSize: 10 }}>Global product expansion</div>
                    </div>
                  </Link>
                  <Link to="/admin/merchants" className="btn btn-light text-start rounded-3 p-3 border shadow-sm d-flex align-items-center gap-3">
                    <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                       <i className="bx bx-store" />
                    </div>
                    <div>
                       <div className="fw-bold text-dark small">Audit Merchant</div>
                       <div className="text-muted" style={{ fontSize: 10 }}>Review and verify partners</div>
                    </div>
                  </Link>
                  <Link to="/admin/finance" className="btn btn-light text-start rounded-3 p-3 border shadow-sm d-flex align-items-center gap-3">
                    <div className="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                       <i className="bx bx-wallet" />
                    </div>
                    <div>
                       <div className="fw-bold text-dark small">Pencairan Dana</div>
                       <div className="text-muted" style={{ fontSize: 10 }}>Process payout queue</div>
                    </div>
                  </Link>
               </div>
             </div>
           </div>
        </div>
      </div>
      
      <style>{`
        .bg-indigo { background: #6610f2; }
        .bg-primary-subtle { background: #e7f0ff; }
        .dot { height: 10px; width: 10px; border-radius: 50%; display: inline-block; }
        .dot-success { background-color: #06d6a0; box-shadow: 0 0 10px #06d6a0; }
        .pulse { animation: pulse-animation 2s infinite; }
        @keyframes pulse-animation {
          0% { box-shadow: 0 0 0 0px rgba(6, 214, 160, 0.7); }
          100% { box-shadow: 0 0 0 10px rgba(6, 214, 160, 0); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
