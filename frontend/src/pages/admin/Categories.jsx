import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;

const S = {
  page: { fontFamily: "'Inter', sans-serif", paddingTop: 20 },
  splitLayout: { display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' },
  card: { background: '#fff', borderRadius: 16, border: '1px solid #f0f0f5', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' },
  formCard: { background: '#fff', borderRadius: 16, border: '1px solid #f0f0f5', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden', position: 'sticky', top: 20 },
  cardHeader: { padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 },
  cardHeaderIcon: (color) => ({ width: 36, height: 36, borderRadius: 9, background: color + '18', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }),
  label: { display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748b', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 5 },
  input: { width: '100%', padding: '9px 13px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#334155', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  textarea: { width: '100%', padding: '9px 13px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#334155', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' },
  thCell: { padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.6px', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', whiteSpace: 'nowrap' },
  tdCell: { padding: '14px 16px', borderBottom: '1px solid #f8fafc', verticalAlign: 'middle' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', background: '#4361ee', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' },
  btnDanger: { width: 32, height: 32, borderRadius: 8, border: 'none', background: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 },
};

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', slug: '', description: '', order: 0 });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetchJson(`${API}/categories`)
      .then(d => setCategories(d.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) return alert('Nama dan Slug wajib diisi!');
    setSaving(true);
    setLoading(true);
    fetch(`${API}/categories/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, parent_id: null }),
    }).then(r => r.json()).then(() => {
      load();
      setFormData({ name: '', slug: '', description: '', order: 0 });
    }).catch(err => console.error(err)).finally(() => setSaving(false));
  };

  const handleDelete = (id) => {
    if (!window.confirm('Hapus kategori ini?')) return;
    setLoading(true);
    fetch(`${API}/categories/delete?id=${id}`, { method: 'DELETE' }).then(() => load());
  };

  // Auto-generate slug from name
  const handleNameChange = (name) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setFormData(prev => ({ ...prev, name, slug }));
  };

  return (
    <div style={S.page} className="fade-in">
      {/* Breadcrumb */}
      <div className="d-none d-sm-flex align-items-center gap-2 mb-4">
        <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Product Catalog</span>
        <i className="bx bx-chevron-right" style={{ color: '#cbd5e1', fontSize: 20 }} />
        <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>Kelola Kategori</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>

        {/* Form Panel */}
        <div style={S.formCard}>
          <div style={S.cardHeader}>
            <div style={S.cardHeaderIcon('#4361ee')}>
              <i className="bx bx-category" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Tambah Kategori</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Buat kategori produk baru</div>
            </div>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={S.label}>Nama Kategori</label>
                <input style={S.input} type="text" placeholder="Contoh: Fashion Pria"
                  value={formData.name} onChange={e => handleNameChange(e.target.value)} required
                  onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div>
                <label style={S.label}>URL Slug</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }}>/</span>
                  <input style={{ ...S.input, paddingLeft: 22 }} type="text" placeholder="fashion-pria"
                    value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} required
                    onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
              </div>
              <div>
                <label style={S.label}>Urutan Tampil</label>
                <input style={S.input} type="number" min={0} value={formData.order}
                  onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div>
                <label style={S.label}>Deskripsi (Opsional)</label>
                <textarea style={{ ...S.textarea, minHeight: 72 }} rows={3} placeholder="Ringkasan singkat kategori..."
                  value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  onFocus={e => e.target.style.borderColor = '#818cf8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <button type="submit" style={S.btnPrimary} disabled={saving}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                {saving ? <div className="spinner-border spinner-border-sm" style={{ width: 16, height: 16 }} /> : <i className="bx bx-plus" style={{ fontSize: 18 }} />}
                {saving ? 'Menyimpan...' : 'Simpan Kategori'}
              </button>
            </div>
          </form>
        </div>

        {/* Table */}
        <div style={S.card}>
          <div style={{ ...S.cardHeader, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={S.cardHeaderIcon('#10b981')}>
                <i className="bx bx-list-ul" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Daftar Kategori</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{categories.length} kategori terdaftar</div>
              </div>
            </div>
            <button onClick={load} style={{ width: 34, height: 34, borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18 }}>
              <i className="bx bx-refresh" />
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <div className="spinner-border" style={{ color: '#4361ee', width: 30, height: 30, borderWidth: 3 }} />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {[['#', 'left', 20], ['Nama Kategori', 'left', 16], ['URL Slug', 'left', 16], ['Urutan', 'center', 16], ['Aksi', 'right', 20]].map(([h, align, pl]) => (
                      <th key={h} style={{ ...S.thCell, textAlign: align, paddingLeft: pl, paddingRight: h === 'Aksi' ? 20 : 16 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
                        <i className="bx bx-category" style={{ fontSize: 40, display: 'block', marginBottom: 10, opacity: 0.3 }} />
                        <div style={{ fontWeight: 600, color: '#475569' }}>Belum ada kategori</div>
                      </td>
                    </tr>
                  ) : categories.map((cat, idx) => (
                    <tr key={cat.id}
                      style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                    >
                      <td style={{ ...S.tdCell, paddingLeft: 20, paddingRight: 16 }}>
                        <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{cat.id}</span>
                      </td>
                      <td style={S.tdCell}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', color: '#4361ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                            <i className={`bx ${cat.parent_id > 0 ? 'bx-subdirectory-right' : 'bx-tag'}`} />
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{cat.name}</span>
                        </div>
                      </td>
                      <td style={S.tdCell}>
                        <code style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: 6 }}>/{cat.slug}</code>
                      </td>
                      <td style={{ ...S.tdCell, textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, background: '#eff6ff', color: '#4361ee', fontSize: 12, fontWeight: 700 }}>{cat.order}</span>
                      </td>
                      <td style={{ ...S.tdCell, textAlign: 'right', paddingRight: 20 }}>
                        <button style={S.btnDanger} onClick={() => handleDelete(cat.id)} title="Hapus Kategori"
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.75'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                          <i className="bx bx-trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
