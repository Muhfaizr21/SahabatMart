import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchJson, postJson, putJson, ADMIN_API_BASE } from '../../../lib/api';
import toast from 'react-hot-toast';

const SECTION_TEMPLATES = {
  hero: {
    key: 'hero',
    title: 'Hero Section',
    variant: 'default',
    content: { headline: 'Judul Utama Di Sini', subheadline: 'Deskripsi singkat yang menarik perhatian', cta_text: 'Mulai Sekarang', cta_url: '#', image_url: '' },
  },
  features: {
    key: 'features',
    title: 'Fitur Unggulan',
    variant: 'default',
    content: { items: [{ icon: 'star', title: 'Fitur 1', desc: 'Deskripsi fitur' }, { icon: 'favorite', title: 'Fitur 2', desc: 'Deskripsi fitur' }, { icon: 'verified', title: 'Fitur 3', desc: 'Deskripsi fitur' }] },
  },
  testimonials: {
    key: 'testimonials',
    title: 'Testimoni',
    variant: 'default',
    content: { items: [{ name: 'Nama', role: 'Customer', text: 'Testimoni pelanggan...', avatar: '' }] },
  },
  stats: {
    key: 'stats',
    title: 'Statistik',
    variant: 'default',
    content: { items: [{ value: '100+', label: 'Pengguna' }, { value: '50+', label: 'Produk' }, { value: '99%', label: 'Kepuasan' }] },
  },
  pricing: {
    key: 'pricing',
    title: 'Harga',
    variant: 'default',
    content: { plans: [{ name: 'Basic', price: '99rb', features: ['Fitur 1', 'Fitur 2'] }, { name: 'Pro', price: '199rb', features: ['Fitur 1', 'Fitur 2', 'Fitur 3'] }] },
  },
  faq: {
    key: 'faq',
    title: 'FAQ',
    variant: 'default',
    content: { items: [{ question: 'Pertanyaan?', answer: 'Jawaban...' }] },
  },
  cta: {
    key: 'cta',
    title: 'Call to Action',
    variant: 'accent',
    content: { headline: 'Siap Memulai?', subheadline: 'Gabung sekarang juga', button_text: 'Daftar', button_url: '/register' },
  },
  footer: {
    key: 'footer',
    title: 'Footer',
    variant: 'dark',
    content: { copyright: '© 2024 AkuGlow. All rights reserved.', columns: [{ title: 'Menu', links: [{ label: 'Home', url: '/' }] }] },
  },
};

const PAGES = [
  { key: 'home', label: 'Beranda', icon: 'home' },
  { key: 'about', label: 'Tentang', icon: 'info' },
  { key: 'pricing', label: 'Harga', icon: 'sell' },
  { key: 'features', label: 'Fitur', icon: 'star' },
  { key: 'faq', label: 'FAQ', icon: 'help' },
  { key: 'contact', label: 'Kontak', icon: 'mail' },
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'sidebar', label: 'Sidebar', icon: 'sidebar' },
];

