/**
 * EducationEditor.jsx — Classic Editor untuk Materi Edukasi Affiliate
 * Route: /admin/education/new  |  /admin/education/edit/:id
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import toast from 'react-hot-toast';

/* ─── WebP converter (Canvas API) ────────────────────────── */
const convertToWebP = (file, quality = 0.88) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' }));
          },
          'image/webp', quality
        );
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

/* ─── helpers ─────────────────────────────────────────────── */
const countWords = (str) => str.trim().split(/\s+/).filter(Boolean).length;
const readingTime = (content) => Math.max(1, Math.ceil(countWords(content) / 200));

/* ─── STYLES ──────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.ee * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
.ee { min-height: 100vh; background: #f8fafc; }

.ee-topbar {
  position: sticky; top: 0; z-index: 100;
  background: #fff; border-bottom: 1px solid #e8edf4;
  padding: 0 24px; height: 60px;
  display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.ee-main { display: flex; gap: 0; }

.ee-editor-col {
  flex: 1; min-width: 0; padding: 28px 32px;
  max-width: calc(100% - 320px);
}

.ee-sidebar {
  width: 320px; flex-shrink: 0; background: #fff;
  border-left: 1px solid #e8edf4;
  height: calc(100vh - 60px);
  position: sticky; top: 60px; overflow-y: auto;
}

.ee-label {
  display: block; font-size: 11px; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;
}

.ee-input {
  width: 100%; padding: 10px 14px;
  border: 1.5px solid #e2e8f0; border-radius: 10px;
  font-size: 13px; color: #1e293b; outline: none;
  transition: border 0.18s; background: #fff;
  font-family: 'Inter', sans-serif;
}
.ee-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }

.ee-title-input {
  width: 100%; border: none; outline: none;
  font-size: 28px; font-weight: 900; color: #0f172a;
  font-family: 'Inter', sans-serif; background: transparent;
  padding: 8px 0; border-bottom: 2px solid #f1f5f9;
  transition: border-color 0.2s; line-height: 1.3;
}
.ee-title-input:focus { border-bottom-color: #6366f1; }
.ee-title-input::placeholder { color: #cbd5e1; }

.ee-content-area {
  width: 100%; min-height: 420px;
  border: 1.5px solid #e2e8f0; border-radius: 12px;
  padding: 16px 18px; font-size: 14px; line-height: 1.75; color: #1e293b;
  font-family: 'Inter', sans-serif; resize: vertical; outline: none;
  transition: border 0.18s; background: #fff;
}
.ee-content-area:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }

.ee-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 18px; border-radius: 10px;
  font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.18s; border: none;
}
.ee-btn-primary { background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; box-shadow: 0 4px 12px rgba(79,70,229,0.25); }
.ee-btn-primary:hover { background: linear-gradient(135deg, #4338ca, #4f46e5); transform: translateY(-1px); }
.ee-btn-ghost { background: #fff; color: #475569; border: 1.5px solid #e2e8f0; }
.ee-btn-ghost:hover { border-color: #6366f1; color: #4f46e5; }
.ee-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }
.ee-btn-sm { padding: 6px 12px; font-size: 12px; }

.ee-toolbar {
  display: flex; gap: 4px; flex-wrap: wrap;
  padding: 10px 14px; background: #f8fafc;
  border: 1.5px solid #e2e8f0; border-bottom: none;
  border-radius: 12px 12px 0 0;
}
.ee-toolbar-btn {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; border-radius: 6px;
  cursor: pointer; color: #475569; font-size: 14px; font-weight: 700;
  transition: all 0.15s;
}
.ee-toolbar-btn:hover { background: #e8edf4; color: #1e293b; }
.ee-toolbar-sep { width: 1px; background: #e2e8f0; margin: 4px 6px; }

.ee-section {
  border-bottom: 1px solid #f1f5f9;
}
.ee-section-header {
  padding: 14px 18px; display: flex; align-items: center;
  justify-content: space-between; cursor: pointer;
  user-select: none; background: #fafbff;
}
.ee-section-title {
  font-size: 12px; font-weight: 800; color: #0f172a;
  display: flex; align-items: center; gap: 8px; margin: 0;
}
.ee-section-body { padding: 16px 18px; }

.ee-img-drop {
  border: 2px dashed #e2e8f0; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
  cursor: pointer; transition: border-color 0.2s; background: #f8fafc;
}
.ee-img-drop:hover { border-color: #6366f1; }

/* Media Picker */
.mp2-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(15,23,42,0.55);
  display: flex; align-items: center; justify-content: center;
  padding: 20px; backdrop-filter: blur(4px);
  animation: mp2FadeIn 0.18s ease;
}
@keyframes mp2FadeIn { from { opacity: 0; } to { opacity: 1; } }
.mp2-dialog {
  background: #fff; border-radius: 20px;
  width: 100%; max-width: 860px; max-height: 88vh;
  display: flex; flex-direction: column;
  box-shadow: 0 25px 60px rgba(0,0,0,0.25);
  animation: mp2SlideUp 0.22s ease; overflow: hidden;
}
@keyframes mp2SlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.mp2-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px; padding: 20px; overflow-y: auto; flex: 1;
}
.mp2-item {
  aspect-ratio: 1; border-radius: 12px; overflow: hidden;
  cursor: pointer; border: 2.5px solid transparent;
  transition: all 0.18s; position: relative; background: #f1f5f9;
}
.mp2-item:hover { border-color: #6366f1; transform: scale(1.03); }
.mp2-item.selected { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.2); }
.mp2-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.mp2-check {
  position: absolute; top: 5px; right: 5px; width: 22px; height: 22px;
  background: #4f46e5; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; color: #fff; font-size: 13px;
}

