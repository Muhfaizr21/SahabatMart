import { useState, useEffect } from 'react';
import { fetchJson, PUBLIC_API_BASE } from '../../lib/api';

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
    setTimeout(() => setCopied(null), 2000);
  }

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl">error</span>
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900">Gagal memuat voucher</h3>
        <p className="text-gray-500 max-w-xs mx-auto">{error}</p>
      </div>
      <button 
        onClick={() => window.location.reload()}
        className="px-6 py-2 bg-blue-600 text-white rounded-2xl font-bold text-sm"
      >
        Coba Lagi
      </button>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-2xl">🎫</div>
        <div>
          <h2 className="text-2xl font-black text-gray-900 leading-tight">Voucher Promo Mitra</h2>
          <p className="text-gray-500 font-medium mt-1">Bagikan kode promo ini kepada calon pembeli kamu.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {vouchers.map(v => (
          <div key={v.id} className="border-2 border-dashed border-gray-200 p-6 rounded-3xl relative hover:border-blue-400 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 italic">Voucher Berlaku</div>
                <div className="text-2xl font-black text-gray-900">
                  {v.discount_type === 'percent' ? `${v.discount_value}%` : `Rp${(v.discount_value/1000).toFixed(0)}rb`} Off
                </div>
              </div>
              <div className="bg-blue-50 text-blue-600 font-black px-4 py-2 rounded-xl text-lg tracking-widest border border-blue-100 uppercase">
                {v.code}
              </div>
            </div>
            <p className="text-xs text-gray-500 font-medium mb-6 leading-relaxed">
              Min Belanja Rp{v.min_order.toLocaleString('id')}. Berakhir {new Date(v.expiry_date).toLocaleDateString('id', { day: 'numeric', month: 'long' })}.
            </p>
            <button 
              onClick={() => handleCopy(v.code)}
              className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                copied === v.code ? 'bg-green-500 text-white' : 'bg-gray-900 text-white hover:bg-black shadow-xl shadow-gray-200'
              }`}
            >
              {copied === v.code ? 'Copied! ✅' : 'Bagikan Kode 🚀'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
