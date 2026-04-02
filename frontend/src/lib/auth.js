const ADMIN_ROLES = new Set(['admin', 'superadmin']);

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken() {
  return localStorage.getItem('token');
}

export function isAdminUser(user = getStoredUser()) {
  return ADMIN_ROLES.has(user?.role);
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function setupAuthFetchInterceptor() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const requestUrl = typeof input === 'string' ? input : input?.url || '';
    const isAdminApi = requestUrl.includes('/api/admin');
    const token = getToken();

    let nextInit = init;
    if (isAdminApi && token) {
      const headers = new Headers(init.headers || {});
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      nextInit = { ...init, headers };
    }

    const response = await originalFetch(input, nextInit);

    if (isAdminApi && (response.status === 401 || response.status === 403)) {
      clearAuth();
      if (window.location.pathname.startsWith('/admin')) {
        window.location.replace('/login');
      }
    }

    return response;
  };
}
