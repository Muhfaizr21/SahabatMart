import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;

const AdminBrands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', logo_url: '', is_featured: false });
  const [saving, setSaving] = useState(false);

  const loadBrands = () => {
    setLoading(true);
    fetchJson(`${API}/brands`)
      .then(d => setBrands(d.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBrands(); }, []);

  const openForm = (brand = null) => {
    if (brand) {
      setFormData(brand);
    } else {
      setFormData({ name: '', logo_url: '', is_featured: false });
    }
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    fetchJson(`${API}/brands/upsert`, {
      method: 'POST',
      body: JSON.stringify(formData),
    }).then(() => {
      loadBrands();
      setShowModal(false);
    }).catch(err => alert("Gagal: " + err.message))
      .finally(() => setSaving(false));
  };

  const deleteBrand = (id) => {
    if (!window.confirm("Hapus brand ini secara permanen?")) return;
    fetchJson(`${API}/brands/delete?id=${id}`, { method: 'DELETE' })
      .then(() => loadBrands())
      .catch(err => alert("Gagal: " + err.message));
  };

  return (
    <div className="container-fluid py-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Monster Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 bg-white p-4 rounded-4 shadow-sm border border-light gap-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">Brand Portfolio</h4>
          <p className="text-secondary small mb-0">Kelola daftar merk produk yang beredar di platform SahabatMart.</p>
        </div>
        <button className="btn btn-primary px-4 py-2 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow" onClick={() => openForm()}>
          <i className="bx bx-plus fs-5" /> Tambah Brand
        </button>
      </div>

      {/* Modern Table List */}
      <div className="card border-0 rounded-4 shadow-sm overflow-hidden border border-light">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4 py-3 text-uppercase small fw-bold text-secondary">Identitas Merk</th>
                <th className="py-3 text-uppercase small fw-bold text-secondary text-center">Status</th>
                <th className="py-3 text-uppercase small fw-bold text-secondary text-center">Produk Terkait</th>
                <th className="pe-4 py-3 text-uppercase small fw-bold text-secondary text-end">Opsi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-5"><div className="spinner-border text-primary" /></td></tr>
              ) : brands.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-5 text-muted">Belum ada brand terdaftar.</td></tr>
              ) : brands.map(b => (
                <tr key={b.id}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center gap-3">
                      <img src={b.logo_url || 'https://via.placeholder.com/40'} 
                        className="rounded-3 border shadow-sm" style={{ width: 44, height: 44, objectFit: 'contain', background: '#fff' }} alt="" />
                      <div>
                        <div className="fw-bold text-dark fs-6">{b.name}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>UID: {b.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center">
                    {b.is_featured ? 
                      <span className="badge bg-warning-subtle text-warning px-3 py-2 rounded-pill small fw-bold">Unggulan</span> : 
                      <span className="badge bg-light text-secondary px-3 py-2 rounded-pill small">Reguler</span>
                    }
                  </td>
                  <td className="text-center">
                     <span className="fw-bold text-primary">0</span> <small className="text-muted small">Items</small>
                  </td>
                  <td className="pe-4 text-end">
                    <div className="btn-group shadow-sm rounded-3 overflow-hidden">
                      <button className="btn btn-white btn-sm border-end px-3" onClick={() => openForm(b)} title="Edit">
                        <i className="bx bx-edit-alt text-warning fs-5" />
                      </button>
                      <button className="btn btn-white btn-sm px-3" onClick={() => deleteBrand(b.id)} title="Hapus">
                        <i className="bx bx-trash text-danger fs-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MONSTER MODAL */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-0 p-4 pb-0">
                <h5 className="modal-title fw-bold text-dark">
                  {formData.id ? 'Perbarui Identitas Brand' : 'Daftarkan Brand Baru'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body p-4 pt-0">
                <form onSubmit={handleSubmit}>
                  <div className="mb-4 mt-3">
                    <label className="form-label small fw-bold text-uppercase text-secondary">Nama Brand</label>
                    <input type="text" className="form-control form-control-lg border-2 rounded-3 fs-6 mt-1" 
                      placeholder="Misal: Apple, Samsung, Nike" value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="mb-4">
                    <label className="form-label small fw-bold text-uppercase text-secondary">URL Logo (.png/.webp)</label>
                    <input type="text" className="form-control form-control-lg border-2 rounded-3 fs-6 mt-1" 
                      placeholder="https://link-logo.com/image.png" value={formData.logo_url} 
                      onChange={e => setFormData({...formData, logo_url: e.target.value})} />
                  </div>
                  <div className="mb-4">
                    <div className="form-check form-switch bg-light p-3 rounded-3 border">
                      <input className="form-check-input ms-0 me-2" type="checkbox" id="flexSwitchCheckDefault"
                         checked={formData.is_featured} onChange={e => setFormData({...formData, is_featured: e.target.checked})} />
                      <label className="form-check-label fw-bold text-dark" htmlFor="flexSwitchCheckDefault">Tampilkan sebagai Unggulan</label>
                    </div>
                  </div>
                  <div className="d-flex gap-2 pt-3">
                    <button type="button" className="btn btn-light w-50 py-3 rounded-3 fw-bold text-secondary" onClick={() => setShowModal(false)}>Batal</button>
                    <button type="submit" className="btn btn-primary w-50 py-3 rounded-3 fw-bold shadow" disabled={saving}>
                      {saving ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bx bx-save me-2" />}
                      Simpan Data
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBrands;
