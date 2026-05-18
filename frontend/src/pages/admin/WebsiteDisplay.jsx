import React, { useState, useEffect, useMemo } from 'react';
import { fetchJson, ADMIN_API_BASE } from '../../lib/api';
import toast from 'react-hot-toast';

const API = ADMIN_API_BASE;

export default function WebsiteDisplay() {
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0); 
  const [viewMode, setViewMode] = useState('desktop'); 

  // Categorized tokens for better UX
  const themeCategories = [
    {
      title: 'Identitas & Warna Brand',
      icon: 'bx-palette',
      desc: 'Atur palet warna utama yang mewakili brand AkuGlow.',
      tokens: [
        { key: 'theme_primary', label: 'Warna Utama (Tombol & Link)', type: 'color', desc: 'Warna dominan yang muncul paling sering di website.' },
        { key: 'theme_primary_dark', label: 'Warna Utama (Hover)', type: 'color', desc: 'Versi lebih gelap untuk efek saat tombol disentuh.' },
        { key: 'theme_primary_light', label: 'Warna Utama (Background)', type: 'color', desc: 'Versi lembut untuk latar belakang elemen kecil.' },
        { key: 'theme_secondary', label: 'Warna Sukses / Pelengkap', type: 'color', desc: 'Biasanya digunakan untuk notifikasi sukses atau badge.' },
        { key: 'theme_accent', label: 'Warna Aksen (Premium)', type: 'color', desc: 'Warna emas atau highlight untuk kesan mewah.' },
      ]
    },
    {
      title: 'Gaya Tulisan (Tipografi)',
      icon: 'bx-font',
      desc: 'Pilih jenis huruf yang mudah dibaca oleh pelanggan.',
      tokens: [
        { key: 'theme_font_heading', label: 'Font Judul', type: 'text', desc: 'Font untuk tulisan besar/judul (Contoh: "Plus Jakarta Sans").' },
        { key: 'theme_font_body', label: 'Font Teks Biasa', type: 'text', desc: 'Font untuk deskripsi dan bacaan (Contoh: "Inter").' },
      ]
    },
    {
      title: 'Bentuk & Layout',
      icon: 'bx-shape-square',
      desc: 'Atur estetika bentuk elemen di website Anda.',
      tokens: [
        { key: 'theme_radius', label: 'Kelengkungan Sudut (Radius)', type: 'text', desc: 'Berapa "bulat" sudut tombol/kotak (Contoh: "1rem" atau "20px").' },
      ]
    }
  ];

  const allTokens = useMemo(() => themeCategories.flatMap(c => c.tokens), []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchJson(`${API}/settings`);
      const map = {};
      if (Array.isArray(res)) {
        res.forEach(item => { map[item.key] = item.value; });
      }
      setConfigs(map);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat konfigurasi. Pastikan koneksi backend aktif.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleChange = (key, value) => {
    setConfigs(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = [];
      allTokens.forEach(t => {
        payload.push({ key: t.key, value: configs[t.key] || '', description: t.label });
      });

      await fetchJson(`${API}/settings`, { method: 'POST', body: JSON.stringify(payload) });
      toast.success("Tampilan berhasil disimpan & dipublikasikan!");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Kembalikan ke pengaturan default AkuGlow?")) {
      const defaults = {
        theme_primary: '#6366f1',
        theme_primary_dark: '#4f46e5',
        theme_primary_light: '#e0e7ff',
        theme_secondary: '#10b981',
        theme_accent: '#f59e0b',
        theme_radius: '1rem',
        theme_font_heading: "'Plus Jakarta Sans', sans-serif",
        theme_font_body: "'Inter', sans-serif"
      };
      setConfigs(defaults);
      toast.success("Pengaturan dikembalikan ke default (Klik Simpan untuk konfirmasi)");
    }
  };

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('theme_preview', 'true');
    allTokens.forEach(t => { if (configs[t.key]) params.set(t.key, configs[t.key]); });
    return `/?${params.toString()}`;
  }, [configs, allTokens]);

  const viewWidths = { desktop: '100%', tablet: '768px', mobile: '375px' };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600"></div>
      <p className="text-slate-500 font-bold animate-pulse">Menghubungkan ke Mesin Tema...</p>
    </div>
  );

  return (
    <div className="fade-in max-w-[1600px] mx-auto p-4 lg:p-8">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-xl shadow-indigo-200">
            <i className='bx bx-edit-alt text-3xl'></i>
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pusat Kendali Visual</h1>
            <p className="text-slate-500 font-medium text-lg">Kelola tampilan website AkuGlow dengan mudah dan real-time.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full xl:w-auto">
          <button
            onClick={handleReset}
            className="flex-1 xl:flex-none px-6 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
          >
            Reset Default
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-10 py-4 rounded-2xl font-black text-white transition-all shadow-2xl ${
              saving ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:-translate-y-1'
            }`}
          >
            {saving ? <i className='bx bx-loader-alt animate-spin'></i> : <i className='bx bx-cloud-upload text-xl'></i>}
            PUBLISH TAMPILAN
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        
        {/* Left: Configuration Panel */}
        <div className="xl:col-span-5 space-y-8">
          {themeCategories.map((cat, idx) => (
            <div key={idx} className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-indigo-600 border border-slate-100">
                  <i className={`bx ${cat.icon} text-2xl`}></i>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 leading-none">{cat.title}</h3>
                  <p className="text-sm text-slate-400 font-medium mt-1">{cat.desc}</p>
                </div>
              </div>
              
              <div className="h-px bg-slate-100 my-6"></div>

              <div className="space-y-6">
                {cat.tokens.map(token => (
                  <div key={token.key} className="relative group">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">{token.label}</label>
                    </div>
                    <div className="flex gap-3">
                      {token.type === 'color' && (
                        <div className="relative group/color shrink-0">
                          <input
                            type="color"
                            value={configs[token.key] || '#000000'}
                            onChange={(e) => handleChange(token.key, e.target.value)}
                            className="w-14 h-14 rounded-2xl border-2 border-slate-50 cursor-pointer p-1 transition-all hover:scale-105 bg-white shadow-sm"
                          />
                        </div>
                      )}
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={configs[token.key] || ''}
                          onChange={(e) => handleChange(token.key, e.target.value)}
                          placeholder={token.desc}
                          className="w-full h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                        />
                        {token.type === 'color' && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-white shadow-md" style={{ background: configs[token.key] }}></div>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-2 ml-2 leading-tight">{token.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Live Preview Panel */}
        <div className="xl:col-span-7 space-y-6">
          <div className="sticky top-24">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span className="text-sm font-black text-slate-700 uppercase tracking-widest">Pratinjau Langsung</span>
              </div>
              <button
                onClick={() => setPreviewKey(prev => prev + 1)}
                className="text-indigo-600 font-black text-xs uppercase tracking-tighter hover:underline flex items-center gap-1"
              >
                <i className='bx bx-refresh text-lg'></i> Segarkan Tampilan
              </button>
            </div>

            <div className="bg-slate-900 rounded-[3rem] overflow-hidden border-[10px] border-slate-800 shadow-3xl relative">
              {/* Browser Head */}
              <div className="h-14 bg-slate-800 flex items-center px-8 gap-4 border-b border-white/5">
                <div className="flex gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-rose-500"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-500"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500"></div>
                </div>
                <div className="flex-1 max-w-lg mx-auto h-8 bg-slate-900/80 rounded-xl flex items-center px-4 gap-3">
                  <i className='bx bx-globe text-slate-600'></i>
                  <span className="text-[11px] text-slate-500 font-bold truncate tracking-tight">https://akuglow.com/id/live-designer</span>
                </div>
              </div>

              {/* Iframe Viewport */}
              <div className="aspect-[16/11] bg-slate-200 flex flex-col items-center overflow-hidden">
                <div 
                  className="h-full bg-white shadow-2xl transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) relative"
                  style={{ width: viewWidths[viewMode] }}
                >
                  <iframe
                    key={`${previewKey}-${viewMode}`}
                    src={previewUrl}
                    title="Live Website Preview"
                    className="w-full h-full border-none"
                  />
                  
                  {/* Mode Label Overlay */}
                  <div className="absolute top-8 right-8 z-20 bg-indigo-600 text-white px-5 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl border border-white/20">
                    <span className="flex items-center gap-2">
                      <i className={`bx ${viewMode === 'desktop' ? 'bx-laptop' : viewMode === 'tablet' ? 'bx-tablet' : 'bx-mobile-alt'}`}></i>
                      {viewMode}
                    </span>
                  </div>
                </div>

                {/* Device Selector Overlay */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-slate-900/90 backdrop-blur-2xl text-white p-2 rounded-[2rem] border border-white/10 shadow-3xl">
                   <button 
                    onClick={() => setViewMode('desktop')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-3xl transition-all ${viewMode === 'desktop' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                   >
                      <i className='bx bx-laptop text-xl'></i>
                      <span className="text-[10px] font-black uppercase tracking-wider">Desktop</span>
                   </button>
                   <button 
                    onClick={() => setViewMode('tablet')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-3xl transition-all ${viewMode === 'tablet' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                   >
                      <i className='bx bx-tablet text-xl'></i>
                      <span className="text-[10px] font-black uppercase tracking-wider">Tablet</span>
                   </button>
                   <button 
                    onClick={() => setViewMode('mobile')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-3xl transition-all ${viewMode === 'mobile' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                   >
                      <i className='bx bx-mobile-alt text-xl'></i>
                      <span className="text-[10px] font-black uppercase tracking-wider">Mobile</span>
                   </button>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 rounded-[2rem] bg-indigo-50 border border-indigo-100 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl">
                     <i className='bx bx-shield-check'></i>
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-black uppercase text-xs tracking-wider">Aman & Terkendali</h4>
                    <p className="text-slate-500 text-sm font-medium">Semua perubahan hanya akan dipublikasikan setelah Anda menekan tombol Publish.</p>
                  </div>
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
