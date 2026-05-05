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
    } catch (err) {
      console.warn('Affiliate capture error:', err);
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
    } catch (err) {
      setError(err.message || 'Pendaftaran gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-6">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row-reverse border border-gray-100">
        
        {/* Form Column */}
        <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Daftar Jadi Mitra Akuglow ✨</h1>
            <p className="text-gray-500">Bergabung gratis, dapatkan komisi dari setiap penjualan yang Anda referensikan.</p>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Nama Lengkap</label>
              <input 
                type="text" 
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="Cth: John Doe" 
                className="w-full border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-50 transition-all bg-gray-50 focus:bg-white" 
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Alamat Email</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="nama@email.com" 
                  className="w-full border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-50 transition-all bg-gray-50 focus:bg-white" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Nomor Handphone</label>
                <div className="flex border border-gray-100 rounded-2xl overflow-hidden focus-within:border-rose-500 focus-within:ring-4 focus-within:ring-rose-50 transition-all bg-gray-50 focus-within:bg-white">
                  <span className="flex items-center justify-center px-4 bg-gray-200/50 text-gray-500 text-xs border-r border-gray-100 font-black">+62</span>
                  <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="81234567890" 
                    className="w-full px-5 py-4 text-sm font-bold outline-none bg-transparent" 
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Kata Sandi</label>
              <input 
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Minimal 8 karakter" 
                className="w-full border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-50 transition-all bg-gray-50 focus:bg-white" 
              />
            </div>

            {/* Referral Code Field */}
            <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-100/50">
               <label className="text-[10px] font-black text-rose-900 block mb-2 flex items-center justify-between uppercase tracking-widest">
                  Kode Referral (Opsional)
                  {formData.referralCode && <span className="text-[10px] text-white bg-rose-600 px-3 py-1 rounded-full font-black">AKTIF ✓</span>}
               </label>
               <input 
                 type="text" 
                 name="referralCode"
                 value={formData.referralCode}
                 onChange={handleChange}
                 placeholder="Cth: AKU-REF" 
                 className="w-full border border-rose-100 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100 transition-all bg-white" 
               />
            </div>
            
            <button disabled={loading} className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white font-black py-4.5 rounded-2xl transition-all mt-4 shadow-xl shadow-gray-200 flex justify-center items-center gap-3 active:scale-[0.98]">
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Memproses...
                </>
              ) : (
                <>
                  <span>Daftar Akun</span>
                  <span className="material-symbols-outlined text-lg">person_add</span>
                </>
              )}
            </button>
            
            <p className="text-center text-sm text-gray-500 mt-4 font-bold">
              Sudah punya akun? <Link to="/login" className="text-rose-600 font-black hover:underline underline-offset-4">Masuk sekarang</Link>
            </p>
          </form>
        </div>
        
        {/* Branding Column */}
        <div className="hidden md:flex flex-col w-1/2 bg-[#0A0A0A] p-14 relative overflow-hidden justify-between border-r border-white/5 text-white">
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-rose-900 rounded-full blur-[120px] opacity-20"></div>
          
          <div className="relative z-10 flex justify-end">
            <Link to="/" className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 p-2 pl-4 pr-4 rounded-full backdrop-blur-xl transition-all text-white text-xs font-black border border-white/10 shadow-2xl">
              Beranda
              <span className="w-8 h-8 bg-rose-600 rounded-full flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-sm">home</span>
              </span>
            </Link>
          </div>
          
          <div className="relative z-10 text-white mt-auto">
            <div className="inline-block px-4 py-1.5 bg-rose-600/10 text-rose-500 font-black text-[10px] rounded-full uppercase tracking-[0.2em] mb-6 border border-rose-600/20 backdrop-blur-sm">Benefit Member</div>
            <h2 className="text-4xl font-black mb-6 leading-tight tracking-tight">Eksklusivitas Dalam Genggaman.</h2>
            
            <ul className="space-y-6 mb-10">
              {[
                { text: "Poin Reward setiap pembelanjaan", icon: "redeem" }, 
                { text: "Konsultasi Skin Care Gratis", icon: "health_and_safety" },
                { text: "Akses Produk Limited Edition", icon: "verified" }
              ].map((item, i) => (
                <li key={i} className="flex gap-4 text-sm font-bold text-gray-400 items-center">
                  <div className="w-8 h-8 rounded-xl bg-white/5 text-rose-500 flex items-center justify-center flex-shrink-0 border border-white/10">
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  </div>
                  {item.text}
                </li>
              ))}
            </ul>

            <div className="p-6 bg-rose-600/5 rounded-3xl border border-rose-600/10">
               <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest mb-1">Misi Kami</p>
               <p className="text-xs text-gray-500 font-bold leading-relaxed">Memberdayakan setiap individu untuk meraih potensi kecantikan terbaik melalui teknologi & sains.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
