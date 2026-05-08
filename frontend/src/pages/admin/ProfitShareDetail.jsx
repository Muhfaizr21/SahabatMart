import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ADMIN_API_BASE } from '../../lib/api';
import { toast } from 'react-hot-toast';
import FinanceConfigModal from '../../components/admin/FinanceConfigModal';

const API = ADMIN_API_BASE;
const idr = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

export default function ProfitShareDetail() {
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
      const r = await fetch(`${API}/finance/profit-share-detail?period=${period}`, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      const res = await r.json();
      setData(res);
    } catch (e) {
      toast.error("Gagal memuat detail profit share");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) return <div className="p-10 text-center text-slate-400 font-black italic animate-pulse text-2xl">Menghitung pembagian laba...</div>;

  if (!data || !data.summary) return (
    <div className="p-20 text-center">
      <div className="text-6xl mb-4">⚠️</div>
      <h2 className="text-2xl font-black text-slate-900 mb-2">Gagal Memuat Data</h2>
      <p className="text-slate-400 mb-8">Pastikan backend server SahabatMart sudah berjalan di port 8080.</p>
      <button onClick={fetchData} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-indigo-200">Coba Lagi</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-10 pb-20">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Detail Profit Share</h1>
            <button 
              onClick={() => setShowConfig(true)}
              className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
              title="Kelola Stakeholder"
            >
              <i className='bx bx-cog text-xl' />
            </button>
          </div>
          <p className="text-sm text-slate-400">Pembagian laba bersih untuk periode: <span className="text-indigo-600 font-bold uppercase">{period}</span></p>
        </div>
        <div className="flex gap-4 items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
           <div className="text-right">
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Laba Dialokasikan</div>
             <div className="text-xl font-black text-indigo-600">{idr(data.summary?.allocated)}</div>
           </div>
           <div className="w-px h-10 bg-slate-100 mx-2" />
           <div className="text-right">
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telah Cair (Paid)</div>
             <div className="text-xl font-black text-emerald-500">{idr(data.summary?.paid)}</div>
           </div>
           <div className="w-px h-10 bg-slate-100 mx-2" />
           <div className="text-right px-4 py-2 bg-rose-50 rounded-xl">
             <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Sisa Saldo (Belum Cair)</div>
             <div className="text-xl font-black text-rose-600">{idr(data.summary?.sisa)}</div>
           </div>
        </div>
      </div>

      {/* Dynamic Stakeholder Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {data.pos_data?.map((pos, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="flex justify-between items-start mb-10 relative z-10">
               <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                  <i className='bx bx-user-voice text-2xl' />
               </div>
               <div className="text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Persentase Hak</span>
                  <span className="bg-indigo-100 text-indigo-600 text-sm font-black px-4 py-1.5 rounded-full">{pos.percent}%</span>
               </div>
            </div>

            <h3 className="text-lg font-black text-slate-900 tracking-tight mb-1 relative z-10">{pos.name}</h3>
            <p className="text-[11px] text-slate-400 font-bold mb-6 relative z-10 uppercase tracking-widest">Alokasi Laba Bersih</p>
            
            <div className="text-3xl font-black text-slate-900 tracking-tighter mb-8 relative z-10">{idr(pos.allocated)}</div>
            
            <div className="space-y-4 pt-6 border-t border-slate-50 relative z-10">
               <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">Total Cair (Riil)</span>
                  <span className="text-sm font-black text-emerald-500">{idr(pos.paid)}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">Dalam Rencana</span>
                  <span className="text-sm font-black text-amber-500">{idr(pos.planned)}</span>
               </div>
               <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-black text-slate-900">Sisa Kewajiban</span>
                  <span className="text-sm font-black text-rose-500 bg-rose-50 px-3 py-1 rounded-lg">{idr(pos.sisa)}</span>
               </div>
            </div>

            <i className='bx bxs-badge-check absolute -bottom-10 -right-10 text-[160px] text-slate-50 opacity-20 group-hover:scale-110 transition-all' />
          </div>
        ))}
        {/* Add Stakeholder Suggestion */}
        <button 
          onClick={() => setShowConfig(true)}
          className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px] p-8 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-300 hover:text-emerald-500 transition-all group"
        >
          <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-all">
            <i className='bx bx-plus text-3xl' />
          </div>
          <span className="text-sm font-black uppercase tracking-widest">Tambah Stakeholder</span>
        </button>
      </div>

      {/* Riwayat Arus Kas */}
      <div className="bg-white p-8 lg:p-10 rounded-[48px] border border-slate-100 shadow-sm">
         <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">Riwayat Alokasi & Pencairan</h3>
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
               <div className="text-center py-20 text-slate-300 font-black italic">Belum ada aktivitas arus kas untuk profit share ini.</div>
            )}
         </div>
      </div>

      {/* Info Lokasi Saldo */}
      <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-10 items-center justify-between">
         <div className="max-w-md">
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Pantau Kas stakeholder</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Pastikan saldo di lokasi finansial (Bank/Kas) mencukupi sebelum mencairkan alokasi profit share kepada stakeholder.
            </p>
         </div>
         <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide w-full md:w-auto">
            {data.locations?.map((l, i) => (
               <div key={i} className="min-w-[180px] p-5 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{l.name}</div>
                  <div className="text-lg font-black text-slate-900">{idr(l.balance)}</div>
               </div>
            ))}
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
