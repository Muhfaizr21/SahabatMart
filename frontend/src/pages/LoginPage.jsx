import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AUTH_API_BASE, fetchJson } from '../lib/api';
import { getStoredUser, isAdminUser } from '../lib/auth';

const getRedirectPath = (user) => {
  if (!user) return '/';
  if (user.role === 'admin' || user.role === 'superadmin') return '/admin';
  if (user.role === 'merchant') return '/merchant';
  if (user.role === 'affiliate') return '/affiliate';
  return '/';
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (token) {
      // CLEANUP: Hapus token dari URL segera setelah dibaca untuk keamanan
      window.history.replaceState({}, document.title, window.location.pathname);

      setLoading(true);
      localStorage.setItem('token', token);

      // Ambil profil user lengkap menggunakan token baru
      fetchJson(`${AUTH_API_BASE}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(user => {
        localStorage.setItem('user', JSON.stringify(user));
        navigate(getRedirectPath(user), { replace: true });
      }).catch(() => {
        setError('Gagal sinkronisasi data Google. Silakan coba lagi.');
        setLoading(false);
      });
    }
  }, [location, navigate]);

  const handleGoogleLogin = () => {
    window.location.href = `${AUTH_API_BASE}/google/login`;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await fetchJson(`${AUTH_API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember })
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate(getRedirectPath(data.user), { replace: true });
    } catch (_err) {
      setError(_err.message);
    } finally {
      setLoading(false);
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
            <Link to="/" className="group inline-flex items-center gap-2 bg-white hover:bg-slate-50 pl-3 pr-4 py-2 rounded-full transition-all duration-300 text-slate-800 text-xs font-semibold border border-slate-200/80 hover:border-slate-300 shadow-sm self-start">
              <span className="material-symbols-outlined text-sm transition-transform group-hover:-translate-x-1">arrow_back</span>
              Kembali ke Beranda
            </Link>
          </div>

          {/* Middle Row - Slogan & Logo */}
          <div className="relative z-10 my-10 lg:my-auto">
            <div className="mb-8">
              <img src="/akuglow.jpg" alt="AkuGlow" className="h-12 w-auto object-contain" />
            </div>

            <div className="space-y-4">
              <span className="inline-block px-3 py-1 bg-rose-500/10 text-rose-600 font-extrabold text-[10px] rounded-full uppercase tracking-[0.2em] border border-rose-500/20 backdrop-blur-sm">
                Selamat Datang Kembali
              </span>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight">
                Kecantikan & <br />
                <span className="bg-gradient-to-r from-rose-600 to-amber-500 bg-clip-text text-transparent">Rasa Percaya Diri.</span>
              </h2>
              <p className="text-slate-500 text-sm lg:text-base font-medium leading-relaxed max-w-md">
                Masuk untuk mengakses layanan konsultasi, promo eksklusif, dan kelola profil kecantikan Anda.
              </p>
            </div>
          </div>

          {/* Bottom Row - Social Proof Badge */}
          <div className="relative z-10 mt-auto">
            <div className="p-6 bg-white/60 rounded-3xl border border-slate-100 backdrop-blur-md relative overflow-hidden group hover:border-slate-200 transition-all duration-300 shadow-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors pointer-events-none"></div>
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
                    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
                  ].map((src, i) => (
                    <img key={i} src={src} className="w-9 h-9 rounded-full border-2 border-white object-cover shadow-sm" alt="User" />
                  ))}
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-950 flex items-center gap-1.5">
                    9,000+ Member
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold">Telah bergabung dengan AkuGlow</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Login Form */}
        <div className="lg:w-1/2 p-8 lg:p-14 flex flex-col justify-center bg-white">
          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Masuk Akun ✨</h1>
            <p className="text-slate-500 text-sm font-medium">Silakan masukkan detail akun Anda di bawah ini.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-3 animate-shake">
              <span className="material-symbols-outlined text-lg text-rose-500">error</span>
              <span className="flex-1 leading-relaxed">{error}</span>
            </div>
          )}

          <form className="flex flex-col gap-6" onSubmit={handleLogin}>
            {/* Email Field */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2">Alamat Email</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-rose-500 transition-colors text-lg">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="nama@email.com"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-5 py-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/10 hover:border-slate-200 transition-all duration-300"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Kata Sandi</label>
                <Link to="/forgot-password" className="text-[10px] font-bold text-rose-600 hover:text-rose-500 transition-colors uppercase tracking-wider underline decoration-rose-500/30 underline-offset-4">Lupa Sandi?</Link>
              </div>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-rose-500 transition-colors text-lg">lock</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-12 py-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/10 hover:border-slate-200 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors flex items-center"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-3 mt-1">
              <label className="relative flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-5 h-5 rounded-lg border border-slate-200 bg-slate-50 peer-checked:bg-rose-600 peer-checked:border-rose-600 flex items-center justify-center transition-all duration-200">
                  <span className="material-symbols-outlined text-white text-xs font-black scale-0 peer-checked:scale-100 transition-transform">check</span>
                </div>
                <span className="ml-3 text-xs text-slate-500 font-bold">Ingat saya di perangkat ini</span>
              </label>
            </div>

            {/* Login Submit Button */}
            <button 
              disabled={loading} 
              className="relative w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 text-white font-extrabold py-4 rounded-2xl transition-all duration-300 mt-4 shadow-md shadow-rose-500/10 active:scale-[0.98] overflow-hidden group flex justify-center items-center gap-3 cursor-pointer"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Masuk Akun</span>
                  <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">arrow_right_alt</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink-0 mx-4 text-[9px] text-slate-400 font-bold tracking-[0.2em] uppercase">Atau masuk dengan</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-slate-50 border border-slate-200/80 hover:bg-slate-100 hover:border-slate-300 rounded-2xl py-3.5 transition-all duration-300 text-sm font-semibold text-slate-700 cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12.0003 12.0001V15.6806H18.7846C18.4908 17.0658 17.5147 18.2325 16.2731 18.917L20.3541 22.0717C22.7317 19.8824 24.1843 16.4806 24.1843 12.0001C24.1843 11.1718 24.1166 10.5186 23.9723 9.87329H12.0003V12.0001Z" />
                <path fill="#34A853" d="M12.0003 24.0004C15.4262 24.0004 18.2974 22.8631 20.3541 22.0717L16.2731 18.917C15.1106 19.6975 13.6848 20.1781 12.0003 20.1781C8.80789 20.1781 6.10398 18.0163 5.12198 15.143L0.902344 18.4116C2.94977 22.4842 7.15197 24.0004 12.0003 24.0004Z" />
                <path fill="#FBBC05" d="M5.122 15.143C4.8703 14.3941 4.72145 13.6063 4.72145 12.8001C4.72145 11.9939 4.8703 11.2061 5.122 10.4572L0.902359 7.18854C0.0620868 8.86877 -0.00020108 10.8715 -0.00020108 12.8001C-0.00020108 14.7288 0.0620868 16.7315 0.902359 18.4117L5.122 15.143Z" />
                <path fill="#4285F4" d="M12.0003 5.42226C13.8447 5.42226 15.518 6.06213 16.8209 7.20015L20.4435 3.5776C18.2718 1.54512 15.3995 0 12.0003 0C7.15197 0 2.94977 1.51624 0.902344 5.58882L5.12198 8.85746C6.10398 5.98418 8.80789 5.42226 12.0003 5.42226Z" />
              </svg>
              <span>Google</span>
            </button>

            {/* Signup Redirect Link */}
            <p className="text-center text-sm text-slate-500 mt-6 font-medium">
              Belum punya akun? <Link to="/register" className="text-rose-600 font-extrabold hover:text-rose-500 hover:underline underline-offset-4 transition-colors">Daftar sekarang</Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
