import React, { useState, useEffect } from 'react';
import { fetchJson, AFFILIATE_API_BASE, formatImage } from '../../lib/api';

const formatRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const cardStyle = {
  background: 'rgba(35, 41, 60, 0.4)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(77, 67, 84, 0.15)',
};

export default function TeamPerformance() {
  const [stats, setStats] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterLevel, setFilterLevel] = useState('all');
  const [expandedIds, setExpandedIds] = useState([]);
  const [currentRoot, setCurrentRoot] = useState(null);
  const [navPath, setNavPath] = useState([]);
  const [viewMode, setViewMode] = useState('visual'); // 'table' or 'visual'
  const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, total_items: 0 });

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const rootParam = currentRoot ? `&root_id=${currentRoot.id}` : '';
      const [teamRes, eligRes] = await Promise.all([
        fetchJson(`${AFFILIATE_API_BASE}/team-stats?search=${search}&page=${page}&level=${filterLevel}${rootParam}`),
        fetchJson(`${AFFILIATE_API_BASE}/merchant-eligibility`).catch(() => null),
      ]);
      setStats(teamRes);
      if (teamRes.pagination) setPagination(teamRes.pagination);
      if (eligRes) setEligibility(eligRes);
    } catch (err) {
      setError(err.message || 'Gagal memuat data tim');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else loadStats();
    }, 500);
    return () => clearTimeout(timer);
  }, [search, filterLevel, currentRoot]);

  useEffect(() => { loadStats(); }, [page]);

  const toggleExpand = (id) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Helper to determine if a member should be visible
  const isMemberVisible = (m) => {
    if (m.level === 1) return true;
    if (search) return true;
    return expandedIds.includes(m.upline_id);
  };

  const handleDrillDown = (member) => {
    const newRoot = { id: member.affiliate_id, name: member.full_name, avatar: member.avatar_url };
    setCurrentRoot(newRoot);
    setNavPath(prev => [...prev, { id: member.affiliate_id, name: member.full_name }]);
    setPage(1);
  };

  const handleNavigatePath = (index) => {
    if (index === -1) {
      setCurrentRoot(null);
      setNavPath([]);
    } else {
      const target = navPath[index];
      setCurrentRoot({ id: target.id, name: target.name });
      setNavPath(navPath.slice(0, index + 1));
    }
    setPage(1);
  };

  // Build tree structure for visual mode
  const getHierarchy = () => {
    if (!stats || !stats.downlines) return [];
    const map = {};
    const tree = [];
    
    stats.downlines.forEach(m => {
      map[m.affiliate_id] = { ...m, children: [] };
    });

    stats.downlines.forEach(m => {
      if (m.upline_id && map[m.upline_id]) {
        map[m.upline_id].children.push(map[m.affiliate_id]);
      } else if (m.level === 1) {
        tree.push(map[m.affiliate_id]);
      }
    });

    return tree;
  };

  if (loading && !stats) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-purple-500/30 border-t-purple-400 animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Memuat data tim...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <span className="material-symbols-outlined text-red-400 text-5xl">group_off</span>
      <p className="text-slate-300">{error}</p>
      <button
        onClick={loadStats}
        className="px-6 py-2 rounded-xl text-sm font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
      >
        Coba Lagi
      </button>
    </div>
  );

  // Eligibility data
  const totalMitra = eligibility?.active_mitra || 0;
  const qualifiedMitra = eligibility?.qualified_mitra || 0;
  const reqMitra = eligibility?.requirements?.min_mitra || 100;
  const monthlyTurnover = eligibility?.monthly_turnover || 0;
  const reqTurnover = eligibility?.requirements?.min_turnover || 10000000;
  
  // Use qualifiedMitra for merchant progress requirement
  const mitraProgress = Math.min((qualifiedMitra / reqMitra) * 100, 100);
  const turnoverProgress = Math.min((monthlyTurnover / reqTurnover) * 100, 100);
  const isEligible = eligibility?.is_eligible;

  return (
    <div className="space-y-8">
      {/* Header & Breadcrumbs */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight">
            Pusat <span style={{ background: 'linear-gradient(135deg, #ddb7ff, #b76dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Tim</span>
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Pantau performa jaringan mitra di bawah Anda</p>
        </div>

        {/* Breadcrumbs / Navigation Path */}
        <div className="flex items-center flex-wrap gap-2 mb-2">
          <button 
            onClick={() => handleNavigatePath(-1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${!currentRoot ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-white/5 text-slate-500 hover:text-slate-300 border border-white/5'}`}
          >
            <span className="material-symbols-outlined text-sm">home</span>
            Tim Saya
          </button>

          {navPath.map((item, idx) => (
            <React.Fragment key={item.id}>
              <span className="material-symbols-outlined text-slate-700 text-sm">chevron_right</span>
              <button 
                onClick={() => handleNavigatePath(idx)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${idx === navPath.length - 1 ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/10' : 'bg-white/5 text-slate-500 hover:text-slate-300 border border-white/5'}`}
              >
                <div className="w-4 h-4 rounded-full bg-slate-800 overflow-hidden border border-white/10 flex-shrink-0">
                  {item.avatar ? (
                    <img src={formatImage(item.avatar)} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px]">{item.name.charAt(0)}</div>
                  )}
                </div>
                {item.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="h-1 w-full bg-gradient-to-r from-purple-500/50 via-transparent to-transparent rounded-full mb-8 opacity-30" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative overflow-hidden rounded-2xl p-6" style={cardStyle}>
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-20" style={{ background: '#b76dff' }} />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl" style={{ background: '#b76dff20' }}>
              <span className="material-symbols-outlined" style={{ color: '#b76dff' }}>group</span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em]">Total Downline</p>
          </div>
          <h3 className="text-3xl font-black text-white font-['Plus_Jakarta_Sans']">
            {stats?.total_downlines || 0}
            <span className="text-lg text-slate-400 font-medium ml-2">mitra</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            <span className="text-green-400 font-bold">{activeMitra}</span> aktif bertransaksi 30 hari ini
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-6" style={cardStyle}>
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-20" style={{ background: '#4ade80' }} />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl" style={{ background: '#4ade8020' }}>
              <span className="material-symbols-outlined" style={{ color: '#4ade80' }}>trending_up</span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em]">Omset Tim (Bulan Ini)</p>
          </div>
          <h3 className="text-3xl font-black text-white font-['Plus_Jakarta_Sans']">
            {formatRp(monthlyTurnover)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Total akumulasi: {formatRp(stats?.team_turnover || 0)}</p>
        </div>
      </div>

      {/* Merchant Eligibility Progress [Sync Fix: real-time progress bar] */}
      {eligibility && (
        <div className="rounded-2xl p-6 space-y-5" style={{
          ...cardStyle,
          border: isEligible ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(183, 109, 255, 0.2)'
        }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                <span className="material-symbols-outlined text-lg" style={{ color: isEligible ? '#4ade80' : '#b76dff' }}>
                  {isEligible ? 'verified' : 'storefront'}
                </span>
                Progress Naik ke <span className="text-purple-300 ml-1">Merchant</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEligible
                  ? '🎉 Anda memenuhi syarat! Ajukan upgrade sekarang.'
                  : 'Penuhi 2 syarat berikut untuk menjadi Merchant AkuGlow'}
              </p>
            </div>
            {isEligible && (
              <span className="px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider"
                style={{ background: '#4ade8018', color: '#4ade80', border: '1px solid #4ade8030' }}>
                ✓ Eligible
              </span>
            )}
          </div>

          {/* Mitra Aktif Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex flex-col">
                <span className="text-xs text-slate-300 font-semibold">Progres Mitra (Direct Berjaringan)</span>
                <span className="text-[10px] text-slate-500">Total Tergabung: {totalMitra} Mitra</span>
              </div>
              <span className="text-xs font-black" style={{ color: qualifiedMitra >= reqMitra ? '#4ade80' : '#b76dff' }}>
                {qualifiedMitra} / {reqMitra}
              </span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${mitraProgress}%`,
                  background: qualifiedMitra >= reqMitra
                    ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                    : 'linear-gradient(90deg, #7c3aed, #b76dff)'
                }}
              />
            </div>
          </div>

          {/* Omset Tim Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-300 font-semibold">Omset Tim / Bulan</span>
              <span className="text-xs font-black" style={{ color: monthlyTurnover >= reqTurnover ? '#4ade80' : '#fabc4e' }}>
                {formatRp(monthlyTurnover)} / {formatRp(reqTurnover)}
              </span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${turnoverProgress}%`,
                  background: monthlyTurnover >= reqTurnover
                    ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                    : 'linear-gradient(90deg, #f59e0b, #fabc4e)'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Team View Controller */}
      <div className="space-y-4">
        <div>
          <h3 className="text-white font-bold font-['Plus_Jakarta_Sans']">Daftar Anggota Tim</h3>
          <p className="text-slate-400 text-xs mt-0.5">
            {pagination.total_items || 0} hasil ditemukan · <span className="text-green-400">{activeMitra} aktif</span> 30 hari ini
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-2 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-2 p-1 bg-black/20 rounded-xl border border-white/5">
            <button 
              onClick={() => setViewMode('visual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'visual' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <span className="material-symbols-outlined text-sm">account_tree</span>
              Visual Pohon
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <span className="material-symbols-outlined text-sm">table_rows</span>
              Data Tabel
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
              <input
                type="text"
                placeholder="Cari nama atau User ID..."
                className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button 
              onClick={loadStats}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
            </button>
          </div>
        </div>

        {viewMode === 'visual' ? (
          <div className="min-h-[500px] p-8 rounded-3xl bg-black/20 border border-white/5 overflow-x-auto custom-scrollbar">
            <div className="flex flex-col gap-12 items-center min-w-max">
              {getHierarchy().map(root => (
                <TreeNode key={root.affiliate_id} node={root} onDrillDown={handleDrillDown} />
              ))}
              {(!stats || !stats.downlines || stats.downlines.length === 0) && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <span className="material-symbols-outlined text-5xl mb-4 opacity-20">group_off</span>
                  <p className="font-bold">Belum ada anggota tim</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={cardStyle} className="rounded-3xl overflow-hidden border border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    {[
                      { label: 'Nama Mitra', icon: 'person' },
                      { label: 'Level', icon: 'layers' },
                      { label: 'Status', icon: 'shield_check' },
                      { label: 'Direferensikan Oleh', icon: 'link' },
                      { label: 'Bergabung', icon: 'event' },
                      { label: 'Omset Pribadi', icon: 'payments' },
                      { label: 'Aksi', icon: 'settings', align: 'center' },
                    ].map((h, i) => (
                      <th key={i} className={`px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest ${h.align === 'center' ? 'text-center' : ''}`}>
                        <div className={`flex items-center gap-2 ${h.align === 'center' ? 'justify-center' : ''}`}>
                          <span className="material-symbols-outlined text-[14px]">{h.icon}</span>
                          {h.label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats?.downlines?.filter(isMemberVisible).map((m, idx) => (
                    <tr
                      key={m.affiliate_id || m.user_id || idx}
                      className={`transition-all duration-300 ${m.level === 1 ? 'bg-purple-500/[0.03] hover:bg-purple-500/[0.06]' : 'hover:bg-white/3'}`}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {m.level > 1 && (
                            <div className="flex items-center">
                              <div className="w-5 h-8 border-l-2 border-b-2 border-white/10 rounded-bl-xl -mt-5 mr-1" />
                            </div>
                          )}
                          <div
                            className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-lg"
                            style={{ 
                              background: m.level === 1 
                                ? 'linear-gradient(135deg, #7c3aed, #b76dff)' 
                                : 'linear-gradient(135deg, #334155, #475569)',
                              boxShadow: m.level === 1 ? '0 4px 12px rgba(124, 58, 237, 0.3)' : 'none'
                            }}
                          >
                            {m.avatar_url ? (
                              <img src={formatImage(m.avatar_url)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm">{(m.full_name || 'M').charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-bold ${m.level === 1 ? 'text-white' : 'text-slate-200'}`}>{m.full_name || 'Mitra'}</p>
                              {m.level === 1 && (
                                <span className="text-[8px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider shadow-sm">Direct</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{m.user_id?.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span 
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                          style={{ 
                            background: m.level === 1 ? '#b76dff20' : '#47556930',
                            color: m.level === 1 ? '#b76dff' : '#94a3b8',
                            border: m.level === 1 ? '1px solid #b76dff30' : '1px solid #47556940'
                          }}
                        >
                          Lvl {m.level}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={
                            m.status === 'active'
                              ? { color: '#4ade80', background: '#4ade8018' }
                              : { color: '#fabc4e', background: '#fabc4e18' }
                          }
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.status === 'active' ? '#4ade80' : '#fabc4e' }} />
                          {m.status === 'active' ? 'Aktif' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-300 font-medium">{m.referrer_name || 'Sistem'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(m.joined_at).toLocaleDateString('id-ID', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-green-400">{formatRp(m.turnover)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDrillDown(m)}
                            className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 transition-all"
                            title="Masuk ke Jaringan Ini"
                          >
                            <span className="material-symbols-outlined text-lg">login</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between p-6 border-t border-white/5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Halaman {pagination.current_page} dari {pagination.total_pages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-20 enabled:hover:bg-white/5 enabled:hover:text-white text-slate-400"
                  >
                    Kembali
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
                    disabled={page >= pagination.total_pages}
                    className="px-4 py-2 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-20 enabled:hover:bg-white/5 enabled:hover:text-white text-slate-400"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div
        className="p-4 rounded-xl flex items-start gap-3"
        style={{ background: 'rgba(183, 109, 255, 0.08)', border: '1px solid rgba(183, 109, 255, 0.2)' }}
      >
        <span className="material-symbols-outlined text-purple-400 text-lg mt-0.5">info</span>
        <div className="text-xs text-slate-400 leading-relaxed">
          <span className="font-bold text-purple-300 block mb-1">Tentang Tim & Syarat Merchant</span>
          Halaman ini menampilkan mitra yang bergabung melalui link affiliate Anda.{' '}
          <strong className="text-white">Mitra aktif</strong> = memiliki minimal 1 transaksi selesai dalam 30 hari terakhir.
          Omset tim dihitung dari seluruh jaringan (semua level ke bawah) dan digunakan sebagai syarat upgrade ke{' '}
          <strong className="text-white">Merchant AkuGlow</strong>.
        </div>
      </div>
    </div>
  );
}

// Sub-component for Tree View
const TreeNode = ({ node, onDrillDown }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node?.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <div 
        className={`relative group p-4 rounded-2xl border transition-all duration-500 flex flex-col items-center text-center w-48 ${hasChildren ? 'cursor-pointer' : ''}`}
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderColor: node.level === 1 ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)'
        }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {node.level > 1 && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[2px] h-12 bg-gradient-to-t from-purple-500/30 to-transparent" />
        )}

        {/* Level Indicator */}
        <div className="absolute -top-3 -left-2 px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-[8px] font-black text-purple-400">
          LVL {node.level}
        </div>

        <div className="relative mb-3">
          <div 
            className="w-14 h-14 rounded-2xl overflow-hidden border-2 p-0.5"
            style={{ borderColor: node.level === 1 ? '#a855f7' : 'rgba(255,255,255,0.1)' }}
          >
            {node.avatar_url ? (
              <img src={formatImage(node.avatar_url)} className="w-full h-full object-cover rounded-xl" alt="" />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xl font-black text-white">
                {node.full_name?.charAt(0)}
              </div>
            )}
          </div>
          {node.level === 1 && (
            <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg">DIRECT</div>
          )}
        </div>

        <h3 className="text-sm font-bold text-white truncate w-full px-2">{node.full_name}</h3>
        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{node.user_id?.slice(0, 8)}</p>

        <div className="mt-3 w-full pt-3 border-t border-white/5 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[9px] font-bold">
            <span className="text-slate-500 uppercase tracking-tighter">Omset</span>
            <span className="text-green-400">{Number(node.turnover).toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex items-center justify-between text-[9px] font-bold">
            <span className="text-slate-500 uppercase tracking-tighter">Tim</span>
            <span className="text-purple-400">{node?.children?.length || 0} Orang</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2 w-full opacity-0 group-hover:opacity-100 transition-all">
          <button 
            onClick={(e) => { e.stopPropagation(); onDrillDown(node); }}
            className="flex-1 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-[9px] font-black text-purple-400 hover:bg-purple-500 hover:text-white transition-all"
          >
            MASUK
          </button>
          {hasChildren && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"
            >
              <span className="material-symbols-outlined text-sm">
                {isExpanded ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="relative pt-12 flex gap-8">
          {/* Connector Line to Children */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-12 bg-purple-500/20" />
          
          {node.children.map(child => (
            <TreeNode key={child.affiliate_id} node={child} onDrillDown={onDrillDown} />
          ))}
        </div>
      )}
    </div>
  );
};
