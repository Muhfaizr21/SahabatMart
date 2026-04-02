import React, { useState, useEffect } from 'react';

const API = 'http://localhost:8080/api/admin';

const Badge = ({ status }) => {
  const map = {
    active:    { cls: 'bg-success bg-opacity-10 text-success', label: 'Aktif' },
    pending:   { cls: 'bg-warning text-dark', label: 'Pending' },
    suspended: { cls: 'bg-danger bg-opacity-10 text-danger', label: 'Suspended' },
    banned:    { cls: 'bg-dark text-white', label: 'Banned' },
  };
  const b = map[status] || { cls: 'bg-secondary text-white', label: status };
  return <span className={`badge ${b.cls}`}>{b.label}</span>;
};

export default function AdminMerchants() {
  const [merchants, setMerchants] = useState([]);
  const [stats, setStats]         = useState({});
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch]        = useState('');
  const [loading, setLoading]      = useState(true);
  const [selected, setSelected]    = useState(null); // for detail modal
  const [actionNote, setActionNote] = useState('');

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.append('status', filterStatus);
    if (search)       params.append('search', search);

    Promise.all([
      fetch(API + '/merchants?' + params).then(r => r.json()),
      fetch(API + '/merchants/stats').then(r => r.json()),
    ]).then(([list, s]) => {
      setMerchants(list.data || []);
      setStats(s);
    }).catch(() => {
      // mock data
      setMerchants([
        { id: 'm1', store_name: 'Toko Berkah', slug: 'toko-berkah', status: 'active', is_verified: true, balance: 2500000, total_sales: 15000000, joined_at: '2025-01-15' },
        { id: 'm2', store_name: 'Warung Jaya', slug: 'warung-jaya', status: 'pending', is_verified: false, balance: 0, total_sales: 0, joined_at: '2026-03-28' },
        { id: 'm3', store_name: 'Elektronik Murah', slug: 'elektronik-murah', status: 'suspended', is_verified: true, balance: 500000, total_sales: 8000000, joined_at: '2024-11-01' },
      ]);
      setStats({ total: 3, active: 1, pending: 1, suspended: 1, verified: 2 });
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterStatus]);

  const handleSearch = (e) => { e.preventDefault(); load(); };

  const updateStatus = (merchantId, status, note = '') => {
    fetch(API + '/merchants/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant_id: merchantId, status, suspend_note: note }),
    }).then(() => { load(); setSelected(null); });
  };

  const verify = (merchantId, verified) => {
    fetch(API + '/merchants/verify', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant_id: merchantId, verified }),
    }).then(() => load());
  };

  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Super Admin</div>
        <div className="ps-3"><nav><ol className="breadcrumb mb-0 p-0">
          <li className="breadcrumb-item active">Kelola Merchant</li>
        </ol></nav></div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total', val: stats.total || 0, color: '#4361ee' },
          { label: 'Aktif', val: stats.active || 0, color: '#06d6a0' },
          { label: 'Pending', val: stats.pending || 0, color: '#f4a261' },
          { label: 'Suspended', val: stats.suspended || 0, color: '#ef476f' },
          { label: 'Terverifikasi', val: stats.verified || 0, color: '#7209b7' },
        ].map(s => (
          <div key={s.label} className="col-6 col-sm-4 col-lg">
            <div className="card radius-10 h-100">
              <div className="card-body text-center py-3">
                <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 12, color: 'var(--bs-secondary-color)' }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card radius-10">
        <div className="card-body">
          {/* Filter Bar */}
          <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
            <form onSubmit={handleSearch} className="d-flex gap-2 flex-grow-1">
              <input
                type="text" className="form-control form-control-sm" style={{ maxWidth: 260 }}
                placeholder="Cari nama toko..." value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button className="btn btn-sm btn-primary" type="submit">
                <i className="bi bi-search"></i>
              </button>
            </form>
            <select className="form-select form-select-sm" style={{ width: 150 }}
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Toko</th>
                    <th>Status</th>
                    <th>Verified</th>
                    <th>Saldo</th>
                    <th>Total Sales</th>
                    <th>Bergabung</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {merchants.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-muted py-4">Tidak ada data merchant</td></tr>
                  ) : merchants.map(m => (
                    <tr key={m.id}>
                      <td>
                        <div className="fw-semibold">{m.store_name}</div>
                        <small className="text-muted">/{m.slug}</small>
                      </td>
                      <td><Badge status={m.status} /></td>
                      <td>
                        {m.is_verified
                          ? <span className="badge bg-success bg-opacity-10 text-success"><i className="bi bi-patch-check-fill me-1"></i>Verified</span>
                          : <span className="badge bg-secondary bg-opacity-10 text-secondary">Belum</span>}
                      </td>
                      <td className="fw-medium">{fmt(m.balance)}</td>
                      <td>{fmt(m.total_sales)}</td>
                      <td className="text-muted small">{m.joined_at ? new Date(m.joined_at).toLocaleDateString('id-ID') : '—'}</td>
                      <td>
                        <div className="d-flex gap-1">
                          {m.status !== 'active' && (
                            <button className="btn btn-xs btn-outline-success" title="Aktifkan"
                              onClick={() => updateStatus(m.id, 'active')}>
                              <i className="bi bi-check-circle"></i>
                            </button>
                          )}
                          {m.status !== 'suspended' && (
                            <button className="btn btn-xs btn-outline-warning" title="Suspend"
                              onClick={() => setSelected(m)}>
                              <i className="bi bi-slash-circle"></i>
                            </button>
                          )}
                          <button className={`btn btn-xs ${m.is_verified ? 'btn-outline-secondary' : 'btn-outline-primary'}`}
                            title={m.is_verified ? 'Batalkan Verifikasi' : 'Verifikasi'}
                            onClick={() => verify(m.id, !m.is_verified)}>
                            <i className={`bi ${m.is_verified ? 'bi-patch-check' : 'bi-patch-plus'}`}></i>
                          </button>
                          {m.status !== 'banned' && (
                            <button className="btn btn-xs btn-outline-danger" title="Ban"
                              onClick={() => { if (window.confirm('Ban merchant ini?')) updateStatus(m.id, 'banned'); }}>
                              <i className="bi bi-ban"></i>
                            </button>
                          )}
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

      {/* Suspend Modal */}
      {selected && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Suspend Merchant: {selected.store_name}</h5>
                <button className="btn-close" onClick={() => setSelected(null)}></button>
              </div>
              <div className="modal-body">
                <label className="form-label">Alasan Suspend</label>
                <textarea className="form-control" rows={3}
                  value={actionNote} onChange={e => setActionNote(e.target.value)}
                  placeholder="Jelaskan alasan suspend..."></textarea>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Batal</button>
                <button className="btn btn-warning btn-sm"
                  onClick={() => { updateStatus(selected.id, 'suspended', actionNote); setActionNote(''); }}>
                  Suspend Merchant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
