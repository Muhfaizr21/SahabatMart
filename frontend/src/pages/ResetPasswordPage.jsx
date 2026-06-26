import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { AUTH_API_BASE, postJson } from '../lib/api';
import { useTheme } from '../context/ThemeContext';

export default function ResetPasswordPage() {
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Token reset tidak valid atau tidak ditemukan.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await postJson(`${AUTH_API_BASE}/reset-password`, {
        token,
        new_password: password
      });
      setMessage(response.message);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (_err) {
      setError(_err.message || 'Gagal mereset password.');
    } finally {
      setIsLoading(false);
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
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Reset Password</h1>
            <p className="text-slate-500 text-sm mb-8">Please create a new secure password.</p>
            
            {message ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-green-50 border border-green-100 text-green-700 p-6 rounded-xl mb-8 text-sm flex items-start gap-3">
                  <span className="material-symbols-outlined text-xl mt-0.5">verified</span>
                  <div>
                     <p className="font-bold mb-1">Password updated!</p>
                     <p className="text-xs opacity-80">Redirecting to login page in 3 seconds...</p>
                  </div>
                </div>
                <Link to="/login" className="w-full bg-black hover:bg-slate-800 text-white font-bold py-4 rounded transition-all active:scale-[0.98] flex justify-center items-center gap-2">
                  <span className="material-symbols-outlined text-base">login</span>
                  Login Now
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded text-xs font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {error}
                  </div>
                )}
                
                {!token ? (
                   <div className="text-center py-8">
                      <p className="text-slate-500 mb-6 font-semibold text-sm">Invalid token.</p>
                      <Link to="/forgot-password" className="text-black font-bold hover:underline">
                        Request New Link
                      </Link>
                   </div>
                ) : (
                  <>
                    <div className="relative">
                      <label className="text-xs font-semibold text-slate-500 block mb-1">New Password</label>
                      <input 
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full border-b border-slate-200 py-2 pr-8 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-black transition-colors bg-transparent tracking-widest"
                        required
                        minLength={6}
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

                    <div className="relative">
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Confirm Password</label>
                      <input 
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full border-b border-slate-200 py-2 pr-8 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-black transition-colors bg-transparent tracking-widest"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-0 bottom-2 text-slate-400 hover:text-black transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {showConfirmPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-black hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-4 rounded mt-4 transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                          Processing...
                        </>
                      ) : (
                        "Save New Password"
                      )}
                    </button>
                  </>
                )}
              </form>
            )}
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
