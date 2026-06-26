/**
 * ThemeEngine.js
 * 
 * Bertanggung jawab untuk mengambil konfigurasi tema dari backend 
 * dan menyuntikkan CSS Variables ke elemen :root.
 */

import { PUBLIC_API_BASE, fetchJson } from './api';

// Default themes jika API gagal atau belum ada config
const DEFAULT_THEME = {
  'theme_primary': '#E11D48',
  'theme_primary_dark': '#BE123C',
  'theme_primary_light': '#FB7185',
  'theme_secondary': '#06d6a0',
  'theme_accent': '#EAB308',
  'theme_radius': '1rem',
  'theme_font_heading': "'Plus Jakarta Sans', sans-serif",
  'theme_font_body': "'Inter', sans-serif",
  'platform_logo': '/akuglow.webp',
};

/**
 * Mengambil config publik dan memfilter yang berhubungan dengan tema
 */
export async function loadTheme() {
  try {
    const config = await fetchJson(`${PUBLIC_API_BASE}/config`);
    
    // Filter kunci yang diawali 'theme_'
    const themeConfig = {};
    Object.keys(config).forEach(key => {
      if (key.startsWith('theme_') || key === 'platform_logo' || key === 'auth_side_image') {
        themeConfig[key] = config[key];
      }
    });

    const finalTheme = { ...DEFAULT_THEME, ...themeConfig };
    applyTheme(finalTheme);
    return finalTheme;
  } catch (error) {
    console.error('Failed to load theme from API, using defaults:', error);
    applyTheme(DEFAULT_THEME);
    return DEFAULT_THEME;
  }
}

/**
 * Menyuntikkan variabel ke CSS :root
 */
export function applyTheme(theme) {
  const root = document.documentElement;
  
  // Map internal keys to CSS Variable names
  const mapping = {
    'theme_primary': '--color-primary',
    'theme_primary_dark': '--color-primary-dark',
    'theme_primary_light': '--color-primary-light',
    'theme_secondary': '--color-secondary',
    'theme_accent': '--color-accent',
    'theme_radius': '--radius-xl',
    'theme_font_heading': '--font-heading',
    'theme_font_body': '--font-body',
  };

  Object.entries(theme).forEach(([key, value]) => {
    const cssVar = mapping[key];
    if (cssVar) {
      root.style.setProperty(cssVar, value);
      
      // Khusus primary, kita update juga bootstrap legacy variables jika perlu
      if (key === 'theme_primary') {
        root.style.setProperty('--bs-primary', value);
      }
    }
  });

  // Inject font families if defined
  if (theme.theme_font_heading) {
    root.style.setProperty('font-family', theme.theme_font_body, 'body'); // Update body font
  }
}
