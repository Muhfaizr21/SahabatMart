import React, { useState, useEffect, useRef } from 'react';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import { A, PageHeader, TablePanel, statusBadge } from '../../lib/adminStyles.jsx';
import { AdminSearch, AdminActionButtons, AdminEmptyState } from '../../lib/adminComponents.jsx';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import AdminSelect from '../../components/admin/AdminSelect';

const CustomSelect = ({ label, value, options, onChange, icon }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const clickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const selectedOption = options.find(o => String(o.value) === String(value));

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 12,
          border: '1px solid #e2e8f0', background: '#fff',
          fontSize: 13, fontWeight: 600, color: '#334155',
          cursor: 'pointer', outline: 'none', transition: 'all 0.2s',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
        onClick={() => setOpen(!open)}
      >
        {icon && <i className={`bx ${icon}`} style={{ fontSize: 16, color: '#6366f1' }} />}
        <span>{label}: <strong>{selectedOption ? selectedOption.label : 'Semua'}</strong></span>
        <i className="bx bx-chevron-down" style={{ fontSize: 14, color: '#94a3b8', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 150,
          background: '#fff', border: '1px solid #f1f5f9', borderRadius: 12,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
          minWidth: 180, overflow: 'hidden', padding: 4,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: 'none', background: String(value) === String(opt.value) ? '#f5f3ff' : 'transparent',
                color: String(value) === String(opt.value) ? '#6366f1' : '#475569',
                fontSize: 12.5, fontWeight: String(value) === String(opt.value) ? 700 : 500,
                textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (String(value) !== String(opt.value)) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#0f172a';
                }
              }}
              onMouseLeave={e => {
                if (String(value) !== String(opt.value)) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#475569';
                }
              }}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function AdminPromo() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const navigate = useNavigate();

  // Search & Filter & Sort States
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [itemsPerPage, setItemsPerPage] = useState(20); // Default to 20 per user request

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

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
      body: JSON.stringify({ ids: selectedIds.map(String) }) // FIXED: converted to string payload
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

  const handleSort = (col) => {
    if (sort === col) {
      setOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(col);
      setOrder('asc');
    }
    setCurrentPage(1);
  };

  // Get dynamic categories list from current promos
  const categoriesList = ['all', ...new Set(promos.map(p => p.category).filter(Boolean))];

  // Filtering & Sorting Logic
  const filteredAndSortedPromos = React.useMemo(() => {
    const filtered = promos.filter(p => {
      const matchesSearch = !debouncedSearch || 
        p.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
        p.caption?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.description?.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesType = selectedType === 'all' || p.type === selectedType;
      const matchesStatus = selectedStatus === 'all' || 
        (selectedStatus === 'visible' && p.is_active) || 
        (selectedStatus === 'hidden' && !p.is_active);

      return matchesSearch && matchesCategory && matchesType && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      let valA = a[sort];
      let valB = b[sort];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }
      if (valA === undefined || valA === null) return order === 'asc' ? -1 : 1;
      if (valB === undefined || valB === null) return order === 'asc' ? 1 : -1;

      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [promos, debouncedSearch, selectedCategory, selectedType, selectedStatus, sort, order]);

  // Pagination Logic
  const totalItems = filteredAndSortedPromos.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredAndSortedPromos, totalPages, currentPage]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSortedPromos.slice(indexOfFirstItem, indexOfLastItem);

  const SortHeader = ({ col, label, style = {} }) => {
    const isSorted = sort === col;
    return (
      <th 
        style={{ ...A.th, cursor: 'pointer', userSelect: 'none', ...style }} 
        onClick={() => handleSort(col)}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span>{label}</span>
          <span style={{ fontSize: 14, color: isSorted ? '#6366f1' : '#94a3b8' }}>
            {isSorted ? (order === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </div>
      </th>
    );
  };

  const tabs = (
    <div style={{ display: 'flex', gap: 4 }}>
      <button style={A.tab(selectedType === 'all')} onClick={() => { setSelectedType('all'); setCurrentPage(1); }}>Semua Tipe</button>
      <button style={A.tab(selectedType === 'image')} onClick={() => { setSelectedType('image'); setCurrentPage(1); }}> Gambar</button>
      <button style={A.tab(selectedType === 'video')} onClick={() => { setSelectedType('video'); setCurrentPage(1); }}> Video</button>
      <button style={A.tab(selectedType === 'copywriting')} onClick={() => { setSelectedType('copywriting'); setCurrentPage(1); }}> Teks</button>
    </div>
  );

  const toolbar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'space-between' }}>
      <div>
        {selectedIds.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 12px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fee2e2' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>{selectedIds.length} Terpilih</span>
            <button 
              onClick={bulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" style={{ background: '#ef4444', height: 32, padding: '0 12px', fontSize: 12 }}
            >
              <i className="bx bx-trash" /> Hapus Terpilih
            </button>
          </div>
        )}
      </div>
      <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
        {loading ? 'Memuat...' : `${totalItems} asset`}
      </span>
    </div>
  );

  return (
    <div style={A.page}>
      <PageHeader title="Promo Materials" subtitle="Content assets for affiliate marketing">
        <button onClick={() => navigate('/admin/promo/new')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
           <i className="bx bx-plus-circle" /> Tambah Asset
        </button>
      </PageHeader>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm" style={{ overflow: 'visible', padding: '20px 24px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', border: '1px solid #f1f5f9', background: '#fff', marginBottom: 24 }}>
        <AdminSearch
          placeholder="Cari materi promo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <CustomSelect
          label="Kategori"
          value={selectedCategory}
          options={[
            { label: 'Semua Kategori', value: 'all' },
            ...categoriesList.filter(c => c !== 'all').map(c => ({ label: c, value: c }))
          ]}
          onChange={val => { setSelectedCategory(val); setCurrentPage(1); }}
          icon="bx-folder"
        />

        <CustomSelect
          label="Status"
          value={selectedStatus}
          options={[
            { label: 'Semua Status', value: 'all' },
            { label: 'Visible', value: 'visible' },
            { label: 'Hidden', value: 'hidden' }
          ]}
          onChange={val => { setSelectedStatus(val); setCurrentPage(1); }}
          icon="bx-show"
        />

        {(search || selectedCategory !== 'all' || selectedStatus !== 'all') && (
          <button
            onClick={() => { setSearch(''); setSelectedCategory('all'); setSelectedStatus('all'); setCurrentPage(1); }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" style={{ color: '#6366f1', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <i className="bx bx-x" /> Reset Filter
          </button>
        )}
      </div>

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
              <SortHeader col="title" label="Asset" />
              <SortHeader col="type" label="Tipe" />
              <SortHeader col="category" label="Kategori" />
              <SortHeader col="is_active" label="Status" />
              <th style={{ ...A.th, textAlign: 'right', paddingRight: 24 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <AdminEmptyState colSpan={6} message="Tidak ada materi promo yang cocok dengan kriteria filter." />
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
                              ) : p.type === 'video' ? (
                                <video src={formatImage(p.file_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
                              ) : (
                                <img src={formatImage(p.file_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                              )}
                          </div>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{p.title}</div>
                       </div>
                    </td>
                    <td style={A.td}><span style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 900 }}>{p.type}</span></td>
                    <td style={A.td}>{p.category}</td>
                    <td style={A.td}><span style={statusBadge(p.is_active ? 'active' : 'inactive')}>{p.is_active ? 'Visible' : 'Hidden'}</span></td>
                    <td style={{ ...A.td, textAlign: 'right', paddingRight: 24 }}>
                       <AdminActionButtons onEdit={() => navigate(`/admin/promo/edit/${p.id}`)} onDelete={() => handleDelete(p.id)} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          background: '#fff',
          borderTop: '1px solid #f1f5f9',
          fontSize: 13,
          color: '#64748b',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>
              Menampilkan <strong>{totalItems > 0 ? indexOfFirstItem + 1 : 0}</strong> - <strong>{Math.min(indexOfLastItem, totalItems)}</strong> dari <strong>{totalItems}</strong> asset
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Tampilkan:</span>
              <AdminSelect
                value={itemsPerPage}
                onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 8,
                  border: '1.5px solid #e2e8f0',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#475569',
                  background: '#fff',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </AdminSelect>
            </div>
          </div>

          {totalPages > 1 && (
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
          )}
        </div>
      </TablePanel>
    </div>
  );
}
