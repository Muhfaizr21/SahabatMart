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
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-10 relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-green-600"></div>
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 15V17M12 7V13M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h1>
          <p className="text-sm text-gray-500">
            Silakan masukkan kata sandi baru untuk akun Anda.
          </p>
        </div>

        {message ? (
          <div className="text-center">
            <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-6 text-sm font-medium">
              {message}
            </div>
            <p className="text-sm text-gray-500 mb-4">Mengarahkan ke halaman login...</p>
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">
              Klik di sini jika tidak diarahkan otomatis
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}
            
            {!token ? (
               <Link to="/forgot-password" className="text-center text-blue-600 font-semibold hover:underline">
                 Minta tautan reset baru
               </Link>
            ) : (
              <>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1.5">Password Baru</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-50 transition-all bg-gray-50 focus:bg-white" 
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1.5">Konfirmasi Password Baru</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-50 transition-all bg-gray-50 focus:bg-white" 
                    required
                  />
                </div>
                
                <button 
                  type="submit"
                  disabled={isLoading}
                  className={`w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-green-600/20 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? 'Memproses...' : 'Simpan Password Baru'}
                </button>
              </>
            )}
          </form>
        )}
        
        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <Link to="/login" className="text-sm font-semibold text-gray-700 hover:text-blue-600 flex items-center justify-center gap-2">
            Kembali ke Halaman Login
          </Link>
        </div>
      </div>
    </main>
  );
}
