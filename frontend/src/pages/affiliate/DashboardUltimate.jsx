import React, { useState, useEffect, useCallback } from 'react';
import { fetchJson, AFFILIATE_API_BASE, API_BASE, formatImage } from '../../lib/api';
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
  const stats = data?.stats || {};
  const tierName = data?.affiliate?.tier?.name || user?.affiliate?.membership_tier?.name || 'Mitra Dasar';
  const activeMitraCount = stats.active_mitra_count || 0;
  const [joining, setJoining] = useState(false);
  const [joinRefCode, setJoinRefCode] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchJson(`${AFFILIATE_API_BASE}/dashboard`);
      setData(res);
    } catch (err) {
      console.error('Affiliate Dashboard Load Error:', err);
      toast.error('Gagal memuat data dasbor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleJoinTeam = async () => {
    if (!joinRefCode.trim()) return;
    setJoining(true);
    try {
      await fetchJson(`${AFFILIATE_API_BASE}/join-team`, {
        method: 'POST',
        body: JSON.stringify({ ref_code: joinRefCode })
      });
      toast.success('Berhasil bergabung dengan tim!');
      setJoinRefCode('');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.message || 'Gagal bergabung tim');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-400 animate-spin" />
    </div>
  );

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
      </div>

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
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-900/40 rounded-2xl border border-white/5 hover:bg-slate-900/60 transition-all group">
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
    </div>
  );
}
