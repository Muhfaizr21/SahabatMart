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
        border: '1px solid rgba(255,255,255,0.1)'
      },
    });
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 py-20 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white border border-gray-200 rounded-3xl mb-6 shadow-xl group hover:scale-110 transition-transform duration-500">
            <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-primary group-hover:rotate-12 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-gray-900">
            Klaim <span className="text-primary">Kupon Spesial</span>
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto text-lg font-medium leading-relaxed">
            Dapatkan potongan harga eksklusif untuk setiap pembelian produk perawatan kulit terbaik kami.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-24">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <p className="text-gray-400 mt-6 font-semibold tracking-widest uppercase text-sm">Menyiapkan Penawaran Terbaik...</p>
            </div>
          ) : coupons.length === 0 ? (
            <div className="col-span-full py-24 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm text-center">
                <div className="text-4xl mb-4 text-gray-300">🎫</div>
                <p className="text-gray-500 font-medium text-lg">Belum ada kupon tersedia untuk saat ini.</p>
            </div>
          ) : coupons.map((c, i) => (
            <div 
              key={i} 
              className="group relative flex flex-col sm:flex-row bg-white rounded-[2rem] border border-gray-100 hover:border-primary/30 transition-all duration-500 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-primary/5 fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Left Section (Discount) */}
              <div className="relative sm:w-1/3 p-8 flex flex-col justify-center items-center text-center bg-gray-50 sm:border-r border-dashed border-gray-200 overflow-hidden min-h-[160px]">
                {/* Decorative Circles (Ticket Notch) */}
                <div className="hidden sm:block absolute -right-3 -top-3 w-6 h-6 bg-gray-50 rounded-full border border-gray-200"></div>
                <div className="hidden sm:block absolute -right-3 -bottom-3 w-6 h-6 bg-gray-50 rounded-full border border-gray-200"></div>

                <div className="relative z-10">
                  <div className="text-3xl md:text-4xl font-black text-primary mb-1">
                    {c.discount_type === 'percent' ? `${c.discount_value}%` : `Rp${(c.discount_value || 0).toLocaleString('id')}`}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">OFF VOUCHER</div>
                </div>
              </div>

              {/* Right Section (Content) */}
              <div className="p-8 sm:w-2/3 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-gray-900 text-xl group-hover:text-primary transition-colors duration-300 leading-tight">
                      {c.title}
                    </h3>
                    <div className="shrink-0 ml-4 px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      EXP: {new Date(c.expiry_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-6">
                    {c.description || 'Gunakan kupon ini untuk mendapatkan potongan harga spesial di setiap transaksi Anda.'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-50 border border-dashed border-gray-300 rounded-2xl px-4 py-3 font-mono font-black text-gray-900 text-center tracking-[0.2em] text-lg group-hover:bg-gray-100 transition-colors">
                    {c.code}
                  </div>
                  <button 
                    onClick={() => handleCopy(c.code)}
                    className="bg-primary hover:bg-primary-dark text-white p-3.5 rounded-2xl transition-all duration-300 shadow-lg shadow-primary/20 active:scale-95 group-hover:rotate-3"
                    title="Salin Kode"
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
            <Link to="/shop" className="inline-flex items-center gap-3 px-10 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all group shadow-sm">
                Mulai Belanja Sekarang
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="group-hover:translate-x-1 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
            </Link>
        </div>
      </div>
    </main>
  );
}
