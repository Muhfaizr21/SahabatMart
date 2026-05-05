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
  const [products, setProducts] = useState([]);
  
  // Dynamic Journey States
  const [programs, setPrograms] = useState([]);
  const [steps, setSteps] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [aiConfigs, setAiConfigs] = useState([]);
  const [journeyConfigs, setJourneyConfigs] = useState([]);
  const [configSubTab, setConfigSubTab] = useState('programs');
  
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

      // Load Config Data
      const [pg, st, rt, mp, ai] = await Promise.all([
        fetchJson(`${API_BASE}/api/admin/skin/programs`),
        fetchJson(`${API_BASE}/api/admin/skin/steps`),
        fetchJson(`${API_BASE}/api/admin/skin/routines`),
        fetchJson(`${API_BASE}/api/admin/skin/product-mappings`),
        fetchJson(`${API_BASE}/api/admin/skin/ai-configs`)
      ]);
      setPrograms(pg || []);
      setSteps(st || []);
      setRoutines(rt || []);
      setMappings(mp || []);
      setAiConfigs(ai || []);
      
      const sc = await fetchJson(`${API_BASE}/api/admin/configs?group=skin_journey`);
      setJourneyConfigs(sc.data || []);

      const prodRes = await fetchJson(`${API_BASE}/api/admin/products`);
      setProducts(prodRes.data || []);
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

  // Config Form States
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [newProgram, setNewProgram] = useState({ name: '', description: '', level: 1 });
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStep, setNewStep] = useState({ name: '', default_instruction: '' });
  const [showAddRoutine, setShowAddRoutine] = useState(false);
  const [newRoutine, setNewRoutine] = useState({ program_id: '', step_id: '', week: 1, time_of_day: 'am' });
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [newMapping, setNewMapping] = useState({ product_id: '', step_type: '', skin_type: '', skin_concern: '', priority: 0 });
  const [showAddPretest, setShowAddPretest] = useState(false);
  const [newPretest, setNewPretest] = useState({ user_id: '', full_name: '', skin_type: 'Oily', skin_problem: 'Acne', skin_goal: 'Clear skin' });
  const [selectedAI, setSelectedAI] = useState(null);
  const [showEditAI, setShowEditAI] = useState(false);

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

  const handleAddPretest = async () => {
    try {
      await fetchJson(`${API_BASE}/api/skin/pretest`, {
        method: 'POST',
        body: JSON.stringify(newPretest)
      });
      toast.success('Journey member berhasil didaftarkan!');
      setShowAddPretest(false);
      loadData();
    } catch (err) { toast.error('Gagal menambah journey member'); }
  };

  const handleSaveProgram = async () => {
    try {
      await fetchJson(`${API_BASE}/api/admin/skin/programs/save`, {
        method: 'POST',
        body: JSON.stringify(newProgram)
      });
      toast.success('Program berhasil disimpan!');
      setShowAddProgram(false);
      loadData();
    } catch (err) { toast.error('Gagal menyimpan program.'); }
  };

  const handleSaveStep = async () => {
    try {
      await fetchJson(`${API_BASE}/api/admin/skin/steps/save`, {
        method: 'POST',
        body: JSON.stringify(newStep)
      });
      toast.success('Step berhasil disimpan!');
      setShowAddStep(false);
      loadData();
    } catch (err) { toast.error('Gagal menyimpan step.'); }
  };

  const handleSaveRoutine = async () => {
    try {
      await fetchJson(`${API_BASE}/api/admin/skin/routines/save`, {
        method: 'POST',
        body: JSON.stringify(newRoutine)
      });
      toast.success('Routine berhasil disimpan!');
      setShowAddRoutine(false);
      loadData();
    } catch (err) { toast.error('Gagal menyimpan routine.'); }
  };

  const handleSaveMapping = async () => {
    try {
      await fetchJson(`${API_BASE}/api/admin/skin/product-mappings/save`, {
        method: 'POST',
        body: JSON.stringify(newMapping)
      });
      toast.success('Mapping berhasil disimpan!');
      setShowAddMapping(false);
      loadData();
    } catch (err) { toast.error('Gagal menyimpan mapping.'); }
  };

  const handleUpdateAI = async () => {
    try {
      await fetchJson(`${API_BASE}/api/admin/skin/ai-configs/update`, {
        method: 'POST',
        body: JSON.stringify(selectedAI)
      });
      toast.success('Konfigurasi AI berhasil diperbarui!');
      setShowEditAI(false);
      loadData();
    } catch (err) { toast.error('Gagal memperbarui AI.'); }
  };

  const handleSaveGeneralConfig = async () => {
    try {
      await fetchJson(`${API_BASE}/api/admin/configs/upsert`, {
        method: 'POST',
        body: JSON.stringify(journeyConfigs)
      });
      toast.success('Konfigurasi umum berhasil disimpan!');
      loadData();
    } catch (err) { toast.error('Gagal menyimpan konfigurasi.'); }
  };

  const handleDeleteProgram = async (id) => {
    if (!window.confirm('Hapus program ini? Semua routine terkait juga akan terpengaruh.')) return;
    try {
      await fetchJson(`${API_BASE}/api/admin/skin/programs/delete?id=${id}`, { method: 'DELETE' });
      toast.success('Program dihapus.');
      loadData();
    } catch (err) { toast.error('Gagal menghapus.'); }
  };

  const handleDeleteStep = async (id) => {
    if (!window.confirm('Hapus step ini?')) return;
    try {
      await fetchJson(`${API_BASE}/api/admin/skin/steps/delete?id=${id}`, { method: 'DELETE' });
      toast.success('Step dihapus.');
      loadData();
    } catch (err) { toast.error('Gagal menghapus.'); }
  };

  const handleDeleteRoutine = async (id) => {
    if (!window.confirm('Hapus langkah ini dari routine?')) return;
    try {
      await fetchJson(`${API_BASE}/api/admin/skin/routines/delete?id=${id}`, { method: 'DELETE' });
      toast.success('Langkah routine dihapus.');
      loadData();
    } catch (err) { toast.error('Gagal menghapus.'); }
  };

  const handleDeleteMapping = async (id) => {
    if (!window.confirm('Hapus mapping produk ini?')) return;
    try {
      await fetchJson(`${API_BASE}/api/admin/skin/product-mappings/delete?id=${id}`, { method: 'DELETE' });
      toast.success('Mapping dihapus.');
      loadData();
    } catch (err) { toast.error('Gagal menghapus.'); }
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
      { id: 'config', label: 'Journey Config', icon: 'bx-cog', count: programs.length },
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
          {activeTab === 'pretests' && (
            <button style={A.btnPrimary} onClick={() => setShowAddPretest(true)}>+ New Journey</button>
          )}
          {activeTab === 'education' && (
            <button style={A.btnPrimary} onClick={() => setShowAddEdu(true)}>+ New Article</button>
          )}
          {activeTab === 'groups' && (
            <button style={A.btnPrimary} onClick={() => setShowAddGroup(true)}>+ New Group</button>
          )}
          {activeTab === 'config' && (
            <div style={{ display: 'flex', gap: 8 }}>
              {configSubTab === 'programs' && <button style={A.btnPrimary} onClick={() => setShowAddProgram(true)}>+ New Program</button>}
              {configSubTab === 'steps' && <button style={A.btnPrimary} onClick={() => setShowAddStep(true)}>+ New Step</button>}
              {configSubTab === 'routines' && <button style={A.btnPrimary} onClick={() => setShowAddRoutine(true)}>+ New Routine</button>}
              {configSubTab === 'mappings' && <button style={A.btnPrimary} onClick={() => setShowAddMapping(true)}>+ New Mapping</button>}
            </div>
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

      {activeTab === 'config' && (
        <div style={A.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
              {[
                { id: 'programs', label: 'Programs' },
                { id: 'steps', label: 'Steps' },
                { id: 'routines', label: 'Routines' },
                { id: 'mappings', label: 'Product Mappings' },
                { id: 'ai', label: 'AI Prompt Config' },
                { id: 'general', label: 'General Settings' }
              ].map(s => (
                <button 
                  key={s.id} 
                  onClick={() => setConfigSubTab(s.id)}
                  style={{ 
                    ...A.btnGhost, 
                    background: configSubTab === s.id ? '#f1f5f9' : 'transparent',
                    color: configSubTab === s.id ? '#0f172a' : '#64748b',
                    fontSize: 12,
                    fontWeight: 800,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {configSubTab !== 'ai' && (
              <button 
                onClick={() => {
                  if (configSubTab === 'programs') setShowAddProgram(true);
                  if (configSubTab === 'steps') setShowAddStep(true);
                  if (configSubTab === 'routines') setShowAddRoutine(true);
                  if (configSubTab === 'mappings') setShowAddMapping(true);
                }}
                style={{ ...A.btnPrimary, padding: '8px 20px', borderRadius: 12, fontSize: 11 }}
              >
                + NEW {configSubTab.toUpperCase()}
              </button>
            )}
          </div>
          
          <TablePanel>
            <>
            {configSubTab === 'programs' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...A.th, paddingLeft: 24 }}>PROGRAM NAME</th>
                    <th style={A.th}>DESCRIPTION</th>
                    <th style={A.th}>LEVEL</th>
                    <th style={{ ...A.th, paddingRight: 24, textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...A.td, paddingLeft: 24 }}><strong>{p.name}</strong></td>
                      <td style={A.td}>{p.description}</td>
                      <td style={A.td}>{p.level}</td>
                      <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                         <button onClick={() => handleDeleteProgram(p.id)} style={{ color: '#ef4444', fontWeight: 800, fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}>DELETE</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {configSubTab === 'steps' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...A.th, paddingLeft: 24 }}>STEP NAME</th>
                    <th style={A.th}>DEFAULT INSTRUCTION</th>
                    <th style={{ ...A.th, paddingRight: 24, textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...A.td, paddingLeft: 24 }}><strong>{s.name}</strong></td>
                      <td style={A.td}>{s.default_instruction}</td>
                      <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                         <button onClick={() => handleDeleteStep(s.id)} style={{ color: '#ef4444', fontWeight: 800, fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}>DELETE</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {configSubTab === 'routines' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...A.th, paddingLeft: 24 }}>PROGRAM</th>
                    <th style={A.th}>STEP</th>
                    <th style={A.th}>WEEK</th>
                    <th style={A.th}>TIME</th>
                    <th style={{ ...A.th, paddingRight: 24, textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {routines.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...A.td, paddingLeft: 24 }}>{r.program?.name}</td>
                      <td style={A.td}>{r.step?.name}</td>
                      <td style={A.td}>Week {r.week}</td>
                      <td style={A.td}>{r.time_of_day}</td>
                      <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                         <button onClick={() => handleDeleteRoutine(r.id)} style={{ color: '#ef4444', fontWeight: 800, fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}>REMOVE</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {configSubTab === 'mappings' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...A.th, paddingLeft: 24 }}>PRODUCT</th>
                    <th style={A.th}>STEP TYPE</th>
                    <th style={A.th}>SKIN TYPE</th>
                    <th style={A.th}>PRIORITY</th>
                    <th style={{ ...A.th, paddingRight: 24, textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...A.td, paddingLeft: 24 }}>{m.product?.name}</td>
                      <td style={A.td}>{m.step_type}</td>
                      <td style={A.td}>{m.skin_type || 'All'}</td>
                      <td style={A.td}>{m.priority}</td>
                      <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                         <button onClick={() => handleDeleteMapping(m.id)} style={{ color: '#ef4444', fontWeight: 800, fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}>REMOVE</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {configSubTab === 'ai' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...A.th, paddingLeft: 24 }}>STAGE</th>
                    <th style={A.th}>PROMPT PREVIEW</th>
                    <th style={A.th}>TEMP</th>
                    <th style={{ ...A.th, paddingRight: 24, textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {aiConfigs.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...A.td, paddingLeft: 24 }}><strong>{c.stage}</strong></td>
                      <td style={A.td}><div style={{ maxWidth: 300, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.prompt_body}</div></td>
                      <td style={A.td}>{c.temperature}</td>
                      <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                         <button onClick={() => { setSelectedAI(c); setShowEditAI(true); }} style={{ color: '#6366f1', fontWeight: 800, fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}>EDIT PROMPT</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {configSubTab === 'general' && (
              <div style={{ padding: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <FieldLabel>Daily Affirmations (JSON Array)</FieldLabel>
                    <textarea 
                      style={{ ...A.input, height: 120, fontFamily: 'monospace', fontSize: 11 }} 
                      value={journeyConfigs.find(c => c.key === 'skin_journey_affirmations')?.value || '[]'} 
                      onChange={e => {
                        const newConfigs = [...journeyConfigs];
                        const idx = newConfigs.findIndex(c => c.key === 'skin_journey_affirmations');
                        if (idx !== -1) newConfigs[idx].value = e.target.value;
                        else newConfigs.push({ key: 'skin_journey_affirmations', value: e.target.value });
                        setJourneyConfigs(newConfigs);
                      }}
                    />
                    <p style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>Example: ["Stay strong", "You are beautiful"]</p>
                  </div>
                  <div>
                    <FieldLabel>Ritual 60-Detik Instruction</FieldLabel>
                    <textarea 
                      style={{ ...A.input, height: 120 }} 
                      value={journeyConfigs.find(c => c.key === 'skin_journey_ritual_instruction')?.value || ''} 
                      onChange={e => {
                        const newConfigs = [...journeyConfigs];
                        const idx = newConfigs.findIndex(c => c.key === 'skin_journey_ritual_instruction');
                        if (idx !== -1) newConfigs[idx].value = e.target.value;
                        else newConfigs.push({ key: 'skin_journey_ritual_instruction', value: e.target.value });
                        setJourneyConfigs(newConfigs);
                      }}
                    />
                  </div>
                  <div>
                    <FieldLabel>Day 25 Reward Voucher Code</FieldLabel>
                    <input 
                      style={A.input} 
                      value={journeyConfigs.find(c => c.key === 'skin_journey_voucher_code')?.value || ''} 
                      onChange={e => {
                        const newConfigs = [...journeyConfigs];
                        const idx = newConfigs.findIndex(c => c.key === 'skin_journey_voucher_code');
                        if (idx !== -1) newConfigs[idx].value = e.target.value;
                        else newConfigs.push({ key: 'skin_journey_voucher_code', value: e.target.value });
                        setJourneyConfigs(newConfigs);
                      }}
                    />
                  </div>
                  <div>
                    <FieldLabel>Day 25 Reward Message</FieldLabel>
                    <input 
                      style={A.input} 
                      value={journeyConfigs.find(c => c.key === 'skin_journey_voucher_message')?.value || ''} 
                      onChange={e => {
                        const newConfigs = [...journeyConfigs];
                        const idx = newConfigs.findIndex(c => c.key === 'skin_journey_voucher_message');
                        if (idx !== -1) newConfigs[idx].value = e.target.value;
                        else newConfigs.push({ key: 'skin_journey_voucher_message', value: e.target.value });
                        setJourneyConfigs(newConfigs);
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={handleSaveGeneralConfig}
                    style={{ ...A.btnPrimary, padding: '10px 32px' }}
                  >
                    SAVE GENERAL CONFIG
                  </button>
                </div>
              </div>
            )}
            </>
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

      {/* Journey Config Modals */}
      {showAddProgram && (
        <Modal title="Create New Skincare Program" onClose={() => setShowAddProgram(false)}>
          <div style={{ padding: 24 }}>
            <FieldLabel>Program Name</FieldLabel>
            <input style={A.input} placeholder="e.g. Essential Glow" value={newProgram.name} onChange={e => setNewProgram({...newProgram, name: e.target.value})} />
            <FieldLabel>Description</FieldLabel>
            <textarea style={{...A.input, height: 100}} placeholder="What is this program about?" value={newProgram.description} onChange={e => setNewProgram({...newProgram, description: e.target.value})} />
            <FieldLabel>Program Level</FieldLabel>
            <input type="number" style={A.input} value={newProgram.level} onChange={e => setNewProgram({...newProgram, level: parseInt(e.target.value)})} />
            <button onClick={handleSaveProgram} style={{...A.btnPrimary, width: '100%', marginTop: 20}}>Save Program</button>
          </div>
        </Modal>
      )}

      {showAddStep && (
        <Modal title="Define Journey Step" onClose={() => setShowAddStep(false)}>
          <div style={{ padding: 24 }}>
            <FieldLabel>Step Name</FieldLabel>
            <input style={A.input} placeholder="e.g. Double Cleansing" value={newStep.name} onChange={e => setNewStep({...newStep, name: e.target.value})} />
            <FieldLabel>Default Instruction</FieldLabel>
            <textarea style={{...A.input, height: 100}} placeholder="How should the user do this step?" value={newStep.default_instruction} onChange={e => setNewStep({...newStep, default_instruction: e.target.value})} />
            <button onClick={handleSaveStep} style={{...A.btnPrimary, width: '100%', marginTop: 20}}>Create Step</button>
          </div>
        </Modal>
      )}

      {showAddRoutine && (
        <Modal title="Add Step to Program" onClose={() => setShowAddRoutine(false)}>
          <div style={{ padding: 24 }}>
            <FieldLabel>Target Program</FieldLabel>
            <select style={A.input} value={newRoutine.program_id} onChange={e => setNewRoutine({...newRoutine, program_id: e.target.value})}>
              <option value="">Select Program</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <FieldLabel>Step to Add</FieldLabel>
            <select style={A.input} value={newRoutine.step_id} onChange={e => setNewRoutine({...newRoutine, step_id: e.target.value})}>
              <option value="">Select Step</option>
              {steps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <FieldLabel>Target Week</FieldLabel>
                <input type="number" style={A.input} value={newRoutine.week} onChange={e => setNewRoutine({...newRoutine, week: parseInt(e.target.value)})} />
              </div>
              <div>
                <FieldLabel>Time of Day</FieldLabel>
                <select style={A.input} value={newRoutine.time_of_day} onChange={e => setNewRoutine({...newRoutine, time_of_day: e.target.value})}>
                  <option value="am">AM (Morning)</option>
                  <option value="pm">PM (Night)</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
            <button onClick={handleSaveRoutine} style={{...A.btnPrimary, width: '100%', marginTop: 20}}>Add to Routine</button>
          </div>
        </Modal>
      )}

      {showAddMapping && (
        <Modal title="Product AI Mapping" onClose={() => setShowAddMapping(false)}>
          <div style={{ padding: 24 }}>
            <FieldLabel>Select Product</FieldLabel>
            <select style={A.input} value={newMapping.product_id} onChange={e => setNewMapping({...newMapping, product_id: e.target.value})}>
              <option value="">Choose Product</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <FieldLabel>Step Type (Internal ID)</FieldLabel>
            <input style={A.input} placeholder="e.g. Cleanser, Serum, etc." value={newMapping.step_type} onChange={e => setNewMapping({...newMapping, step_type: e.target.value})} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <FieldLabel>Skin Type</FieldLabel>
                <select style={A.input} value={newMapping.skin_type} onChange={e => setNewMapping({...newMapping, skin_type: e.target.value})}>
                  <option value="">All Types</option>
                  <option value="Oily">Oily</option>
                  <option value="Dry">Dry</option>
                  <option value="Sensitive">Sensitive</option>
                  <option value="Combination">Combination</option>
                </select>
              </div>
              <div>
                <FieldLabel>Skin Concern</FieldLabel>
                <select style={A.input} value={newMapping.skin_concern} onChange={e => setNewMapping({...newMapping, skin_concern: e.target.value})}>
                  <option value="">All Concerns</option>
                  <option value="Acne">Acne</option>
                  <option value="Dullness">Dullness</option>
                  <option value="Aging">Aging</option>
                  <option value="Redness">Redness</option>
                </select>
              </div>
            </div>
            <FieldLabel>Recommendation Priority (Higher = Preferred)</FieldLabel>
            <input type="number" style={A.input} value={newMapping.priority} onChange={e => setNewMapping({...newMapping, priority: parseInt(e.target.value)})} />
            <button onClick={handleSaveMapping} style={{...A.btnPrimary, width: '100%', marginTop: 20}}>Save Mapping</button>
          </div>
        </Modal>
      )}

      {showEditAI && selectedAI && (
        <Modal title={`Configure AI Stage: ${selectedAI.stage}`} onClose={() => setShowEditAI(false)}>
          <div style={{ padding: 24 }}>
            <FieldLabel>Prompt Template</FieldLabel>
            <textarea style={{...A.input, height: 250, fontFamily: 'monospace', fontSize: 12}} value={selectedAI.prompt_body} onChange={e => setSelectedAI({...selectedAI, prompt_body: e.target.value})} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <FieldLabel>Temperature</FieldLabel>
                <input type="number" step="0.1" style={A.input} value={selectedAI.temperature} onChange={e => setSelectedAI({...selectedAI, temperature: parseFloat(e.target.value)})} />
              </div>
              <div>
                <FieldLabel>Max Tokens</FieldLabel>
                <input type="number" style={A.input} value={selectedAI.max_tokens} onChange={e => setSelectedAI({...selectedAI, max_tokens: parseInt(e.target.value)})} />
              </div>
            </div>
            <button onClick={handleUpdateAI} style={{...A.btnPrimary, width: '100%', marginTop: 20}}>Update AI Configuration</button>
          </div>
        </Modal>
      )}
      {/* Modal Add Pretest */}
      {showAddPretest && (
        <Modal show={showAddPretest} onClose={() => setShowAddPretest(false)} title="Register New Journey Member">
          <div style={{ padding: '0 24px 24px' }}>
            <FieldLabel>User ID (UUID)</FieldLabel>
            <input style={A.input} value={newPretest.user_id} onChange={e => setNewPretest({...newPretest, user_id: e.target.value})} placeholder="e.g. 07032ac6-..." />
            
            <FieldLabel>Full Name</FieldLabel>
            <input style={A.input} value={newPretest.full_name} onChange={e => setNewPretest({...newPretest, full_name: e.target.value})} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <FieldLabel>Skin Type</FieldLabel>
                <select style={A.input} value={newPretest.skin_type} onChange={e => setNewPretest({...newPretest, skin_type: e.target.value})}>
                  <option>Oily</option><option>Dry</option><option>Sensitive</option><option>Combination</option><option>Normal</option>
                </select>
              </div>
              <div>
                <FieldLabel>Primary Problem</FieldLabel>
                <input style={A.input} value={newPretest.skin_problem} onChange={e => setNewPretest({...newPretest, skin_problem: e.target.value})} />
              </div>
            </div>
            
            <FieldLabel>Skin Goal</FieldLabel>
            <textarea style={{ ...A.input, height: 80 }} value={newPretest.skin_goal} onChange={e => setNewPretest({...newPretest, skin_goal: e.target.value})} />
            
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button style={{ ...A.btnGhost, flex: 1 }} onClick={() => setShowAddPretest(false)}>Cancel</button>
              <button style={{ ...A.btnPrimary, flex: 1 }} onClick={handleAddPretest}>Create Journey Record</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
