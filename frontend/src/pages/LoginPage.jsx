import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
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
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login gagal, periksa email & password Anda.');
      }

      // Berhasil login
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      if (data.user.role === 'admin' || data.user.role === 'superadmin') {
        window.location.href = '/admin'; // Redirect force reload to reset states
      } else {
        window.location.href = '/'; // Redirect ke home
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-6">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-gray-100">
        {/* Kolom Kiri - Form */}
        <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Selamat Datang Kembali! 👋</h1>
            <p className="text-gray-500">Silakan masukkan detail akun kamu untuk melanjutkan belanja di SahabatMart.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}
          
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700">Password</label>
                <Link to="#" className="text-xs text-blue-600 font-medium hover:text-blue-700 hover:underline">
                  Lupa Password?
                </Link>
              </div>
              <input 
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••" 
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-gray-50 focus:bg-white" 
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
              <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer select-none">Ingat saya</label>
            </div>
            
            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 rounded-xl transition-colors mt-2 shadow-lg shadow-blue-600/20">
              {loading ? 'Memproses...' : 'Masuk Sekarang'}
            </button>
            
            <div className="relative flex items-center py-3">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-xs text-gray-400 font-medium">ATAU MASUK DENGAN</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 rounded-xl py-2.5 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#EA4335" d="M12.0003 12.0001V15.6806H18.7846C18.4908 17.0658 17.5147 18.2325 16.2731 18.917L20.3541 22.0717C22.7317 19.8824 24.1843 16.4806 24.1843 12.0001C24.1843 11.1718 24.1166 10.5186 23.9723 9.87329H12.0003V12.0001Z"/><path fill="#34A853" d="M12.0003 24.0004C15.4262 24.0004 18.2974 22.8631 20.3541 22.0717L16.2731 18.917C15.1106 19.6975 13.6848 20.1781 12.0003 20.1781C8.80789 20.1781 6.10398 18.0163 5.12198 15.143L0.902344 18.4116C2.94977 22.4842 7.15197 24.0004 12.0003 24.0004Z"/><path fill="#FBBC05" d="M5.122 15.143C4.8703 14.3941 4.72145 13.6063 4.72145 12.8001C4.72145 11.9939 4.8703 11.2061 5.122 10.4572L0.902359 7.18854C0.0620868 8.86877 -0.00020108 10.8715 -0.00020108 12.8001C-0.00020108 14.7288 0.0620868 16.7315 0.902359 18.4117L5.122 15.143Z"/><path fill="#4285F4" d="M12.0003 5.42226C13.8447 5.42226 15.518 6.06213 16.8209 7.20015L20.4435 3.5776C18.2718 1.54512 15.3995 0 12.0003 0C7.15197 0 2.94977 1.51624 0.902344 5.58882L5.12198 8.85746C6.10398 5.98418 8.80789 5.42226 12.0003 5.42226Z"/></svg>
                <span className="text-sm font-semibold text-gray-700">Google</span>
              </button>
              <button type="button" className="flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 rounded-xl py-2.5 transition-colors">
                <svg width="20" height="20" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.005 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
                <span className="text-sm font-semibold text-gray-700">Facebook</span>
              </button>
            </div>
            
            <p className="text-center text-sm text-gray-600 mt-4">
              Belum punya akun? <Link to="/register" className="text-blue-600 font-bold hover:underline">Daftar sekarang</Link>
            </p>
          </form>
        </div>
        
        {/* Kolom Kanan - Image/Branding */}
        <div className="hidden md:flex flex-col w-1/2 bg-blue-600 p-14 relative overflow-hidden justify-between">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-50 -translate-y-20 translate-x-20"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-700 rounded-full blur-3xl opacity-50 translate-y-20 -translate-x-10"></div>
          
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 p-2 pr-4 rounded-full backdrop-blur-sm transition-all text-white text-sm font-medium">
              <span className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </span>
              Kembali
            </Link>
          </div>
          
          <div className="relative z-10 text-white mt-auto">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Temukan Produk Terbaik Hanya di SahabatMart.</h2>
            <p className="text-blue-100 mb-8 max-w-sm">Berbagai diskon menarik, gratis ongkir, dan jaminan produk berkualitas setiap hari.</p>
            
            {/* UI Mockup Mini */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 transform -rotate-3 hover:rotate-0 transition-transform duration-500 max-w-xs shadow-2xl shadow-blue-900/50">
              <div className="flex gap-3 items-center">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                  <svg width="24" height="24" fill="none" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                </div>
                <div>
                  <div className="text-white font-bold">Gratis Ongkir</div>
                  <div className="text-blue-200 text-xs">Tanpa minimum belanja!</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
