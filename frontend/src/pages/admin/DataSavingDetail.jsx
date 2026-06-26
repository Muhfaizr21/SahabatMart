import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ADMIN_API_BASE } from '../../lib/api';
import { toast } from 'react-hot-toast';
import FinanceConfigModal from '../../components/admin/FinanceConfigModal';

const API = ADMIN_API_BASE;
const idr = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

export default function DataSavingDetail() {
  const [searchParams] = useSearchParams();
  const period = searchParams.get('period') || 'all';
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => { fetchData(); }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/finance/data-saving-detail?period=${period}`, {
        headers: { 
          Authorization: 'Bearer ' + localStorage.getItem('token'),
          'ngrok-skip-browser-warning': 'true'
        }
      });
      const res = await r.json();
      setData(res);
    } catch (_e) {
      toast.error("Gagal memuat detail data saving");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) return <div className="p-10 text-center text-slate-400 font-black italic animate-pulse text-2xl">Menganalisis alokasi biaya...</div>;

  if (!data || !data.summary) return (
    <div className="p-20 text-center">
      <div className="mb-4"><i className="bx bx-error text-6xl text-amber-500" /></div>
      <h2 className="text-2xl font-black text-slate-900 mb-2">Gagal Memuat Data</h2>
      <p className="text-slate-400 mb-8">Pastikan backend server AkuGlow sudah berjalan di port 8080.</p>
      <button onClick={fetchData} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-indigo-200">Coba Lagi</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-10 pb-20">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Detail Data Saving</h1>
            <button 
              onClick={() => setShowConfig(true)}
              className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
              title="Kelola Kategori"
            >
              <i className='bx bx-cog text-xl' />
            </button>
          </div>
          <p className="text-sm text-slate-400">Alokasi biaya otomatis untuk periode: <span className="text-indigo-600 font-bold uppercase">{period}</span></p>
        </div>
        <div className="flex gap-4 items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
           <div className="text-right">
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Alokasi Biaya</div>
             <div className="text-xl font-black text-rose-500">{idr(data.summary?.allocated)}</div>
           </div>
           <div className="w-px h-10 bg-slate-100 mx-2" />
           <div className="text-right">
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telah Dibayarkan</div>
             <div className="text-xl font-black text-slate-900">{idr(data.summary?.paid)}</div>
           </div>
        </div>
      </div>

      {/* Dynamic Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.pos_data?.map((pos, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-6">
               <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                  <i className='bx bx-coin-stack text-xl' />
               </div>
               <span className="bg-rose-50 text-rose-600 text-[10px] font-black px-3 py-1 rounded-full">{pos.percent}%</span>
            </div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{pos.name}</h3>
            <div className="text-2xl font-black text-slate-900 tracking-tighter mb-4">{idr(pos.allocated)}</div>
            
            <div className="space-y-2 pt-4 border-t border-slate-50">
               <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-400">Dibayar</span>
                  <span className="text-slate-900">{idr(pos.paid)}</span>
               </div>
               <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-400">Direncanakan</span>
                  <span className="text-indigo-500">{idr(pos.planned)}</span>
               </div>
               <div className="flex justify-between text-[11px] font-black pt-2 border-t border-slate-50">
                  <span className="text-slate-900">Sisa Saldo</span>
                  <span className={pos.sisa > 0 ? "text-rose-500" : "text-emerald-500"}>{idr(pos.sisa)}</span>
               </div>
            </div>
          </div>
        ))}
        {/* Empty State / Add Suggestion */}
        <button 
          onClick={() => setShowConfig(true)}
          className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-all">
            <i className='bx bx-plus text-2xl' />
          </div>
          <span className="text-xs font-black uppercase tracking-widest">Tambah Kategori</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
           <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8">Riwayat Arus Kas (Data Saving)</h3>
            <div className="space-y-6">
              {data.history?.length > 0 ? (
                <>
                  {data.history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((h, i) => (
                    <div key={i} className="flex justify-between items-center group">
                      <div className="flex gap-4 items-center">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${h.type.includes('Alokasi') ? 'bg-indigo-50 text-indigo-500' : 'bg-rose-50 text-rose-500'}`}>
                           <i className={`bx ${h.type.includes('Alokasi') ? 'bx-plus-circle' : 'bx-minus-circle'}`} />
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900">{h.type} : <span className="text-indigo-600 capitalize">{h.category}</span></div>
                          <div className="text-[10px] text-slate-400 font-bold">{new Date(h.created_at).toLocaleString()} • {h.desc}</div>
                        </div>
                      </div>
                      <div className="text-right">
                         <div className={`text-sm font-black ${h.type.includes('Alokasi') ? 'text-indigo-600' : 'text-rose-600'}`}>
                            {h.type.includes('Alokasi') ? '+' : '-'} {idr(h.amount)}
                         </div>
                         {h.status && <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{h.status}</div>}
                      </div>
                    </div>
                  ))}
                  
                  {/* Pagination Controls */}
                  {data.history.length > itemsPerPage && (
                    <div className="flex justify-center gap-2 pt-8 border-t border-slate-50">
                      <button 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      >
                        <i className='bx bx-chevron-left text-xl' />
                      </button>
                      <div className="flex items-center px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        Page {currentPage} of {Math.ceil(data.history.length / itemsPerPage)}
                      </div>
                      <button 
                        disabled={currentPage === Math.ceil(data.history.length / itemsPerPage)}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      >
                        <i className='bx bx-chevron-right text-xl' />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20 text-slate-300 font-black italic">Belum ada aktivitas arus kas untuk kategori ini.</div>
              )}
            </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl shadow-slate-200">
           <h3 className="text-sm font-black text-indigo-300 uppercase tracking-widest mb-8">Lokasi Saldo Saat Ini</h3>
           <div className="space-y-4">
             {data.locations?.map((l, i) => (
               <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                  <span className="text-xs font-black">{l.name}</span>
                  <span className="text-sm font-black">{idr(l.balance)}</span>
               </div>
             ))}
           </div>
           <div className="mt-10 p-6 bg-indigo-500/10 rounded-3xl border border-indigo-500/20">
              <p className="text-[11px] font-bold text-indigo-200 leading-relaxed">
                <i className='bx bxs-info-circle mr-1' /> 
                Gunakan menu **Mutasi** di dashboard utama untuk mencatat pembayaran riil dari pos-pos biaya di atas.
              </p>
           </div>
        </div>
      </div>

      <FinanceConfigModal 
        isOpen={showConfig} 
        onClose={() => setShowConfig(false)} 
        onRefresh={fetchData}
      />
    </div>
  );
}
