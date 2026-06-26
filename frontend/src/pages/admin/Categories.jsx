import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson, formatImage, uploadFile } from '../../lib/api';
import { PageHeader, TablePanel, Modal, FieldLabel, A } from '../../lib/adminStyles.jsx';
import { AdminSearch, AdminInput, AdminTextarea, AdminPagination, AdminEmptyState, AdminActionButtons, AdminBulkActions, AdminFormActions, AdminToolbar, AdminToolbarLeft, AdminToolbarRight } from '../../lib/adminComponents.jsx';
import AdminSelect from '../../components/admin/AdminSelect';

const API = ADMIN_API_BASE;

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Search, Sorting & Pagination States
  const [search, setSearch] = useState('');
  const [selectedSort, setSelectedSort] = useState('order_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const EMPTY = { name: '', slug: '', description: '', order: 0, image: '' };
  
  const load = () => {
    setLoading(true);
    setSelectedIds([]);
    fetchJson(`${API}/categories`)
      .then(d => setCategories(Array.isArray(d) ? d : (d?.data || [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  
  useEffect(() => { load(); }, []);

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = (currentPageIds) => {
    const allSelected = currentPageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  const bulkDelete = () => {
    if (!window.confirm(`Hapus ${selectedIds.length} kategori terpilih secara permanen?`)) return;
    setLoading(true);
    fetchJson(`${API}/categories/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids: selectedIds })
    })
      .then(() => {
        load();
      })
      .catch(e => {
        alert(e.message);
        setLoading(false);
      });
  };

  const handleName = (name) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setModal(p => ({ ...p, name, slug }));
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFile(`${API}/upload`, file);
      const url = res.imageUrl || res.url || res.data?.url;
      if (url) {
        setModal(prev => ({ ...prev, image: url }));
      }
    } catch (_err) {
      alert('Upload gagal: ' + _err.message);
    } finally {
      setUploading(false);
    }
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

  // Filtration Logic
  const filteredCategories = categories.filter(cat => {
    const matchesSearch = !search || 
      cat.name?.toLowerCase().includes(search.toLowerCase()) || 
      cat.slug?.toLowerCase().includes(search.toLowerCase()) ||
      cat.description?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  // Sorting Logic
  const sortedCategories = [...filteredCategories].sort((a, b) => {
    if (selectedSort === 'order_asc') return (a.order || 0) - (b.order || 0);
    if (selectedSort === 'order_desc') return (b.order || 0) - (a.order || 0);
    if (selectedSort === 'name_asc') return (a.name || '').localeCompare(b.name || '');
    if (selectedSort === 'name_desc') return (b.name || '').localeCompare(a.name || '');
    return 0;
  });

  // Pagination Logic
  const totalItems = sortedCategories.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [sortedCategories, totalPages, currentPage]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedCategories.slice(indexOfFirstItem, indexOfLastItem);

  const toolbar = (
    <AdminToolbar>
      <AdminToolbarLeft>
        <AdminSearch value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Cari kategori..." />
        <AdminSelect
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400"
          value={selectedSort}
          onChange={e => { setSelectedSort(e.target.value); setCurrentPage(1); }}
        >
          <option value="order_asc">Urutan Tampil (Terkecil)</option>
          <option value="order_desc">Urutan Tampil (Terbesar)</option>
          <option value="name_asc">Nama Kategori (A-Z)</option>
          <option value="name_desc">Nama Kategori (Z-A)</option>
        </AdminSelect>
      </AdminToolbarLeft>
      <AdminToolbarRight>
        {selectedIds.length > 0 && <AdminBulkActions count={selectedIds.length} onDelete={bulkDelete} label="Terpilih" />}
        <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
          {loading ? 'Memuat...' : `${totalItems} kategori`}
        </span>
      </AdminToolbarRight>
    </AdminToolbar>
  );

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Kategori Produk" subtitle="Atur hirarki kategori produk untuk navigasi yang lebih baik.">
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" onClick={() => setModal({ ...EMPTY })}>
          <i className="bx bx-plus" /> Tambah Kategori
        </button>
      </PageHeader>

      <TablePanel loading={loading} toolbar={toolbar}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
          <thead>
            <tr>
              <th style={{ ...A.th, width: 40, paddingLeft: 24 }}>
                <input 
                  type="checkbox" 
                  checked={currentItems.length > 0 && currentItems.every(c => selectedIds.includes(c.id))} 
                  onChange={() => toggleSelectAll(currentItems.map(c => c.id))}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </th>
              {['Identitas Kategori', 'URL Slug', 'Urutan', 'Opsi'].map((h, i) => (
                <th key={h} style={{ ...A.th, textAlign: i === 3 ? 'right' : i === 2 ? 'center' : 'left', paddingLeft: 16, paddingRight: i === 3 ? 24 : 16 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 && !loading ? (
              <AdminEmptyState colSpan={5} icon="bx-tag" message="Tidak ada kategori yang cocok dengan kriteria filter." />
            ) : currentItems.map((cat, idx) => {
              const isSelected = selectedIds.includes(cat.id);
              return (
                <tr key={cat.id}
                  style={{ background: isSelected ? '#f5f7ff' : (idx % 2 === 0 ? '#fff' : '#fafafa') }}
                  onMouseEnter={e => !isSelected && (e.currentTarget.style.background = '#f5f7ff')}
                  onMouseLeave={e => !isSelected && (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa')}
                >
                  <td style={{ ...A.td, paddingLeft: 24, width: 40 }}>
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => toggleSelect(cat.id)}
                      style={{ width: 17, height: 17, cursor: 'pointer' }}
                    />
                  </td>
                  <td style={A.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                        {cat.image ? (
                          <img src={formatImage(cat.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <i className="bx bxs-category" style={{ fontSize: 18, color: '#6366f1' }} />
                        )}
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
                    <AdminActionButtons onEdit={() => setModal({ ...cat })} onDelete={() => del(cat.id)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <AdminPagination page={currentPage} totalPages={totalPages} totalItems={totalItems} onChange={setCurrentPage} label="kategori" pageSize={itemsPerPage} />
      </TablePanel>

      {modal && (
        <Modal title={modal.id ? 'Edit Kategori' : 'Tambah Kategori'} onClose={() => setModal(null)}>
          <form onSubmit={save}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <FieldLabel>Nama Kategori</FieldLabel>
                <AdminInput placeholder="Misal: Fashion Pria" value={modal.name} onChange={e => handleName(e.target.value)} required />
              </div>
              <div>
                <FieldLabel>URL Slug (Auto)</FieldLabel>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" style={{ fontFamily: 'monospace', color: '#6366f1', fontWeight: 700 }} placeholder="fashion-pria" value={modal.slug} onChange={e => setModal(p => ({ ...p, slug: e.target.value }))} required />
              </div>
              <div>
                <FieldLabel>Thumbnail Kategori</FieldLabel>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {/* Local Upload Box */}
                  <div style={{ 
                      width: 80, height: 80, borderRadius: 14, border: '2px dashed #cbd5e1', 
                      background: '#f8fafc', display: 'flex', alignItems: 'center', 
                      justifyContent: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 
                  }}>
                    {modal.image ? (
                      <img src={formatImage(modal.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    ) : (
                      <i className="bx bx-image-add" style={{ fontSize: 24, color: '#94a3b8' }} />
                    )}
                    <input 
                      type="file" 
                      onChange={handleUpload} 
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
                      accept="image/*" 
                    />
                    {uploading && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="bx bx-loader-alt animate-spin" style={{ color: '#6366f1', fontSize: 20 }} />
                      </div>
                    )}
                  </div>
                  
                  {/* Direct URL input */}
                  <div style={{ flex: 1 }}>
                    <FieldLabel>Atau masukkan URL Foto</FieldLabel>
                    <input 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" style={{ width: '100%' }} 
                      placeholder="https://example.com/kategori.webp" 
                      value={modal.image || ''} 
                      onChange={e => setModal(p => ({ ...p, image: e.target.value }))} 
                    />
                  </div>
                </div>
              </div>
              <div>
                <FieldLabel>Urutan Tampil</FieldLabel>
                <AdminInput type="number" value={modal.order} onChange={e => setModal(p => ({ ...p, order: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <FieldLabel>Deskripsi</FieldLabel>
                <AdminTextarea placeholder="Jelaskan isi kategori ini..." value={modal.description} onChange={e => setModal(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <AdminFormActions onCancel={() => setModal(null)} saving={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}
