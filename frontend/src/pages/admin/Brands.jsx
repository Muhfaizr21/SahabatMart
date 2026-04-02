import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = 'http://localhost:8080/api/admin';

const AdminBrands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', logo_url: '', is_featured: false });
  const [saving, setSaving] = useState(false);

  const loadBrands = () => {
    setLoading(true);
    fetch(`${API}/brands`)
      .then(r => r.json())
      .then(d => setBrands(d.data || []))
      .catch(err => console.error("Error loading brands:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    fetch(`${API}/brands/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    }).then(r => r.json()).then(() => {
      loadBrands();
      setFormData({ name: '', logo_url: '', is_featured: false });
    }).finally(() => setSaving(false));
  };

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Master Data</div>
        <div className="ps-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 p-0">
              <li className="breadcrumb-item"><Link to="/admin"><i className="bx bx-home-alt"></i></Link></li>
              <li className="breadcrumb-item active" aria-current="page">Manajemen Brand</li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-4">
            <div className="card">
                <div className="card-header py-3">
                    <h6 className="mb-0 fw-bold">Tambah / Edit Brand</h6>
                </div>
                <div className="card-body">
                    <form className="row g-3" onSubmit={handleSubmit}>
                        <div className="col-12">
                            <label className="form-label small fw-bold">Nama Merk</label>
                            <input type="text" className="form-control form-control-sm" placeholder="Contoh: Samsung, Nike" 
                                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                        </div>
                        <div className="col-12">
                            <label className="form-label small fw-bold">URL Logo</label>
                            <input type="text" className="form-control form-control-sm" placeholder="https://..." 
                                value={formData.logo_url} onChange={e => setFormData({...formData, logo_url: e.target.value})} />
                        </div>
                        <div className="col-12">
                            <div className="form-check form-switch">
                                <input className="form-check-input" type="checkbox" id="featured" 
                                    checked={formData.is_featured} onChange={e => setFormData({...formData, is_featured: e.target.checked})} />
                                <label className="form-check-label small" htmlFor="featured">Unggulan (Featured)</label>
                            </div>
                        </div>
                        <div className="col-12 mt-3">
                            <button type="submit" className="btn btn-sm btn-primary w-100" disabled={saving}>
                                {saving ? 'Menyimpan...' : 'Simpan Brand'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <div className="col-12 col-lg-8">
            <div className="card">
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table align-middle table-striped mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Logo</th>
                                    <th>Nama Brand</th>
                                    <th>Status</th>
                                    <th className="text-end">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4} className="text-center py-4"><div className="spinner-border text-primary"></div></td></tr>
                                ) : brands.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-4 text-muted">Belum ada brand</td></tr>
                                ) : brands.map(b => (
                                    <tr key={b.id}>
                                        <td>
                                            <div className="product-box border" style={{width: 40, height: 40}}>
                                                <img src={b.logo_url || '/admin-assets/images/icons/apple.png'} alt="" style={{width:'100%'}} />
                                            </div>
                                        </td>
                                        <td><span className="fw-bold">{b.name}</span></td>
                                        <td>
                                            {b.is_featured ? <span className="badge bg-light-warning text-warning">FEATURED</span> : <span className="badge bg-light-secondary text-secondary">REGULAR</span>}
                                        </td>
                                        <td className="text-end">
                                            <button className="btn btn-xs btn-outline-warning me-2" onClick={() => setFormData(b)}>Edit</button>
                                            <button className="btn btn-xs btn-outline-danger" onClick={() => {
                                                if(window.confirm("Hapus brand?")) {
                                                    fetch(`${API}/brands/delete?id=${b.id}`, { method: 'DELETE' }).then(() => loadBrands());
                                                }
                                            }}>Hapus</button>
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
    </>
  );
};

export default AdminBrands;
