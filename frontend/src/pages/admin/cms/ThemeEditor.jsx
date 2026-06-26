import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchJson, putJson, ADMIN_API_BASE } from '../../../lib/api';
import toast from 'react-hot-toast';

const FONT_OPTIONS = [
  'Inter, system-ui, sans-serif',
  'Poppins, system-ui, sans-serif',
  'Roboto, system-ui, sans-serif',
  'Montserrat, system-ui, sans-serif',
  'Plus Jakarta Sans, system-ui, sans-serif',
  'DM Sans, system-ui, sans-serif',
  'Outfit, system-ui, sans-serif',
  'Public Sans, system-ui, sans-serif',
];

const COLOR_PRESETS = [
  { name: 'AkuGlow', colors: { primary: '#4f46e5', secondary: '#7c3aed', accent: '#f59e0b', background: '#ffffff', text: '#1e1b4b', muted: '#64748b', border: '#e2e8f0', card: '#f8fafc', success: '#10b981', warning: '#f59e0b', error: '#ef4444' } },
  { name: 'Dark', colors: { primary: '#818cf8', secondary: '#a78bfa', accent: '#fbbf24', background: '#0f172a', text: '#f1f5f9', muted: '#94a3b8', border: '#334155', card: '#1e293b', success: '#34d399', warning: '#fbbf24', error: '#f87171' } },
  { name: 'Nature', colors: { primary: '#059669', secondary: '#0d9488', accent: '#eab308', background: '#ffffff', text: '#064e3b', muted: '#6b7280', border: '#d1fae5', card: '#ecfdf5', success: '#10b981', warning: '#f59e0b', error: '#ef4444' } },
  { name: 'Rose', colors: { primary: '#e11d48', secondary: '#be185d', accent: '#fbbf24', background: '#fffdfa', text: '#881337', muted: '#9f6b7a', border: '#fce7f3', card: '#fff1f2', success: '#10b981', warning: '#f59e0b', error: '#ef4444' } },
  { name: 'Ocean', colors: { primary: '#0ea5e9', secondary: '#06b6d4', accent: '#f97316', background: '#ffffff', text: '#0c4a6e', muted: '#6b7280', border: '#e0f2fe', card: '#f0f9ff', success: '#10b981', warning: '#f59e0b', error: '#ef4444' } },
];

const SPACING_PRESETS = [
  { label: 'Compact', value: { section_padding: '2rem', container_width: '960px', border_radius: '0.5rem', gap: '1rem' } },
  { label: 'Default', value: { section_padding: '4rem', container_width: '1200px', border_radius: '0.75rem', gap: '1.5rem' } },
  { label: 'Spacious', value: { section_padding: '6rem', container_width: '1320px', border_radius: '1rem', gap: '2rem' } },
];

