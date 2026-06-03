import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchJson, AFFILIATE_API_BASE, API_BASE } from '../../lib/api';
import { getStoredUser } from '../../lib/auth';

const formatRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const cardStyle = {
  background: 'rgba(35, 41, 60, 0.4)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(77, 67, 84, 0.15)',
};

export default function AffiliateStatus() {
  const user = getStoredUser();
  const [tiers, setTiers] = useState([]);
  const [eligibility, setEligibility] = useState(null);
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTierId, setActiveTierId] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [tierData, elig, teamStats, profData] = await Promise.all([
          fetchJson(`${API_BASE}/api/public/membership-tiers`).catch(() => []),
          fetchJson(`${AFFILIATE_API_BASE}/merchant-eligibility`).catch(() => null),
          fetchJson(`${AFFILIATE_API_BASE}/team-stats`).catch(() => null),
          fetchJson(`${AFFILIATE_API_BASE}/profile`).catch(() => null),
        ]);
        
        setTiers(Array.isArray(tierData) ? tierData : []);
        setEligibility(elig);
        setStats(teamStats);
        if (profData?.status === 'success') {
          setProfile(profData.affiliate);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleApplyMerchant = async () => {
    if (!confirm('Ajukan permohonan upgrade ke Merchant? Admin akan meninjau dalam 1-3 hari kerja.')) return;
    setApplying(true);
    try {
      await fetchJson(`${AFFILIATE_API_BASE}/apply-merchant`, { method: 'POST' });
      setSuccessMsg('Permohonan berhasil dikirim! Admin akan menghubungi Anda.');
    } catch (_err) {
      alert('Gagal mengajukan: ' + _err.message);
    } finally {
      setApplying(false);
    }
  };

  const currentTierName = profile?.tier?.name?.toLowerCase() || user?.affiliate?.membership_tier?.name?.toLowerCase() || '';
  const currentTierIdx = tiers.findIndex(t => t.name?.toLowerCase() === currentTierName);
  const currentTier = tiers[currentTierIdx >= 0 ? currentTierIdx : 0] || (tiers.length > 0 ? tiers[0] : { name: 'Mitra Dasar', level: 1 });
  const nextTier = (currentTierIdx >= 0 && currentTierIdx + 1 < tiers.length) ? tiers[currentTierIdx + 1] : null;

  const totalDownlines = stats?.total_downlines || 0;
  const activeMitra = stats?.active_mitra || 0; // Actual active count (with tx in last 30 days)
  const totalNetworkMitra = eligibility?.active_mitra || 0; // Total network size used for merchant eligibility
  const monthlyTurnover = eligibility?.monthly_turnover || 0;
  const directMitra = eligibility?.direct_mitra || 0;
  const totalTransactions = eligibility?.total_transactions || 0;
  const performancePoints = eligibility?.performance_points || 0;
  const isEligibleMerchant = eligibility?.is_eligible || false;
  const refCode = (profile?.ref_code || user?.affiliate_ref_code || user?.affiliate?.ref_code || 'AG-REF').toUpperCase();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight">
          Status <span style={{ background: 'linear-gradient(135deg, #ddb7ff, #b76dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Mitra</span>
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">Pantau jenjang karir dan progres Anda sebagai Mitra AkuGlow</p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl flex items-center gap-3 text-green-300"
          style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
          <span className="material-symbols-outlined">check_circle</span>
          <p className="text-sm font-semibold">{successMsg}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-10 h-10 rounded-full border-4 border-purple-500/30 border-t-purple-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Current Status Card */}
          <div className="rounded-2xl p-6" style={{
            ...cardStyle,
            border: `1px solid ${currentTier.color}40`,
            background: `linear-gradient(135deg, rgba(35,41,60,0.6), rgba(35,41,60,0.3))`,
          }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
                  style={{ background: `${currentTier.color}20`, border: `2px solid ${currentTier.color}60` }}>
                  <span className="material-symbols-outlined text-4xl" style={{ color: currentTier.color }}>
                    {currentTier.icon || 'military_tech'}
                  </span>
                </div>
                {user?.role === 'merchant' && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center border-2 border-[#0c1324]">
                    <span className="material-symbols-outlined text-xs text-black">check</span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-black text-white font-['Plus_Jakarta_Sans']"
                    style={{ color: currentTier.color }}>{currentTier.name}</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                    style={{ background: `${currentTier.color}20`, color: currentTier.color, border: `1px solid ${currentTier.color}40` }}>
                    {user?.role === 'merchant' ? 'Aktif Merchant' : 'Mitra Aktif'}
                  </span>
                </div>
                <p className="text-slate-400 text-sm mb-3">{currentTier.description || '-'}</p>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div>
                    <p className="text-slate-500 uppercase tracking-wider font-bold">Kode Referral</p>
                    <p className="text-white font-black tracking-wider mt-0.5">{refCode}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 uppercase tracking-wider font-bold">Total Downline</p>
                    <p className="text-white font-black mt-0.5">{totalDownlines} mitra</p>
                  </div>
                  <div>
                    <p className="text-slate-500 uppercase tracking-wider font-bold">Mitra Aktif</p>
                    <p className="text-green-400 font-black mt-0.5">{activeMitra} mitra</p>
                  </div>
                  <div>
                    <p className="text-slate-500 uppercase tracking-wider font-bold">Omset Tim/Bulan</p>
                    <p className="text-amber-400 font-black mt-0.5">{formatRp(monthlyTurnover)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress ke tier berikutnya — semua 5 requirement */}
          {nextTier && (
            <div className="rounded-2xl p-5" style={{ ...cardStyle, border: `1px solid ${nextTier.color}30` }}>
              <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm" style={{ color: nextTier.color }}>trending_up</span>
                Progres ke <span style={{ color: nextTier.color }}>{nextTier.name}</span>
              </h3>
              <div className="space-y-3">
                {/* Mitra Aktif */}
                {nextTier.min_active_mitra > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    <span>Mitra Jaringan</span>
                    <span>{totalNetworkMitra}/{nextTier.min_active_mitra}</span>
                  </div>
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min((totalNetworkMitra / (nextTier.min_active_mitra || 1)) * 100, 100)}%`, background: nextTier.color }} />
                  </div>
                </div>
                )}
                {/* Omset Tim */}
                {nextTier.min_monthly_turnover > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    <span>Omset Tim/Bulan</span>
                    <span>{formatRp(monthlyTurnover)} / {formatRp(nextTier.min_monthly_turnover)}</span>
                  </div>
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min((monthlyTurnover / (nextTier.min_monthly_turnover || 1)) * 100, 100)}%`, background: '#fbbf24' }} />
                  </div>
                </div>
                )}
                {/* Referral Langsung */}
                {nextTier.min_referrals > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    <span>Referral Langsung</span>
                    <span>{directMitra}/{nextTier.min_referrals}</span>
                  </div>
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min((directMitra / (nextTier.min_referrals || 1)) * 100, 100)}%`, background: '#38bdf8' }} />
                  </div>
                </div>
                )}
                {/* Total Transaksi */}
                {nextTier.min_total_transactions > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    <span>Total Transaksi</span>
                    <span>{totalTransactions}/{nextTier.min_total_transactions}</span>
                  </div>
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min((totalTransactions / (nextTier.min_total_transactions || 1)) * 100, 100)}%`, background: '#a78bfa' }} />
                  </div>
                </div>
                )}
                {/* Performance Points */}
                {nextTier.min_performance_points > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    <span>Poin Performa</span>
                    <span>{performancePoints}/{nextTier.min_performance_points}</span>
                  </div>
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min((performancePoints / (nextTier.min_performance_points || 1)) * 100, 100)}%`, background: '#f472b6' }} />
                  </div>
                </div>
                )}
              </div>
            </div>
          )}

          {/* Career Ladder — dari API */}
          <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
            <div>
              <h3 className="text-white font-bold font-['Plus_Jakarta_Sans']">Jenjang Karir Mitra</h3>
              <p className="text-slate-400 text-xs mt-0.5">Semakin tinggi jenjang, semakin besar komisi yang Anda dapatkan</p>
            </div>

            <div className="space-y-3">
              {tiers.map((tier, idx) => {
                const isCurrentTier = idx === (currentTierIdx >= 0 ? currentTierIdx : 0);
                const isPassed = idx < (currentTierIdx >= 0 ? currentTierIdx : 0);
                const isNext = idx === (currentTierIdx >= 0 ? currentTierIdx : 0) + 1;
                const isExpanded = activeTierId === tier.id;

                return (
                  <div key={tier.id}
                    onClick={() => setActiveTierId(prev => prev === tier.id ? null : tier.id)}
                    className="p-4 rounded-xl transition-all duration-300 cursor-pointer select-none"
                    style={{
                      background: isCurrentTier ? `${tier.color}12` : 'rgba(255,255,255,0.02)',
                      border: isCurrentTier ? `1px solid ${tier.color}40` : '1px solid rgba(255,255,255,0.05)',
                    }}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${tier.color}20`, opacity: isPassed || isCurrentTier ? 1 : 0.5 }}>
                        <span className="material-symbols-outlined text-xl" style={{ color: tier.color }}>
                          {isPassed ? 'check_circle' : (tier.icon || 'military_tech')}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-sm" style={{ color: isCurrentTier ? tier.color : isPassed ? '#4ade80' : '#64748b' }}>
                            {tier.name}
                          </p>
                          {isCurrentTier && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{ background: `${tier.color}20`, color: tier.color }}>Posisi Anda</span>
                          )}
                          {isNext && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>Berikutnya</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{tier.description || '-'}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-[10px] flex-shrink-0 hidden sm:block">
                          <p className="text-slate-500">Min {tier.min_active_mitra} mitra aktif</p>
                          <p className="text-slate-500">{formatRp(tier.min_monthly_turnover)}/bln</p>
                        </div>
                        <span className="material-symbols-outlined text-slate-500 transition-transform duration-300"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                          expand_more
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-[fadeIn_0.2s_ease-out]">
                        {/* Commission Rate */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-center">
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Komisi Dasar</p>
                          <p className="text-sm font-black text-white mt-1">{(tier.base_commission_rate * 100).toFixed(1).replace('.0', '')}%</p>
                        </div>

                        {/* Mitra Jaringan */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-center">
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Mitra Jaringan</p>
                          <p className="text-sm font-black text-white mt-1">{tier.min_active_mitra} mitra</p>
                        </div>

                        {/* Omset Bulanan */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-center">
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Omset Bulanan</p>
                          <p className="text-sm font-black text-white mt-1">{formatRp(tier.min_monthly_turnover)}</p>
                        </div>

                        {/* Referral Langsung */}
                        {tier.min_referrals > 0 && (
                          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-center">
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Referral Langsung</p>
                            <p className="text-sm font-black text-white mt-1">{tier.min_referrals} mitra</p>
                          </div>
                        )}

                        {/* Total Transactions */}
                        {tier.min_total_transactions > 0 && (
                          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-center">
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Min. Transaksi</p>
                            <p className="text-sm font-black text-white mt-1">{tier.min_total_transactions} trx</p>
                          </div>
                        )}

                        {/* Performance Points */}
                        {tier.min_performance_points > 0 && (
                          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-center">
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Poin Performa</p>
                            <p className="text-sm font-black text-white mt-1">{tier.min_performance_points} pts</p>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Merchant Upgrade CTA */}
          {!user?.role?.includes('merchant') && (
            <div className="rounded-2xl p-6" style={{
              ...cardStyle,
              border: isEligibleMerchant ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(183, 109, 255, 0.2)',
            }}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-white font-bold font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-purple-400">storefront</span>
                    Upgrade ke Merchant
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Jadilah pusat distribusi untuk mitra lain dan dapatkan komisi distribusi tambahan.
                  </p>
                  {/* Requirement dari tier Merchant di API */}
                  {tiers.find(t => t.name?.toLowerCase() === 'merchant') && (() => {
                    const merchantTier = tiers.find(t => t.name?.toLowerCase() === 'merchant');
                    return (
                      <div className="flex flex-wrap gap-3 mt-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: totalNetworkMitra >= merchantTier.min_active_mitra ? '#4ade80' : '#64748b' }} />
                          <span className="text-slate-400">{merchantTier.min_active_mitra} mitra jaringan ({totalNetworkMitra}/{merchantTier.min_active_mitra})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: monthlyTurnover >= merchantTier.min_monthly_turnover ? '#4ade80' : '#64748b' }} />
                          <span className="text-slate-400">Omset {formatRp(merchantTier.min_monthly_turnover)}/bln ({formatRp(monthlyTurnover)})</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex-shrink-0">
                  {isEligibleMerchant ? (
                    <button onClick={handleApplyMerchant} disabled={applying}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)', color: '#000' }}>
                      {applying ? (
                        <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                      )}
                      <span className="text-black font-black">{applying ? 'Mengirim...' : 'Ajukan Sekarang'}</span>
                    </button>
                  ) : (
                    <div className="px-6 py-3 rounded-xl text-sm font-bold text-slate-500 border border-slate-700">
                      Belum Eligible
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Team Saya', icon: 'groups', path: '/affiliate/team', color: '#b76dff' },
              { label: 'Omset Tim', icon: 'monitoring', path: '/affiliate/stats', color: '#4ade80' },
              { label: 'Komisi', icon: 'account_balance_wallet', path: '/affiliate/commissions', color: '#fbbf24' },
              { label: 'Link Saya', icon: 'link', path: '/affiliate/links', color: '#38bdf8' },
            ].map(q => (
              <Link key={q.path} to={q.path}
                className="p-4 rounded-2xl flex flex-col items-center gap-2 text-center transition-all hover:scale-105"
                style={{ ...cardStyle, border: `1px solid ${q.color}20` }}>
                <span className="material-symbols-outlined text-2xl" style={{ color: q.color }}>{q.icon}</span>
                <span className="text-xs font-bold text-slate-300">{q.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
