/**
 * PromoEditor.jsx — Classic Editor untuk Materi Promosi Affiliate
 * Route: /admin/promo/new  |  /admin/promo/edit/:id
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

/* ─── STYLES ──────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.pe * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
.pe { min-height: 100vh; background: #f8fafc; }

.pe-topbar {
  position: sticky; top: 0; z-index: 100;
  background: #fff; border-bottom: 1px solid #e8edf4;
  padding: 0 24px; height: 60px;
  display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.pe-main { display: flex; gap: 0; }

.pe-editor-col {
  flex: 1; min-width: 0; padding: 28px 32px;
  max-width: calc(100% - 320px);
}

.pe-sidebar {
  width: 320px; flex-shrink: 0; background: #fff;
  border-left: 1px solid #e8edf4;
  height: calc(100vh - 60px);
  position: sticky; top: 60px; overflow-y: auto;
}

.pe-label {
  display: block; font-size: 11px; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;
}

.pe-input {
  width: 100%; padding: 10px 14px;
  border: 1.5px solid #e2e8f0; border-radius: 10px;
  font-size: 13px; color: #1e293b; outline: none;
  transition: border 0.18s; background: #fff;
  font-family: 'Inter', sans-serif;
}
.pe-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }

.pe-title-input {
  width: 100%; border: none; outline: none;
  font-size: 28px; font-weight: 900; color: #0f172a;
  font-family: 'Inter', sans-serif; background: transparent;
  padding: 8px 0; border-bottom: 2px solid #f1f5f9;
  transition: border-color 0.2s; line-height: 1.3;
}
.pe-title-input:focus { border-bottom-color: #6366f1; }
.pe-title-input::placeholder { color: #cbd5e1; }

.pe-content-area {
  width: 100%; min-height: 380px;
  border: 1.5px solid #e2e8f0; border-radius: 12px;
  padding: 16px 18px; font-size: 14px; line-height: 1.75; color: #1e293b;
  font-family: 'Inter', sans-serif; resize: vertical; outline: none;
  transition: border 0.18s; background: #fff;
}
.pe-content-area:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }

.pe-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 18px; border-radius: 10px;
  font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.18s; border: none;
}
.pe-btn-primary { background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; box-shadow: 0 4px 12px rgba(79,70,229,0.25); }
.pe-btn-primary:hover { background: linear-gradient(135deg, #4338ca, #4f46e5); transform: translateY(-1px); }
.pe-btn-ghost { background: #fff; color: #475569; border: 1.5px solid #e2e8f0; }
.pe-btn-ghost:hover { border-color: #6366f1; color: #4f46e5; }
.pe-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }
.pe-btn-sm { padding: 6px 12px; font-size: 12px; }

.pe-toolbar {
  display: flex; gap: 4px; flex-wrap: wrap;
  padding: 10px 14px; background: #f8fafc;
  border: 1.5px solid #e2e8f0; border-bottom: none;
  border-radius: 12px 12px 0 0;
}
.pe-toolbar-btn {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; border-radius: 6px;
  cursor: pointer; color: #475569; font-size: 14px; font-weight: 700;
  transition: all 0.15s;
}
.pe-toolbar-btn:hover { background: #e8edf4; color: #1e293b; }
.pe-toolbar-sep { width: 1px; background: #e2e8f0; margin: 4px 6px; }

.pe-section { border-bottom: 1px solid #f1f5f9; }
.pe-section-header {
  padding: 14px 18px; display: flex; align-items: center;
  justify-content: space-between; cursor: pointer;
  user-select: none; background: #fafbff;
}
.pe-section-title {
  font-size: 12px; font-weight: 800; color: #0f172a;
  display: flex; align-items: center; gap: 8px; margin: 0;
}
.pe-section-body { padding: 16px 18px; }

/* Media Picker */
.mp3-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(15,23,42,0.55);
  display: flex; align-items: center; justify-content: center;
  padding: 20px; backdrop-filter: blur(4px);
  animation: mp3FadeIn 0.18s ease;
}
@keyframes mp3FadeIn { from { opacity: 0; } to { opacity: 1; } }
.mp3-dialog {
  background: #fff; border-radius: 20px;
  width: 100%; max-width: 860px; max-height: 88vh;
  display: flex; flex-direction: column;
  box-shadow: 0 25px 60px rgba(0,0,0,0.25);
  animation: mp3SlideUp 0.22s ease; overflow: hidden;
}
@keyframes mp3SlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.mp3-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px; padding: 20px; overflow-y: auto; flex: 1;
}
.mp3-item {
  aspect-ratio: 1; border-radius: 12px; overflow: hidden;
  cursor: pointer; border: 2.5px solid transparent;
  transition: all 0.18s; position: relative; background: #f1f5f9;
}
.mp3-item:hover { border-color: #6366f1; transform: scale(1.03); }
.mp3-item.selected { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.2); }
.mp3-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.mp3-check {
  position: absolute; top: 5px; right: 5px; width: 22px; height: 22px;
  background: #4f46e5; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; color: #fff; font-size: 13px;
}

