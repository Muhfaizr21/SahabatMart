/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         AKUGLOW RUNTIME CONFIGURATION FILE                   ║
 * ║                                                              ║
 * ║  File ini dibaca saat aplikasi pertama kali dibuka           ║
 * ║  di browser. Edit file ini di SERVER untuk mengganti         ║
 * ║  URL API tanpa perlu rebuild frontend!                       ║
 * ║                                                              ║
 * ║  DEV LOCAL  : http://localhost:8080                          ║
 * ║  PRODUCTION : https://api.yourdomain.com                     ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * CARA PAKAI DI SERVER:
 * 1. Buka file ini di server: nano /var/www/akuglow/config.js
 * 2. Ganti API_BASE & SITE_URL sesuai domain production kamu
 * 3. Simpan — perubahan langsung aktif tanpa rebuild!
 */
window.APP_CONFIG = {
  API_BASE: 'http://localhost:8080',
  SITE_URL: 'http://localhost:5173',
};

