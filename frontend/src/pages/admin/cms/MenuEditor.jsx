import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchJson, putJson, ADMIN_API_BASE } from '../../../lib/api';
import toast from 'react-hot-toast';

const LOCATIONS = [
  { key: 'main', label: 'Navigasi Atas', desc: 'Menu utama di header' },
  { key: 'footer', label: 'Footer', desc: 'Link di bagian bawah halaman' },
  { key: 'sidebar', label: 'Sidebar', desc: 'Menu samping dashboard' },
];

export default function MenuEditor() {
  const { platform } = useParams();
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState('main');

  const loadMenu = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson(`${ADMIN_API_BASE}/cms/menus?platform=${platform}&location=${location}`);
      setMenu(data);
    } catch (e) {
      toast.error(e.message || 'Gagal memuat menu');
    } finally {
      setLoading(false);
    }
  }, [platform, location]);

  useEffect(() => { loadMenu() }, [loadMenu]);

  const items = menu?.items || [];

  const addItem = () => {
    setMenu(prev => ({
      ...prev, name: prev?.name || location + ' menu',
      items: [...(prev?.items || []), { label: '', url: '#', is_active: true, order: (prev?.items?.length || 0) + 1, children: [] }],
    }));
  };

  const update = (idx, field, value) => {
    setMenu(prev => {
      const items = [...(prev?.items || [])];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };

  const remove = (idx) => {
    if (!confirm('Hapus item ini?')) return;
    setMenu(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const addChild = (idx) => {
    setMenu(prev => {
      const items = [...prev.items];
      items[idx] = {
        ...items[idx],
        children: [...(items[idx].children || []), { label: '', url: '#', is_active: true, order: (items[idx].children?.length || 0) + 1 }],
      };
      return { ...prev, items };
    });
  };

  const updateChild = (parentIdx, childIdx, field, value) => {
    setMenu(prev => {
      const items = [...prev.items];
      const children = [...(items[parentIdx].children || [])];
      children[childIdx] = { ...children[childIdx], [field]: value };
      items[parentIdx] = { ...items[parentIdx], children };
      return { ...prev, items };
    });
  };

  const removeChild = (parentIdx, childIdx) => {
    setMenu(prev => {
      const items = [...prev.items];
      items[parentIdx] = { ...items[parentIdx], children: items[parentIdx].children.filter((_, ci) => ci !== childIdx) };
      return { ...prev, items };
    });
  };

  const saveMenu = async () => {
    setSaving(true);
    try {
      await putJson(`${ADMIN_API_BASE}/cms/menus/update?platform=${platform}`, { location, items: menu?.items || [] });
      toast.success('Menu tersimpan');
      loadMenu();
    } catch (e) {
      toast.error(e.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
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
              <h1 className="text-sm font-bold text-slate-900">Menu Editor</h1>
              <p className="text-[10px] text-slate-400 capitalize">{platform.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={addItem}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">add</span>
              Item
            </button>
            <button onClick={saveMenu} disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all">
              {saving ? 'Menyimpan...' : 'Simpan Menu'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Posisi Menu</h3>
          <div className="flex gap-2">
            {LOCATIONS.map(loc => (
              <button key={loc.key} onClick={() => setLocation(loc.key)}
                className={`flex-1 p-3 rounded-xl border-2 text-left transition-all ${location === loc.key ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <p className="text-xs font-bold text-slate-900">{loc.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{loc.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">menu</span>
            <p className="text-sm text-slate-500 mb-4">Belum ada item menu</p>
            <button onClick={addItem}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all">
              Tambah Item Pertama
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-300 cursor-grab">drag_indicator</span>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input value={item.label} onChange={(e) => update(idx, 'label', e.target.value)}
                      placeholder="Nama menu" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                    <input value={item.url} onChange={(e) => update(idx, 'url', e.target.value)}
                      placeholder="/halaman" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-indigo-400" />
                    <input value={item.icon || ''} onChange={(e) => update(idx, 'icon', e.target.value)}
                      placeholder="ikon (opsional)" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => update(idx, 'is_active', !item.is_active)}
                      className={`p-1.5 rounded-lg transition-colors ${item.is_active ? 'text-emerald-600 bg-emerald-50' : 'text-slate-300'}`}>
                      <span className="material-symbols-outlined text-lg">{item.is_active ? 'toggle_on' : 'toggle_off'}</span>
                    </button>
                    <button onClick={() => addChild(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <span className="material-symbols-outlined text-lg">add_circle</span>
                    </button>
                    <button onClick={() => remove(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
                {item.children?.length > 0 && (
                  <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 ml-8 space-y-2">
                    {item.children.map((child, ci) => (
                      <div key={ci} className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-300 text-sm">subdirectory_arrow_right</span>
                        <input value={child.label} onChange={(e) => updateChild(idx, ci, 'label', e.target.value)}
                          placeholder="Sub menu" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-400" />
                        <input value={child.url} onChange={(e) => updateChild(idx, ci, 'url', e.target.value)}
                          placeholder="/link" className="w-36 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono outline-none focus:border-indigo-400" />
                        <button onClick={() => removeChild(idx, ci)}
                          className="p-1 text-slate-400 hover:text-red-600">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
