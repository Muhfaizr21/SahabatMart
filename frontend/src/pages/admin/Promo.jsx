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
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const loadData = () => {
    setLoading(true);
    setSelectedIds([]);
    fetchJson(`${ADMIN_API_BASE}/promo`)
      .then(d => setPromos(d || []))
      .catch(err => toast.error('Gagal memuat materi promo'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

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
    if (!window.confirm(`Hapus ${selectedIds.length} materi promo terpilih secara permanen?`)) return;
    setLoading(true);
    fetchJson(`${ADMIN_API_BASE}/promo/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids: selectedIds })
    })
      .then(() => {
        toast.success('Materi promo terpilih dihapus');
        loadData();
      })
      .catch(err => {
        toast.error(err.message || 'Gagal menghapus materi promo');
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
      const resp = await fetch(`${ADMIN_API_BASE}/upload`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: fd
      });
      if (!resp.ok) throw new Error('Upload gagal');
      
      const responseData = await resp.json();
      const uploadedUrl = responseData?.data?.url || responseData?.url;
      
      if (uploadedUrl) {
        setFormData(prev => ({ ...prev, file_url: uploadedUrl }));
        toast.success('Gambar berhasil diunggah');
      } else {
        throw new Error('Format response tidak valid');
      }
    } catch (_err) {
      toast.error(_err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus materi promo ini?')) return;
    fetchJson(`${ADMIN_API_BASE}/promo/delete?id=${id}`, {
      method: 'DELETE'
    })
      .then(() => {
        toast.success('Materi promo berhasil dihapus');
        loadData();
      })
      .catch(err => toast.error(err.message || 'Gagal menghapus materi promo'));
  };

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
    }).catch(err => toast.error(err.message || 'Gagal menyimpan materi promo'))
    .finally(() => setSaving(false));
  };

  // Get dynamic categories list from current promos
  const categoriesList = ['all', ...new Set(promos.map(p => p.category).filter(Boolean))];

  // Filtering Logic
  const filteredPromos = promos.filter(p => {
    const matchesSearch = !search || 
      p.title?.toLowerCase().includes(search.toLowerCase()) || 
      p.caption?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesType = selectedType === 'all' || p.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'visible' && p.is_active) || 
      (selectedStatus === 'hidden' && !p.is_active);

    return matchesSearch && matchesCategory && matchesType && matchesStatus;
  });

  // Pagination Logic
  const totalItems = filteredPromos.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredPromos, totalPages, currentPage]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPromos.slice(indexOfFirstItem, indexOfLastItem);

  // Tabs for Content Type
  const tabs = (
    <div style={{ display: 'flex', gap: 4 }}>
      <button style={A.tab(selectedType === 'all')} onClick={() => { setSelectedType('all'); setCurrentPage(1); }}>Semua Tipe</button>
      <button style={A.tab(selectedType === 'image')} onClick={() => { setSelectedType('image'); setCurrentPage(1); }}>🖼️ Gambar</button>
      <button style={A.tab(selectedType === 'video')} onClick={() => { setSelectedType('video'); setCurrentPage(1); }}>📽️ Video</button>
      <button style={A.tab(selectedType === 'copywriting')} onClick={() => { setSelectedType('copywriting'); setCurrentPage(1); }}>✍️ Teks</button>
    </div>
  );

  // Search & Filters Toolbar
  const toolbar = (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search Input */}
        <div style={A.searchWrap}>
          <i className="bx bx-search" style={A.searchIcon} />
          <input 
            style={A.searchInput} 
            placeholder="Cari materi promo..." 
            value={search} 
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} 
          />
        </div>

        {/* Category Dropdown */}
        <select 
          style={A.select} 
          value={selectedCategory} 
          onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
        >
          <option value="all">Semua Kategori</option>
          {categoriesList.filter(c => c !== 'all').map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Status Dropdown */}
        <select 
          style={A.select} 
          value={selectedStatus} 
          onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
        >
          <option value="all">Semua Status</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

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
          {loading ? 'Memuat...' : `${totalItems} asset`}
        </span>
      </div>
    </div>
  );

  return (
    <div style={A.page}>
      <PageHeader title="Promo Materials" subtitle="Content assets for affiliate marketing">
        <button onClick={() => { setFormData({ id: 0, title: '', description: '', type: 'image', category: 'Instagram', file_url: '', caption: '', is_active: true }); setShowModal(true); }} style={A.btnPrimary}>
           <i className="bx bx-plus-circle" /> Tambah Asset
        </button>
      </PageHeader>

      <TablePanel loading={loading} tabs={tabs} toolbar={toolbar}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...A.th, width: 40, paddingLeft: 24 }}>
                <input 
                  type="checkbox" 
                  checked={currentItems.length > 0 && currentItems.every(p => selectedIds.includes(p.id))} 
                  onChange={() => toggleSelectAll(currentItems.map(p => p.id))}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </th>
              <th style={A.th}>Asset</th>
              <th style={A.th}>Tipe</th>
              <th style={A.th}>Kategori</th>
              <th style={A.th}>Status</th>
              <th style={{ ...A.th, textAlign: 'right', paddingRight: 24 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ ...A.td, textAlign: 'center', padding: '40px 24px', color: '#94a3b8' }}>
                  Tidak ada materi promo yang cocok dengan kriteria filter.
                </td>
              </tr>
            ) : (
              currentItems.map((p, idx) => {
                const isSelected = selectedIds.includes(p.id);
                const isLast = idx === currentItems.length - 1;
                return (
                  <tr key={p.id}
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
                        onChange={() => toggleSelect(p.id)}
                        style={{ width: 17, height: 17, cursor: 'pointer' }}
                      />
                    </td>
                    <td style={A.td}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             {p.type === 'copywriting' ? (
                               <i className="bx bx-file-blank" style={{ fontSize: 22, color: '#6366f1' }} />
                             ) : (
                               <img src={formatImage(p.file_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=800&q=80"; }} />
                             )}
                          </div>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{p.title}</div>
                       </div>
                    </td>
                    <td style={A.td}><span style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 900 }}>{p.type}</span></td>
                    <td style={A.td}>{p.category}</td>
                    <td style={A.td}><span style={statusBadge(p.is_active ? 'active' : 'inactive')}>{p.is_active ? 'Visible' : 'Hidden'}</span></td>
                    <td style={{ ...A.td, textAlign: 'right', paddingRight: 24 }}>
                       <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button onClick={() => { setFormData(p); setShowModal(true); }} style={A.iconBtn()} title="Edit"><i className="bx bx-edit-alt" /></button>
                          <button onClick={() => handleDelete(p.id)} style={A.iconBtn('#dc2626', 'rgba(220, 38, 38, 0.08)')} title="Hapus"><i className="bx bx-trash" /></button>
                       </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            background: '#fff',
            borderTop: '1px solid #f1f5f9',
            fontSize: 13,
            color: '#64748b',
          }}>
            <div>
              Menampilkan <strong>{indexOfFirstItem + 1}</strong> - <strong>{Math.min(indexOfLastItem, totalItems)}</strong> dari <strong>{totalItems}</strong> asset
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  fontWeight: 700,
                  color: '#475569'
                }}
              >
                Sebelumnya
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {(() => {
                  const getPageNumbers = () => {
                    if (totalPages <= 7) {
                      return Array.from({ length: totalPages }, (_, i) => i + 1);
                    }
                    if (currentPage <= 4) {
                      return [1, 2, 3, 4, 5, '...', totalPages];
                    }
                    if (currentPage >= totalPages - 3) {
                      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                    }
                    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
                  };

                  return getPageNumbers().map((num, i) => {
                    if (num === '...') {
                      return (
                        <span key={`ellipsis-${i}`} style={{ width: 32, textAlign: 'center', color: '#94a3b8', fontWeight: 700, fontSize: 14 }}>
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={num}
                        onClick={() => setCurrentPage(num)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: currentPage === num ? 'none' : '1px solid #e2e8f0',
                          background: currentPage === num ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#fff',
                          color: currentPage === num ? '#fff' : '#475569',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {num}
                      </button>
                    );
                  });
                })()}
              </div>
              <button 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  fontWeight: 700,
                  color: '#475569'
                }}
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </TablePanel>

      {showModal && (
        <Modal title={formData.id ? 'Edit Promo' : 'New Promo Asset'} onClose={() => setShowModal(false)}>
           <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FieldLabel>Judul Materi</FieldLabel>
              <input style={A.input} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <FieldLabel>Tipe Konten</FieldLabel>
                  <select style={A.select} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                     <option value="image">🖼️ Image</option>
                     <option value="video">📽️ Video</option>
                     <option value="copywriting">✍️ Copywriting Text</option>
                  </select>
                </div>
                
                <div>
                  <FieldLabel>Kategori Media</FieldLabel>
                  <select style={A.select} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                     <option value="Instagram">Instagram</option>
                     <option value="Facebook">Facebook</option>
                     <option value="TikTok">TikTok</option>
                     <option value="WhatsApp">WhatsApp</option>
                  </select>
                </div>
              </div>

              {formData.type !== 'copywriting' && (
                <>
                  <FieldLabel>{formData.type === 'video' ? 'URL Video YouTube / Upload MP4' : 'URL Gambar / Upload Image'}</FieldLabel>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input style={{ ...A.input, flex: 1 }} placeholder="https://..." value={formData.file_url} onChange={e => setFormData({ ...formData, file_url: e.target.value })} required />
                    <label style={{ ...A.btnLight, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: 0, padding: '0 16px', height: 42, flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {uploading ? <i className="bx bx-loader-alt bx-spin" /> : <i className="bx bx-upload" />}
                      {uploading ? 'Upload...' : 'Pilih File'}
                      <input type="file" accept={formData.type === 'video' ? "video/*" : "image/*"} onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
                    </label>
                  </div>
                </>
              )}

              <FieldLabel>{formData.type === 'copywriting' ? 'Isi Teks Copywriting' : 'Caption Tambahan (Opsional)'}</FieldLabel>
              <textarea style={{ ...A.textarea, height: 120 }} value={formData.caption} onChange={e => setFormData({ ...formData, caption: e.target.value })} required={formData.type === 'copywriting'} />

              <div>
                <FieldLabel>Status Tampilkan</FieldLabel>
                <select style={A.select} value={formData.is_active ? "true" : "false"} onChange={e => setFormData({ ...formData, is_active: e.target.value === "true" })}>
                   <option value="true">✅ Visible (Tampilkan ke Mitra)</option>
                   <option value="false">❌ Hidden (Sembunyikan)</option>
                </select>
              </div>

              <button type="submit" disabled={saving} style={A.btnPrimary}>{saving ? 'Saving...' : 'Simpan Promo'}</button>
           </form>
        </Modal>
      )}
    </div>
  );
}
