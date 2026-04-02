import React, { useState, useEffect } from 'react';

const API = 'http://localhost:8080/api/admin';
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

export default function AdminFinance() {
  const [overview, setOverview]   = useState(null);
  const [monthly, setMonthly]     = useState([]);
  const [txList, setTxList]       = useState([]);
  const [tab, setTab]             = useState('overview');
  const [loading, setLoading]     = useState(true);
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');

  useEffect(() => {
    Promise.all([
      fetch(API + '/finance').then(r => r.json()),
      fetch(API + '/finance/monthly').then(r => r.json()),
    ]).then(([ov, mo]) => {
      setOverview(ov);
      setMonthly(mo.data || []);
    }).catch(() => {
      setOverview({ total_revenue: 847500000, total_platform_fee: 42375000, pending_payout: 3200000, total_orders: 8542, completed_orders: 7214 });
      setMonthly([
        { month: '2026-01', revenue: 68000000, fee: 3400000, orders: 540 },
        { month: '2026-02', revenue: 72000000, fee: 3600000, orders: 590 },
        { month: '2026-03', revenue: 85000000, fee: 4250000, orders: 720 },
      ]);
    }).finally(() => setLoading(false));
  }, []);

  const loadTx = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('from', dateFrom);
    if (dateTo)   params.append('to', dateTo);
    fetch(API + '/finance/transactions?' + params)
      .then(r => r.json())
      .then(d => setTxList(d.data || []))
      .catch(() => setTxList([
        { id: 'tx1', store_name: 'Toko Berkah', subtotal: 450000, platform_fee: 22500, status: 'completed', created_at: '2026-04-01' },
        { id: 'tx2', store_name: 'Elektronik Murah', subtotal: 8500000, platform_fee: 425000, status: 'completed', created_at: '2026-04-01' },
      ]));
  };

  useEffect(() => { if (tab === 'transactions') loadTx(); }, [tab]);

  const maxRevenue = Math.max(...monthly.map(m => m.revenue), 1);

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Super Admin</div>
        <div className="ps-3"><nav><ol className="breadcrumb mb-0 p-0">
          <li className="breadcrumb-item active">Laporan Keuangan</li>
        </ol></nav></div>
      </div>

      {/* KPI */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Revenue', val: fmt(overview?.total_revenue), icon: 'bi-cash-stack', color: '#4361ee' },
          { label: 'Fee Platform', val: fmt(overview?.total_platform_fee), icon: 'bi-currency-dollar', color: '#06d6a0' },
          { label: 'Asuransi', val: fmt(overview?.total_insurance), icon: 'bi-shield-check', color: '#7209b7' },
          { label: 'Payout Pending', val: fmt(overview?.pending_payout), icon: 'bi-wallet2', color: '#f4a261' },
          { label: 'Total Pesanan', val: (overview?.total_orders || 0).toLocaleString(), icon: 'bi-bag', color: '#3a0ca3' },
        ].map(s => (
          <div key={s.label} className="col-6 col-lg">
            <div className="card radius-10 h-100">
              <div className="card-body">
                <div className="d-flex align-items-center gap-3">
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: s.color }}>
                    <i className={`bi ${s.icon}`}></i>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{loading ? '…' : s.val}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item"><button className={`nav-link ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>📊 Grafik Bulanan</button></li>
        <li className="nav-item"><button className={`nav-link ${tab === 'transactions' ? 'active' : ''}`} onClick={() => setTab('transactions')}>📋 Transaksi</button></li>
      </ul>

      {tab === 'overview' ? (
        <div className="card radius-10">
          <div className="card-body">
            <h6 className="fw-semibold mb-4">Revenue Bulanan</h6>
            {monthly.length === 0 ? (
              <div className="text-center text-muted py-5">
                <i className="bi bi-bar-chart fs-1 d-block mb-2 opacity-25"></i>
                Belum ada data transaksi
              </div>
            ) : (
              <>
                {/* Bar Chart Manual */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, marginBottom: 8, padding: '0 8px' }}>
                  {monthly.map(m => (
                    <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 10, color: '#4361ee', fontWeight: 600 }}>{fmt(m.revenue).replace('Rp\u00a0', 'Rp').replace(/\.000$/, 'K')}</div>
                      <div style={{
                        width: '100%', borderRadius: '6px 6px 0 0',
                        height: Math.max((m.revenue / maxRevenue) * 160, 4),
                        background: 'linear-gradient(180deg, #4361ee, #3a0ca3)',
                      }}></div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, padding: '0 8px' }}>
                  {monthly.map(m => (
                    <div key={m.month} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'var(--bs-secondary-color)' }}>
                      {m.month.slice(5)}
                    </div>
                  ))}
                </div>

                {/* Table */}
                <div className="table-responsive mt-4">
                  <table className="table table-sm align-middle">
                    <thead className="table-light">
                      <tr><th>Bulan</th><th>Revenue</th><th>Fee Platform</th><th>Pesanan</th><th>Margin</th></tr>
                    </thead>
                    <tbody>
                      {monthly.map(m => (
                        <tr key={m.month}>
                          <td className="fw-medium">{m.month}</td>
                          <td>{fmt(m.revenue)}</td>
                          <td className="text-success">{fmt(m.fee)}</td>
                          <td>{m.orders}</td>
                          <td>
                            <span className="text-muted">{m.revenue > 0 ? ((m.fee / m.revenue) * 100).toFixed(2) + '%' : '—'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="card radius-10">
          <div className="card-body">
            <div className="d-flex flex-wrap gap-2 mb-3 align-items-end">
              <div>
                <label className="form-label small mb-1">Dari</label>
                <input type="date" className="form-control form-control-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="form-label small mb-1">Sampai</label>
                <input type="date" className="form-control form-control-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              <button className="btn btn-sm btn-primary" onClick={loadTx}>Filter</button>
            </div>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr><th>ID</th><th>Toko</th><th>Subtotal</th><th>Fee Platform</th><th>Status</th><th>Tgl</th></tr>
                </thead>
                <tbody>
                  {txList.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-muted py-4">Tidak ada transaksi</td></tr>
                  ) : txList.map(t => (
                    <tr key={t.id}>
                      <td className="text-muted small">{t.id?.slice(0, 8)}…</td>
                      <td className="fw-medium">{t.store_name || '—'}</td>
                      <td>{fmt(t.subtotal)}</td>
                      <td className="text-success">{fmt(t.platform_fee)}</td>
                      <td>
                        <span className={`badge ${t.status === 'completed' ? 'bg-success bg-opacity-10 text-success' : 'bg-warning text-dark'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="text-muted small">{t.created_at ? new Date(t.created_at).toLocaleDateString('id-ID') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
