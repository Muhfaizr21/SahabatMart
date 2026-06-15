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

  // Localhost Optimization: If page is loaded on localhost and API base is an ngrok URL,
  // override to http://localhost:8080 for speed (no ngrok latency).
  if (typeof window !== 'undefined' && window.location) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal && (!base || base.includes('ngrok-free.dev'))) {
      base = 'http://localhost:8080';
    }
  }

  // Fallback: same-origin (FE & BE behind same domain/port)
  if (base) return base;
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return 'http://localhost:8080';
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
  return 'http://localhost:5173';
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
      // BUG-03 fix: auto-logout saat token tidak valid / expired
      localStorage.removeItem('token');
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

export async function uploadFile(url, file, fieldName = 'image') {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append(fieldName, file);

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Gagal mengunggah file');
  }

  const data = await response.json();
  return data;
}

// Fungsi yang hilang dan menyebabkan error
export function formatImage(path) {
  let finalPath = path;
  if (!finalPath) {
    finalPath = "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=800&q=80";
  }

  // Handle Unsplash shorthand first to allow proxying it
  let cleanPath = finalPath.replace(/^https?:\/\/[^\/]+/, ''); // Remove protocol and domain
  cleanPath = cleanPath.replace(/^\/+/, ''); // Remove leading slashes
  if (cleanPath.startsWith('photo-')) {
    finalPath = `https://images.unsplash.com/${cleanPath}?auto=format&fit=crop&q=80&w=800`;
  }
  
  // If it is an Unsplash URL, proxy it to bypass Indonesia DNS blocking (Internet Positif)
  if (finalPath.includes('images.unsplash.com')) {
    return `https://images.weserv.nl/?url=${encodeURIComponent(finalPath)}`;
  }
  
  // 1. If it's already a full URL (external, blob, or data), return as is
  if (finalPath.startsWith('blob:') || finalPath.startsWith('data:')) return finalPath;
  if (finalPath.startsWith('http') && !finalPath.includes('localhost') && !finalPath.includes('127.0.0.1')) return finalPath;

  // 2. Prepend API_BASE for local uploaded files
  const base = API_BASE.replace(/\/+$/, '');
  return `${base}/${cleanPath}`;
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
 * Memungkinkan Dashboard mendengarkan notifikasi secara instan
 */
export function subscribeToNotifications(userId, onMessage) {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  const eventSource = new EventSource(`${API_BASE}/api/notifications/stream?t=${token}`);
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (_err) {
      // silent — SSE parse error tidak perlu log ke console
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
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

