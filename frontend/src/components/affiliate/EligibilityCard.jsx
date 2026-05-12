import React from 'react';

const formatRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const EligibilityCard = ({ eligibility, totalMitra, activeMitra, monthlyTurnover, cardStyle }) => {
  if (!eligibility) return null;

  const reqMitra = eligibility?.requirements?.min_mitra || 100;
  const reqTurnover = eligibility?.requirements?.min_turnover || 10000000;
  const mitraProgress = Math.min((totalMitra / reqMitra) * 100, 100);
  const turnoverProgress = Math.min((monthlyTurnover / reqTurnover) * 100, 100);
  const isEligible = eligibility?.is_eligible;

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

      {/* Mitra Total Progress */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex flex-col">
            <span className="text-xs text-slate-300 font-semibold">Progres Total Affiliate</span>
            <span className="text-[10px] text-slate-500">Seluruh jaringan tim Anda</span>
          </div>
          <span className="text-xs font-black" style={{ color: totalMitra >= reqMitra ? '#4ade80' : '#b76dff' }}>
            {totalMitra} / {reqMitra}
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${mitraProgress}%`,
              background: totalMitra >= reqMitra
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
  );
};

export default EligibilityCard;
