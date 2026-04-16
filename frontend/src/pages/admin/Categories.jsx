import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', description: '', order: 0 });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/categories`)
      .then(d => setCategories(d.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openForm = (cat = null) => {
    if (cat) {
      setFormData(cat);
    } else {
      setFormData({ name: '', slug: '', description: '', order: 0 });
    }
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    fetchJson(`${API}/categories/add`, {
      method: 'POST',
      body: JSON.stringify({ ...formData, parent_id: null }),
    }).then(() => {
      load();
      setShowModal(false);
    }).catch(err => alert("Gagal: " + err.message))
      .finally(() => setSaving(false));
  };

  const handleDelete = (id) => {
    if (!window.confirm('Hapus kategori ini secara permanen?')) return;
    fetchJson(`${API}/categories/delete?id=${id}`, { method: 'DELETE' })
      .then(() => load())
      .catch(err => alert("Gagal: " + err.message));
  };

  const handleNameChange = (name) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setFormData(prev => ({ ...prev, name, slug }));
  };

  return (
    <div className="container-fluid py-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Monster Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 bg-white p-4 rounded-4 shadow-sm border border-light gap-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">Product Categories</h4>
          <p className="text-secondary small mb-0">Atur hirarki kategori produk untuk navigasi yang lebih baik.</p>
        </div>
        <button className="btn btn-primary px-4 py-2 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow" onClick={() => openForm()}>
          <i className="bx bx-plus fs-5" /> Tambah Kategori
        </button>
      </div>

      {/* Modern Table List */}
      <div className="card border-0 rounded-4 shadow-sm overflow-hidden border border-light">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4 py-3 text-uppercase small fw-bold text-secondary">Identitas Kategori</th>
                <th className="py-3 text-uppercase small fw-bold text-secondary">URL Slug</th>
                <th className="py-3 text-uppercase small fw-bold text-secondary text-center">Urutan</th>
                <th className="pe-4 py-3 text-uppercase small fw-bold text-secondary text-end">Opsi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-5"><div className="spinner-border text-primary" /></td></tr>
              ) : categories.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-5 text-muted">Belum ada kategori terdaftar.</td></tr>
              ) : categories.map((cat, idx) => (
                <tr key={cat.id}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                        <i className="bx bx-tag fs-5" />
                      </div>
                      <div>
                        <div className="fw-bold text-dark fs-6">{cat.name}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>UID: {cat.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <code className="bg-light text-primary px-2 py-1 rounded small">/{cat.slug}</code>
                  </td>
                  <td className="text-center">
                    <span className="badge bg-light text-dark border px-3 py-2 rounded-pill small fw-bold">{cat.order}</span>
                  </td>
                  <td className="pe-4 text-end">
                    <div className="btn-group shadow-sm rounded-3 overflow-hidden">
                      <button className="btn btn-white btn-sm border-end px-3" onClick={() => openForm(cat)} title="Edit">
                        <i className="bx bx-edit-alt text-warning fs-5" />
                      </button>
                      <button className="btn btn-white btn-sm px-3" onClick={() => handleDelete(cat.id)} title="Hapus">
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
                  {formData.id ? 'Perbarui Kategori' : 'Buat Kategori Baru'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body p-4 pt-0">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3 mt-3">
                    <label className="form-label small fw-bold text-uppercase text-secondary">Nama Kategori</label>
                    <input type="text" className="form-control form-control-lg border-2 rounded-3 fs-6 mt-1" 
                      placeholder="Misal: Fashion Pria, Elektronik" value={formData.name} 
                      onChange={e => handleNameChange(e.target.value)} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-uppercase text-secondary">URL Slug (Auto)</label>
                    <input type="text" className="form-control form-control-lg border-2 rounded-3 fs-6 mt-1" 
                      placeholder="fashion-pria" value={formData.slug} 
                      onChange={e => setFormData({...formData, slug: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-uppercase text-secondary">Urutan Tampil</label>
                    <input type="number" className="form-control form-control-lg border-2 rounded-3 fs-6 mt-1" 
                      value={formData.order} onChange={e => setFormData({...formData, order: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="mb-4">
                    <label className="form-label small fw-bold text-uppercase text-secondary">Deskripsi Singkat</label>
                    <textarea className="form-control form-control-lg border-2 rounded-3 fs-6 mt-1" rows="3"
                      placeholder="Jelaskan isi kategori ini..." value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})} />
                  </div>
                  <div className="d-flex gap-2 pt-2">
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
}
