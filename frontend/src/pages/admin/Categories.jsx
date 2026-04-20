import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, TablePanel, Modal, FieldLabel, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const EMPTY = { name: '', slug: '', description: '', order: 0 };
  const load = () => {
    setLoading(true);
    fetchJson(`${API}/categories`).then(d => setCategories(d || [])).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleName = (name) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setModal(p => ({ ...p, name, slug }));
  };

  const save = (e) => {
    e.preventDefault();
    setSaving(true);
    fetchJson(`${API}/categories/add`, { method: 'POST', body: JSON.stringify({ ...modal, parent_id: null }) })
      .then(() => { load(); setModal(null); }).catch(e => alert(e.message)).finally(() => setSaving(false));
  };

  const del = (id) => {
    if (!window.confirm('Hapus kategori ini?')) return;
    fetchJson(`${API}/categories/delete?id=${id}`, { method: 'DELETE' }).then(load).catch(e => alert(e.message));
  };

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Product Categories" subtitle="Atur hirarki kategori produk untuk navigasi yang lebih baik.">
        <button style={A.btnPrimary} onClick={() => setModal({ ...EMPTY })}>
          <i className="bx bx-plus" /> Tambah Kategori
        </button>
      </PageHeader>

      <TablePanel loading={loading}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr>
              {['Identitas Kategori', 'URL Slug', 'Urutan', 'Opsi'].map((h, i) => (
                <th key={h} style={{ ...A.th, textAlign: i === 3 ? 'right' : i === 2 ? 'center' : 'left', paddingLeft: i === 0 ? 24 : 16, paddingRight: i === 3 ? 24 : 16 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && !loading ? (
              <tr><td colSpan={4} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                <i className="bx bx-tag" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.2 }} />
                Belum ada kategori.
              </td></tr>
            ) : categories.map((cat, idx) => (
              <tr key={cat.id}
                style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
              >
                <td style={{ ...A.td, paddingLeft: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="bx bxs-category" style={{ fontSize: 18, color: '#6366f1' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{cat.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>ID: {cat.id}</div>
                    </div>
                  </div>
                </td>
                <td style={A.td}>
                  <code style={{ background: '#f1f5f9', color: '#6366f1', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>/{cat.slug}</code>
                </td>
                <td style={{ ...A.td, textAlign: 'center' }}>
                  <span style={{ display: 'inline-flex', padding: '4px 12px', borderRadius: 20, background: '#f8fafc', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: 13, color: '#475569' }}>{cat.order}</span>
                </td>
                <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <button style={A.iconBtn('#f59e0b', '#fffbeb')} onClick={() => setModal({ ...cat })} title="Edit"><i className="bx bx-pencil" /></button>
                    <button style={A.iconBtn('#ef4444', '#fff1f2')} onClick={() => del(cat.id)} title="Hapus"><i className="bx bx-trash" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>

      {modal && (
        <Modal title={modal.id ? 'Edit Kategori' : 'Tambah Kategori'} onClose={() => setModal(null)}>
          <form onSubmit={save}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <FieldLabel>Nama Kategori</FieldLabel>
                <input style={{ ...A.select, width: '100%' }} placeholder="Misal: Fashion Pria" value={modal.name} onChange={e => handleName(e.target.value)} required />
              </div>
              <div>
                <FieldLabel>URL Slug (Auto)</FieldLabel>
                <input style={{ ...A.select, width: '100%', fontFamily: 'monospace', color: '#6366f1', fontWeight: 700 }} placeholder="fashion-pria" value={modal.slug} onChange={e => setModal(p => ({ ...p, slug: e.target.value }))} required />
              </div>
              <div>
                <FieldLabel>Urutan Tampil</FieldLabel>
                <input type="number" style={{ ...A.select, width: '100%' }} value={modal.order} onChange={e => setModal(p => ({ ...p, order: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <FieldLabel>Deskripsi</FieldLabel>
                <textarea style={{ ...A.textarea, minHeight: 80 }} placeholder="Jelaskan isi kategori ini..." value={modal.description} onChange={e => setModal(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
              <button type="button" style={A.btnGhost} onClick={() => setModal(null)}>Batal</button>
              <button type="submit" style={A.btnPrimary} disabled={saving}>
                {saving ? '...' : <><i className="bx bx-save" /> Simpan</>}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
