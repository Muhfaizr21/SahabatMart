import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, AFFILIATE_API_BASE, fetchJson, formatImage } from '../../lib/api';
import { A, PageHeader, Modal, TablePanel, statusBadge, FieldLabel } from '../../lib/adminStyles.jsx';
import toast from 'react-hot-toast';

export default function AdminPromo() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ id: 0, title: '', description: '', type: 'image', category: 'Instagram', file_url: '', caption: '', is_active: true });
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetchJson(`${ADMIN_API_BASE}/promo`)
      .then(d => setPromos(d || []))
      .catch(err => toast.error('Gagal memuat materi promo'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    fetchJson(`${ADMIN_API_BASE}/promo/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    }).then(() => {
      toast.success('Materi promo disimpan');
      setShowModal(false);
      loadData();
    }).catch(err => toast.error(err.message))
    .finally(() => setSaving(false));
  };

  return (
    <div style={A.page}>
      <PageHeader title="Promo Materials" subtitle="Content assets for affiliate marketing">
        <button onClick={() => { setFormData({ id: 0, title: '', description: '', type: 'image', category: 'Instagram', file_url: '', caption: '', is_active: true }); setShowModal(true); }} style={A.btnPrimary}>
           <i className="bx bx-plus-circle" /> Tambah Asset
        </button>
      </PageHeader>

      <TablePanel loading={loading}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...A.th, paddingLeft: 24 }}>Asset</th>
              <th style={A.th}>Tipe</th>
              <th style={A.th}>Kategori</th>
              <th style={A.th}>Status</th>
              <th style={{ ...A.th, textAlign: 'right', paddingRight: 24 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {promos.map(p => (
              <tr key={p.id}>
                <td style={{ ...A.td, paddingLeft: 24 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                         <img src={formatImage(p.file_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      </div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{p.title}</div>
                   </div>
                </td>
                <td style={A.td}><span style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 900 }}>{p.type}</span></td>
                <td style={A.td}>{p.category}</td>
                <td style={A.td}><span style={statusBadge(p.is_active ? 'active' : 'inactive')}>{p.is_active ? 'Visible' : 'Hidden'}</span></td>
                <td style={{ ...A.td, textAlign: 'right', paddingRight: 24 }}>
                   <button onClick={() => { setFormData(p); setShowModal(true); }} style={A.iconBtn()}><i className="bx bx-edit-alt" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>

      {showModal && (
        <Modal title={formData.id ? 'Edit Promo' : 'New Promo Asset'} onClose={() => setShowModal(false)}>
           <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FieldLabel>Judul Materi</FieldLabel>
              <input style={A.input} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
              
              <FieldLabel>Tipe Konten</FieldLabel>
              <select style={A.select} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                 <option value="image">🖼️ Image</option>
                 <option value="video">📽️ Video</option>
                 <option value="copywriting">✍️ Copywriting Text</option>
              </select>

              <FieldLabel>URL File / Image</FieldLabel>
              <input style={A.input} value={formData.file_url} onChange={e => setFormData({ ...formData, file_url: e.target.value })} required />

              <FieldLabel>Caption / Konten Text</FieldLabel>
              <textarea style={{ ...A.textarea, height: 80 }} value={formData.caption} onChange={e => setFormData({ ...formData, caption: e.target.value })} />

              <button type="submit" disabled={saving} style={A.btnPrimary}>{saving ? 'Saving...' : 'Simpan Promo'}</button>
           </form>
        </Modal>
      )}
    </div>
  );
}
