import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE } from '../../lib/api';
import { toast } from 'react-hot-toast';
import FinanceConfigModal from '../../components/admin/FinanceConfigModal';

const API = ADMIN_API_BASE;
const idr = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
const pct = (part, total) => total > 0 ? ((part / total) * 100).toFixed(1) : '0.0';

const PERIODS = [
  { value: 'all',   label: 'Semua Waktu' },
  { value: 'today', label: 'Hari Ini' },
  { value: 'week',  label: '7 Hari Terakhir' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'year',  label: 'Tahun Ini' },
];

const MUTATION_TYPES = [
  { value: 'expense',  label: 'Uang Keluar (Expense)' },
  { value: 'income',   label: 'Uang Masuk (Income)' },
  { value: 'transfer', label: 'Transfer Antar Rekening' },
];

const MUTATION_STATUSES = [
  { value: 'processed', label: 'Proses Sekarang' },
  { value: 'pending',   label: 'Rencanakan (Pending)' },
];

const emptyMut = { category: '', amount: '', description: '', type: 'expense', status: 'processed', from_location_id: '', to_location_id: '' };

export default function AdminFinance() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState('all');
  const [showConfig, setShowConfig] = useState(false);
  const [mutation, setMutation] = useState(emptyMut);
  const [saving, setSaving]     = useState(false);

  useEffect(() => { fetchData(); }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/finance/revenue-detail?period=${period}`, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      const res = await r.json();
      setData(res);
    } catch {
      toast.error('Gagal memuat data keuangan');
    } finally {
      setLoading(false);
    }
  };

  const handleMutation = async (e) => {
    e.preventDefault();
    if (!mutation.category || !mutation.amount) { toast.error('Kategori & nominal wajib diisi'); return; }
    setSaving(true);
    try {
      const r = await fetch(`${API}/finance/mutation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
        body: JSON.stringify({
          ...mutation,
          amount:           Number(mutation.amount),
          from_location_id: mutation.from_location_id ? Number(mutation.from_location_id) : null,
          to_location_id:   mutation.to_location_id   ? Number(mutation.to_location_id)   : null,
        }),
      });
      if (r.ok) { toast.success('Mutasi berhasil dicatat'); setMutation(emptyMut); fetchData(); }
      else       { toast.error('Gagal: ' + (await r.text())); }
    } catch { toast.error('Gagal mencatat mutasi'); }
    finally { setSaving(false); }
  };

  const handleDeleteMutation = async (id) => {
    if (!window.confirm('Yakin ingin menghapus mutasi ini? Saldo Kas akan dikembalikan ke asal jika mutasi sudah diproses.')) return;
    try {
      const r = await fetch(`${API}/finance/mutation?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      if (r.ok) { toast.success('Mutasi dihapus'); fetchData(); }
      else toast.error('Gagal menghapus mutasi');
    } catch { toast.error('Error server'); }
  };

  const handleLocationAction = async (action, loc = null) => {
    try {
      if (action === 'delete') {
        if (!window.confirm(`Hapus kas "${loc.name}"? Pastikan tidak ada uang tersisa di dalamnya.`)) return;
        const r = await fetch(`${API}/finance/locations?id=${loc.id}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
        if (r.ok) { toast.success('Kas dihapus'); fetchData(); }
      } else if (action === 'create') {
        const name = window.prompt('Masukkan nama Lokasi Kas / Bank baru:');
        if (!name) return;
        const r = await fetch(`${API}/finance/locations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
          body: JSON.stringify({ name, balance: 0, is_primary: false })
        });
        if (r.ok) { toast.success('Kas berhasil ditambahkan'); fetchData(); }
      } else if (action === 'edit') {
        const name = window.prompt('Edit nama Lokasi Kas / Bank:', loc.name);
        if (!name) return;
        const balanceRaw = window.prompt('Sesuaikan saldo aktual:', loc.balance);
        if (balanceRaw === null) return;
        const r = await fetch(`${API}/finance/locations/update?id=${loc.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
          body: JSON.stringify({ name, balance: Number(balanceRaw), is_primary: loc.is_primary })
        });
        if (r.ok) { toast.success('Kas berhasil diperbarui'); fetchData(); }
      }
    } catch { toast.error('Terjadi kesalahan koneksi'); }
  };

  const gross       = data?.gross_revenue    || 0;
  const capitalCost = data?.capital_cost     || 0;
  const grossProfit = data?.gross_profit     || 0;
  const totalSaved  = data?.data_saving?.total || 0;
  const netProfit   = data?.net_profit        || 0;

  if (loading && !data) return (
    <div className="p-20 text-center">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-slate-400 font-bold text-sm">Sinkronisasi data keuangan...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-10 pb-24 text-slate-700 admin-page-container">

      {/* ── Header ── */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm finance-header">
        <div>
          <span className="bg-indigo-100 text-indigo-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-2 inline-block">
            DYNAMIC LEDGER
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Laporan Keuangan</h1>
          <p className="text-sm text-slate-400 mt-1">Sistem alokasi pendapatan & pencatatan kas real-time.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold shadow-sm outline-none cursor-pointer hover:bg-slate-100 transition-all"
          >
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <button onClick={() => setShowConfig(true)} className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all border-b-4 border-slate-200 active:border-b-0 active:translate-y-1">
            <i className='bx bx-cog text-lg' /> Konfigurasi
          </button>
          <button onClick={fetchData} disabled={loading} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-sm font-black shadow-lg shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 transition-all border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 disabled:opacity-60">
            <i className={`bx bx-refresh text-lg ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Section 1: Alur Perhitungan ── */}
      <div className="space-y-5">
        <SectionTitle n="1" title="Alur Perhitungan Keuangan" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Gross Revenue */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col relative overflow-hidden group finance-card">
            <div>
              <div className="w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 mb-6 transition-transform group-hover:scale-110 duration-500">
                <i className='bx bx-trending-up text-2xl' />
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GROSS REVENUE</div>
              <div className="text-3xl font-black text-slate-900 tracking-tighter mb-2">{idr(gross)}</div>
            </div>

            {/* Rincian Sumber Pendapatan */}
            <div className="mt-8 space-y-3 border-t border-slate-50 pt-6 relative z-10">
              {/* Harga Modal Section */}
              <div className="flex justify-between text-[11px] font-black mb-1 p-2 bg-slate-50 rounded-xl">
                <span className="text-slate-500">HARGA MODAL (COGS)</span>
                <span className="text-rose-500">{idr(capitalCost)}</span>
              </div>
              <div className="flex justify-between text-[11px] font-black mb-4 p-2 bg-emerald-50 rounded-xl">
                <span className="text-emerald-700">LABA KOTOR</span>
                <span className="text-emerald-600">{idr(grossProfit)}</span>
              </div>

              <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2 px-2">Sumber Pendapatan</div>
              {data?.income_breakdown && Object.entries(data.income_breakdown)
                .sort((a, b) => b[1] - a[1]) // Urutkan dari yang terbesar
                .map(([label, val], idx) => (
                  <div key={idx} className="group/item px-2">
                    <div className="flex justify-between text-[11px] font-bold mb-1.5">
                      <span className="text-slate-400 group-hover/item:text-indigo-600 transition-colors">{label}</span>
                      <span className="text-slate-700">{idr(val)}</span>
                    </div>
                    <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                        style={{ width: `${(val / gross * 100) || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>

            <p className="text-[10px] font-bold text-slate-300 mt-8 leading-relaxed italic opacity-60">
              Total pendapatan kotor dari semua kanal platform.
            </p>
            <i className='bx bx-trending-up absolute -bottom-6 -right-6 text-9xl text-slate-50 opacity-10 group-hover:scale-120 transition-all duration-700' />
          </div>

          {/* Data Saving */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col finance-card">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-100">
                <i className='bx bx-pie-chart-alt-2 text-2xl' />
              </div>
              <a href={`/admin/finance/data-saving?period=${period}`} className="text-indigo-600 text-[10px] font-black hover:underline flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-full">
                DETAIL <i className='bx bx-right-arrow-alt' />
              </a>
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ALOKASI BIAYA (DATA SAVING)</div>
            <div className="text-3xl font-black text-rose-500 tracking-tighter mb-1">- {idr(totalSaved)}</div>
            <div className="text-[10px] font-bold text-slate-400 mb-6">{pct(totalSaved, gross)}% dari Gross Revenue</div>
            <div className="space-y-2 mt-auto">
              {data?.data_saving && Object.entries(data.data_saving)
                .filter(([k]) => k !== 'total')
                .slice(0, 4)
                .map(([label, val], idx) => (
                  <div key={idx} className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-400 capitalize">{label}</span>
                    <span className="text-slate-700">{idr(val.value)}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Net Profit */}
          <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl shadow-slate-200 flex flex-col justify-between relative overflow-hidden finance-card">
            <div className="relative z-10">
              <div className="w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
                <i className='bx bx-check-shield text-2xl' />
              </div>
              <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">NET PROFIT (LABA BERSIH)</div>
              <div className="text-3xl font-black tracking-tighter text-white">{idr(netProfit)}</div>
              <div className="text-[10px] font-bold text-indigo-300/60 mt-1 mb-6">{pct(netProfit, gross)}% dari Gross Revenue</div>
              
              <div className="space-y-2 mt-auto">
                {data?.profit_shares && Object.entries(data.profit_shares)
                  .filter(([k]) => k !== 'total') // Backend tidak mengirim key 'total' di profit_shares, filter ini aman sebagai safeguard
                  .slice(0, 4)
                  .map(([label, val], idx) => (
                    <div key={idx} className="flex justify-between text-[11px] font-bold">
                      <span className="text-indigo-300 capitalize">{label}</span>
                      <span className="text-white">{idr(val.value)}</span>
                    </div>
                  ))}
              </div>
            </div>
            
            <div className="mt-8 flex justify-between items-center relative z-10">
              <p className="text-[11px] text-indigo-200/50 max-w-[120px]">Siap dibagikan ke stakeholder.</p>
              <a href={`/admin/finance/profit-share?period=${period}`} className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black px-4 py-2 rounded-xl hover:bg-indigo-500 hover:text-white transition-all">
                BAGI HASIL <i className='bx bx-right-arrow-alt ml-1' />
              </a>
            </div>
            <i className='bx bxs-coin-stack absolute -bottom-8 -right-8 text-9xl text-white opacity-5' />
          </div>
        </div>
      </div>

      {/* ── Section 2: Rincian Arus Uang Masuk ── */}
      <div className="space-y-5">
        <SectionTitle n="2" title="Rincian Sumber Arus Masuk" />
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm finance-card">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 finance-stat-grid">
            {data?.income_breakdown && Object.entries(data.income_breakdown).map(([label, val], idx) => {
              const colorClasses = [
                { bg: 'bg-indigo-50', border: 'border-indigo-100', textMain: 'text-indigo-500', textSub: 'text-indigo-400' },
                { bg: 'bg-emerald-50', border: 'border-emerald-100', textMain: 'text-emerald-500', textSub: 'text-emerald-400' },
                { bg: 'bg-amber-50', border: 'border-amber-100', textMain: 'text-amber-500', textSub: 'text-amber-400' },
                { bg: 'bg-sky-50', border: 'border-sky-100', textMain: 'text-sky-500', textSub: 'text-sky-400' },
                { bg: 'bg-rose-50', border: 'border-rose-100', textMain: 'text-rose-500', textSub: 'text-rose-400' }
              ];
              const c = colorClasses[idx % colorClasses.length];
              return (
                <div key={idx} className={`p-5 ${c.bg} rounded-3xl border ${c.border}`}>
                  <div className={`text-[10px] font-black ${c.textMain} uppercase tracking-widest mb-2`}>{label}</div>
                  <div className="text-lg font-black text-slate-900">{idr(val)}</div>
                  <div className={`text-[10px] font-bold ${c.textSub} mt-1`}>{pct(val, gross)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Section 3: Pemantauan Kas & Mutasi ── */}
      <div className="space-y-5">
        <SectionTitle n="3" title="Kas & Pencatatan Mutasi" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

          {/* Locations */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm finance-card">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Lokasi Saldo Riil</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                  TOTAL: {idr(data?.locations?.reduce((a, l) => a + l.balance, 0))}
                </span>
                <button onClick={() => handleLocationAction('create')} className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black hover:bg-indigo-500 hover:text-white transition-all">
                  + TAMBAH KAS
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {data?.locations?.map((loc, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-white transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm group-hover:text-indigo-500 transition-all">
                      <i className={`bx ${loc.name.toLowerCase().includes('kas') ? 'bx-wallet-alt' : 'bx-credit-card'} text-sm`} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-700 leading-tight">{loc.name}</div>
                      {loc.is_primary && <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Rekening Utama</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-black text-slate-900">{idr(loc.balance)}</div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleLocationAction('edit', loc)} className="text-slate-400 hover:text-indigo-500"><i className='bx bx-edit text-xs'></i></button>
                      <button onClick={() => handleLocationAction('delete', loc)} className="text-slate-400 hover:text-rose-500"><i className='bx bx-trash text-xs'></i></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mutation Form */}
          <div className="lg:col-span-3 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm finance-card">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Catat Mutasi Kas</h3>
            <form onSubmit={handleMutation} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={mutation.type}
                  onChange={e => setMutation({...mutation, type: e.target.value})}
                  className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:border-indigo-300 transition-all"
                >
                  {MUTATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select
                  value={mutation.status}
                  onChange={e => setMutation({...mutation, status: e.target.value})}
                  className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:border-indigo-300 transition-all"
                >
                  {MUTATION_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={mutation.category}
                  onChange={e => setMutation({...mutation, category: e.target.value})}
                  placeholder="Kategori (misal: Biaya Operasional)"
                  className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:bg-white focus:border-indigo-300 transition-all"
                />
                <input
                  type="number"
                  value={mutation.amount}
                  onChange={e => setMutation({...mutation, amount: e.target.value})}
                  placeholder="Nominal (Rp)"
                  className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-black outline-none focus:bg-white focus:border-indigo-300 transition-all text-indigo-600"
                />
              </div>

              <input
                type="text"
                value={mutation.description}
                onChange={e => setMutation({...mutation, description: e.target.value})}
                placeholder="Keterangan / Deskripsi transaksi"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:bg-white focus:border-indigo-300 transition-all"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select value={mutation.from_location_id} onChange={e => setMutation({...mutation, from_location_id: e.target.value})} className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none">
                  <option value="">Dari Rekening (Opsional)</option>
                  {data?.locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <select value={mutation.to_location_id} onChange={e => setMutation({...mutation, to_location_id: e.target.value})} className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none">
                  <option value="">Ke Rekening (Opsional)</option>
                  {data?.locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl text-xs font-black shadow-lg hover:bg-slate-800 transition-all border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan...</> : <><i className='bx bx-save' /> Simpan Mutasi</>}
              </button>
            </form>

            {/* Recent Mutations */}
            {data?.mutations?.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-50 space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mutasi Terkini</h4>
                {data.mutations.slice(0, 5).map((m, i) => (
                  <div key={i} className="flex justify-between items-center group relative p-2 -mx-2 hover:bg-slate-50 rounded-2xl transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${m.type === 'income' ? 'bg-emerald-50 text-emerald-600' : m.type === 'transfer' ? 'bg-sky-50 text-sky-600' : 'bg-rose-50 text-rose-500'}`}>
                        <i className={`bx ${m.type === 'income' ? 'bx-plus' : m.type === 'transfer' ? 'bx-transfer' : 'bx-minus'}`} />
                      </div>
                      <div>
                        <div className="text-[11px] font-black text-slate-700">{m.category}</div>
                        <div className="text-[9px] text-slate-400">{m.description || '-'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-xs font-black ${m.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>{idr(m.amount)}</div>
                        <div className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${m.status === 'processed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{m.status}</div>
                      </div>
                      <button onClick={() => handleDeleteMutation(m.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-500 transition-all">
                        <i className='bx bx-trash text-sm'></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Section 4: Audit Transaksi & Harga Modal ── */}
        <div className="space-y-5 pt-8">
          <SectionTitle n="4" title="Audit Transaksi & Harga Modal" />
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu / Customer</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Gross Amount</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Harga Modal (COGS)</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Gross Profit</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data?.recent_orders?.length > 0 ? (
                    data.recent_orders.map((order, i) => {
                      const profit = order.total_amount - order.total_cogs;
                      const margin = (profit / order.total_amount) * 100;
                      return (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6">
                            <div className="text-xs font-black text-slate-900">{order.customer || 'Customer'}</div>
                            <div className="text-[10px] font-bold text-slate-400">{new Date(order.created_at).toLocaleString('id-ID')}</div>
                            <div className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-1">ID: {(order.id || '').split('-')[0].toUpperCase()}</div>
                          </td>
                          <td className="px-8 py-6">
                            {(() => {
                              const statusMap = {
                                completed:     { label: 'Selesai',       cls: 'bg-emerald-50 text-emerald-600' },
                                delivered:     { label: 'Terkirim',      cls: 'bg-emerald-50 text-emerald-600' },
                                shipped:       { label: 'Dikirim',       cls: 'bg-sky-50 text-sky-600'         },
                                ready_to_ship: { label: 'Siap Kirim',    cls: 'bg-indigo-50 text-indigo-600'   },
                                paid:          { label: 'Dibayar',       cls: 'bg-amber-50 text-amber-600'     },
                                processing:    { label: 'Diproses',      cls: 'bg-amber-50 text-amber-600'     },
                                cancelled:     { label: 'Dibatalkan',    cls: 'bg-rose-50 text-rose-500'       },
                              };
                              const s = statusMap[order.status] || { label: order.status, cls: 'bg-slate-50 text-slate-500' };
                              return <span className={`text-[9px] font-black px-2 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
                            })()}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="text-xs font-black text-slate-900">{idr(order.total_amount)}</div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="text-xs font-black text-rose-500">{idr(order.total_cogs)}</div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="text-xs font-black text-emerald-600">{idr(profit)}</div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className={`text-[10px] font-black px-2 py-1 rounded-lg inline-block ${margin > 20 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                              {margin.toFixed(1)}%
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center opacity-30">
                          <i className='bx bx-data text-4xl mb-2' />
                          <span className="text-xs font-bold">Belum ada data transaksi untuk audit</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {data?.recent_orders?.length >= 20 && (
                    <tr>
                      <td colSpan="6" className="px-8 py-4 text-center">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full inline-block">
                          Menampilkan 20 transaksi terbaru. Gunakan filter periode untuk data historis lengkap.
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 5: Riwayat Aktivitas Wallet (Audit Trail Lengkap) ── */}
      <div className="space-y-5">
        <SectionTitle n="5" title="Audit Trail — Seluruh Aktivitas Wallet" />
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden finance-card">
          <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50">
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Real-time Feed</div>
              <div className="text-sm font-black text-slate-900">Semua pergerakan uang di sistem</div>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
              {data?.wallet_activity?.length || 0} transaksi
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pemilik Wallet</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data?.wallet_activity?.length > 0 ? (
                  data.wallet_activity.map((tx, i) => {
                    const isIn = tx.amount > 0;
                    const typeMap = {
                      sale_revenue:      { label: 'Penjualan',       cls: 'bg-emerald-50 text-emerald-600' },
                      platform_fee:      { label: 'Biaya Platform',  cls: 'bg-indigo-50 text-indigo-600' },
                      commission_earned: { label: 'Komisi Afiliasi', cls: 'bg-sky-50 text-sky-600' },
                      restock_revenue:   { label: 'Restock',         cls: 'bg-amber-50 text-amber-600' },
                      withdrawal:        { label: 'Penarikan',       cls: 'bg-rose-50 text-rose-600' },
                      refund:            { label: 'Refund',          cls: 'bg-rose-50 text-rose-600' },
                      topup:             { label: 'Top Up',          cls: 'bg-emerald-50 text-emerald-600' },
                    };
                    const t = typeMap[tx.type] || { label: tx.type, cls: 'bg-slate-50 text-slate-600' };
                    return (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-4">
                          <div className="text-[10px] font-black text-slate-700">{new Date(tx.created_at).toLocaleDateString('id-ID')}</div>
                          <div className="text-[9px] text-slate-400">{new Date(tx.created_at).toLocaleTimeString('id-ID')}</div>
                        </td>
                        <td className="px-8 py-4">
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full ${t.cls}`}>
                            {t.label}
                          </span>
                        </td>
                        <td className="px-8 py-4">
                          <div className="text-[11px] font-bold text-slate-600">{tx.wallet_owner}</div>
                        </td>
                        <td className="px-8 py-4">
                          <div className="text-[10px] text-slate-400 max-w-[200px] truncate">{tx.description || '-'}</div>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className={`text-xs font-black ${isIn ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {isIn ? '+' : ''}{idr(tx.amount)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-8 py-16 text-center">
                      <div className="flex flex-col items-center opacity-30">
                        <i className='bx bx-wallet text-4xl mb-2' />
                        <span className="text-xs font-bold">Belum ada aktivitas wallet untuk periode ini</span>
                      </div>
                    </td>
                  </tr>
                )}
                  {data?.wallet_activity?.length >= 100 && (
                    <tr>
                      <td colSpan="5" className="px-8 py-4 text-center">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full inline-block">
                          Menampilkan 100 aktivitas wallet terbaru.
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        </div>
      </div>

      <FinanceConfigModal isOpen={showConfig} onClose={() => setShowConfig(false)} onRefresh={fetchData} />
    </div>
  );
}

function SectionTitle({ n, title }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-sm shadow-xl shadow-slate-200">{n}</div>
      <h2 className="text-xl font-black text-slate-900 tracking-tight">{title}</h2>
    </div>
  );
}
