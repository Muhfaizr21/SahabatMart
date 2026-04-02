const RAW_API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

export const API_BASE = RAW_API_BASE.replace(/\/+$/, '');
export const AUTH_API_BASE = `${API_BASE}/api/auth`;
export const PUBLIC_API_BASE = `${API_BASE}/api/public`;
export const ADMIN_API_BASE = `${API_BASE}/api/admin`;

export async function fetchJson(url, options) {
  const response = await fetch(url, options);

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || `Request failed with status ${response.status}`);
  }

  if (data?.status === 'error') {
    throw new Error(data.message || 'Request failed');
  }

  return data ?? {};
}
