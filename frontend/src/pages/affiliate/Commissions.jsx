import React, { useState, useEffect, useCallback } from 'react';
import { fetchJson, AFFILIATE_API_BASE } from '../../lib/api';

const formatRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const STATUS_CONFIG = {
  pending: { color: '#fabc4e', label: 'Pending', bg: '#fabc4e18', icon: 'schedule' },
  approved: { color: '#4ade80', label: 'Disetujui', bg: '#4ade8018', icon: 'check_circle' },
  paid: { color: '#60a5fa', label: 'Dibayar', bg: '#60a5fa18', icon: 'payments' },
  rejected: { color: '#f87171', label: 'Ditolak', bg: '#f8717118', icon: 'cancel' },
  cancelled: { color: '#94a3b8', label: 'Dibatalkan', bg: '#94a3b818', icon: 'block' },
};

const StatusBadge = ({ status }) => {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ color: c.color, background: c.bg }}
    >
      <span className="material-symbols-outlined text-xs">{c.icon}</span>
      {c.label}
    </span>
  );
};

export default function AffiliateCommissions() {
  const [commissions, setCommissions] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchCommissions = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'all'
        ? `${AFFILIATE_API_BASE}/commissions`
        : `${AFFILIATE_API_BASE}/commissions?status=${filter}`;
      const res = await fetchJson(url);
      const data = Array.isArray(res.data) ? res.data : [];
      setCommissions(data);

      // Calculate summary
      const s = { total: 0, pending: 0, approved: 0, paid: 0 };
      data.forEach((c) => {
        s.total += c.amount || 0;
        if (c.status === 'pending') s.pending += c.amount || 0;
        if (c.status === 'approved') s.approved += c.amount || 0;
        if (c.status === 'paid') s.paid += c.amount || 0;
      });
      setSummary(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  const baseStyle = {
    background: 'rgba(35, 41, 60, 0.4)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(77, 67, 84, 0.15)',
  };

  const filters = [
    { key: 'all', label: 'Semua' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Disetujui' },
    { key: 'paid', label: 'Dibayar' },
    { key: 'rejected', label: 'Ditolak' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white font-['Plus_Jakarta_Sans']">
          Riwayat <span style={{ background: 'linear-gradient(135deg, #ddb7ff, #b76dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Komisi</span>
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">Detail semua komisi dari referral Anda</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Komisi', value: formatRp(summary.total), color: '#ddb7ff' },
          { label: 'Pending', value: formatRp(summary.pending), color: '#fabc4e' },
          { label: 'Disetujui', value: formatRp(summary.approved), color: '#4ade80' },
          { label: 'Dibayar', value: formatRp(summary.paid), color: '#60a5fa' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4" style={baseStyle}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={
              filter === f.key
                ? { background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: 'white' }
                : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={baseStyle}>
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold font-['Plus_Jakarta_Sans']">Daftar Komisi</h3>
            <p className="text-slate-400 text-xs mt-0.5">{commissions.length} entri</p>
          </div>
          <button
            onClick={fetchCommissions}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
          </div>
        ) : commissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <span className="material-symbols-outlined text-5xl mb-3 opacity-30">receipt_long</span>
            <p className="text-sm font-semibold">Tidak ada komisi ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Produk', 'Nilai Pesanan', 'Rate', 'Komisi', 'Status', 'Tanggal', 'Kadaluarsa Hold'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commissions.map((c, i) => (
                  <tr
                    key={c.id || i}
                    className="hover:bg-white/3 transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm text-white font-semibold">{c.product_name || '—'}</p>
                      <p className="text-xs text-slate-500 font-mono">{c.order_id?.slice(0, 8)}...</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-300">
                      {formatRp(c.gross_amount)}
                    </td>
                    <td className="px-5 py-4 text-sm text-purple-300 font-bold">
                      {c.rate_applied ? `${(c.rate_applied * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-5 py-4 text-sm font-black text-green-400">
                      {formatRp(c.amount)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {c.hold_until
                        ? new Date(c.hold_until).toLocaleDateString('id-ID', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div
        className="p-4 rounded-xl flex items-start gap-3"
        style={{ background: 'rgba(250, 188, 78, 0.08)', border: '1px solid rgba(250, 188, 78, 0.2)' }}
      >
        <span className="material-symbols-outlined text-amber-400 text-lg mt-0.5">info</span>
        <div className="text-xs text-slate-400 leading-relaxed">
          <span className="font-bold text-amber-300 block mb-1">Ketentuan Komisi</span>
          Komisi berstatus <strong className="text-amber-300">Pending</strong> akan dihold selama masa garansi. Setelah disetujui, komisi siap dicairkan. Komisi dibayarkan maksimal 7 hari kerja setelah permintaan penarikan diproses.
        </div>
      </div>
    </div>
  );
}
