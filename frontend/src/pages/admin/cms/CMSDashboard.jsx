import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchJson, ADMIN_API_BASE } from '../../../lib/api';
import toast from 'react-hot-toast';

const PLATFORMS = [
  { key: 'landing_page', label: 'Landing Page', icon: 'web', desc: 'Halaman utama publik', color: 'bg-indigo-500' },
  { key: 'affiliate_dashboard', label: 'Affiliate Dashboard', icon: 'groups', desc: 'Dashboard mitra affiliate', color: 'bg-purple-500' },
  { key: 'merchant_dashboard', label: 'Merchant Dashboard', icon: 'store', desc: 'Dashboard distributor', color: 'bg-emerald-500' },
];

export default function CMSDashboard() {
  const [platforms, setPlatforms] = useState(PLATFORMS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson(`${ADMIN_API_BASE}/cms/platforms`)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const items = [
    { icon: 'palette', label: 'Theme', desc: 'Warna, font, logo & layout', path: 'theme' },
    { icon: 'layers', label: 'Sections', desc: 'Blok konten halaman', path: 'sections' },
    { icon: 'menu', label: 'Menus', desc: 'Navigasi & menu', path: 'menus' },
    { icon: 'article', label: 'Konten Halaman', desc: 'Edit teks semua halaman', path: 'content' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900">Visual CMS</h1>
          <p className="text-sm text-slate-500 mt-1">Atur tampilan seluruh platform AkuGlow secara visual</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {platforms.map(p => (
            <div key={p.key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className={`${p.color} h-2`} />
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 ${p.color} rounded-xl flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-white text-lg">{p.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{p.label}</h3>
                    <p className="text-[11px] text-slate-400">{p.desc}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Link to={`/admin/cms/${p.key}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors group">
                    <span className="material-symbols-outlined text-indigo-600 text-base">edit</span>
                    <div>
                      <p className="text-xs font-bold text-indigo-700">Buka Editor</p>
                      <p className="text-[10px] text-indigo-400">Theme, Sections, Menu, Konten</p>
                    </div>
                  </Link>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <Link to={`/api/public/cms/preview-page?platform=${p.key}`} target="_blank"
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-indigo-600 transition-colors">
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    Buka Preview
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-indigo-600">info</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-2">Cara Menggunakan CMS</h3>
              <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
                <li>Pilih platform yang ingin diedit dari kartu di atas</li>
                <li>Atur <strong>Theme</strong> — pilih warna, font, dan logo yang sesuai brand</li>
                <li>Atur <strong>Sections</strong> — tambah blok konten dari template siap pakai</li>
                <li>Atur <strong>Menus</strong> — buat navigasi header/footer/sidebar</li>
                <li>Klik <strong>Preview</strong> untuk lihat hasil perubahan secara langsung</li>
                <li>Klik <strong>Publish</strong> untuk terapkan ke platform publik</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
