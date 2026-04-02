import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = 'http://localhost:8080/api/admin';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', slug: '', parent_id: 0, description: '', order: 0 });
  const [saving, setSaving] = useState(false);

  const loadCategories = () => {
    setLoading(true);
    fetch(`${API}/categories`)
      .then(r => r.json())
      .then(d => setCategories(d.data || []))
      .catch(err => console.error("Error loading categories:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    const key = id.replace('cat', '').toLowerCase();
    setFormData(prev => ({ 
      ...prev, 
      [key === 'name' ? 'name' : key === 'slug' ? 'slug' : key === 'desc' ? 'description' : key]: key === 'order' ? parseInt(value) || 0 : value 
    }));
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) return alert("Nama dan Slug wajib diisi!");
    
    setSaving(true);
    const payload = { 
        ...formData, 
        parent_id: formData.parent_id > 0 ? parseInt(formData.parent_id) : null 
    };

    fetch(`${API}/categories/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(r => r.json()).then(() => {
      loadCategories();
      setFormData({ name: '', slug: '', parent_id: 0, description: '', order: 0 });
    }).catch(err => console.error("Error adding category:", err))
      .finally(() => setSaving(false));
  };

  const handleDeleteCategory = (id) => {
    if (!window.confirm("Hapus kategori ini?")) return;
    fetch(`${API}/categories/delete?id=${id}`, {
      method: 'DELETE',
    }).then(() => {
      loadCategories();
    });
  };

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Super Admin</div>
        <div className="ps-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 p-0">
              <li className="breadcrumb-item"><Link to="/admin"><i className="bx bx-home-alt"></i></Link></li>
              <li className="breadcrumb-item active" aria-current="page">Kelola Kategori</li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="card radius-10">
        <div className="card-header py-3">
          <h6 className="mb-0 fw-bold">Manajemen Kategori Produk</h6>
        </div>
        <div className="card-body">
            <div className="row g-4">
              {/* Form Tambah */}
              <div className="col-12 col-lg-4">
                <div className="card border shadow-none w-100 mb-0">
                  <div className="card-header bg-light-info text-info">
                      <small className="fw-bold">TAMBAH KATEGORI BARU</small>
                  </div>
                  <div className="card-body">
                    <form className="row g-3" onSubmit={handleAddCategory}>
                      <div className="col-12">
                        <label className="form-label small fw-bold">Nama Kategori</label>
                        <input id="catName" type="text" className="form-control form-control-sm" placeholder="Contoh: Fashion Pria" 
                          value={formData.name} onChange={handleChange} required />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold">Slug (URL)</label>
                        <input id="catSlug" type="text" className="form-control form-control-sm" placeholder="Contoh: fashion-pria" 
                          value={formData.slug} onChange={handleChange} required />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold">Urutan</label>
                        <input id="catOrder" type="number" className="form-control form-control-sm" 
                          value={formData.order} onChange={handleChange} />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold">Deskripsi</label>
                        <textarea id="catDesc" className="form-control form-control-sm" rows="3" placeholder="Ringkasan kategori..." 
                          value={formData.description} onChange={handleChange}></textarea>
                      </div>
                      <div className="col-12">
                        <div className="d-grid mt-2">
                          <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
                            {saving ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-plus-circle me-1"></i>}
                            Simpan Kategori
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              {/* List Table */}
              <div className="col-12 col-lg-8">
                <div className="card border shadow-none w-100 mb-0">
                  <div className="card-body p-0">
                    <div className="table-responsive">
                       <table className="table align-middle table-striped mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#ID</th>
                            <th>Nama</th>
                            <th>URL Slug</th>
                            <th className="text-center">Order</th>
                            <th className="text-end">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr><td colSpan={5} className="text-center py-4"><div className="spinner-border text-primary"></div></td></tr>
                          ) : categories.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-4 text-muted">Belum ada kategori</td></tr>
                          ) : categories.map((cat) => (
                            <tr key={cat.id}>
                              <td className="small text-muted">{cat.id}</td>
                              <td>
                                <div className="d-flex align-items-center">
                                  {cat.parent_id > 0 && <span className="ms-3 me-2 border-start border-bottom rounded-bottom-start" style={{width: 15, height: 10, display: 'inline-block', marginTop: -5}}></span>}
                                  <span className={`fw-bold ${cat.parent_id > 0 ? 'small' : 'fs-6'}`}>{cat.name}</span>
                                </div>
                              </td>
                              <td><code className="small">/{cat.slug}</code></td>
                              <td className="text-center"><span className="badge bg-light-primary text-primary px-3 rounded-pill">{cat.order}</span></td>
                              <td className="text-end">
                                <div className="d-flex align-items-center justify-content-end gap-2">
                                  <button type="button" className="btn btn-xs btn-outline-danger" title="Hapus" 
                                    onClick={() => handleDeleteCategory(cat.id)}>
                                    <i className="bi bi-trash-fill"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default AdminCategories;
