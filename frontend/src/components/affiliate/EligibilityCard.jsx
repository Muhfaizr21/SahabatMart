import React from 'react';

const formatRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const EligibilityCard = ({ eligibility, totalMitra, activeMitra, monthlyTurnover, cardStyle, directMitra, totalTransactions, performancePoints }) => {
  if (!eligibility) return null;

  const reqMitra = eligibility?.requirements?.min_mitra || 100;
  const reqTurnover = eligibility?.requirements?.min_turnover || 10000000;
  // [Sync Fix] Semua 5 requirement sekarang sinkron dengan MembershipTier backend
  const reqDirect = eligibility?.requirements?.min_referrals || 0;
  const reqTransactions = eligibility?.requirements?.min_total_transactions || 0;
  const reqPerformance = eligibility?.requirements?.min_performance_points || 0;
  const mitraProgress = Math.min((totalMitra / reqMitra) * 100, 100);
  const turnoverProgress = Math.min((monthlyTurnover / reqTurnover) * 100, 100);
  const directProgress = reqDirect > 0 ? Math.min((directMitra / reqDirect) * 100, 100) : 100;
  const transProgress = reqTransactions > 0 ? Math.min((totalTransactions / reqTransactions) * 100, 100) : 100;
  const perfProgress = reqPerformance > 0 ? Math.min((performancePoints / reqPerformance) * 100, 100) : 100;
  const isEligible = eligibility?.is_eligible;

  // Count how many requirements are met
  const reqsMet = [
    reqMitra === 0 || totalMitra >= reqMitra,
    reqTurnover === 0 || monthlyTurnover >= reqTurnover,
    reqDirect === 0 || directMitra >= reqDirect,
    reqTransactions === 0 || totalTransactions >= reqTransactions,
    reqPerformance === 0 || performancePoints >= reqPerformance,
  ].filter(Boolean).length;
  const totalReqs = [reqMitra > 0, reqTurnover > 0, reqDirect > 0, reqTransactions > 0, reqPerformance > 0].filter(Boolean).length;

  return (
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
              : `Penuhi ${totalReqs} syarat berikut untuk naik jenjang`}
          </p>
        </div>
        {isEligible && (
          <span className="px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider"
            style={{ background: '#4ade8018', color: '#4ade80', border: '1px solid #4ade8030' }}>
            ✓ Eligible
          </span>
        )}
      </div>

      {/* Dynamic requirements from MembershipTier backend — all 5 params */}
      {reqMitra > 0 && (
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex flex-col">
            <span className="text-xs text-slate-300 font-semibold">Total Jaringan (Mitra Aktif)</span>
            <span className="text-[10px] text-slate-500">Seluruh keturunan tim Anda</span>
          </div>
          <span className="text-xs font-black" style={{ color: totalMitra >= reqMitra ? '#4ade80' : '#b76dff' }}>
            {totalMitra} / {reqMitra}
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{
            width: `${mitraProgress}%`,
            background: totalMitra >= reqMitra ? 'linear-gradient(90deg, #4ade80, #22c55e)' : 'linear-gradient(90deg, #7c3aed, #b76dff)'
          }} />
        </div>
      </div>
      )}

      {reqTurnover > 0 && (
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-300 font-semibold">Omset Tim / Bulan</span>
          <span className="text-xs font-black" style={{ color: monthlyTurnover >= reqTurnover ? '#4ade80' : '#fabc4e' }}>
            {formatRp(monthlyTurnover)} / {formatRp(reqTurnover)}
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{
            width: `${turnoverProgress}%`,
            background: monthlyTurnover >= reqTurnover ? 'linear-gradient(90deg, #4ade80, #22c55e)' : 'linear-gradient(90deg, #f59e0b, #fabc4e)'
          }} />
        </div>
      </div>
      )}

      {reqDirect > 0 && (
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-300 font-semibold">Referral Langsung (Mitra Sendiri)</span>
          <span className="text-xs font-black" style={{ color: directMitra >= reqDirect ? '#4ade80' : '#b76dff' }}>
            {directMitra} / {reqDirect}
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{
            width: `${directProgress}%`,
            background: directMitra >= reqDirect ? 'linear-gradient(90deg, #4ade80, #22c55e)' : 'linear-gradient(90deg, #7c3aed, #b76dff)'
          }} />
        </div>
      </div>
      )}

      {reqTransactions > 0 && (
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-300 font-semibold">Total Transaksi Sukses</span>
          <span className="text-xs font-black" style={{ color: totalTransactions >= reqTransactions ? '#4ade80' : '#b76dff' }}>
            {totalTransactions} / {reqTransactions}
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{
            width: `${transProgress}%`,
            background: totalTransactions >= reqTransactions ? 'linear-gradient(90deg, #4ade80, #22c55e)' : 'linear-gradient(90deg, #7c3aed, #b76dff)'
          }} />
        </div>
      </div>
      )}

      {reqPerformance > 0 && (
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-300 font-semibold">Poin Performa</span>
          <span className="text-xs font-black" style={{ color: performancePoints >= reqPerformance ? '#4ade80' : '#b76dff' }}>
            {performancePoints} / {reqPerformance}
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{
            width: `${perfProgress}%`,
            background: performancePoints >= reqPerformance ? 'linear-gradient(90deg, #4ade80, #22c55e)' : 'linear-gradient(90deg, #7c3aed, #b76dff)'
          }} />
        </div>
      </div>
      )}

      {/* Summary progress */}
      {!isEligible && totalReqs > 2 && (
        <div className="text-center">
          <span className="text-xs text-slate-500">{reqsMet}/{totalReqs} syarat terpenuhi</span>
        </div>
      )}
    </div>
  );
};

export default EligibilityCard;
