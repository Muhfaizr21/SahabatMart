import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const txTypeLabels = {
  commission_earned:    { label: 'Komisi Masuk', icon: 'bx bx-plus-circle text-success' },
  commission_reversed:  { label: 'Komisi Ditarik', icon: 'bx bx-minus-circle text-danger' },
  sale_revenue:         { label: 'Penjualan', icon: 'bx bx-cart text-success' },
  sale_revenue_reversed: { label: 'Penjualan Dibatalkan', icon: 'bx bx-error-alt text-danger' },
  withdrawal_request:   { label: 'Penarikan (Reserved)', icon: 'bx bx-time text-warning' },
  withdrawal_completed: { label: 'Penarikan Selesai', icon: 'bx bx-check-double text-primary' },
  platform_fee:         { label: 'Fee Platform', icon: 'bx bx-building-house text-info' },
  refund_deduction:     { label: 'Potongan Refund', icon: 'bx bx-undo text-danger' },
};

export default function AdminFinance() {
  const [overview, setOverview]   = useState(null);
  const [monthly, setMonthly]     = useState([]);
  const [txList, setTxList]       = useState([]);
  const [ledgerList, setLedger]   = useState([]);
  const [tab, setTab]             = useState('overview');
  const [loading, setLoading]     = useState(true);
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [error, setError]         = useState('');

  const loadBase = () => {
    setLoading(true);
    Promise.all([
      fetchJson(API + '/finance'),
      fetchJson(API + '/finance/monthly'),
    ]).then(([ov, mo]) => {
      setOverview(ov);
      setMonthly(mo.data || []);
      setError('');
    }).catch(err => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(() => { loadBase(); }, []);

  const loadTx = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('from', dateFrom);
    if (dateTo)   params.append('to', dateTo);
    fetchJson(API + '/finance/transactions?' + params).then(d => setTxList(d.data || []));
  };

  const loadLedger = () => {
    fetchJson(API + '/finance/ledger').then(d => setLedger(d.data || []));
  };

  useEffect(() => {
    if (tab === 'transactions') loadTx();
    if (tab === 'ledger') loadLedger();
  }, [tab]);

  return (
    <div className="fade-in px-3">
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-4">
        <div className="breadcrumb-title pe-3 border-0 h5 mb-0 fw-bold">Financial Integrity</div>
        <div className="ps-3 border-start">
          <nav><ol className="breadcrumb mb-0 p-0 bg-transparent">
            <li className="breadcrumb-item"><Link to="/admin" className="text-decoration-none"><i className="bx bx-home-alt text-muted"></i></Link></li>
            <li className="breadcrumb-item active text-muted small">Accounting Statements</li>
          </ol></nav>
        </div>
      </div>

      {error && <div className="alert alert-danger radius-12 border-0 shadow-sm">{error}</div>}

      {/* Finance KPI */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Revenue', val: fmt(overview?.total_revenue), icon: 'bx-dollar-circle', color: '#4361ee' },
          { label: 'Platform Profits', val: fmt(overview?.total_platform_fee), icon: 'bx-line-chart', color: '#06d6a0' },
          { label: 'Payouts Pending', val: fmt(overview?.pending_payout), icon: 'bx-wallet', color: '#f4a261' },
          { label: 'Ledger Audit Entries', val: (ledgerList.length || 0).toLocaleString(), icon: 'bx-list-check', color: '#7209b7' },
        ].map(s => (
          <div key={s.label} className="col-12 col-sm-6 col-lg">
            <div className="card radius-15 border-0 shadow-sm h-100 kpi-card">
              <div className="card-body p-4">
                 <div className="d-flex align-items-center gap-3">
                    <div className="icon-box-sm shadow-sm" style={{ background: s.color + '12', color: s.color }}>
                       <i className={`bx ${s.icon} fs-4`}></i>
                    </div>
                    <div>
                       <div className="text-muted x-small fw-bold text-uppercase letter-spacing-1">{s.label}</div>
                       <div className="h4 mb-0 fw-bold">{loading ? '...' : s.val}</div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card radius-15 border-0 shadow-sm">
        <div className="card-header bg-white border-bottom-0 py-4 px-4">
          <ul className="nav nav-pills gap-2 bg-light p-1 radius-12" style={{ display: 'inline-flex' }}>
            {['overview', 'transactions', 'ledger'].map(t => (
              <li className="nav-item" key={t}>
                <button className={`nav-link radius-10 px-4 fw-bold small text-uppercase border-0 ${tab === t ? 'active bg-white text-primary shadow-sm' : 'text-muted bg-transparent'}`} 
                  onClick={() => setTab(t)}>
                  <i className={`bx ${t === 'overview' ? 'bx-grid-alt' : t === 'transactions' ? 'bx-transfer' : 'bx-file'} me-2`}></i>
                  {t === 'overview' ? 'Summary' : t === 'transactions' ? 'Transactions' : 'Ledger Audit'}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body px-4 pb-4 pt-0">
          {tab === 'overview' && (
             <div className="row g-4 fade-in">
                <div className="col-12">
                   <div className="bg-light bg-opacity-50 radius-15 p-4 mb-4 border border-white shadow-sm">
                      <div className="d-flex align-items-center justify-content-between mb-4">
                        <h6 className="fw-bold mb-0">Monthly Revenue Growth</h6>
                        <span className="badge bg-white text-dark shadow-sm radius-pill px-3 py-2 x-small fw-bold border-start border-4 border-primary">Real-time Data</span>
                      </div>
                      {monthly.length === 0 ? (
                        <div className="text-center text-muted py-5 x-small fw-bold">No historical data found</div>
                      ) : (
                        <div className="d-flex align-items-end gap-3" style={{ height: 180 }}>
                          {monthly.map(m => {
                            const max = Math.max(...monthly.map(x => x.revenue), 1);
                            const h = (m.revenue / max) * 100;
                            return (
                              <div key={m.month} className="flex-grow-1 d-flex flex-column align-items-center gap-2 h-100 justify-content-end">
                                <div className="text-primary x-small fw-bold">{fmt(m.revenue).replace('Rp\u00a0', '')}</div>
                                <div className="bg-primary radius-top-10 w-100 shadow-sm" style={{ height: `${Math.max(h, 4)}%`, opacity: 0.85 }}></div>
                                <div className="text-muted x-small fw-bold font-monospace">{m.month.slice(5)}</div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                   </div>
                </div>
                <div className="col-12 table-responsive">
                   <table className="table align-middle table-hover small">
                      <thead className="table-light">
                        <tr className="x-small text-uppercase text-muted fw-bold">
                          <th>PERIOD</th>
                          <th>GROSS REVENUE</th>
                          <th>PLATFORM FEE</th>
                          <th className="text-end">MARGIN RATIO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthly.map(m => (
                          <tr key={m.month}>
                            <td className="fw-bold text-dark font-monospace">{m.month}</td>
                            <td className="fw-medium">{fmt(m.revenue)}</td>
                            <td className="text-success fw-bold">{fmt(m.fee)}</td>
                            <td className="text-end font-monospace">
                              <span className="badge bg-primary bg-opacity-10 text-primary radius-pill px-3">
                                {(m.revenue > 0 ? (m.fee/m.revenue)*100 : 0).toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
             </div>
          )}

          {tab === 'transactions' && (
            <div className="fade-in">
               <div className="d-flex gap-2 mb-4 align-items-center bg-light p-3 radius-12 border border-white shadow-sm">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bx bx-calendar text-muted"></i>
                    <input type="date" className="form-control form-control-sm radius-8 border-0 shadow-sm" style={{width: 160}} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                  </div>
                  <span className="text-muted small fw-bold mx-2">to</span>
                  <div className="d-flex align-items-center gap-2">
                    <i className="bx bx-calendar text-muted"></i>
                    <input type="date" className="form-control form-control-sm radius-8 border-0 shadow-sm" style={{width: 160}} value={dateTo} onChange={e => setDateTo(e.target.value)} />
                  </div>
                  <button className="btn btn-sm btn-primary radius-10 px-4 ms-auto shadow-sm fw-bold" onClick={loadTx}>
                    <i className="bx bx-filter-alt me-1"></i> Filter Results
                  </button>
               </div>
               <div className="table-responsive">
                 <table className="table align-middle table-hover mb-0 small">
                   <thead className="table-light">
                      <tr className="x-small text-uppercase text-muted fw-bold">
                        <th className="ps-4">SERIAL ID</th>
                        <th>MERCHANT STORE</th>
                        <th>ORDER TOTAL</th>
                        <th className="text-success">COMMISSION</th>
                        <th className="pe-4 text-end">STATUS FLIGHT</th>
                      </tr>
                   </thead>
                   <tbody>
                     {txList.length === 0 ? <tr><td colSpan={5} className="text-center py-5 text-muted x-small fw-bold uppercase">No finalized transactions recorded.</td></tr> : txList.map(t => (
                       <tr key={t.id}>
                         <td className="ps-4 font-monospace fw-bold text-dark">{t.id?.slice(0, 8).toUpperCase()}</td>
                         <td>
                            <div className="d-flex align-items-center gap-2">
                               <i className="bx bx-store-alt text-muted small"></i>
                               <span className="fw-bold">{t.store_name}</span>
                            </div>
                         </td>
                         <td className="fw-bold text-dark">{fmt(t.subtotal)}</td>
                         <td className="text-success fw-bold">{fmt(t.platform_fee)}</td>
                         <td className="pe-4 text-end"><span className={`badge bg-success bg-opacity-10 text-success radius-pill px-3 py-2 small fw-bold`}>{t.status.toUpperCase()}</span></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {tab === 'ledger' && (
            <div className="fade-in">
               <div className="bg-primary bg-opacity-10 p-3 radius-12 mb-4 d-flex align-items-center justify-content-between border border-primary border-opacity-10 border-start-4">
                  <div>
                    <h6 className="fw-bold mb-1 text-primary">Immutable Financial Ledger</h6>
                    <p className="mb-0 x-small text-muted fw-medium letter-spacing-1">Atomic reconciliation log with 99.9% data integrity via Postgres Engine.</p>
                  </div>
                  <div className="icon-box shadow-sm bg-white text-primary rounded-circle">
                    <i className="bx bx-shield-check fs-4"></i>
                  </div>
               </div>
               <div className="table-responsive p-1">
                 <table className="table align-middle table-hover mb-0 small border-0">
                   <thead className="table-light x-small text-uppercase text-muted fw-bold">
                     <tr>
                        <th className="ps-4">TIMESTAMP</th>
                        <th>OPERATION TYPE</th>
                        <th>AMOUNT FLOW</th>
                        <th>POST-BALANCE</th>
                        <th>LIABILITIES</th>
                        <th className="pe-4 text-end">REFERENCE ID</th>
                     </tr>
                   </thead>
                   <tbody>
                     {ledgerList.length === 0 ? (
                       <tr><td colSpan={6} className="text-center py-5 text-muted x-small fw-bold">Awaiting initial entries for audit trail.</td></tr>
                     ) : ledgerList.map(l => (
                       <tr key={l.id}>
                         <td className="ps-4 text-muted x-small fw-bold font-monospace">{new Date(l.created_at).toLocaleString('id-ID')}</td>
                         <td>
                            <div className="d-flex align-items-center gap-2">
                               <i className={`${txTypeLabels[l.type]?.icon || 'bx bx-dots-horizontal-rounded'} fs-6`}></i>
                               <span className="fw-bold text-dark opacity-75">{txTypeLabels[l.type]?.label || l.type}</span>
                            </div>
                         </td>
                         <td className={l.amount < 0 ? 'text-danger fw-bold' : 'text-success fw-bold'}>
                           <span className="font-monospace small me-1">{l.amount < 0 ? '-' : '+'}</span>
                           {fmt(Math.abs(l.amount))}
                         </td>
                         <td className="fw-bold text-dark font-monospace">{fmt(l.balance_after)}</td>
                         <td className="text-muted x-small opacity-75 font-monospace">{fmt(l.pending_after)}</td>
                         <td className="pe-4 text-end font-monospace x-small text-muted">{l.reference_id?.slice(0, 14)}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
