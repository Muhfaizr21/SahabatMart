/**
 * Priority chain for API base URL:
 * 1. window.APP_CONFIG.API_BASE  ← dari /public/config.js (bisa diedit di server tanpa rebuild!)
 * 2. import.meta.env.VITE_API_BASE ← dari .env / .env.production (baked saat build)
 * 3. window.location.origin       ← fallback: same-origin (cocok utk production deployment barengan)
 *
 * Untuk ganti URL di server: edit file /config.js di folder dist, TIDAK perlu rebuild!
 */
function resolveApiBase() {
  let base = '';

  // Runtime config — highest priority (editable on server without rebuild)
  if (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.API_BASE) {
    base = window.APP_CONFIG.API_BASE.replace(/\/+$/, '');
  } else if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) {
    base = import.meta.env.VITE_API_BASE.replace(/\/+$/, '');
  }



  // Fallback: same-origin (FE & BE behind same domain/port)
  if (base) return base;
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return '';
}

// [BUG-M9 Fix] Lazy resolve — panggil resolveApiBase() setiap kali export diakses,
// bukan saat module load. Ini memastikan window.APP_CONFIG sudah ter-set.
export function getApiBase() {
  return resolveApiBase();
}

export function getSiteUrl() {
  if (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.SITE_URL) {
    return window.APP_CONFIG.SITE_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return '';
}
const RAW_API_BASE = resolveApiBase();
export const API_BASE = RAW_API_BASE;
export const AUTH_API_BASE = `${API_BASE}/api/auth`;
export const PUBLIC_API_BASE = `${API_BASE}/api/public`;
export const ADMIN_API_BASE = `${API_BASE}/api/admin`;
export const BUYER_API_BASE = `${API_BASE}/api/buyer`;
export const MERCHANT_API_BASE = `${API_BASE}/api/merchant`;
export const AFFILIATE_API_BASE = `${API_BASE}/api/affiliate`;


export async function fetchJson(url, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  try {
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      // [FIX #17] Attempt token refresh before logging out
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            localStorage.setItem('token', refreshData.token);
            localStorage.setItem('refresh_token', refreshData.refresh_token);
            // Retry original request with new token
            headers['Authorization'] = `Bearer ${refreshData.token}`;
            const retryRes = await fetch(url, { ...options, headers });
            if (retryRes.ok) {
              const text = await retryRes.text();
              return text ? JSON.parse(text) : null;
            }
          }
        } catch (_) {
          // Refresh failed — fall through to logout
        }
      }
      // BUG-03 fix: auto-logout saat token tidak valid / expired
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login';
      }
    }

    if (!response.ok) {
      let message = `Error ${response.status}`;
      try {
        const data = await response.json();
        message = data?.message || message;
      } catch (_e) {
        // If not JSON, ignore body
      }
      throw new Error(message);
    }
    
    const text = await response.text();
    if (!text) return null;

    let result;
    try {
      result = JSON.parse(text);
    } catch (_e) {
      throw new Error("Format respons server tidak valid");
    }
    
    // Pelindung Rekursif: Mengupas lapisan 'success' hanya jika itu double-wrapping murni
    // [BUG-H5 Fix] Tambah safety counter (maxDepth) untuk cegah infinite loop
    let maxDepth = 3;
    while (result && result.status === 'success' && result.data !== undefined && result.total === undefined && result.page === undefined && maxDepth > 0) {
      result = result.data;
      maxDepth--;
    }
    
    return result;
  } catch (_err) {
    throw _err;
  }
}

export async function postJson(url, data, options = {}) {
  return fetchJson(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function putJson(url, data, options = {}) {
  return fetchJson(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteJson(url, options = {}) {
  return fetchJson(url, {
    ...options,
    method: 'DELETE',
  });
}

export async function deleteConfig(key) {
  return await fetchJson(`${API_BASE}/api/admin/configs/${key}`, { method: 'DELETE' });
}

export async function testEmailSettings(toEmail) {
  return await fetchJson(`${API_BASE}/api/admin/configs/test-email`, {
    method: 'POST',
    body: JSON.stringify({ to: toEmail }),
  });
}

export async function uploadFile(url, file, fieldName = 'image') {
  const formData = new FormData();
  formData.append(fieldName, file);
  return fetchJson(url, {
    method: 'POST',
    body: formData,
  });
}

export function formatImage(path) {
  if (!path) return null;

  if (path.startsWith('blob:') || path.startsWith('data:')) return path;
  if (path.startsWith('http') && !path.includes('localhost') && !path.includes('127.0.0.1')) return path;

  let clean = path.replace(/^https?:\/\/[^\/]+/, '');
  clean = clean.replace(/^\/+/, '');

  const base = API_BASE.replace(/\/+$/, '');
  return `${base}/${clean}`;
}

/**
 * Capture Affiliate Link
 * Mendeteksi parameter ?ref=...&sub1=... di URL dan melacaknya ke backend
 */
export async function captureAffiliate() {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref');
  
  if (ref) {
    const sub1 = urlParams.get('sub1') || '';
    const sub2 = urlParams.get('sub2') || '';
    const sub3 = urlParams.get('sub3') || '';
    const productId = urlParams.get('product_id') || '';
    const lc = urlParams.get('lc') || '';

    try {
      // Panggil backend "Monster" kita untuk Tracking Click
      const res = await fetchJson(`${API_BASE}/api/public/affiliate/track?ref=${ref}&sub1=${sub1}&sub2=${sub2}&sub3=${sub3}&product_id=${productId}&lc=${lc}`);
      
      // Simpan di localStorage agar tetap ADA saat checkout
      if (res.affiliate_id) {
        localStorage.setItem('affiliate_id', res.affiliate_id);
      }
    } catch (_err) {
      // Silent — affiliate tracking failure tidak boleh mengganggu UX
    }
  }
}

/**
 * SSE Real-time Hub
 * [FIX #18] Use auth cookie instead of query param for better security.
 * Auto-reconnect on error with exponential backoff.
 */
export function subscribeToNotifications(userId, onMessage) {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  // [FIX #18] Pass token via cookie for SSE auth instead of query param
  document.cookie = `sse_token=${token}; path=/; SameSite=Lax`;
  const eventSource = new EventSource(`${API_BASE}/api/notifications/stream`);
  
  let reconnectAttempts = 0;
  const maxReconnect = 10;

  eventSource.onmessage = (event) => {
    reconnectAttempts = 0; // reset on successful message
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (_err) {
      // silent
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    // [FIX #18] Auto-reconnect with exponential backoff
    if (reconnectAttempts < maxReconnect && localStorage.getItem('token')) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts++;
      setTimeout(() => {
        document.cookie = `sse_token=${localStorage.getItem('token')}; path=/; SameSite=Lax`;
        Object.assign(eventSource, new EventSource(`${API_BASE}/api/notifications/stream`));
      }, delay);
    }
  };

  return eventSource;
}

export function formatPaymentMethod(method) {
  if (!method) return '-';
  const mapping = {
    'virtual_account': 'Virtual Account',
    'bank_transfer': 'Transfer Bank',
    'credit_card': 'Kartu Kredit',
    'cod': 'COD (Bayar di Tempat)',
    'e_wallet': 'E-Wallet',
    'qris': 'QRIS',
    'gopay': 'GoPay',
    'ovo': 'OVO',
    'dana': 'DANA'
  };
  const normalized = method.toLowerCase();
  if (mapping[normalized]) {
    return mapping[normalized];
  }
  return method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

