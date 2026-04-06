import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';

const API = ADMIN_API_BASE;

export default function AdminBlogs() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ id: 0, title: '', summary: '', content: '', author: '', category: '', image: '', status: 'published' });
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadBlogs = () => {
    setLoading(true);
    fetchJson(API + '/blogs')
      .then(d => setBlogs(d.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${API}/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) setFormData(prev => ({ ...prev, image: data.url }));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setLoading(true);
    fetchJson(API + '/blogs/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    }).then(() => {
      setShowModal(false);
      setFormData({ id: 0, title: '', summary: '', content: '', author: '', category: '', image: '', status: 'published' });
      loadBlogs();
    }).catch(err => alert(err.message));
  };

  const deleteBlog = (id) => {
    if (!window.confirm("Hapus artikel ini secara permanen?")) return;
    setLoading(true);
    fetchJson(API + `/blogs/delete?id=${id}`, { method: 'DELETE' })
      .then(() => loadBlogs())
      .catch(err => alert(err.message));
  };

  return (
    <div className="p-4" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-black text-dark mb-1" style={{ letterSpacing: '-0.5px' }}>Blog & CMS</h4>
          <p className="text-muted small fw-bold uppercase tracking-wider mb-0">Kelola artikel dan konten publik</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2 px-4 radius-12 shadow-sm" style={{ height: 46 }} 
          onClick={() => { setFormData({ id: 0, title: '', summary: '', content: '', author: 'Admin SahabatMart', category: 'Update', image: '', status: 'published' }); setShowModal(true); }}>
          <i className="bx bx-plus-circle fs-5"></i>
          <span className="fw-bold">Buat Artikel</span>
        </button>
      </div>

      <div className="card border-0 shadow-sm radius-20 overflow-hidden">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4 py-3 border-0 text-muted small fw-black uppercase tracking-widest">Artikel</th>
                  <th className="py-3 border-0 text-muted small fw-black uppercase tracking-widest">Kategori</th>
                  <th className="py-3 border-0 text-muted small fw-black uppercase tracking-widest">Penulis</th>
                  <th className="py-3 border-0 text-muted small fw-black uppercase tracking-widest">Status</th>
                  <th className="pe-4 py-3 border-0 text-muted small fw-black uppercase tracking-widest text-end">Aksi</th>
                </tr>
              </thead>
              <tbody className="border-top-0">
                {loading && (
                    <tr><td colSpan={5} className="text-center py-5"><div className="spinner-border text-primary spinner-border-sm"></div></td></tr>
                )}
                {!loading && blogs.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-5 text-muted fw-bold">Belum ada konten artikel</td></tr>
                )}
                {blogs.map(b => (
                  <tr key={b.id} className="border-bottom-light">
                    <td className="ps-4 py-3">
                      <div className="d-flex align-items-center gap-3">
                         <div className="radius-12 overflow-hidden border bg-light shadow-sm" style={{ width: 64, height: 44 }}>
                            <img src={formatImage(b.image) || 'https://via.placeholder.com/64x44'}  className="w-100 h-100 object-fit-cover" alt="" />
                         </div>
                         <div>
                            <div className="fw-black text-dark mb-0 leading-tight" style={{ fontSize: 14 }}>{b.title}</div>
                            <small className="text-muted fw-medium text-truncate d-block" style={{ maxWidth: 280 }}>{b.summary}</small>
                         </div>
                      </div>
                    </td>
                    <td><span className="badge px-3 py-2 radius-8 font-black text-primary bg-light-primary text-uppercase" style={{ fontSize: 10 }}>{b.category}</span></td>
                    <td>
                        <div className="d-flex align-items-center gap-2">
                            <div className="bg-light-info text-info radius-8 fw-black d-flex align-items-center justify-content-center" style={{ width: 28, height: 28, fontSize: 11 }}>{b.author?.[0]}</div>
                            <span className="small fw-bold text-dark">{b.author}</span>
                        </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className={`radius-circle bg-${b.status === 'published' ? 'success' : 'warning'}`} style={{ width: 8, height: 8 }}></div>
                        <span className="small fw-bold text-dark text-capitalize">{b.status}</span>
                      </div>
                    </td>
                    <td className="pe-4 py-3 text-end">
                       <div className="d-flex justify-content-end gap-2">
                          <button className="btn btn-light-warning text-warning radius-10 border-0 p-2 d-flex" onClick={() => { setFormData(b); setShowModal(true); }}>
                             <i className="bx bx-edit-alt fs-5"></i>
                          </button>
                          <button className="btn btn-light-danger text-danger radius-10 border-0 p-2 d-flex" onClick={() => deleteBlog(b.id)}>
                             <i className="bx bx-trash fs-5"></i>
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

      {showModal && (
        <div className="modal show d-block animate__animated animate__fadeIn" style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 1060 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 radius-25 shadow-2xl">
              <div className="modal-header border-0 p-4">
                <h5 className="modal-title fw-black"><i className="bx bx-pencil me-2 text-primary"></i>{formData.id ? 'Edit Artikel' : 'Tulis Artikel Baru'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body p-4 pt-0">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small fw-black text-muted text-uppercase tracking-widest">Judul Artikel</label>
                      <input type="text" className="form-control radius-12 border-0 bg-light py-2 fw-bold" value={formData.title} 
                        onChange={e => setFormData({ ...formData, title: e.target.value })} required placeholder="Masukkan judul yang menarik..." />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-black text-muted text-uppercase tracking-widest">Penulis</label>
                      <input type="text" className="form-control radius-12 border-0 bg-light py-2" value={formData.author} 
                        onChange={e => setFormData({ ...formData, author: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-black text-muted text-uppercase tracking-widest">Kategori</label>
                      <input type="text" className="form-control radius-12 border-0 bg-light py-2" value={formData.category} 
                         onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="Gadget, News, Tips..." />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-black text-muted text-uppercase tracking-widest">Display Asset (URL/Lokal)</label>
                      <div className="input-group mb-2">
                        <input type="text" className="form-control border-0 bg-light radius-left-12" value={formData.image} 
                           onChange={e => setFormData({ ...formData, image: e.target.value })} placeholder="https://..." />
                        <label className="btn btn-light-primary border-0 radius-right-12 px-3 d-flex align-items-center">
                            {uploading ? <div className="spinner-border spinner-border-sm"></div> : <i className="bx bx-upload fs-5"></i>}
                            <input type="file" className="d-none" accept="image/*" onChange={handleUpload} />
                        </label>
                      </div>
                      {formData.image && (
                          <div className="radius-15 overflow-hidden border bg-light shadow-inner" style={{ height: 120 }}>
                              <img src={formatImage(formData.image)} className="w-100 h-100 object-fit-cover" alt="" />
                          </div>
                      )}
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-black text-muted text-uppercase tracking-widest">Ringkasan Pendek</label>
                      <textarea className="form-control radius-12 border-0 bg-light py-2" rows="2" value={formData.summary} 
                        onChange={e => setFormData({ ...formData, summary: e.target.value })} placeholder="2-3 kalimat pembuka..."></textarea>
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-black text-muted text-uppercase tracking-widest">Isi Artikel Lengkap</label>
                      <textarea className="form-control radius-12 border-0 bg-light py-2" rows="8" value={formData.content} 
                        onChange={e => setFormData({ ...formData, content: e.target.value })} required placeholder="Tuliskan isi artikel Anda di sini..."></textarea>
                    </div>
                    <div className="col-md-5">
                      <label className="form-label small fw-black text-muted text-uppercase tracking-widest">Status Publikasi</label>
                      <select className="form-select radius-12 border-0 bg-light py-2" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                        <option value="published">Published (Live)</option>
                        <option value="draft">Draft (Private)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 p-4 pt-0">
                  <button type="button" className="btn btn-light px-4 radius-12 fw-bold" onClick={() => setShowModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary px-4 radius-12 fw-black shadow-lg shadow-blue-100" disabled={loading}>
                     {loading ? 'Menyimpan...' : 'Simpan Konten'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
