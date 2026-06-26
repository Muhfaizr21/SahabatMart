import { useState, useEffect } from 'react';
import { fetchJson, PUBLIC_API_BASE } from '../../lib/api';
import toast from 'react-hot-toast';

export default function AffiliateVouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchJson(`${PUBLIC_API_BASE}/vouchers`)
      .then(res => {
        setVouchers(res || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch vouchers:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    toast.success('Kode voucher berhasil disalin!');
    setTimeout(() => setCopied(null), 2000);
  }

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6 bg-[#0f172a] rounded-[2.5rem] border border-slate-800 p-8">
      <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-[2rem] flex items-center justify-center border border-red-500/20">
        <span className="material-symbols-outlined text-4xl">error</span>
      </div>
      <div>
        <h3 className="text-xl font-black text-white tracking-tighter">Gagal Memuat Voucher</h3>
        <p className="text-slate-400 max-w-xs mx-auto mt-2 text-sm">{error}</p>
      </div>
      <button 
        onClick={() => window.location.reload()}
        className="px-8 py-3 bg-white text-[#0f172a] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all"
      >
        Coba Lagi
      </button>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px] bg-[#0f172a] rounded-[2.5rem] border border-slate-800">
      <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="bg-[#0f172a] p-4 md:p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden min-h-[500px]">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] -mr-48 -mt-48"></div>
      
      <div className="flex items-center gap-5 mb-10 relative z-10">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-purple-500/20 ring-1 ring-white/10"><i className="bx bx-purchase-tag"></i></div>
        <div>
          <h2 className="text-xl font-black text-white leading-tight italic tracking-tighter">Voucher Promo Mitra</h2>
          <p className="text-slate-400 text-[10px] font-medium mt-0.5">Bagikan kode eksklusif untuk tingkatkan konversi.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {vouchers.map(v => (
          <div key={v.id} className="group bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-5 rounded-3xl relative hover:border-purple-500/50 transition-all duration-500 overflow-hidden flex flex-col">
            {/* Hover Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="flex justify-between items-start mb-5 relative z-10">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-black uppercase text-purple-400 tracking-[0.2em] italic">E-VOUCHER</span>
                </div>
                <div className="text-3xl font-black text-white tracking-tighter flex items-baseline gap-0.5">
                  {v.discount_type === 'percent' ? v.discount_value : (v.discount_value/1000).toFixed(0)}
                  <span className="text-sm text-slate-400">{v.discount_type === 'percent' ? '%' : 'rb'}</span>
                  <span className="text-sm ml-0.5 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">OFF</span>
                </div>
              </div>
              <div className="bg-slate-800/80 backdrop-blur-md text-white font-black px-3 py-2 rounded-xl text-xs tracking-widest border border-slate-700 uppercase shadow-lg group-hover:bg-purple-600 transition-all duration-500">
                {v.code}
              </div>
            </div>

            <div className="space-y-2 mb-6 relative z-10 flex-1">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                    <p className="text-[10px] text-slate-300 font-medium">
                        Min. Belanja <span className="text-white font-black">Rp{v.min_order.toLocaleString('id')}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                    <p className="text-[10px] text-slate-400 font-medium">
                        S/D <span className="text-slate-200">{new Date(v.expiry_date).toLocaleDateString('id', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </p>
                </div>
            </div>

            <button 
              onClick={() => handleCopy(v.code)}
              className={`w-full py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all duration-300 relative z-10 ${
                copied === v.code 
                ? 'bg-green-500 text-white' 
                : 'bg-white text-slate-900 hover:bg-purple-50'
              }`}
            >
              {copied === v.code ? 'TERSALIN!' : 'SALIN KODE VOUCHER'}
            </button>
            
            {/* Card Decor */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-purple-600/5 rounded-full blur-2xl group-hover:bg-purple-600/10 transition-colors"></div>
          </div>
        ))}
      </div>

      {vouchers.length === 0 && !loading && (
        <div className="text-center py-20 relative z-10">
            <div className="mb-4 opacity-20"><i className="bx bx-purchase-tag text-6xl text-slate-400" /></div>
            <h3 className="text-white font-black text-xl tracking-tighter">Belum Ada Voucher Tersedia</h3>
            <p className="text-slate-500 text-sm mt-2">Cek kembali nanti untuk promo menarik lainnya.</p>
        </div>
      )}
    </div>
  );
}
