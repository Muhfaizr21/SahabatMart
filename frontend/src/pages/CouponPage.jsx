import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PUBLIC_API_BASE, fetchJson } from '../lib/api';
import toast from 'react-hot-toast';

export default function CouponPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson(`${PUBLIC_API_BASE}/vouchers`)
      .then(d => {
        const data = Array.isArray(d) ? d : (d.data || []);
        setCoupons(data);
      })
      .catch(() => setCoupons([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    toast.success(`Kode ${code} disalin!`, {
      style: {
        borderRadius: '16px',
        background: '#111827',
        color: '#fff',
        fontSize: '14px',
        fontWeight: 'bold',
      },
    });
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 text-yellow-500 rounded-full mb-4 shadow-inner">
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-3">Klaim Kupon Spesialmu!</h1>
          <p className="text-gray-500 max-w-xl mx-auto text-lg">Gunakan kode promo di bawah ini pada halaman *Checkout* untuk mendapatkan harga terbaik.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-20">
                <div className="spinner-border text-blue-600"></div>
                <p className="text-gray-500 mt-4 font-medium italic">Mencari kupon terbaik untukmu...</p>
            </div>
          ) : coupons.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-gray-100 italic text-gray-400">
                Belum ada kupon yang tersedia saat ini.
            </div>
          ) : coupons.map((c, i) => (
            <div key={i} className="flex flex-col sm:flex-row bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-shadow group relative">
              {/* Desain Tepi Ribbed (Kupon Sobek) */}
              <div className={`${c.bg_color || 'bg-blue-600'} sm:w-1/3 p-6 flex flex-col justify-center items-center text-center relative border-r-2 border-dashed border-white/40 min-h-[140px]`}>
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full"></div>
                
                <h3 className="text-white font-black text-2xl mb-1">
                    {c.discount_type === 'percent' ? `${c.discount_value}%` : `Rp${(c.discount_value || 0).toLocaleString('id')}`}
                </h3>
                <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider">Maks. Potongan</span>
              </div>
              
              <div className="p-6 sm:w-2/3 flex flex-col relative">
                 <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full"></div>
                 
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900 text-lg sm:text-xl line-clamp-1">{c.title}</h3>
                  <span className="text-[10px] font-bold uppercase py-1 px-2.5 bg-gray-100 text-gray-500 rounded-lg whitespace-nowrap">
                    Exp: {new Date(c.expiry_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                
                <p className="text-sm text-gray-500 mb-5 leading-relaxed flex-1 line-clamp-2">
                  {c.description}
                </p>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-50 border border-dashed border-gray-300 rounded-xl px-2 py-3 font-mono font-bold text-gray-900 text-center tracking-widest text-base sm:text-lg">
                    {c.code}
                  </div>
                  <button 
                    onClick={() => handleCopy(c.code)}
                    className="bg-gray-900 hover:bg-blue-600 text-white font-bold p-3 rounded-xl transition-colors shrink-0"
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
