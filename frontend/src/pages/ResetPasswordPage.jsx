import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { AUTH_API_BASE, postJson } from '../lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    } catch (err) {
      setError(err.message || 'Gagal mereset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-6">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-gray-100">
        
        {/* Kolom Kiri - Branding (Sync with Login) */}
        <div className="hidden md:flex flex-col w-1/2 bg-[#0A0A0A] p-14 relative overflow-hidden justify-between text-white border-r border-white/5">
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-rose-900 rounded-full blur-[120px] opacity-20"></div>
          
          <div className="relative z-10 flex">
            <Link to="/login" className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 p-2 pl-4 pr-4 rounded-full backdrop-blur-xl transition-all text-white text-xs font-black border border-white/10 shadow-2xl">
              <span className="material-symbols-outlined text-sm rotate-180">arrow_forward</span>
              Batal & Login
            </Link>
          </div>
          
          <div className="relative z-10 mt-auto">
            <div className="inline-block px-4 py-1.5 bg-rose-600/10 text-rose-500 font-black text-[10px] rounded-full uppercase tracking-[0.2em] mb-6 border border-rose-600/20 backdrop-blur-sm">Reset Akun</div>
            <h2 className="text-4xl font-black mb-6 leading-tight tracking-tight">Perbarui Rahasia Kecantikan Anda.</h2>
            <p className="text-gray-400 mb-10 text-base font-medium leading-relaxed">Keamanan akun Anda adalah prioritas kami. Masukkan password baru yang kuat dan unik.</p>
            
            <div className="flex items-center gap-4 p-6 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-md">
               <div className="w-12 h-12 rounded-full bg-rose-600/20 flex items-center justify-center text-rose-500">
                  <span className="material-symbols-outlined text-2xl">verified_user</span>
               </div>
               <div>
                  <p className="text-xs font-black text-white">Verifikasi Aman</p>
                  <p className="text-[10px] text-gray-500 font-bold">Proses ini dilindungi oleh token enkripsi unik.</p>
               </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan - Form */}
        <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-center bg-white">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-black text-gray-900 mb-2">Reset Password ✨</h1>
            <p className="text-gray-500 font-bold text-sm">Silakan buat kata sandi baru yang aman.</p>
          </div>
          
          {message ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-green-50 border border-green-100 text-green-700 p-6 rounded-[24px] mb-8 text-sm font-bold flex items-start gap-4">
                <span className="material-symbols-outlined text-xl mt-0.5">verified</span>
                <div>
                   <p className="mb-1">Password berhasil diperbarui!</p>
                   <p className="text-xs opacity-80 font-medium">Mengarahkan Anda kembali ke halaman login dalam 3 detik...</p>
                </div>
              </div>
              <Link to="/login" className="w-full bg-gray-900 hover:bg-black text-white font-black py-4.5 rounded-2xl transition-all shadow-xl shadow-gray-200 flex justify-center items-center gap-3">
                <span className="material-symbols-outlined text-lg">login</span>
                Masuk Sekarang
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-3 animate-shake">
                  <span className="material-symbols-outlined text-lg">error</span>
                  {error}
                </div>
              )}
              
              {!token ? (
                 <div className="text-center py-8">
                    <p className="text-gray-400 mb-6 font-bold text-sm">Token tidak valid.</p>
                    <Link to="/forgot-password" className="text-rose-600 font-black hover:underline uppercase tracking-widest text-[10px]">
                      Minta Tautan Baru
                    </Link>
                 </div>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Password Baru</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" 
                      className="w-full border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-50 transition-all bg-gray-50 focus:bg-white" 
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Konfirmasi Password</label>
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••" 
                      className="w-full border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-50 transition-all bg-gray-50 focus:bg-white" 
                      required
                    />
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white font-black py-4.5 rounded-2xl transition-all shadow-xl shadow-gray-200 flex justify-center items-center gap-3 active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        Memproses...
                      </>
                    ) : (
                      <>
                        <span>Simpan Password Baru</span>
                        <span className="material-symbols-outlined text-lg">save_as</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