export default function SectionEditor() {
  const { platform } = useParams();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('home');
  const [showPicker, setShowPicker] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draggedIdx, setDraggedIdx] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson(`${ADMIN_API_BASE}/cms/sections?platform=${platform}&page=${page}`);
      setSections(data || []);
    } catch (e) {
      toast.error(e.message || 'Gagal memuat section');
    } finally {
      setLoading(false);
    }
  }, [platform, page]);

  useEffect(() => { load() }, [load]);

  const addTemplate = async (tpl) => {
    try {
      await postJson(`${ADMIN_API_BASE}/cms/sections/create`, {
        platform, page, key: tpl.key, title: tpl.title, variant: tpl.variant, content: tpl.content, order: sections.length, is_active: true,
      });
      toast.success(`Section "${tpl.title}" ditambahkan`);
      setShowPicker(false);
      load();
    } catch (e) {
      toast.error(e.message || 'Gagal menambah section');
    }
  };

  const toggleActive = async (sec) => {
    try {
      await putJson(`${ADMIN_API_BASE}/cms/sections/update?id=${sec.id}`, { ...sec, is_active: !sec.is_active });
      load();
    } catch (e) {
      toast.error(e.message || 'Gagal toggle');
    }
  };

  const remove = async (id) => {
    if (!confirm('Hapus section ini?')) return;
    try {
      await fetchJson(`${ADMIN_API_BASE}/cms/sections/delete?id=${id}`, { method: 'DELETE' });
      toast.success('Section dihapus');
      load();
    } catch (e) {
      toast.error(e.message || 'Gagal hapus');
    }
  };

  const handleDragStart = (idx) => setDraggedIdx(idx);
  const handleDrop = async (toIdx) => {
    if (draggedIdx === null || draggedIdx === toIdx) return;
    const reordered = [...sections];
    const [moved] = reordered.splice(draggedIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setSections(reordered);
    setDraggedIdx(null);
    try {
      await postJson(`${ADMIN_API_BASE}/cms/sections/reorder?platform=${platform}&page=${page}`, { ids: reordered.map(s => s.id) });
    } catch (e) {
      toast.error(e.message || 'Gagal reorder');
      load();
    }
  };

  const saveEdit = async (sec, field, value) => {
    try {
      await putJson(`${ADMIN_API_BASE}/cms/sections/update?id=${sec.id}`, { ...sec, [field]: value });
      load();
    } catch (e) {
      toast.error(e.message || 'Gagal update');
    }
  };

  const sectionIcon = (key) => {
    const icons = { hero: 'responsive', features: 'grid_view', testimonials: 'format_quote', stats: 'bar_chart', pricing: 'sell', faq: 'help', cta: 'ads_click', footer: 'call_to_action' };
    return icons[key] || 'layers';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin/cms" className="text-slate-400 hover:text-slate-600 transition-colors">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-sm font-bold text-slate-900">Section Editor</h1>
              <p className="text-[10px] text-slate-400 capitalize">{platform.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={page} onChange={e => setPage(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none">
              {PAGES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <button onClick={() => setShowPicker(true)}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">add</span>
              Tambah Section
            </button>
          </div>
        </div>
      </div>

      {showPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowPicker(false)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-900">Pilih Template Section</h3>
              <button onClick={() => setShowPicker(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(SECTION_TEMPLATES).map(([key, tpl]) => (
                <button key={key} onClick={() => addTemplate(tpl)}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all text-center">
                  <span className="material-symbols-outlined text-2xl text-indigo-500 mb-2">{sectionIcon(key)}</span>
                  <p className="text-xs font-bold text-slate-700">{tpl.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{key}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {sections.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">layers</span>
                <p className="text-sm text-slate-500 mb-4">Belum ada section untuk halaman ini</p>
                <button onClick={() => setShowPicker(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all">
                  Tambah Section Pertama
                </button>
              </div>
            ) : (
              sections.map((sec, idx) => (
                <div key={sec.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderTopColor = '#4f46e5'; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderTopColor = ''; }}
                  onDrop={() => handleDrop(idx)}
                  className={`bg-white rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing ${sec.is_active ? 'border-slate-200 hover:border-slate-300' : 'border-slate-100 bg-slate-50/50'}`}>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="material-symbols-outlined text-slate-300 text-lg">drag_indicator</span>
                      <span className="material-symbols-outlined text-slate-400">{sectionIcon(sec.key)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{sec.title || sec.key}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-semibold">{sec.variant}</span>
                          {!sec.is_active && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-semibold">Nonaktif</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{sec.key} · order {sec.order}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <button onClick={() => toggleActive(sec)}
                        className={`p-1.5 rounded-lg transition-colors ${sec.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-100'}`}>
                        <span className="material-symbols-outlined text-lg">{sec.is_active ? 'visibility' : 'visibility_off'}</span>
                      </button>
                      <button onClick={() => setEditing(editing?.id === sec.id ? null : sec)}
                        className={`p-1.5 rounded-lg transition-colors ${editing?.id === sec.id ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button onClick={() => remove(sec.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                  {editing?.id === sec.id && (
                    <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Judul</label>
                          <input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Variant</label>
                          <select value={editing.variant || 'default'} onChange={(e) => setEditing({ ...editing, variant: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                            <option value="default">Default</option>
                            <option value="dark">Dark</option>
                            <option value="accent">Accent</option>
                            <option value="minimal">Minimal</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Subtitle</label>
                        <textarea value={editing.subtitle || ''} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 h-16 resize-y" />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button onClick={() => setEditing(null)}
                          className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200">Batal</button>
                        <button onClick={async () => {
                          await putJson(`${ADMIN_API_BASE}/cms/sections/update?id=${sec.id}`, editing);
                          toast.success('Section diperbarui');
                          setEditing(null);
                          load();
                        }} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700">Simpan</button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
