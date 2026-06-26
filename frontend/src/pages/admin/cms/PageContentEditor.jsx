import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchJson, putJson, ADMIN_API_BASE } from '../../../lib/api';
import toast from 'react-hot-toast';

const PAGES = [
  { key: 'home', label: 'Beranda', icon: 'home' },
  { key: 'about', label: 'Tentang', icon: 'info' },
  { key: 'shop', label: 'Belanja', icon: 'shopping_bag' },
  { key: 'business', label: 'Peluang Bisnis', icon: 'trending_up' },
  { key: 'blog', label: 'Blog', icon: 'article' },
  { key: 'contact', label: 'Kontak', icon: 'mail' },
];

export default function PageContentEditor() {
  const { platform } = useParams();
  const [page, setPage] = useState('home');
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson(`${ADMIN_API_BASE}/cms/page-content?platform=${platform}&page=${page}`);
      setContent(data?.content || {});
    } catch (e) {
      toast.error(e.message || 'Gagal memuat konten');
    } finally {
      setLoading(false);
    }
  }, [platform, page]);

  useEffect(() => { load() }, [load]);

  const update = (path, value) => {
    setContent(prev => {
      const keys = path.split('.');
      const newObj = { ...prev };
      let current = newObj;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
          current[keys[i]] = {};
        }
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newObj;
    });
    // Auto-save debounce
    clearTimeout(window._cms_pc_timer);
    window._cms_pc_timer = setTimeout(() => doSave({ ...content, [keys ? keys.join('.') : path]: value }), 1200);
  };

  const doSave = async (data) => {
    setSaving(true);
    try {
      await putJson(`${ADMIN_API_BASE}/cms/page-content/update?platform=${platform}&page=${page}`, { content: data || content });
    } catch (e) {
      toast.error(e.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const renderFields = (obj, path = '') => {
    if (!obj || typeof obj !== 'object') return null;
    return Object.entries(obj).map(([key, val]) => {
      const fullPath = path ? `${path}.${key}` : key;
      if (Array.isArray(val)) {
        return (
          <div key={fullPath} className="mb-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">{key}</label>
            <div className="space-y-2">
              {val.map((item, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                  {renderFields(item, `${fullPath}.${idx}`)}
                </div>
              ))}
            </div>
          </div>
        );
      }
      if (typeof val === 'object' && val !== null) {
        return (
          <div key={fullPath} className="mb-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">{key}</label>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-3">
              {renderFields(val, fullPath)}
            </div>
          </div>
        );
      }
      return (
        <div key={fullPath} className="mb-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{key.replace(/_/g, ' ')}</label>
          {val && val.length > 60 ? (
            <textarea value={val || ''} onChange={(e) => { const newObj = { ...content }; setDeep(newObj, fullPath, e.target.value); setContent(newObj); clearTimeout(window._cms_pc_timer); window._cms_pc_timer = setTimeout(() => doSave(newObj), 1200); }}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 h-20 resize-y" />
          ) : (
            <input value={val || ''} onChange={(e) => { const newObj = { ...content }; setDeep(newObj, fullPath, e.target.value); setContent(newObj); clearTimeout(window._cms_pc_timer); window._cms_pc_timer = setTimeout(() => doSave(newObj), 1200); }}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          )}
        </div>
      );
    });
  };

  const setDeep = (obj, path, value) => {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]] || typeof current[keys[i]] !== 'object') current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin/cms" className="text-slate-400 hover:text-slate-600 transition-colors">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-sm font-bold text-slate-900">Konten Halaman</h1>
              <p className="text-[10px] text-slate-400 capitalize">{platform.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold ${saving ? 'text-indigo-600' : 'text-slate-400'}`}>
              {saving ? 'Menyimpan...' : 'Auto-save aktif'}
            </span>
            <button onClick={() => doSave()}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all">
              Simpan
            </button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {PAGES.map(p => (
            <button key={p.key} onClick={() => setPage(p.key)}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 capitalize ${page === p.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <span className="material-symbols-outlined text-sm">{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {content && Object.keys(content).length > 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-[10px] text-slate-400 mb-4">Klik field untuk mengedit teks. Perubahan otomatis tersimpan.</div>
            {renderFields(content)}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">article</span>
            <p className="text-sm text-slate-500">Belum ada konten untuk halaman ini</p>
          </div>
        )}
      </div>
    </div>
  );
}
