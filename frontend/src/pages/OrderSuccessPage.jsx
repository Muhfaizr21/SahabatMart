import { Link, useLocation } from 'react-router-dom';

export default function OrderSuccessPage() {
  const { state } = useLocation();
  const order = state?.order;
  const payment = state?.payment;

  if (!order) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Akses Tidak Valid</h1>
          <Link to="/" className="text-blue-600 hover:underline">Kembali ke Beranda</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-12 px-6 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 text-center relative overflow-hidden mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="40" height="40" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pesanan Berhasil!</h1>
          <p className="text-gray-500 mb-6">
            Terima kasih telah berbelanja di AkuGlow. Pesanan kamu dengan nomor 
            <span className="font-bold text-gray-800"> {order.order_number} </span> 
            sedang kami proses.
          </p>

          {payment && (
            <div className="bg-blue-50 rounded-2xl p-6 text-left border border-blue-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Metode Pembayaran</p>
                  <p className="font-bold text-gray-900">{payment.payment_name || payment.payment_method}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Bayar</p>
                  <p className="font-black text-blue-700 text-lg">Rp{payment.amount?.toLocaleString('id')}</p>
                </div>
              </div>

              {(() => {
                const expiry = payment.expired_time ? new Date(payment.expired_time * 1000) : (order.expired_at ? new Date(order.expired_at) : null);
                if (!expiry) return null;
                return (
                  <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-100 text-red-600">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <p className="text-[11px] font-bold">
                      Bayar sebelum: {expiry.toLocaleString('id-ID', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })} WIB
                    </p>
                  </div>
                );
              })()}

              {/* Pay URL for E-Wallets / Redirects */}
              {payment.pay_url && (
                <a 
                  href={payment.pay_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full bg-blue-500 hover:bg-blue-600 text-white text-center font-bold py-3 rounded-xl mb-4 transition-all"
                >
                  Bayar Sekarang (Buka Aplikasi)
                </a>
              )}

              {/* QRIS Display */}
              {payment.qr_url && (
                <div className="flex flex-col items-center py-4 bg-white rounded-xl mb-4">
                   <img src={payment.qr_url} alt="QRIS" className="w-48 h-48 mb-2" />
                   <p className="text-[10px] text-gray-400 font-bold">SCAN QRIS UNTUK BAYAR</p>
                </div>
              )}

              {/* VA / Pay Code Display */}
              {payment.pay_code && (
                <div className="bg-white rounded-xl p-4 mb-4 border border-blue-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Nomor Virtual Account / Kode Bayar</p>
                    <p className="text-xl font-black text-gray-900 tracking-wider">{payment.pay_code}</p>
                  </div>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(payment.pay_code); alert('Kode berhasil disalin!'); }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    SALIN
                  </button>
                </div>
              )}

              {/* Instructions */}
              {payment.instructions && (
                <div className="mt-6">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Instruksi Pembayaran</p>
                  <div className="space-y-4">
                    {payment.instructions.map((ins, idx) => (
                      <div key={idx} className="bg-white/50 rounded-xl p-3 border border-blue-50">
                        <h4 className="text-xs font-bold text-gray-800 mb-2">{ins.title}</h4>
                        <ul className="space-y-1">
                          {ins.steps.map((step, sidx) => (
                            <li key={sidx} className="text-[11px] text-gray-600 leading-relaxed flex gap-2">
                              <span className="font-bold text-blue-400">{sidx + 1}.</span>
                              <span dangerouslySetInnerHTML={{ __html: step }} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 space-y-3">
            <Link to="/shop" className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-200">
              Lanjut Belanja
            </Link>
            <Link to="/" className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl transition-colors">
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
