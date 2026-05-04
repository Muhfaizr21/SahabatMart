import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BUYER_API_BASE, fetchJson } from '../lib/api';
import toast from 'react-hot-toast';

export default function InvoicePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetchJson(`${BUYER_API_BASE}/orders/detail?id=${id}`);
        setData(res);
      } catch (err) {
        console.error(err);
        toast.error("Gagal memuat invoice");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  
  if (!data?.order) return <div className="p-20 text-center font-bold">Pesanan tidak ditemukan</div>;

  const { order, payment } = data;

  return (
    <div className="bg-white min-h-screen p-0 sm:p-6 md:p-10 font-sans text-gray-900">
      {/* Container untuk print */}
      <div className="max-w-4xl mx-auto border-0 sm:border border-gray-100 p-5 sm:p-8 sm:shadow-2xl rounded-none sm:rounded-[2rem] bg-white print:shadow-none print:border-0 print:p-0">
        
        {/* Control Bar (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 print:hidden">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition-colors self-start sm:self-center"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Kembali
          </button>
          <button 
            onClick={() => window.print()}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-2 4H8v-4h8v4z"/></svg>
            Cetak Invoice
          </button>
        </div>

        {/* Invoice Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10 border-b-4 border-gray-50 pb-8">
          <div className="w-full sm:w-auto">
            <div className="flex items-center gap-3 mb-4">
              <img src="/akuglow.jpg" alt="AkuGlow" className="h-12 w-auto object-contain" />
            </div>
            <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest mb-1">Diterbitkan Oleh</p>
            <p className="font-black text-gray-900 text-sm sm:text-base">PT AkuGlow Mart Indonesia</p>
            <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed max-w-xs">
              Gedung AkuGlow Center Lt. 12<br/>
              Jl. Jenderal Sudirman No. 45, Jakarta Pusat<br/>
              support@akuglow.com
            </p>
          </div>
          <div className="w-full md:text-right flex flex-col items-start md:items-end">
            <h2 className="text-4xl sm:text-5xl font-black text-gray-100 mb-4 print:text-gray-200 tracking-tighter">INVOICE</h2>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nomor Pesanan</p>
              <p className="text-base sm:text-lg font-black text-blue-600 tracking-wider">#{String(order.id).substring(0,8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 mb-10">
          <div>
            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 border-b border-blue-100 pb-2">Tujuan Pengiriman</h3>
            <p className="font-black text-lg sm:text-xl text-gray-900 mb-1">{order.shipping_name}</p>
            <p className="text-gray-500 font-bold text-sm mb-3">{order.shipping_phone}</p>
            <div className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed bg-gray-50/50 p-4 rounded-2xl border border-gray-50">
              {order.shipping_address}, {order.shipping_city}, {order.shipping_province} {order.shipping_postal_code}
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 border-b border-blue-100 pb-2">Informasi Pembayaran</h3>
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Metode</span>
                    <span className="font-black text-gray-900 text-xs sm:text-sm">{payment?.payment_name || payment?.payment_method || 'Transfer Bank'}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Status</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    order.status === 'pending_payment' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                    }`}>
                    {order.status === 'pending_payment' ? 'Pending' : 'Lunas'}
                    </span>
                </div>
            </div>
          </div>
        </div>

        {/* Table Items */}
        <div className="mb-10 overflow-x-auto rounded-[1.5rem] border border-gray-100">
          <table className="w-full text-left min-w-[500px] sm:min-w-0">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-5 sm:px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Produk</th>
                <th className="px-5 sm:px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
                <th className="px-5 sm:px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Harga</th>
                <th className="px-5 sm:px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {order.merchant_groups?.map((group) => (
                group.items?.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 sm:px-6 py-4 sm:py-5">
                      <p className="font-black text-gray-900 text-xs sm:text-sm">{item.product_name}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{item.variant_name}</p>
                    </td>
                    <td className="px-5 sm:px-6 py-4 sm:py-5 text-center font-bold text-gray-900 text-xs sm:text-sm">{item.quantity}</td>
                    <td className="px-5 sm:px-6 py-4 sm:py-5 text-right font-medium text-gray-500 text-xs sm:text-sm">Rp{item.unit_price?.toLocaleString('id')}</td>
                    <td className="px-5 sm:px-6 py-4 sm:py-5 text-right font-black text-gray-900 text-xs sm:text-sm">Rp{(item.unit_price * item.quantity).toLocaleString('id')}</td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="flex flex-col md:flex-row justify-between gap-10">
          <div className="w-full md:max-w-xs order-2 md:order-1">
            <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-50">
              <h4 className="font-black text-blue-900 text-[10px] uppercase tracking-widest mb-3">Ketentuan</h4>
              <ul className="text-[10px] text-blue-700/70 font-medium space-y-1 list-disc pl-4 leading-relaxed">
                <li>Simpan invoice ini untuk syarat klaim garansi.</li>
                <li>Barang tidak dapat ditukar kecuali cacat produksi.</li>
              </ul>
            </div>
          </div>
          <div className="w-full md:flex-1 md:max-w-sm order-1 md:order-2">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Subtotal</span>
                <span className="font-bold text-gray-900">Rp{order.subtotal?.toLocaleString('id')}</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Ongkir</span>
                <span className="font-bold text-gray-900">Rp{order.total_shipping_cost?.toLocaleString('id')}</span>
              </div>
              {order.total_discount > 0 && (
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Diskon</span>
                  <span className="font-bold text-green-600">-Rp{order.total_discount?.toLocaleString('id')}</span>
                </div>
              )}
              <div className="pt-4 border-t-2 border-gray-900 flex justify-between items-center">
                <span className="text-sm sm:text-base font-black text-gray-900 tracking-tighter">TOTAL</span>
                <span className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tighter">Rp{order.grand_total?.toLocaleString('id')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-50 text-center">
           <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em]">AKUGLOW SYSTEM GENERATED INVOICE</p>
        </div>
      </div>
    </div>
  );
}
