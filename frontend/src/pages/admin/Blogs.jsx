import React, { useState, useEffect } from 'react';

const API = 'http://localhost:8080/api/admin';

export default function AdminBlogs() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ id: 0, title: '', summary: '', content: '', category: '', image: '', status: 'published' });
  const [showModal, setShowModal] = useState(false);

  const loadBlogs = () => {
    setLoading(true);
    fetch(API + '/blogs')
      .then(r => r.json())
      .then(d => setBlogs(d.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBlogs(); }, []);

  const handleSave = (e) => {
    e.preventDefault();
    fetch(API + '/blogs/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    }).then(() => {
      setShowModal(false);
      setFormData({ id: 0, title: '', summary: '', content: '', category: '', image: '', status: 'published' });
      loadBlogs();
    });
  };

  const deleteBlog = (id) => {
    if (!window.confirm("Hapus artikel ini?")) return;
    fetch(API + `/blogs/delete?id=${id}`, { method: 'DELETE' }).then(() => loadBlogs());
  };

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">CMS</div>
        <div className="ps-3"><nav><ol className="breadcrumb mb-0 p-0">
          <li className="breadcrumb-item active">Kelola Blog & Konten</li>
        </ol></nav></div>
        <div className="ms-auto">
          <button className="btn btn-primary btn-sm" onClick={() => { setFormData({ id: 0, title: '', summary: '', content: '', category: '', image: '', status: 'published' }); setShowModal(true); }}>
            <i className="bi bi-plus-lg me-2"></i>Tulis Artikel Baru
          </button>
        </div>
      </div>

      <div className="card radius-10">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle table-striped mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Cover</th>
                    <th>Judul</th>
                    <th>Kategori</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                    <th className="text-end">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {blogs.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-4 text-muted">Belum ada artikel</td></tr>
                  ) : blogs.map(b => (
                    <tr key={b.id}>
                      <td><img src={b.image || 'https://via.placeholder.com/60x40'} className="rounded" width="60" height="40" style={{objectFit:'cover'}} alt="" /></td>
                      <td>
                        <div className="fw-bold text-dark">{b.title}</div>
                        <small className="text-muted line-clamp-1" style={{maxWidth:300}}>{b.summary}</small>
                      </td>
                      <td><span className="badge bg-light-info text-info">{b.category}</span></td>
                      <td>
                        <span className={`badge bg-${b.status === 'published' ? 'success' : 'warning'}`}>{b.status}</span>
                      </td>
                      <td className="small text-muted">{new Date(b.created_at).toLocaleDateString()}</td>
                      <td className="text-end">
                        <button className="btn btn-xs btn-outline-warning me-2" onClick={() => { setFormData(b); setShowModal(true); }}>Edit</button>
                        <button className="btn btn-xs btn-outline-danger" onClick={() => deleteBlog(b.id)}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Basic Editor Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{formData.id ? 'Edit Artikel' : 'Tulis Artikel Baru'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Judul Artikel</label>
                      <input type="text" className="form-control" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Kategori</label>
                      <input type="text" className="form-control" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="Tips, Tech, Review..." />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">URL Gambar Cover</label>
                      <input type="text" className="form-control" value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Ringkasan (Summary)</label>
                      <textarea className="form-control" rows="2" value={formData.summary} onChange={e => setFormData({ ...formData, summary: e.target.value })}></textarea>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Konten Artikel</label>
                      <textarea className="form-control" rows="10" value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} required></textarea>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary">Simpan Artikel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
