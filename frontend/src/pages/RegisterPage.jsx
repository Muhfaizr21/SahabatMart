import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Gagal mendaftar');
      }

      // Berhasil
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/'); // Redirect ke home
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-6">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row-reverse border border-gray-100">
        
        {/* Kolom Kanan (karena row-reverse) - Form */}
        <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Buat Akun Baru ✨</h1>
            <p className="text-gray-500">Bergabunglah dengan ribuan pengguna SahabatMart lainnya.</p>
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
                <span className="flex items-center justify-center px-4 bg-gray-100 text-gray-500 text-sm border-r border-gray-200 font-medium">
                  +62
                </span>
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
            
            <div className="flex items-start gap-2 mt-1">
              <input type="checkbox" id="terms" required className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
              <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed cursor-pointer select-none">
                Saya menyetujui <Link to="#" className="text-blue-600 font-medium hover:underline">Syarat & Ketentuan</Link> serta <Link to="#" className="text-blue-600 font-medium hover:underline">Kebijakan Privasi</Link> SahabatMart.
              </label>
            </div>
            
            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 rounded-xl transition-colors mt-2 shadow-lg shadow-blue-600/20">
              {loading ? 'Memproses...' : 'Daftar Sekarang'}
            </button>
            
            <div className="relative flex items-center pt-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-xs text-gray-400 font-medium">ATAU</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>
            
            <button type="button" className="flex items-center justify-center gap-2 border border-blue-100 hover:bg-blue-50 bg-white rounded-xl py-3 transition-colors text-sm font-bold text-gray-700">
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#EA4335" d="M12.0003 12.0001V15.6806H18.7846C18.4908 17.0658 17.5147 18.2325 16.2731 18.917L20.3541 22.0717C22.7317 19.8824 24.1843 16.4806 24.1843 12.0001C24.1843 11.1718 24.1166 10.5186 23.9723 9.87329H12.0003V12.0001Z"/><path fill="#34A853" d="M12.0003 24.0004C15.4262 24.0004 18.2974 22.8631 20.3541 22.0717L16.2731 18.917C15.1106 19.6975 13.6848 20.1781 12.0003 20.1781C8.80789 20.1781 6.10398 18.0163 5.12198 15.143L0.902344 18.4116C2.94977 22.4842 7.15197 24.0004 12.0003 24.0004Z"/><path fill="#FBBC05" d="M5.122 15.143C4.8703 14.3941 4.72145 13.6063 4.72145 12.8001C4.72145 11.9939 4.8703 11.2061 5.122 10.4572L0.902359 7.18854C0.0620868 8.86877 -0.00020108 10.8715 -0.00020108 12.8001C-0.00020108 14.7288 0.0620868 16.7315 0.902359 18.4117L5.122 15.143Z"/><path fill="#4285F4" d="M12.0003 5.42226C13.8447 5.42226 15.518 6.06213 16.8209 7.20015L20.4435 3.5776C18.2718 1.54512 15.3995 0 12.0003 0C7.15197 0 2.94977 1.51624 0.902344 5.58882L5.12198 8.85746C6.10398 5.98418 8.80789 5.42226 12.0003 5.42226Z"/></svg>
              Daftar via Google
            </button>
            
            <p className="text-center text-sm text-gray-600 mt-2">
              Sudah punya akun? <Link to="/login" className="text-blue-600 font-bold hover:underline">Masuk sekarang</Link>
            </p>
          </form>
        </div>
        
        {/* Kolom Kiri (karena row-reverse) - Branding */}
        <div className="hidden md:flex flex-col w-1/2 bg-blue-50 p-14 relative overflow-hidden justify-between border-r border-blue-100">
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-200 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-300 rounded-full blur-3xl opacity-40 translate-y-10 translate-x-10"></div>
          
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
                "Fitur pelacakan resi real-time 🚚",
                "Layanan pelanggan prioritas 24/7 🎧"
              ].map((item, i) => (
                <li key={i} className="flex gap-3 text-sm font-medium text-gray-700 items-center">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-300">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            
            <div className="flex -space-x-3">
              {[
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
                "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
              ].map((src, i) => (
                <img key={i} src={src} className="w-10 h-10 rounded-full border-2 border-white object-cover" alt="User" />
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">9k+</div>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-3">Telah bergabung dengan kami</p>
          </div>
        </div>
      </div>
    </main>
  );
}
