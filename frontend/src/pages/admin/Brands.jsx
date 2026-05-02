import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, TablePanel, Modal, FieldLabel, A } from '../../lib/adminStyles.jsx';

const API = ADMIN_API_BASE;

export default function AdminBrands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const EMPTY = { name: '', logo_url: '', is_featured: false };
  const load = () => {
    setLoading(true);
    fetchJson(`${API}/brands`)
      .then(d => {
        const dataArr = Array.isArray(d) ? d : (d?.data || []);
        setBrands(dataArr);
      })
      .catch(err => {
        window.toast?.error("Gagal memuat data brand");
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const save = (e) => {
    e.preventDefault();
    setSaving(true);
    fetchJson(`${API}/brands/upsert`, { method: 'POST', body: JSON.stringify(modal) })
      .then(() => { 
        window.toast?.success('Brand berhasil disimpan');
        load(); 
        setModal(null); 
      })
      .catch(e => window.toast?.error(e.message))
      .finally(() => setSaving(false));
  };

  const del = (id) => {
    if (!window.confirm('Hapus brand ini?')) return;
    fetchJson(`${API}/brands/delete?id=${id}`, { method: 'DELETE' })
      .then(() => {
        window.toast?.success('Brand dihapus');
        load();
      })
      .catch(e => window.toast?.error(e.message));
  };

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Brand Portfolio" subtitle="Kelola daftar merk produk yang beredar di platform SahabatMart.">
        <button style={A.btnPrimary} onClick={() => setModal({ ...EMPTY })}>
          <i className="bx bx-plus" /> Tambah Brand
        </button>
      </PageHeader>

      <TablePanel loading={loading}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr>
              {['Identitas Merk', 'Status', 'Produk', 'Opsi'].map((h, i) => (
                <th key={h} style={{ ...A.th, textAlign: i >= 1 && i <= 2 ? 'center' : i === 3 ? 'right' : 'left', paddingLeft: i === 0 ? 24 : 16, paddingRight: i === 3 ? 24 : 16 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {brands.length === 0 && !loading ? (
              <tr><td colSpan={4} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                <i className="bx bxs-flag" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.2 }} />
                Belum ada brand terdaftar.
              </td></tr>
            ) : brands.map((b, idx) => (
              <tr key={b.id}
                style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
              >
                <td style={{ ...A.td, paddingLeft: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img
                      src={b.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=eef2ff&color=6366f1&size=80`}
                      alt={b.name}
                      style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'contain', border: '1px solid #f1f5f9', background: '#fff', padding: 4, flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>ID: {b.id}</div>
                    </div>
                  </div>
                </td>
                <td style={{ ...A.td, textAlign: 'center' }}>
                  <span style={{ display: 'inline-flex', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: b.is_featured ? '#fffbeb' : '#f8fafc', color: b.is_featured ? '#d97706' : '#94a3b8' }}>
                    {b.is_featured ? '⭐ Unggulan' : 'Reguler'}
                  </span>
                </td>
                <td style={{ ...A.td, textAlign: 'center' }}>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{b.product_count || 0}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>items</span>
                </td>
                <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <button style={A.iconBtn('#f59e0b', '#fffbeb')} onClick={() => setModal({ ...b })} title="Edit"><i className="bx bx-pencil" /></button>
                    <button style={A.iconBtn('#ef4444', '#fff1f2')} onClick={() => del(b.id)} title="Hapus"><i className="bx bx-trash" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>

      {modal && (
        <Modal title={modal.id ? 'Edit Brand' : 'Tambah Brand Baru'} onClose={() => setModal(null)}>
          <form onSubmit={save}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <FieldLabel>Nama Brand</FieldLabel>
                <input style={{ ...A.select, width: '100%' }} placeholder="Misal: Apple, Samsung" value={modal.name} onChange={e => setModal(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <FieldLabel>URL Logo (.png/.webp)</FieldLabel>
                <input style={{ ...A.select, width: '100%' }} placeholder="https://link-logo.com/image.png" value={modal.logo_url} onChange={e => setModal(p => ({ ...p, logo_url: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#f8fafc', borderRadius: 11 }}>
                <input type="checkbox" id="featuredBrand" checked={modal.is_featured} onChange={e => setModal(p => ({ ...p, is_featured: e.target.checked }))} style={{ width: 16, height: 16 }} />
                <label htmlFor="featuredBrand" style={{ fontSize: 13.5, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Tampilkan sebagai Brand Unggulan</label>
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
