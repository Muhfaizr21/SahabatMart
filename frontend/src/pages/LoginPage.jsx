import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AUTH_API_BASE, fetchJson } from '../lib/api';
import { getStoredUser, isAdminUser } from '../lib/auth';
import { useTheme } from '../context/ThemeContext';

const getRedirectPath = (user) => {
  if (!user) return '/';
  if (user.role === 'admin' || user.role === 'superadmin') return '/admin';
  if (user.role === 'merchant') return '/merchant';
  if (user.role === 'affiliate') return '/affiliate';
  return '/';
};

export default function LoginPage() {
  const { theme } = useTheme();
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
      window.history.replaceState({}, document.title, window.location.pathname);
      setLoading(true);
      localStorage.setItem('token', token);

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
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate(getRedirectPath(data.user), { replace: true });
    } catch (_err) {
      setError(_err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-[1100px] bg-white rounded-2xl md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[650px]">
        
        {/* Left Column - Form */}
        <div className="lg:w-1/2 p-8 lg:p-16 flex flex-col bg-white relative">
          {/* Top Bar: Logo & Back to Web */}
          <div className="mb-12 flex justify-between items-center">
            <Link to="/">
              <img src={theme?.platform_logo || "/akuglow.webp"} alt="AkuGlow" className="h-8 w-auto object-contain" />
            </Link>
            <Link to="/" className="text-slate-400 hover:text-black flex items-center gap-1 text-xs font-semibold transition-colors bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              Back to Web
            </Link>
          </div>
          
          <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 mb-8">Login to your account</h1>
            
            {error && (
              <div className="mb-6 p-3 bg-red-50 text-red-600 rounded text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}

            <form className="flex flex-col gap-6" onSubmit={handleLogin}>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="josh@gmail.com" 
                  className="w-full border-b border-slate-200 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-black transition-colors bg-transparent"
                />
              </div>

              <div className="relative">
                <div className="flex justify-between items-end mb-1">
                  <label className="text-xs font-semibold text-slate-500 block">Password</label>
                  <Link to="/forgot-password" className="text-[10px] text-slate-400 hover:text-black hover:underline transition-colors">Forgot Password?</Link>
                </div>
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••" 
                  className="w-full border-b border-slate-200 py-2 pr-8 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-black transition-colors bg-transparent tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 bottom-2 text-slate-400 hover:text-black transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="relative flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-4 h-4 rounded border border-slate-300 bg-white peer-checked:bg-black peer-checked:border-black flex items-center justify-center transition-all">
                    <span className="material-symbols-outlined text-white text-[10px] scale-0 peer-checked:scale-100 transition-transform">check</span>
                  </div>
                  <span className="ml-2 text-[11px] text-slate-500 font-semibold">Remember me</span>
                </label>
              </div>

              <button 
                disabled={loading} 
                className="w-full bg-black hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-4 rounded transition-all active:scale-[0.98] flex justify-center items-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : "Log in"}
              </button>
            </form>

            <div className="relative flex items-center py-6">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink-0 mx-4 text-[10px] text-slate-400 font-semibold uppercase">Or log in with</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 rounded py-3.5 transition-all text-sm font-semibold text-slate-700 cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12.0003 12.0001V15.6806H18.7846C18.4908 17.0658 17.5147 18.2325 16.2731 18.917L20.3541 22.0717C22.7317 19.8824 24.1843 16.4806 24.1843 12.0001C24.1843 11.1718 24.1166 10.5186 23.9723 9.87329H12.0003V12.0001Z" />
                <path fill="#34A853" d="M12.0003 24.0004C15.4262 24.0004 18.2974 22.8631 20.3541 22.0717L16.2731 18.917C15.1106 19.6975 13.6848 20.1781 12.0003 20.1781C8.80789 20.1781 6.10398 18.0163 5.12198 15.143L0.902344 18.4116C2.94977 22.4842 7.15197 24.0004 12.0003 24.0004Z" />
                <path fill="#FBBC05" d="M5.122 15.143C4.8703 14.3941 4.72145 13.6063 4.72145 12.8001C4.72145 11.9939 4.8703 11.2061 5.122 10.4572L0.902359 7.18854C0.0620868 8.86877 -0.00020108 10.8715 -0.00020108 12.8001C-0.00020108 14.7288 0.0620868 16.7315 0.902359 18.4117L5.122 15.143Z" />
                <path fill="#4285F4" d="M12.0003 5.42226C13.8447 5.42226 15.518 6.06213 16.8209 7.20015L20.4435 3.5776C18.2718 1.54512 15.3995 0 12.0003 0C7.15197 0 2.94977 1.51624 0.902344 5.58882L5.12198 8.85746C6.10398 5.98418 8.80789 5.42226 12.0003 5.42226Z" />
              </svg>
              Google
            </button>

            <p className="text-center text-xs text-slate-500 mt-8">
              Don't have an account? <Link to="/register" className="font-bold text-black hover:underline">Sign up here</Link>
            </p>
          </div>
        </div>

        {/* Right Column - Visuals & Geometry */}
        {theme?.auth_side_image ? (
          <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-100">
            <img src={theme.auth_side_image} alt="Auth Background" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        ) : (
          <div className="hidden lg:flex lg:w-1/2 bg-[#264b96] relative overflow-hidden flex-col items-center justify-center p-8">
          
          {/* Background Geometry */}
          <div className="absolute top-8 left-8 w-24 h-24 bg-[radial-gradient(#f472b6_3px,transparent_3px)] bg-[size:14px_14px] opacity-80"></div>
          <div className="absolute -top-10 -right-10 w-72 h-72 bg-pink-400 rounded-full"></div>
          <div className="absolute top-10 right-10 w-24 h-24 bg-rose-500 rounded-full"></div>
          <div className="absolute top-20 right-40 w-32 h-32 bg-[#1e3a8a]" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}></div>
          <div className="absolute top-1/3 -left-20 w-80 h-80 bg-[#fca5a5] rounded-full mix-blend-screen opacity-90"></div>
          <div className="absolute top-1/3 right-10 w-32 h-32 bg-pink-200" style={{ clipPath: 'polygon(0 0, 0% 100%, 100% 100%)' }}></div>
          <div className="absolute bottom-20 -left-10 w-48 h-48 bg-[#1e3a8a] opacity-80" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
          <div className="absolute bottom-16 right-16 w-24 h-24 bg-[radial-gradient(#fca5a5_3px,transparent_3px)] bg-[size:14px_14px] opacity-80"></div>
          <div className="absolute bottom-10 right-48 w-20 h-20 bg-rose-500 rounded-tr-full rounded-br-full"></div>

          {/* Center Graphic Box */}
          <div className="relative z-10 w-full max-w-sm">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl text-white shadow-2xl flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl text-white">verified</span>
              </div>
              <h2 className="text-xl font-semibold mb-3">Check the status</h2>
              <p className="text-white/80 text-sm leading-relaxed mb-8">It's easy to check the status of your online orders and track your progress in the system.</p>
              
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <div className="w-2 h-2 rounded-full bg-white/40"></div>
                <div className="w-2 h-2 rounded-full bg-white/40"></div>
              </div>
            </div>
          </div>
          </div>
        )}

      </div>
    </main>
  );
}
