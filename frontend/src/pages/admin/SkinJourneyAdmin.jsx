import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { API_BASE, fetchJson, formatImage } from '../../lib/api';
import { PageHeader, TablePanel, A, idr, statusBadge, Modal, FieldLabel } from '../../lib/adminStyles.jsx';

export default function SkinJourneyAdmin() {
  const [pretests, setPretests] = useState([]);
  const [journals, setJournals] = useState([]);
  const [progress, setProgress] = useState([]);
  const [educations, setEducations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pretests');
  
  // Filtering, Selection & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [skinTypeFilter, setSkinTypeFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, j, pr, e, g, ap] = await Promise.all([
        fetchJson(`${API_BASE}/api/admin/skin/pretests`),
        fetchJson(`${API_BASE}/api/admin/skin/journals`),
        fetchJson(`${API_BASE}/api/admin/skin/progress`),
        fetchJson(`${API_BASE}/api/admin/skin/education`),
        fetchJson(`${API_BASE}/api/skin/community/groups`),
        fetchJson(`${API_BASE}/api/skin/community`)
      ]);
      setPretests(p || []);
      setJournals(j || []);
      setProgress(pr || []);
      setEducations(e || []);
      setGroups(g || []);
      setAllPosts(ap || []);
    } catch (err) {
      console.error("Admin Load Error:", err);
      toast.error('Gagal memuat data monitoring');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Filtered Data
  const filteredPretests = useMemo(() => {
    const filtered = pretests.filter(p => {
      const matchSearch = p.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSkin = !skinTypeFilter || p.skin_type === skinTypeFilter;
      return matchSearch && matchSkin;
    });
    // Reset to page 1 when filter changes
    return filtered;
  }, [pretests, searchTerm, skinTypeFilter]);

  // Paginated Data
  const paginatedPretests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPretests.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPretests, currentPage]);

  const totalPages = Math.ceil(filteredPretests.length / itemsPerPage);

  // Effect to reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, skinTypeFilter]);

  // Form states
  const [showAddEdu, setShowAddEdu] = useState(false);
  const [newEdu, setNewEdu] = useState({ title: '', content_type: 'article', content: '', media_url: '', day_target: 1 });
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', icon: 'face' });

  // Stats Calculations
  const stats = useMemo(() => ({
    total: pretests.length,
    oily: pretests.filter(p => p.skin_type === 'Oily').length,
    dry: pretests.filter(p => p.skin_type === 'Dry').length,
    sensitive: pretests.filter(p => p.skin_type === 'Sensitive').length,
    avgScore: progress.length > 0 ? (progress.reduce((acc, curr) => acc + curr.skin_score, 0) / progress.length).toFixed(1) : 0
  }), [pretests, progress]);

  const handleAddEdu = async () => {
    try {
      await fetchJson(`${API_BASE}/api/admin/skin/education/create`, {
        method: 'POST',
        body: JSON.stringify(newEdu)
      });
      toast.success('Materi edukasi berhasil diterbitkan!');
      setShowAddEdu(false);
      loadData();
    } catch (err) { toast.error('Gagal menyimpan materi.'); }
  };

  const handleAddGroup = async () => {
    try {
      await fetchJson(`${API_BASE}/api/admin/skin/community/group`, {
        method: 'POST',
        body: JSON.stringify(newGroup)
      });
      toast.success('Grup Komunitas baru aktif!');
      setShowAddGroup(false);
      loadData();
    } catch (err) { toast.error('Gagal membuat grup.'); }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm('Moderasi postingan ini (Hapus selamanya)?')) return;
    try {
      await fetchJson(`${API_BASE}/api/skin/community/post/delete?id=${id}`, { method: 'DELETE' });
      toast.success('Postingan berhasil dihapus dari feed.');
      loadData();
    } catch (err) { toast.error('Gagal menghapus.'); }
  };

  const renderMemberModal = () => {
    if (!selectedUser) return null;
    const userJournals = journals.filter(j => j.user_id === selectedUser.user_id).sort((a,b) => b.day_number - a.day_number);
    const userProgress = progress.filter(p => p.user_id === selectedUser.user_id).sort((a,b) => b.week_number - a.week_number);

    return (
      <Modal title={`Skin Journey Profile: ${selectedUser.full_name}`} onClose={() => setSelectedUser(null)}>
        <div style={{ padding: '0 24px 24px', maxHeight: '80vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Skin Type</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#6366f1' }}>{selectedUser.skin_type}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Primary Concern</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{selectedUser.skin_problem}</div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bx bx-trending-up" /> Weekly Progress Logs
            </h4>
            {userProgress.length === 0 ? <p style={{ fontSize: 12, color: '#94a3b8' }}>Belum ada log progres mingguan.</p> : userProgress.map((p, i) => (
              <div key={i} style={{ padding: 12, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>Week {p.week_number}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{new Date(p.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ background: '#ecfdf5', color: '#10b981', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>Score: {p.skin_score}/10</span>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>Redness: {p.redness_score}% | Acne: {p.acne_count}</div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bx bx-book-open" /> Daily Journals
            </h4>
            {userJournals.length === 0 ? <p style={{ fontSize: 12, color: '#94a3b8' }}>Belum ada catatan jurnal harian.</p> : userJournals.map((j, i) => (
              <div key={i} style={{ padding: 12, background: '#f8fafc', borderRadius: 10, marginBottom: 8, border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#6366f1' }}>DAY {j.day_number}</span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(j.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{j.content}</div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    );
  };

  const renderTabs = () => {
    const tabs = [
      { id: 'pretests', label: 'Members', icon: 'bx-group', count: pretests.length },
      { id: 'education', label: 'Education', icon: 'bx-book-content', count: educations.length },
      { id: 'community', label: 'Community Feed', icon: 'bx-chat', count: allPosts.length },
      { id: 'groups', label: 'Interest Groups', icon: 'bx-category', count: groups.length },
    ];

    return (
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 8 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...A.btnGhost,
              background: activeTab === tab.id ? '#1e293b' : 'white',
              color: activeTab === tab.id ? 'white' : '#64748b',
              padding: '10px 20px',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid #e2e8f0',
              fontWeight: 800,
              fontSize: 13,
              whiteSpace: 'nowrap'
            }}
          >
            <i className={`bx ${tab.icon}`} style={{ fontSize: 18 }} />
            {tab.label}
            <span style={{ opacity: 0.6, fontSize: 11 }}>({tab.count})</span>
          </button>
        ))}
      </div>
    );
  };

  if (loading) return <div style={{ padding: 100, textAlign: 'center', color: '#94a3b8' }}>Synchronizing journey data...</div>;

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Skin Journey Intelligence" subtitle="Advanced monitoring for member progress and community health.">
        <div style={{ display: 'flex', gap: 12 }}>
          {activeTab === 'education' && (
            <button style={A.btnPrimary} onClick={() => setShowAddEdu(true)}>+ New Article</button>
          )}
          {activeTab === 'groups' && (
            <button style={A.btnPrimary} onClick={() => setShowAddGroup(true)}>+ New Group</button>
          )}
          <button onClick={loadData} style={A.btnGhost}><i className="bx bx-refresh" /> Sync</button>
        </div>
      </PageHeader>

      {/* Analytics Bento Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Journeyers', val: stats.total, icon: 'bx-user', color: '#6366f1' },
          { label: 'Oily Skin Group', val: stats.oily, icon: 'bx-droplet', color: '#f59e0b' },
          { label: 'Sensitive Skin', val: stats.sensitive, icon: 'bx-shield-plus', color: '#ef4444' },
          { label: 'Avg Health Score', val: `${stats.avgScore}/10`, icon: 'bx-heart', color: '#10b981' },
        ].map((s, i) => (
          <div key={i} style={{ ...A.card, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={`bx ${s.icon}`} style={{ fontSize: 24, color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {renderTabs()}

      {activeTab === 'pretests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...A.card, padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 300, position: 'relative' }}>
              <i className="bx bx-search" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                style={{ ...A.input, paddingLeft: 44 }} 
                placeholder="Search member by name..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select style={{ ...A.input, width: 200 }} value={skinTypeFilter} onChange={e => setSkinTypeFilter(e.target.value)}>
              <option value="">All Skin Types</option>
              <option value="Oily">Oily</option>
              <option value="Dry">Dry</option>
              <option value="Sensitive">Sensitive</option>
              <option value="Combination">Combination</option>
            </select>
          </div>

          <div style={A.card}>
            <TablePanel>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...A.th, paddingLeft: 24 }}>MEMBER DETAIL</th>
                    <th style={A.th}>SKIN PROFILE</th>
                    <th style={A.th}>PRIMARY PROBLEM</th>
                    <th style={A.th}>STARTED AT</th>
                    <th style={{ ...A.th, paddingRight: 24, textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPretests.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>No members found matching filters.</td></tr>
                  ) : paginatedPretests.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...A.td, paddingLeft: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#6366f1' }}>
                            {p.full_name?.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{p.full_name}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.user_id.substring(0,8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td style={A.td}>
                        <span style={{ padding: '4px 10px', borderRadius: 8, background: '#eef2ff', color: '#4f46e5', fontSize: 11, fontWeight: 800 }}>{p.skin_type}</span>
                      </td>
                      <td style={A.td}>{p.skin_problem}</td>
                      <td style={A.td}>{new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                        <button style={A.btnGhost} onClick={() => setSelectedUser(p)}>
                          <i className="bx bx-right-arrow-alt" style={{ fontSize: 20 }} /> View Journey
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TablePanel>

            {/* Pagination UI */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                  Showing <span style={{ color: '#0f172a' }}>{(currentPage-1)*itemsPerPage + 1}</span> to <span style={{ color: '#0f172a' }}>{Math.min(currentPage*itemsPerPage, filteredPretests.length)}</span> of <span style={{ color: '#0f172a' }}>{filteredPretests.length}</span> members
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    style={{ ...A.btnGhost, padding: '6px 12px', fontSize: 12, opacity: currentPage === 1 ? 0.5 : 1 }}
                  >
                    Previous
                  </button>
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    // Show only first, last, and pages near current
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button 
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          style={{ 
                            ...A.btnGhost, 
                            padding: '6px 12px', 
                            fontSize: 12, 
                            background: currentPage === page ? '#1e293b' : 'transparent',
                            color: currentPage === page ? 'white' : '#64748b',
                            borderColor: currentPage === page ? '#1e293b' : '#e2e8f0'
                          }}
                        >
                          {page}
                        </button>
                      );
                    }
                    if (page === currentPage - 2 || page === currentPage + 2) return <span key={page} style={{ padding: '6px 4px', color: '#94a3b8' }}>...</span>;
                    return null;
                  })}
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    style={{ ...A.btnGhost, padding: '6px 12px', fontSize: 12, opacity: currentPage === totalPages ? 0.5 : 1 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal View Detail Journey */}
      {renderMemberModal()}

      {/* Moderation & Material Management (Education, Community, Groups) */}
      {activeTab === 'education' && (
        <div style={A.card}>
          <TablePanel>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...A.th, paddingLeft: 24 }}>DAY</th>
                  <th style={A.th}>ARTICLE TITLE</th>
                  <th style={A.th}>TYPE</th>
                  <th style={{ ...A.th, paddingRight: 24, textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {educations.map((e, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ ...A.td, paddingLeft: 24 }}><span style={{ fontWeight: 800, color: '#6366f1' }}>HARI {e.day_target}</span></td>
                    <td style={A.td}>{e.title}</td>
                    <td style={A.td}><span style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 800, color: '#64748b' }}>{e.content_type}</span></td>
                    <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                      <button onClick={() => {
                        if(window.confirm('Hapus materi edukasi ini?')) {
                          fetchJson(`${API_BASE}/api/admin/skin/education/delete?id=${e.id}`, { method: 'DELETE' }).then(() => loadData());
                        }
                      }} style={{ color: '#ef4444', fontWeight: 800, fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>REMOVE</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablePanel>
        </div>
      )}

      {activeTab === 'community' && (
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
                {allPosts.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ ...A.td, paddingLeft: 24 }}><strong>{p.user?.profile?.full_name || 'User'}</strong></td>
                    <td style={A.td}><div style={{ maxWidth: 400, fontSize: 12 }}>{p.content}</div></td>
                    <td style={A.td}><span style={{ fontWeight: 800 }}><i className="bx bxs-heart" style={{ color: '#ef4444' }} /> {p.likes}</span></td>
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
                  <th style={{ ...A.th, paddingRight: 24, textAlign: 'right' }}>CREATED AT</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ ...A.td, paddingLeft: 24 }}><strong>{g.name}</strong></td>
                    <td style={A.td}>{g.description}</td>
                    <td style={A.td}><i className={`bx bx-${g.icon}`} style={{ fontSize: 20 }} /></td>
                    <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>{new Date(g.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablePanel>
        </div>
      )}

      {/* Forms Modals */}
      {showAddGroup && (
        <Modal title="Create Interest Group" onClose={() => setShowAddGroup(false)}>
          <div style={{ padding: '0 24px 24px' }}>
            <FieldLabel>Group Name</FieldLabel>
            <input style={A.input} placeholder="e.g. Acne Fighters" value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} />
            <FieldLabel>Description</FieldLabel>
            <textarea style={{ ...A.input, height: 80 }} placeholder="What is this group about?" value={newGroup.description} onChange={e => setNewGroup({...newGroup, description: e.target.value})} />
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button style={{ ...A.btnGhost, flex: 1 }} onClick={() => setShowAddGroup(false)}>Cancel</button>
              <button style={{ ...A.btnPrimary, flex: 1 }} onClick={handleAddGroup}>Create Group</button>
            </div>
          </div>
        </Modal>
      )}

      {showAddEdu && (
        <Modal title="Publish New Article" onClose={() => setShowAddEdu(false)}>
          <div style={{ padding: '0 24px 24px' }}>
            <FieldLabel>Article Title</FieldLabel>
            <input style={A.input} value={newEdu.title} onChange={e => setNewEdu({...newEdu, title: e.target.value})} />
            <FieldLabel>Day Target (Milestone)</FieldLabel>
            <input type="number" style={A.input} value={newEdu.day_target} onChange={e => setNewEdu({...newEdu, day_target: parseInt(e.target.value)})} />
            <FieldLabel>Content Markdown</FieldLabel>
            <textarea style={{ ...A.input, height: 120 }} value={newEdu.content} onChange={e => setNewEdu({...newEdu, content: e.target.value})} />
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button style={{ ...A.btnGhost, flex: 1 }} onClick={() => setShowAddEdu(false)}>Cancel</button>
              <button style={{ ...A.btnPrimary, flex: 1 }} onClick={handleAddEdu}>Publish Article</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
