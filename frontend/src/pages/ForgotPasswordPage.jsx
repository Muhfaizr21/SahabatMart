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
    } catch (_err) {
      setError(_err.message || 'Gagal mengirim instruksi reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-[70vh] py-12 md:py-20 premium-mesh-bg flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans">

      {/* Subtle Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50 pointer-events-none"></div>

      {/* Main Glassmorphic Card */}
      <div className="relative max-w-5xl w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col lg:flex-row border border-slate-100 z-10">
        
        {/* Left Column - Branding (Visuals) */}
        <div className="lg:w-1/2 bg-gradient-to-br from-rose-50/40 via-white to-amber-50/20 p-8 lg:p-14 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-100">
          {/* Subtle inside glow blobs */}
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-rose-200/20 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-amber-200/20 rounded-full blur-[80px] pointer-events-none"></div>

          {/* Top Row - Back Button */}
          <div className="relative z-10">
            <Link to="/login" className="group inline-flex items-center gap-2 bg-white hover:bg-slate-50 pl-3 pr-4 py-2 rounded-full transition-all duration-300 text-slate-800 text-xs font-semibold border border-slate-200/80 hover:border-slate-300 shadow-sm self-start">
              <span className="material-symbols-outlined text-sm transition-transform group-hover:-translate-x-1">arrow_back</span>
              Kembali ke Login
            </Link>
          </div>

          {/* Middle Row - Slogan & Logo */}
          <div className="relative z-10 my-10 lg:my-auto">
            <div className="mb-8">
              <img src="/akuglow.webp" alt="AkuGlow" className="h-12 w-auto object-contain" />
            </div>

            <div className="space-y-4">
              <span className="inline-block px-3 py-1 bg-rose-500/10 text-rose-600 font-extrabold text-[10px] rounded-full uppercase tracking-[0.2em] border border-rose-500/20 backdrop-blur-sm">
                Pemulihan Sandi
              </span>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight">
                Lindungi Akun <br />
                <span className="bg-gradient-to-r from-rose-600 to-amber-500 bg-clip-text text-transparent">Kecantikan Anda.</span>
              </h2>
              <p className="text-slate-500 text-sm lg:text-base font-medium leading-relaxed max-w-md">
                Kami akan membantu Anda mendapatkan kembali akses ke akun AkuGlow Anda dengan aman.
              </p>
            </div>
          </div>

          {/* Bottom Row - Security Info */}
          <div className="relative z-10 mt-auto">
            <div className="p-6 bg-white/60 rounded-3xl border border-slate-100 backdrop-blur-md relative overflow-hidden group hover:border-slate-200 transition-all duration-300 shadow-sm">
              <div className="flex items-center gap-4 text-rose-600 mb-2">
                <span className="material-symbols-outlined">security</span>
                <p className="text-xs font-black uppercase tracking-widest">Enkripsi Berlapis</p>
              </div>
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed">Data Anda dilindungi oleh sistem keamanan standar industri terbaru.</p>
            </div>
          </div>
        </div>

        {/* Right Column - Form */}
        <div className="lg:w-1/2 p-8 lg:p-14 flex flex-col justify-center bg-white">
          <div className="mb-8 text-center lg:text-left">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner mx-auto lg:mx-0 animate-bounce">
              <span className="material-symbols-outlined text-3xl">lock_reset</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Lupa Password?</h1>
            <p className="text-slate-500 text-sm font-medium">Jangan khawatir! Masukkan email Anda untuk memulihkan akses.</p>
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

              <Link to="/login" className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold py-4 rounded-2xl transition-all duration-300 shadow-md shadow-rose-500/10 flex justify-center items-center gap-3 cursor-pointer">
                <span className="material-symbols-outlined text-base">login</span>
                Kembali ke Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-3 animate-shake">
                  <span className="material-symbols-outlined text-lg text-rose-500">error</span>
                  {error}
                </div>
              )}
              
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2">Alamat Email Terdaftar</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-rose-500 transition-colors text-lg">mail</span>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-5 py-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/10 hover:border-slate-200 transition-all duration-300" 
                    required
                  />
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={isLoading}
                className="relative w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 text-white font-extrabold py-4 rounded-2xl transition-all duration-300 mt-4 shadow-md shadow-rose-500/10 active:scale-[0.98] overflow-hidden group flex justify-center items-center gap-3 cursor-pointer"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <>
                    <span>Kirim Tautan Reset</span>
                    <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">send</span>
                  </>
                )}
              </button>

              <Link to="/login" className="text-center text-sm text-slate-500 font-bold hover:text-rose-600 transition-all flex items-center justify-center gap-2">
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
