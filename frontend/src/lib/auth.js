/**
 * Utilitas Autentikasi AkuGlow
 * Fokus: Keamanan, Kecepatan, dan Pencegahan Blank Screen
 */

export const getStoredUser = () => {
  try {
    const user = localStorage.getItem('user');
    if (!user) return null;
    return JSON.parse(user);
  } catch (_err) {
    localStorage.removeItem('user');
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
  // [BUG-H7 Fix] Hapus affiliate_id saat logout — cegah misattribution lintas sesi
  localStorage.removeItem('affiliate_id');
  localStorage.removeItem('pending_ref');
  // Gunakan reload agar state global bersih total
  window.location.href = '/login';
};

/**
 * setupAuthFetchInterceptor
 * Mengatur interceptor fetch global untuk auto-attach token.
 */
let _originalFetch = null;

export const setupAuthFetchInterceptor = () => {
  if (_originalFetch) return true; // sudah di-set
  
  _originalFetch = window.fetch;
  window.fetch = function(input, init = {}) {
    const token = localStorage.getItem('token');
    if (token) {
      init.headers = {
        ...init.headers,
        'Authorization': `Bearer ${token}`,
      };
    }
    return _originalFetch(input, init);
  };
  
  return true;
};
