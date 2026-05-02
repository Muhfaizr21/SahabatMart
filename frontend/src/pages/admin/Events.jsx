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
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const loadData = () => {
    setLoading(true);
    fetchJson(`${ADMIN_API_BASE}/events?page=${page}&limit=${limit}`)
      .then(d => {
        setEvents(d.data || []);
        setTotal(d.total || 0);
      })
      .catch(err => toast.error('Gagal memuat event'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [page]);

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
    }).catch(err => toast.error(err.message))
    .finally(() => setSaving(false));
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={A.page}>
      <PageHeader title="Events & Webinars" subtitle="Schedule gatherings for your affiliates">
        <button onClick={() => { setFormData({ id: 0, title: '', description: '', type: 'online', location: '', start_time: '', end_time: '', image_url: '', status: 'upcoming', is_active: true }); setShowModal(true); }} style={A.btnPrimary}>
           <i className="bx bx-calendar-plus" /> Buat Event
        </button>
      </PageHeader>

      <TablePanel loading={loading}>
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
              <tr><td colSpan="5" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Belum ada event</td></tr>
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
                     <button onClick={() => { setFormData(ev); setShowModal(true); }} style={A.iconBtn()}><i className="bx bx-edit-alt" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
              Menampilkan {events.length} dari {total} event
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                style={{ ...A.btnGhost, padding: '6px 12px', fontSize: 12, opacity: page === 1 ? 0.5 : 1 }}
              >
                <i className="bx bx-chevron-left" /> Prev
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                {page} <span style={{ color: '#94a3b8', fontWeight: 500 }}>/ {totalPages}</span>
              </div>
              <button 
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                style={{ ...A.btnGhost, padding: '6px 12px', fontSize: 12, opacity: page >= totalPages ? 0.5 : 1 }}
              >
                Next <i className="bx bx-chevron-right" />
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
