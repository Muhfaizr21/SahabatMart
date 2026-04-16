const RAW_API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

export const API_BASE = RAW_API_BASE.replace(/\/+$/, '');
export const AUTH_API_BASE = `${API_BASE}/api/auth`;
export const PUBLIC_API_BASE = `${API_BASE}/api/public`;
export const ADMIN_API_BASE = `${API_BASE}/api/admin`;
export const BUYER_API_BASE = `${API_BASE}/api/buyer`;
export const MERCHANT_API_BASE = `${API_BASE}/api/merchant`;

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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    if (!response.ok) {
      let message = `Error ${response.status}`;
      try {
        const data = await response.json();
        message = data?.message || message;
      } catch (e) {
        // If not JSON, ignore body
      }
      throw new Error(message);
    }
    
    return await response.json();
  } catch (err) {
    throw err;
  }
}

// Fungsi yang hilang dan menyebabkan error
export function formatImage(path) {
  if (!path || path === "") return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
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

    try {
      // Panggil backend "Monster" kita untuk Tracking Click
      const res = await fetchJson(`${API_BASE}/api/public/affiliate/track?ref=${ref}&sub1=${sub1}&sub2=${sub2}&sub3=${sub3}&product_id=${productId}`);
      
      // Simpan di localStorage agar tetap ADA saat checkout
      if (res.affiliate_id) {
        localStorage.setItem('affiliate_id', res.affiliate_id);
        console.log('✅ Affiliate Tracked:', res.affiliate_id);
      }
    } catch (err) {
      console.warn('⚠️ Affiliate tracking failed:', err);
    }
  }
}

/**
 * SSE Real-time Hub
 * Memungkinkan Dashboard mendengarkan notifikasi secara instan
 */
export function subscribeToNotifications(userId, onMessage) {
  if (!userId) return null;
  
  const eventSource = new EventSource(`${API_BASE}/api/notifications/stream?user_id=${userId}`);
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (err) {
      console.error('SSE Error:', err);
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
  };

  return eventSource;
}
