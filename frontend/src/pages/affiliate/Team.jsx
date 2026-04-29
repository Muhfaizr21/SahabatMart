import { useState, useEffect } from 'react';
import { fetchJson, AFFILIATE_API_BASE } from '../../lib/api';

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

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamRes, eligRes] = await Promise.all([
        fetchJson(`${AFFILIATE_API_BASE}/team-stats`),
        fetchJson(`${AFFILIATE_API_BASE}/merchant-eligibility`).catch(() => null),
      ]);
      setStats(teamRes);
      if (eligRes) setEligibility(eligRes);
    } catch (err) {
      setError(err.message || 'Gagal memuat data tim');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  if (loading) return (
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
  const activeMitra = eligibility?.active_mitra || 0;
  const reqMitra = eligibility?.requirements?.min_mitra || 100;
  const monthlyTurnover = eligibility?.monthly_turnover || 0;
  const reqTurnover = eligibility?.requirements?.min_turnover || 10000000;
  const mitraProgress = Math.min((activeMitra / reqMitra) * 100, 100);
  const turnoverProgress = Math.min((monthlyTurnover / reqTurnover) * 100, 100);
  const isEligible = eligibility?.is_eligible;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight">
          Pusat <span style={{ background: 'linear-gradient(135deg, #ddb7ff, #b76dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Tim</span>
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">Pantau performa jaringan mitra di bawah Anda</p>
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
                  : 'Penuhi 2 syarat berikut untuk menjadi Merchant Akuglow'}
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
              <div>
                <span className="text-xs text-slate-300 font-semibold">Mitra Aktif</span>
                <span className="text-[10px] text-slate-500 ml-2">(min 1 transaksi/30 hari)</span>
              </div>
              <span className="text-xs font-black" style={{ color: activeMitra >= reqMitra ? '#4ade80' : '#b76dff' }}>
                {activeMitra} / {reqMitra}
              </span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${mitraProgress}%`,
                  background: activeMitra >= reqMitra
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

      {/* Team Table */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <div>
            <h3 className="text-white font-bold font-['Plus_Jakarta_Sans']">Daftar Anggota Tim</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {stats?.total_downlines || 0} total · <span className="text-green-400">{activeMitra} aktif</span> 30 hari ini
            </p>
          </div>
          <button
            onClick={loadStats}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>

        {!stats?.downlines?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <span className="material-symbols-outlined text-5xl mb-3 opacity-30">group_add</span>
            <p className="text-sm font-semibold mb-1">Belum ada anggota tim</p>
            <p className="text-xs text-center max-w-xs">
              Bagikan link affiliate Anda agar orang bergabung sebagai mitra dan masuk ke tim Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Nama Mitra', 'Status', 'Bergabung', 'Omset Pribadi'].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.downlines.map((m, idx) => (
                  <tr
                    key={m.user_id || idx}
                    className="hover:bg-white/3 transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #7c3aed, #b76dff)' }}
                        >
                          {(m.full_name || 'M').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{m.full_name || 'Mitra'}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{m.user_id?.slice(0, 8)}…</p>
                        </div>
                      </div>
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
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(m.joined_at).toLocaleDateString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-green-400">{formatRp(m.turnover)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <strong className="text-white">Merchant Akuglow</strong>.
        </div>
      </div>
    </div>
  );
}
