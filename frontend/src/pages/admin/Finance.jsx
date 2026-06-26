import React, { useState, useEffect, useCallback } from 'react';
import { ADMIN_API_BASE, fetchJson, postJson } from '../../lib/api';
import { toast } from 'react-hot-toast';
import FinanceConfigModal from '../../components/admin/FinanceConfigModal';
import LocationCRUD from '../../components/admin/LocationCRUD';

const API = ADMIN_API_BASE;
const idr = n => n ? 'Rp ' + Number(n).toLocaleString('id-ID') : 'Rp 0';
const pct = (p, t) => t > 0 ? ((p / t) * 100).toFixed(1) : '0.0';
const dte = d => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const tme = d => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—';

const PERIODS = [
  { v: 'all', l: 'Semua' }, { v: 'today', l: 'Hari Ini' },
  { v: 'week', l: '7 Hari' }, { v: 'month', l: 'Bulan Ini' }, { v: 'year', l: 'Tahun Ini' },
];

const ORDER_STYLE = {
  completed:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  delivered:    'bg-teal-50 text-teal-700 border-teal-200',
  shipped:      'bg-sky-50 text-sky-700 border-sky-200',
  ready_to_ship:'bg-cyan-50 text-cyan-700 border-cyan-200',
  processing:   'bg-amber-50 text-amber-700 border-amber-200',
  paid:         'bg-violet-50 text-violet-700 border-violet-200',
  cancelled:    'bg-rose-50 text-rose-700 border-rose-200',
  refunded:     'bg-pink-50 text-pink-700 border-pink-200',
  pending:      'bg-slate-100 text-slate-600 border-slate-200',
};

const WALLET_STYLE = {
  sale_revenue:     'bg-indigo-50 text-indigo-700 border-indigo-200',
  commission_earned:'bg-violet-50 text-violet-700 border-violet-200',
  platform_fee:    'bg-slate-50 text-slate-700 border-slate-200',
  payout_outflow:  'bg-orange-50 text-orange-700 border-orange-200',
  refund:          'bg-pink-50 text-pink-700 border-pink-200',
  deposit:         'bg-sky-50 text-sky-700 border-sky-200',
  bonus:           'bg-amber-50 text-amber-700 border-amber-200',
  adjustment:      'bg-slate-50 text-slate-700 border-slate-200',
};

