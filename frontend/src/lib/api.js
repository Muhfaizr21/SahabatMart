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

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || `Error ${response.status}`);
    }
    
    // Auto-unwrap standardised response
    if (data && data.status === 'success' && data.data !== undefined) {
      return data.data;
    }
    
    return data;
  } catch (err) {
    throw err;
  }
}

// Fungsi yang hilang dan menyebabkan error
export function formatImage(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}
