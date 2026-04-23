import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BUYER_API_BASE, fetchJson } from '../lib/api';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    async function loadDetail() {
      try {
        setLoading(true);
        const res = await fetchJson(`${BUYER_API_BASE}/orders/detail?id=${id}`);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data?.order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <h2 className="text-2xl font-black text-gray-900 mb-4">Pesanan Tidak Ditemukan</h2>
        <Link to="/profile?tab=orders" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">Kembali ke Riwayat</Link>
      </div>
    );
  }

  const { order, payment } = data;

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/profile?tab=orders" className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-blue-50 transition-colors">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">Detail Pesanan</h1>
            <p className="text-sm text-gray-400 font-medium">Nomor: <span className="font-bold text-gray-800">#{String(order.id).substring(0,8).toUpperCase()}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Saat Ini</p>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-black ${
                    order.status === 'completed' ? 'bg-green-50 text-green-600' : 
                    order.status === 'shipped' ? 'bg-blue-50 text-blue-600' : 
                    order.status === 'cancelled' ? 'bg-red-50 text-red-600' : 
                    'bg-orange-50 text-orange-600'}`}>
                    {order.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tanggal Pesanan</p>
                  <p className="font-bold text-gray-900">{new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            </div>

            {/* Merchant Groups */}
            {order.merchant_groups?.map((group, gidx) => (
              <div key={gidx} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50/50 px-8 py-4 border-b border-gray-50 flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </div>
                  <h3 className="font-black text-gray-900 text-sm uppercase tracking-wide">{group.merchant?.merchant_name || 'Toko SahabatMart'}</h3>
                </div>
                <div className="p-8 space-y-6">
                  {group.items?.map((item, iidx) => (
                    <div key={iidx} className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-50 rounded-2xl border border-gray-100 flex-shrink-0 overflow-hidden">
                        {/* Placeholder or actual image if available */}
                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-sm leading-tight mb-1">{item.product_name}</h4>
                        <p className="text-xs text-gray-400 mb-2">{item.variant_name}</p>
                        <div className="flex justify-between items-end">
                          <p className="text-xs text-gray-500 font-bold">{item.quantity}x <span className="text-gray-900">Rp{item.unit_price?.toLocaleString('id')}</span></p>
                          <p className="font-black text-gray-900 text-sm">Rp{(item.unit_price * item.quantity).toLocaleString('id')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar / Summary */}
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
              <h3 className="font-black text-gray-900 text-lg mb-6">Ringkasan</h3>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Subtotal</span>
                  <span className="text-gray-900 font-bold">Rp{order.subtotal?.toLocaleString('id')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Ongkos Kirim</span>
                  <span className="text-gray-900 font-bold">Rp{order.total_shipping_cost?.toLocaleString('id')}</span>
                </div>
                {order.total_discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Diskon</span>
                    <span className="text-green-600 font-bold">-Rp{order.total_discount?.toLocaleString('id')}</span>
                  </div>
                )}
                <div className="pt-4 border-t border-gray-50 flex justify-between">
                  <span className="text-gray-900 font-black">Total</span>
                  <span className="text-blue-600 font-black text-lg">Rp{order.grand_total?.toLocaleString('id')}</span>
                </div>
              </div>
              
                <div className="space-y-3">
                  {order.status === 'pending_payment' && (
                    <button 
                      onClick={() => {
                        if (payment?.checkout_url) {
                          window.location.href = payment.checkout_url;
                        } else {
                          alert("Link pembayaran belum siap, silakan coba beberapa saat lagi.");
                        }
                      }}
                      className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
                    >
                      Bayar Sekarang
                    </button>
                  )}
                  
                  <Link 
                    to={`/invoice/${order.id}`}
                    className="w-full bg-white text-gray-900 border border-gray-100 font-black py-4 rounded-2xl shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-2 4H8v-4h8v4z"/></svg>
                    Cetak Invoice
                  </Link>
                </div>
            </div>

            {/* Payment Info */}
            {payment && (
              <div className="bg-blue-50 rounded-[2rem] p-8 border border-blue-100">
                <h3 className="font-black text-blue-900 text-lg mb-4">Pembayaran</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Metode</p>
                    <p className="font-bold text-blue-900">{payment.payment_name || payment.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Status</p>
                    <p className="font-bold text-blue-900 uppercase">{payment.status}</p>
                  </div>
                  {payment.pay_code && (
                    <div className="bg-white rounded-xl p-3 border border-blue-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Kode Bayar</p>
                      <p className="text-lg font-black text-gray-900 tracking-wider">{payment.pay_code}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Shipping Address */}
            <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
               <h3 className="font-black text-gray-900 text-lg mb-4">Alamat Kirim</h3>
               <p className="font-bold text-gray-900 text-sm mb-1">{order.shipping_name}</p>
               <p className="text-xs text-gray-400 font-bold mb-3">{order.shipping_phone}</p>
               <p className="text-xs text-gray-500 leading-relaxed font-medium">
                 {order.shipping_address}, {order.shipping_city}, {order.shipping_province} {order.shipping_postal_code}
               </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
