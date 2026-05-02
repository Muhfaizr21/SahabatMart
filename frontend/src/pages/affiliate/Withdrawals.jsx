import React, { useState, useEffect, useCallback } from 'react';
import { fetchJson, AFFILIATE_API_BASE } from '../../lib/api';

const formatRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const STATUS_CONFIG = {
  pending: { color: '#fabc4e', label: 'Menunggu', bg: '#fabc4e18', icon: 'schedule' },
  processed: { color: '#60a5fa', label: 'Diproses', bg: '#60a5fa18', icon: 'autorenew' },
  completed: { color: '#4ade80', label: 'Selesai', bg: '#4ade8018', icon: 'check_circle' },
  rejected: { color: '#f87171', label: 'Ditolak', bg: '#f8717118', icon: 'cancel' },
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

export default function AffiliateWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [config, setConfig] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, dRes, cRes] = await Promise.all([
        fetchJson(`${AFFILIATE_API_BASE}/withdrawals`),
        fetchJson(`${AFFILIATE_API_BASE}/dashboard`),
        fetchJson(`${API_BASE}/api/public/config`),
      ]);
      setWithdrawals(Array.isArray(wRes) ? wRes : []);
      setBalance(dRes?.stats?.balance || 0);
      setConfig(cRes || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const amt = parseFloat(amount);
    const minWithdrawal = parseFloat(config.payout_min_amount || 50000);
    if (isNaN(amt) || amt < minWithdrawal) {
      setError(`Minimum penarikan adalah Rp ${Number(minWithdrawal).toLocaleString('id-ID')}`);
      return;
    }
    if (amt > balance) {
      setError('Jumlah melebihi saldo tersedia');
      return;
    }
    setRequesting(true);
    try {
      await fetchJson(`${AFFILIATE_API_BASE}/withdrawals/request`, {
        method: 'POST',
        body: JSON.stringify({ amount: amt }),
      });
      setSuccess('Permintaan penarikan berhasil! Tim kami akan memproses dalam 1-3 hari kerja.');
      setAmount('');
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'Gagal mengirim permintaan');
    } finally {
      setRequesting(false);
    }
  };

  const baseStyle = {
    background: 'rgba(35, 41, 60, 0.4)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(77, 67, 84, 0.15)',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white font-['Plus_Jakarta_Sans']">
          Penarikan <span style={{ background: 'linear-gradient(135deg, #ddb7ff, #b76dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Komisi</span>
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">Cairkan komisi Anda ke rekening bank</p>
      </div>

      {/* Balance Card */}
      <div
        className="p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-5"
        style={{
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(91, 33, 182, 0.15))',
          border: '1px solid rgba(167, 139, 250, 0.2)',
        }}
      >
        <div>
          <p className="text-[10px] font-bold text-purple-400 tracking-[0.2em] uppercase mb-1">
            Saldo Tersedia
          </p>
          <p className="text-4xl font-black text-white font-['Plus_Jakarta_Sans']">
            {formatRp(balance)}
          </p>
          <p className="text-slate-400 text-xs mt-2">Minimum penarikan: Rp {Number(config.payout_min_amount || 50000).toLocaleString('id-ID')}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={balance < 50000}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
        >
          <span className="material-symbols-outlined">account_balance_wallet</span>
          Tarik Sekarang
        </button>
      </div>

      {/* Alert messages */}
      {success && (
        <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
          <span className="material-symbols-outlined text-green-400">check_circle</span>
          <p className="text-sm text-green-300">{success}</p>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
          <span className="material-symbols-outlined text-red-400">error</span>
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Withdrawal Form */}
      {showForm && (
        <div className="rounded-2xl p-6" style={baseStyle}>
          <h3 className="text-white font-bold mb-2 font-['Plus_Jakarta_Sans']">Form Penarikan</h3>
          <p className="text-slate-400 text-xs mb-5">
            Dana akan ditransfer ke rekening yang terdaftar di profil Anda
          </p>
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Jumlah Penarikan
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
                <input
                  type="text"
                  value={amount ? Number(amount).toLocaleString('id-ID') : ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setAmount(val);
                  }}
                  placeholder={(config.payout_min_amount || 50000).toLocaleString('id-ID')}
                  className="w-full pl-12 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 border outline-none transition-all focus:border-purple-500"
                  style={{
                    background: 'rgba(12, 19, 36, 0.6)',
                    border: '1px solid rgba(77, 67, 84, 0.3)',
                  }}
                />
              </div>
              <div className="flex gap-2 mt-2">
                {[50000, 100000, 250000, 500000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(Math.min(preset, balance).toString())}
                    disabled={preset > balance}
                    className="px-3 py-1 rounded-lg text-[10px] font-bold transition-all disabled:opacity-30"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}
                  >
                    {formatRp(preset)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmount(Math.floor(balance).toString())}
                  disabled={balance < (config.payout_min_amount || 50000)}
                  className="px-3 py-1 rounded-lg text-[10px] font-bold transition-all disabled:opacity-30"
                  style={{ background: 'rgba(124, 58, 237, 0.2)', color: '#ddb7ff' }}
                >
                  Max
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={requesting}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
              >
                {requesting ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-sm">send</span>
                )}
                {requesting ? 'Mengirim...' : 'Kirim Permintaan'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(''); }}
                className="px-6 py-3 rounded-xl text-sm font-bold text-slate-400 border border-slate-600/30 hover:border-slate-500 transition-all"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Withdrawal History */}
      <div className="rounded-2xl overflow-hidden" style={baseStyle}>
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold font-['Plus_Jakarta_Sans']">Riwayat Penarikan</h3>
            <p className="text-slate-400 text-xs mt-0.5">{withdrawals.length} transaksi</p>
          </div>
          <button
            onClick={fetchData}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <span className="material-symbols-outlined text-5xl mb-3 opacity-30">account_balance_wallet</span>
            <p className="text-sm font-semibold">Belum ada riwayat penarikan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Jumlah', 'Bank', 'No. Rekening', 'Status', 'Tanggal', 'Diproses'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w, i) => (
                  <tr
                    key={w.id || i}
                    className="hover:bg-white/3 transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  >
                    <td className="px-5 py-4 text-base font-black text-green-400">
                      {formatRp(w.amount)}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-300">{w.bank_name || '—'}</td>
                    <td className="px-5 py-4 text-sm font-mono text-slate-400">
                      {w.account_number || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={w.status} />
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(w.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {w.processed_at
                        ? new Date(w.processed_at).toLocaleDateString('id-ID', {
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

      {/* Note */}
      <div
        className="p-4 rounded-xl flex items-start gap-3"
        style={{ background: 'rgba(96, 165, 250, 0.08)', border: '1px solid rgba(96, 165, 250, 0.2)' }}
      >
        <span className="material-symbols-outlined text-blue-400 text-lg mt-0.5">schedule</span>
        <div className="text-xs text-slate-400 leading-relaxed">
          <span className="font-bold text-blue-300 block mb-1">Proses Pembayaran</span>
          {config.payout_schedule === 'daily' ? (
            'Penarikan diproses setiap hari.'
          ) : config.payout_schedule === 'monthly' ? (
            'Penarikan diproses setiap awal bulan.'
          ) : (
            `Penarikan diproses secara ${config.payout_schedule || 'mingguan'} setiap hari ${config.payout_day || 'Senin dan Kamis'}.`
          )} Pastikan data rekening bank Anda sudah benar di halaman Pengaturan sebelum mengajukan penarikan.
        </div>
      </div>
    </div>
  );
}
