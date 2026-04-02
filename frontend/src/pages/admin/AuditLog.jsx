import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;

const actionColors = {
  update_user:              '#4361ee',
  delete_user:              '#ef476f',
  update_merchant_status:   '#f4a261',
  verify_merchant:          '#06d6a0',
  moderate_product:         '#7209b7',
  delete_product:           '#ef476f',
  upsert_commission:        '#3a0ca3',
  upsert_merchant_commission: '#7209b7',
  upsert_settings:          '#4cc9f0',
  process_payout:           '#06d6a0',
  upsert_brand:             '#4361ee',
  delete_brand:             '#ef476f',
  upsert_region:            '#06d6a0',
  upsert_voucher:           '#7209b7',
  arbitrate_dispute:        '#f4a261',
  upsert_affiliate_config:  '#f4a261',
};

export default function AdminAuditLog() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom]       = useState('');
  const [to, setTo]           = useState('');
  const [action, setAction]   = useState('');
  const [targetType, setTarget] = useState('');
  const [adminId, setAdminId] = useState('');
  const [error, setError]     = useState('');

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from)       params.append('from', from);
    if (to)         params.append('to', to);
    if (action)     params.append('action', action);
    if (targetType) params.append('target_type', targetType);
    if (adminId)    params.append('admin_id', adminId);

    fetchJson(API + '/audit-logs?' + params)
      .then(d => {
        setLogs(d.data || []);
        setError('');
      })
      .catch((err) => {
        setLogs([]);
        setError(err.message || 'Gagal memuat audit log');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchJson(API + '/audit-logs')
      .then(d => {
        setLogs(d.data || []);
        setError('');
      })
      .catch((err) => {
        setLogs([]);
        setError(err.message || 'Gagal memuat audit log');
      })
      .finally(() => setLoading(false));
  }, []);

  const allActions = [...new Set([
    ...Object.keys(actionColors),
    ...logs.map(l => l.action),
  ])];

  const allTargets = [...new Set(['user', 'merchant', 'product', 'payout', 'platform_config', 'category_commission', 'merchant_commission', 'affiliate_config'])];

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Super Admin</div>
        <div className="ps-3"><nav><ol className="breadcrumb mb-0 p-0">
          <li className="breadcrumb-item active">Audit Log</li>
        </ol></nav></div>
      </div>

      <div className="card radius-10">
        <div className="card-body">
          {/* Filters */}
          <div className="d-flex flex-wrap gap-2 mb-4 align-items-end">
            <div>
              <label className="form-label small mb-1">Dari</label>
              <input type="date" className="form-control form-control-sm" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="form-label small mb-1">Sampai</label>
              <input type="date" className="form-control form-control-sm" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div>
              <label className="form-label small mb-1">Aksi</label>
              <select className="form-select form-select-sm" style={{ minWidth: 180 }} value={action} onChange={e => setAction(e.target.value)}>
                <option value="">Semua Aksi</option>
                {allActions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label small mb-1">Target</label>
              <select className="form-select form-select-sm" style={{ minWidth: 160 }} value={targetType} onChange={e => setTarget(e.target.value)}>
                <option value="">Semua Target</option>
                {allTargets.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label small mb-1">Cari Admin ID</label>
              <input type="text" className="form-control form-control-sm" placeholder="Input ID..." value={adminId} onChange={e => setAdminId(e.target.value)} />
            </div>
            <button className="btn btn-sm btn-primary" onClick={load}>
              <i className="bi bi-funnel me-1"></i>Filter
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => { setFrom(''); setTo(''); setAction(''); setTarget(''); setTimeout(load, 0); }}>
              Reset
            </button>
          </div>

          {/* Summary */}
          <div className="d-flex gap-3 mb-3 flex-wrap">
            <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2">
              {logs.length} Log Ditemukan
            </span>
            {action && (
              <span className="badge bg-info bg-opacity-10 text-info px-3 py-2">
                Aksi: {action}
              </span>
            )}
          </div>

          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : error ? (
            <div className="alert alert-danger mb-0">{error}</div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0 table-sm">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Waktu</th>
                    <th>Admin</th>
                    <th>Aksi</th>
                    <th>Target</th>
                    <th>Detail</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-muted py-4">
                      <i className="bi bi-journal-x fs-2 d-block mb-2 opacity-25"></i>
                      Tidak ada log ditemukan
                    </td></tr>
                  ) : logs.map((l, i) => (
                    <tr key={l.id || i}>
                      <td className="text-muted small">{l.id}</td>
                      <td className="text-muted small" style={{ whiteSpace: 'nowrap' }}>
                        {l.created_at ? new Date(l.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td>
                        <code className="small">{l.admin_id?.slice(0, 12) || 'system'}</code>
                      </td>
                      <td>
                        <span className="badge"
                          style={{
                            background: (actionColors[l.action] || '#888') + '22',
                            color: actionColors[l.action] || '#888',
                            fontSize: 11,
                          }}>
                          {l.action}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-secondary bg-opacity-10 text-secondary" style={{ fontSize: 11 }}>
                          {l.target_type}
                        </span>
                        {l.target_id && (
                          <code className="ms-1 text-muted" style={{ fontSize: 10 }}>
                            {l.target_id.length > 14 ? l.target_id.slice(0, 8) + '…' : l.target_id}
                          </code>
                        )}
                      </td>
                      <td className="text-muted small" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.detail || '—'}
                      </td>
                      <td className="text-muted small"><code>{l.ip_address}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
