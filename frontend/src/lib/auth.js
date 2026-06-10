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
  return user.role === 'admin' || user.role === 'superadmin';
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // [BUG-H7 Fix] Hapus affiliate_id saat logout — cegah misattribution lintas sesi
  localStorage.removeItem('affiliate_id');
  localStorage.removeItem('pending_ref');
  // Bersihkan timestamp idle
  localStorage.removeItem('_last_active');
  window.location.href = '/login';
};

// ─── IDLE TIMEOUT ──────────────────────────────────────────────
// 1 jam = 3600000ms
const IDLE_LIMIT_MS = 60 * 60 * 1000;
const ACTIVITY_KEY  = '_last_active';

/** Simpan timestamp aktivitas terakhir */
const touchActivity = () => {
  localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
};

/** Cek apakah sudah idle > 1 jam */
const isIdleExpired = () => {
  if (!isAuthenticated()) return false; // tidak login → tidak perlu cek
  const raw = localStorage.getItem(ACTIVITY_KEY);
  if (!raw) return false; // belum ada record → anggap baru
  return Date.now() - parseInt(raw, 10) > IDLE_LIMIT_MS;
};

let _idleTimer = null;

/**
 * setupIdleTimeout
 * Dipanggil sekali saat app mount.
 * - Dengarkan event aktivitas user → reset timer
 * - Cek setiap 60 detik apakah sudah idle > 1 jam
 * - Saat tab dibuka kembali (visibilitychange) → cek segera
 */
export const setupIdleTimeout = () => {
  // Guard: jangan setup dua kali
  if (_idleTimer) return;

  // Jika saat ini sudah idle, langsung logout
  if (isIdleExpired()) {
    logout();
    return;
  }

  // Catat aktivitas awal
  if (isAuthenticated() && !localStorage.getItem(ACTIVITY_KEY)) {
    touchActivity();
  }

  // Event-event yang dianggap "aktif"
  const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
  const onActivity = () => {
    if (isAuthenticated()) touchActivity();
  };
  EVENTS.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }));

  // Cek periodik setiap 60 detik
  _idleTimer = setInterval(() => {
    if (isIdleExpired()) {
      logout();
    }
  }, 60_000);

  // Cek segera saat user kembali ke tab (setelah lama pergi)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isIdleExpired()) {
      logout();
    }
  });
};

// ─── FETCH INTERCEPTOR ─────────────────────────────────────────
let _originalFetch = null;

/**
 * setupAuthFetchInterceptor
 * Auto-attach Authorization token ke setiap request fetch.
 */
export const setupAuthFetchInterceptor = () => {
  if (_originalFetch) return true;

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