const Tag = ({ s, map }) => {
  const m = map?.[s] || 'bg-slate-100 text-slate-600 border-slate-200';
  return <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${m}`}>{s?.replace(/_/g, ' ') || s}</span>;
};

const MIcon = ({ n, className = '' }) => <span className={`material-symbols-outlined text-lg ${className}`}>{n}</span>;

export default function AdminFinance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('all');
  const [showConfig, setShowConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dt, setDt] = useState('cashflow');
  const [sdt, setSdt] = useState('orders');

  const fetchData = useCallback(async (ref = false) => {
    if (ref) setRefreshing(true); else setLoading(true);
    try {
      const r = await fetchJson(`${API}/finance/revenue-detail?period=${period}`);
      setData(r);
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submitMut = async (mut, reset) => {
    if (!mut.category || !mut.amount) { toast.error('Isi kategori & nominal'); return; }
    setSaving(true);
    try {
      await postJson(`${API}/finance/mutation`, { ...mut, amount: Number(mut.amount) });
      toast.success('Mutasi dicatat'); reset?.(); fetchData(true);
    } catch { toast.error('Gagal'); }
    finally { setSaving(false); }
  };

  const delMut = async id => {
    try {
      await fetchJson(`${API}/finance/mutation?id=${id}`, { method: 'DELETE' });
      toast.success('Dihapus'); fetchData(true);
    } catch { toast.error('Gagal'); }
  };

  if (loading && !data) return (
    <div className="flex items-center justify-center min-h-[70vh] gap-3">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-400 font-semibold">Memuat...</p>
    </div>
  );

  const d = data || {};
  const gross = d.gross_revenue || 0;
  const capitalCost = d.capital_cost || 0;
  const grossProfit = d.gross_profit || 0;
  const netProfit = d.net_profit || 0;
  const totalSaved = d.data_saving?.total || 0;
  const locations = d.locations || [];
  const cf = d.cash_flow || {};
  const bal = d.balance || {};
  const walletBal = d.wallet_balances || [];
  const dailyFlow = d.daily_flow || [];
  const cashIn = cf.cash_in_items || [];
  const cashOut = cf.cash_out_items || [];
  const totalIn = cf.total_cash_in || 0;
  const totalOut = cf.total_cash_out || 0;
  const netFlow = cf.net_cash_flow || 0;
  const mutations = d.mutations || [];
  const orders = d.recent_orders || [];
  const walletAct = d.wallet_activity || [];
  const locBal = bal.total_location_balance || 0;
  const platBal = bal.platform_wallet_balance || 0;
  const pendPay = bal.pending_payout || 0;
  const netAvail = bal.net_available || 0;
  const locBalTotal = locations.reduce((s, l) => s + (l.balance || 0), 0);

  const KPI = ({ icon, label, value, sub, color }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <MIcon n={icon} className="text-white" />
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-extrabold text-slate-900">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );

  const tabs = [
    { k: 'cashflow', l: 'Arus Kas', i: 'account_balance' },
    { k: 'allocations', l: 'Alokasi', i: 'donut_large' },
    { k: 'details', l: 'Detail', i: 'receipt_long' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-sm">
              <MIcon n="account_balance" className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900">Keuangan</h1>
              <p className="text-[10px] text-slate-400 font-medium">Ringkasan keuangan platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-2 outline-none">
              {PERIODS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
            </select>
            <button onClick={() => setShowConfig(true)}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
              <MIcon n="settings" />
            </button>
            <button onClick={() => fetchData(true)} disabled={refreshing}
              className={`p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors ${refreshing ? 'opacity-50' : ''}`}>
              <MIcon n={refreshing ? 'sync' : 'refresh'} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KPI icon="trending_up" label="Gross Revenue" value={idr(gross)} sub={`${idr(capitalCost)} COGS`} color="bg-indigo-600" />
          <KPI icon="money_off" label="Modal COGS" value={idr(capitalCost)} sub={`${pct(capitalCost, gross)}% revenue`} color="bg-rose-500" />
          <KPI icon="payments" label="Laba Kotor" value={idr(grossProfit)} sub={`${pct(grossProfit, gross)}% margin`} color="bg-emerald-600" />
          <KPI icon="account_balance" label="Net Profit" value={idr(netProfit)} sub={`${pct(netProfit, gross)}% profit`} color="bg-violet-600" />
          <KPI icon="savings" label="Saldo Kas" value={idr(locBalTotal)} sub={`${locations.length} lokasi`} color="bg-slate-800" />
        </div>

        {/* TABS */}
        <div className="flex gap-1 border-b border-slate-200">
          {tabs.map(t => (
            <button key={t.k} onClick={() => setDt(t.k)}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${dt === t.k ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <MIcon n={t.i} className="text-base" /> {t.l}
            </button>
          ))}
        </div>

        {/* ─── CASHFLOW TAB ─── */}
        {dt === 'cashflow' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* LEFT */}
            <div className="xl:col-span-4 space-y-4">
              {/* Cash In */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center"><MIcon n="arrow_downward" className="text-emerald-600 text-sm" /></div>
                    <span className="text-xs font-bold text-slate-700">Arus Masuk</span>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-600">{idr(totalIn)}</span>
                </div>
                <div className="space-y-0">
                  {cashIn.filter(x => x.amount > 0).map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div><p className="text-xs font-semibold text-slate-700">{item.label}</p>{item.description && <p className="text-[10px] text-slate-400">{item.description}</p>}</div>
                      <span className="text-xs font-bold text-emerald-600">+{idr(item.amount)}</span>
                    </div>
                  ))}
                  {cashIn.filter(x => x.amount > 0).length === 0 && <p className="py-6 text-center text-xs text-slate-400">Belum ada</p>}
                </div>
              </div>

              {/* Cash Out */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center"><MIcon n="arrow_upward" className="text-rose-600 text-sm" /></div>
                    <span className="text-xs font-bold text-slate-700">Arus Keluar</span>
                  </div>
                  <span className="text-sm font-extrabold text-rose-600">{idr(totalOut)}</span>
                </div>
                <div className="space-y-0">
                  {cashOut.filter(x => x.amount > 0).map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div><p className="text-xs font-semibold text-slate-700">{item.label}</p>{item.description && <p className="text-[10px] text-slate-400">{item.description}</p>}</div>
                      <span className="text-xs font-bold text-rose-600">-{idr(item.amount)}</span>
                    </div>
                  ))}
                  {cashOut.filter(x => x.amount > 0).length === 0 && <p className="py-6 text-center text-xs text-slate-400">Belum ada</p>}
                </div>
              </div>

              {/* Net Flow */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center"><MIcon n="analytics" className="text-white text-sm" /></div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Cash Flow</p>
                    <p className={`text-base font-extrabold ${netFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{netFlow >= 0 ? '+' : ''}{idr(netFlow)}</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-2 rounded-full transition-all ${netFlow >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${Math.min(Math.abs(netFlow) / Math.max(Math.abs(totalIn), Math.abs(totalOut), 1) * 100, 100)}%` }} />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] text-slate-400 font-semibold">
                  <span>Masuk {idr(totalIn)}</span>
                  <span>Keluar {idr(totalOut)}</span>
                </div>
              </div>

              {/* Mutation Form */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center"><MIcon n="edit_note" className="text-white text-sm" /></div>
                  <span className="text-xs font-bold text-slate-700">Catat Mutasi</span>
                </div>
                <MutationForm locations={locations} onSubmit={submitMut} saving={saving} />
              </div>
            </div>

            {/* RIGHT */}
            <div className="xl:col-span-8 space-y-4">
              {/* Balance */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center"><MIcon n="account_balance_wallet" className="text-white text-sm" /></div>
                    <span className="text-xs font-bold text-slate-700">Ringkasan Saldo</span>
                  </div>
                  <span className="text-sm font-extrabold text-slate-900">{idr(locBalTotal)}</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {[
                    { l: 'Total Kas', v: idr(locBalTotal), c: 'text-slate-900' },
                    { l: 'Wallet Platform', v: idr(platBal), c: 'text-indigo-600' },
                    { l: 'Pending Payout', v: idr(pendPay), c: 'text-amber-600' },
                    { l: 'Tersedia', v: idr(netAvail || locBalTotal - pendPay), c: 'text-emerald-600' },
                  ].map((b, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{b.l}</p>
                      <p className={`text-sm font-extrabold ${b.c}`}>{b.v}</p>
                    </div>
                  ))}
                </div>
                {walletBal.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Saldo per Wallet</p>
                    <div className="flex flex-wrap gap-2">
                      {walletBal.map((w, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{w.owner_type}</span>
                          <span className="text-xs font-extrabold text-slate-800">{idr(w.balance)}</span>
                          <span className="text-[10px] text-slate-400">({w.count} wallet)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Daily Flow */}
              {dailyFlow.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center"><MIcon n="bar_chart" className="text-white text-sm" /></div>
                    <span className="text-xs font-bold text-slate-700">Tren Harian</span>
                    <span className="text-[10px] text-slate-400 ml-auto">{dailyFlow.length} hari</span>
                  </div>
                  <div className="flex items-end gap-[2px] h-28">
                    {dailyFlow.slice(-30).map((d, i) => {
                      const max = Math.max(...dailyFlow.map(x => Math.max(x.cash_in || 0, x.cash_out || 0)), 1);
                      const hIn = d.cash_in > 0 ? (d.cash_in / max) * 100 : 0;
                      const hOut = d.cash_out > 0 ? (d.cash_out / max) * 100 : 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-px group relative">
                          {hIn > 0 && <div className="w-full rounded-t-sm bg-gradient-to-t from-emerald-500 to-emerald-300 transition-all hover:from-emerald-600 hover:to-emerald-400" style={{ height: `${hIn}%`, minHeight: hIn > 0 ? 3 : 0 }} />}
                          {hOut > 0 && <div className="w-full rounded-t-sm bg-gradient-to-t from-rose-500 to-rose-300 transition-all hover:from-rose-600 hover:to-rose-400" style={{ height: `${hOut}%`, minHeight: hOut > 0 ? 3 : 0 }} />}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-10 shadow-lg">
                            {d.date}<br />In: {idr(d.cash_in)}<br />Out: {idr(d.cash_out)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400" /> Masuk</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-400" /> Keluar</span>
                  </div>
                </div>
              )}

              {/* Kas/Bank */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center"><MIcon n="account_balance" className="text-white text-sm" /></div>
                  <span className="text-xs font-bold text-slate-700">Kas & Bank</span>
                </div>
                <div className="p-4">
                  <LocationCRUD locations={locations} onRefresh={() => fetchData(true)} />
                </div>
              </div>

              {/* Allocations */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center"><MIcon n="donut_large" className="text-white text-sm" /></div>
                    <span className="text-xs font-bold text-slate-700">Alokasi Dana</span>
                  </div>
                  <span className="text-sm font-extrabold text-indigo-600">{idr(totalSaved)}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase mb-2">Data Saving</p>
                    {Object.entries(d.data_saving || {}).filter(([k]) => k !== 'total').map(([n, inf]) => (
                      <div key={n} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                        <span className="text-xs font-bold text-slate-600 w-16 shrink-0">{n}</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${inf.percent}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 w-20 text-right">{inf.percent}%</span>
                      </div>
                    ))}
                    {totalSaved > 0 && (
                      <div className="flex justify-between pt-2 mt-1 border-t border-slate-100">
                        <span className="text-xs font-bold text-slate-500">Total</span>
                        <span className="text-xs font-extrabold text-indigo-600">{idr(totalSaved)}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase mb-2">Profit Share</p>
                    {Object.entries(d.profit_shares || {}).map(([n, inf]) => (
                      <div key={n} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                        <span className="text-xs font-bold text-slate-600 w-16 shrink-0">{n}</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${inf.percent}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 w-20 text-right">{inf.percent}%</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 mt-1 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-500">Net Profit</span>
                      <span className="text-xs font-extrabold text-emerald-600">{idr(netProfit)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── ALLOCATIONS TAB ─── */}
        {dt === 'allocations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center"><MIcon n="save" className="text-indigo-600 text-sm" /></div>
                <span className="text-xs font-bold text-slate-700">Data Saving</span>
              </div>
              {Object.entries(d.data_saving || {}).filter(([k]) => k !== 'total').length === 0
                ? <p className="text-xs text-slate-400 py-4 text-center">Belum ada konfigurasi</p>
                : Object.entries(d.data_saving || {}).filter(([k]) => k !== 'total').map(([n, inf]) => (
                    <div key={n} className="mb-3">
                      <div className="flex justify-between text-xs mb-1"><span className="font-semibold text-slate-700">{n}</span><span className="text-slate-400">{inf.percent}% · {idr(inf.value)}</span></div>
                      <div className="w-full h-2 bg-slate-100 rounded-full"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${inf.percent}%` }} /></div>
                    </div>
                  ))}
              <div className="pt-2 border-t border-slate-100 flex justify-between"><span className="text-xs font-bold">Total</span><span className="text-xs font-bold text-indigo-600">{idr(totalSaved)}</span></div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center"><MIcon n="trending_up" className="text-emerald-600 text-sm" /></div>
                <span className="text-xs font-bold text-slate-700">Profit Share</span>
              </div>
              {Object.entries(d.profit_shares || {}).length === 0
                ? <p className="text-xs text-slate-400 py-4 text-center">Belum ada konfigurasi</p>
                : Object.entries(d.profit_shares || {}).map(([n, inf]) => (
                    <div key={n} className="mb-3">
                      <div className="flex justify-between text-xs mb-1"><span className="font-semibold text-slate-700">{n}</span><span className="text-slate-400">{inf.percent}% · {idr(inf.value)}</span></div>
                      <div className="w-full h-2 bg-slate-100 rounded-full"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${inf.percent}%` }} /></div>
                    </div>
                  ))}
              <div className="pt-2 border-t border-slate-100 flex justify-between"><span className="text-xs font-bold">Net Profit</span><span className="text-xs font-bold text-emerald-600">{idr(netProfit)}</span></div>
            </div>
          </div>
        )}

        {/* ─── DETAILS TAB ─── */}
        {dt === 'details' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-50/50 px-4 overflow-x-auto">
              {[
                { k: 'orders', l: 'Transaksi', c: orders.length },
                { k: 'wallet', l: 'Wallet', c: walletAct.length },
                { k: 'mutations', l: 'Mutasi', c: mutations.length },
              ].map(t => (
                <button key={t.k} onClick={() => setSdt(t.k)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${sdt === t.k ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                  {t.l}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${sdt === t.k ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{t.c}</span>
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              {sdt === 'orders' && (
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                    {['Waktu', 'Customer', 'Status', 'Revenue', 'COGS', 'Profit', 'ID Pesanan'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {orders.length > 0 ? orders.map((o, i) => {
                      const profit = (o.total_amount || o.grand_total || 0) - (o.total_cogs || 0);
                      const margin = o.total_amount > 0 ? (profit / o.total_amount) * 100 : 0;
                      return (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3"><p className="font-semibold text-slate-700">{dte(o.created_at)}</p><p className="text-[10px] text-slate-400">{tme(o.created_at)}</p></td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{o.customer || '—'}</td>
                          <td className="px-4 py-3"><Tag s={o.status} map={ORDER_STYLE} /></td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{idr(o.total_amount || o.grand_total)}</td>
                          <td className="px-4 py-3 text-right font-bold text-rose-600">{idr(o.total_cogs)}</td>
                          <td className={`px-4 py-3 text-right font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{idr(profit)} <span className="text-[10px] text-slate-400">({margin.toFixed(1)}%)</span></td>
                          <td className="px-4 py-3 text-[10px] font-mono text-slate-400">{o.id?.slice(0, 12) || '—'}</td>
                        </tr>
                      );
                    }) : <tr><td colSpan={7} className="px-4 py-12 text-center text-xs text-slate-400">Belum ada transaksi</td></tr>}
                  </tbody>
                </table>
              )}
              {sdt === 'wallet' && (
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                    {['Waktu', 'Tipe', 'Pemilik', 'Keterangan', 'Nominal'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {walletAct.length > 0 ? walletAct.map((tx, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3"><p className="font-semibold text-slate-700">{dte(tx.created_at)}</p><p className="text-[10px] text-slate-400">{tme(tx.created_at)}</p></td>
                        <td className="px-4 py-3"><Tag s={tx.type} map={WALLET_STYLE} /></td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{tx.wallet_owner || 'Platform'}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={tx.description}>{tx.description || '—'}</td>
                        <td className={`px-4 py-3 text-right font-extrabold ${tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{tx.amount > 0 ? '+' : ''}{idr(tx.amount)}</td>
                      </tr>
                    )) : <tr><td colSpan={5} className="px-4 py-12 text-center text-xs text-slate-400">Belum ada aktivitas</td></tr>}
                  </tbody>
                </table>
              )}
              {sdt === 'mutations' && (
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                    {['Waktu', 'Kategori', 'Status', 'Catatan', 'Nominal', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {mutations.length > 0 ? mutations.map((m, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-4 py-3"><p className="font-semibold text-slate-700">{dte(m.created_at)}</p><p className="text-[10px] text-slate-400">{tme(m.created_at)}</p></td>
                        <td className="px-4 py-3"><p className="font-bold text-slate-700">{m.category}</p><p className="text-[10px] text-slate-400 capitalize">{m.type}</p></td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${m.status === 'processed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><span className={`w-1.5 h-1.5 rounded-full ${m.status === 'processed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />{m.status === 'processed' ? 'Diproses' : 'Direncanakan'}</span></td>
                        <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={m.description}>{m.description || '—'}</td>
                        <td className={`px-4 py-3 text-right font-extrabold ${m.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>{m.type === 'income' ? '+' : '-'} {idr(m.amount)}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => delMut(m.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100">
                            <MIcon n="delete" className="text-base" />
                          </button>
                        </td>
                      </tr>
                    )) : <tr><td colSpan={6} className="px-4 py-12 text-center text-xs text-slate-400">Belum ada mutasi</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      <FinanceConfigModal isOpen={showConfig} onClose={() => setShowConfig(false)} onRefresh={() => fetchData(true)} />
    </div>
  );
}

function MutationForm({ locations, onSubmit, saving }) {
  const [m, setM] = useState({ category: '', amount: '', description: '', type: 'expense', status: 'processed', from_location_id: '', to_location_id: '' });
  const h = e => { e.preventDefault(); onSubmit(m, () => setM({ category: '', amount: '', description: '', type: 'expense', status: 'processed', from_location_id: '', to_location_id: '' })); };
  return (
    <form onSubmit={h} className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Tipe</label>
          <select value={m.type} onChange={e => setM({ ...m, type: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none">
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Status</label>
          <select value={m.status} onChange={e => setM({ ...m, status: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none">
            <option value="processed">Diproses</option>
            <option value="pending">Direncanakan</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Kategori</label>
        <input type="text" value={m.category} onChange={e => setM({ ...m, category: e.target.value })} placeholder="Contoh: Operasional"
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400" />
      </div>
      <div>
        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Nominal (Rp)</label>
        <input type="number" value={m.amount} onChange={e => setM({ ...m, amount: e.target.value })} placeholder="0"
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:border-indigo-400" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Dari</label>
          <select value={m.from_location_id} onChange={e => setM({ ...m, from_location_id: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none">
            <option value="">—</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Ke</label>
          <select value={m.to_location_id} onChange={e => setM({ ...m, to_location_id: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none">
            <option value="">—</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Catatan</label>
        <textarea rows="2" value={m.description} onChange={e => setM({ ...m, description: e.target.value })} placeholder="Opsional..."
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400 resize-none" />
      </div>
      <button type="submit" disabled={saving}
        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
        {saving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        <MIcon n="save" className="text-sm" /> Simpan
      </button>
    </form>
  );
}
