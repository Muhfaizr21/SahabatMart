import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PUBLIC_API_BASE, fetchJson } from '../lib/api';
import toast from 'react-hot-toast';

export default function VoucherSection() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson(`${PUBLIC_API_BASE}/vouchers`)
      .then(d => {
        const data = Array.isArray(d) ? d : (d.data || []);
        setVouchers(data.slice(0, 3)); // Ambil 3 saja untuk landing page
      })
      .catch(() => setVouchers([]))
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

  if (loading && vouchers.length === 0) return null;
  if (!loading && vouchers.length === 0) return null;

  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-xl">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-yellow-100">
                <i className="bx bxs-zap animate-pulse"></i>
                Penawaran Terbatas
             </div>
             <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-none tracking-tight">Klaim <span className="text-blue-600">Kupon</span> Belanja Hari Ini!</h2>
             <p className="text-gray-500 mt-4 text-lg font-medium">Jangan lewatkan potongan harga spesial khusus untuk pelanggan setia SahabatMart.</p>
          </div>
          <Link to="/coupons" className="group flex items-center gap-2 text-blue-600 font-bold hover:underline">
            Lihat Semua Kupon
            <i className="bx bx-right-arrow-alt text-2xl transition-transform group-hover:translate-x-1"></i>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {vouchers.map((v, i) => (
            <div key={i} className="group relative bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100 hover:border-blue-200 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-50">
              {/* Desain Circle Cutout (Efek Tiket) */}
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-gray-100 rounded-full shadow-inner"></div>
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-gray-100 rounded-full shadow-inner"></div>

              <div className="flex flex-col h-full text-center items-center">
                 <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-gray-100 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                    <i className="bx bxs-coupon text-3xl"></i>
                 </div>
                 
                 <div className="flex flex-col gap-1 mb-4">
                    <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{v.title}</span>
                    <h3 className="text-3xl font-black text-gray-900">
                        {v.discount_type === 'percent' ? `${v.discount_value}%` : `Rp${(v.discount_value || 0).toLocaleString('id')}`}
                    </h3>
                    <p className="text-gray-400 text-xs font-bold uppercase">Potongan Harga</p>
                 </div>

                 <p className="text-gray-500 text-sm font-medium mb-8 line-clamp-2">
                    {v.description || `Gunakan kode untuk belanja lebih hemat di SahabatMart.`}
                 </p>

                 <div className="mt-auto w-full">
                    <div 
                      onClick={() => handleCopy(v.code)}
                      className="bg-white border-2 border-dashed border-gray-200 rounded-2xl px-4 py-4 font-mono font-black text-gray-900 tracking-[0.2em] text-lg mb-4 group-hover:border-blue-400 group-hover:text-blue-600 transition-colors cursor-pointer"
                      title="Klik untuk menyalin"
                    >
                        {v.code}
                    </div>
                    <Link to="/shop" className="block w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg hover:shadow-blue-200">
                        Pakai Sekarang
                    </Link>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
