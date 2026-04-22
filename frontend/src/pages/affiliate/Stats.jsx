import { useState, useEffect } from 'react';
import { fetchJson, AFFILIATE_API_BASE } from '../../lib/api';

const formatRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

export default function StatusMitra() {
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null); // { success, message }
  const [storeName, setStoreName] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchJson(`${AFFILIATE_API_BASE}/merchant-eligibility`)
      .then(res => setEligibility(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleApply = async () => {
    if (!storeName.trim()) {
      setApplyResult({ success: false, message: 'Nama toko tidak boleh kosong.' });
      return;
    }
    setApplying(true);
    setApplyResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/affiliate/apply-merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ store_name: storeName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal mengajukan');
      setApplyResult({ success: true, message: data.message });
      setShowForm(false);
    } catch (err) {
      setApplyResult({ success: false, message: err.message });
    } finally {
      setApplying(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
    </div>
  );

  const mitraProgress = Math.min(100, ((eligibility?.active_mitra || 0) / 100) * 100);
  const turnoverProgress = Math.min(100, ((eligibility?.monthly_turnover || 0) / 10000000) * 100);
  const isEligible = eligibility?.is_eligible;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight">
          Status Mitra &amp; Omset Tim
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Pantau progres tim untuk naik level menjadi Merchant Akuglow.
        </p>
      </div>

      {/* Apply result banner */}
      {applyResult && (
        <div
          className="flex items-start gap-3 p-4 rounded-2xl text-sm font-medium"
          style={{
            background: applyResult.success ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
            border: `1px solid ${applyResult.success ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            color: applyResult.success ? '#4ade80' : '#f87171',
          }}
        >
          <span className="material-symbols-outlined text-lg flex-shrink-0">
            {applyResult.success ? 'check_circle' : 'error'}
          </span>
          {applyResult.message}
        </div>
      )}

      {/* Progress Cards */}
      <div
        className="rounded-2xl p-6 space-y-6"
        style={{
          background: 'rgba(35,41,60,0.4)',
          border: '1px solid rgba(77,67,84,0.15)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white font-['Plus_Jakarta_Sans']">Syarat Naik Jadi Merchant</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Penuhi kedua syarat di bawah untuk mengajukan upgrade.
            </p>
          </div>
          {isEligible && !applyResult?.success && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
            >
              <span className="material-symbols-outlined text-sm">storefront</span>
              Ajukan Jadi Merchant 🚀
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mitra aktif */}
          <div className="rounded-xl p-5" style={{ background: 'rgba(12,19,36,0.5)' }}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mitra Aktif (Downline)</span>
              <span className="text-sm font-black" style={{ color: mitraProgress >= 100 ? '#4ade80' : '#b76dff' }}>
                {eligibility?.active_mitra || 0} / 100
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${mitraProgress}%`,
                  background: mitraProgress >= 100
                    ? 'linear-gradient(90deg,#4ade80,#22d3ee)'
                    : 'linear-gradient(90deg,#7c3aed,#b76dff)',
                }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Minimal 100 mitra aktif di tim Anda.</p>
          </div>

          {/* Omset tim */}
          <div className="rounded-xl p-5" style={{ background: 'rgba(12,19,36,0.5)' }}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Omset Tim (30 Hari)</span>
              <span className="text-sm font-black" style={{ color: turnoverProgress >= 100 ? '#4ade80' : '#fabc4e' }}>
                {formatRp(eligibility?.monthly_turnover)} / 10jt
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${turnoverProgress}%`,
                  background: turnoverProgress >= 100
                    ? 'linear-gradient(90deg,#4ade80,#22d3ee)'
                    : 'linear-gradient(90deg,#f59e0b,#fabc4e)',
                }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Capai Rp10.000.000 omset tim per bulan.</p>
          </div>
        </div>

        {!isEligible && (
          <div
            className="flex items-start gap-3 p-4 rounded-xl text-sm"
            style={{ background: 'rgba(250,188,78,0.08)', border: '1px solid rgba(250,188,78,0.15)' }}
          >
            <span className="text-xl mt-0.5">💡</span>
            <div>
              <p className="font-bold text-amber-300 text-xs uppercase tracking-widest mb-1">Tips Naik Level</p>
              <p className="text-slate-400 text-xs leading-relaxed">
                Bagikan link affiliate lebih aktif dan bimbing tim Anda. Gunakan menu{' '}
                <strong className="text-white">Edukasi Bisnis</strong> untuk strategi membangun tim yang solid.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Apply Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-5"
            style={{ background: '#151b2d', border: '1px solid rgba(124,58,237,0.3)' }}
          >
            <div>
              <h3 className="text-lg font-black text-white font-['Plus_Jakarta_Sans']">Ajukan Upgrade ke Merchant</h3>
              <p className="text-slate-400 text-xs mt-1">
                Pengajuan akan ditinjau tim Akuglow dalam 3–5 hari kerja.
              </p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                Nama Toko / Outlet
              </label>
              <input
                type="text"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                placeholder="cth: Toko Kecantikan Anisa"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500 transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowForm(false); setApplyResult(null); }}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-white transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Batal
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="flex-1 py-3 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}
              >
                {applying ? 'Mengirim...' : 'Kirim Pengajuan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: '📦', title: 'Pusat Distribusi', desc: 'Jadi titik distribusi bagi mitra di wilayah Anda.' },
          { icon: '💰', title: 'Komisi Distribusi', desc: 'Komisi tambahan dari setiap barang yang keluar lewat toko Anda.' },
          { icon: '🌟', title: '2 Sumber Income', desc: 'Komisi distribusi (supply) + komisi affiliate (penjualan) sekaligus.' },
        ].map(b => (
          <div
            key={b.title}
            className="rounded-2xl p-5 text-center"
            style={{ background: 'rgba(35,41,60,0.4)', border: '1px solid rgba(77,67,84,0.15)' }}
          >
            <div className="text-3xl mb-3">{b.icon}</div>
            <h4 className="font-black text-white text-xs uppercase tracking-widest mb-2">{b.title}</h4>
            <p className="text-xs text-slate-400">{b.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
