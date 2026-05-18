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
        headers: { 
          Authorization: 'Bearer ' + localStorage.getItem('token'),
          'ngrok-skip-browser-warning': 'true'
        }
      });
      const res = await r.json();
      setData(res);
    } catch (_e) {
      toast.error("Gagal memuat detail profit share");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-3" />
      <p className="text-slate-500 text-sm font-medium">Menghitung pembagian laba...</p>
    </div>
  );

  if (!data || !data.summary) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-5xl mb-3">⚠️</div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Gagal Memuat Data</h2>
      <p className="text-slate-400 text-sm mb-6">Pastikan backend server SahabatMart sudah berjalan.</p>
      <button onClick={fetchData} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">Coba Lagi</button>
    </div>
  );

  const totalPages = Math.ceil((data.history?.length || 0) / itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-bold text-slate-900">Detail Profit Share</h1>
            <button
              onClick={() => setShowConfig(true)}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="Kelola Stakeholder"
            >
              <i className='bx bx-cog text-lg' />
            </button>
          </div>
          <p className="text-sm text-slate-400">Pembagian laba bersih — Periode: <span className="text-indigo-600 font-semibold uppercase">{period}</span></p>
        </div>

        {/* Summary Pills */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-right">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Total Dialokasikan</div>
            <div className="text-base font-bold text-indigo-600">{idr(data.summary?.allocated)}</div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-right">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Telah Cair</div>
            <div className="text-base font-bold text-emerald-600">{idr(data.summary?.paid)}</div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-right bg-rose-50 px-3 py-1.5 rounded-xl">
            <div className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider mb-0.5">Sisa Belum Cair</div>
            <div className="text-base font-bold text-rose-600">{idr(data.summary?.sisa)}</div>
          </div>
        </div>
      </div>

      {/* Stakeholder Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.pos_data?.map((pos, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md hover:border-indigo-200 transition-all group relative overflow-hidden">
            {/* Decorative background icon */}
            <i className='bx bxs-badge-check absolute -bottom-6 -right-6 text-[100px] text-slate-100 group-hover:text-indigo-50 transition-all pointer-events-none' />

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <i className='bx bx-user-voice text-xl' />
                </div>
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">{pos.percent}%</span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 mb-0.5">{pos.name}</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-3">Alokasi Laba Bersih</p>
              <div className="text-2xl font-bold text-slate-900 mb-4">{idr(pos.allocated)}</div>

              <div className="space-y-2 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 text-xs">Total Cair (Riil)</span>
                  <span className="font-bold text-emerald-600">{idr(pos.paid)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 text-xs">Dalam Rencana</span>
                  <span className="font-bold text-amber-500">{idr(pos.planned)}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1.5 border-t border-slate-100">
                  <span className="text-slate-700 text-xs font-semibold">Sisa Kewajiban</span>
                  <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-lg text-xs">{idr(pos.sisa)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Add Stakeholder button */}
        <button
          onClick={() => setShowConfig(true)}
          className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all group min-h-[180px]"
        >
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm mb-2 group-hover:scale-105 transition-all border border-slate-200">
            <i className='bx bx-plus text-xl' />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider">Tambah Stakeholder</span>
        </button>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900">Riwayat Alokasi & Pencairan</h3>
          <span className="text-xs text-slate-400">{data.history?.length || 0} aktivitas</span>
        </div>

        {data.history?.length > 0 ? (
          <>
            <div className="divide-y divide-slate-100">
              {data.history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((h, i) => (
                <div key={i} className="flex justify-between items-center px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex gap-3 items-center">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${h.type.includes('Alokasi') ? 'bg-indigo-50 text-indigo-500' : 'bg-rose-50 text-rose-500'}`}>
                      <i className={`bx ${h.type.includes('Alokasi') ? 'bx-plus-circle' : 'bx-minus-circle'} text-base`} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{h.type}: <span className="text-indigo-600 capitalize">{h.category}</span></div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{new Date(h.created_at).toLocaleString('id-ID')} {h.desc && `• ${h.desc}`}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${h.type.includes('Alokasi') ? 'text-indigo-600' : 'text-rose-600'}`}>
                      {h.type.includes('Alokasi') ? '+' : '-'} {idr(h.amount)}
                    </div>
                    {h.status && <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">{h.status}</div>}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white disabled:opacity-30 transition-all"
                >
                  <i className='bx bx-chevron-left' />
                </button>
                <span className="text-xs text-slate-500 font-medium px-2">Hal. {currentPage} / {totalPages}</span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white disabled:opacity-30 transition-all"
                >
                  <i className='bx bx-chevron-right' />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-slate-300">
            <i className='bx bx-receipt text-4xl mb-3' />
            <p className="text-sm font-medium">Belum ada aktivitas arus kas untuk profit share ini.</p>
          </div>
        )}
      </div>

      {/* Cash Location Monitor */}
      {data.locations?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
          <div className="max-w-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Pantau Saldo Kas Stakeholder</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pastikan saldo di lokasi finansial mencukupi sebelum mencairkan alokasi profit share.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {data.locations.map((l, i) => (
              <div key={i} className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 min-w-[140px]">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{l.name}</div>
                <div className="text-base font-bold text-slate-900">{idr(l.balance)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <FinanceConfigModal
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        onRefresh={fetchData}
      />
    </div>
  );
}
