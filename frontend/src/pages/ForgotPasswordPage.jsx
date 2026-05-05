import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AUTH_API_BASE, postJson } from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [debugToken, setDebugToken] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await postJson(`${AUTH_API_BASE}/forgot-password`, { email });
      setMessage(response.message);
      if (response.debug_token) {
        setDebugToken(response.debug_token);
      }
    } catch (err) {
      setError(err.message || 'Gagal mengirim instruksi reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-6">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-gray-100">
        
        {/* Kolom Kiri - Branding (Sync with Login) */}
        <div className="hidden md:flex flex-col w-1/2 bg-[#0A0A0A] p-14 relative overflow-hidden justify-between text-white border-r border-white/5">
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-rose-900 rounded-full blur-[120px] opacity-20"></div>
          
          <div className="relative z-10 flex">
            <Link to="/login" className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 p-2 pl-4 pr-4 rounded-full backdrop-blur-xl transition-all text-white text-xs font-black border border-white/10 shadow-2xl">
              <span className="material-symbols-outlined text-sm rotate-180">arrow_forward</span>
              Kembali ke Login
            </Link>
          </div>
          
          <div className="relative z-10 mt-auto">
            <div className="inline-block px-4 py-1.5 bg-rose-600/10 text-rose-500 font-black text-[10px] rounded-full uppercase tracking-[0.2em] mb-6 border border-rose-600/20 backdrop-blur-sm">Keamanan Akun</div>
            <h2 className="text-4xl font-black mb-6 leading-tight tracking-tight">Lindungi Kecantikan Aset Anda.</h2>
            <p className="text-gray-400 mb-10 text-base font-medium leading-relaxed">Kami akan membantu Anda mendapatkan kembali akses ke akun AkuGlow Anda dengan aman.</p>
            
            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-md">
               <div className="flex items-center gap-4 text-rose-500 mb-2">
                  <span className="material-symbols-outlined">security</span>
                  <p className="text-xs font-black uppercase tracking-widest">Enkripsi Berlapis</p>
               </div>
               <p className="text-[10px] text-gray-500 font-bold">Data Anda dilindungi oleh sistem keamanan standar industri terbaru.</p>
            </div>
          </div>
        </div>

        {/* Kolom Kanan - Form */}
        <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-center bg-white">
          <div className="mb-8 text-center md:text-left">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner mx-auto md:mx-0 animate-bounce">
              <span className="material-symbols-outlined text-3xl">lock_reset</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Lupa Password?</h1>
            <p className="text-gray-500 font-bold text-sm">Jangan khawatir! Masukkan email Anda untuk memulihkan akses.</p>
          </div>
          
          {message ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-green-50 border border-green-100 text-green-700 p-6 rounded-[24px] mb-8 text-sm font-bold flex items-start gap-4">
                <span className="material-symbols-outlined text-xl mt-0.5">check_circle</span>
                <div>
                   <p className="mb-1">Tautan terkirim!</p>
                   <p className="text-xs opacity-80 font-medium">{message}</p>
                </div>
              </div>
              
              {debugToken && (
                <div className="bg-amber-50 border border-amber-100 text-amber-800 p-5 rounded-2xl mb-8 text-xs">
                  <p className="font-black uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">bug_report</span>
                    Developer Mode
                  </p>
                  <Link to={`/reset-password?token=${debugToken}`} className="underline break-all font-bold hover:text-rose-600 transition-colors">
                    Klik di sini untuk Reset Password (Simulasi Email)
                  </Link>
                </div>
              )}

              <Link to="/login" className="w-full bg-gray-900 hover:bg-black text-white font-black py-4.5 rounded-2xl transition-all shadow-xl shadow-gray-200 flex justify-center items-center gap-3">
                <span className="material-symbols-outlined text-lg">login</span>
                Kembali ke Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-3 animate-shake">
                  <span className="material-symbols-outlined text-lg">error</span>
                  {error}
                </div>
              )}
              
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Alamat Email Terdaftar</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com" 
                  className="w-full border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-50 transition-all bg-gray-50 focus:bg-white" 
                  required
                />
              </div>
              
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white font-black py-4.5 rounded-2xl transition-all shadow-xl shadow-gray-200 flex justify-center items-center gap-3 active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Mengirim...
                  </>
                ) : (
                  <>
                    <span>Kirim Tautan Reset</span>
                    <span className="material-symbols-outlined text-lg">send</span>
                  </>
                )}
              </button>

              <Link to="/login" className="text-center text-sm text-gray-500 font-bold hover:text-rose-600 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm rotate-180">arrow_forward</span>
                Batal & Kembali
              </Link>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
