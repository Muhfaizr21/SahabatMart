// [DEPLOY RULE #1]: Set VITE_API_BASE di .env.production → JANGAN biarkan localhost di server!
// Dev local: VITE_API_BASE=http://localhost:8080
// Production: VITE_API_BASE=https://api.yourdomain.com
const RAW_API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';
export const API_BASE = (RAW_API_BASE && RAW_API_BASE !== '/') ? RAW_API_BASE.replace(/\/+$/, '') : 'http://localhost:8080';
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
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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
      console.error("Server returned non-JSON response:", text);
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
  const fallback = "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=800&q=80";
  if (!path) return fallback;
  
  // 1. If it's already a full URL (external, blob, or data), return as is
  if (path.startsWith('blob:') || path.startsWith('data:')) return path;
  if (path.startsWith('http') && !path.includes('localhost') && !path.includes('127.0.0.1')) return path;

  // 2. Clean the path: remove domain if it accidentally exists, and leading slashes
  let cleanPath = path.replace(/^https?:\/\/[^\/]+/, ''); // Remove protocol and domain
  cleanPath = cleanPath.replace(/^\/+/, ''); // Remove leading slashes
  
  // 3. Handle Unsplash shorthand
  if (cleanPath.startsWith('photo-')) {
    return `https://images.unsplash.com/${cleanPath}?auto=format&fit=crop&q=80&w=800`;
  }

  // 4. Prepend API_BASE
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
        console.log('✅ Affiliate Tracked:', res.affiliate_id);
      }
    } catch (_err) {
      console.warn('⚠️ Affiliate tracking failed:', _err);
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
      console.error('SSE Error:', _err);
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
  };

  return eventSource;
}
