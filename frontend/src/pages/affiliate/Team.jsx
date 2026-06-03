import React, { useState, useEffect } from 'react';
import { fetchJson, AFFILIATE_API_BASE, formatImage } from '../../lib/api';
import TreeNode from '../../components/affiliate/TreeNode';
import EligibilityCard from '../../components/affiliate/EligibilityCard';
import ErrorBoundary from '../../components/common/ErrorBoundary';

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
    } catch (_err) {
      setError(_err.message || 'Gagal memuat data tim');
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
  const reqMitra = eligibility?.requirements?.min_mitra || 100;
  const monthlyTurnover = eligibility?.monthly_turnover || 0;
  const reqTurnover = eligibility?.requirements?.min_turnover || 10000000;
  const directMitra = eligibility?.direct_mitra || 0;
  const totalTransactions = eligibility?.total_transactions || 0;
  const performancePoints = eligibility?.performance_points || 0;
  
  // Use totalMitra for progress as requested (Total Affiliate instead of Qualified)
  const mitraProgress = Math.min((totalMitra / reqMitra) * 100, 100);
  const turnoverProgress = Math.min((monthlyTurnover / reqTurnover) * 100, 100);
  const isEligible = eligibility?.is_eligible;
  const activeMitra = stats?.active_mitra || 0; // Derived from stats

  return (
    <ErrorBoundary>
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

      {/* Merchant Eligibility Progress */}
      <EligibilityCard 
        eligibility={eligibility}
        totalMitra={totalMitra}
        activeMitra={activeMitra}
        monthlyTurnover={monthlyTurnover}
        cardStyle={cardStyle}
        directMitra={directMitra}
        totalTransactions={totalTransactions}
        performancePoints={performancePoints}
      />

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
            {/* Level Filter */}
            <select 
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500/50"
            >
              <option value="all">Semua Level</option>
              <option value="1">Level 1 (Direct)</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
              <option value="4">Level 4</option>
              <option value="5">Level 5</option>
              <option value="2plus">Level 2+ (Jaringan)</option>
            </select>

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
          <div className="rounded-3xl overflow-hidden border border-white/5 bg-white/[0.01] backdrop-blur-md shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.04] border-b border-white/10">
                    {[
                      { label: 'Siapa?', icon: 'person', width: '40%' },
                      { label: 'Hubungan', icon: 'account_tree', width: '20%' },
                      { label: 'Sudah Belanja?', icon: 'shopping_bag', width: '20%' },
                      { label: 'Hasil (Omset)', icon: 'payments', width: '15%' },
                      { label: 'Lihat Tim', icon: 'visibility', width: '5%', align: 'center' },
                    ].map((h, i) => (
                      <th key={i} className={`px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] ${h.align === 'center' ? 'text-center' : ''}`} style={{ width: h.width }}>
                        <div className={`flex items-center gap-2 ${h.align === 'center' ? 'justify-center' : ''}`}>
                          {h.label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {stats?.downlines?.map((m, idx) => (
                    <tr
                      key={m.affiliate_id || m.user_id || idx}
                      className="group transition-all duration-300 hover:bg-white/[0.04]"
                    >
                      {/* Kolom SIAPA */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div
                              className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-xl border border-white/10"
                              style={{ 
                                background: m.level === 1 
                                  ? 'linear-gradient(135deg, #7c3aed, #b76dff)' 
                                  : 'linear-gradient(135deg, #1e293b, #334155)',
                              }}
                            >
                              {m.avatar_url ? (
                                <img src={formatImage(m.avatar_url)} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="opacity-80">{(m.full_name || 'M').charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            {m.status === 'active' && (
                              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0f172a] shadow-lg animate-pulse" />
                            )}
                          </div>

                          <div className="flex flex-col min-w-0">
                            <p className="text-sm font-black text-white truncate group-hover:text-purple-300 transition-colors">
                              {m.full_name || 'Mitra Baru'}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Gabung {new Date(m.joined_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                          </div>
                        </div>
                      </td>
                      
                      {/* Kolom HUBUNGAN */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          {m.level === 1 ? (
                            <span className="text-xs font-bold text-purple-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">star</span>
                              Langsung (Anda)
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">
                              Grup (Level {m.level})
                            </span>
                          )}
                          <p className="text-[10px] text-slate-600 mt-0.5">Dihubungkan oleh {m.referrer_name || 'Sistem'}</p>
                        </div>
                      </td>

                      {/* Kolom AKTIVITAS */}
                      <td className="px-6 py-5">
                        {m.status === 'active' ? (
                          <div className="flex items-center gap-2 text-green-400 bg-green-400/5 border border-green-400/10 px-3 py-1.5 rounded-xl w-fit">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            <span className="text-[10px] font-black uppercase tracking-wider">Sudah Belanja</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-500 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl w-fit">
                            <span className="material-symbols-outlined text-[16px]">schedule</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Belum Ada Order</span>
                          </div>
                        )}
                      </td>

                      {/* Kolom HASIL */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-white">{formatRp(m.turnover)}</span>
                          <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Kontribusi Omset</p>
                        </div>
                      </td>

                      {/* Kolom AKSI */}
                      <td className="px-6 py-5 text-center">
                        <button
                          onClick={() => handleDrillDown(m)}
                          className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-500 hover:text-white hover:bg-purple-600 transition-all duration-300 active:scale-90"
                          title="Lihat Tim Mereka"
                        >
                          <span className="material-symbols-outlined text-xl">keyboard_arrow_right</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!stats?.downlines || stats.downlines.length === 0) && (
                    <tr>
                      <td colSpan="5" className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-20">
                          <span className="material-symbols-outlined text-7xl">group_remove</span>
                          <p className="text-xs font-black uppercase tracking-[0.3em]">Mitra Tidak Ditemukan</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between p-6 bg-white/[0.03] border-t border-white/5">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
                  Hal {pagination.current_page} / {pagination.total_pages}
                </span>
                <div className="flex gap-4">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-10 enabled:hover:bg-purple-600 text-slate-400"
                  >
                    Sebelumnya
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
                    disabled={page >= pagination.total_pages}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-10 enabled:hover:bg-purple-600 text-slate-400"
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
  </ErrorBoundary>
  );
}

