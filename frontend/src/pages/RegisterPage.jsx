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
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">Nama Lengkap</label>
              <input 
                type="text" 
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="Cth: John Doe" 
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-gray-50 focus:bg-white" 
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">Alamat Email</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="nama@email.com" 
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-gray-50 focus:bg-white" 
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">Nomor Handphone</label>
                <div className="flex border border-gray-200 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50 transition-all bg-gray-50 focus-within:bg-white">
                  <span className="flex items-center justify-center px-4 bg-gray-100 text-gray-500 text-sm border-r border-gray-200 font-medium">+62</span>
                  <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="81234567890" 
                    className="w-full px-4 py-3 text-sm outline-none bg-transparent" 
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">Password</label>
              <input 
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Minimal 8 karakter" 
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-gray-50 focus:bg-white" 
              />
            </div>

            {/* Referral Code Field */}
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
               <label className="text-sm font-bold text-blue-900 block mb-1.5 flex items-center justify-between">
                  Kode Referral (Opsional)
                  {formData.referralCode && <span className="text-[10px] text-green-600 bg-green-100 px-2 py-0.5 rounded-full uppercase">Terpasang ✓</span>}
               </label>
               <input 
                 type="text" 
                 name="referralCode"
                 value={formData.referralCode}
                 onChange={handleChange}
                 placeholder="Cth: AKU-FADI" 
                 className="w-full border border-blue-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all bg-white" 
               />
            </div>
            
            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 rounded-xl transition-colors mt-2 shadow-lg shadow-blue-600/20">
              {loading ? 'Memproses...' : 'Daftar Sekarang'}
            </button>
            
            <p className="text-center text-sm text-gray-600 mt-2">
              Sudah punya akun? <Link to="/login" className="text-blue-600 font-bold hover:underline">Masuk sekarang</Link>
            </p>
          </form>
        </div>
        
        {/* Branding Column */}
        <div className="hidden md:flex flex-col w-1/2 bg-blue-50 p-14 relative overflow-hidden justify-between border-r border-blue-100">
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-200 rounded-full blur-3xl opacity-60"></div>
          
          <div className="relative z-10 flex justify-end">
            <Link to="/" className="inline-flex items-center gap-2 bg-white/60 hover:bg-white p-2 pl-4 rounded-full backdrop-blur-sm transition-all text-gray-800 text-sm font-medium shadow-sm">
              Beranda
              <span className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </Link>
          </div>
          
          <div className="relative z-10 text-gray-800 mt-auto">
            <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 font-bold text-xs rounded-full uppercase tracking-wider mb-4 border border-blue-200">Benefit Member</div>
            <h2 className="text-3xl font-bold mb-4 text-gray-900 leading-tight">Dapatkan Keuntungan Eksklusif.</h2>
            
            <ul className="space-y-4 mb-8">
              {[
                "Poin Reward setiap pembelanjaan 🎁", 
                "Promo khusus Member di Hari Jumat 🎉",
                "Fitur pelacakan resi real-time 🚚"
              ].map((item, i) => (
                <li key={i} className="flex gap-3 text-sm font-medium text-gray-700 items-center">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-300">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
