import { useState, useEffect } from 'react';
import { fetchJson, AFFILIATE_API_BASE } from '../../lib/api';

const formatRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const medals = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Leaderboard sekarang public — tidak perlu auth
    fetchJson(`${AFFILIATE_API_BASE}/leaderboard`)
      .then(res => {
        setData(Array.isArray(res) ? res : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight">
          Leaderboard
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Top 10 Mitra Berprestasi AkuGlow.</p>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(35,41,60,0.4)',
          border: '1px solid rgba(77,67,84,0.15)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-4 p-6 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.05)' }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(250,188,78,0.15)' }}
          >
            🏆
          </div>
          <div>
            <h2 className="font-black text-white font-['Plus_Jakarta_Sans']">Mitra Berprestasi</h2>
            <p className="text-slate-400 text-xs mt-0.5">Berdasarkan total komisi semua waktu.</p>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <span className="material-symbols-outlined text-5xl mb-3 opacity-30">emoji_events</span>
            <p className="text-sm">Belum ada data leaderboard.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
            {data.map((item, idx) => (
              <div
                key={item.ref_code || idx}
                className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-white/[0.02]"
                style={idx === 0 ? { background: 'rgba(250,188,78,0.05)' } : {}}
              >
                {/* Rank */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black flex-shrink-0"
                  style={{
                    background: idx < 3
                      ? ['rgba(250,188,78,0.2)', 'rgba(160,160,160,0.15)', 'rgba(180,120,60,0.15)'][idx]
                      : 'rgba(255,255,255,0.05)',
                    color: idx < 3 ? ['#fabc4e', '#94a3b8', '#c97c3a'][idx] : '#64748b',
                    fontSize: idx < 3 ? '18px' : '14px',
                  }}
                >
                  {idx < 3 ? medals[idx] : item.rank}
                </div>

                {/* Avatar + Info */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#b76dff,#7c3aed)' }}
                >
                  {(item.full_name || 'M').charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm truncate">{item.full_name}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {item.tier_name} Partner · {item.total_sales} penjualan
                  </p>
                </div>

                {/* Earnings */}
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Komisi</p>
                  <p
                    className="font-black text-sm"
                    style={{ color: idx === 0 ? '#fabc4e' : '#b76dff' }}
                  >
                    {formatRp(item.total_earned)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