/* Video embed preview */
.video-embed { width: 100%; aspect-ratio: 16/9; border-radius: 12px; border: none; }

/* Toggle switch */
.ee-toggle {
  position: relative; width: 42px; height: 24px; flex-shrink: 0;
}
.ee-toggle input { opacity: 0; width: 0; height: 0; }
.ee-toggle-slider {
  position: absolute; cursor: pointer; inset: 0;
  background: #e2e8f0; border-radius: 24px; transition: 0.25s;
}
.ee-toggle-slider:before {
  position: absolute; content: '';
  height: 18px; width: 18px; left: 3px; bottom: 3px;
  background: white; border-radius: 50%; transition: 0.25s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.ee-toggle input:checked + .ee-toggle-slider { background: #6366f1; }
.ee-toggle input:checked + .ee-toggle-slider:before { transform: translateX(18px); }

@keyframes ee-spin { to { transform: rotate(360deg); } }

@media (max-width: 1024px) {
  .ee-main { flex-direction: column; }
  .ee-editor-col { max-width: 100%; padding: 20px 16px; }
  .ee-sidebar { position: relative; top: auto; height: auto; width: 100%; border-left: none; border-top: 1px solid #e8edf4; }
}

@media (max-width: 768px) {
  .ee-topbar {
    height: auto;
    padding: 12px 16px;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .ee-topbar > div {
    width: 100%;
    justify-content: space-between;
  }
  .ee-title-input {
    font-size: 20px;
  }
  .ee-video-row {
    flex-direction: column;
    align-items: stretch !important;
  }
  .ee-video-row .ee-input {
    width: 100%;
  }
  .ee-video-row label {
    width: 100%;
    justify-content: center;
  }
  .ee-thumb-row {
    flex-direction: column;
  }
  .ee-thumb-row label, .ee-thumb-row button {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 576px) {
  .ee-toolbar-text {
    display: none;
  }
}
`;

/* ─── sub-components ─────────────────────────────────────── */
const TBtn = ({ icon, label, onClick, title }) => (
  <button type="button" className="ee-toolbar-btn" onClick={onClick} title={title || label}>
    {icon ? <i className={`bx ${icon}`} style={{ fontSize: 16 }} /> : <span style={{ fontSize: 12 }}>{label}</span>}
  </button>
);

const ESection = ({ icon, iconColor = '#6366f1', title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="ee-section">
      <div className="ee-section-header" onClick={() => setOpen(o => !o)}>
        <h3 className="ee-section-title">
          <i className={`bx ${icon}`} style={{ color: iconColor, fontSize: 15 }} />
          {title}
        </h3>
        <i className={`bx bx-chevron-${open ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: 16 }} />
      </div>
      {open && <div className="ee-section-body">{children}</div>}
    </div>
  );
};

const Toggle = ({ checked, onChange, label }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
    <label className="ee-toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="ee-toggle-slider" />
    </label>
    <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{label}</span>
  </label>
);

/* ─── CATEGORIES ─────────────────────────────────────────── */
const DEFAULT_CATS = ['Marketing', 'Product', 'Sales', 'Branding', 'Leadership', 'Digital'];

/* ─── EMPTY FORM ──────────────────────────────────────────── */
const EMPTY = {
  id: 0,
  title: '',
  content: '',
  video_url: '',
  category: 'Marketing',
  image_url: '',
  is_featured: false,
  is_active: true,
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function EducationEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customCat, setCustomCat] = useState(false);
  const contentRef = useRef(null);

  // Media Picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mediaList, setMediaList] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaSel, setMediaSel] = useState(null);

  /* load existing */
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    fetchJson(`${ADMIN_API_BASE}/education?search=&page=1&limit=200`)
      .then(d => {
        const found = (d?.data || []).find(e => String(e.id) === String(id));
        if (found) setForm({ ...EMPTY, ...found });
        else toast.error('Materi tidak ditemukan');
      })
      .catch(() => toast.error('Gagal memuat materi'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  /* toolbar insert */
  const insertAtCursor = useCallback((before, after = '') => {
    const ta = contentRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.slice(s, e);
    const newVal = ta.value.slice(0, s) + before + sel + after + ta.value.slice(e);
    setForm(prev => ({ ...prev, content: newVal }));
    requestAnimationFrame(() => {
      ta.setSelectionRange(s + before.length, s + before.length + sel.length);
      ta.focus();
    });
  }, []);

  const toolbarActions = [
    { label: 'B', title: 'Bold', fn: () => insertAtCursor('**', '**') },
    { label: 'I', title: 'Italic', fn: () => insertAtCursor('*', '*') },
    { label: 'U', title: 'Underline', fn: () => insertAtCursor('<u>', '</u>') },
    null,
    { label: 'H2', title: 'Heading 2', fn: () => insertAtCursor('\n## ') },
    { label: 'H3', title: 'Heading 3', fn: () => insertAtCursor('\n### ') },
    null,
    { icon: 'bx-link', title: 'Link', fn: () => { const u = prompt('URL:'); if (u) insertAtCursor('[', `](${u})`); } },
    { icon: 'bx-list-ul', title: 'Bullet List', fn: () => insertAtCursor('\n- ') },
    { icon: 'bx-list-ol', title: 'Ordered List', fn: () => insertAtCursor('\n1. ') },
    null,
    { icon: 'bxs-quote-left', title: 'Blockquote', fn: () => insertAtCursor('\n> ') },
    { icon: 'bx-code-block', title: 'Code', fn: () => insertAtCursor('\n```\n', '\n```\n') },
    { icon: 'bx-horizontal-rule', title: 'Divider', fn: () => insertAtCursor('\n---\n') },
  ];

  /* upload image → WebP */
  const uploadImage = async (file) => {
    setUploading(true);
    try {
      const webp = await convertToWebP(file, 0.88);
      toast.loading(`Mengkonversi & upload WebP...`, { id: 'edu-up', duration: 3000 });
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('image', webp);
      const resp = await fetch(`${ADMIN_API_BASE}/media/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
        body: fd,
      });
      if (!resp.ok) throw new Error(`${resp.status}`);
      const res = await resp.json();
      const url = res?.data?.url || res?.imageUrl || res?.url;
      if (url) {
        toast.success('✅ Thumbnail terupload (WebP)', { id: 'edu-up' });
        return url;
      }
    } catch (err) {
      toast.error('Upload gagal: ' + err.message, { id: 'edu-up' });
    } finally {
      setUploading(false);
    }
    return null;
  };

  /* media library */
  const loadMedia = (search = '') => {
    setMediaLoading(true);
    fetchJson(`${ADMIN_API_BASE}/media?search=${encodeURIComponent(search)}&page=1&limit=60`)
      .then(d => setMediaList(d?.data || []))
      .catch(() => toast.error('Gagal memuat media'))
      .finally(() => setMediaLoading(false));
  };

  const openPicker = () => {
    setMediaSel(null); setMediaSearch('');
    setPickerOpen(true); loadMedia('');
  };

  const confirmPick = () => {
    if (!mediaSel) return;
    set('image_url', mediaSel.url);
    setPickerOpen(false);
    toast.success('Thumbnail dipilih dari pustaka media');
  };

  /* video helper */
  const getYouTubeId = (url) => {
    const m = url.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  };
  const isYouTube = (url) => !!getYouTubeId(url);
  const embedUrl = (url) => {
    const yt = getYouTubeId(url);
    if (yt) return `https://www.youtube.com/embed/${yt}`;
    return url;
  };

  /* save */
  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Judul materi wajib diisi'); return; }
    if (!form.content.trim()) { toast.error('Konten/deskripsi wajib diisi'); return; }
    setSaving(true);
    try {
      await fetchJson(`${ADMIN_API_BASE}/education/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      toast.success(isEdit ? 'Materi diperbarui!' : 'Materi ditambahkan!');
      navigate('/admin/education');
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const wc = countWords(form.content);
  const rt = readingTime(form.content);

  /* ─── LOADING ───────────────────────────────────────────── */
  if (loading) return (
    <div className="ee" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 14 }}>
      <style>{CSS}</style>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'ee-spin 0.7s linear infinite' }} />
      <p style={{ color: '#94a3b8', fontWeight: 700, fontSize: 13 }}>Memuat materi...</p>
    </div>
  );

  /* ─── RENDER ────────────────────────────────────────────── */
  return (
    <div className="ee">
      <style>{CSS}</style>

      {/* TOPBAR */}
      <div className="ee-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/admin/education" className="ee-btn ee-btn-ghost ee-btn-sm" style={{ textDecoration: 'none', display: 'inline-flex' }}>
            <i className="bx bx-arrow-back" style={{ fontSize: 15 }} /> Kembali
          </Link>
          <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
              {isEdit ? 'Edit Materi Edukasi' : 'Tambah Materi Baru'}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              {wc} kata · {rt} menit baca
              <span style={{ marginLeft: 8, padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 800, background: form.is_active ? '#dcfce7' : '#fee2e2', color: form.is_active ? '#16a34a' : '#dc2626' }}>
                {form.is_active ? '● Aktif' : '● Hidden'}
              </span>
              {form.is_featured && <span style={{ marginLeft: 4, padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 800, background: '#fef3c7', color: '#d97706' }}>⭐ Unggulan</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/admin/education" className="ee-btn ee-btn-ghost ee-btn-sm" style={{ textDecoration: 'none', display: 'inline-flex' }}>
            Batal
          </Link>
          <button className="ee-btn ee-btn-primary" type="button" onClick={handleSave} disabled={saving}>
            {saving
              ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</>
              : <><i className="bx bx-send" /> {isEdit ? 'Perbarui Materi' : 'Simpan Materi'}</>}
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="ee-main">

        {/* ══ EDITOR COLUMN ══════════════════════════════════ */}
        <div className="ee-editor-col">

          {/* Title */}
          <div style={{ marginBottom: 20 }}>
            <input
              className="ee-title-input"
              placeholder="Masukkan judul materi edukasi..."
              value={form.title}
              onChange={e => set('title', e.target.value)}
              maxLength={255}
            />
            <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
              <div style={{ flex: 1 }}>
                <label className="ee-label">Kategori</label>
                {customCat
                  ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="ee-input" style={{ flex: 1 }} value={form.category} onChange={e => set('category', e.target.value)} placeholder="Nama kategori baru..." autoFocus />
                      <button type="button" className="ee-btn ee-btn-ghost ee-btn-sm" onClick={() => { setCustomCat(false); set('category', 'Marketing'); }}>
                        <i className="bx bx-x" />
                      </button>
                    </div>
                  )
                  : (
                    <select className="ee-input" value={form.category} onChange={e => {
                      if (e.target.value === '__new__') { setCustomCat(true); set('category', ''); }
                      else set('category', e.target.value);
                    }}>
                      {DEFAULT_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="__new__">➕ Tambah Kategori Baru...</option>
                    </select>
                  )
                }
              </div>
            </div>
          </div>

          {/* Thumbnail */}
          <div style={{ marginBottom: 20 }}>
            <label className="ee-label">
              <i className="bx bx-image" style={{ marginRight: 4, fontSize: 12 }} />
              Thumbnail
              {form.image_url && <span style={{ marginLeft: 8, fontWeight: 500, color: '#16a34a', textTransform: 'none', letterSpacing: 0 }}>✓ Tersimpan</span>}
            </label>

            {form.image_url && (
              <div style={{ position: 'relative', marginBottom: 10, borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e8edf4', height: 180 }}>
                <img src={formatImage(form.image_url)} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)' }} />
                <div style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontFamily: 'monospace', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {form.image_url.split('/').pop()}
                </div>
                <button type="button" onClick={() => set('image_url', '')}
                  style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(220,38,38,0.9)', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className="bx bx-trash" style={{ fontSize: 13 }} /> Hapus
                </button>
              </div>
            )}

            <div className="ee-thumb-row" style={{ display: 'flex', gap: 10 }}>
              <label style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '10px 14px', borderRadius: 10,
                cursor: uploading ? 'not-allowed' : 'pointer',
                border: '1.5px solid #e2e8f0', background: uploading ? '#f8fafc' : '#fff',
                fontSize: 13, fontWeight: 700, color: uploading ? '#94a3b8' : '#475569',
                transition: 'all 0.18s',
              }}
                onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#4f46e5'; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = uploading ? '#94a3b8' : '#475569'; }}
              >
                {uploading
                  ? <><i className="bx bx-loader-alt bx-spin" style={{ fontSize: 15 }} /> Mengkonversi...</>
                  : <><i className="bx bx-upload" style={{ fontSize: 15 }} /> Upload Baru <span style={{ fontSize: 10, background: '#eef2ff', color: '#4f46e5', borderRadius: 4, padding: '1px 6px', fontWeight: 800 }}>→WebP</span></>}
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading}
                  onChange={async e => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const url = await uploadImage(f);
                    if (url) set('image_url', url);
                    e.target.value = '';
                  }} />
              </label>

              <button type="button" className="ee-btn ee-btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={openPicker}>
                <i className="bx bx-images" style={{ fontSize: 15 }} /> Pustaka Media
              </button>
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="bx bx-info-circle" style={{ fontSize: 12 }} />
              Gambar dikonversi otomatis ke WebP untuk performa optimal
            </div>
          </div>

          {/* Video URL */}
          <div style={{ marginBottom: 20 }}>
            <label className="ee-label">
              <i className="bx bx-video" style={{ marginRight: 4, fontSize: 12 }} />
              Video (YouTube URL atau Upload MP4)
            </label>
            <div className="ee-video-row" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                className="ee-input"
                style={{ flex: 1 }}
                placeholder="https://www.youtube.com/watch?v=... atau link video MP4"
                value={form.video_url}
                onChange={e => set('video_url', e.target.value)}
              />
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', borderRadius: 10, cursor: uploading ? 'not-allowed' : 'pointer',
                border: '1.5px solid #e2e8f0', background: uploading ? '#f8fafc' : '#fff',
                fontSize: 13, fontWeight: 700, color: uploading ? '#94a3b8' : '#475569',
                height: 42, flexShrink: 0, whiteSpace: 'nowrap', transition: 'all 0.18s'
              }}
                onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#4f46e5'; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = uploading ? '#94a3b8' : '#475569'; }}
              >
                {uploading ? <i className="bx bx-loader-alt bx-spin" /> : <i className="bx bx-video-plus" />}
                {uploading ? 'Upload...' : 'Upload MP4'}
                <input
                  type="file"
                  accept="video/*"
                  style={{ display: 'none' }}
                  disabled={uploading}
                  onChange={async e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 50 * 1024 * 1024) {
                      toast.error('Batas ukuran video maksimal 50MB');
                      return;
                    }
                    setUploading(true);
                    toast.loading('Mengunggah video...', { id: 'vid-up' });
                    const fd = new FormData();
                    fd.append('image', f); // Backend uses 'image' field for uploads
                    try {
                      const token = localStorage.getItem('token');
                      const resp = await fetch(`${ADMIN_API_BASE}/upload`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
                        body: fd,
                      });
                      if (!resp.ok) throw new Error(`${resp.status}`);
                      const res = await resp.json();
                      const url = res.url || res.data?.url;
                      if (url) {
                        set('video_url', url);
                        toast.success('✅ Video berhasil terunggah!', { id: 'vid-up' });
                      } else {
                        throw new Error('No URL returned');
                      }
                    } catch (err) {
                      toast.error('Gagal mengunggah video: ' + err.message, { id: 'vid-up' });
                    } finally {
                      setUploading(false);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
            {form.video_url && (
              <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e8edf4', background: '#000', position: 'relative' }}>
                {isYouTube(form.video_url) ? (
                  <iframe
                    className="video-embed"
                    src={embedUrl(form.video_url)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Video preview"
                  />
                ) : (
                  <video src={formatImage(form.video_url)} controls style={{ width: '100%', maxHeight: 280, display: 'block' }} />
                )}
                <button type="button" onClick={() => set('video_url', '')}
                  style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(220,38,38,0.9)', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 4, zIndex: 10 }}>
                  ✕ Hapus Video
                </button>
              </div>
            )}
          </div>

          {/* Content — Classic Editor */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', marginBottom: 6 }}>
              <label className="ee-label" style={{ marginBottom: 0 }}>
                <i className="bx bx-edit" style={{ marginRight: 4, fontSize: 12 }} />
                Deskripsi / Konten — Classic Editor
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{wc} kata</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>·</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>~{rt} mnt</span>
              </div>
            </div>

            {/* Toolbar */}
            <div className="ee-toolbar">
              {toolbarActions.map((action, i) =>
                action === null
                  ? <div key={i} className="ee-toolbar-sep" />
                  : <TBtn key={i} label={action.label} icon={action.icon} title={action.title} onClick={action.fn} />
              )}
              <div style={{ flex: 1 }} />
              <div className="ee-toolbar-text" style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 600, alignSelf: 'center', letterSpacing: '0.05em' }}>
                MARKDOWN SUPPORTED
              </div>
            </div>

            <textarea
              ref={contentRef}
              className="ee-content-area"
              style={{ borderRadius: '0 0 12px 12px', borderTop: 'none' }}
              placeholder={`Tulis deskripsi materi di sini...\n\n## Apa yang akan dipelajari?\n\nTuliskan ringkasan materi secara jelas dan menarik.\n\n### Tips:\n- Gunakan heading ## dan ### untuk struktur\n- Bold teks penting dengan **teks**\n- Tambahkan list dengan - atau 1.`}
              value={form.content}
              onChange={e => set('content', e.target.value)}
            />
          </div>

          {/* Bottom save bar */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '20px 0', borderTop: '1px solid #f1f5f9' }}>
            <Link to="/admin/education" className="ee-btn ee-btn-ghost" style={{ textDecoration: 'none', display: 'inline-flex' }}>
              Batal
            </Link>
            <button className="ee-btn ee-btn-primary" type="button" onClick={handleSave} disabled={saving}>
              {saving
                ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</>
                : <><i className="bx bx-send" /> {isEdit ? 'Perbarui Materi' : 'Simpan Materi'}</>}
            </button>
          </div>
        </div>

        {/* ══ SIDEBAR ════════════════════════════════════════ */}
        <div className="ee-sidebar">

          {/* Status & Settings */}
          <ESection icon="bx-cog" title="Pengaturan Materi" iconColor="#6366f1">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Toggle
                checked={form.is_active}
                onChange={v => set('is_active', v)}
                label="Aktif (Tampil ke Mitra)"
              />
              <Toggle
                checked={form.is_featured}
                onChange={v => set('is_featured', v)}
                label="Tampilkan sebagai Unggulan ⭐"
              />
            </div>
          </ESection>

          {/* Stats */}
          <ESection icon="bx-stats" title="Statistik Konten" iconColor="#7c3aed">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Jumlah Kata', val: wc.toLocaleString('id-ID'), icon: 'bx-text', color: '#4f46e5' },
                { label: 'Waktu Baca', val: `~${rt} menit`, icon: 'bx-time', color: '#0891b2' },
                { label: 'Paragraf', val: form.content.split(/\n\n+/).filter(Boolean).length || 0, icon: 'bx-paragraph', color: '#16a34a' },
                { label: 'Kategori', val: form.category || '—', icon: 'bx-category', color: '#d97706' },
              ].map(s => (
                <div key={s.label} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    <i className={`bx ${s.icon}`} style={{ marginRight: 2 }} />{s.label}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
          </ESection>

          {/* Video info */}
          {form.video_url && (
            <ESection icon="bx-video" title="Info Video" iconColor="#e879f9" defaultOpen>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
                {isYouTube(form.video_url) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
                      <span style={{ fontWeight: 700, color: '#dc2626' }}>YouTube</span>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, background: '#f8fafc', padding: '6px 10px', borderRadius: 8, wordBreak: 'break-all', color: '#64748b' }}>
                      ID: {getYouTubeId(form.video_url)}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />
                    <span style={{ fontWeight: 700, color: '#6366f1' }}>Self-hosted Video</span>
                  </div>
                )}
              </div>
            </ESection>
          )}

          {/* Tips */}
          <ESection icon="bx-bulb" title="Tips Konten" iconColor="#f59e0b" defaultOpen={false}>
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                '✅ Judul singkat, jelas, dan menarik',
                '✅ Konten minimal 100 kata agar informatif',
                '✅ Tambahkan video YouTube untuk engagement lebih tinggi',
                '✅ Gunakan heading ## untuk struktur yang rapi',
                '✅ Set "Unggulan" untuk materi terpenting',
                '✅ Thumbnail menarik meningkatkan klik mitra',
              ].map((t, i) => (
                <div key={i} style={{ fontSize: 11, color: '#64748b' }}>{t}</div>
              ))}
            </div>
          </ESection>

          {/* Quick save bottom */}
          <div style={{ padding: 18, borderTop: '1px solid #f1f5f9' }}>
            <button className="ee-btn ee-btn-primary" type="button" onClick={handleSave} disabled={saving}
              style={{ width: '100%', justifyContent: 'center' }}>
              {saving
                ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</>
                : <><i className="bx bx-check-circle" /> {isEdit ? 'Perbarui Materi' : 'Simpan Materi'}</>}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ MEDIA PICKER MODAL ═════════════════════════════ */}
      {pickerOpen && (
        <div className="mp2-overlay" onClick={e => { if (e.target === e.currentTarget) setPickerOpen(false); }}>
          <div className="mp2-dialog">
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                  <i className="bx bx-images" style={{ color: '#6366f1', marginRight: 8 }} /> Pustaka Media
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Pilih thumbnail untuk materi</div>
              </div>
              <button type="button" onClick={() => setPickerOpen(false)}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 18 }}>
                ✕
              </button>
            </div>

            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f8fafc', flexShrink: 0, display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <i className="bx bx-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16 }} />
                <input className="ee-input" style={{ paddingLeft: 36 }} placeholder="Cari nama file..."
                  value={mediaSearch}
                  onChange={e => { setMediaSearch(e.target.value); loadMedia(e.target.value); }} />
              </div>
              <button type="button" className="ee-btn ee-btn-ghost ee-btn-sm" onClick={() => loadMedia(mediaSearch)}>
                <i className="bx bx-refresh" /> Muat Ulang
              </button>
            </div>

            <div className="mp2-grid">
              {mediaLoading ? (
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, flexDirection: 'column', gap: 12 }}>
                  <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'ee-spin 0.7s linear infinite' }} />
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Memuat media...</span>
                </div>
              ) : mediaList.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48, color: '#94a3b8' }}>
                  <i className="bx bx-image-alt" style={{ fontSize: 48, display: 'block', marginBottom: 12 }} />
                  <div style={{ fontWeight: 700 }}>Pustaka media kosong</div>
                </div>
              ) : (
                mediaList.filter(m => !m.mime_type?.startsWith('video/')).map(item => {
                  const sel = mediaSel?.id === item.id;
                  return (
                    <div key={item.id} className={`mp2-item ${sel ? 'selected' : ''}`}
                      onClick={() => setMediaSel(sel ? null : item)} title={item.filename}>
                      <img src={formatImage(item.url)} alt={item.filename} loading="lazy" />
                      {sel && <div className="mp2-check"><i className="bx bx-check" style={{ fontSize: 14 }} /></div>}
                      {(item.filename?.endsWith('.webp') || item.mime_type === 'image/webp') && (
                        <div style={{ position: 'absolute', bottom: 5, left: 5, background: 'rgba(79,70,229,0.9)', color: '#fff', fontSize: 8, fontWeight: 900, padding: '1px 5px', borderRadius: 4 }}>WebP</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#fafbff' }}>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                {mediaSel
                  ? <><i className="bx bx-check-circle" style={{ color: '#16a34a', marginRight: 4 }} /><strong style={{ color: '#1e293b' }}>{mediaSel.filename}</strong> dipilih</>
                  : `${mediaList.filter(m => !m.mime_type?.startsWith('video/')).length} gambar tersedia`}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="ee-btn ee-btn-ghost ee-btn-sm" onClick={() => setPickerOpen(false)}>Batal</button>
                <button type="button" className="ee-btn ee-btn-primary ee-btn-sm" disabled={!mediaSel} onClick={confirmPick}>
                  <i className="bx bx-image-add" /> Gunakan Gambar Ini
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
