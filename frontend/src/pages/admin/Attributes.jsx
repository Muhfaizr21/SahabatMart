import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;

const AdminAttributes = () => {
  const [attrs, setAttrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', type: 'dropdown', values: '' });
  const [saving, setSaving] = useState(false);

  const loadAttrs = () => {
    fetchJson(`${API}/attributes`)
      .then(d => setAttrs(d.data || []))
      .catch(err => console.error("Error loading attributes:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchJson(`${API}/attributes`)
      .then(d => setAttrs(d.data || []))
      .catch(err => console.error("Error loading attributes:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    setLoading(true);
    fetch(`${API}/attributes/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    }).then(r => r.json()).then(() => {
      loadAttrs();
      setFormData({ name: '', type: 'dropdown', values: '' });
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
              <li className="breadcrumb-item active" aria-current="page">Atribut Global</li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-4">
            <div className="card">
                <div className="card-header py-3">
                    <h6 className="mb-0 fw-bold">Tambah / Edit Atribut</h6>
                </div>
                <div className="card-body">
                    <form className="row g-3" onSubmit={handleSubmit}>
                        <div className="col-12">
                            <label className="form-label small fw-bold">Nama Atribut</label>
                            <input type="text" className="form-control form-control-sm" placeholder="Contoh: Ukuran, Warna" 
                                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                        </div>
                        <div className="col-12">
                            <label className="form-label small fw-bold">Tipe Input</label>
                            <select className="form-select form-select-sm" 
                                value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                <option value="dropdown">Dropdown / List</option>
                                <option value="checkbox">Checkbox (Multi-select)</option>
                                <option value="color">Color Picker</option>
                            </select>
                        </div>
                        <div className="col-12">
                            <label className="form-label small fw-bold">Nilai Opsi (Pisahkan dengan koma)</label>
                            <textarea className="form-control form-control-sm" rows="3" placeholder="S, M, L, XL" 
                                value={formData.values} onChange={e => setFormData({...formData, values: e.target.value})}></textarea>
                            <small className="text-muted" style={{fontSize:10}}>Masukan opsi yang boleh dipilih merchant.</small>
                        </div>
                        <div className="col-12 mt-3">
                            <button type="submit" className="btn btn-sm btn-primary w-100" disabled={saving}>
                                {saving ? <span className="spinner-border spinner-border-sm me-1"></span> : null}
                                Simpan Atribut
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
                                    <th>Nama Atribut</th>
                                    <th>Tipe</th>
                                    <th>Daftar Opsi</th>
                                    <th className="text-end">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4} className="text-center py-4"><div className="spinner-border text-primary"></div></td></tr>
                                ) : attrs.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-4 text-muted">Belum ada atribut</td></tr>
                                ) : attrs.map(a => (
                                    <tr key={a.id}>
                                        <td><span className="fw-bold">{a.name}</span></td>
                                        <td><span className="badge bg-light-info text-info rounded-pill px-3">{a.type.toUpperCase()}</span></td>
                                        <td>
                                            <div className="d-flex flex-wrap gap-1">
                                                {(a.values || '').split(',').map((v, i) => (
                                                    <span key={i} className="badge border text-dark bg-light font-weight-normal small">{v.trim()}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="text-end">
                                            <button className="btn btn-xs btn-outline-warning" onClick={() => setFormData(a)}>Edit</button>
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

export default AdminAttributes;
