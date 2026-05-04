import React, { useState, useEffect, useCallback } from 'react';
import { fetchJson, AFFILIATE_API_BASE, API_BASE } from '../../lib/api';
import { getStoredUser } from '../../lib/auth';
import toast from 'react-hot-toast';

const formatRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const formatNum = (n) => Number(n || 0).toLocaleString('id-ID');

const StatCard = ({ icon, label, value, sub, color }) => (
  <div
    className="relative overflow-hidden rounded-2xl p-6 group hover:scale-[1.02] transition-all duration-300"
    style={{ background: 'rgba(35, 41, 60, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(77, 67, 84, 0.15)' }}
  >
    <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" style={{ background: color }} />
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 rounded-xl" style={{ background: `${color}20` }}>
        <span className="material-symbols-outlined" style={{ color }}>{icon}</span>
      </div>
    </div>
    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
    <h3 className="text-xl font-black text-white">{value}</h3>
    {sub && <p className="text-slate-500 text-[10px] mt-1">{sub}</p>}
  </div>
);

export default function AffiliateDashboard() {
  const user = getStoredUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Skin Journey States
  const [journeyData, setJourneyData] = useState(null);
  const [journalText, setJournalText] = useState('');
  const [savingJournal, setSavingJournal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const [ritualActive, setRitualActive] = useState(false);
  const [ritualSeconds, setRitualSeconds] = useState(60);
  const [skinPhoto, setSkinPhoto] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [trackerForm, setTrackerForm] = useState({ skin_score: 5, emotional_score: 5, allow_marketing: false, notes: '' });
  const [joinRefCode, setJoinRefCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Filter states for Skin Journey chart
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(null); // null = show all months of year

  // Hitung week_number saat ini dari pretest date
  const currentWeekNumber = (() => {
    if (!journeyData?.pretest?.created_at) return null;
    const createdAt = new Date(journeyData.pretest.created_at);
    // Jika tanggal adalah 0001-01-01 (default Go) atau tidak valid, jangan hitung week
    if (isNaN(createdAt.getTime()) || createdAt.getFullYear() < 2000) return null;
    const daysSince = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
    return Math.min(52, Math.max(1, Math.floor(daysSince / 7) + 1)); // Cap di 52 minggu (1 tahun)
  })();

  const alreadyUploadedThisWeek = currentWeekNumber != null &&
    journeyData?.progress_logs?.some(p => p.week_number === currentWeekNumber);

  useEffect(() => {
    let interval = null;
    if (ritualActive && ritualSeconds > 0) {
      interval = setInterval(() => setRitualSeconds(prev => prev - 1), 1000);
    } else if (ritualSeconds === 0) {
      setRitualActive(false);
      setRitualSeconds(60);
      toast.success('Ritual Selesai! Kulitmu berterima kasih. ✨', { duration: 5000 });
    }
    return () => clearInterval(interval);
  }, [ritualActive, ritualSeconds]);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchJson(`${AFFILIATE_API_BASE}/dashboard`);
      setData(res);
    } catch (err) { toast.error('Gagal memuat dashboard'); }
    finally { setLoading(false); }
  }, []);

  const fetchJourney = async () => {
    try {
      const res = await fetchJson(`${API_BASE}/api/skin/journey`);
      setJourneyData(res);
    } catch (err) { console.error('Journey Fetch Error:', err); }
  };

  useEffect(() => {
    fetchDashboard();
    fetchJourney();
  }, [fetchDashboard]);

  const handlePostJournal = async () => {
    if (!journalText.trim()) return;
    setSavingJournal(true);
    try {
      await fetchJson(`${API_BASE}/api/skin/journal`, { method: 'POST', body: JSON.stringify({ content: journalText }) });
      toast.success('Jurnal harian tersimpan!');
      setJournalText('');
      fetchJourney();
    } catch (err) { toast.error('Gagal mengirim jurnal'); }
    finally { setSavingJournal(false); }
  };

  const handleSaveProgress = async () => {
    if (alreadyUploadedThisWeek) {
      toast.error(`Kamu sudah upload progres minggu ke-${currentWeekNumber}! Tunggu minggu depan ya 💪`, { duration: 5000 });
      return;
    }

    setAnalyzing(true);
    setAiAnalysis(null);
    try {
      // 1. Prepare base progress form
      const progressForm = {
        skin_score: trackerForm.skin_score,
        emotional_score: trackerForm.emotional_score,
        allow_marketing: trackerForm.allow_marketing,
        notes: trackerForm.notes
      };

      // 2. Analyze photo via AI if uploaded
      if (skinPhoto) {
        toast.loading('Menganalisis foto dengan AI...', { id: 'ai-analyze' });
        const formData = new FormData();
        formData.append('photo', skinPhoto);
        const token = localStorage.getItem('token');
        const aiRes = await fetch(`${API_BASE}/api/skin/analyze`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        });
        const aiJson = await aiRes.json();
        if (!aiRes.ok) throw new Error(aiJson?.message || 'Gagal menganalisis foto');

        const aiResult = aiJson?.data ?? aiJson;
        if (aiResult?.skin_score) progressForm.skin_score = aiResult.skin_score;
        setAiAnalysis(aiResult);
        
        // Capture photo_url and include in progress form
        if (aiResult?.photo_url) {
          progressForm.selfie_url = aiResult.photo_url;
        }

        toast.success('✨ Analisis AI selesai!', { id: 'ai-analyze' });
      }

      // 3. Save Progress (JSON)
      const res = await fetchJson(`${API_BASE}/api/skin/progress`, {
        method: 'POST',
        body: JSON.stringify(progressForm)
      });

      toast.success(res.message || 'Progres mingguan tersimpan!', { duration: 5000 });
      setSkinPhoto(null);
      fetchJourney();
    } catch (err) {
      toast.dismiss('ai-analyze');
      toast.error(err.message || 'Gagal menyimpan progres', { duration: 5000 });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!joinRefCode.trim()) return;
    setJoining(true);
    try {
      const res = await fetchJson(`${AFFILIATE_API_BASE}/link-upline`, {
        method: 'POST',
        body: JSON.stringify({ ref_code: joinRefCode.trim() })
      });
      toast.success(res.message || 'Berhasil bergabung ke tim!');
      fetchDashboard();
    } catch (err) {
      toast.error(err.message || 'Gagal bergabung ke tim');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-400 animate-spin" />
    </div>
  );

  const stats = data?.stats || {};
  const tierName = data?.affiliate?.tier?.name || user?.affiliate?.membership_tier?.name || 'Mitra Dasar';
  const activeMitraCount = stats.active_mitra_count || 0;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + '/skin/journey?token=' + journeyData?.pretest?.barcode_token)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight">
            Halo, <span style={{ background: 'linear-gradient(135deg, #ddb7ff, #b76dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.profile?.full_name || 'Mitra'}!</span>
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Selamat datang di Pusat Kendali Mitra AkuGlow.</p>
        </div>
        <div className="flex p-1 bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/5 w-fit">
          <button 
            onClick={() => { console.log("Tab: overview"); setActiveTab('overview'); }} 
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            OVERVIEW
          </button>
          <button 
            onClick={() => { console.log("Tab: journey"); setActiveTab('journey'); }} 
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${activeTab === 'journey' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            SKIN JOURNEY
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Top Bar: Referral & Tier */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-[32px] flex justify-between items-center shadow-xl shadow-indigo-500/20 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Kode Referral Anda</p>
                <h3 className="text-white text-3xl font-black tracking-widest">{data?.affiliate?.ref_code || user?.affiliate?.ref_code || user?.affiliate_ref_code || '-'}</h3>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(data?.affiliate?.ref_code || user?.affiliate?.ref_code || user?.affiliate_ref_code || ''); toast.success('Kode disalin!'); }} className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-lg text-[10px] font-black transition-all">SALIN KODE</button>
                  <button onClick={() => window.open('/affiliate/links', '_self')} className="px-4 py-2 bg-indigo-900/40 text-white rounded-lg text-[10px] font-black hover:bg-indigo-900/60">GENERATE LINK</button>
                </div>
              </div>
              <div className="text-right hidden sm:block relative z-10">
                <span className="material-symbols-outlined text-6xl text-white/20">qr_code_2</span>
              </div>
            </div>

            <div className="bg-slate-800/40 border border-white/5 p-8 rounded-[32px] flex flex-col justify-center">
              <div className="flex justify-between items-end mb-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Progress Tier</p>
                <p className="text-indigo-400 font-black text-xs">{tierName}</p>
              </div>
              <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${Math.min((activeMitraCount / (stats.next_tier_req_mitra || 10)) * 100, 100)}%` }} />
              </div>
              <p className="text-[9px] text-slate-500 mt-3 italic text-center">
                {activeMitraCount} / {stats.next_tier_req_mitra || 10} mitra aktif
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon="ads_click" label="Klik" value={formatNum(stats.total_clicks)} sub="Total klik link Anda" color="#ddb7ff" />
            <StatCard icon="shopping_cart" label="Order" value={formatNum(stats.total_orders)} sub={`${stats.total_orders_pending || 0} menunggu bayar`} color="#fabc4e" />
            <StatCard icon="payments" label="Saldo Aktif" value={formatRp(stats.balance)} sub={`Pending: ${formatRp(stats.pending_commission)}`} color="#4ade80" />
            <StatCard icon="groups" label="Tim Aktif" value={formatNum(stats.total_downline)} sub={`${activeMitraCount} aktif bulan ini`} color="#f43f5e" />
          </div>

          {/* Join Team Section (Only if no upline) */}
          {!data?.affiliate?.upline_id && (
            <div className="p-8 rounded-[32px] bg-slate-800/40 border border-indigo-500/20 backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl group-hover:bg-indigo-600/20 transition-all duration-500" />
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                    <span className="material-symbols-outlined text-4xl">group_add</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-white italic">Gabung Tim Affiliate</h4>
                    <p className="text-slate-400 text-xs mt-1">Masukkan kode referral upline Anda untuk bergabung ke jaringan.</p>
                  </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    placeholder="KODE REFERRAL"
                    value={joinRefCode}
                    onChange={(e) => setJoinRefCode(e.target.value.toUpperCase())}
                    className="bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-black tracking-widest outline-none focus:border-indigo-500/50 w-full md:w-48"
                  />
                  <button
                    onClick={handleJoinTeam}
                    disabled={joining || !joinRefCode.trim()}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-indigo-600/20 whitespace-nowrap"
                  >
                    {joining ? 'JOINING...' : 'GABUNG TIM'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recent Commissions & Quick Action */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-8 bg-slate-800/40 border border-white/5 rounded-[32px]">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-400 text-lg">history</span> Komisi Terakhir
                </h4>
                <button onClick={() => window.open('/affiliate/commissions', '_self')} className="text-[10px] text-slate-500 font-bold hover:text-indigo-400 uppercase tracking-tighter">Lihat Semua</button>
              </div>
              <div className="space-y-4">
                {!data?.recent_commissions?.length ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    <span className="material-symbols-outlined text-3xl block mb-2">receipt_long</span>
                    Belum ada komisi. Bagikan link affiliate Anda!
                  </div>
                ) : (
                  data.recent_commissions.map((comm, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-900/40 rounded-2xl border border-white/5 hover:bg-slate-900/60 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${comm.status === 'approved' ? 'text-emerald-400' : comm.status === 'pending' ? 'text-amber-400' : 'text-blue-400'}`}>
                          <span className="material-symbols-outlined text-xl">
                            {comm.status === 'approved' ? 'check_circle' : comm.status === 'pending' ? 'hourglass_empty' : 'payments'}
                          </span>
                        </div>
                        <div>
                          <p className="text-white text-[12px] font-bold">{comm.product_name}</p>
                          <p className="text-slate-500 text-[10px] uppercase tracking-tighter mt-1">
                            {comm.status === 'approved' ? 'Disetujui' : comm.status === 'pending' ? 'Dalam Hold' : 'Sudah Cair'} · {new Date(comm.created_at).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                      </div>
                      <p className={`font-black text-xs ${comm.status === 'approved' ? 'text-emerald-400' : 'text-amber-400'}`}>+{formatRp(comm.amount)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-8 bg-indigo-600/10 border border-indigo-500/20 rounded-[32px] text-center">
                <span className="material-symbols-outlined text-4xl text-indigo-400 mb-4">rocket_launch</span>
                <h5 className="text-white font-bold text-sm mb-2">Tips Hari Ini</h5>
                <p className="text-slate-400 text-[11px] leading-relaxed">Bagikan link ke komunitas untuk konversi lebih tinggi!</p>
              </div>
              <div className="p-8 bg-slate-800/40 border border-white/5 rounded-[32px]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-lg">emoji_events</span>
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold">Top Partner</p>
                    <p className="text-[9px] text-slate-500 uppercase">Leaderboard</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed italic mb-4">"Semakin banyak membantu orang, semakin besar rezeki mengalir."</p>
                <button onClick={() => window.open('/affiliate/leaderboard', '_self')} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white text-[10px] font-black hover:bg-white/10 transition-all uppercase">Cek Peringkat</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-2 space-y-6">
            {journeyData?.voucher && (
              <div className="p-6 rounded-[32px] bg-gradient-to-r from-amber-500 to-orange-600 border border-amber-400/30 shadow-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-white">
                  <span className="material-symbols-outlined text-4xl animate-bounce">redeem</span>
                  <div>
                    <h4 className="font-black text-lg">HADIAH HARI KE-25! 🎁</h4>
                    <p className="text-xs opacity-90">Pakai kode ini saat checkout stok berikutnya.</p>
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/30 text-white font-black text-sm">
                  {journeyData?.voucher ? journeyData.voucher.split(' - ')[0] : 'No Voucher'}
                </div>
              </div>
            )}

            <div className="p-10 rounded-[40px] bg-gradient-to-br from-rose-500 to-rose-600 relative overflow-hidden shadow-2xl">
              <div className="relative z-10 text-center">
                <p className="text-rose-100 text-xs font-bold tracking-[0.3em] uppercase mb-4">Hari Ke-{journeyData?.day_count || 1}</p>
                <h2 className="text-2xl md:text-3xl font-black text-white leading-tight italic">
                  "{journeyData?.affirmations?.[(journeyData?.day_count || 0) % 5] || 'Kulitmu sedang berproses, hargai setiap langkahnya.'}"
                </h2>
              </div>
              <div className="absolute -right-20 -bottom-20 opacity-10"><span className="material-symbols-outlined text-[300px] text-white">favorite</span></div>
            </div>

            <div className="p-8 bg-slate-800/40 border border-white/5 rounded-[32px] backdrop-blur-xl">
              {/* Header + Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-400">monitoring</span>
                    {filterMonth 
                      ? `Skin Progress - ${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][filterMonth - 1]}`
                      : 'Skin Progress Chart'
                    }
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    {currentWeekNumber ? `Minggu ke-${currentWeekNumber} dari perjalananmu` : 'Pantau perubahan kulitmu'}
                    {alreadyUploadedThisWeek && <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold">✓ Sudah upload minggu ini</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Year filter */}
                  <select
                    value={filterYear}
                    onChange={e => { setFilterYear(Number(e.target.value)); setFilterMonth(null); }}
                    className="px-3 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-rose-400 cursor-pointer"
                  >
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  {/* Month filter */}
                  <select
                    value={filterMonth ?? ''}
                    onChange={e => setFilterMonth(e.target.value === '' ? null : Number(e.target.value))}
                    className="px-3 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-rose-400 cursor-pointer"
                  >
                    <option value="">Semua Bulan</option>
                    {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'].map((m,i) => (
                      <option key={i} value={i+1}>{m}</option>
                    ))}
                  </select>
                  {alreadyUploadedThisWeek ? (
                    <div className="px-4 py-2 bg-slate-700/50 text-slate-400 rounded-xl text-xs font-black border border-white/5">🔒 Buka Minggu Depan</div>
                  ) : (
                    <button onClick={() => setShowTracker(!showTracker)} className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-black transition-all cursor-pointer">
                      {showTracker ? 'TUTUP' : '+ UPLOAD'}
                    </button>
                  )}
                </div>
              </div>

              {alreadyUploadedThisWeek && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-400 text-2xl">task_alt</span>
                  <div>
                    <p className="text-emerald-300 font-bold text-sm">Mantap! Progres minggu ke-{currentWeekNumber} sudah tercatat.</p>
                    <p className="text-slate-400 text-xs">Kamu bisa upload lagi mulai minggu depan 💪</p>
                  </div>
                </div>
              )}

              {showTracker && !alreadyUploadedThisWeek && (
                <div className="mb-8 p-6 bg-slate-900/50 rounded-3xl border border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Kondisi Kulit ({trackerForm.skin_score}/10)</label>
                      <input type="range" min="1" max="10" className="w-full accent-rose-500" value={trackerForm.skin_score} onChange={e => setTrackerForm({ ...trackerForm, skin_score: parseInt(e.target.value) })} />
                      <div className="flex justify-between text-[9px] text-slate-600 mt-1"><span>Parah</span><span>Sempurna</span></div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Emosi ({trackerForm.emotional_score}/10)</label>
                      <input type="range" min="1" max="10" className="w-full accent-indigo-500" value={trackerForm.emotional_score} onChange={e => setTrackerForm({ ...trackerForm, emotional_score: parseInt(e.target.value) })} />
                      <div className="flex justify-between text-[9px] text-slate-600 mt-1"><span>Stres</span><span>Bahagia</span></div>
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Foto Kulit (Opsional — AI Analysis)</label>
                    <div onClick={() => document.getElementById('skin-photo-input').click()} className="w-full py-8 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-all">
                      {skinPhoto ? (
                        <div className="text-center">
                          <span className="material-symbols-outlined text-emerald-400 text-3xl">check_circle</span>
                          <p className="text-white text-xs font-bold mt-2">{skinPhoto.name}</p>
                          <button onClick={(e) => { e.stopPropagation(); setSkinPhoto(null); }} className="text-rose-400 text-[10px] uppercase font-bold mt-1">Ganti Foto</button>
                        </div>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-slate-500 text-3xl">add_a_photo</span>
                          <p className="text-slate-400 text-[10px] font-bold uppercase">Klik untuk upload foto wajah</p>
                          <p className="text-slate-600 text-[9px]">AI akan menganalisis kondisi kulitmu</p>
                        </>
                      )}
                    </div>
                    <input id="skin-photo-input" type="file" hidden accept="image/*" onChange={e => setSkinPhoto(e.target.files[0])} />
                  </div>
                  <button onClick={handleSaveProgress} disabled={analyzing} className="w-full py-4 bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 disabled:opacity-60 text-white font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer">
                    {analyzing ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menganalisis...</> : <>{skinPhoto ? '🤖 ANALISIS AI & SIMPAN' : '💾 SIMPAN PROGRESS'}</>}
                  </button>
                </div>
              )}

              {aiAnalysis && (
                <div className="mb-6 p-6 bg-gradient-to-br from-indigo-900/40 to-violet-900/30 rounded-3xl border border-indigo-500/20">
                  <p className="text-indigo-300 font-black text-xs uppercase tracking-widest mb-4">🤖 Hasil Analisis AI</p>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[{ label: 'Skor Kulit', value: `${aiAnalysis.skin_score}/10`, color: '#22c55e' }, { label: 'Kemerahan', value: `${aiAnalysis.redness}%`, color: '#ef4444' }, { label: 'Kelembapan', value: `${aiAnalysis.moisture}%`, color: '#3b82f6' }].map(m => (
                      <div key={m.label} className="bg-slate-900/50 rounded-2xl p-3 text-center border border-white/5">
                        <p className="font-black text-lg" style={{ color: m.color }}>{m.value}</p>
                        <p className="text-slate-500 text-[9px] uppercase font-bold mt-1">{m.label}</p>
                      </div>
                    ))}
                  </div>
                  {aiAnalysis.summary && <p className="text-slate-300 text-xs leading-relaxed mb-3">{aiAnalysis.summary}</p>}
                  {aiAnalysis.healing_message && <p className="text-rose-300 text-xs italic font-semibold">💕 {aiAnalysis.healing_message}</p>}
                </div>
              )}

              {/* Premium Bar Chart with Filters */}
              {(() => {
                const allLogs = journeyData?.progress_logs || [];
                const filteredLogs = allLogs.filter(p => {
                  const d = new Date(p.created_at);
                  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return false;
                  if (d.getFullYear() !== filterYear) return false;
                  if (filterMonth !== null && (d.getMonth() + 1) !== filterMonth) return false;
                  return true;
                });

                if (allLogs.length === 0) return (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="material-symbols-outlined text-slate-700 text-5xl mb-3">bar_chart</span>
                    <p className="text-slate-500 text-sm font-bold">Belum ada data progres</p>
                    <p className="text-slate-600 text-xs mt-1">Upload progress pertamamu untuk mulai tracking</p>
                  </div>
                );

                if (filteredLogs.length === 0) return (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="material-symbols-outlined text-slate-700 text-4xl mb-3">search_off</span>
                    <p className="text-slate-500 text-sm font-bold">Tidak ada data untuk periode ini</p>
                    <p className="text-slate-600 text-xs mt-1">Coba pilih bulan atau tahun yang berbeda</p>
                  </div>
                );

                const avgSkin = (filteredLogs.reduce((s,p) => s + p.skin_score, 0) / filteredLogs.length).toFixed(1);
                const avgEmosi = (filteredLogs.reduce((s,p) => s + (p.emotional_score||0), 0) / filteredLogs.length).toFixed(1);
                const bestLog = [...filteredLogs].sort((a,b) => b.skin_score - a.skin_score)[0];

                return (
                  <div>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      {[
                        { label: 'Rata-rata Kulit', value: `${avgSkin}/10`, icon: 'face', color: '#f43f5e' },
                        { label: 'Rata-rata Emosi', value: `${avgEmosi}/10`, icon: 'sentiment_very_satisfied', color: '#6366f1' },
                        { label: 'Skor Terbaik', value: `${bestLog?.skin_score || '-'}/10`, icon: 'emoji_events', color: '#f59e0b' },
                      ].map(s => (
                        <div key={s.label} className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 text-center">
                          <span className="material-symbols-outlined text-xl mb-1" style={{ color: s.color }}>{s.icon}</span>
                          <p className="font-black text-lg text-white">{s.value}</p>
                          <p className="text-slate-500 text-[9px] uppercase font-bold mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Bar Chart */}
                    <div className="flex items-end gap-2 h-36 mb-2">
                      {filteredLogs.map((log, i) => {
                        const wNum = Math.max(1, log.week_number);
                        const isCurrent = wNum === currentWeekNumber;
                        const heightPct = `${log.skin_score * 10}%`;
                        const d = new Date(log.created_at);
                        const dateLabel = `${d.getDate()}/${d.getMonth()+1}`;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                            {/* Tooltip */}
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[9px] text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              Kulit: {log.skin_score}/10 · Emosi: {log.emotional_score || '-'}/10
                            </div>
                            <div className="w-full bg-slate-700/30 rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: '120px' }}>
                              <div
                                className={`w-full rounded-t-lg transition-all duration-700 ${isCurrent ? 'bg-gradient-to-t from-rose-600 to-rose-400' : 'bg-gradient-to-t from-indigo-700 to-indigo-500/80'}`}
                                style={{ height: heightPct }}
                              />
                            </div>
                            <div className="text-center">
                              <span className={`text-[9px] font-black ${isCurrent ? 'text-rose-400' : 'text-slate-500'}`}>W{wNum}</span>
                              <p className="text-[8px] text-slate-600">{dateLabel}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-gradient-to-t from-rose-600 to-rose-400"/><span className="text-[10px] text-slate-400">Minggu Ini</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-gradient-to-t from-indigo-700 to-indigo-500"/><span className="text-[10px] text-slate-400">Minggu Lalu</span></div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Riwayat Upload Detail */}
            <div className="p-8 bg-slate-800/40 border border-white/5 rounded-[32px] backdrop-blur-xl">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-white font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-400">history</span>
                  Riwayat Upload
                </h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Total {journeyData?.progress_logs?.length || 0} Record
                </p>
              </div>

              <div className="space-y-4">
                {journeyData?.progress_logs?.length > 0 ? (
                  [...journeyData.progress_logs].reverse().map((log, i) => (
                    <div key={i} className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-slate-900/60 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {log.selfie_url ? (
                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 group-hover:border-rose-500/50 transition-colors">
                              <img 
                                src={log.selfie_url} 
                                alt={`Week ${log.week_number}`} 
                                className="w-full h-full object-cover"
                                onClick={() => window.open(log.selfie_url, '_blank')}
                                style={{ cursor: 'zoom-in' }}
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center">
                              <p className="text-[9px] text-indigo-300 font-black leading-none uppercase">Week</p>
                              <p className="text-lg text-white font-black leading-none mt-1">{log.week_number}</p>
                            </div>
                          )}
                          {log.selfie_url && (
                             <div className="absolute -top-1 -left-1 w-5 h-5 bg-indigo-600 rounded-full border-2 border-slate-800 flex items-center justify-center text-[9px] font-black text-white">
                                {log.week_number}
                             </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white text-xs font-bold">{new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                              log.skin_score >= 8 ? 'bg-emerald-500/20 text-emerald-400' :
                              log.skin_score >= 5 ? 'bg-amber-500/20 text-amber-400' :
                              'bg-rose-500/20 text-rose-400'
                            }`}>
                              {log.skin_score >= 8 ? '✨ Sehat' : log.skin_score >= 5 ? '⚠️ Cukup' : '🔴 Parah'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                              log.emotional_score > 7 ? 'bg-indigo-500/20 text-indigo-300' :
                              log.emotional_score > 4 ? 'bg-slate-500/20 text-slate-400' :
                              'bg-orange-500/20 text-orange-400'
                            }`}>
                              {log.emotional_score > 7 ? '😊 Happy' : log.emotional_score > 4 ? '😐 Normal' : '😰 Stres'}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[10px] mt-1 line-clamp-1 italic">{log.notes || 'Tidak ada catatan tambahan'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-black text-sm ${
                          log.skin_score >= 8 ? 'text-emerald-400' :
                          log.skin_score >= 5 ? 'text-amber-400' :
                          'text-rose-400'
                        }`}>{log.skin_score}/10</p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase">Skin Score</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <p className="text-slate-600 text-xs italic">Belum ada riwayat upload</p>
                  </div>
                )}
              </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-800/40 border border-white/5 rounded-3xl">
                <h4 className="text-white font-bold mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-rose-400">edit_note</span> Jurnal Harian</h4>
                <textarea className="w-full h-24 bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-rose-400" placeholder="Curhat hari ini..." value={journalText} onChange={(e) => setJournalText(e.target.value)} />
                <button onClick={handlePostJournal} disabled={savingJournal || !journalText} className="w-full mt-4 py-3 bg-slate-700 text-white font-black text-xs rounded-xl disabled:opacity-50">KIRIM JURNAL</button>
              </div>
              <div className="p-6 bg-slate-800/40 border border-white/5 rounded-3xl flex flex-col justify-center text-center">
                <h4 className="text-white font-bold mb-2">Skin Warrior</h4>
                <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-4">Level Anda</p>
                <p className="text-3xl font-black text-indigo-400">{journeyData?.stats?.level_name || 'Mitra'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-8 rounded-[32px] bg-slate-800/40 border border-white/5 text-center">
              <span className={`material-symbols-outlined text-4xl mb-4 ${ritualActive ? 'animate-ping text-rose-400' : 'animate-pulse text-rose-500/50'}`}>self_improvement</span>
              <h4 className="text-white font-bold mb-2 text-sm uppercase tracking-widest">Ritual 60 Detik</h4>
              <p className="text-slate-400 text-[10px] leading-relaxed mb-6 italic">
                {ritualActive ? 'Ucapkan: "Terima kasih kulitku sudah bertahan sejauh ini."' : '"Sambil mengoleskan krim, syukuri setiap inci kulitmu."'}
              </p>
              <button onClick={() => { setRitualActive(true); toast('Ritual Dimulai... Tarik nafas dalam.', { icon: '🧘‍♀️' }); }} disabled={ritualActive} className={`w-full py-4 rounded-2xl text-[10px] font-black transition-all ${ritualActive ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600'}`}>
                {ritualActive ? `SISA WAKTU: ${ritualSeconds} DETIK` : 'MULAI RITUAL'}
              </button>
            </div>
            <div className="p-6 rounded-[32px] bg-slate-800/40 border border-white/5 text-center">
              <button onClick={() => { console.log("Modal: showQR"); setShowQR(true); }} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-[10px] font-bold tracking-widest uppercase hover:bg-white/10 transition-all cursor-pointer">Digital Barcode</button>
            </div>
            <div className="p-6 rounded-[32px] bg-slate-800/40 border border-white/5">
              <h4 className="text-white font-bold mb-5 flex items-center gap-2 text-xs uppercase tracking-widest"><span className="material-symbols-outlined text-amber-400 text-sm">school</span> Edukasi</h4>
              {journeyData?.education?.slice(0, 2).map((edu, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-900/40 border border-white/5 mb-3">
                  <p className="text-white text-[11px] font-bold mb-1">{edu.title}</p>
                  <p className="text-slate-500 text-[9px] line-clamp-1">{edu.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showQR && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md" onClick={() => setShowQR(false)} />
          <div className="relative bg-white p-10 rounded-[40px] text-center max-w-sm w-full">
            <h3 className="text-slate-900 font-black text-xl mb-6">My Digital Journey</h3>
            <div className="p-4 bg-slate-100 rounded-3xl inline-block"><img src={qrUrl} alt="QR" className="w-48 h-48" /></div>
            <button onClick={() => setShowQR(false)} className="mt-8 text-slate-400 font-bold text-xs uppercase tracking-widest">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
