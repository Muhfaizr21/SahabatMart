import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, AFFILIATE_API_BASE, fetchJson, formatImage } from '../../lib/api';
import { A, PageHeader, Modal, TablePanel, statusBadge, FieldLabel } from '../../lib/adminStyles.jsx';
import toast from 'react-hot-toast';

export default function AdminEducation() {
  const [edu, setEdu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ id: 0, title: '', content: '', video_url: '', category: 'Marketing', image_url: '', is_featured: false, is_active: true });
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const loadData = () => {
    setLoading(true);
    setSelectedIds([]);
    fetchJson(`${ADMIN_API_BASE}/education`)
      .then(d => setEdu(d || []))
      .catch(err => toast.error('Gagal memuat materi edukasi'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === edu.length) setSelectedIds([]);
    else setSelectedIds(edu.map(e => e.id));
  };

  const bulkDelete = () => {
    if (!window.confirm(`Hapus ${selectedIds.length} materi terpilih secara permanen?`)) return;
    setLoading(true);
    fetchJson(`${ADMIN_API_BASE}/education/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids: selectedIds })
    })
      .then(() => {
        toast.success('Materi terpilih dihapus');
        loadData();
      })
      .catch(err => {
        toast.error(err.message || 'Gagal menghapus materi');
        setLoading(false);
      });
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await fetchJson(`${ADMIN_API_BASE}/upload`, { method: 'POST', body: fd });
      if (res.url) {
        setFormData(prev => ({ ...prev, image_url: res.url }));
        toast.success('Gambar terunggah');
      }
    } catch (_err) { toast.error('Upload gagal'); }
    finally { setUploading(false); }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    fetchJson(`${ADMIN_API_BASE}/education/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    }).then(() => {
      toast.success(formData.id ? 'Materi diperbarui' : 'Materi ditambahkan');
      setShowModal(false);
      loadData();
    }).catch(err => toast.error(err.message))
      .finally(() => setSaving(false));
  };

  const deleteItem = (id) => {
    if (!window.confirm("Hapus materi ini?")) return;
    fetchJson(`${ADMIN_API_BASE}/education/delete?id=${id}`, { method: 'DELETE' })
      .then(() => {
        toast.success('Materi dihapus');
        loadData();
      })
      .catch(err => toast.error(err.message));
  };

  return (
    <div style={A.page}>
      <PageHeader
        title="Affiliate Education"
        subtitle="Manage learning materials for your partners"
      >
        <button
          onClick={() => { setFormData({ id: 0, title: '', content: '', video_url: '', category: 'Marketing', image_url: '', is_featured: false, is_active: true }); setShowModal(true); }}
          style={A.btnPrimary}
        >
          <i className="bx bx-plus-circle" /> Tambah Materi
        </button>
      </PageHeader>

      <TablePanel 
        loading={loading}
        toolbar={
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {selectedIds.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 12px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fee2e2' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>{selectedIds.length} Terpilih</span>
                <button 
                  onClick={bulkDelete}
                  style={{ ...A.btnPrimary, background: '#ef4444', height: 32, padding: '0 12px', fontSize: 12 }}
                >
                  <i className="bx bx-trash" /> Hapus Terpilih
                </button>
              </div>
            )}
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
              {loading ? 'Memuat...' : `${edu.length} materi`}
            </span>
          </div>
        }
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...A.th, width: 40, paddingLeft: 24 }}>
                <input 
                  type="checkbox" 
                  checked={edu.length > 0 && selectedIds.length === edu.length} 
                  onChange={toggleSelectAll}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </th>
              <th style={A.th}>Materi</th>
              <th style={A.th}>Kategori</th>
              <th style={A.th}>Featured</th>
              <th style={A.th}>Status</th>
              <th style={{ ...A.th, textAlign: 'right', paddingRight: 24 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {edu.map((e, idx) => {
              const isSelected = selectedIds.includes(e.id);
              const isLast = idx === edu.length - 1;
              return (
                <tr 
                  key={e.id}
                  style={{ 
                    background: isSelected ? '#f5f7ff' : (idx % 2 === 0 ? '#fff' : '#fafafa'),
                    borderBottom: isLast ? 'none' : '1px solid #f8fafc'
                  }}
                  onMouseEnter={e => !isSelected && (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => !isSelected && (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa')}
                >
                  <td style={{ ...A.td, paddingLeft: 24, width: 40 }}>
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => toggleSelect(e.id)}
                      style={{ width: 17, height: 17, cursor: 'pointer' }}
                    />
                  </td>
                  <td style={A.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 64, height: 44, borderRadius: 10, overflow: 'hidden', border: '1px solid #f1f5f9', background: '#f8fafc', flexShrink: 0 }}>
                        <img src={formatImage(e.image_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{e.title}</div>
                        <div style={{ fontSize: 10.5, color: '#6366f1', fontWeight: 700 }}>{e.category}</div>
                      </div>
                    </div>
                  </td>
                  <td style={A.td}>{e.category}</td>
                  <td style={A.td}>{e.is_featured ? '⭐ Yes' : 'No'}</td>
                  <td style={A.td}>
                    <span style={statusBadge(e.is_active ? 'active' : 'inactive')}>{e.is_active ? 'Active' : 'Hidden'}</span>
                  </td>
                  <td style={{ ...A.td, textAlign: 'right', paddingRight: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'end', gap: 8 }}>
                      <button onClick={() => { setFormData(e); setShowModal(true); }} style={A.iconBtn()}><i className="bx bx-edit-alt" /></button>
                      <button onClick={() => deleteItem(e.id)} style={A.iconBtn('#ef4444', '#fef2f2')}><i className="bx bx-trash" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {edu.length === 0 && !loading && (
              <tr>
                <td colSpan="6" style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                   Belum ada materi edukasi yang dipublikasikan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TablePanel>

      {showModal && (
        <Modal title={formData.id ? 'Edit Materi' : 'Tambah Materi Baru'} onClose={() => setShowModal(false)} wide>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <FieldLabel>Judul Materi</FieldLabel>
                  <input style={A.input} value={formData.title} onChange={ev => setFormData({ ...formData, title: ev.target.value })} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <FieldLabel>Deskripsi / Konten</FieldLabel>
                  <textarea style={{ ...A.textarea, height: 200 }} value={formData.content} onChange={ev => setFormData({ ...formData, content: ev.target.value })} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <FieldLabel>Video URL (Embed)</FieldLabel>
                  <input style={A.input} value={formData.video_url} onChange={ev => setFormData({ ...formData, video_url: ev.target.value })} placeholder="https://www.youtube.com/embed/..." />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <FieldLabel>Thumbnail</FieldLabel>
                  <div style={{ height: 160, borderRadius: 16, border: '2px dashed #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    {formData.image_url ? <img src={formatImage(formData.image_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <i className="bx bx-image-add" style={{ fontSize: 32, color: '#cbd5e1' }} />}
                    <input type="file" onChange={handleUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} accept="image/*" />
                    {uploading && <div className="spinner-border text-primary" />}
                  </div>
                </div>
                <div>
                  <FieldLabel>Kategori</FieldLabel>
                  <select style={A.select} value={formData.category} onChange={ev => setFormData({ ...formData, category: ev.target.value })}>
                    <option value="Marketing">📢 Marketing</option>
                    <option value="Product">📦 Product Knowledge</option>
                    <option value="Sales">💰 Sales Strategy</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={formData.is_featured} onChange={ev => setFormData({ ...formData, is_featured: ev.target.checked })} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Tampilkan di Unggulan</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={formData.is_active} onChange={ev => setFormData({ ...formData, is_active: ev.target.checked })} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Aktif (Tampil ke Mitra)</span>
                </div>
                <button type="submit" disabled={saving} style={{ ...A.btnPrimary, marginTop: 20 }}>
                  {saving ? 'Saving...' : 'Simpan Materi'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
