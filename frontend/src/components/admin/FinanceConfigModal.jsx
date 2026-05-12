import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE } from '../../lib/api';
import { toast } from 'react-hot-toast';

const API = ADMIN_API_BASE;

const idr = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

export default function FinanceConfigModal({ isOpen, onClose, onRefresh }) {
  const [dsList, setDsList] = useState([]);
  const [psList, setPsList] = useState([]);
  const [isList, setIsList] = useState([]);
  const [payoutDates, setPayoutDates] = useState("all");
  const [minPayout, setMinPayout] = useState(50000);
  const [settlementDelay, setSettlementDelay] = useState(24);
  const [platformFee, setPlatformFee] = useState(5);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [grossRevenue, setGrossRevenue] = useState(0);
  const [netProfit, setNetProfit] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchConfigs();
    }
  }, [isOpen]);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/finance/revenue-detail`, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      const res = await r.json();
      setDsList(res.config?.data_saving_list || []);
      setPsList(res.config?.profit_share_list || []);
      setIsList(res.config?.income_source_list || []);
      setPayoutDates(res.config?.payout_payday_dates || "all");
      setMinPayout(res.config?.payout_min_amount || 50000);
      setSettlementDelay(res.config?.settlement_delay_hours || 24);
      setPlatformFee(res.config?.platform_fee_percent || 5);
      setGrossRevenue(res.gross_revenue || 0);
      setNetProfit(res.net_profit || 0);
    } catch (_e) {
      toast.error("Gagal memuat konfigurasi");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/finance/config`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({
          finance_data_saving_list: dsList,
          finance_profit_share_list: psList,
          finance_income_source_list: isList,
          payout_payday_dates: payoutDates,
          payout_min_amount: minPayout,
          settlement_delay_hours: settlementDelay,
          platform_fee_percent: platformFee
        })
      });
      if (r.ok) {
        toast.success("Konfigurasi berhasil diperbarui");
        onRefresh();
        onClose();
      }
    } catch (_e) {
      toast.error("Gagal update konfigurasi");
    } finally {
      setSaving(false);
    }
  };

  const addCategory = (type) => {
    const newItem = type === 'is' ? { name: '', type: 'platform_fee' } : { name: '', percent: 0 };
    if (type === 'ds') setDsList([...dsList, newItem]);
    else if (type === 'ps') setPsList([...psList, newItem]);
    else setIsList([...isList, newItem]);
  };

  const removeCategory = (type, index) => {
    if (type === 'ds') setDsList(dsList.filter((_, i) => i !== index));
    else if (type === 'ps') setPsList(psList.filter((_, i) => i !== index));
    else setIsList(isList.filter((_, i) => i !== index));
  };

  const updateItem = (type, index, field, value) => {
    let list;
    if (type === 'ds') list = [...dsList];
    else if (type === 'ps') list = [...psList];
    else list = [...isList];
    
    list[index][field] = field === 'percent' ? Number(value) : value;
    
    if (type === 'ds') setDsList(list);
    else if (type === 'ps') setPsList(list);
    else setIsList(list);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
        <div className="p-10 border-b border-slate-50 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pengaturan Keuangan</h2>
            <p className="text-sm text-slate-400 mt-1">Kelola kebijakan biaya, jadwal penarikan, dan bagi hasil.</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all">
            <i className='bx bx-x text-3xl' />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-12">
          {loading ? (
             <div className="py-20 text-center text-slate-400 font-bold italic animate-pulse">Memuat data konfigurasi...</div>
          ) : (
            <>
              {/* Financial Policy Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50 p-8 rounded-[32px] border border-slate-100">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Kebijakan Biaya & Pencairan</label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Biaya Layanan Platform</span>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={platformFee} 
                          onChange={e => setPlatformFee(e.target.value)}
                          className="w-24 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-slate-900 outline-none"
                        />
                        <span className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-400">%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Delay Settlement (Jam)</span>
                      <input 
                        type="number" 
                        value={settlementDelay} 
                        onChange={e => setSettlementDelay(e.target.value)}
                        className="w-24 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Kebijakan Penarikan (Payout)</label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Minimal Penarikan</span>
                      <input 
                        type="number" 
                        value={minPayout} 
                        onChange={e => setMinPayout(e.target.value)}
                        className="w-32 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-slate-900 outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Jadwal Penarikan (Tanggal)</span>
                      <input 
                        type="text" 
                        value={payoutDates} 
                        onChange={e => setPayoutDates(e.target.value)}
                        placeholder="e.g. 1,15 atau all"
                        className="w-32 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-sky-600 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Data Saving Section */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Alokasi Biaya (Data Saving)</label>
                    <button onClick={() => addCategory('ds')} className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-4 py-2 rounded-full hover:bg-indigo-600 hover:text-white transition-all">
                      + TAMBAH POS
                    </button>
                  </div>
                  <div className="space-y-3">
                    {dsList.map((item, idx) => (
                      <div key={idx} className="flex gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 group">
                        <input 
                          type="text" 
                          value={item.name} 
                          onChange={e => updateItem('ds', idx, 'name', e.target.value)}
                          placeholder="Contoh: Biaya Operasional"
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:border-indigo-300 outline-none transition-all"
                        />
                        <div className="relative flex flex-col items-end gap-1">
                          <div className="relative">
                            <input 
                              type="number" 
                              value={item.percent} 
                              onChange={e => updateItem('ds', idx, 'percent', e.target.value)}
                              className="w-20 bg-white border border-slate-200 rounded-xl pl-4 pr-7 py-2 text-xs font-black text-indigo-600 outline-none"
                            />
                            <span className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-400">%</span>
                          </div>
                          <div className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                            {idr(grossRevenue * (parseFloat(item.percent) || 0) / 100)}
                          </div>
                        </div>
                        <button onClick={() => removeCategory('ds', idx)} className="text-slate-300 hover:text-rose-500 p-2 transition-all self-start">
                          <i className='bx bx-trash text-lg' />
                        </button>
                      </div>
                    ))}
                    {dsList.length === 0 && <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs italic">Belum ada kategori alokasi biaya.</div>}
                  </div>
                </div>

                {/* Profit Share Section */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Alokasi Bagi Hasil (Profit Share)</label>
                    <button onClick={() => addCategory('ps')} className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-4 py-2 rounded-full hover:bg-emerald-600 hover:text-white transition-all">
                      + TAMBAH POS
                    </button>
                  </div>
                  <div className="space-y-3">
                    {psList.map((item, idx) => (
                      <div key={idx} className="flex gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 group">
                        <input 
                          type="text" 
                          value={item.name} 
                          onChange={e => updateItem('ps', idx, 'name', e.target.value)}
                          placeholder="Contoh: Investor A"
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:border-emerald-300 outline-none transition-all"
                        />
                        <div className="relative flex flex-col items-end gap-1">
                          <div className="relative">
                            <input 
                              type="number" 
                              value={item.percent} 
                              onChange={e => updateItem('ps', idx, 'percent', e.target.value)}
                              className="w-20 bg-white border border-slate-200 rounded-xl pl-4 pr-7 py-2 text-xs font-black text-emerald-600 outline-none"
                            />
                            <span className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-400">%</span>
                          </div>
                          <div className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                            {idr(netProfit * (parseFloat(item.percent) || 0) / 100)}
                          </div>
                        </div>
                        <button onClick={() => removeCategory('ps', idx)} className="text-slate-300 hover:text-rose-500 p-2 transition-all self-start">
                          <i className='bx bx-trash text-lg' />
                        </button>
                      </div>
                    ))}
                    {psList.length === 0 && <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs italic">Belum ada kategori bagi hasil.</div>}
                  </div>
                </div>
                {/* Income Sources Section */}
                <div className="col-span-full space-y-6 pt-12 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Daftar Sumber Pendapatan (Income Sources)</label>
                    <button onClick={() => addCategory('is')} className="bg-amber-50 text-amber-600 text-[10px] font-black px-4 py-2 rounded-full hover:bg-amber-600 hover:text-white transition-all">
                      + TAMBAH SUMBER
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isList.map((item, idx) => (
                      <div key={idx} className="flex gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 group">
                        <input 
                          type="text" 
                          value={item.name} 
                          onChange={e => updateItem('is', idx, 'name', e.target.value)}
                          placeholder="Nama Sumber (Tampilan)"
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:border-amber-300 outline-none transition-all"
                        />
                        <input 
                          type="text" 
                          value={item.type} 
                          onChange={e => updateItem('is', idx, 'type', e.target.value)}
                          placeholder="Tipe/Key (e.g. manual)"
                          className="w-32 bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase text-amber-600 focus:border-amber-300 outline-none transition-all"
                        />
                        <button onClick={() => removeCategory('is', idx)} className="text-slate-300 hover:text-rose-500 p-2 transition-all">
                          <i className='bx bx-trash text-lg' />
                        </button>
                      </div>
                    ))}
                    {isList.length === 0 && <div className="col-span-full text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs italic">Belum ada sumber pendapatan.</div>}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-10 border-t border-slate-50 bg-slate-50/50 rounded-b-[40px] flex items-center justify-between">
          <div className="flex items-start gap-3 max-w-md">
            <i className='bx bxs-info-circle text-2xl text-amber-500' />
            <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
              Pengaturan ini akan langsung mempengaruhi jadwal gajian merchant/affiliate dan perhitungan profit platform secara real-time.
            </p>
          </div>
          <div className="flex gap-4">
            <button onClick={onClose} className="px-8 py-4 rounded-2xl text-sm font-black text-slate-500 hover:bg-slate-100 transition-all">Batal</button>
            <button 
              onClick={handleUpdateConfig} 
              disabled={saving}
              className="bg-slate-900 text-white px-10 py-4 rounded-2xl text-sm font-black shadow-xl shadow-slate-200 hover:bg-slate-800 disabled:opacity-50 transition-all border-b-4 border-slate-700 active:border-b-0 active:translate-y-1"
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
