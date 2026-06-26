import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AUTH_API_BASE, fetchJson } from '../lib/api';
import { useTheme } from '../context/ThemeContext';

export default function RegisterPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    referralCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // [Sync Fix] Capture ref dari URL dan simpan di localStorage
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const ref = params.get('ref');
      if (ref) {
        setFormData(prev => ({ ...prev, referralCode: ref }));
        localStorage.setItem('pending_ref', ref);
        console.log(' Affiliate Ref Captured & Stored:', ref);
      } else {
        const storedRef = localStorage.getItem('pending_ref');
        if (storedRef) setFormData(prev => ({ ...prev, referralCode: storedRef }));
      }
    } catch (_err) {
      console.warn('Affiliate capture error:', _err);
    }
  }, [location.search]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await fetchJson(`${AUTH_API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          referral_code: formData.referralCode
        })
      });

      if (data && data.token) {
        localStorage.setItem('token', data.token);
        if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.removeItem('pending_ref');
        navigate('/affiliate');
      }
    } catch (_err) {
      setError(_err.message || 'Pendaftaran gagal');
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
            <h1 className="text-2xl font-bold text-slate-800 mb-8">Create account</h1>
            
            {error && (
              <div className="mb-6 p-3 bg-red-50 text-red-600 rounded text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}

            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Full Name</label>
                <input 
                  type="text" 
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="John Doe" 
                  className="w-full border-b border-slate-200 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-black transition-colors bg-transparent"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Email</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="josh@gmail.com" 
                  className="w-full border-b border-slate-200 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-black transition-colors bg-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Phone</label>
                  <div className="flex items-end">
                    <span className="border-b border-slate-200 py-2 text-sm text-slate-500 pr-2">+62</span>
                    <input 
                      type="tel" 
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="81234567890" 
                      className="w-full border-b border-slate-200 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-black transition-colors bg-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1 flex justify-between">
                    Referral
                    {formData.referralCode && <span className="text-[10px] text-green-600 font-bold">✓</span>}
                  </label>
                  <input 
                    type="text" 
                    name="referralCode"
                    value={formData.referralCode}
                    onChange={handleChange}
                    placeholder="AKU-REF" 
                    className="w-full border-b border-slate-200 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-black transition-colors bg-transparent"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="text-xs font-semibold text-slate-500 block mb-1">Password</label>
                <input 
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••" 
                  className="w-full border-b border-slate-200 py-2 pr-8 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-black transition-colors bg-transparent tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 translate-y-1 text-slate-400 hover:text-black transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              <button 
                disabled={loading} 
                className="w-full bg-black hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-4 rounded mt-4 transition-all active:scale-[0.98] flex justify-center items-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : "Sign up"}
              </button>
            </form>

            <p className="text-center text-xs text-slate-500 mt-8">
              Already have an account? <Link to="/login" className="font-bold text-black hover:underline">Log in here</Link>
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

