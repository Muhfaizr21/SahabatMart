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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();

  // Redirection is handled in handleLogin and the Google callback useEffect.
  // We remove the mount-time redirect to prevent infinite loops with AdminRoute.


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    
    if (token) {
      setLoading(true);
      localStorage.setItem('token', token);
      
      // Ambil profil user lengkap menggunakan token baru
      fetchJson(`${AUTH_API_BASE}/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
      }).then(user => {
          localStorage.setItem('user', JSON.stringify(user));
          navigate(getRedirectPath(user), { replace: true });
      }).catch(err => {
          setError('Gagal sinkronisasi data Google: ' + err.message);
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
        body: JSON.stringify({ email, password })
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate(getRedirectPath(data.user), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-6">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-gray-100">
        
        {/* Kolom Kiri - Branding */}
        <div className="hidden md:flex flex-col w-1/2 bg-[#0A0A0A] p-14 relative overflow-hidden justify-between text-white border-r border-white/5">
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-rose-900 rounded-full blur-[120px] opacity-20"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-rose-800 rounded-full blur-[120px] opacity-10 translate-y-10 translate-x-10"></div>
          
          <div className="relative z-10 flex">
            <Link to="/" className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 p-2 pl-4 pr-4 rounded-full backdrop-blur-xl transition-all text-white text-xs font-black border border-white/10 shadow-2xl">
              <span className="material-symbols-outlined text-sm rotate-180">arrow_forward</span>
              Kembali ke Beranda
            </Link>
          </div>
          
          <div className="relative z-10 mt-auto">
            <div className="inline-block px-4 py-1.5 bg-rose-600/10 text-rose-500 font-black text-[10px] rounded-full uppercase tracking-[0.2em] mb-6 border border-rose-600/20 backdrop-blur-sm">Selamat Datang Kembali</div>
            <h2 className="text-4xl font-black mb-6 leading-tight tracking-tight">Kecantikan & Rasa Percaya Diri.</h2>
            <p className="text-gray-400 mb-10 text-base font-medium leading-relaxed">Masuk untuk mengakses layanan konsultasi, promo eksklusif, dan kelola profil kecantikan Anda.</p>
            
            <div className="flex items-center gap-4 p-6 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-md">
              <div className="flex -space-x-3">
                {[
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
                  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
                ].map((src, i) => (
                  <img key={i} src={src} className="w-10 h-10 rounded-full border-2 border-black object-cover" alt="User" />
                ))}
              </div>
              <div>
                <p className="text-xs font-black text-white">9,000+ Member</p>
                <p className="text-[10px] text-gray-500 font-bold">Telah bergabung dengan AkuGlow</p>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan - Form */}
        <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-center bg-white">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Masuk Akun ✨</h1>
            <p className="text-gray-500">Silakan masukkan detail akun Anda di bawah ini.</p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-medium border border-red-100 flex items-center gap-3">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form className="flex flex-col gap-5" onSubmit={handleLogin}>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Alamat Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="nama@email.com" 
                className="w-full border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-50 transition-all bg-gray-50 focus:bg-white" 
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kata Sandi</label>
                <Link to="/forgot-password" size="sm" className="text-[10px] font-black text-rose-600 hover:underline uppercase tracking-wider">Lupa Sandi?</Link>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••" 
                className="w-full border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-50 transition-all bg-gray-50 focus:bg-white" 
              />
            </div>
            
            <div className="flex items-center gap-3 mt-1">
              <input type="checkbox" id="remember" className="w-5 h-5 rounded-lg border-gray-200 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600" />
              <label htmlFor="remember" className="text-xs text-gray-500 font-bold cursor-pointer select-none">Ingat saya di perangkat ini</label>
            </div>
            
            <button disabled={loading} className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white font-black py-4.5 rounded-2xl transition-all mt-4 shadow-xl shadow-gray-200 flex justify-center items-center gap-3 active:scale-[0.98]">
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Memproses...
                </>
              ) : (
                <>
                  <span>Masuk Akun</span>
                  <span className="material-symbols-outlined text-lg">login</span>
                </>
              )}
            </button>
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink-0 mx-4 text-xs text-gray-400 font-bold tracking-widest uppercase">Atau masuk dengan</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>
            
            <button 
              type="button" 
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-3 border border-gray-200 hover:bg-gray-50 bg-white rounded-2xl py-3.5 transition-all text-sm font-bold text-gray-700"
            >
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#EA4335" d="M12.0003 12.0001V15.6806H18.7846C18.4908 17.0658 17.5147 18.2325 16.2731 18.917L20.3541 22.0717C22.7317 19.8824 24.1843 16.4806 24.1843 12.0001C24.1843 11.1718 24.1166 10.5186 23.9723 9.87329H12.0003V12.0001Z"/><path fill="#34A853" d="M12.0003 24.0004C15.4262 24.0004 18.2974 22.8631 20.3541 22.0717L16.2731 18.917C15.1106 19.6975 13.6848 20.1781 12.0003 20.1781C8.80789 20.1781 6.10398 18.0163 5.12198 15.143L0.902344 18.4116C2.94977 22.4842 7.15197 24.0004 12.0003 24.0004Z"/><path fill="#FBBC05" d="M5.122 15.143C4.8703 14.3941 4.72145 13.6063 4.72145 12.8001C4.72145 11.9939 4.8703 11.2061 5.122 10.4572L0.902359 7.18854C0.0620868 8.86877 -0.00020108 10.8715 -0.00020108 12.8001C-0.00020108 14.7288 0.0620868 16.7315 0.902359 18.4117L5.122 15.143Z"/><path fill="#4285F4" d="M12.0003 5.42226C13.8447 5.42226 15.518 6.06213 16.8209 7.20015L20.4435 3.5776C18.2718 1.54512 15.3995 0 12.0003 0C7.15197 0 2.94977 1.51624 0.902344 5.58882L5.12198 8.85746C6.10398 5.98418 8.80789 5.42226 12.0003 5.42226Z"/></svg>
              Google
            </button>
            
            <p className="text-center text-sm text-gray-500 mt-6 font-bold">
              Belum punya akun? <Link to="/register" className="text-rose-600 font-black hover:underline underline-offset-4">Daftar sekarang</Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
