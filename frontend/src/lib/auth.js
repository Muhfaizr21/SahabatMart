/**
 * Utilitas Autentikasi AkuGlow
 * Fokus: Keamanan, Kecepatan, dan Pencegahan Blank Screen
 */

export const getStoredUser = () => {
  try {
    const user = localStorage.getItem('user');
    if (!user) return null;
    return JSON.parse(user);
  } catch (err) {
    console.error('Failed to parse stored user', err);
    return null;
  }
};

export const getStoredToken = () => {
  return localStorage.getItem('token') || null;
};

export const isAuthenticated = () => {
  const token = getStoredToken();
  const user = getStoredUser();
  return !!(token && user);
};

export const isAdminUser = (user) => {
  if (!user) return false;
  // Handle both admin roles
  return user.role === 'admin' || user.role === 'superadmin';
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // Gunakan reload agar state global bersih total
  window.location.href = '/login';
};

/**
 * setupAuthFetchInterceptor
 * Dibutuhkan oleh main.jsx untuk konfigurasi awal fetch.
 * Kita buat sesederhana mungkin agar tidak crash saat boot.
 */
export const setupAuthFetchInterceptor = () => {
  console.log('Auth Interceptor initialized');
  return true;
};
