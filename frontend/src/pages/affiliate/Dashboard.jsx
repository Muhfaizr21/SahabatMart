import React, { useState, useEffect, useCallback } from 'react';
import { fetchJson, AFFILIATE_API_BASE } from '../../lib/api';
import { getStoredUser } from '../../lib/auth';
import toast from 'react-hot-toast';

const formatRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 0 });

const formatNum = (n) => Number(n || 0).toLocaleString('id-ID');

const StatCard = ({ icon, label, value, sub, color }) => (
  <div
    className="relative overflow-hidden rounded-2xl p-6 group hover:scale-[1.02] transition-all duration-300"
    style={{
      background: 'rgba(35, 41, 60, 0.4)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(77, 67, 84, 0.15)',
    }}
  >
    <div
      className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"
      style={{ background: color }}
    />
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 rounded-xl" style={{ background: `${color}20` }}>
        <span className="material-symbols-outlined" style={{ color, fontVariationSettings: "'FILL' 0" }}>
          {icon}
        </span>
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

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchJson(`${AFFILIATE_API_BASE}/dashboard`);
      setData(res);
    } catch (err) { toast.error('Gagal memuat dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-400 animate-spin" />
    </div>
  );

  const stats = data?.stats || {};

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight">
          Halo, <span style={{ background: 'linear-gradient(135deg, #ddb7ff, #b76dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.profile?.full_name || 'Mitra'}!</span>
          <span className="ml-3 text-[10px] bg-white/10 px-2 py-1 rounded text-white/50 tracking-widest font-black">ULTIMATE HUB</span>
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Selamat datang di Pusat Kendali Mitra AkuGlow. Pantau performa bisnis Anda secara real-time.</p>
      </div>

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {/* Quick Referral Area */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-8 rounded-3xl bg-gradient-to-br from-indigo-600/20 to-purple-600/10 border border-indigo-500/20 shadow-2xl shadow-indigo-500/5">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <span className="material-symbols-outlined text-4xl">share_reviews</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-400 tracking-[0.2em] uppercase mb-1">Kode Referral Anda</p>
              <p className="text-3xl font-black text-white tracking-[0.2em]">{user?.affiliate_ref_code || 'AGL-REF'}</p>
            </div>
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(user?.affiliate_ref_code); 
              toast.success('Kode Referral Berhasil Disalin!');
            }} 
            className="w-full sm:w-auto px-10 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl text-xs font-black transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
          >
            SALIN KODE SEKARANG
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
           <StatCard icon="ads_click" label="Total Klik" value={formatNum(stats.total_clicks)} sub="Traffic ke link Anda" color="#ddb7ff" />
           <StatCard icon="shopping_cart" label="Total Order" value={formatNum(stats.total_orders)} sub="Konversi berhasil" color="#fabc4e" />
           <StatCard icon="payments" label="Saldo Siap" value={formatRp(stats.balance)} sub="Siap ditarik" color="#4ade80" />
           <StatCard icon="schedule" label="Pending" value={formatRp(stats.pending_commission)} sub="Menunggu verifikasi" color="#ffcc33" />
           <StatCard icon="account_balance_wallet" label="Ditarik" value={formatRp(stats.total_withdrawn)} sub="Total penarikan" color="#60a5fa" />
        </div>

        {/* Informational Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="p-8 rounded-[40px] bg-slate-800/40 border border-white/5 backdrop-blur-xl relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-white font-black text-lg mb-2">Tips Hari Ini</h4>
              <p className="text-slate-400 text-sm leading-relaxed">Bagikan hasil Skin Journey Anda ke media sosial untuk meningkatkan kepercayaan calon pembeli. Konten asli 3x lebih efektif!</p>
              <button className="mt-6 text-indigo-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all">
                Pelajari Teknik Promosi <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[120px] text-white/5 rotate-12">tips_and_updates</span>
          </div>

          <div className="p-8 rounded-[40px] bg-indigo-600 shadow-2xl shadow-indigo-600/20 relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-white font-black text-lg mb-2">Butuh Bantuan?</h4>
              <p className="text-indigo-100 text-sm leading-relaxed">Tim support kami siap membantu kendala teknis atau pertanyaan seputar komisi Anda 24/7.</p>
              <button className="mt-6 px-6 py-2.5 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                Hubungi Admin
              </button>
            </div>
            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[120px] text-white/10 -rotate-12">support_agent</span>
          </div>
        </div>
      </div>
    </div>
  );
}
