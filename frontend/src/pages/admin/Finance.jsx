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
  { value: 'custom', label: 'Kustom Tanggal' },
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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [mutation, setMutation] = useState(emptyMut);
  const [saving, setSaving]     = useState(false);

  useEffect(() => { fetchData(); }, [period, dateFrom, dateTo]);

  const fetchData = async () => {
    setLoading(true);
    let pParam = period;
    if (period === 'custom') {
      if (dateFrom && dateTo) {
        pParam = `${dateFrom}:${dateTo}`;
      } else {
        setLoading(false);
        return;
      }
    }
    try {
      const r = await fetch(`${API}/finance/revenue-detail?period=${pParam}`, {
        headers: { 
          Authorization: 'Bearer ' + localStorage.getItem('token'),
          'ngrok-skip-browser-warning': 'true'
        }
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
    if (!window.confirm(`Yakin ingin mencatat mutasi kas sebesar Rp${Number(mutation.amount).toLocaleString('id-ID')}?`)) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/finance/mutation`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: 'Bearer ' + localStorage.getItem('token'),
          'ngrok-skip-browser-warning': 'true'
        },
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
        headers: { 
          Authorization: 'Bearer ' + localStorage.getItem('token'),
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (r.ok) { toast.success('Mutasi dihapus'); fetchData(); }
      else toast.error('Gagal menghapus mutasi');
    } catch { toast.error('Error server'); }
  };

  const handleLocationAction = async (action, loc = null) => {
    try {
      if (action === 'delete') {
        if (!window.confirm(`Hapus kas "${loc.name}"? Pastikan tidak ada uang tersisa di dalamnya.`)) return;
        const r = await fetch(`${API}/finance/locations?id=${loc.id}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + localStorage.getItem('token'), 'ngrok-skip-browser-warning': 'true' } });
        if (r.ok) { toast.success('Kas dihapus'); fetchData(); }
      } else if (action === 'create') {
        const name = window.prompt('Masukkan nama Lokasi Kas / Bank baru:');
        if (!name) return;
        if (!window.confirm(`Buat Kas/Bank baru dengan nama "${name}"?`)) return;
        const r = await fetch(`${API}/finance/locations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token'), 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({ name, balance: 0, is_primary: false })
        });
        if (r.ok) { toast.success('Kas berhasil ditambahkan'); fetchData(); }
      } else if (action === 'edit') {
        const name = window.prompt('Edit nama Lokasi Kas / Bank:', loc.name);
        if (!name) return;
        const balanceRaw = window.prompt('Sesuaikan saldo aktual:', loc.balance);
        if (balanceRaw === null) return;
        if (!window.confirm(`Simpan perubahan untuk "${name}" dengan saldo Rp${Number(balanceRaw).toLocaleString('id-ID')}?`)) return;
        const r = await fetch(`${API}/finance/locations/update?id=${loc.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token'), 'ngrok-skip-browser-warning': 'true' },
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

  const actualPeriod = period === 'custom' ? `${dateFrom}:${dateTo}` : period;

  if (loading && !data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
      <p className="text-slate-500 font-medium">Memuat data keuangan...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Keuangan & Ledger</h1>
          <p className="text-slate-500 text-sm mt-1">Pantau arus kas, pendapatan, dan alokasi dana secara real-time.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-all"
              />
              <span className="text-slate-400 text-sm">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          )}
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
          >
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <button onClick={() => setShowConfig(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all">
            <i className='bx bx-cog text-lg' /> Konfigurasi
          </button>
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all disabled:opacity-70">
            <i className={`bx bx-refresh text-lg ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Main Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gross Revenue Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <i className='bx bx-trending-up text-xl'></i>
            </div>
          </div>
          <div className="text-sm font-medium text-slate-500 mb-1">Gross Revenue</div>
          <div className="text-3xl font-bold text-slate-900 mb-4">{idr(gross)}</div>
          
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Harga Modal (COGS)</span>
              <span className="font-medium text-slate-900">{idr(capitalCost)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-emerald-600 font-medium">Laba Kotor</span>
              <span className="font-bold text-emerald-600">{idr(grossProfit)}</span>
            </div>
          </div>
        </div>

        {/* Data Saving Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <i className='bx bx-pie-chart-alt-2 text-xl'></i>
            </div>
            <a href={`/admin/finance/data-saving?period=${actualPeriod}`} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
              Detail Alokasi
            </a>
          </div>
          <div className="text-sm font-medium text-slate-500 mb-1">Alokasi Biaya / Saving</div>
          <div className="text-3xl font-bold text-slate-900 mb-4">{idr(totalSaved)}</div>
          
          <div className="space-y-3 pt-4 border-t border-slate-100">
            {data?.data_saving && Object.entries(data.data_saving)
              .filter(([k]) => k !== 'total')
              .slice(0, 2)
              .map(([label, val], idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 capitalize">{label}</span>
                  <span className="font-medium text-slate-900">{idr(val.value)}</span>
                </div>
            ))}
            <div className="text-xs text-slate-400 pt-1">{pct(totalSaved, gross)}% dari Pendapatan</div>
          </div>
        </div>

        {/* Net Profit Card */}
        <div className="bg-slate-900 rounded-3xl p-6 shadow-lg shadow-slate-200/50 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <i className='bx bx-wallet text-8xl'></i>
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center">
                <i className='bx bx-check-shield text-xl'></i>
              </div>
            </div>
            <div className="text-sm font-medium text-slate-300 mb-1">Net Profit (Bersih)</div>
            <div className="text-3xl font-bold text-white mb-4">{idr(netProfit)}</div>
            
            <div className="space-y-3 pt-4 border-t border-white/10">
              {data?.profit_shares && Object.entries(data.profit_shares)
                .filter(([k]) => k !== 'total')
                .slice(0, 2)
                .map(([label, val], idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-slate-300 capitalize">{label}</span>
                    <span className="font-medium text-white">{idr(val.value)}</span>
                  </div>
              ))}
            </div>
            <div className="mt-6">
               <a href={`/admin/finance/profit-share?period=${actualPeriod}`} className="inline-flex items-center justify-center w-full py-2.5 px-4 text-sm font-medium bg-white text-slate-900 rounded-xl hover:bg-slate-50 transition-colors">
                  Bagi Hasil Stakeholder
               </a>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Income Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Rincian Arus Masuk</h2>
          <div className="space-y-4">
            {data?.income_breakdown && Object.entries(data.income_breakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([label, val], idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-600 font-medium">{label}</span>
                    <span className="font-bold text-slate-900">{idr(val)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${(val / gross * 100) || 0}%` }}></div>
                  </div>
                </div>
            ))}
          </div>
        </div>

        {/* Kas / Rekening */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-900">Manajemen Kas & Rekening</h2>
            <button onClick={() => handleLocationAction('create')} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl transition-colors">
              + Tambah Kas
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.locations?.map((loc, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-slate-50/50 transition-colors group relative">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
                      <i className={`bx ${loc.name.toLowerCase().includes('kas') ? 'bx-wallet-alt' : 'bx-credit-card'} text-xl`} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{loc.name}</div>
                      {loc.is_primary && <div className="text-xs font-medium text-indigo-600">Rekening Utama</div>}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 flex items-end justify-between">
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Saldo Aktif</div>
                    <div className="text-lg font-bold text-slate-900">{idr(loc.balance)}</div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleLocationAction('edit', loc)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 flex items-center justify-center shadow-sm">
                      <i className='bx bx-edit'></i>
                    </button>
                    <button onClick={() => handleLocationAction('delete', loc)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-rose-600 flex items-center justify-center shadow-sm">
                      <i className='bx bx-trash'></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mutasi Form & Riwayat */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          
          {/* Form */}
          <div className="p-6 lg:p-8 lg:col-span-2 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Catat Mutasi Baru</h2>
            <form onSubmit={handleMutation} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Tipe Mutasi</label>
                  <select value={mutation.type} onChange={e => setMutation({...mutation, type: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                    {MUTATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
                  <select value={mutation.status} onChange={e => setMutation({...mutation, status: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                    {MUTATION_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Kategori / Judul</label>
                <input type="text" value={mutation.category} onChange={e => setMutation({...mutation, category: e.target.value})} placeholder="Contoh: Operasional" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Nominal (Rp)</label>
                <input type="number" value={mutation.amount} onChange={e => setMutation({...mutation, amount: e.target.value})} placeholder="0" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Dari Rekening</label>
                  <select value={mutation.from_location_id} onChange={e => setMutation({...mutation, from_location_id: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                    <option value="">- Kosong -</option>
                    {data?.locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Ke Rekening</label>
                  <select value={mutation.to_location_id} onChange={e => setMutation({...mutation, to_location_id: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                    <option value="">- Kosong -</option>
                    {data?.locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Keterangan Tambahan</label>
                <textarea rows="2" value={mutation.description} onChange={e => setMutation({...mutation, description: e.target.value})} placeholder="Catatan opsional..." className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"></textarea>
              </div>
              <button type="submit" disabled={saving} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-70 flex justify-center items-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <i className='bx bx-save text-lg' />}
                Simpan Mutasi
              </button>
            </form>
          </div>

          {/* History */}
          <div className="p-6 lg:p-8 lg:col-span-3">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Mutasi Terakhir</h2>
            {data?.mutations?.length > 0 ? (
              <div className="space-y-4">
                {data.mutations.slice(0, 6).map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${m.type === 'income' ? 'bg-emerald-100 text-emerald-600' : m.type === 'transfer' ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
                        <i className={`bx ${m.type === 'income' ? 'bx-down-arrow-alt' : m.type === 'transfer' ? 'bx-transfer' : 'bx-up-arrow-alt'} text-xl`} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{m.category}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{m.description || 'Tidak ada catatan'}</div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <div className={`font-bold text-sm ${m.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>{idr(m.amount)}</div>
                        <div className="text-[10px] font-medium text-slate-400 mt-0.5 px-2 bg-slate-100 rounded-full inline-block">{m.status}</div>
                      </div>
                      <button onClick={() => handleDeleteMutation(m.id)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
                        <i className='bx bx-trash'></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <i className='bx bx-receipt text-4xl text-slate-300 mb-3'></i>
                <p className="text-slate-500 font-medium text-sm">Belum ada mutasi manual</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audit Tables Container */}
      <div className="space-y-6 pt-6">
        <h2 className="text-xl font-bold text-slate-900">Audit & Laporan Lanjutan</h2>
        
        {/* Orders Table */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-900">Laporan Transaksi & COGS</h3>
            <span className="text-xs font-medium text-slate-500">{data?.recent_orders?.length || 0} Transaksi</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-slate-500">
                  <th className="px-6 py-4 font-medium">Customer & Waktu</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Gross Amount</th>
                  <th className="px-6 py-4 font-medium text-right">COGS (Modal)</th>
                  <th className="px-6 py-4 font-medium text-right">Gross Profit</th>
                  <th className="px-6 py-4 font-medium text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.recent_orders?.length > 0 ? data.recent_orders.slice(0, 15).map((order, i) => {
                  const profit = order.total_amount - order.total_cogs;
                  const margin = (profit / order.total_amount) * 100;
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{order.customer || 'Customer'}</div>
                        <div className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString('id-ID')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 capitalize">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">{idr(order.total_amount)}</td>
                      <td className="px-6 py-4 text-right text-rose-600">{idr(order.total_cogs)}</td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-600">{idr(profit)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold ${margin > 20 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                }) : (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">Belum ada data transaksi</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Wallet Activity */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-900">Audit Trail Wallet (Real-time)</h3>
            <span className="text-xs font-medium text-slate-500">{data?.wallet_activity?.length || 0} Aktivitas</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-slate-500">
                  <th className="px-6 py-4 font-medium">Waktu</th>
                  <th className="px-6 py-4 font-medium">Tipe</th>
                  <th className="px-6 py-4 font-medium">Pemilik Wallet</th>
                  <th className="px-6 py-4 font-medium">Keterangan</th>
                  <th className="px-6 py-4 font-medium text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.wallet_activity?.length > 0 ? data.wallet_activity.slice(0, 15).map((tx, i) => {
                  const isIn = tx.amount > 0;
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{new Date(tx.created_at).toLocaleDateString('id-ID')}</div>
                        <div className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleTimeString('id-ID')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 capitalize">
                          {tx.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">{tx.wallet_owner}</td>
                      <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate" title={tx.description}>{tx.description || '-'}</td>
                      <td className={`px-6 py-4 text-right font-bold ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isIn ? '+' : ''}{idr(tx.amount)}
                      </td>
                    </tr>
                  )
                }) : (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">Belum ada aktivitas wallet</td></tr>
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
