import React, { useState, useEffect, useCallback } from 'react';
import { ADMIN_API_BASE } from '../../lib/api';
import { toast } from 'react-hot-toast';
import FinanceConfigModal from '../../components/admin/FinanceConfigModal';
import LocationCRUD from '../../components/admin/LocationCRUD';

const API = ADMIN_API_BASE;
const idr = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
const pct = (part, total) => total > 0 ? ((part / total) * 100).toFixed(1) : '0.0';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID') : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—';

const PERIODS = [
  { value: 'all',   label: 'Semua' },
  { value: 'today', label: 'Hari Ini' },
  { value: 'week',  label: '7 Hari' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'year',  label: 'Tahun Ini' },
  { value: 'custom', label: 'Kustom' },
];

const MUTATION_TYPES = [
  { value: 'expense',  label: 'Pengeluaran' },
  { value: 'income',   label: 'Pemasukan' },
  { value: 'transfer', label: 'Transfer' },
];

// ─── ORDER STATUS MAP ──────────────────────────────────
const ORDER_STATUS = {
  completed:    { label: 'Selesai',      bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-200' },
  delivered:    { label: 'Diantar',         bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200' },
  shipped:      { label: 'Dikirim',         bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200' },
  ready_to_ship: { label: 'Siap Kirim',     bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200' },
  processing:   { label: 'Diproses',         bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  paid:         { label: 'Lunas',            bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200' },
  cancelled:    { label: 'Batal',           bg: 'bg-rose-50',    text: 'text-rose-700',   border: 'border-rose-200' },
  refunded:     { label: 'Refund',          bg: 'bg-pink-50',   text: 'text-pink-700',   border: 'border-pink-200' },
  pending:      { label: 'Menunggu',        bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
};
const smOrder = (s) => ORDER_STATUS[s] || { label: s, bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };

// ─── WALLET TX TYPE MAP ────────────────────────────────
const WALLET_TYPE = {
  sale_revenue:          { label: 'Penjualan',          bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
  sale_revenue_reversed: { label: 'Rev. Penjualan',      bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' },
  commission_earned:     { label: 'Komisi Affiliate',    bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  commission_reversed:   { label: 'Rev. Komisi',         bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200' },
  platform_fee:         { label: 'Fee Platform',         bg: 'bg-slate-50',  text: 'text-slate-700',  border: 'border-slate-200' },
  payout_outflow:       { label: 'Payout Keluar',        bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  payout_outflow_reversed: { label: 'Rev. Payout',       bg: 'bg-teal-50',  text: 'text-teal-700',  border: 'border-teal-200' },
  refund:               { label: 'Refund',               bg: 'bg-pink-50',   text: 'text-pink-700',   border: 'border-pink-200' },
  refund_deduction:     { label: 'Refund Keluar',        bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200' },
  deposit:             { label: 'Deposit',              bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200' },
  bonus:               { label: 'Bonus',                bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  adjustment:          { label: 'Adjustment',           bg: 'bg-slate-50',  text: 'text-slate-700',  border: 'border-slate-200' },
};
const smWallet = (s) => WALLET_TYPE[s] || { label: s.replace(/_/g,' '), bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };

// ─── MUTATION STATUS ──────────────────────────────────
const MUT_STATUS = {
  processed: { label: 'Diproses',  dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  pending:   { label: 'Direncanakan', dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};
const smMut = (s) => MUT_STATUS[s] || { label: s, dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };

// ─── ICON ─────────────────────────────────────────────
const Icon = ({ name, size = 16 }) => <i className={`bx ${name}`} style={{ fontSize: size }} />;

// ─── TAG ───────────────────────────────────────────────
const Tag = ({ label, meta }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${meta.bg} ${meta.text} border ${meta.border}`}>
    {label}
  </span>
);
const StatusDot = ({ status }) => {
  const m = smMut(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${m.bg} ${m.text} border ${m.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
};

// ─── CARD WRAPPER ─────────────────────────────────────
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>{children}</div>
);

// ─── SECTION HEADING ─────────────────────────────────
const Heading = ({ icon, title, badge, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
        <Icon name={icon} size={13} />
      </div>
      <span className="text-sm font-bold text-slate-800">{title}</span>
      {badge !== undefined && (
        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-900 text-white rounded-full">{badge}</span>
      )}
    </div>
    {action}
  </div>
);

// ─── CASH FLOW ROW ───────────────────────────────────
const CashRow = ({ label, amount, type, desc }) => {
  const isIn = type === 'in';
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0 group">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isIn ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
        <Icon name={isIn ? 'bx-arrow-to-bottom' : 'bx-arrow-to-top'} size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-slate-700 truncate">{label}</div>
        {desc && <div className="text-[10px] text-slate-400 truncate mt-0.5">{desc}</div>}
      </div>
      <div className={`text-sm font-extrabold shrink-0 ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isIn ? '+' : '-'} {idr(amount)}
      </div>
    </div>
  );
};

// ─── MINI BAR ─────────────────────────────────────────
const MiniBar = ({ value, max, color = 'bg-indigo-500' }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
      <div className={`h-1.5 rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
};

// ─── MUTATION FORM ───────────────────────────────────
const MutationForm = ({ locations, onSubmit, saving }) => {
  const [mut, setMut] = useState({ category: '', amount: '', description: '', type: 'expense', status: 'processed', from_location_id: '', to_location_id: '' });
  const handle = (e) => { e.preventDefault(); onSubmit(mut, () => setMut({ category: '', amount: '', description: '', type: 'expense', status: 'processed', from_location_id: '', to_location_id: '' })); };
  return (
    <form onSubmit={handle} className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipe</label>
          <select value={mut.type} onChange={e => setMut({...mut, type: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all">
            {MUTATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
          <select value={mut.status} onChange={e => setMut({...mut, status: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all">
            <option value="processed">Diproses</option>
            <option value="pending">Direncanakan</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kategori</label>
        <input type="text" value={mut.category} onChange={e => setMut({...mut, category: e.target.value})} placeholder="Contoh: Operasional" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-300" />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nominal (Rp)</label>
        <input type="number" value={mut.amount} onChange={e => setMut({...mut, amount: e.target.value})} placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-extrabold text-slate-900 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-300" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dari</label>
          <select value={mut.from_location_id} onChange={e => setMut({...mut, from_location_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all">
            <option value="">—</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ke</label>
          <select value={mut.to_location_id} onChange={e => setMut({...mut, to_location_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all">
            <option value="">—</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Catatan</label>
        <textarea rows="2" value={mut.description} onChange={e => setMut({...mut, description: e.target.value})} placeholder="Opsional..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400 transition-all resize-none placeholder:text-slate-300" />
      </div>
      <button type="submit" disabled={saving} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2">
        {saving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        <Icon name="bx-save" size={13} /> Simpan
      </button>
    </form>
  );
};

// ─── MAIN ────────────────────────────────────────────
export default function AdminFinance() {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing]  = useState(false);
  const [period, setPeriod]          = useState('all');
  const [dateFrom, setDateFrom]      = useState('');
  const [dateTo, setDateTo]          = useState('');
  const [showConfig, setShowConfig]  = useState(false);
  const [saving, setSaving]           = useState(false);
  const [activeTab, setActiveTab]     = useState('cashflow');
  const [activeDetailTab, setActiveDetailTab] = useState('orders');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    let pParam = period;
    if (period === 'custom') {
      if (!dateFrom || !dateTo) { setLoading(false); setRefreshing(false); return; }
      pParam = `${dateFrom}:${dateTo}`;
    }
    try {
      const r = await fetch(`${API}/finance/revenue-detail?period=${pParam}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'ngrok-skip-browser-warning': 'true' }
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      setData(await r.json());
    } catch (err) { toast.error('Gagal memuat data'); console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  }, [period, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmitMutation = async (mut, resetFn) => {
    if (!mut.category || !mut.amount) { toast.error('Kategori & nominal wajib diisi'); return; }
    setSaving(true);
    try {
      const r = await fetch(`${API}/finance/mutation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ ...mut, amount: Number(mut.amount), from_location_id: mut.from_location_id ? Number(mut.from_location_id) : null, to_location_id: mut.to_location_id ? Number(mut.to_location_id) : null }),
      });
      if (r.ok) { toast.success('Mutasi dicatat'); if (resetFn) resetFn(); fetchData(true); }
      else toast.error(await r.text());
    } catch { toast.error('Gagal mencatat'); }
    finally { setSaving(false); }
  };

  const handleDeleteMutation = async (id) => {
    try {
      const r = await fetch(`${API}/finance/mutation?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'ngrok-skip-browser-warning': 'true' } });
      if (r.ok) { toast.success('Mutasi dihapus'); fetchData(true); }
      else toast.error(await r.text());
    } catch { toast.error('Gagal menghapus'); }
  };

  // ─── DATA ─────────────────────────────────────────
  const gross        = data?.gross_revenue       || 0;
  const capitalCost  = data?.capital_cost         || 0;
  const grossProfit = data?.gross_profit          || 0;
  const netProfit   = data?.net_profit            || 0;
  const totalSaved  = data?.data_saving?.total    || 0;
  const locations   = data?.locations              || [];
  const cf          = data?.cash_flow             || {};
  const bal         = data?.balance              || {};
  const walletBal   = data?.wallet_balances       || [];
  const dailyFlow   = data?.daily_flow            || [];
  const cashInItems  = cf.cash_in_items           || [];
  const cashOutItems = cf.cash_out_items          || [];
  const totalCashIn  = cf.total_cash_in           || 0;
  const totalCashOut = cf.total_cash_out          || 0;
  const netFlow      = cf.net_cash_flow           || 0;
  const mutations    = data?.mutations            || [];
  const recentOrders = data?.recent_orders        || [];
  const walletActivity = data?.wallet_activity    || [];
  const locBal       = bal.total_location_balance || 0;
  const platformBal  = bal.platform_wallet_balance || 0;
  const pendingPayout = bal.pending_payout        || 0;
  const netAvailable  = bal.net_available         || 0;
  const locBalanceTotal = locations.reduce((s, l) => s + l.balance, 0);

  // ─── LOADING ─────────────────────────────────────
  if (loading && !data) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
      <div className="w-12 h-12 border-[3px] border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-sm text-slate-400 font-semibold">Memuat data keuangan...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-28">

      {/* ─── PAGE HEADER ─────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200 flex-shrink-0">
              <Icon name="bxs-bank" size={18} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">Keuangan & Ledger</h1>
              <p className="text-xs text-slate-400 font-medium">Transparansi penuh — masuk, keluar, dan alokasi</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {period === 'custom' && (
              <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-transparent text-xs font-bold text-slate-600 outline-none" />
                <span className="text-slate-300 text-xs">→</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-transparent text-xs font-bold text-slate-600 outline-none" />
              </div>
            )}
            <select value={period} onChange={e => setPeriod(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-2.5 outline-none focus:border-indigo-400 transition-all">
              {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <button onClick={() => setShowConfig(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all">
              <Icon name="bx-cog" size={13} /> Konfigurasi
            </button>
            <button onClick={() => fetchData(true)} disabled={refreshing} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all disabled:opacity-70">
              <Icon name={`bx-refresh ${refreshing ? 'animate-spin' : ''}`} size={13} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">

        {/* ─── KPI STRIP ─────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { icon: 'bx-trending-up',    color: 'bg-indigo-50 text-indigo-600',  label: 'Gross Revenue', value: idr(gross),      sub: `${idr(capitalCost)} COGS` },
            { icon: 'bx-minus-circle',   color: 'bg-rose-50 text-rose-600',      label: 'Harga Modal',    value: idr(capitalCost), sub: `${pct(capitalCost, gross)}% dari revenue` },
            { icon: 'bx-trending-up',    color: 'bg-emerald-50 text-emerald-600', label: 'Laba Kotor',     value: idr(grossProfit), sub: `${pct(grossProfit, gross)}% margin` },
            { icon: 'bx-check-shield',   color: 'bg-violet-50 text-violet-600',  label: 'Net Profit',     value: idr(netProfit),  sub: `${pct(netProfit, gross)}% profit` },
            { icon: 'bx-wallet',         color: 'bg-slate-900 text-white',        label: 'Saldo Kas',       value: idr(locBalanceTotal), sub: `${locations.length} kas/bank` },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${k.color}`}>
                <Icon name={k.icon} size={16} />
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{k.label}</div>
              <div className="text-lg font-extrabold text-slate-900 leading-tight">{k.value}</div>
              <div className="text-[10px] text-slate-400 font-medium mt-1">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ─── CASH FLOW + BALANCE GRID ─────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* LEFT: Cash In */}
          <div className="xl:col-span-4 space-y-6">

            {/* Cash In */}
            <Card className="p-5">
              <Heading icon="bx-arrow-to-bottom" title="Arus Masuk" badge={`${idr(totalCashIn)}`} />
              <div className="space-y-0">
                {cashInItems.filter(x => x.amount > 0).map((item, i) => (
                  <CashRow key={i} label={item.label} amount={item.amount} type="in" desc={item.description} />
                ))}
                {cashInItems.filter(x => x.amount > 0).length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400 font-semibold">Belum ada arus masuk</div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t-2 border-emerald-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">Total Masuk</span>
                <span className="text-base font-extrabold text-emerald-600">+ {idr(totalCashIn)}</span>
              </div>
            </Card>

            {/* Cash Out */}
            <Card className="p-5">
              <Heading icon="bx-arrow-to-top" title="Arus Keluar" badge={`${idr(totalCashOut)}`} />
              <div className="space-y-0">
                {cashOutItems.filter(x => x.amount > 0).map((item, i) => (
                  <CashRow key={i} label={item.label} amount={item.amount} type="out" desc={item.description} />
                ))}
                {cashOutItems.filter(x => x.amount > 0).length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400 font-semibold">Belum ada arus keluar</div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t-2 border-rose-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">Total Keluar</span>
                <span className="text-base font-extrabold text-rose-600">- {idr(totalCashOut)}</span>
              </div>
            </Card>

            {/* Net Flow */}
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
                  <Icon name="bxs-stats" size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Net Cash Flow</div>
                  <div className={`text-lg font-extrabold ${netFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {netFlow >= 0 ? '+' : ''}{idr(netFlow)}
                  </div>
                </div>
              </div>
              <MiniBar value={Math.abs(netFlow)} max={Math.max(Math.abs(totalCashIn), Math.abs(totalCashOut), 1)} color={netFlow >= 0 ? 'bg-emerald-500' : 'bg-rose-500'} />
              <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-semibold">
                <span>Masuk {idr(totalCashIn)}</span>
                <span>Keluar {idr(totalCashOut)}</span>
              </div>
            </Card>

            {/* Catat Mutasi */}
            <Card className="p-5">
              <Heading icon="bx-edit" title="Catat Mutasi Manual" />
              <MutationForm locations={locations} onSubmit={handleSubmitMutation} saving={saving} />
            </Card>
          </div>

          {/* RIGHT: Balance + Kas + Daily Trend */}
          <div className="xl:col-span-8 space-y-6">

            {/* Balance Overview */}
            <Card className="p-5">
              <Heading icon="bxs-wallet" title="Ringkasan Saldo" badge={`${idr(locBalanceTotal)}`} />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Kas (Lokasi)', val: idr(locBalanceTotal), color: 'text-slate-900' },
                  { label: 'Platform Wallet',    val: idr(platformBal),  color: 'text-indigo-600' },
                  { label: 'Pending Payout',     val: idr(pendingPayout), color: 'text-amber-600' },
                  { label: 'Tersedia (Net)',     val: idr(netAvailable > 0 ? netAvailable : locBalanceTotal - pendingPayout), color: 'text-emerald-600' },
                ].map((b, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{b.label}</div>
                    <div className={`text-sm font-extrabold ${b.color}`}>{b.val}</div>
                  </div>
                ))}
              </div>
              {walletBal.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Saldo per Tipe Wallet</div>
                  <div className="flex flex-wrap gap-2">
                    {walletBal.map((wb, i) => (
                      <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{wb.owner_type}</span>
                        <span className="text-xs font-extrabold text-slate-800">{idr(wb.balance)}</span>
                        <span className="text-[10px] text-slate-400">({wb.count} wallet)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Daily Flow Trend */}
            {dailyFlow.length > 0 && (
              <Card className="p-5">
                <Heading icon="bxs-chart" title="Tren Harian (30 Hari)" badge={dailyFlow.length} />
                <div className="flex items-end gap-1 h-20">
                  {dailyFlow.slice().reverse().map((d, i) => {
                    const maxVal = Math.max(...dailyFlow.map(x => Math.abs(x.cash_in)), 1);
                    const h = d.cash_in > 0 ? Math.max((d.cash_in / maxVal) * 80, 4) : 4;
                    return (
                      <div key={i} className="flex-1 group relative">
                        <div className="bg-indigo-200 hover:bg-indigo-400 transition-colors rounded-t-sm" style={{ height: `${h}px` }} title={`${d.date}: ${idr(d.cash_in)}`} />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-[9px] rounded px-1.5 py-0.5 whitespace-nowrap z-10">
                          {d.date}<br />{idr(d.cash_in)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Kas/Bank Table */}
            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center"><Icon name="bx-credit-card" size={13} /></div>
                <span className="text-sm font-bold text-slate-800">Manajemen Kas & Bank</span>
              </div>
              <LocationCRUD locations={locations} onRefresh={() => fetchData(true)} />
            </Card>

            {/* Allocations */}
            <Card className="p-5">
              <Heading icon="bxs-pie-chart-alt-2" title="Alokasi" badge={`${idr(totalSaved)}`} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data Saving */}
                <div>
                  <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Biaya / Saving</div>
                  {Object.entries(data?.data_saving || {}).filter(([k]) => k !== 'total').map(([name, info]) => (
                    <div key={name} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center text-[10px] font-black">{info.percent}%</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-700 truncate">{name}</div>
                        <div className="text-[10px] text-slate-400">{idr(info.value)}</div>
                      </div>
                      <MiniBar value={info.value} max={grossProfit} color="bg-indigo-400" />
                    </div>
                  ))}
                  {totalSaved > 0 && (
                    <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-500">Total Saving</span>
                      <span className="text-sm font-extrabold text-indigo-600">{idr(totalSaved)}</span>
                    </div>
                  )}
                </div>
                {/* Profit Share */}
                <div>
                  <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-3">Bagi Hasil</div>
                  {Object.entries(data?.profit_shares || {}).map(([name, info]) => (
                    <div key={name} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center text-[10px] font-black">{info.percent}%</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-700 truncate">{name}</div>
                        <div className="text-[10px] text-slate-400">{idr(info.value)}</div>
                      </div>
                      <MiniBar value={info.value} max={netProfit || 1} color="bg-emerald-400" />
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-500">Net Profit</span>
                    <span className="text-sm font-extrabold text-emerald-600">{idr(netProfit)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* ─── DETAIL TABS ────────────────────────────── */}
        <Card className="overflow-hidden">
          <div className="flex border-b border-slate-200 bg-slate-50/50 px-4 overflow-x-auto">
            {[
              { key: 'orders',     label: 'Transaksi',      count: recentOrders.length },
              { key: 'wallet',     label: 'Wallet Activity', count: walletActivity.length },
              { key: 'mutations',  label: 'Mutasi Manual',   count: mutations.length },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveDetailTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                  activeDetailTab === tab.key
                    ? 'border-indigo-600 text-indigo-600 bg-white'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}>
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeDetailTab === tab.key ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            {activeDetailTab === 'orders' && (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100">
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Waktu</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Customer</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Revenue</th>
                  <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">COGS</th>
                  <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Profit</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">ID Pesanan</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {recentOrders.length > 0 ? recentOrders.map((o, i) => {
                    const profit = o.total_amount - o.total_cogs;
                    const margin = o.total_amount > 0 ? (profit / o.total_amount) * 100 : 0;
                    const s = smOrder(o.status);
                    return (
                      <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4">
                          <div className="text-xs font-bold text-slate-700">{fmtDate(o.created_at)}</div>
                          <div className="text-[10px] text-slate-400">{fmtTime(o.created_at)}</div>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700 text-sm">{o.customer || '—'}</td>
                        <td className="px-5 py-4"><Tag label={s.label} meta={s} /></td>
                        <td className="px-5 py-4 text-right font-bold text-slate-900">{idr(o.total_amount)}</td>
                        <td className="px-5 py-4 text-right font-bold text-rose-600">{idr(o.total_cogs)}</td>
                        <td className={`px-5 py-4 text-right font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{idr(profit)} <span className="text-[10px] text-slate-400">({margin.toFixed(1)}%)</span></td>
                        <td className="px-5 py-4 text-[10px] font-mono text-slate-400">{o.id?.slice(0, 12) || '—'}</td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan="7" className="px-5 py-16 text-center text-xs text-slate-400 font-semibold">Belum ada transaksi</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeDetailTab === 'wallet' && (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100">
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Waktu</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Tipe</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Pemilik</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Keterangan</th>
                  <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Nominal</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {walletActivity.length > 0 ? walletActivity.map((tx, i) => {
                    const isIn = tx.amount > 0;
                    const wm = smWallet(tx.type);
                    return (
                      <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4">
                          <div className="text-xs font-bold text-slate-700">{fmtDate(tx.created_at)}</div>
                          <div className="text-[10px] text-slate-400">{fmtTime(tx.created_at)}</div>
                        </td>
                        <td className="px-5 py-4"><Tag label={wm.label} meta={wm} /></td>
                        <td className="px-5 py-4 font-semibold text-slate-700 text-sm">{tx.wallet_owner || 'Platform'}</td>
                        <td className="px-5 py-4 text-slate-500 text-xs max-w-[200px] truncate" title={tx.description}>{tx.description || '—'}</td>
                        <td className={`px-5 py-4 text-right font-extrabold text-sm ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isIn ? '+' : ''}{idr(tx.amount)}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan="5" className="px-5 py-16 text-center text-xs text-slate-400 font-semibold">Belum ada aktivitas wallet</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeDetailTab === 'mutations' && (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100">
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Waktu</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Kategori</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Catatan</th>
                  <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Nominal</th>
                  <th className="px-5 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Hapus</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {mutations.length > 0 ? mutations.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-slate-700">{fmtDate(m.created_at)}</div>
                        <div className="text-[10px] text-slate-400">{fmtTime(m.created_at)}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800 text-sm">{m.category}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{m.type}</div>
                      </td>
                      <td className="px-5 py-4"><StatusDot status={m.status} /></td>
                      <td className="px-5 py-4 text-slate-500 text-xs max-w-[200px] truncate" title={m.description}>{m.description || '—'}</td>
                      <td className={`px-5 py-4 text-right font-extrabold text-sm ${m.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {m.type === 'income' ? '+' : '-'} {idr(m.amount)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button onClick={() => handleDeleteMutation(m.id)} className="w-7 h-7 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center mx-auto transition-all opacity-0 group-hover:opacity-100">
                          <Icon name="bx-trash" size={14} />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" className="px-5 py-16 text-center text-xs text-slate-400 font-semibold">Belum ada mutasi manual</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </Card>

      </div>

      <FinanceConfigModal isOpen={showConfig} onClose={() => setShowConfig(false)} onRefresh={() => fetchData(true)} />
    </div>
  );
}