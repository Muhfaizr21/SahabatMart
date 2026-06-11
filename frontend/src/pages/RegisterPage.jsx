import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AUTH_API_BASE, fetchJson } from '../lib/api';

export default function RegisterPage() {
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
  // Sesuai dokumen: referral dicatat otomatis dari link affiliate ?ref=...
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const ref = params.get('ref');
      if (ref) {
        setFormData(prev => ({ ...prev, referralCode: ref }));
        // Simpan ke localStorage agar tetap ada saat checkout (jika belum daftar dulu)
        localStorage.setItem('pending_ref', ref);
        console.log('✅ Affiliate Ref Captured & Stored:', ref);
      } else {
        // Cek dari localStorage jika sudah pernah klik link affiliate sebelumnya
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
        localStorage.setItem('user', JSON.stringify(data.user));
        // Hapus pending_ref setelah berhasil register
        localStorage.removeItem('pending_ref');
        // [Sync Fix] Redirect ke Mitra Area, bukan homepage
        // Sesuai dokumen: "Setelah registrasi selesai, mitra dapat login ke Mitra Area"
        navigate('/affiliate');
      }
    } catch (_err) {
      setError(_err.message || 'Pendaftaran gagal');
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
              <img src="/akuglow.webp" alt="AkuGlow" className="h-12 w-auto object-contain" />
            </div>

            <div className="space-y-4">
              <span className="inline-block px-3 py-1 bg-rose-500/10 text-rose-600 font-extrabold text-[10px] rounded-full uppercase tracking-[0.2em] border border-rose-500/20 backdrop-blur-sm">
                Benefit Member & Mitra
              </span>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight">
                Eksklusivitas <br />
                Dalam Genggaman.
              </h2>
              
              <ul className="space-y-4 pt-4">
                {[
                  { text: "Poin Reward setiap pembelanjaan", icon: "redeem" }, 
                  { text: "Konsultasi Skin Care Gratis", icon: "health_and_safety" },
                  { text: "Akses Produk Limited Edition", icon: "verified" }
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-xs font-bold text-slate-600 items-center">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/5 text-rose-600 flex items-center justify-center flex-shrink-0 border border-rose-500/10">
                      <span className="material-symbols-outlined text-base">{item.icon}</span>
                    </div>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Row - Mission Statement */}
          <div className="relative z-10 mt-auto">
            <div className="p-5 bg-rose-500/[0.02] rounded-3xl border border-rose-500/5 backdrop-blur-md shadow-sm">
              <p className="text-[9px] text-rose-600 font-black uppercase tracking-[0.2em] mb-1">Misi Kami</p>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">Memberdayakan setiap individu untuk meraih potensi kecantikan terbaik melalui teknologi & sains.</p>
            </div>
          </div>
        </div>

        {/* Right Column - Registration Form */}
        <div className="lg:w-1/2 p-8 lg:p-14 flex flex-col justify-center bg-white">
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Daftar Jadi Mitra Akuglow ✨</h1>
            <p className="text-slate-500 text-sm font-medium">Bergabung gratis, dapatkan komisi dari setiap penjualan yang Anda referensikan.</p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-3 animate-shake">
              <span className="material-symbols-outlined text-lg text-rose-500">error</span>
              <span className="flex-1 leading-relaxed">{error}</span>
            </div>
          )}

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {/* Full Name Field */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2">Nama Lengkap</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-rose-500 transition-colors text-lg">person</span>
                <input 
                  type="text" 
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="Cth: John Doe" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-5 py-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/10 hover:border-slate-200 transition-all duration-300" 
                />
              </div>
            </div>
            
            {/* Email & Phone Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2">Alamat Email</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-rose-500 transition-colors text-lg">mail</span>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="nama@email.com" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-5 py-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/10 hover:border-slate-200 transition-all duration-300" 
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2">Nomor Handphone</label>
                <div className="flex border border-slate-100 rounded-2xl overflow-hidden focus-within:border-rose-500/50 focus-within:ring-4 focus-within:ring-rose-500/10 transition-all duration-300 bg-slate-50">
                  <span className="flex items-center justify-center px-4 bg-slate-100 text-slate-500 text-xs border-r border-slate-100 font-extrabold">+62</span>
                  <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="81234567890" 
                    className="w-full px-4 py-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-transparent outline-none" 
                  />
                </div>
              </div>
            </div>
            
            {/* Password Field */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2">Kata Sandi</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-rose-500 transition-colors text-lg">lock</span>
                <input 
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Minimal 8 karakter" 
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

            {/* Referral Code Field */}
            <div className="p-5 bg-rose-500/[0.02] rounded-3xl border border-rose-500/5">
              <label className="text-[9px] font-bold text-rose-900 block mb-2 flex items-center justify-between uppercase tracking-[0.2em]">
                Kode Referral (Opsional)
                {formData.referralCode && <span className="text-[9px] text-white bg-rose-600 px-3 py-1 rounded-full font-black scale-95 origin-right">AKTIF ✓</span>}
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-rose-500 transition-colors text-lg">card_membership</span>
                <input 
                  type="text" 
                  name="referralCode"
                  value={formData.referralCode}
                  onChange={handleChange}
                  placeholder="Cth: AKU-REF" 
                  className="w-full bg-white border border-slate-100 rounded-2xl pl-11 pr-5 py-3.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/10 hover:border-slate-200 transition-all duration-300" 
                />
              </div>
            </div>
            
            {/* Submit Button */}
            <button disabled={loading} className="relative w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 text-white font-extrabold py-4 rounded-2xl transition-all duration-300 mt-4 shadow-md shadow-rose-500/10 active:scale-[0.98] overflow-hidden group flex justify-center items-center gap-3 cursor-pointer">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Daftar Akun</span>
                  <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">person_add</span>
                </>
              )}
            </button>
            
            {/* Login Redirect */}
            <p className="text-center text-sm text-slate-500 mt-4 font-medium">
              Sudah punya akun? <Link to="/login" className="text-rose-600 font-extrabold hover:text-rose-500 hover:underline underline-offset-4 transition-colors">Masuk sekarang</Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