export default function ThemeEditor() {
  const { platform } = useParams();
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('colors');
  const [previewKey, setPreviewKey] = useState(0);
  const previewUrl = `/api/public/cms/preview-page?platform=${platform}`;
  const actualDashboardUrl = platform === 'affiliate_dashboard' ? '/affiliate'
    : platform === 'merchant_dashboard' ? '/merchant' : null;

  const loadTheme = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson(`${ADMIN_API_BASE}/cms/theme?platform=${platform}`);
      setTheme(data);
    } catch (e) {
      toast.error(e.message || 'Gagal memuat tema');
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => { loadTheme() }, [loadTheme]);

  const update = (section, field, value) => {
    setTheme(prev => {
      const next = { ...prev, [section]: { ...prev[section], [field]: value } };
      // Auto-save after 800ms debounce
      clearTimeout(window._cms_save_timer);
      window._cms_save_timer = setTimeout(() => doSave(next), 800);
      return next;
    });
  };

  const doSave = async (data) => {
    setSaving(true);
    try {
      const res = await putJson(`${ADMIN_API_BASE}/cms/theme/update?platform=${platform}`, data || theme);
      setTheme(res);
      setPreviewKey(k => k + 1);
    } catch (e) {
      toast.error(e.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset) => {
    setTheme(prev => ({ ...prev, colors: { ...prev.colors, ...preset.colors } }));
    toast.success(`Warna "${preset.name}" diterapkan`);
  };

  const applySpacing = (preset) => {
    setTheme(prev => ({ ...prev, spacing: { ...prev.spacing, ...preset.value } }));
    toast.success(`Spacing "${preset.label}" diterapkan`);
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await fetchJson(`${ADMIN_API_BASE}/cms/theme/publish?platform=${platform}`, { method: 'POST' });
      toast.success('Tema dipublikasikan!');
      loadTheme();
    } catch (e) {
      toast.error(e.message || 'Gagal publish');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Memuat tema...</p>
        </div>
      </div>
    );
  }
  if (!theme) {
    return <div className="p-8 text-center text-red-500">Gagal memuat tema. Coba refresh.</div>;
  }

  const tabs = [
    { key: 'colors', label: 'Warna', icon: 'palette' },
    { key: 'typography', label: 'Tulisan', icon: 'text_fields' },
    { key: 'spacing', label: 'Spacing', icon: 'space_dashboard' },
    { key: 'logo', label: 'Logo', icon: 'image' },
    { key: 'css', label: 'CSS', icon: 'code' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin/cms" className="text-slate-400 hover:text-slate-600 transition-colors">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-sm font-bold text-slate-900">Theme Editor</h1>
              <p className="text-[10px] text-slate-400 capitalize">{platform.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => {
                if (actualDashboardUrl) {
                  window.open(actualDashboardUrl, '_blank');
                } else {
                  setShowPreview(!showPreview);
                }
              }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${showPreview || actualDashboardUrl ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <span className="material-symbols-outlined text-sm">visibility</span>
              {actualDashboardUrl ? 'Buka Dashboard' : 'Preview'}
            </button>
            <button onClick={handlePublish} disabled={publishing}
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">publish</span>
              {publishing ? '...' : 'Publish'}
            </button>
            <button onClick={() => doSave()} disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
        {/* Tab bar */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === tab.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {showPreview && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-lg bg-white">
            <div className="bg-slate-900 text-white text-[10px] px-4 py-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-xs">smartphone</span>
              Live Preview — <span className="capitalize">{platform.replace(/_/g, ' ')}</span>
              <span className="ml-auto text-slate-400">Perubahan langsung terlihat</span>
            </div>
            <iframe key={previewKey} src={previewUrl} title="Preview" className="w-full h-[500px]" />
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* === COLORS TAB === */}
        {activeTab === 'colors' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Template Warna</h3>
              <p className="text-[11px] text-slate-400 mb-4">Pilih template warna siap pakai</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map(p => (
                  <button key={p.name} onClick={() => applyPreset(p)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                    <div className="flex -space-x-1">
                      {['primary', 'secondary', 'accent'].map(k => (
                        <div key={k} className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ background: p.colors[k] }} />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Warna Kustom</h3>
              <div className="space-y-4">
                {[
                  { label: 'Brand Utama', keys: ['primary', 'secondary', 'accent'] },
                  { label: 'Latar & Teks', keys: ['background', 'text', 'muted'] },
                  { label: 'Elemen UI', keys: ['border', 'card'] },
                  { label: 'Status', keys: ['success', 'warning', 'error'] },
                ].map(group => (
                  <div key={group.label}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{group.label}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {group.keys.map(key => (
                        <div key={key} className="flex items-center gap-2">
                          <input type="color" value={theme.colors?.[key] || '#000000'}
                            onChange={(e) => update('colors', key, e.target.value)}
                            className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold text-slate-500 truncate">{key}</p>
                            <p className="text-[11px] font-mono text-slate-700">{theme.colors?.[key] || ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === TYPOGRAPHY TAB === */}
        {activeTab === 'typography' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Font & Ukuran</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Font Utama</label>
                  <select value={theme.typography?.font_family || ''}
                    onChange={(e) => update('typography', 'font_family', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                    {FONT_OPTIONS.map(f => <option key={f} value={f} style={{ fontFamily: f.split(',')[0] }}>{f.split(',')[0]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Font Judul</label>
                  <select value={theme.typography?.heading_font || ''}
                    onChange={(e) => update('typography', 'heading_font', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                    {FONT_OPTIONS.map(f => <option key={f} value={f} style={{ fontFamily: f.split(',')[0] }}>{f.split(',')[0]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Ukuran Dasar</label>
                  <select value={theme.typography?.base_size || '16px'}
                    onChange={(e) => update('typography', 'base_size', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                    {['14px', '15px', '16px', '17px', '18px'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Ukuran Heading</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {theme.typography?.heading_sizes && Object.entries(theme.typography.heading_sizes).map(([tag, size]) => (
                    <div key={tag} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 w-6">{tag}</span>
                      <select value={size}
                        onChange={(e) => setTheme(prev => ({ ...prev, typography: { ...prev.typography, heading_sizes: { ...prev.typography.heading_sizes, [tag]: e.target.value } } }))}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-400">
                        {['0.75rem','0.875rem','1rem','1.125rem','1.25rem','1.5rem','1.75rem','2rem','2.25rem','2.5rem','3rem','3.5rem'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === SPACING TAB === */}
        {activeTab === 'spacing' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Template Layout</h3>
              <p className="text-[11px] text-slate-400 mb-4">Pilih kerapatan layout</p>
              <div className="flex gap-2">
                {SPACING_PRESETS.map(p => (
                  <button key={p.label} onClick={() => applySpacing(p)}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all text-center">
                    <p className="text-xs font-bold text-slate-700">{p.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{p.value.section_padding} / {p.value.container_width}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Spacing Kustom</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(theme.spacing || {}).map(([key, val]) => (
                  <div key={key}>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{key.replace(/_/g, ' ')}</label>
                    <select value={val} onChange={(e) => update('spacing', key, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400">
                      {['0.25rem','0.5rem','0.75rem','1rem','1.5rem','2rem','3rem','4rem','5rem','6rem','8rem'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === LOGO TAB === */}
        {activeTab === 'logo' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Logo</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">URL Logo</label>
                  <input value={theme.logo?.url || ''} onChange={(e) => update('logo', 'url', e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                </div>
                {theme.logo?.url && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 mb-2">Preview:</p>
                    <img src={theme.logo.url} alt={theme.logo.alt || 'Logo'} className="max-h-12 object-contain" onError={(e) => { e.target.style.display = 'none' }} />
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Lebar</label>
                    <input value={theme.logo?.width || ''} onChange={(e) => update('logo', 'width', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Tinggi</label>
                    <input value={theme.logo?.height || ''} onChange={(e) => update('logo', 'height', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Alt Text</label>
                    <input value={theme.logo?.alt || ''} onChange={(e) => update('logo', 'alt', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === CSS TAB === */}
        {activeTab === 'css' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Custom CSS</h3>
              <p className="text-[11px] text-slate-400 mb-4">Tambahkan CSS kustom untuk kustomisasi lanjutan</p>
              <textarea value={theme.custom_css || ''} onChange={(e) => setTheme(prev => ({ ...prev, custom_css: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 h-60 resize-y"
                placeholder={`.custom-class {\n  color: var(--cms-primary);\n}`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
