import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchJson, AFFILIATE_API_BASE } from '../../lib/api';
import { getStoredUser } from '../../lib/auth';

const formatRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 0 });

const formatNum = (n) => Number(n || 0).toLocaleString('id-ID');

const StatCard = ({ icon, label, value, sub, color, trend }) => (
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
      <div
        className="p-3 rounded-xl"
        style={{ background: `${color}20` }}
      >
        <span className="material-symbols-outlined" style={{ color, fontVariationSettings: "'FILL' 0" }}>
          {icon}
        </span>
      </div>
      {trend && (
        <span className="text-xs font-bold tracking-wider" style={{ color }}>
          {trend}
        </span>
      )}
    </div>
    <p className="text-slate-400 text-xs font-semibold uppercase tracking-[0.15em] mb-1">{label}</p>
    <h3 className="text-2xl font-black text-white font-['Plus_Jakarta_Sans']">{value}</h3>
    {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
  </div>
);

const BarChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
        Belum ada data komisi bulanan
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.commission), 1);
  return (
    <div className="flex items-end justify-between gap-2 h-40 px-2">
      {data.map((d, i) => {
        const pct = Math.max((d.commission / max) * 100, 4);
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 group">
            <div className="relative w-full flex items-end" style={{ height: '120px' }}>
              <div
                className="w-full rounded-t-lg transition-all duration-700 group-hover:opacity-90"
                style={{
                  height: `${pct}%`,
                  background: 'linear-gradient(to top, #b76dff, #7c3aed)',
                  boxShadow: '0 0 12px rgba(183, 109, 255, 0.3)',
                }}
              />
            </div>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider whitespace-nowrap">
              {d.month}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const CommissionStatusBadge = ({ status }) => {
  const cfg = {
    pending: { color: '#fabc4e', label: 'Pending', bg: '#fabc4e20' },
    approved: { color: '#4ade80', label: 'Disetujui', bg: '#4ade8020' },
    paid: { color: '#60a5fa', label: 'Dibayar', bg: '#60a5fa20' },
    rejected: { color: '#f87171', label: 'Ditolak', bg: '#f8717120' },
    cancelled: { color: '#94a3b8', label: 'Dibatalkan', bg: '#94a3b820' },
  };
  const c = cfg[status] || cfg.pending;
  return (
    <span
      className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider"
      style={{ color: c.color, background: c.bg }}
    >
      {c.label}
    </span>
  );
};

export default function AffiliateDashboard() {
  const user = getStoredUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchJson(`${AFFILIATE_API_BASE}/dashboard`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Gagal memuat dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const displayName = user?.profile?.full_name || user?.email?.split('@')[0] || 'Affiliate';
  const refCode = user?.affiliate_ref_code || data?.affiliate?.ref_code || 'SM-REF';
  const tierName = data?.affiliate?.tier?.name || 'Bronze';
  const tierRate = data?.affiliate?.tier?.base_commission_rate
    ? `${(data.affiliate.tier.base_commission_rate * 100).toFixed(1)}%`
    : '5%';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full border-4 border-purple-500/30 border-t-purple-400 animate-spin mx-auto mb-4"
          />
          <p className="text-slate-400 text-sm">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <span className="material-symbols-outlined text-red-400 text-5xl">error</span>
        <p className="text-slate-300">{error}</p>
        <button
          onClick={fetchDashboard}
          className="px-6 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const stats = data?.stats || {};
  const monthly = data?.monthly_data || [];
  const recentCommissions = data?.recent_commissions || [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-white font-['Plus_Jakarta_Sans'] tracking-tight">
          Halo, <span style={{ background: 'linear-gradient(135deg, #ddb7ff, #b76dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{displayName}!</span>
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Dashboard Affiliate — <span style={{ color: '#fabc4e' }}>{tierName}</span> Partner · Komisi {tierRate}
        </p>
      </div>

      {/* Ref Code Banner */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(91, 33, 182, 0.15))',
          border: '1px solid rgba(167, 139, 250, 0.2)',
        }}
      >
        <div>
          <p className="text-[10px] font-bold text-purple-400 tracking-[0.2em] uppercase mb-1">
            Kode Referral Anda
          </p>
          <p className="text-2xl font-black text-white tracking-widest">{refCode}</p>
          <p className="text-slate-400 text-xs mt-1">
            Bagikan kode ini untuk mulai mendapat komisi
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => {
              navigator.clipboard.writeText(refCode);
              alert('Kode referral disalin!');
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-purple-300 border border-purple-500/30 hover:bg-purple-500/10 transition-all"
          >
            <span className="material-symbols-outlined text-sm">content_copy</span>
            Salin Kode
          </button>
          <Link
            to="/affiliate/links"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
          >
            <span className="material-symbols-outlined text-sm">add_link</span>
            Buat Link
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon="ads_click"
          label="Total Klik"
          value={formatNum(stats.total_clicks)}
          color="#ddb7ff"
          trend="All time"
        />
        <StatCard
          icon="shopping_cart_checkout"
          label="Konversi"
          value={formatNum(stats.total_conversions)}
          color="#fabc4e"
          sub={`${stats.total_clicks > 0 ? ((stats.total_conversions / stats.total_clicks) * 100).toFixed(1) : 0}% CVR`}
        />
        <StatCard
          icon="payments"
          label="Komisi Tersedia"
          value={formatRp(stats.balance)}
          color="#4ade80"
          sub="Siap ditarik"
        />
        <StatCard
          icon="account_balance_wallet"
          label="Total Ditarik"
          value={formatRp(stats.total_withdrawn)}
          color="#60a5fa"
        />
      </div>

      {/* Charts & Recent splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div
          className="lg:col-span-2 rounded-2xl p-6"
          style={{
            background: 'rgba(35, 41, 60, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(77, 67, 84, 0.15)',
          }}
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-white font-bold font-['Plus_Jakarta_Sans']">Komisi Bulanan</h3>
              <p className="text-slate-400 text-xs mt-0.5">6 bulan terakhir</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-300"
              style={{ background: 'rgba(124, 58, 237, 0.15)' }}>
              <span className="material-symbols-outlined text-sm">bar_chart</span>
              Komisi
            </div>
          </div>
          <BarChart data={monthly} />
        </div>

        {/* Quick Info Card */}
        <div
          className="rounded-2xl p-6 flex flex-col"
          style={{
            background: 'rgba(35, 41, 60, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(77, 67, 84, 0.15)',
          }}
        >
          <h3 className="text-white font-bold font-['Plus_Jakarta_Sans'] mb-5">Ringkasan Komisi</h3>
          <div className="space-y-4 flex-1">
            <div
              className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'rgba(12, 19, 36, 0.4)' }}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-400 text-lg">pending</span>
                <span className="text-sm text-slate-300">Pending</span>
              </div>
              <span className="font-bold text-white text-sm">{formatRp(stats.pending_commission)}</span>
            </div>
            <div
              className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'rgba(12, 19, 36, 0.4)' }}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-green-400 text-lg">check_circle</span>
                <span className="text-sm text-slate-300">Disetujui</span>
              </div>
              <span className="font-bold text-white text-sm">{formatRp(stats.total_commission)}</span>
            </div>
            <div
              className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'rgba(12, 19, 36, 0.4)' }}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-400 text-lg">account_balance</span>
                <span className="text-sm text-slate-300">Dibayar</span>
              </div>
              <span className="font-bold text-white text-sm">{formatRp(stats.total_withdrawn)}</span>
            </div>
          </div>

          <Link
            to="/affiliate/withdrawals"
            className="mt-6 w-full py-3 rounded-xl text-sm font-bold text-center text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
          >
            Tarik Komisi
          </Link>
        </div>
      </div>

      {/* Recent Commissions Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(35, 41, 60, 0.4)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(77, 67, 84, 0.15)',
        }}
      >
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <div>
            <h3 className="text-white font-bold font-['Plus_Jakarta_Sans']">Komisi Terbaru</h3>
            <p className="text-slate-400 text-xs mt-0.5">5 transaksi terakhir</p>
          </div>
          <Link
            to="/affiliate/commissions"
            className="flex items-center gap-1 text-purple-400 text-sm font-bold hover:text-purple-300 transition-colors"
          >
            Lihat Semua
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>

        {recentCommissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <span className="material-symbols-outlined text-4xl mb-3 opacity-30">receipt_long</span>
            <p className="text-sm">Belum ada komisi. Mulai bagikan link afiliasi Anda!</p>
            <Link
              to="/affiliate/links"
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-purple-300 border border-purple-500/30 hover:bg-purple-500/10 transition-all"
            >
              Buat Link Sekarang
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255, 0.05)' }}>
                  {['Produk', 'Komisi', 'Status', 'Tanggal'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentCommissions.map((c, i) => (
                  <tr
                    key={c.id || i}
                    className="hover:bg-white/3 transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255, 0.03)' }}
                  >
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {c.product_name || 'Produk'}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-green-400">
                      {formatRp(c.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <CommissionStatusBadge status={c.status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(c.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
