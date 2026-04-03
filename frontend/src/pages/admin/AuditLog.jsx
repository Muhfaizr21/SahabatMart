import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;

const actionBadges = {
  login:                 'bg-primary',
  logout:                'bg-secondary',
  create_product:        'bg-success',
  update_product:        'bg-info',
  delete_product:        'bg-danger',
  moderate_product:      'bg-warning text-dark',
  update_merchant_status: 'bg-info',
  verify_merchant:       'bg-success',
  update_order_status:   'bg-primary',
  upsert_commission:     'bg-purple',
  process_payout:        'bg-dark',
  update_user:           'bg-indigo',
};

const actionIcons = {
  login:                 'bx-log-in-circle',
  logout:                'bx-log-out-circle',
  create_product:        'bx-package',
  update_product:        'bx-edit',
  delete_product:        'bx-trash',
  moderate_product:      'bx-check-shield',
  update_merchant_status: 'bx-store',
  verify_merchant:       'bx-badge-check',
  update_order_status:   'bx-receipt',
  upsert_commission:     'bx-percentage',
  process_payout:        'bx-wallet',
};

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const loadLogs = () => {
    setLoading(true);
    fetchJson(`${API}/audit-logs?search=${search}&action=${actionFilter}`)
      .then(d => setLogs(d.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLogs(); }, [actionFilter]);

  return (
    <div className="fade-in px-3">
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-4">
        <div className="breadcrumb-title pe-3 border-0 h5 mb-0 fw-bold text-dark">Forensic Journal</div>
        <div className="ps-3 border-start">
          <nav><ol className="breadcrumb mb-0 p-0 bg-transparent">
            <li className="breadcrumb-item"><Link to="/admin" className="text-decoration-none"><i className="bx bx-home-alt text-muted"></i></Link></li>
            <li className="breadcrumb-item active text-muted small">System Audit Trails</li>
          </ol></nav>
        </div>
      </div>

      <div className="card radius-15 border-0 shadow-sm overflow-hidden mt-3">
        <div className="card-header bg-white py-4 border-bottom-0 px-4">
           <div className="bg-primary bg-opacity-10 p-3 radius-12 mb-4 d-flex align-items-center gap-3 border-start border-4 border-primary">
              <i className="bx bx-shield-quarter fs-3 text-primary"></i>
              <div>
                 <h6 className="mb-0 fw-bold text-primary">Sentinel Monitoring Active</h6>
                 <p className="mb-0 x-small text-dark opacity-75 fw-bold">ALL ADMINISTRATIVE ACTIONS ARE LOGGED FOR SECURITY COMPLIANCE.</p>
              </div>
           </div>
           
           <div className="row g-3">
             <div className="col-12 col-md-6">
               <div className="position-relative">
                 <span className="position-absolute top-50 translate-middle-y ms-3 text-muted"><i className="bx bx-search fs-5"></i></span>
                 <input type="search" className="form-control form-control-lg ps-5 radius-12 border-0 bg-light small" 
                   placeholder="Search audit entries by detail or ID..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadLogs()} />
               </div>
             </div>
             <div className="col-12 col-md-4 ms-auto">
                <select className="form-select form-select-lg radius-12 border-0 bg-light fw-bold small text-muted px-3" 
                  value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
                   <option value="">Event Category Filter</option>
                   <option value="login">System Access Events</option>
                   <option value="create_product">Inventory Modifications</option>
                   <option value="update_merchant_status">Merchant Status Change</option>
                   <option value="process_payout">Financial Disbursements</option>
                </select>
             </div>
           </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary border-3"></div></div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle table-hover mb-0 small border-0">
                <thead className="table-light">
                  <tr className="x-small text-uppercase text-muted fw-bold">
                    <th className="ps-4">EVENT TIMESTAMP</th>
                    <th>OPERATOR</th>
                    <th>ACTION / EVENT</th>
                    <th>TARGET</th>
                    <th className="pe-4">DETAILED OPERATION LOG</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {logs.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-5 text-muted x-small uppercase fw-bold">No security events matched the criteria.</td></tr>
                  ) : logs.map((log) => (
                    <tr key={log.id}>
                      <td className="ps-4">
                        <div className="text-dark fw-bold font-monospace x-small mb-1">{new Date(log.created_at).toLocaleString('id-ID')}</div>
                        <div className="x-small text-muted opacity-75">{log.ip_address}</div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                           <div className="bg-light rounded-circle p-2 small"><i className="bx bx-user-pin fs-6"></i></div>
                           <span className="fw-bold text-dark">{log.admin_id}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${actionBadges[log.action] || 'bg-light text-dark shadow-sm'} radius-pill px-3 py-2 x-small fw-bold border-0`}>
                           <i className={`bx ${actionIcons[log.action] || 'bx-info-circle'} me-1`}></i>
                           {log.action.toUpperCase().replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td><span className="badge bg-light border text-muted px-2 py-1 radius-8 x-small">{log.target_type}</span></td>
                      <td className="pe-4">
                        <div className="p-2 radius-8 bg-light text-dark x-small opacity-75 font-monospace" style={{ maxWidth: 300, borderLeft: '3px solid #dee2e6' }}>
                           {log.detail}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
