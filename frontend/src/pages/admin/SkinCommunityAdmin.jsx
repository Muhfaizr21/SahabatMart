import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { API_BASE, fetchJson } from '../../lib/api';
import { PageHeader, TablePanel, A, Modal, FieldLabel } from '../../lib/adminStyles.jsx';

import AdminSelect from '../../components/admin/AdminSelect';

export default function SkinCommunityAdmin() {
  const [groups, setGroups] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');
  
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', icon: 'face' });

  // Advanced States
  const [feedSearch, setFeedSearch] = useState('');
  const [feedSort, setFeedSort] = useState('newest'); // newest, oldest, likes_desc, comments_desc
  const [feedGroupFilter, setFeedGroupFilter] = useState('');
  const [feedPage, setFeedPage] = useState(1);
  const feedPerPage = 8;

  const [groupSearch, setGroupSearch] = useState('');
  const [groupSort, setGroupSort] = useState('name_asc'); // name_asc, name_desc, desc_length
  const [groupPage, setGroupPage] = useState(1);
  const groupPerPage = 8;

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

  // Reset pagination when filter/search/sort change
  useEffect(() => { setFeedPage(1); }, [feedSearch, feedSort, feedGroupFilter]);
  useEffect(() => { setGroupPage(1); }, [groupSearch, groupSort]);

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

  // ── FEED FILTER & SORT & PAGINATION ──
  const processedPosts = useMemo(() => {
    let result = [...allPosts];

    // Search Filter (User name, content)
    if (feedSearch.trim()) {
      const q = feedSearch.toLowerCase();
      result = result.filter(p => 
        (p.user?.profile?.full_name || '').toLowerCase().includes(q) ||
        (p.content || '').toLowerCase().includes(q)
      );
    }

    // Group Filter
    if (feedGroupFilter) {
      result = result.filter(p => p.group_id === parseInt(feedGroupFilter));
    }

    // Sort Logic
    result.sort((a, b) => {
      if (feedSort === 'newest') return b.id - a.id;
      if (feedSort === 'oldest') return a.id - b.id;
      if (feedSort === 'likes_desc') return (b.likes || 0) - (a.likes || 0);
      if (feedSort === 'comments_desc') return (b.comments_count || 0) - (a.comments_count || 0);
      return 0;
    });

    return result;
  }, [allPosts, feedSearch, feedSort, feedGroupFilter]);

  const paginatedPosts = useMemo(() => {
    const start = (feedPage - 1) * feedPerPage;
    return processedPosts.slice(start, start + feedPerPage);
  }, [processedPosts, feedPage]);

  const totalFeedPages = Math.ceil(processedPosts.length / feedPerPage) || 1;

  // ── GROUPS FILTER & SORT & PAGINATION ──
  const processedGroups = useMemo(() => {
    let result = [...groups];

    // Search Filter (Name, description)
    if (groupSearch.trim()) {
      const q = groupSearch.toLowerCase();
      result = result.filter(g => 
        (g.name || '').toLowerCase().includes(q) ||
        (g.description || '').toLowerCase().includes(q)
      );
    }

    // Sort Logic
    result.sort((a, b) => {
      if (groupSort === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (groupSort === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      if (groupSort === 'desc_length') return (b.description || '').length - (a.description || '').length;
      return 0;
    });

    return result;
  }, [groups, groupSearch, groupSort]);

  const paginatedGroups = useMemo(() => {
    const start = (groupPage - 1) * groupPerPage;
    return processedGroups.slice(start, start + groupPerPage);
  }, [processedGroups, groupPage]);

  const totalGroupPages = Math.ceil(processedGroups.length / groupPerPage) || 1;

  if (loading) return <div style={{ padding: 100, textAlign: 'center', color: '#94a3b8' }}>Synchronizing community data...</div>;

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Skin Community Moderation" subtitle="Manage interest groups and moderate member feed.">
        <div style={{ display: 'flex', gap: 12 }}>
          {activeTab === 'groups' && (
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" onClick={() => setShowAddGroup(true)}>+ New Group</button>
          )}
          <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm"><i className="bx bx-refresh" /> Sync</button>
        </div>
      </PageHeader>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('feed')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" style={{ background: activeTab === 'feed' ? '#1e293b' : 'white',
            color: activeTab === 'feed' ? 'white' : '#64748b',
            padding: '10px 20px',
            borderRadius: 12,
            fontWeight: 800,
            border: '1px solid #e2e8f0', }}
        >
          <i className="bx bx-chat" style={{ marginRight: 8 }} /> Community Feed ({allPosts.length})
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" style={{ background: activeTab === 'groups' ? '#1e293b' : 'white',
            color: activeTab === 'groups' ? 'white' : '#64748b',
            padding: '10px 20px',
            borderRadius: 12,
            fontWeight: 800,
            border: '1px solid #e2e8f0', }}
        >
          <i className="bx bx-category" style={{ marginRight: 8 }} /> Interest Groups ({groups.length})
        </button>
      </div>

      {activeTab === 'feed' && (
        <>
          {/* Controls Panel */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div style={{ ...A.searchWrap, flex: 1, minWidth: 260 }}>
              <i className="bx bx-search" style={A.searchIcon} />
              <input 
                type="text" 
                placeholder="Cari postingan atau nama user..." 
                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-indigo-400 transition-all w-full" style={{ width: '100%' }}
                value={feedSearch}
                onChange={e => setFeedSearch(e.target.value)}
              />
            </div>
            
            <AdminSelect 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" style={{ minWidth: 160 }}
              value={feedGroupFilter}
              onChange={e => setFeedGroupFilter(e.target.value)}
            >
              <option value="">Semua Grup</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </AdminSelect>

            <AdminSelect 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" style={{ minWidth: 160 }}
              value={feedSort}
              onChange={e => setFeedSort(e.target.value)}
            >
              <option value="newest">Terbaru (ID Desc)</option>
              <option value="oldest">Terlama (ID Asc)</option>
              <option value="likes_desc">Likes Terbanyak</option>
              <option value="comments_desc">Komentar Terbanyak</option>
            </AdminSelect>
          </div>

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
                  {paginatedPosts.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Tidak ada feed postingan yang cocok.</td></tr>
                  ) : paginatedPosts.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...A.td, paddingLeft: 24 }}>
                        <strong>{p.user?.profile?.full_name || 'User'}</strong>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{p.group?.name || 'Umum'}</div>
                      </td>
                      <td style={A.td}><div style={{ maxWidth: 500, fontSize: 13, lineHeight: 1.5 }}>{p.content}</div></td>
                      <td style={A.td}>
                          <div style={{ display: 'flex', gap: 12 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><i className="bx bxs-heart" style={{ color: '#ef4444' }} /> {p.likes || 0}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><i className="bx bx-comment" /> {p.comments_count || 0}</span>
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

          {/* Pagination Controls */}
          {processedPosts.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                Showing <strong>{((feedPage - 1) * feedPerPage) + 1}</strong> to <strong>{Math.min(feedPage * feedPerPage, processedPosts.length)}</strong> of <strong>{processedPosts.length}</strong> posts
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" 
                  disabled={feedPage === 1} 
                  onClick={() => setFeedPage(p => Math.max(1, p - 1))}
                >
                  <i className="bx bx-chevron-left" /> Prev
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                  Page {feedPage} of {totalFeedPages}
                </div>
                <button 
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" 
                  disabled={feedPage === totalFeedPages} 
                  onClick={() => setFeedPage(p => Math.min(totalFeedPages, p + 1))}
                >
                  Next <i className="bx bx-chevron-right" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'groups' && (
        <>
          {/* Controls Panel */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div style={{ ...A.searchWrap, flex: 1, minWidth: 260 }}>
              <i className="bx bx-search" style={A.searchIcon} />
              <input 
                type="text" 
                placeholder="Cari grup interest..." 
                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-indigo-400 transition-all w-full" style={{ width: '100%' }}
                value={groupSearch}
                onChange={e => setGroupSearch(e.target.value)}
              />
            </div>

            <AdminSelect 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" style={{ minWidth: 180 }}
              value={groupSort}
              onChange={e => setGroupSort(e.target.value)}
            >
              <option value="name_asc">Nama (A-Z)</option>
              <option value="name_desc">Nama (Z-A)</option>
              <option value="desc_length">Deskripsi Terpanjang</option>
            </AdminSelect>
          </div>

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
                  {paginatedGroups.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Grup interest tidak ditemukan.</td></tr>
                  ) : paginatedGroups.map((g, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...A.td, paddingLeft: 24 }}><strong>{g.name}</strong></td>
                      <td style={A.td}><div style={{ maxWidth: 400, fontSize: 12, color: '#64748b' }}>{g.description}</div></td>
                      <td style={A.td}><i className={`bx bx-${g.icon || 'face'}`} style={{ fontSize: 20 }} /></td>
                      <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                        <button onClick={() => handleDeleteGroup(g.id)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" style={{ color: '#ef4444' }}>DELETE</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TablePanel>
          </div>

          {/* Pagination Controls */}
          {processedGroups.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                Showing <strong>{((groupPage - 1) * groupPerPage) + 1}</strong> to <strong>{Math.min(groupPage * groupPerPage, processedGroups.length)}</strong> of <strong>{processedGroups.length}</strong> groups
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" 
                  disabled={groupPage === 1} 
                  onClick={() => setGroupPage(p => Math.max(1, p - 1))}
                >
                  <i className="bx bx-chevron-left" /> Prev
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                  Page {groupPage} of {totalGroupPages}
                </div>
                <button 
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" 
                  disabled={groupPage === totalGroupPages} 
                  onClick={() => setGroupPage(p => Math.min(totalGroupPages, p + 1))}
                >
                  Next <i className="bx bx-chevron-right" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showAddGroup && (
        <Modal title="Create Interest Group" onClose={() => setShowAddGroup(false)}>
          <div style={{ padding: '0 24px 24px' }}>
            <FieldLabel>Group Name</FieldLabel>
            <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" placeholder="e.g. Acne Fighters" value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} />
            <FieldLabel>Description</FieldLabel>
            <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" style={{ height: 80 }} placeholder="What is this group about?" value={newGroup.description} onChange={e => setNewGroup({...newGroup, description: e.target.value})} />
            <FieldLabel>Icon (Boxicons Name)</FieldLabel>
            <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400" placeholder="e.g. face, spa, heart" value={newGroup.icon} onChange={e => setNewGroup({...newGroup, icon: e.target.value})} />
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm" style={{ flex: 1 }} onClick={() => setShowAddGroup(false)}>Cancel</button>
              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm" style={{ flex: 1 }} onClick={handleAddGroup}>Create Group</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
