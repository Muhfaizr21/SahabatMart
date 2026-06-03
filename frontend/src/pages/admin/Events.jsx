import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, AFFILIATE_API_BASE, fetchJson, formatImage } from '../../lib/api';
import { A, PageHeader, Modal, TablePanel, statusBadge, FieldLabel } from '../../lib/adminStyles.jsx';
import toast from 'react-hot-toast';

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ id: 0, title: '', description: '', type: 'online', location: '', start_time: '', end_time: '', image_url: '', status: 'upcoming', is_active: true });
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Search & Filtration & Pagination state
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const loadData = () => {
    setLoading(true);
    fetchJson(`${ADMIN_API_BASE}/events?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&type=${selectedType}&status=${selectedStatus}`)
      .then(d => {
        setEvents(d.data || []);
        setTotal(d.total || 0);
      })
      .catch(err => toast.error('Gagal memuat event'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [page, search, selectedType, selectedStatus]);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleTypeChange = (val) => {
    setSelectedType(val);
    setPage(1);
  };

  const handleStatusChange = (val) => {
    setSelectedStatus(val);
    setPage(1);
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

  const totalPages = Math.ceil(total / limit);

  // Tabs for Event Type
  const tabs = (
    <div style={{ display: 'flex', gap: 4 }}>
      <button style={A.tab(selectedType === 'all')} onClick={() => handleTypeChange('all')}>Semua Tipe</button>
      <button style={A.tab(selectedType === 'online')} onClick={() => handleTypeChange('online')}>🎥 Online</button>
      <button style={A.tab(selectedType === 'offline')} onClick={() => handleTypeChange('offline')}>📍 Offline</button>
    </div>
  );

  // Toolbar for Search & Status filter
  const toolbar = (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      {/* Search Input */}
      <div style={A.searchWrap}>
        <i className="bx bx-search" style={A.searchIcon} />
        <input 
          style={A.searchInput} 
          placeholder="Cari event..." 
          value={search} 
          onChange={e => handleSearchChange(e.target.value)} 
        />
      </div>

      {/* Status Dropdown */}
      <select 
        style={A.select} 
        value={selectedStatus} 
        onChange={e => handleStatusChange(e.target.value)}
      >
        <option value="all">Semua Status</option>
        <option value="upcoming">Upcoming</option>
        <option value="ongoing">Ongoing</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>
  );

  return (
    <div style={A.page}>
      <PageHeader title="Events & Webinars" subtitle="Schedule gatherings for your affiliates">
        <button onClick={() => { setFormData({ id: 0, title: '', description: '', type: 'online', location: '', start_time: '', end_time: '', image_url: '', status: 'upcoming', is_active: true }); setShowModal(true); }} style={A.btnPrimary}>
           <i className="bx bx-calendar-plus" /> Buat Event
        </button>
      </PageHeader>

      <TablePanel loading={loading} tabs={tabs} toolbar={toolbar}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...A.th, paddingLeft: 24 }}>Event</th>
              <th style={A.th}>Waktu</th>
              <th style={A.th}>Tipe</th>
              <th style={A.th}>Status</th>
              <th style={{ ...A.th, textAlign: 'right', paddingRight: 24 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && !loading ? (
              <tr><td colSpan="5" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Tidak ada event yang cocok dengan kriteria filter.</td></tr>
            ) : (
              events.map(ev => (
                <tr key={ev.id}>
                  <td style={{ ...A.td, paddingLeft: 24 }}>
                     <div style={{ fontWeight: 800, color: '#0f172a' }}>{ev.title}</div>
                     <div style={{ fontSize: 11, color: '#64748b' }}>{ev.location}</div>
                  </td>
                  <td style={A.td}>
                     <div style={{ fontSize: 12, fontWeight: 700 }}>{new Date(ev.start_time).toLocaleDateString('id')}</div>
                     <div style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(ev.start_time).toLocaleTimeString('id')}</div>
                  </td>
                  <td style={A.td}><span style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 900 }}>{ev.type}</span></td>
                  <td style={A.td}><span style={statusBadge(ev.status)}>{ev.status}</span></td>
                  <td style={{ ...A.td, textAlign: 'right', paddingRight: 24 }}>
                     <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button onClick={() => { setFormData(ev); setShowModal(true); }} style={A.iconBtn()} title="Edit"><i className="bx bx-edit-alt" /></button>
                        <button onClick={() => handleDelete(ev.id)} style={A.iconBtn('#dc2626', 'rgba(220, 38, 38, 0.08)')} title="Hapus"><i className="bx bx-trash" /></button>
                     </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
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
              Menampilkan <strong>{((page - 1) * limit) + 1}</strong> - <strong>{Math.min(page * limit, total)}</strong> dari <strong>{total}</strong> event
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button 
                disabled={page === 1} 
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.5 : 1,
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
                    if (page <= 4) {
                      return [1, 2, 3, 4, 5, '...', totalPages];
                    }
                    if (page >= totalPages - 3) {
                      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                    }
                    return [1, '...', page - 1, page, page + 1, '...', totalPages];
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
                        onClick={() => setPage(num)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: page === num ? 'none' : '1px solid #e2e8f0',
                          background: page === num ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#fff',
                          color: page === num ? '#fff' : '#475569',
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
                disabled={page === totalPages} 
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  opacity: page === totalPages ? 0.5 : 1,
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
        <Modal title={formData.id ? 'Edit Event' : 'Create Event'} onClose={() => setShowModal(false)} wide>
           <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                   <FieldLabel>Judul Event</FieldLabel>
                   <input style={A.input} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                   <FieldLabel>Tipe</FieldLabel>
                   <select style={A.select} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                      <option value="online">🎥 Online (Webinar)</option>
                      <option value="offline">📍 Offline (Kopdar)</option>
                   </select>
                </div>
                <div className="md:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                   <FieldLabel>Deskripsi</FieldLabel>
                   <textarea style={{ ...A.textarea, height: 100 }} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                   <FieldLabel>Link / Lokasi</FieldLabel>
                   <input style={A.input} value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                   <FieldLabel>Status</FieldLabel>
                   <select style={A.select} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                   </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                   <FieldLabel>Waktu Mulai</FieldLabel>
                   <input type="datetime-local" style={A.input} value={formData.start_time ? new Date(formData.start_time).toISOString().slice(0, 16) : ''} onChange={e => setFormData({ ...formData, start_time: e.target.value })} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                   <FieldLabel>Waktu Selesai</FieldLabel>
                   <input type="datetime-local" style={A.input} value={formData.end_time ? new Date(formData.end_time).toISOString().slice(0, 16) : ''} onChange={e => setFormData({ ...formData, end_time: e.target.value })} required />
                </div>
             </div>
             <button type="submit" disabled={saving} style={A.btnPrimary}>{saving ? 'Saving...' : 'Simpan Event'}</button>
           </form>
        </Modal>
      )}
    </div>
  );
}
