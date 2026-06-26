import React, { useState, useEffect, useRef } from 'react';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import { A, PageHeader, Modal, TablePanel, statusBadge, FieldLabel } from '../../lib/adminStyles.jsx';
import { AdminSearch, AdminInput, AdminActionButtons, AdminEmptyState, AdminPagination } from '../../lib/adminComponents.jsx';
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

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ id: 0, title: '', description: '', type: 'online', location: '', start_time: '', end_time: '', image_url: '', status: 'upcoming', is_active: true });
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Search & Filtration & Pagination state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState('start_time');
  const [order, setOrder] = useState('desc');
  const limit = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = () => {
    setLoading(true);

    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search: debouncedSearch,
      type: selectedType,
      status: selectedStatus,
      sort,
      order
    }).toString();

    fetchJson(`${ADMIN_API_BASE}/events?${query}`)
      .then(d => {
        setEvents(d.data || []);
        setTotal(d.total || 0);
      })
      .catch(err => toast.error('Gagal memuat event'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [page, debouncedSearch, selectedType, selectedStatus, sort, order]);

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

  const formatDateTimeLocal = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '';
      const offset = d.getTimezoneOffset();
      const localTime = new Date(d.getTime() - offset * 60 * 1000);
      return localTime.toISOString().slice(0, 16);
    } catch (e) {
      return '';
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus event ini?')) return;
    fetchJson(`${ADMIN_API_BASE}/events/delete?id=${id}`, {
      method: 'DELETE'
    })
      .then(() => {
        toast.success('Event berhasil dihapus');
        loadData();
      })
      .catch(err => toast.error(err.message || 'Gagal menghapus event'));
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    fetchJson(`${ADMIN_API_BASE}/events/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    }).then(() => {
      toast.success('Event disimpan');
      setShowModal(false);
      loadData();
    }).catch(err => toast.error(err.message || 'Gagal menyimpan event'))
    .finally(() => setSaving(false));
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

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={A.page}>
      <PageHeader title="Events & Webinars" subtitle="Schedule gatherings for your affiliates">
        <button onClick={() => { setFormData({ id: 0, title: '', description: '', type: 'online', location: '', start_time: '', end_time: '', image_url: '', status: 'upcoming', is_active: true }); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
           <i className="bx bx-calendar-plus" /> Buat Event
        </button>
      </PageHeader>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm" style={{ overflow: 'visible', padding: '20px 24px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', border: '1px solid #f1f5f9', background: '#fff', marginBottom: 24 }}>
        <AdminSearch
          placeholder="Cari judul, lokasi atau deskripsi event..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <CustomSelect
          label="Tipe Event"
          value={selectedType}
          options={[
            { label: 'Semua Tipe', value: 'all' },
            { label: 'Online (Webinar)', value: 'online' },
            { label: 'Offline (Kopdar)', value: 'offline' }
          ]}
          onChange={val => { setSelectedType(val); setPage(1); }}
          icon="bx-video"
        />

        <CustomSelect
          label="Status"
          value={selectedStatus}
          options={[
            { label: 'Semua Status', value: 'all' },
            { label: 'Upcoming', value: 'upcoming' },
            { label: 'Ongoing', value: 'ongoing' },
            { label: 'Completed', value: 'completed' },
            { label: 'Cancelled', value: 'cancelled' }
          ]}
          onChange={val => { setSelectedStatus(val); setPage(1); }}
          icon="bx-toggle-left"
        />
        
        {(search || selectedType !== 'all' || selectedStatus !== 'all') && (
          <button
            onClick={() => { setSearch(''); setSelectedType('all'); setSelectedStatus('all'); setPage(1); }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" style={{ color: '#6366f1', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <i className="bx bx-x" /> Reset Filter
          </button>
        )}
      </div>

      <TablePanel 
        loading={loading}
        toolbar={
          <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
            {loading ? 'Memuat...' : `Event Halaman Ini: ${events.length}`}
          </span>
        }
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <SortHeader col="title" label="Event" style={{ paddingLeft: 24 }} />
              <SortHeader col="start_time" label="Waktu" />
              <SortHeader col="type" label="Tipe" />
              <SortHeader col="status" label="Status" />
              <th style={{ ...A.th, textAlign: 'right', paddingRight: 24 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && !loading ? (
              <AdminEmptyState colSpan={5} message="Tidak ada event yang ditemukan." />
            ) : (
              events.map((ev, idx) => (
                <tr key={ev.id} style={{ borderBottom: idx === events.length - 1 ? 'none' : '1px solid #f8fafc' }}>
                  <td style={{ ...A.td, paddingLeft: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 64, height: 44, borderRadius: 10, overflow: 'hidden', border: '1px solid #f1f5f9', background: '#f8fafc', flexShrink: 0 }}>
                        {ev.image_url ? (
                          <img src={formatImage(ev.image_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f1f5f9' }}>
                            <i className="bx bx-image" style={{ fontSize: 20, color: '#94a3b8' }} />
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{ev.title}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{ev.location}</div>
                      </div>
                    </div>
                  </td>
                  <td style={A.td}>
                     <div style={{ fontSize: 12, fontWeight: 700 }}>{new Date(ev.start_time).toLocaleDateString('id')}</div>
                     <div style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(ev.start_time).toLocaleTimeString('id')}</div>
                  </td>
                  <td style={A.td}><span style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 900 }}>{ev.type}</span></td>
                  <td style={A.td}><span style={statusBadge(ev.status)}>{ev.status}</span></td>
                  <td style={{ ...A.td, textAlign: 'right', paddingRight: 24 }}>
                     <AdminActionButtons onEdit={() => { setFormData(ev); setShowModal(true); }} onDelete={() => handleDelete(ev.id)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TablePanel>

      <AdminPagination page={page} totalPages={totalPages} totalItems={total} onChange={setPage} label="event" pageSize={limit} />

      {showModal && (
        <Modal title={formData.id ? 'Edit Event' : 'Create Event'} onClose={() => setShowModal(false)} wide>
           <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <FieldLabel>Judul Event</FieldLabel>
                      <AdminInput value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <FieldLabel>Tipe</FieldLabel>
                      <AdminSelect className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                         <option value="online">Online (Webinar)</option>
                         <option value="offline">Offline (Kopdar)</option>
                      </AdminSelect>
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <FieldLabel>Link / Lokasi</FieldLabel>
                      <AdminInput value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <FieldLabel>Status</FieldLabel>
                      <AdminSelect className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                         <option value="upcoming">Upcoming</option>
                         <option value="ongoing">Ongoing</option>
                         <option value="completed">Completed</option>
                         <option value="cancelled">Cancelled</option>
                      </AdminSelect>
                   </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   <div>
                      <FieldLabel>Thumbnail / Cover</FieldLabel>
                      <div style={{ height: 160, borderRadius: 16, border: '2px dashed #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                         {formData.image_url ? (
                            <img src={formatImage(formData.image_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                         ) : (
                            <i className="bx bx-image-add" style={{ fontSize: 32, color: '#cbd5e1' }} />
                         )}
                         <input type="file" onChange={handleUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} accept="image/*" disabled={uploading} />
                         {uploading && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               <i className="bx bx-loader-alt bx-spin" style={{ fontSize: 24, color: '#6366f1' }} />
                            </div>
                         )}
                      </div>
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <FieldLabel>Waktu Mulai</FieldLabel>
                      <AdminInput type="datetime-local" value={formatDateTimeLocal(formData.start_time)} onChange={e => setFormData({ ...formData, start_time: e.target.value })} required />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <FieldLabel>Waktu Selesai</FieldLabel>
                      <AdminInput type="datetime-local" value={formatDateTimeLocal(formData.end_time)} onChange={e => setFormData({ ...formData, end_time: e.target.value })} required />
                   </div>
                </div>
                
                <div className="md:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                   <FieldLabel>Deskripsi</FieldLabel>
                   <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 transition-all resize-y placeholder:text-slate-400" style={{ height: 100 }} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
                </div>
             </div>
             <button type="submit" disabled={saving || uploading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
                {saving ? 'Menyimpan...' : 'Simpan Event'}
             </button>
           </form>
        </Modal>
      )}

      <style>{`
        .grid { display: grid; }
        .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
        @media (min-width: 768px) { .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      `}</style>
    </div>
  );
}
