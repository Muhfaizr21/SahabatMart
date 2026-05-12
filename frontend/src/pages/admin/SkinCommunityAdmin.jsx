import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, TablePanel, A, Modal, FieldLabel } from '../../lib/adminStyles.jsx';

export default function SkinCommunityAdmin() {
  const [groups, setGroups] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');
  
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', icon: 'face' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [g, ap] = await Promise.all([
        fetchJson(`${API_BASE}/api/skin/community/groups`),
        fetchJson(`${API_BASE}/api/skin/community`)
      ]);
      setGroups(g || []);
      setAllPosts(ap || []);
    } catch (_err) {
      console.error("Admin Load Error:", _err);
      toast.error('Gagal memuat data komunitas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAddGroup = async () => {
    try {
      await fetchJson(`${API_BASE}/api/admin/skin/community/group`, {
        method: 'POST',
        body: JSON.stringify(newGroup)
      });
      toast.success('Grup Komunitas baru aktif!');
      setShowAddGroup(false);
      loadData();
    } catch (_err) { toast.error('Gagal membuat grup.'); }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm('Moderasi postingan ini (Hapus selamanya)?')) return;
    try {
      await fetchJson(`${API_BASE}/api/skin/community/post/delete?id=${id}`, { method: 'DELETE' });
      toast.success('Postingan berhasil dihapus dari feed.');
      loadData();
    } catch (_err) { toast.error('Gagal menghapus.'); }
  };

  const handleDeleteGroup = async (id) => {
    if (!window.confirm('Hapus grup ini?')) return;
    try {
      await fetchJson(`${API_BASE}/api/admin/skin/community/group/delete?id=${id}`, { method: 'DELETE' });
      toast.success('Grup dihapus.');
      loadData();
    } catch (_err) { toast.error('Gagal menghapus grup.'); }
  };

  if (loading) return <div style={{ padding: 100, textAlign: 'center', color: '#94a3b8' }}>Synchronizing community data...</div>;

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Skin Community Moderation" subtitle="Manage interest groups and moderate member feed.">
        <div style={{ display: 'flex', gap: 12 }}>
          {activeTab === 'groups' && (
            <button style={A.btnPrimary} onClick={() => setShowAddGroup(true)}>+ New Group</button>
          )}
          <button onClick={loadData} style={A.btnGhost}><i className="bx bx-refresh" /> Sync</button>
        </div>
      </PageHeader>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('feed')}
          style={{
            ...A.btnGhost,
            background: activeTab === 'feed' ? '#1e293b' : 'white',
            color: activeTab === 'feed' ? 'white' : '#64748b',
            padding: '10px 20px',
            borderRadius: 12,
            fontWeight: 800,
            border: '1px solid #e2e8f0',
          }}
        >
          <i className="bx bx-chat" style={{ marginRight: 8 }} /> Community Feed
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          style={{
            ...A.btnGhost,
            background: activeTab === 'groups' ? '#1e293b' : 'white',
            color: activeTab === 'groups' ? 'white' : '#64748b',
            padding: '10px 20px',
            borderRadius: 12,
            fontWeight: 800,
            border: '1px solid #e2e8f0',
          }}
        >
          <i className="bx bx-category" style={{ marginRight: 8 }} /> Interest Groups
        </button>
      </div>

      {activeTab === 'feed' && (
        <div style={A.card}>
          <TablePanel>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...A.th, paddingLeft: 24 }}>USER</th>
                  <th style={A.th}>CONTENT FEED</th>
                  <th style={A.th}>ENGAGEMENT</th>
                  <th style={{ ...A.th, paddingRight: 24, textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {allPosts.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Feed is empty.</td></tr>
                ) : allPosts.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ ...A.td, paddingLeft: 24 }}><strong>{p.user?.profile?.full_name || 'User'}</strong></td>
                    <td style={A.td}><div style={{ maxWidth: 500, fontSize: 13, lineHeight: 1.5 }}>{p.content}</div></td>
                    <td style={A.td}>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <span><i className="bx bxs-heart" style={{ color: '#ef4444' }} /> {p.likes || 0}</span>
                            <span><i className="bx bx-comment" /> {p.comments_count || 0}</span>
                        </div>
                    </td>
                    <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                      <button onClick={() => handleDeletePost(p.id)} style={{ padding: '6px 12px', borderRadius: 8, background: '#fee2e2', color: '#ef4444', border: 'none', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>MODERATE</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablePanel>
        </div>
      )}

      {activeTab === 'groups' && (
        <div style={A.card}>
          <TablePanel>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...A.th, paddingLeft: 24 }}>GROUP NAME</th>
                  <th style={A.th}>DESCRIPTION</th>
                  <th style={A.th}>ICON</th>
                  <th style={{ ...A.th, paddingRight: 24, textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>No interest groups yet.</td></tr>
                ) : groups.map((g, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ ...A.td, paddingLeft: 24 }}><strong>{g.name}</strong></td>
                    <td style={A.td}><div style={{ maxWidth: 400, fontSize: 12, color: '#64748b' }}>{g.description}</div></td>
                    <td style={A.td}><i className={`bx bx-${g.icon || 'face'}`} style={{ fontSize: 20 }} /></td>
                    <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                      <button onClick={() => handleDeleteGroup(g.id)} style={{ ...A.btnGhost, color: '#ef4444' }}>DELETE</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablePanel>
        </div>
      )}

      {showAddGroup && (
        <Modal title="Create Interest Group" onClose={() => setShowAddGroup(false)}>
          <div style={{ padding: '0 24px 24px' }}>
            <FieldLabel>Group Name</FieldLabel>
            <input style={A.input} placeholder="e.g. Acne Fighters" value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} />
            <FieldLabel>Description</FieldLabel>
            <textarea style={{ ...A.input, height: 80 }} placeholder="What is this group about?" value={newGroup.description} onChange={e => setNewGroup({...newGroup, description: e.target.value})} />
            <FieldLabel>Icon (Boxicons Name)</FieldLabel>
            <input style={A.input} placeholder="e.g. face, spa, heart" value={newGroup.icon} onChange={e => setNewGroup({...newGroup, icon: e.target.value})} />
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button style={{ ...A.btnGhost, flex: 1 }} onClick={() => setShowAddGroup(false)}>Cancel</button>
              <button style={{ ...A.btnPrimary, flex: 1 }} onClick={handleAddGroup}>Create Group</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
