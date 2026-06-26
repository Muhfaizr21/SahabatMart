import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import { A, PageHeader, TablePanel, statusBadge, fmtDate } from '../../lib/adminStyles.jsx';
import { AdminActionButtons, AdminEmptyState } from '../../lib/adminComponents.jsx';
import toast from 'react-hot-toast';

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

export default function AdminBlogs() {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Pagination & Filtering
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const limit = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadBlogs = () => {
    setLoading(true);
    setSelectedIds([]);

    const query = new URLSearchParams({
      search: debouncedSearch,
      category,
      status,
      sort,
      order,
      page: String(page),
      limit: String(limit)
    }).toString();

    fetchJson(`${ADMIN_API_BASE}/blogs?${query}`)
      .then(d => {
        setBlogs(d?.data || []);
        setTotalPages(Math.ceil((d?.total || 0) / limit) || 1);
      })
      .catch(err => {
        console.error(err);
        toast.error('Gagal memuat blog');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBlogs(); }, [debouncedSearch, category, status, sort, order, page]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === blogs.length) setSelectedIds([]);
    else setSelectedIds(blogs.map(b => b.id));
  };

  const bulkDelete = () => {
    if (!window.confirm(`Hapus ${selectedIds.length} artikel terpilih secara permanen?`)) return;
    setLoading(true);
    fetchJson(`${ADMIN_API_BASE}/blogs/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids: selectedIds.map(String) })
    })
      .then(() => {
        toast.success('Artikel terpilih dihapus');
        loadBlogs();
      })
      .catch(err => {
        toast.error(err.message || 'Gagal menghapus artikel');
        setLoading(false);
      });
  };

  const deleteBlog = (id) => {
    if (!window.confirm('Hapus artikel ini secara permanen?')) return;
    fetchJson(`${ADMIN_API_BASE}/blogs/delete?id=${id}`, { method: 'DELETE' })
      .then(() => { toast.success('Artikel dihapus'); loadBlogs(); })
      .catch(err => toast.error(err.message));
  };

  const handleSort = (col) => {
    if (sort === col) {
      setOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(col);
      setOrder('asc');
    }
    setPage(1);
  };

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

  return (
    <div style={A.page}>
      <PageHeader
        title="Articles & CMS"
        subtitle="Kelola konten blog, artikel tips & lifestyle untuk pelanggan AkuGlow"
      >
        <button
          onClick={() => navigate('/admin/blogs/new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
        >
          <i className="bx bx-plus-circle" /> Tulis Artikel Baru
        </button>
      </PageHeader>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm" style={{ overflow: 'visible', padding: '20px 24px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', border: '1px solid #f1f5f9', background: '#fff', marginBottom: 24 }}>
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <i className="bx bx-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 18 }} />
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" style={{ paddingLeft: 42, background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
            placeholder="Cari judul, summary atau konten artikel..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <CustomSelect
          label="Kategori"
          value={category}
          options={[
            { label: 'Semua Kategori', value: '' },
            { label: 'Update', value: 'Update' },
            { label: 'Lifestyle', value: 'Lifestyle' },
            { label: 'Tips', value: 'Tips' },
            { label: 'General', value: 'General' }
          ]}
          onChange={val => { setCategory(val); setPage(1); }}
          icon="bx-category"
        />

        <CustomSelect
          label="Status"
          value={status}
          options={[
            { label: 'Semua Status', value: '' },
            { label: 'Published', value: 'published' },
            { label: 'Draft', value: 'draft' }
          ]}
          onChange={val => { setStatus(val); setPage(1); }}
          icon="bx-toggle-left"
        />
        
        {(search || category || status) && (
          <button
            onClick={() => { setSearch(''); setCategory(''); setStatus(''); setPage(1); }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" style={{ color: '#6366f1', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <i className="bx bx-x" /> Reset Filter
          </button>
        )}
      </div>

      <TablePanel 
        loading={loading}
        toolbar={
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
              {loading ? 'Memuat...' : `Artikel Halaman Ini: ${blogs.length}`}
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
                  checked={blogs.length > 0 && selectedIds.length === blogs.length} 
                  onChange={toggleSelectAll}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </th>
              <SortHeader col="title" label="Artikel" />
              <SortHeader col="category" label="Kategori" />
              <SortHeader col="author" label="Penulis" />
              <SortHeader col="status" label="Status" />
              <th style={{ ...A.th, textAlign: 'right', paddingRight: 24 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {blogs.map((b, idx) => {
              const isSelected = selectedIds.includes(b.id);
              const isLast = idx === blogs.length - 1;
              return (
                <tr 
                  key={b.id}
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
                      onChange={() => toggleSelect(b.id)}
                      style={{ width: 17, height: 17, cursor: 'pointer' }}
                    />
                  </td>
                  <td style={A.td}>
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
                     <AdminActionButtons onEdit={() => navigate(`/admin/blogs/edit/${b.id}`)} onDelete={() => deleteBlog(b.id)} />
                  </td>
                </tr>
              );
            })}
            {blogs.length === 0 && !loading && (
              <AdminEmptyState colSpan={6} message="Belum ada artikel yang ditemukan." />
            )}
          </tbody>
        </table>
      </TablePanel>

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 40, paddingBottom: 40 }}>
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))} 
            disabled={page === 1}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" style={{ padding: '8px 16px', opacity: page === 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="bx bx-chevron-left" /> Sebelumnya
          </button>
          
          <div style={{ display: 'flex', gap: 6 }}>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  transition: 'all 0.2s',
                  background: page === i + 1 ? '#6366f1' : '#fff',
                  color: page === i + 1 ? '#fff' : '#64748b',
                  border: page === i + 1 ? 'none' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  boxShadow: page === i + 1 ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
            disabled={page === totalPages}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" style={{ padding: '8px 16px', opacity: page === totalPages ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            Berikutnya <i className="bx bx-chevron-right" />
          </button>
        </div>
      )}


    </div>
  );
}
