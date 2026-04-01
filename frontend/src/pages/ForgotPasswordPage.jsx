import { Link } from 'react-router-dom';

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-10 relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lupa Password?</h1>
          <p className="text-sm text-gray-500">
            Jangan khawatir! Masukkan alamat email yang terdaftar pada akun kamu, dan kami akan mengirimkan tautan untuk mengatur ulang password.
          </p>
        </div>
        
        <form className="flex flex-col gap-5">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Alamat Email Terdaftar</label>
            <input 
              type="email" 
              placeholder="nama@email.com" 
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-gray-50 focus:bg-white" 
              required
            />
          </div>
          
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-600/20">
            Kirim Tautan Reset
          </button>
        </form>
        
        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <Link to="/login" className="text-sm font-semibold text-gray-700 hover:text-blue-600 flex items-center justify-center gap-2">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Kembali ke Halaman Login
          </Link>
        </div>
      </div>
    </main>
  );
}
