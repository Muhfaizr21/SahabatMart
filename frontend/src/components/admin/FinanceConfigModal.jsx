import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE } from '../../lib/api';
import { toast } from 'react-hot-toast';

const API = ADMIN_API_BASE;
const idr = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const SectionLabel = ({ children, color = 'text-slate-400' }) => (
  <div className={`text-[10px] font-black uppercase tracking-widest ${color} mb-4`}>{children}</div>
);

export default function FinanceConfigModal({ isOpen, onClose, onRefresh }) {
  const [dsList, setDsList]       = useState([]);
  const [psList, setPsList]       = useState([]);
  const [isList, setIsList]       = useState([]);
  const [payoutDates, setPayoutDates] = useState('all');
  const [minPayout, setMinPayout]     = useState(50000);
  const [settlementDelay, setSettlementDelay] = useState(24);
  const [platformFee, setPlatformFee] = useState(5);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [grossRevenue, setGrossRevenue] = useState(0);
  const [netProfit, setNetProfit]     = useState(0);

  useEffect(() => {
    if (isOpen) fetchConfigs();
  }, [isOpen]);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/finance/revenue-detail?period=all`, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token'), 'ngrok-skip-browser-warning': 'true' }
      });
      const res = await r.json();
      setDsList(res.config?.data_saving_list || []);
      setPsList(res.config?.profit_share_list || []);
      setIsList(res.config?.income_source_list || []);
      setPayoutDates(res.config?.payout_payday_dates || 'all');
      setMinPayout(res.config?.payout_min_amount || 50000);
      setSettlementDelay(res.config?.settlement_delay_hours || 24);
      setPlatformFee(res.config?.platform_fee_percent || 5);
      setGrossRevenue(res.gross_revenue || 0);
      setNetProfit(res.net_profit || 0);
    } catch (_e) {
      toast.error('Gagal memuat konfigurasi');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const dsTotal = dsList.reduce((s, i) => s + (parseFloat(i.percent) || 0), 0);
    const psTotal = psList.reduce((s, i) => s + (parseFloat(i.percent) || 0), 0);
    if (dsTotal > 100) { toast.error('Total alokasi biaya tidak boleh melebihi 100%'); return; }
    if (psTotal > 100) { toast.error('Total bagi hasil tidak boleh melebihi 100%'); return; }

    setSaving(true);
    try {
      const r = await fetch(`${API}/finance/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token'), 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ finance_data_saving_list: dsList, finance_profit_share_list: psList, finance_income_source_list: isList, payout_payday_dates: payoutDates, payout_min_amount: minPayout, settlement_delay_hours: settlementDelay, platform_fee_percent: platformFee })
      });
      if (r.ok) { toast.success('Konfigurasi disimpan'); onRefresh(); onClose(); }
      else toast.error('Gagal menyimpan');
    } catch { toast.error('Error server'); }
    finally { setSaving(false); }
  };

  const addCategory = (type) => {
    if (type === 'ds') setDsList([...dsList, { name: '', percent: 0 }]);
    else if (type === 'ps') setPsList([...psList, { name: '', percent: 0 }]);
    else setIsList([...isList, { name: '', type: 'manual' }]);
  };

  const removeCategory = (type, idx) => {
    if (type === 'ds') setDsList(dsList.filter((_, i) => i !== idx));
    else if (type === 'ps') setPsList(psList.filter((_, i) => i !== idx));
    else setIsList(isList.filter((_, i) => i !== idx));
  };

  const updateItem = (type, idx, field, value) => {
    let list = type === 'ds' ? [...dsList] : type === 'ps' ? [...psList] : [...isList];
    list[idx][field] = field === 'percent' ? Number(value) : value;
    if (type === 'ds') setDsList(list);
    else if (type === 'ps') setPsList(list);
    else setIsList(list);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="bg-white w-full max-w-4xl rounded-[28px] shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in duration-200">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-100 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <i className="bx bxs-cog text-xl text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Pengaturan Keuangan</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Kebijakan biaya, jadwal payout, bagi hasil</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-slate-100 hover:bg-rose-50 hover:text-rose-500 rounded-2xl flex items-center justify-center transition-all text-slate-400">
            <i className='bx bx-x text-xl' />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-7 space-y-7">

          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-sm text-slate-400 font-semibold">Memuat konfigurasi...</span>
            </div>
          ) : (
            <>
              {/* Policy Grid */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <SectionLabel color="text-rose-500">Kebijakan Biaya & Pencairan</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-600">Biaya Layanan Platform</span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Pajak per transaksi</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input type="number" value={platformFee} onChange={e => setPlatformFee(e.target.value)} className="w-16 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-indigo-600 outline-none text-center" />
                        <span className="text-xs font-bold text-slate-400">%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-600">Delay Settlement</span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Jeda sebelum dana cair</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input type="number" value={settlementDelay} onChange={e => setSettlementDelay(e.target.value)} className="w-16 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-700 outline-none text-center" />
                        <span className="text-xs font-bold text-slate-400">jam</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-600">Minimal Penarikan</span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Batas bawah payout</div>
                      </div>
                      <input type="number" value={minPayout} onChange={e => setMinPayout(e.target.value)} className="w-28 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-700 outline-none" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-600">Tanggal Payout</span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Format: 1,15 atau all</div>
                      </div>
                      <input type="text" value={payoutDates} onChange={e => setPayoutDates(e.target.value)} placeholder="1,15 atau all" className="w-28 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-sky-600 outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Allocation Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Data Saving */}
                <div className="bg-indigo-50/40 rounded-2xl p-5 border border-indigo-100">
                  <div className="flex items-center justify-between mb-4">
                    <SectionLabel color="text-indigo-500">Alokasi Biaya (Saving)</SectionLabel>
                    <button onClick={() => addCategory('ds')} className="text-[10px] font-black bg-indigo-500 text-white px-3 py-1.5 rounded-full hover:bg-indigo-600 transition-all">
                      + POS
                    </button>
                  </div>
                  <div className="space-y-2">
                    {dsList.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white rounded-xl border border-indigo-100 p-3 group">
                        <input type="text" value={item.name} onChange={e => updateItem('ds', idx, 'name', e.target.value)} placeholder="Nama pos" className="flex-1 bg-transparent text-xs font-bold text-slate-700 outline-none placeholder:text-slate-300" />
                        <div className="text-right">
                          <input type="number" value={item.percent} onChange={e => updateItem('ds', idx, 'percent', e.target.value)} className="w-14 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-black text-indigo-600 outline-none text-center" />
                          <div className="text-[9px] text-slate-400 font-bold mt-0.5">{idr(grossRevenue * (parseFloat(item.percent) || 0) / 100)}</div>
                        </div>
                        <button onClick={() => removeCategory('ds', idx)} className="text-slate-300 hover:text-rose-500 transition-colors">
                          <i className="bx bx-x text-base" />
                        </button>
                      </div>
                    ))}
                    {dsList.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-xs font-semibold">Belum ada pos alokasi</div>
                    )}
                  </div>
                  {dsList.length > 0 && (
                    <div className="mt-3 text-xs font-black text-slate-400 text-right">
                      Total: {dsList.reduce((s, i) => s + (parseFloat(i.percent) || 0), 0)}% / 100%
                    </div>
                  )}
                </div>

                {/* Profit Share */}
                <div className="bg-emerald-50/40 rounded-2xl p-5 border border-emerald-100">
                  <div className="flex items-center justify-between mb-4">
                    <SectionLabel color="text-emerald-500">Bagi Hasil (Profit Share)</SectionLabel>
                    <button onClick={() => addCategory('ps')} className="text-[10px] font-black bg-emerald-500 text-white px-3 py-1.5 rounded-full hover:bg-emerald-600 transition-all">
                      + POS
                    </button>
                  </div>
                  <div className="space-y-2">
                    {psList.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white rounded-xl border border-emerald-100 p-3 group">
                        <input type="text" value={item.name} onChange={e => updateItem('ps', idx, 'name', e.target.value)} placeholder="Nama penerima" className="flex-1 bg-transparent text-xs font-bold text-slate-700 outline-none placeholder:text-slate-300" />
                        <div className="text-right">
                          <input type="number" value={item.percent} onChange={e => updateItem('ps', idx, 'percent', e.target.value)} className="w-14 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-black text-emerald-600 outline-none text-center" />
                          <div className="text-[9px] text-slate-400 font-bold mt-0.5">{idr(netProfit * (parseFloat(item.percent) || 0) / 100)}</div>
                        </div>
                        <button onClick={() => removeCategory('ps', idx)} className="text-slate-300 hover:text-rose-500 transition-colors">
                          <i className="bx bx-x text-base" />
                        </button>
                      </div>
                    ))}
                    {psList.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-xs font-semibold">Belum ada pos bagi hasil</div>
                    )}
                  </div>
                  {psList.length > 0 && (
                    <div className="mt-3 text-xs font-black text-slate-400 text-right">
                      Total: {psList.reduce((s, i) => s + (parseFloat(i.percent) || 0), 0)}% / 100%
                    </div>
                  )}
                </div>
              </div>

              {/* Income Sources */}
              <div className="bg-amber-50/40 rounded-2xl p-5 border border-amber-100">
                <div className="flex items-center justify-between mb-5">
                  <SectionLabel color="text-amber-500">Sumber Pendapatan (Income Sources)</SectionLabel>
                  <button onClick={() => addCategory('is')} className="text-[10px] font-black bg-amber-500 text-white px-3 py-1.5 rounded-full hover:bg-amber-600 transition-all">
                    + SUMBER
                  </button>
                </div>
                <div className="space-y-2">
                  {isList.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white rounded-xl border border-amber-100 p-3">
                      <input type="text" value={item.name} onChange={e => updateItem('is', idx, 'name', e.target.value)} placeholder="Nama tampilan" className="flex-1 bg-transparent text-xs font-bold text-slate-700 outline-none placeholder:text-slate-300" />
                      <input type="text" value={item.type} onChange={e => updateItem('is', idx, 'type', e.target.value)} placeholder="key" className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase text-amber-600 outline-none" />
                      <button onClick={() => removeCategory('is', idx)} className="text-slate-300 hover:text-rose-500 transition-colors">
                        <i className="bx bx-x text-base" />
                      </button>
                    </div>
                  ))}
                  {isList.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs font-semibold">Belum ada sumber pendapatan</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 rounded-b-[28px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
            <i className="bx bxs-info-circle text-rose-400 text-base" />
            Pengaturan langsung mempengaruhi kalkulasi profit & payout real-time
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all">Batal</button>
            <button onClick={handleSave} disabled={saving} className="px-8 py-3 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-60 flex items-center gap-2">
              {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}