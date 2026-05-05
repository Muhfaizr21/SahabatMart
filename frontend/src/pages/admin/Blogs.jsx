import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson, formatImage, uploadFile } from '../../lib/api';
import { A, PageHeader, Modal, TablePanel, statusBadge, FieldLabel, fmtDate } from '../../lib/adminStyles.jsx';
import toast from 'react-hot-toast';

export default function AdminBlogs() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ id: 0, title: '', summary: '', content: '', author: 'Admin', category: 'General', image: '', status: 'published' });
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadBlogs = () => {
    setLoading(true);
    fetchJson(`${ADMIN_API_BASE}/blogs`)
      .then(d => setBlogs(d || []))
      .catch(err => toast.error('Gagal memuat blog'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBlogs(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await uploadFile(`${ADMIN_API_BASE}/upload`, file);
      const url = res.imageUrl || res.url || res.data?.url;
      if (url) {
        setFormData(prev => ({ ...prev, image: url }));
        toast.success('Gambar terunggah');
      }
    } catch (err) { 
      toast.error('Upload gagal: ' + err.message); 
    } finally { 
      setUploading(false); 
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    const isEdit = formData.id;
    const url = `${ADMIN_API_BASE}/blogs/upsert`;
    
    fetchJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    }).then(() => {
      toast.success(isEdit ? 'Artikel diperbarui' : 'Artikel diterbitkan');
      setShowModal(false);
      loadBlogs();
    }).catch(err => toast.error(err.message))
    .finally(() => setSaving(false));
  };

  const deleteBlog = (id) => {
    if (!window.confirm("Hapus artikel ini?")) return;
    fetchJson(`${ADMIN_API_BASE}/blogs/delete?id=${id}`, { method: 'DELETE' })
      .then(() => {
        toast.success('Artikel dihapus');
        loadBlogs();
      })
      .catch(err => toast.error(err.message));
  };

  return (
    <div style={A.page}>
      <PageHeader 
        title="Articles & CMS" 
        subtitle="Write news, tips and lifestyle content for your customers"
      >
        <button 
          onClick={() => { setFormData({ id: 0, title: '', summary: '', content: '', author: 'Admin AkuGlow', category: 'Update', image: '', status: 'published' }); setShowModal(true); }}
          style={A.btnPrimary}
        >
          <i className="bx bx-plus-circle" /> Tulis Artikel Baru
        </button>
      </PageHeader>

      <TablePanel loading={loading}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...A.th, paddingLeft: 24 }}>Artikel</th>
              <th style={A.th}>Kategori</th>
              <th style={A.th}>Penulis</th>
              <th style={A.th}>Status</th>
              <th style={{ ...A.th, textAlign: 'right', paddingRight: 24 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {blogs.map(b => (
              <tr key={b.id}>
                <td style={{ ...A.td, paddingLeft: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 64, height: 44, borderRadius: 10, overflow: 'hidden', border: '1px solid #f1f5f9', background: '#f8fafc', flexShrink: 0 }}>
                      <img src={formatImage(b.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{b.title}</div>
                      <div style={{ fontSize: 10.5, color: '#6366f1', fontWeight: 700, fontFamily: 'monospace' }}>/{b.slug}</div>
                    </div>
                  </div>
                </td>
                <td style={A.td}>
                   <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', padding: '3px 9px', borderRadius: 6 }}>{b.category}</span>
                </td>
                <td style={A.td}>{b.author}</td>
                <td style={A.td}>
                   <span style={statusBadge(b.status)}>{b.status}</span>
                </td>
                <td style={{ ...A.td, textAlign: 'right', paddingRight: 24 }}>
                   <div style={{ display: 'flex', justifyContent: 'end', gap: 8 }}>
                      <button onClick={() => { setFormData(b); setShowModal(true); }} style={A.iconBtn()}><i className="bx bx-edit-alt" /></button>
                      <button onClick={() => deleteBlog(b.id)} style={A.iconBtn('#ef4444', '#fef2f2')}><i className="bx bx-trash" /></button>
                   </div>
                </td>
              </tr>
            ))}
            {blogs.length === 0 && !loading && (
              <tr>
                <td colSpan="5" style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                   Belum ada artikel yang dipublikasikan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TablePanel>

      {showModal && (
        <Modal title={formData.id ? 'Edit Content' : 'Compose New Article'} onClose={() => setShowModal(false)} wide>
           <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2 space-y-6" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                       <FieldLabel>Article Title</FieldLabel>
                       <input style={{ ...A.input, fontWeight: 800, fontSize: 16 }} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required placeholder="Enter a catchy title..." />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                       <FieldLabel>Summary</FieldLabel>
                       <textarea style={{ ...A.textarea, height: 80 }} value={formData.summary} onChange={e => setFormData({ ...formData, summary: e.target.value })} placeholder="Brief introduction to the article..." />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                       <FieldLabel>Full Content</FieldLabel>
                       <textarea style={{ ...A.textarea, height: 350, lineHeight: 1.6 }} value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} required placeholder="Write your story here..." />
                    </div>
                 </div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                       <FieldLabel>Cover Image</FieldLabel>
                       <div style={{ 
                           height: 160, borderRadius: 16, border: '2px dashed #e2e8f0', 
                           background: '#f8fafc', display: 'flex', alignItems: 'center', 
                           justifyContent: 'center', position: 'relative', overflow: 'hidden' 
                       }}>
                          {formData.image ? <img src={formatImage(formData.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <i className="bx bx-image-add" style={{ fontSize: 32, color: '#cbd5e1' }} />}
                          <input type="file" onChange={handleUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} accept="image/*" />
                          {uploading && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner-border text-primary" /></div>}
                       </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                       <FieldLabel>Penulis</FieldLabel>
                       <input style={A.input} value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                       <FieldLabel>Category</FieldLabel>
                       <input style={A.input} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                       <FieldLabel>Status</FieldLabel>
                       <select style={A.select} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                          <option value="published">📍 Published</option>
                          <option value="draft">📁 Draft</option>
                       </select>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: 20 }}>
                       <button 
                         type="submit" 
                         disabled={saving}
                         style={{ ...A.btnPrimary, width: '100%', justifyContent: 'center', padding: 14 }}
                       >
                         {saving ? <i className="bx bx-loader-alt animate-spin" /> : formData.id ? 'Save Changes' : 'Publish Article'}
                       </button>
                    </div>
                 </div>
              </div>
           </form>
        </Modal>
      )}

      <style>{`
        .grid { display: grid; }
        .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
        @media (min-width: 768px) { .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (min-width: 1024px) { .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); } .lg\\:col-span-2 { grid-column: span 2 / span 2; } }
      `}</style>
    </div>
  );
}
