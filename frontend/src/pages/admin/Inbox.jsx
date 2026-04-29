import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { A, PageHeader, TablePanel, statusBadge, Modal, fmtDate } from '../../lib/adminStyles.jsx';
import toast from 'react-hot-toast';

export default function AdminInbox() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState(null);

  const load = () => {
    setLoading(true);
    fetchJson(`${ADMIN_API_BASE}/inbox`)
      .then(d => setMessages(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => toast.error('Gagal memuat pesan'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateStatus = (id, status) => {
    fetchJson(`${ADMIN_API_BASE}/inbox/update?id=${id}&status=${status}`, { method: 'POST' })
      .then(() => {
        load();
        if (selectedMsg && selectedMsg.id === id) {
          setSelectedMsg({ ...selectedMsg, status });
        }
      });
  };

  const deleteMsg = (id) => {
    if (!window.confirm('Hapus pesan ini?')) return;
    fetchJson(`${ADMIN_API_BASE}/inbox/delete?id=${id}`, { method: 'DELETE' })
      .then(() => {
        toast.success('Pesan terhapus');
        setSelectedMsg(null);
        load();
      });
  };

  const openMsg = (msg) => {
    setSelectedMsg(msg);
    if (msg.status === 'unread') {
      updateStatus(msg.id, 'read');
    }
  };

  return (
    <div style={A.page}>
      <PageHeader 
        title="Kotak Masuk" 
        subtitle="Manage customer inquiries and feedback from Contact Us page"
      />

      <TablePanel loading={loading}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...A.th, paddingLeft: 24 }}>Pengirim</th>
              <th style={A.th}>Subjek</th>
              <th style={A.th}>Tanggal</th>
              <th style={A.th}>Status</th>
              <th style={{ ...A.th, textAlign: 'right', paddingRight: 24 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {messages.map(m => (
              <tr key={m.id} style={{ cursor: 'pointer', background: m.status === 'unread' ? 'rgba(99,102,241,0.03)' : 'transparent' }} onClick={() => openMsg(m)}>
                <td style={{ ...A.td, paddingLeft: 24 }}>
                   <div style={{ fontWeight: 800, color: m.status === 'unread' ? '#6366f1' : '#0f172a' }}>{m.name}</div>
                   <div style={{ fontSize: 11, color: '#94a3b8' }}>{m.email}</div>
                </td>
                <td style={{ ...A.td, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                   {m.subject}
                </td>
                <td style={A.td}>{fmtDate(m.created_at)}</td>
                <td style={A.td}>
                   <span style={statusBadge(m.status === 'unread' ? 'pending' : (m.status === 'read' ? 'published' : 'shipped'))}>
                      {m.status === 'unread' ? 'Belum Dibaca' : (m.status === 'read' ? 'Sudah Dibaca' : 'Dibalas')}
                   </span>
                </td>
                <td style={{ ...A.td, textAlign: 'right', paddingRight: 24 }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => deleteMsg(m.id)} style={A.iconBtn('#ef4444', '#fef2f2')}><i className="bx bx-trash" /></button>
                </td>
              </tr>
            ))}
            {messages.length === 0 && !loading && (
              <tr>
                <td colSpan="5" style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8' }}>Belum ada pesan masuk.</td>
              </tr>
            )}
          </tbody>
        </table>
      </TablePanel>

      {selectedMsg && (
        <Modal title="Detail Pesan" onClose={() => setSelectedMsg(null)} wide>
           <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 20 }}>
                 <div style={{ width: 48, height: 48, borderRadius: 14, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#6366f1' }}>
                    <i className="bx bx-user" />
                 </div>
                 <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>{selectedMsg.name}</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{selectedMsg.email} • {fmtDate(selectedMsg.created_at)}</div>
                 </div>
              </div>

              <div>
                 <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Subjek</div>
                 <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{selectedMsg.subject}</div>
              </div>

              <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #f1f5f9' }}>
                 <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Pesan</div>
                 <div style={{ fontSize: 14, lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-wrap' }}>{selectedMsg.message}</div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                 <a href={`mailto:${selectedMsg.email}?subject=Re: ${selectedMsg.subject}`} onClick={() => updateStatus(selectedMsg.id, 'replied')} style={{ ...A.btnPrimary, flex: 1, justifyContent: 'center', textDecoration: 'none' }}>
                    <i className="bx bx-reply" /> Balas via Email
                 </a>
                 <button onClick={() => deleteMsg(selectedMsg.id)} style={{ ...A.btnGhost, color: '#ef4444' }}>
                    <i className="bx bx-trash" /> Hapus
                 </button>
              </div>
           </div>
        </Modal>
      )}
    </div>
  );
}
