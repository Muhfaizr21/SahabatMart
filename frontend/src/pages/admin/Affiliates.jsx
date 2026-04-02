import React, { useState, useEffect } from 'react';

const API = 'http://localhost:8080/api/admin';
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

export default function AdminAffiliates() {
  const [affiliates, setAffiliates] = useState([]);
  const [configs, setConfigs]       = useState([]);
  const [tab, setTab]               = useState('members'); // 'members' | 'config'
  const [loading, setLoading]       = useState(true);
  const [editCfg, setEditCfg]       = useState(null);
  const [savingCfg, setSavingCfg]   = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(API + '/affiliates').then(r => r.json()),
      fetch(API + '/affiliates/configs').then(r => r.json()),
    ]).then(([af, cfg]) => {
      setAffiliates(af.data || []);
      setConfigs(cfg.data || []);
    }).catch(() => {
      setAffiliates([
        { id: 'a1', email: 'budi@mail.com', status: 'active', profile: { full_name: 'Budi Santoso' } },
        { id: 'a2', email: 'sari@mail.com', status: 'active', profile: { full_name: 'Sari Dewi' } },
      ]);
      setConfigs([
        { id: 1, tier_name: 'Bronze', comm_rate: 0.02, min_sales: 0, max_sales: 5000000, bonus_rate: 0, is_active: true },
        { id: 2, tier_name: 'Silver', comm_rate: 0.035, min_sales: 5000000, max_sales: 20000000, bonus_rate: 0.005, is_active: true },
        { id: 3, tier_name: 'Gold', comm_rate: 0.05, min_sales: 20000000, max_sales: 0, bonus_rate: 0.01, is_active: true },
      ]);
    }).finally(() => setLoading(false));
  }, []);

  const saveCfg = () => {
    if (!editCfg) return;
    setSavingCfg(true);
    fetch(API + '/affiliates/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editCfg),
    }).then(r => r.json()).then(res => {
      if (res.data) {
        setConfigs(prev => {
          const idx = prev.findIndex(c => c.id === res.data.id);
          if (idx >= 0) { const n=[...prev]; n[idx]=res.data; return n; }
          return [...prev, res.data];
        });
      }
      setEditCfg(null);
    }).catch(() => setEditCfg(null))
      .finally(() => setSavingCfg(false));
  };

  const tierColor = (tier) => {
    const map = { Bronze: '#cd7f32', Silver: '#a8a9ad', Gold: '#ffd700', Platinum: '#e5e4e2' };
    return map[tier] || '#888';
  };

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Super Admin</div>
        <div className="ps-3"><nav><ol className="breadcrumb mb-0 p-0">
          <li className="breadcrumb-item active">Member Affiliate</li>
        </ol></nav></div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>
            <i className="bi bi-people me-1"></i>Daftar Affiliate ({affiliates.length})
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'config' ? 'active' : ''}`} onClick={() => setTab('config')}>
            <i className="bi bi-sliders me-1"></i>Konfigurasi Tier Komisi
          </button>
        </li>
      </ul>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : tab === 'members' ? (
        <div className="card radius-10">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr><th>Nama</th><th>Email</th><th>Status</th><th>Tier</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {affiliates.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-muted py-4">Belum ada member affiliate</td></tr>
                  ) : affiliates.map(a => (
                    <tr key={a.id}>
                      <td className="fw-medium">{a.profile?.full_name || '—'}</td>
                      <td className="text-muted small">{a.email}</td>
                      <td>
                        <span className={`badge ${a.status === 'active' ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                          {a.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: tierColor('Bronze') + '22', color: tierColor('Bronze') }}>Bronze</span>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-xs btn-outline-primary"><i className="bi bi-eye"></i></button>
                          <button className="btn btn-xs btn-outline-warning"><i className="bi bi-pencil"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="d-flex justify-content-end mb-3">
            <button className="btn btn-sm btn-primary"
              onClick={() => setEditCfg({ id: 0, tier_name: '', comm_rate: 0.03, min_sales: 0, max_sales: 0, bonus_rate: 0, is_active: true })}>
              <i className="bi bi-plus-circle me-1"></i>Tambah Tier
            </button>
          </div>
          <div className="row g-3">
            {configs.map(c => (
              <div key={c.id} className="col-12 col-md-6 col-xl-4">
                <div className="card radius-10 h-100" style={{ borderTop: `4px solid ${tierColor(c.tier_name)}` }}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 className="mb-0 fw-bold" style={{ color: tierColor(c.tier_name) }}>{c.tier_name}</h5>
                        <small className="text-muted">{c.is_active ? 'Aktif' : 'Nonaktif'}</small>
                      </div>
                      <button className="btn btn-xs btn-outline-secondary" onClick={() => setEditCfg({ ...c })}>
                        <i className="bi bi-pencil"></i>
                      </button>
                    </div>
                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex justify-content-between">
                        <span className="text-muted small">Komisi Dasar</span>
                        <span className="fw-semibold text-success">{(c.comm_rate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted small">Bonus Rate</span>
                        <span className="fw-semibold text-info">{(c.bonus_rate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted small">Min Sales</span>
                        <span className="fw-semibold">{fmt(c.min_sales)}</span>
                      </div>
                      {c.max_sales > 0 && (
                        <div className="d-flex justify-content-between">
                          <span className="text-muted small">Max Sales</span>
                          <span className="fw-semibold">{fmt(c.max_sales)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Config Modal */}
      {editCfg && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editCfg.id === 0 ? 'Tambah' : 'Edit'} Tier Komisi</h5>
                <button className="btn-close" onClick={() => setEditCfg(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Nama Tier</label>
                    <select className="form-select" value={editCfg.tier_name}
                      onChange={e => setEditCfg(p => ({ ...p, tier_name: e.target.value }))}>
                      <option value="">-- Pilih --</option>
                      <option>Bronze</option><option>Silver</option><option>Gold</option><option>Platinum</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label">Komisi Dasar (%)</label>
                    <input type="number" className="form-control" step="0.01" min="0" max="100"
                      value={(editCfg.comm_rate * 100).toFixed(2)}
                      onChange={e => setEditCfg(p => ({ ...p, comm_rate: parseFloat(e.target.value) / 100 }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Bonus Rate (%)</label>
                    <input type="number" className="form-control" step="0.01" min="0" max="100"
                      value={(editCfg.bonus_rate * 100).toFixed(2)}
                      onChange={e => setEditCfg(p => ({ ...p, bonus_rate: parseFloat(e.target.value) / 100 }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Min Sales (Rp)</label>
                    <input type="number" className="form-control" min="0"
                      value={editCfg.min_sales}
                      onChange={e => setEditCfg(p => ({ ...p, min_sales: parseFloat(e.target.value) }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Max Sales (0=unlimited)</label>
                    <input type="number" className="form-control" min="0"
                      value={editCfg.max_sales}
                      onChange={e => setEditCfg(p => ({ ...p, max_sales: parseFloat(e.target.value) }))} />
                  </div>
                  <div className="col-12">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="isActiveCfg"
                        checked={editCfg.is_active}
                        onChange={e => setEditCfg(p => ({ ...p, is_active: e.target.checked }))} />
                      <label className="form-check-label" htmlFor="isActiveCfg">Tier Aktif</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setEditCfg(null)}>Batal</button>
                <button className="btn btn-primary btn-sm" disabled={savingCfg} onClick={saveCfg}>
                  {savingCfg ? <span className="spinner-border spinner-border-sm"></span> : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
