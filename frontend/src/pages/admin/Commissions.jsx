import React, { useState, useEffect } from 'react';

const API = 'http://localhost:8080/api/admin';

export default function AdminCommissions() {
  const [catComms, setCatComms]   = useState([]);
  const [mrcComms, setMrcComms]   = useState([]);
  const [tab, setTab]             = useState('category');
  const [loading, setLoading]     = useState(true);
  const [editCat, setEditCat]     = useState(null);
  const [editMrc, setEditMrc]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState('');

  useEffect(() => {
    Promise.all([
      fetch(API + '/commissions/category').then(r => r.json()),
      fetch(API + '/commissions/merchant').then(r => r.json()),
    ]).then(([cat, mrc]) => {
      setCatComms(cat.data || []);
      setMrcComms(mrc.data || []);
    }).catch(() => {
      setCatComms([
        { id: 1, category_id: 1, fee_percent: 0.05, fixed_fee: 0, is_active: true },
        { id: 2, category_id: 2, fee_percent: 0.08, fixed_fee: 500, is_active: true },
        { id: 3, category_id: 3, fee_percent: 0.03, fixed_fee: 0, is_active: false },
      ]);
      setMrcComms([]);
    }).finally(() => setLoading(false));
  }, []);

  const saveCat = () => {
    if (!editCat) return;
    setSaving(true);
    const method = editCat.id === 0 ? 'POST' : 'PUT';
    fetch(API + '/commissions/category', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editCat),
    }).then(r => r.json()).then(res => {
      if (res.data) {
        setCatComms(prev => {
          const idx = prev.findIndex(c => c.id === res.data.id);
          if (idx >= 0) { const n = [...prev]; n[idx] = res.data; return n; }
          return [...prev, res.data];
        });
      }
      setMsg('Komisi kategori berhasil disimpan');
      setTimeout(() => setMsg(''), 2500);
      setEditCat(null);
    }).catch(() => { setEditCat(null); })
      .finally(() => setSaving(false));
  };

  const saveMrc = () => {
    if (!editMrc) return;
    setSaving(true);
    const method = editMrc.id ? 'PUT' : 'POST';
    fetch(API + '/commissions/merchant', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editMrc),
    }).then(r => r.json()).then(res => {
      if (res.data) {
        setMrcComms(prev => {
          const idx = prev.findIndex(c => c.id === res.data.id);
          if (idx >= 0) { const n = [...prev]; n[idx] = res.data; return n; }
          return [...prev, res.data];
        });
      }
      setMsg('Komisi merchant berhasil disimpan');
      setTimeout(() => setMsg(''), 2500);
      setEditMrc(null);
    }).catch(() => setEditMrc(null))
      .finally(() => setSaving(false));
  };

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Super Admin</div>
        <div className="ps-3"><nav><ol className="breadcrumb mb-0 p-0">
          <li className="breadcrumb-item active">Konfigurasi Komisi</li>
        </ol></nav></div>
      </div>

      {msg && <div className="alert alert-success py-2 mb-3"><i className="bi bi-check-circle me-2"></i>{msg}</div>}

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${tab === 'category' ? 'active' : ''}`} onClick={() => setTab('category')}>
            <i className="bi bi-tag me-1"></i>Per Kategori ({catComms.length})
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'merchant' ? 'active' : ''}`} onClick={() => setTab('merchant')}>
            <i className="bi bi-shop me-1"></i>Override Merchant ({mrcComms.length})
          </button>
        </li>
      </ul>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : tab === 'category' ? (
        <div className="card radius-10">
          <div className="card-body">
            <div className="d-flex justify-content-end mb-3">
              <button className="btn btn-sm btn-primary"
                onClick={() => setEditCat({ id: 0, category_id: '', fee_percent: 0.05, fixed_fee: 0, is_active: true })}>
                <i className="bi bi-plus-circle me-1"></i>Tambah Komisi Kategori
              </button>
            </div>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID Kategori</th>
                    <th>Fee (%)</th>
                    <th>Fixed Fee</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {catComms.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-muted py-4">Belum ada konfigurasi komisi kategori</td></tr>
                  ) : catComms.map(c => (
                    <tr key={c.id}>
                      <td><span className="badge bg-primary bg-opacity-10 text-primary">Kategori #{c.category_id}</span></td>
                      <td>
                        <span className="fw-semibold text-success">{(c.fee_percent * 100).toFixed(2)}%</span>
                      </td>
                      <td>
                        {c.fixed_fee > 0
                          ? <span>Rp {c.fixed_fee.toLocaleString('id-ID')}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        <span className={`badge ${c.is_active ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary bg-opacity-10 text-secondary'}`}>
                          {c.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-xs btn-outline-primary" onClick={() => setEditCat({ ...c })}>
                          <i className="bi bi-pencil"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card radius-10">
          <div className="card-body">
            <div className="d-flex justify-content-end mb-3">
              <button className="btn btn-sm btn-primary"
                onClick={() => setEditMrc({ merchant_id: '', fee_percent: 0.04, fixed_fee: 0, valid_until: '' })}>
                <i className="bi bi-plus-circle me-1"></i>Tambah Override Merchant
              </button>
            </div>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Merchant ID</th>
                    <th>Fee (%)</th>
                    <th>Fixed Fee</th>
                    <th>Berlaku Sampai</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {mrcComms.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-muted py-4">Belum ada override komisi merchant</td></tr>
                  ) : mrcComms.map(c => (
                    <tr key={c.id}>
                      <td className="text-muted small">{c.merchant_id}</td>
                      <td><span className="fw-semibold text-success">{(c.fee_percent * 100).toFixed(2)}%</span></td>
                      <td>{c.fixed_fee > 0 ? `Rp ${c.fixed_fee.toLocaleString('id-ID')}` : '—'}</td>
                      <td className="text-muted small">{c.valid_until ? new Date(c.valid_until).toLocaleDateString('id-ID') : 'Permanen'}</td>
                      <td>
                        <button className="btn btn-xs btn-outline-primary" onClick={() => setEditMrc({ ...c })}>
                          <i className="bi bi-pencil"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Commission Modal */}
      {editCat && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editCat.id === 0 ? 'Tambah' : 'Edit'} Komisi Kategori</h5>
                <button className="btn-close" onClick={() => setEditCat(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">ID Kategori</label>
                    <input type="number" className="form-control" min="1"
                      value={editCat.category_id}
                      onChange={e => setEditCat(p => ({ ...p, category_id: parseInt(e.target.value) }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Fee Persen (%)</label>
                    <input type="number" className="form-control" step="0.01" min="0" max="100"
                      value={(editCat.fee_percent * 100).toFixed(2)}
                      onChange={e => setEditCat(p => ({ ...p, fee_percent: parseFloat(e.target.value) / 100 }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Fixed Fee (Rp)</label>
                    <input type="number" className="form-control" min="0"
                      value={editCat.fixed_fee}
                      onChange={e => setEditCat(p => ({ ...p, fixed_fee: parseFloat(e.target.value) }))} />
                  </div>
                  <div className="col-12">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="isCatActive"
                        checked={editCat.is_active}
                        onChange={e => setEditCat(p => ({ ...p, is_active: e.target.checked }))} />
                      <label className="form-check-label" htmlFor="isCatActive">Aktif</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setEditCat(null)}>Batal</button>
                <button className="btn btn-primary btn-sm" disabled={saving} onClick={saveCat}>
                  {saving ? <span className="spinner-border spinner-border-sm"></span> : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Merchant Commission Modal */}
      {editMrc && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Override Komisi Merchant</h5>
                <button className="btn-close" onClick={() => setEditMrc(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Merchant ID (UUID)</label>
                    <input type="text" className="form-control" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={editMrc.merchant_id}
                      onChange={e => setEditMrc(p => ({ ...p, merchant_id: e.target.value }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Fee Persen (%)</label>
                    <input type="number" className="form-control" step="0.01" min="0" max="100"
                      value={(editMrc.fee_percent * 100).toFixed(2)}
                      onChange={e => setEditMrc(p => ({ ...p, fee_percent: parseFloat(e.target.value) / 100 }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Fixed Fee (Rp)</label>
                    <input type="number" className="form-control" min="0"
                      value={editMrc.fixed_fee}
                      onChange={e => setEditMrc(p => ({ ...p, fixed_fee: parseFloat(e.target.value) }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Berlaku Sampai (kosong = permanen)</label>
                    <input type="date" className="form-control"
                      value={editMrc.valid_until ? editMrc.valid_until.slice(0, 10) : ''}
                      onChange={e => setEditMrc(p => ({ ...p, valid_until: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setEditMrc(null)}>Batal</button>
                <button className="btn btn-primary btn-sm" disabled={saving} onClick={saveMrc}>
                  {saving ? <span className="spinner-border spinner-border-sm"></span> : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
