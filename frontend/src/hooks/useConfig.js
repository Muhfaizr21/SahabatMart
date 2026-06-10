import { useState, useEffect } from 'react';
import { PUBLIC_API_BASE, fetchJson } from '../lib/api';

let cachedConfig = null;

export function useConfig() {
  const [config, setConfig] = useState(cachedConfig || {});
  const [loading, setLoading] = useState(!cachedConfig);

  useEffect(() => {
    if (cachedConfig) {
      setLoading(false);
      return;
    }

    fetchJson(`${PUBLIC_API_BASE}/config`)
      .then(res => {
        const data = res || {};
        cachedConfig = data;
        setConfig(data);
      })
      .catch(err => {
        console.error('Failed to fetch platform config:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return { config, loading };
}
