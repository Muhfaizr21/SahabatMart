import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { API_BASE, fetchJson, formatImage } from '../../lib/api';
import { PageHeader, TablePanel, A, idr, statusBadge, Modal, FieldLabel } from '../../lib/adminStyles.jsx';

export default function SkinJourneyAdmin() {
  const [pretests, setPretests] = useState([]);
  const [journals, setJournals] = useState([]);
  const [progress, setProgress] = useState([]);
  const [histories, setHistories] = useState([]);
  const [educations, setEducations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pretests');
  const [products, setProducts] = useState([]);
  
  // 4-Flow Admin Architecture States
  const [activeProgram, setActiveProgram] = useState(null);
  const [wizardStep, setWizardStep] = useState(0); // 0: List, 1: Basic, 2: Details, 3: Products, 4: Instructions
  
  // Flow Data States
  const [progData, setProgData] = useState({
    name: '', slug: '', category: 'Acne Treatment', target_skin_type: [], target_concerns: [], 
    duration_weeks: 4, expected_outcome: '', ai_score_focus: [], status: 'draft', level: 1
  });
  const [phaseData, setPhaseData] = useState([]);
  const [benefitData, setBenefitData] = useState([]);
  const [warningData, setWarningData] = useState([]);
  const [faqData, setFaqData] = useState([]);
  const [productStepData, setProductStepData] = useState([]);

  // Dynamic Journey States (Legacy Support/Monitoring)
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
      const [p, j, pr, e, g, ap, hp] = await Promise.all([
        fetchJson(`${API_BASE}/api/admin/skin/pretests`),
        fetchJson(`${API_BASE}/api/admin/skin/journals`),
        fetchJson(`${API_BASE}/api/admin/skin/progress`),
        fetchJson(`${API_BASE}/api/admin/skin/education`),
        fetchJson(`${API_BASE}/api/skin/community/groups`),
        fetchJson(`${API_BASE}/api/skin/community`),
        fetchJson(`${API_BASE}/api/admin/skin/histories`)
      ]);
      setPretests(p || []);
      setJournals(j || []);
      setProgress(pr || []);
      setEducations(e || []);
      setGroups(g || []);
      setAllPosts(ap || []);
      setHistories(hp || []);

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
      setJourneyConfigs(sc || []);

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

  // --- 4-FLOW ADMIN HANDLERS ---
  
  const handleEditProgramFlow = async (p) => {
    try {
      setLoading(true);
      const detail = await fetchJson(`${API_BASE}/api/admin/skin/programs/detail?id=${p.id}`);
      setActiveProgram(detail);
      setProgData({
        ...detail,
        target_skin_type: (detail.target_skin_type && detail.target_skin_type.startsWith('[')) ? JSON.parse(detail.target_skin_type) : [],
        target_concerns: (detail.target_concerns && detail.target_concerns.startsWith('[')) ? JSON.parse(detail.target_concerns) : [],
        ai_score_focus: (detail.ai_score_focus && detail.ai_score_focus.startsWith('{')) ? JSON.parse(detail.ai_score_focus) : [],
      });
      setPhaseData(detail.phases || []);
      setBenefitData(detail.benefits || []);
      setWarningData(detail.warnings || []);
      setFaqData(detail.faqs || []);
      setProductStepData(detail.product_steps || []);
      setWizardStep(1);
    } catch (err) {
      toast.error("Gagal memuat detail program");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFlow1 = async () => {
    try {
      const payload = {
        ...progData,
        target_skin_type: JSON.stringify(progData.target_skin_type),
        target_concerns: JSON.stringify(progData.target_concerns),
        ai_score_focus: JSON.stringify(progData.ai_score_focus),
      };
      const res = await fetchJson(`${API_BASE}/api/admin/skin/programs/save`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setActiveProgram(res);
      toast.success("Flow 1: Program Initiation Saved!");
      setWizardStep(2);
      loadData();
    } catch (err) { toast.error("Gagal simpan Flow 1"); }
  };

  const handleSaveFlow2 = async () => {
    try {
      // Save all related details (Phases, Benefits, etc.)
      const promises = [
        ...phaseData.map(item => fetchJson(`${API_BASE}/api/admin/skin/programs/phases/save`, { method: 'POST', body: JSON.stringify({...item, program_id: activeProgram.id}) })),
        ...benefitData.map(item => fetchJson(`${API_BASE}/api/admin/skin/programs/benefits/save`, { method: 'POST', body: JSON.stringify({...item, program_id: activeProgram.id}) })),
        ...warningData.map(item => fetchJson(`${API_BASE}/api/admin/skin/programs/warnings/save`, { method: 'POST', body: JSON.stringify({...item, program_id: activeProgram.id}) })),
        ...faqData.map(item => fetchJson(`${API_BASE}/api/admin/skin/programs/faqs/save`, { method: 'POST', body: JSON.stringify({...item, program_id: activeProgram.id}) })),
      ];
      await Promise.all(promises);
      toast.success("Flow 2: Detailed Descriptions Saved!");
      setWizardStep(3);
    } catch (err) { toast.error("Gagal simpan Flow 2 detail"); }
  };

  const handleSaveFlow3And4 = async () => {
    try {
      const promises = productStepData.map(item => {
        // Prepare clean payload for backend
        const payload = {
          id: item.id || 0,
          program_id: activeProgram.id,
          product_id: item.product_id,
          step_number: parseInt(item.step_number) || 0,
          step_name: item.step_name,
          phase: item.phase || 'both',
          frequency: item.frequency || 'daily',
          purpose: item.purpose || '',
          amount_text: item.amount_text || '',
          amount_note: item.amount_note || '',
          step_by_step_json: typeof item.step_by_step_json === 'string' ? item.step_by_step_json : JSON.stringify(item.step_by_step_json || []),
          tips_json: typeof item.tips_json === 'string' ? item.tips_json : JSON.stringify(item.tips_json || []),
          visual_refs_json: typeof item.visual_refs_json === 'string' ? item.visual_refs_json : JSON.stringify(item.visual_refs_json || []),
          common_mistakes_json: typeof item.common_mistakes_json === 'string' ? item.common_mistakes_json : JSON.stringify(item.common_mistakes_json || []),
          mechanism_explain: item.mechanism_explain || '',
          wait_time_secs: parseInt(item.wait_time_secs) || 0,
          additional_notes: item.additional_notes || '',
          order: item.order || 0
        };

        return fetchJson(`${API_BASE}/api/admin/skin/programs/product-steps/save`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      });
      
      await Promise.all(promises);
      toast.success("Flow 3 & 4: Products & Instructions Saved!");
      setWizardStep(0);
      setActiveProgram(null);
      loadData();
    } catch (err) { 
      console.error("Save Flow 3/4 Error:", err);
      toast.error(`Gagal simpan Flow 3/4: ${err.message}`); 
    }
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
      { id: 'histories', label: 'Graduated', icon: 'bx-award', count: histories.length },
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

      {activeTab === 'histories' && (
        <div style={A.card}>
          <TablePanel>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...A.th, paddingLeft: 24 }}>GRADUATE</th>
                  <th style={A.th}>PROGRAM</th>
                  <th style={A.th}>DURASI</th>
                  <th style={A.th}>CONSISTENCY</th>
                  <th style={A.th}>FINAL RANK</th>
                  <th style={{ ...A.th, paddingRight: 24, textAlign: 'right' }}>DATE</th>
                </tr>
              </thead>
              <tbody>
                {histories.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Belum ada member yang lulus.</td></tr>
                ) : histories.map((h, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ ...A.td, paddingLeft: 24 }}>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{h.user_id.substring(0,8)}...</div>
                    </td>
                    <td style={A.td}>
                      <span style={{ color: '#6366f1', fontWeight: 700 }}>{h.program_name}</span>
                    </td>
                    <td style={A.td}>{h.day_count} Hari</td>
                    <td style={A.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, width: 60, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${h.consistency_score}%`, background: '#10b981' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981' }}>{h.consistency_score}%</span>
                      </div>
                    </td>
                    <td style={A.td}>
                      <span style={{ padding: '4px 8px', borderRadius: 6, background: '#fef3c7', color: '#d97706', fontSize: 10, fontWeight: 800 }}>{h.final_rank}</span>
                    </td>
                    <td style={{ ...A.td, paddingRight: 24, textAlign: 'right', fontSize: 11, color: '#94a3b8' }}>
                      {new Date(h.finished_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablePanel>
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
          {wizardStep === 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
                <h3 style={{ fontSize: 16, fontWeight: 900 }}>Program Skin Journey Builder</h3>
                <button style={A.btnPrimary} onClick={() => {
                  setProgData({ name: '', slug: '', category: 'Acne Treatment', target_skin_type: [], target_concerns: [], duration_weeks: 4, expected_outcome: '', ai_score_focus: [], status: 'draft', level: 1 });
                  setPhaseData([]); setBenefitData([]); setWarningData([]); setFaqData([]); setProductStepData([]);
                  setWizardStep(1);
                }}>+ CREATE NEW PROGRAM</button>
              </div>
              <TablePanel>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...A.th, paddingLeft: 24 }}>PROGRAM NAME</th>
                      <th style={A.th}>CATEGORY</th>
                      <th style={A.th}>STATUS</th>
                      <th style={{ ...A.th, paddingRight: 24, textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programs.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ ...A.td, paddingLeft: 24 }}><strong>{p.name}</strong></td>
                        <td style={A.td}>{p.category}</td>
                        <td style={A.td}><span style={statusBadge(p.status)}>{p.status}</span></td>
                        <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                          <button onClick={() => handleEditProgramFlow(p)} style={{ ...A.btnGhost, color: '#6366f1', marginRight: 8 }}>EDIT FLOW</button>
                          <button onClick={() => handleDeleteProgram(p.id)} style={{ ...A.btnGhost, color: '#ef4444' }}>DELETE</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TablePanel>
            </>
          ) : (
            <div style={{ padding: 32 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 32, justifyContent: 'center' }}>
                {[1, 2, 3, 4].map(s => (
                  <div key={s} style={{ 
                    display: 'flex', alignItems: 'center', gap: 8, 
                    color: wizardStep >= s ? '#6366f1' : '#94a3b8',
                    fontWeight: 800, fontSize: 12
                  }}>
                    <div style={{ 
                      width: 24, height: 24, borderRadius: '50%', 
                      background: wizardStep >= s ? '#6366f1' : '#f1f5f9',
                      color: wizardStep >= s ? 'white' : '#94a3b8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{s}</div>
                    Flow {s}
                    {s < 4 && <div style={{ width: 40, height: 2, background: wizardStep > s ? '#6366f1' : '#f1f5f9' }} />}
                  </div>
                ))}
              </div>

              {wizardStep === 1 && (
                <div className="fade-in">
                  <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 24 }}>FLOW 1: BIKIN PROGRAM (Inisiasi)</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div>
                      <FieldLabel>Program Name</FieldLabel>
                      <input style={A.input} placeholder="e.g. Acne-Free Express 4 Weeks" value={progData.name} onChange={e => setProgData({...progData, name: e.target.value})} />
                    </div>
                    <div>
                      <FieldLabel>Category</FieldLabel>
                      <select style={A.input} value={progData.category} onChange={e => setProgData({...progData, category: e.target.value})}>
                        {['Acne Treatment', 'Anti-Aging', 'Brightening', 'Hydration', 'Sensitivity', 'General'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Duration (Weeks)</FieldLabel>
                      <input type="number" style={A.input} value={progData.duration_weeks} onChange={e => setProgData({...progData, duration_weeks: parseInt(e.target.value)})} />
                    </div>
                    <div>
                      <FieldLabel>Level</FieldLabel>
                      <input type="number" style={A.input} value={progData.level} onChange={e => setProgData({...progData, level: parseInt(e.target.value)})} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <FieldLabel>Expected Outcome</FieldLabel>
                      <textarea style={{ ...A.input, height: 80 }} value={progData.expected_outcome} onChange={e => setProgData({...progData, expected_outcome: e.target.value})} />
                    </div>
                  </div>
                  <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button style={A.btnGhost} onClick={() => setWizardStep(0)}>Cancel</button>
                    <button style={A.btnPrimary} onClick={handleSaveFlow1}>Next: Flow 2 Details</button>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="fade-in">
                  <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 24 }}>FLOW 2: PENJELASAN DETAIL</h3>
                  
                  {/* Phases Section */}
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 800 }}>Timeline Phases</h4>
                      <button style={{ ...A.btnGhost, color: '#6366f1' }} onClick={() => setPhaseData([...phaseData, { phase_number: phaseData.length + 1, title: '', description: '', expectations: '' }])}>+ ADD PHASE</button>
                    </div>
                    {phaseData.map((p, idx) => (
                      <div key={idx} style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 12 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 12 }}>
                          <input type="number" style={A.input} placeholder="Wk" value={p.phase_number} onChange={e => {
                            const newP = [...phaseData]; newP[idx].phase_number = parseInt(e.target.value); setPhaseData(newP);
                          }} />
                          <input style={A.input} placeholder="Phase Title" value={p.title} onChange={e => {
                            const newP = [...phaseData]; newP[idx].title = e.target.value; setPhaseData(newP);
                          }} />
                          <input style={A.input} placeholder="Expectations" value={p.expectations} onChange={e => {
                            const newP = [...phaseData]; newP[idx].expectations = e.target.value; setPhaseData(newP);
                          }} />
                        </div>
                        <textarea style={{ ...A.input, height: 60, marginTop: 8 }} placeholder="Phase Description" value={p.description} onChange={e => {
                          const newP = [...phaseData]; newP[idx].description = e.target.value; setPhaseData(newP);
                        }} />
                      </div>
                    ))}
                  </div>

                  {/* Benefits & Warnings */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 800 }}>Benefits</h4>
                        <button style={{ ...A.btnGhost, color: '#6366f1' }} onClick={() => setBenefitData([...benefitData, { title: '', description: '', icon: '🎯' }])}>+ ADD</button>
                      </div>
                      {benefitData.map((b, idx) => (
                        <div key={idx} style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
                          <input style={{ ...A.input, width: 40 }} value={b.icon} onChange={e => {
                            const newB = [...benefitData]; newB[idx].icon = e.target.value; setBenefitData(newB);
                          }} />
                          <input style={A.input} placeholder="Benefit Title" value={b.title} onChange={e => {
                            const newB = [...benefitData]; newB[idx].title = e.target.value; setBenefitData(newB);
                          }} />
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 800 }}>Warnings</h4>
                        <button style={{ ...A.btnGhost, color: '#ef4444' }} onClick={() => setWarningData([...warningData, { title: '', description: '', type: 'danger', badge: 'PENTING' }])}>+ ADD</button>
                      </div>
                      {warningData.map((w, idx) => (
                        <div key={idx} style={{ marginBottom: 8 }}>
                          <input style={A.input} placeholder="Warning Title" value={w.title} onChange={e => {
                            const newW = [...warningData]; newW[idx].title = e.target.value; setWarningData(newW);
                          }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
                    <button style={A.btnGhost} onClick={() => setWizardStep(1)}>Back</button>
                    <button style={A.btnPrimary} onClick={handleSaveFlow2}>Next: Flow 3 Products</button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="fade-in">
                  <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 24 }}>FLOW 3: PRODUK YANG DIPAKAI</h3>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <button style={A.btnPrimary} onClick={() => setProductStepData([...productStepData, { product_id: '', step_name: '', step_number: productStepData.length+1, phase: 'both', frequency: 'daily' }])}>+ ADD PRODUCT STEP</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {productStepData.map((ps, idx) => (
                      <div key={idx} style={{ padding: 20, border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gap: 16 }}>
                          <div>
                            <FieldLabel>Step #</FieldLabel>
                            <input type="number" style={A.input} value={ps.step_number} onChange={e => {
                              const newPS = [...productStepData]; newPS[idx].step_number = parseInt(e.target.value); setProductStepData(newPS);
                            }} />
                          </div>
                          <div>
                            <FieldLabel>Step Name</FieldLabel>
                            <input style={A.input} placeholder="e.g. Cleansing" value={ps.step_name} onChange={e => {
                              const newPS = [...productStepData]; newPS[idx].step_name = e.target.value; setProductStepData(newPS);
                            }} />
                          </div>
                          <div>
                            <FieldLabel>Select Product</FieldLabel>
                            <select style={A.input} value={ps.product_id} onChange={e => {
                              const newPS = [...productStepData]; newPS[idx].product_id = e.target.value; setProductStepData(newPS);
                            }}>
                              <option value="">Choose Product</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <FieldLabel>Phase</FieldLabel>
                            <select style={A.input} value={ps.phase} onChange={e => {
                              const newPS = [...productStepData]; newPS[idx].phase = e.target.value; setProductStepData(newPS);
                            }}>
                              <option value="both">Both (AM & PM)</option>
                              <option value="morning">Morning Only</option>
                              <option value="evening">Evening Only</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
                    <button style={A.btnGhost} onClick={() => setWizardStep(2)}>Back</button>
                    <button style={A.btnPrimary} onClick={() => setWizardStep(4)}>Next: Flow 4 Instructions</button>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="fade-in">
                  <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 24 }}>FLOW 4: CARA PAKAI (Instruksi Detail)</h3>
                  {productStepData.map((ps, idx) => (
                    <div key={idx} style={{ padding: 24, border: '1px solid #6366f1', borderRadius: 16, marginBottom: 24, background: 'white' }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#6366f1', marginBottom: 16 }}>STEP {ps.step_number}: {ps.step_name} ({products.find(p => p.id === ps.product_id)?.name})</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div>
                          <FieldLabel>Dosage/Amount</FieldLabel>
                          <input style={A.input} placeholder="e.g. Seukuran biji jagung" value={ps.amount_text} onChange={e => {
                            const newPS = [...productStepData]; newPS[idx].amount_text = e.target.value; setProductStepData(newPS);
                          }} />
                        </div>
                        <div>
                          <FieldLabel>Wait Time (Secs)</FieldLabel>
                          <input type="number" style={A.input} value={ps.wait_time_secs} onChange={e => {
                            const newPS = [...productStepData]; newPS[idx].wait_time_secs = parseInt(e.target.value); setProductStepData(newPS);
                          }} />
                        </div>
                        <div>
                          <FieldLabel>Mechanism</FieldLabel>
                          <input style={A.input} placeholder="e.g. Keratolytic" value={ps.mechanism_explain} onChange={e => {
                            const newPS = [...productStepData]; newPS[idx].mechanism_explain = e.target.value; setProductStepData(newPS);
                          }} />
                        </div>
                      </div>
                      <FieldLabel>Pro Tips / Additional Notes</FieldLabel>
                      <textarea style={{ ...A.input, height: 60 }} placeholder="Tips khusus untuk user..." value={ps.additional_notes} onChange={e => {
                        const newPS = [...productStepData]; newPS[idx].additional_notes = e.target.value; setProductStepData(newPS);
                      }} />

                      <div style={{ marginTop: 20 }}>
                        <FieldLabel>Instruksi Langkah-demi-Langkah (Step-by-Step)</FieldLabel>
                        {(typeof ps.step_by_step_json === 'string' ? JSON.parse(ps.step_by_step_json || '[]') : (ps.step_by_step_json || [])).map((step, sIdx) => (
                          <div key={sIdx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <input 
                              style={A.input} 
                              value={step} 
                              onChange={e => {
                                const newPS = [...productStepData];
                                const currentSteps = typeof newPS[idx].step_by_step_json === 'string' ? JSON.parse(newPS[idx].step_by_step_json || '[]') : (newPS[idx].step_by_step_json || []);
                                currentSteps[sIdx] = e.target.value;
                                newPS[idx].step_by_step_json = currentSteps;
                                setProductStepData(newPS);
                              }} 
                            />
                            <button style={{ ...A.btnGhost, color: '#ef4444' }} onClick={() => {
                                const newPS = [...productStepData];
                                const currentSteps = typeof newPS[idx].step_by_step_json === 'string' ? JSON.parse(newPS[idx].step_by_step_json || '[]') : (newPS[idx].step_by_step_json || []);
                                currentSteps.splice(sIdx, 1);
                                newPS[idx].step_by_step_json = currentSteps;
                                setProductStepData(newPS);
                            }}>X</button>
                          </div>
                        ))}
                        <button style={{ ...A.btnGhost, color: '#6366f1', fontSize: 11 }} onClick={() => {
                            const newPS = [...productStepData];
                            const currentSteps = typeof newPS[idx].step_by_step_json === 'string' ? JSON.parse(newPS[idx].step_by_step_json || '[]') : (newPS[idx].step_by_step_json || []);
                            currentSteps.push("");
                            newPS[idx].step_by_step_json = currentSteps;
                            setProductStepData(newPS);
                        }}>+ TAMBAH LANGKAH</button>
                      </div>

                      <div style={{ marginTop: 20 }}>
                        <FieldLabel>Tips Khusus</FieldLabel>
                        {(typeof ps.tips_json === 'string' ? JSON.parse(ps.tips_json || '[]') : (ps.tips_json || [])).map((tip, tIdx) => (
                          <div key={tIdx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <input 
                              style={A.input} 
                              value={tip} 
                              onChange={e => {
                                const newPS = [...productStepData];
                                const currentTips = typeof newPS[idx].tips_json === 'string' ? JSON.parse(newPS[idx].tips_json || '[]') : (newPS[idx].tips_json || []);
                                currentTips[tIdx] = e.target.value;
                                newPS[idx].tips_json = currentTips;
                                setProductStepData(newPS);
                              }} 
                            />
                            <button style={{ ...A.btnGhost, color: '#ef4444' }} onClick={() => {
                                const newPS = [...productStepData];
                                const currentTips = typeof newPS[idx].tips_json === 'string' ? JSON.parse(newPS[idx].tips_json || '[]') : (newPS[idx].tips_json || []);
                                currentTips.splice(tIdx, 1);
                                newPS[idx].tips_json = currentTips;
                                setProductStepData(newPS);
                            }}>X</button>
                          </div>
                        ))}
                        <button style={{ ...A.btnGhost, color: '#6366f1', fontSize: 11 }} onClick={() => {
                            const newPS = [...productStepData];
                            const currentTips = typeof newPS[idx].tips_json === 'string' ? JSON.parse(newPS[idx].tips_json || '[]') : (newPS[idx].tips_json || []);
                            currentTips.push("");
                            newPS[idx].tips_json = currentTips;
                            setProductStepData(newPS);
                        }}>+ TAMBAH TIPS</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
                    <button style={A.btnGhost} onClick={() => setWizardStep(3)}>Back</button>
                    <button style={{ ...A.btnPrimary, background: '#10b981', borderColor: '#10b981' }} onClick={handleSaveFlow3And4}>PUBLISH COMPLETE PROGRAM 🧬</button>
                  </div>
                </div>
              )}
            </div>
          )}
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
        <Modal onClose={() => setShowAddPretest(false)} title="Register New Journey Member">
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