/* Video embed preview */
.video-embed { width: 100%; aspect-ratio: 16/9; border-radius: 12px; border: none; }

/* Toggle switch */
.pe-toggle {
  position: relative; width: 42px; height: 24px; flex-shrink: 0;
}
.pe-toggle input { opacity: 0; width: 0; height: 0; }
.pe-toggle-slider {
  position: absolute; cursor: pointer; inset: 0;
  background: #e2e8f0; border-radius: 24px; transition: 0.25s;
}
.pe-toggle-slider:before {
  position: absolute; content: '';
  height: 18px; width: 18px; left: 3px; bottom: 3px;
  background: white; border-radius: 50%; transition: 0.25s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.pe-toggle input:checked + .pe-toggle-slider { background: #6366f1; }
.pe-toggle input:checked + .pe-toggle-slider:before { transform: translateX(18px); }

@keyframes pe-spin { to { transform: rotate(360deg); } }

@media (max-width: 1024px) {
  .pe-main { flex-direction: column; }
  .pe-editor-col { max-width: 100%; padding: 20px 16px; }
  .pe-sidebar { position: relative; top: auto; height: auto; width: 100%; border-left: none; border-top: 1px solid #e8edf4; }
}

@media (max-width: 768px) {
  .pe-topbar {
    height: auto;
    padding: 12px 16px;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .pe-topbar > div {
    width: 100%;
    justify-content: space-between;
  }
  .pe-title-input {
    font-size: 20px;
  }
  .pe-video-row {
    flex-direction: column;
    align-items: stretch !important;
  }
  .pe-video-row .pe-input {
    width: 100%;
  }
  .pe-video-row label {
    width: 100%;
    justify-content: center;
  }
  .pe-thumb-row {
    flex-direction: column;
  }
  .pe-thumb-row label, .pe-thumb-row button {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 576px) {
  .pe-toolbar-text {
    display: none;
  }
}
`;

const TBtn = ({ icon, label, onClick, title }) => (
  <button type="button" className="pe-toolbar-btn" onClick={onClick} title={title || label}>
    {icon ? <i className={`bx ${icon}`} style={{ fontSize: 16 }} /> : <span style={{ fontSize: 12 }}>{label}</span>}
  </button>
);

const PSection = ({ icon, iconColor = '#6366f1', title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="pe-section">
      <div className="pe-section-header" onClick={() => setOpen(o => !o)}>
        <h3 className="pe-section-title">
          <i className={`bx ${icon}`} style={{ color: iconColor, fontSize: 15 }} />
          {title}
        </h3>
        <i className={`bx bx-chevron-${open ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: 16 }} />
      </div>
      {open && <div className="pe-section-body">{children}</div>}
    </div>
  );
};

const Toggle = ({ checked, onChange, label }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
    <label className="pe-toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="pe-toggle-slider" />
    </label>
    <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{label}</span>
  </label>
);

const EMPTY = {
  id: 0,
  title: '',
  description: '',
  type: 'image',
  category: 'Instagram',
  file_url: '',
  caption: '',
  is_active: true,
};

export default function PromoEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const captionRef = useRef(null);

  // Media Picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mediaList, setMediaList] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaSel, setMediaSel] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    fetchJson(`${ADMIN_API_BASE}/promo`)
      .then(d => {
        const found = (d || []).find(e => String(e.id) === String(id));
        if (found) setForm({ ...EMPTY, ...found });
        else toast.error('Asset promo tidak ditemukan');
      })
      .catch(() => toast.error('Gagal memuat asset promo'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  /* insert markdown link/format in caption */
  const insertAtCursor = useCallback((before, after = '') => {
    const ta = captionRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.slice(s, e);
    const newVal = ta.value.slice(0, s) + before + sel + after + ta.value.slice(e);
    set('caption', newVal);
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
    { icon: 'bx-link', title: 'Link', fn: () => { const u = prompt('URL:'); if (u) insertAtCursor('[', `](${u})`); } },
    { icon: 'bx-list-ul', title: 'Bullet List', fn: () => insertAtCursor('\n- ') },
    { icon: 'bxs-quote-left', title: 'Blockquote', fn: () => insertAtCursor('\n> ') },
    null,
    { icon: 'bx-code', title: 'Code', fn: () => insertAtCursor('`', '`') },
    { icon: 'bx-horizontal-rule', title: 'Divider', fn: () => insertAtCursor('\n---\n') },
  ];

  /* file upload → convert WebP if image */
  const uploadFile = async (file) => {
    setUploading(true);
    toast.loading(`Mengunggah file...`, { id: 'promo-up' });
    try {
      let finalFile = file;
      if (form.type === 'image' && file.type.startsWith('image/')) {
        toast.loading(`Mengkonversi gambar ke WebP...`, { id: 'promo-up' });
        finalFile = await convertToWebP(file, 0.88);
      }

      if (form.type === 'video' && file.size > 50 * 1024 * 1024) {
        toast.error('Batas ukuran video maksimal 50MB', { id: 'promo-up' });
        setUploading(false);
        return;
      }

      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('image', finalFile); // Backend API uses 'image' field for both upload paths

      const resp = await fetch(`${ADMIN_API_BASE}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
        body: fd,
      });

      if (!resp.ok) throw new Error(`${resp.status}`);
      const res = await resp.json();
      const url = res.url || res.data?.url;
      if (url) {
        toast.success(`✅ Berkas terunggah!`, { id: 'promo-up' });
        set('file_url', url);
      }
    } catch (err) {
      toast.error('Gagal mengunggah: ' + err.message, { id: 'promo-up' });
    } finally {
      setUploading(false);
    }
  };

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
    set('file_url', mediaSel.url);
    setPickerOpen(false);
    toast.success('Berkas dipilih dari pustaka media');
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Judul promo wajib diisi'); return; }
    if (form.type !== 'copywriting' && !form.file_url.trim()) { toast.error('URL File / Gambar wajib diisi'); return; }
    if (form.type === 'copywriting' && !form.caption.trim()) { toast.error('Konten teks copywriting wajib diisi'); return; }
    
    setSaving(true);
    try {
      await fetchJson(`${ADMIN_API_BASE}/promo/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      toast.success(isEdit ? 'Promo diperbarui!' : 'Promo ditambahkan!');
      navigate('/admin/promo');
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="pe" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 14 }}>
      <style>{CSS}</style>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'pe-spin 0.7s linear infinite' }} />
      <p style={{ color: '#94a3b8', fontWeight: 700, fontSize: 13 }}>Memuat asset...</p>
    </div>
  );

  return (
    <div className="pe">
      <style>{CSS}</style>

      {/* TOPBAR */}
      <div className="pe-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/admin/promo" className="pe-btn pe-btn-ghost pe-btn-sm" style={{ textDecoration: 'none', display: 'inline-flex' }}>
            <i className="bx bx-arrow-back" style={{ fontSize: 15 }} /> Kembali
          </Link>
          <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
              {isEdit ? 'Edit Asset Promosi' : 'Tambah Asset Baru'}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              Kategori: <strong>{form.category}</strong> · Tipe: <strong>{form.type.toUpperCase()}</strong>
              <span style={{ marginLeft: 8, padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 800, background: form.is_active ? '#dcfce7' : '#fee2e2', color: form.is_active ? '#16a34a' : '#dc2626' }}>
                {form.is_active ? '● Tampil' : '● Hidden'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/admin/promo" className="pe-btn pe-btn-ghost pe-btn-sm" style={{ textDecoration: 'none', display: 'inline-flex' }}>
            Batal
          </Link>
          <button className="pe-btn pe-btn-primary" type="button" onClick={handleSave} disabled={saving || uploading}>
            {saving ? 'Menyimpan...' : 'Simpan Promo'}
          </button>
        </div>
      </div>

      <div className="pe-main">
        {/* EDITOR COL */}
        <div className="pe-editor-col">
          {/* Judul */}
          <div style={{ marginBottom: 20 }}>
            <label className="pe-label">Judul Asset Promosi</label>
            <input
              className="pe-title-input"
              placeholder="Masukkan judul asset promosi..."
              value={form.title}
              onChange={e => set('title', e.target.value)}
              required
            />
          </div>

          {/* Pengaturan Tipe & Kategori */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div>
              <label className="pe-label">Tipe Konten</label>
              <select className="pe-input" value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="image">🖼️ Image (Gambar)</option>
                <option value="video">📽️ Video (MP4)</option>
                <option value="copywriting">✍️ Copywriting Text</option>
              </select>
            </div>
            <div>
              <label className="pe-label">Kategori Platform</label>
              <select className="pe-input" value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="TikTok">TikTok</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Telegram">Telegram</option>
                <option value="Umum">Umum / Lainnya</option>
              </select>
            </div>
          </div>

          {/* Deskripsi Singkat */}
          <div style={{ marginBottom: 20 }}>
            <label className="pe-label">Deskripsi Internal (Opsional)</label>
            <input className="pe-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Misal: Banner diskon 20%, Video review produk, dll." />
          </div>

          {/* File URL / Upload (If not copywriting) */}
          {form.type !== 'copywriting' && (
            <div style={{ marginBottom: 24 }}>
              <label className="pe-label">
                File Link / Media Asset
                {form.file_url && <span style={{ marginLeft: 8, color: '#16a34a', fontWeight: 600, textTransform: 'none' }}>✓ File Terpilih</span>}
              </label>
              
              <div className="pe-video-row" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                <input className="pe-input" style={{ flex: 1 }} placeholder="https://..." value={form.file_url} onChange={e => set('file_url', e.target.value)} />
                
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
                  {uploading ? <i className="bx bx-loader-alt bx-spin" /> : <i className="bx bx-upload" />}
                  {uploading ? 'Uploading...' : 'Upload File'}
                  <input type="file" style={{ display: 'none' }} disabled={uploading} accept={form.type === 'video' ? 'video/*' : 'image/*'}
                    onChange={e => {
                      const f = e.target.files?.[0]; if (f) uploadFile(f);
                      e.target.value = '';
                    }}
                  />
                </label>
                
                {form.type === 'image' && (
                  <button type="button" className="pe-btn pe-btn-ghost" onClick={openPicker}>
                    <i className="bx bx-images" /> Pustaka
                  </button>
                )}
              </div>

              {form.file_url && (
                <div style={{ border: '1.5px solid #e8edf4', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', height: 260, position: 'relative' }}>
                  {form.type === 'video' ? (
                    <video src={formatImage(form.file_url)} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <img src={formatImage(form.file_url)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  )}
                  <button type="button" onClick={() => set('file_url', '')}
                    style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(220,38,38,0.9)', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ✕ Hapus File
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Caption / Copywriting — CLASSIC EDITOR */}
          <div style={{ marginBottom: 24 }}>
            <label className="pe-label">
              {form.type === 'copywriting' ? 'Konten Copywriting' : 'Caption Promosi'} (Classic Editor)
            </label>

            {/* Toolbar */}
            <div className="pe-toolbar">
              {toolbarActions.map((action, i) =>
                action === null
                  ? <div key={i} className="pe-toolbar-sep" />
                  : <TBtn key={i} label={action.label} icon={action.icon} title={action.title} onClick={action.fn} />
              )}
              <div style={{ flex: 1 }} />
              <div className="pe-toolbar-text" style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 600, alignSelf: 'center', letterSpacing: '0.05em' }}>
                MARKDOWN SUPPORTED
              </div>
            </div>

            <textarea
              ref={captionRef}
              className="pe-content-area"
              style={{ borderRadius: '0 0 12px 12px', borderTop: 'none' }}
              placeholder={form.type === 'copywriting' ? "Tulis teks copywriting di sini..." : "Masukkan caption tambahan untuk bahan share mitra affiliate..."}
              value={form.caption}
              onChange={e => set('caption', e.target.value)}
              required={form.type === 'copywriting'}
            />
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="pe-sidebar">
          <PSection icon="bx-cog" title="Pengaturan Tampilan" iconColor="#6366f1">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Toggle
                checked={form.is_active}
                onChange={v => set('is_active', v)}
                label="Aktif (Dapat dilihat mitra)"
              />
            </div>
          </PSection>

          <PSection icon="bx-info-circle" title="Format Copywriting" iconColor="#10b981">
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
              Di halaman affiliate, teks copywriting akan memiliki tombol <strong>"Salin Teks"</strong> agar memudahkan mitra affiliate membagikan materi promosi Anda dengan satu klik.
            </div>
          </PSection>

          <div style={{ padding: 18, borderTop: '1px solid #f1f5f9' }}>
            <button className="pe-btn pe-btn-primary" type="button" onClick={handleSave} disabled={saving || uploading} style={{ width: '100%', justifyContent: 'center' }}>
              {saving ? 'Menyimpan...' : 'Simpan Promo'}
            </button>
          </div>
        </div>
      </div>

      {/* MEDIA PICKER */}
      {pickerOpen && (
        <div className="mp3-overlay" onClick={e => { if (e.target === e.currentTarget) setPickerOpen(false); }}>
          <div className="mp3-dialog">
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                  <i className="bx bx-images" style={{ color: '#6366f1', marginRight: 8 }} /> Pustaka Media
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Pilih gambar promo</div>
              </div>
              <button type="button" onClick={() => setPickerOpen(false)}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 18 }}>
                ✕
              </button>
            </div>

            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f8fafc', flexShrink: 0, display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <i className="bx bx-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16 }} />
                <input className="pe-input" style={{ paddingLeft: 36 }} placeholder="Cari nama file..."
                  value={mediaSearch}
                  onChange={e => { setMediaSearch(e.target.value); loadMedia(e.target.value); }} />
              </div>
              <button type="button" className="pe-btn pe-btn-ghost pe-btn-sm" onClick={() => loadMedia(mediaSearch)}>
                <i className="bx bx-refresh" /> Muat Ulang
              </button>
            </div>

            <div className="mp3-grid">
              {mediaLoading ? (
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, flexDirection: 'column', gap: 12 }}>
                  <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'pe-spin 0.7s linear infinite' }} />
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
                    <div key={item.id} className={`mp3-item ${sel ? 'selected' : ''}`}
                      onClick={() => setMediaSel(sel ? null : item)} title={item.filename}>
                      <img src={formatImage(item.url)} alt={item.filename} loading="lazy" />
                      {sel && <div className="mp3-check"><i className="bx bx-check" style={{ fontSize: 14 }} /></div>}
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
                <button type="button" className="pe-btn pe-btn-ghost ee-btn-sm" onClick={() => setPickerOpen(false)}>Batal</button>
                <button type="button" className="pe-btn pe-btn-primary ee-btn-sm" disabled={!mediaSel} onClick={confirmPick}>
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
