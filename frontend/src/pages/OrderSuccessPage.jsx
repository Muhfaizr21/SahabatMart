import { Link } from 'react-router-dom';

const ORDER_REFERENCE = '#SM-240001';

export default function OrderSuccessPage() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center px-6 py-12 bg-gray-50">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 md:p-16 w-full max-w-lg text-center relative overflow-hidden">
        {/* Dekorasi Confetti Sederhana */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-50">
          <div className="absolute top-10 left-10 w-3 h-3 bg-red-400 rounded-full animate-bounce delay-100" />
          <div className="absolute top-20 right-20 w-4 h-4 bg-blue-400 rounded-full animate-bounce delay-300" />
          <div className="absolute bottom-20 left-20 w-2 h-2 bg-yellow-400 rounded-full animate-bounce delay-500" />
          <div className="absolute top-1/2 right-10 w-3 h-3 bg-green-400 rounded-full animate-bounce delay-700" />
        </div>

        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
          <svg width="48" height="48" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2 relative z-10">Pesanan Berhasil!</h1>
        <p className="text-gray-500 mb-8 relative z-10">
          Terima kasih telah berbelanja di SahabatMart. Pesanan kamu dengan nomor 
          <span className="font-bold text-gray-800"> {ORDER_REFERENCE} </span> 
          sedang kami proses.
        </p>

        <div className="space-y-3 relative z-10">
          <Link to="/shop" className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors text-sm">
            Lanjut Belanja
          </Link>
          <Link to="/" className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-colors text-sm">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
