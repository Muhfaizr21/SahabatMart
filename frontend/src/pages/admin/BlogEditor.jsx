/**
 * BlogEditor.jsx — Classic Editor + Yoast SEO Analyzer
 * Halaman penuh (bukan modal) untuk menulis & mengedit artikel.
 * Route: /admin/blogs/new  |  /admin/blogs/edit/:id
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson, formatImage, getSiteUrl } from '../../lib/api';
import toast from 'react-hot-toast';

/* ─── WebP converter (client-side via Canvas) ──────────────── */
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
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
            // keep original filename but change extension
            const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
            resolve(new File([blob], name, { type: 'image/webp' }));
          },
          'image/webp',
          quality
        );
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

/* ─── helpers ─────────────────────────────────────────────── */
const countWords = (str) => str.trim().split(/\s+/).filter(Boolean).length;
const countSentences = (str) => (str.match(/[^.!?]+[.!?]+/g) || []).length;
const readingTime = (content) => Math.max(1, Math.ceil(countWords(content) / 200));

const slugify = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* SEO scoring engine — Yoast-like rules */
function analyzeSEO(form) {
  const kw = (form.focus_keyword || '').toLowerCase().trim();
  const title = form.title || '';
  const metaTitle = form.meta_title || title;
  const metaDesc = form.meta_description || form.summary || '';
  const content = form.content || '';
  const slug = form.slug || '';
  const summary = form.summary || '';

  const checks = [];

  const add = (key, label, ok, msg) =>
    checks.push({ key, label, ok, msg });

  // Focus Keyword checks
  if (!kw) {
    add('kw_set', 'Focus Keyword', false, 'Belum diatur. Masukkan focus keyword terlebih dahulu.');
  } else {
    add('kw_set', 'Focus Keyword diatur', true, `Focus keyword: "${kw}"`);

    const kwInTitle = title.toLowerCase().includes(kw);
    add('kw_title', 'Keyword di judul', kwInTitle,
      kwInTitle ? 'Focus keyword ditemukan di judul artikel.' : 'Focus keyword tidak ditemukan di judul artikel.');

    const kwInMetaDesc = metaDesc.toLowerCase().includes(kw);
    add('kw_meta', 'Keyword di meta description', kwInMetaDesc,
      kwInMetaDesc ? 'Focus keyword ditemukan di meta description.' : 'Tambahkan focus keyword di meta description.');

    const kwInSlug = slug.includes(kw.replace(/\s+/g, '-'));
    add('kw_slug', 'Keyword di URL/slug', kwInSlug,
      kwInSlug ? 'Focus keyword ditemukan di URL slug.' : 'Sebaiknya masukkan focus keyword di URL slug.');

    const kwInIntro = content.toLowerCase().slice(0, 300).includes(kw);
    add('kw_intro', 'Keyword di paragraf pertama', kwInIntro,
      kwInIntro ? 'Focus keyword ditemukan di 300 karakter pertama.' : 'Masukkan focus keyword lebih awal di konten (paragraf pertama).');

    const totalWords = countWords(content);
    const kwCount = (content.toLowerCase().match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    const kwDensity = totalWords > 0 ? (kwCount / totalWords) * 100 : 0;
    const densityOk = kwDensity >= 0.5 && kwDensity <= 3;
    add('kw_density', `Keyword density (${kwDensity.toFixed(1)}%)`, densityOk,
      densityOk
        ? `Keyword density ${kwDensity.toFixed(1)}% — Sangat baik (0.5%–3%).`
        : kwDensity < 0.5
          ? `Keyword density terlalu rendah (${kwDensity.toFixed(1)}%). Gunakan keyword lebih sering.`
          : `Keyword density terlalu tinggi (${kwDensity.toFixed(1)}%). Kurangi penggunaan keyword.`);

    // H2/H3 dalam content
    const headings = (content.match(/#{2,3}\s+[^\n]+/g) || []);
    const kwInHeadings = headings.some(h => h.toLowerCase().includes(kw));
    add('kw_headings', 'Keyword di subheading', kwInHeadings,
      kwInHeadings ? 'Focus keyword ditemukan di subheading (H2/H3).' : 'Pertimbangkan menambahkan focus keyword di salah satu subheading.');
  }

  // Meta Title
  const mtLen = metaTitle.length;
  add('meta_title_len', `Meta title (${mtLen}/60 karakter)`,
    mtLen >= 30 && mtLen <= 60,
    mtLen === 0 ? 'Meta title belum diisi.' :
    mtLen < 30 ? `Meta title terlalu pendek (${mtLen} karakter). Ideal 30–60 karakter.` :
    mtLen > 60 ? `Meta title terlalu panjang (${mtLen} karakter). Potong di bawah 60 karakter.` :
    `Meta title sempurna (${mtLen} karakter).`);

  // Meta Description
  const mdLen = metaDesc.length;
  add('meta_desc_len', `Meta description (${mdLen}/155 karakter)`,
    mdLen >= 70 && mdLen <= 155,
    mdLen === 0 ? 'Meta description belum diisi.' :
    mdLen < 70 ? `Meta description terlalu pendek (${mdLen} karakter). Ideal 70–155 karakter.` :
    mdLen > 155 ? `Meta description terlalu panjang (${mdLen} karakter). Potong di bawah 155 karakter.` :
    `Meta description sempurna (${mdLen} karakter).`);

  // Content length
  const wc = countWords(content);
  add('content_len', `Panjang konten (${wc} kata)`,
    wc >= 300,
    wc === 0 ? 'Konten masih kosong.' :
    wc < 300 ? `Konten terlalu singkat (${wc} kata). Google menyukai artikel minimal 300 kata.` :
    wc >= 1000 ? `Konten panjang dan komprehensif (${wc} kata). Sangat baik untuk SEO.` :
    `Panjang konten cukup (${wc} kata).`);

  // Has image
  add('has_image', 'Gambar utama', !!form.image,
    form.image ? 'Gambar utama sudah ditambahkan.' : 'Tambahkan gambar utama untuk artikel ini.');

  // Slug length
  add('slug', 'URL slug', !!slug && slug.length <= 75 && slug.length >= 3,
    !slug ? 'URL slug belum diisi.' :
    slug.length > 75 ? `URL slug terlalu panjang (${slug.length} karakter).` :
    `URL slug valid: /${slug}`);

  // Subheadings
  const hasSubheadings = /#{2,3}\s/.test(content);
  add('subheadings', 'Menggunakan subheading (H2/H3)', hasSubheadings,
    hasSubheadings ? 'Subheading ditemukan. Struktur konten terorganisir.' : 'Gunakan subheading (##, ###) untuk mengorganisir konten.');

  // Internal/external links (simple heuristic)
  const hasLinks = /\[.+?\]\(.+?\)/.test(content) || /<a\s/.test(content);
  add('links', 'Mengandung link', hasLinks,
    hasLinks ? 'Ditemukan link dalam konten.' : 'Pertimbangkan menambahkan link internal atau eksternal.');

  // Open Graph
  add('og_image', 'Open Graph image', !!form.og_image || !!form.image,
    form.og_image || form.image ? 'OG image tersedia (digunakan saat share di media sosial).' : 'Tambahkan OG image untuk tampilan yang lebih baik saat dishare di media sosial.');

  const passed = checks.filter(c => c.ok).length;
  const total = checks.length;
  const score = Math.round((passed / total) * 100);

  return { checks, score, passed, total };
}

/* Score color */
function scoreColor(score) {
  if (score >= 75) return '#16a34a';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}
function scoreLabel(score) {
  if (score >= 75) return 'Baik';
  if (score >= 50) return 'Perlu Perbaikan';
  return 'Buruk';
}

/* ─── STYLES ──────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.be * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
.be { min-height: 100vh; background: #f8fafc; }

.be-topbar {
  position: sticky; top: 0; z-index: 100;
  background: #fff;
  border-bottom: 1px solid #e8edf4;
  padding: 0 24px;
  height: 60px;
  display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.be-main { display: flex; gap: 0; }

.be-editor-col {
  flex: 1; min-width: 0;
  padding: 28px 32px;
  max-width: calc(100% - 360px);
}

.be-sidebar {
  width: 360px; flex-shrink: 0;
  background: #fff;
  border-left: 1px solid #e8edf4;
  height: calc(100vh - 60px);
  position: sticky;
  top: 60px;
  overflow-y: auto;
}

.be-card {
  background: #fff;
  border: 1px solid #e8edf4;
  border-radius: 14px;
  margin-bottom: 20px;
  overflow: hidden;
}

.be-card-header {
  padding: 14px 18px;
  border-bottom: 1px solid #f1f5f9;
  display: flex; align-items: center; justify-content: space-between;
  background: #fafbff;
  cursor: pointer;
  user-select: none;
}

.be-card-title {
  font-size: 13px; font-weight: 800; color: #0f172a;
  display: flex; align-items: center; gap: 8px; margin: 0;
}

.be-card-body { padding: 18px; }

.be-label {
  display: block;
  font-size: 11px; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.be-input {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px; color: #1e293b;
  font-family: 'Inter', sans-serif;
  outline: none; transition: border 0.18s;
  background: #fff;
}
.be-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }

.be-title-input {
  width: 100%;
  border: none; outline: none;
  font-size: 28px; font-weight: 900; color: #0f172a;
  font-family: 'Inter', sans-serif;
  background: transparent;
  padding: 8px 0;
  border-bottom: 2px solid #f1f5f9;
  transition: border-color 0.2s;
  line-height: 1.3;
}
.be-title-input:focus { border-bottom-color: #6366f1; }
.be-title-input::placeholder { color: #cbd5e1; }

.be-content-area {
  width: 100%; min-height: 450px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 18px;
  font-size: 14px; line-height: 1.75; color: #1e293b;
  font-family: 'Inter', sans-serif;
  resize: vertical;
  outline: none;
  transition: border 0.18s;
  background: #fff;
}
.be-content-area:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }

.be-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 18px; border-radius: 10px;
  font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.18s;
  border: none;
}
.be-btn-primary { background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; box-shadow: 0 4px 12px rgba(79,70,229,0.25); }
.be-btn-primary:hover { background: linear-gradient(135deg, #4338ca, #4f46e5); transform: translateY(-1px); }
.be-btn-ghost { background: #fff; color: #475569; border: 1.5px solid #e2e8f0; }
.be-btn-ghost:hover { border-color: #6366f1; color: #4f46e5; }
.be-btn-danger { background: #fff; color: #dc2626; border: 1.5px solid #fca5a5; }
.be-btn-danger:hover { background: #fee2e2; }
.be-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }
.be-btn-sm { padding: 6px 12px; font-size: 12px; }

/* ── Toolbar ── */
.be-toolbar {
  display: flex; gap: 4px; flex-wrap: wrap;
  padding: 10px 14px;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-bottom: none;
  border-radius: 12px 12px 0 0;
}
.be-toolbar-btn {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent;
  border-radius: 6px; cursor: pointer;
  color: #475569; font-size: 14px; font-weight: 700;
  transition: all 0.15s;
}
.be-toolbar-btn:hover { background: #e8edf4; color: #1e293b; }
.be-toolbar-sep { width: 1px; background: #e2e8f0; margin: 4px 6px; }

/* ── SEO Check list ── */
.seo-check {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid #f8fafc;
  font-size: 12px;
}
.seo-check:last-child { border-bottom: none; }
.seo-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 2px;
}

/* ── Meta preview ── */
.meta-preview {
  padding: 14px 16px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e8edf4;
  font-family: Arial, sans-serif;
}

/* ── Char counter ── */
.char-bar {
  height: 4px; border-radius: 2px;
  transition: width 0.2s, background 0.2s;
}

/* ── Image upload ── */
.be-img-drop {
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  min-height: 140px;
  display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
  cursor: pointer; transition: border-color 0.2s;
  background: #f8fafc;
}
.be-img-drop:hover { border-color: #6366f1; }

/* ── Sidebar tabs ── */
.sidebar-tab {
  flex: 1; padding: 12px 8px;
  font-size: 12px; font-weight: 700;
  cursor: pointer; border: none; background: transparent;
  border-bottom: 3px solid transparent;
  color: #94a3b8; transition: all 0.18s;
}
.sidebar-tab.active { color: #4f46e5; border-bottom-color: #4f46e5; }

/* ── Media Picker Modal ── */
.mp-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(15,23,42,0.55);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  backdrop-filter: blur(4px);
  animation: mpFadeIn 0.18s ease;
}
@keyframes mpFadeIn { from { opacity: 0; } to { opacity: 1; } }

.mp-dialog {
  background: #fff;
  border-radius: 20px;
  width: 100%; max-width: 900px;
  max-height: 90vh;
  display: flex; flex-direction: column;
  box-shadow: 0 25px 60px rgba(0,0,0,0.25);
  animation: mpSlideUp 0.22s ease;
  overflow: hidden;
}
@keyframes mpSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.mp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px;
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.mp-item {
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  border: 2.5px solid transparent;
  transition: all 0.18s;
  position: relative;
  background: #f1f5f9;
}
.mp-item:hover { border-color: #6366f1; transform: scale(1.03); }
.mp-item.mp-selected { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.2); }
.mp-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.mp-item-check {
  position: absolute; top: 5px; right: 5px;
  width: 22px; height: 22px;
  background: #4f46e5; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 13px;
}

@media (max-width: 1024px) {
  .be-main { flex-direction: column; }
  .be-editor-col { max-width: 100%; padding: 20px 16px; }
  .be-sidebar { position: relative; top: auto; height: auto; width: 100%; border-left: none; border-top: 1px solid #e8edf4; }
}

@media (max-width: 768px) {
  .be-topbar {
    height: auto;
    padding: 12px 16px;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .be-topbar > div {
    width: 100%;
    justify-content: space-between;
  }
  .be-title-input {
    font-size: 20px;
  }
  .be-thumb-row {
    flex-direction: column;
  }
  .be-thumb-row label, .be-thumb-row button {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 576px) {
  .be-toolbar-text {
    display: none;
  }
}
`;

/* ─── TOOLBAR BUTTON ──────────────────────────────────────── */
const TBtn = ({ icon, label, onClick, title }) => (
  <button type="button" className="be-toolbar-btn" onClick={onClick} title={title || label}>
    {icon ? <i className={`bx ${icon}`} style={{ fontSize: 16 }} /> : <span style={{ fontSize: 12 }}>{label}</span>}
  </button>
);

/* ─── CHAR COUNTER BAR ────────────────────────────────────── */
const CharBar = ({ val, min, max }) => {
  const pct = Math.min(100, (val / max) * 100);
  const ok = val >= min && val <= max;
  const over = val > max;
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ background: '#f1f5f9', borderRadius: 2, height: 4, overflow: 'hidden' }}>
        <div className="char-bar" style={{ width: `${pct}%`, background: over ? '#dc2626' : ok ? '#16a34a' : '#f59e0b' }} />
      </div>
      <div style={{ fontSize: 10, color: over ? '#dc2626' : ok ? '#16a34a' : '#f59e0b', marginTop: 3, fontWeight: 600 }}>
        {val}/{max} karakter {ok ? '✓' : over ? '(terlalu panjang)' : `(min ${min})`}
      </div>
    </div>
  );
};

/* ─── SIDEBAR SECTION (collapsible) ─────────────────────── */
const Section = ({ icon, title, iconColor = '#6366f1', children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="be-card" style={{ margin: 0, borderRadius: 0, border: 'none', borderBottom: '1px solid #f1f5f9' }}>
      <div className="be-card-header" onClick={() => setOpen(o => !o)}>
        <h3 className="be-card-title">
          <i className={`bx ${icon}`} style={{ color: iconColor, fontSize: 16 }} />
          {title}
        </h3>
        <i className={`bx bx-chevron-${open ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: 16 }} />
      </div>
      {open && <div className="be-card-body">{children}</div>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN EDITOR COMPONENT
═══════════════════════════════════════════════════════════ */
const EMPTY = {
  id: 0, title: '', slug: '', summary: '', content: '',
  author: 'Admin AkuGlow', category: 'Update', tags: '',
  image: '', status: 'draft',
  meta_title: '', meta_description: '', focus_keyword: '',
  og_image: '', canonical_url: '', no_index: false,
};

const CATEGORIES = ['Update', 'Lifestyle', 'Tips', 'Skincare', 'Promo', 'Tutorial', 'General'];

export default function BlogEditor() {
  const { id } = useParams();         // defined = edit mode
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sideTab, setSideTab] = useState('seo');
  const contentRef = useRef(null);

  // Media Library Picker
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerField, setMediaPickerField] = useState('image'); // 'image' or 'og_image'
  const [mediaList, setMediaList] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaSel, setMediaSel] = useState(null);

  /* Load existing post */
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    fetchJson(`${ADMIN_API_BASE}/blogs?search=&page=1&limit=200`)
      .then(d => {
        const all = d?.data || [];
        const found = all.find(b => String(b.id) === String(id));
        if (found) setForm({ ...EMPTY, ...found });
        else toast.error('Artikel tidak ditemukan');
      })
      .catch(() => toast.error('Gagal memuat artikel'))
      .finally(() => setLoading(false));
  }, [id]);

  /* Auto-slug from title (only when creating new) */
  const set = (key, val) => setForm(prev => {
    const next = { ...prev, [key]: val };
    if (key === 'title' && !isEdit && !prev._slug_manual) {
      next.slug = slugify(val);
    }
    if (key === 'meta_title' || key === 'title') {
      // keep meta_title in sync with title only if user hasn't overridden
      if (key === 'title' && !prev._meta_title_manual) {
        next.meta_title = val.slice(0, 60);
      }
    }
    if (key === 'summary' && !prev._meta_desc_manual) {
      next.meta_description = val.slice(0, 155);
    }
    return next;
  });

  /* Toolbar insert */
  const insertAtCursor = useCallback((before, after = '') => {
    const ta = contentRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.slice(start, end);
    const newVal = ta.value.slice(0, start) + before + selected + after + ta.value.slice(end);
    set('content', newVal);
    // restore selection after React re-render
    requestAnimationFrame(() => {
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
      ta.focus();
    });
  }, []);

  const toolbarActions = [
    { label: 'B', title: 'Bold', fn: () => insertAtCursor('**', '**') },
    { label: 'I', title: 'Italic', action: 'italic', fn: () => insertAtCursor('*', '*') },
    { label: 'U', title: 'Underline', fn: () => insertAtCursor('<u>', '</u>') },
    null,
    { label: 'H2', title: 'Heading 2', fn: () => insertAtCursor('\n## ', '') },
    { label: 'H3', title: 'Heading 3', fn: () => insertAtCursor('\n### ', '') },
    null,
    { icon: 'bx-link', title: 'Link', fn: () => { const url = prompt('URL:'); if (url) insertAtCursor('[', `](${url})`); } },
    { icon: 'bx-image', title: 'Gambar', fn: () => { const url = prompt('URL Gambar:'); if (url) insertAtCursor(`\n![Alt text](${url})\n`); } },
    null,
    { icon: 'bx-list-ul', title: 'Bullet List', fn: () => insertAtCursor('\n- ', '') },
    { icon: 'bx-list-ol', title: 'Numbered List', fn: () => insertAtCursor('\n1. ', '') },
    { icon: 'bx-code-block', title: 'Code Block', fn: () => insertAtCursor('\n```\n', '\n```\n') },
    null,
    { icon: 'bx-horizontal-rule', title: 'Divider', fn: () => insertAtCursor('\n---\n') },
    { icon: 'bxs-quote-left', title: 'Blockquote', fn: () => insertAtCursor('\n> ', '') },
  ];

  /* Load media library */
  const loadMediaLibrary = (search = '') => {
    setMediaLoading(true);
    fetchJson(`${ADMIN_API_BASE}/media?search=${encodeURIComponent(search)}&page=1&limit=60`)
      .then(d => setMediaList(d?.data || []))
      .catch(() => toast.error('Gagal memuat media library'))
      .finally(() => setMediaLoading(false));
  };

  /* Open media picker */
  const openMediaPicker = (field) => {
    setMediaPickerField(field);
    setMediaSel(null);
    setMediaSearch('');
    setMediaPickerOpen(true);
    loadMediaLibrary('');
  };

  /* Pick from media library */
  const confirmMediaPick = () => {
    if (!mediaSel) return;
    const url = mediaSel.url;
    setForm(prev => {
      const next = { ...prev, [mediaPickerField]: url };
      if (mediaPickerField === 'image' && !prev.og_image) next.og_image = url;
      return next;
    });
    setMediaPickerOpen(false);
    toast.success('Gambar dipilih dari pustaka media');
  };

  /* Upload image — convert to WebP first */
  const handleImageUpload = async (e, field = 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Convert to WebP using Canvas
      const webpFile = await convertToWebP(file, 0.88);
      toast.loading(`Mengkonversi ke WebP (${(webpFile.size / 1024).toFixed(0)} KB)...`, { id: 'webp-convert', duration: 2000 });

      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('image', webpFile);
      const resp = await fetch(`${ADMIN_API_BASE}/media/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
        body: fd,
      });
      if (!resp.ok) throw new Error(`Upload gagal (${resp.status})`);
      const res = await resp.json();
      const url = res?.data?.url || res?.imageUrl || res?.url;
      if (url) {
        setForm(prev => {
          const next = { ...prev, [field]: url };
          if (field === 'image' && !prev.og_image) next.og_image = url;
          return next;
        });
        toast.success(`✅ Terupload sebagai WebP!`, { id: 'webp-convert' });
      }
    } catch (err) {
      toast.error('Upload gagal: ' + err.message, { id: 'webp-convert' });
    } finally {
      setUploading(false);
      // reset input
      if (e.target) e.target.value = '';
    }
  };

  /* Save */
  const handleSave = async (statusOverride) => {
    const payload = { ...form };
    if (statusOverride) payload.status = statusOverride;
    if (!payload.title.trim()) { toast.error('Judul artikel wajib diisi'); return; }

    setSaving(true);
    try {
      await fetchJson(`${ADMIN_API_BASE}/blogs/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      toast.success(isEdit ? 'Artikel diperbarui!' : 'Artikel disimpan!');
      navigate('/admin/blogs');
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  /* SEO analysis */
  const seo = analyzeSEO(form);
  const wc = countWords(form.content);
  const rt = readingTime(form.content);
  const sentenceCount = countSentences(form.content);

  /* ── RENDER ─────────────────────────────────────────────── */
  if (loading) return (
    <div className="be" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 14 }}>
      <style>{CSS}</style>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#94a3b8', fontWeight: 700, fontSize: 13 }}>Memuat artikel...</p>
    </div>
  );

  return (
    <div className="be">
      <style>{CSS}</style>

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <div className="be-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/admin/blogs" className="be-btn be-btn-ghost be-btn-sm" style={{ textDecoration: 'none', display: 'inline-flex' }}>
            <i className="bx bx-arrow-back" style={{ fontSize: 15 }} /> Kembali
          </Link>
          <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
              {isEdit ? 'Edit Artikel' : 'Tulis Artikel Baru'}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              {wc} kata · {rt} menit baca
              {form.slug && <span> · <span style={{ fontFamily: 'monospace', color: '#6366f1' }}>/{form.slug}</span></span>}
            </div>
          </div>
        </div>

        {/* SEO Score chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: scoreColor(seo.score) + '15', border: `1.5px solid ${scoreColor(seo.score)}30` }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: scoreColor(seo.score), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff' }}>
              {seo.score}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(seo.score) }}>SEO {scoreLabel(seo.score)}</span>
          </div>

          <select
            value={form.status}
            onChange={e => set('status', e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontWeight: 700, color: '#1e293b', background: '#fff', cursor: 'pointer', outline: 'none' }}
          >
            <option value="draft">📁 Draft</option>
            <option value="published">✅ Published</option>
          </select>

          <button className="be-btn be-btn-ghost be-btn-sm" type="button" onClick={() => handleSave('draft')} disabled={saving}>
            <i className="bx bx-save" /> Simpan Draft
          </button>
          <button className="be-btn be-btn-primary" type="button" onClick={() => handleSave()} disabled={saving}>
            {saving ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-send" /> {form.status === 'published' ? 'Perbarui' : 'Terbitkan'}</>}
          </button>
        </div>
      </div>

      {/* ── MAIN LAYOUT ─────────────────────────────────────── */}
      <div className="be-main">

        {/* ═══ EDITOR COLUMN ══════════════════════════════════ */}
        <div className="be-editor-col">

          {/* Title */}
          <div style={{ marginBottom: 20 }}>
            <input
              className="be-title-input"
              placeholder="Masukkan judul artikel yang menarik..."
              value={form.title}
              onChange={e => set('title', e.target.value)}
              maxLength={255}
            />
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <label className="be-label">URL Slug</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <span style={{ padding: '9px 10px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRight: 'none', borderRadius: '10px 0 0 10px', fontSize: 12, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    /blog/
                  </span>
                  <input
                    className="be-input"
                    style={{ borderRadius: '0 10px 10px 0', fontFamily: 'monospace', fontSize: 12 }}
                    value={form.slug}
                    onChange={e => {
                      setForm(prev => ({ ...prev, slug: slugify(e.target.value), _slug_manual: true }));
                    }}
                    placeholder="url-artikel-anda"
                  />
                </div>
              </div>
              <div>
                <label className="be-label">Penulis</label>
                <input className="be-input" style={{ width: 180 }} value={form.author} onChange={e => set('author', e.target.value)} />
              </div>
              <div>
                <label className="be-label">Kategori</label>
                <select className="be-input" style={{ width: 150 }} value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Featured Image */}
          <div style={{ marginBottom: 20 }}>
            <label className="be-label">
              <i className="bx bx-image" style={{ marginRight: 4, fontSize: 12 }} />
              Gambar Utama (Featured Image)
              {form.image && <span style={{ marginLeft: 8, fontWeight: 500, color: '#16a34a', textTransform: 'none', letterSpacing: 0 }}>✓ WebP tersimpan</span>}
            </label>

            {/* Image preview */}
            {form.image && (
              <div style={{ position: 'relative', marginBottom: 10, borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e8edf4', height: 200 }}>
                <img src={formatImage(form.image)} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 60%)' }} />
                <div style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontFamily: 'monospace', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {form.image.split('/').pop()}
                </div>
                <button type="button"
                  style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(220,38,38,0.9)', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => set('image', '')}
                >
                  <i className="bx bx-trash" style={{ fontSize: 13 }} /> Hapus
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="be-thumb-row" style={{ display: 'flex', gap: 10 }}>
              {/* Upload & convert to WebP */}
              <label style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '10px 14px', borderRadius: 10, cursor: uploading ? 'not-allowed' : 'pointer',
                border: '1.5px solid #e2e8f0', background: uploading ? '#f8fafc' : '#fff',
                fontSize: 13, fontWeight: 700, color: uploading ? '#94a3b8' : '#475569',
                transition: 'all 0.18s',
              }}
                onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#4f46e5'; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = uploading ? '#94a3b8' : '#475569'; }}
              >
                {uploading
                  ? <><i className="bx bx-loader-alt bx-spin" style={{ fontSize: 15 }} /> Mengkonversi & Upload...</>
                  : <><i className="bx bx-upload" style={{ fontSize: 15 }} /> Upload Baru <span style={{ fontSize: 10, background: '#eef2ff', color: '#4f46e5', borderRadius: 4, padding: '1px 6px', fontWeight: 800 }}>→WebP</span></>}
                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'image')}
                  style={{ display: 'none' }} disabled={uploading} />
              </label>

              {/* Pick from Media Library */}
              <button type="button"
                className="be-btn be-btn-ghost"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => openMediaPicker('image')}
              >
                <i className="bx bx-images" style={{ fontSize: 15 }} /> Pustaka Media
              </button>
            </div>

            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="bx bx-info-circle" style={{ fontSize: 12 }} />
              Gambar akan dikonversi otomatis ke format WebP untuk performa optimal
            </div>
          </div>

          {/* Summary */}
          <div style={{ marginBottom: 20 }}>
            <label className="be-label"><i className="bx bx-text" style={{ marginRight: 4, fontSize: 12 }} />Ringkasan (Excerpt)</label>
            <textarea
              className="be-input"
              style={{ height: 80, resize: 'vertical', lineHeight: 1.6 }}
              placeholder="Ringkasan singkat yang muncul di listing blog dan sebagai meta description..."
              value={form.summary}
              onChange={e => {
                setForm(prev => ({
                  ...prev,
                  summary: e.target.value,
                  meta_description: prev._meta_desc_manual ? prev.meta_description : e.target.value.slice(0, 155),
                }));
              }}
              maxLength={300}
            />
          </div>

          {/* Classic Editor Toolbar + Content */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', marginBottom: 6 }}>
              <label className="be-label" style={{ marginBottom: 0 }}>
                <i className="bx bx-edit" style={{ marginRight: 4, fontSize: 12 }} />
                Konten Artikel — Classic Editor
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{wc} kata</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>·</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>~{rt} mnt baca</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>·</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{sentenceCount} kalimat</span>
              </div>
            </div>

            {/* Toolbar */}
            <div className="be-toolbar">
              {toolbarActions.map((action, i) => {
                if (action === null) return <div key={i} className="be-toolbar-sep" />;
                return (
                  <TBtn
                    key={i}
                    label={action.label}
                    icon={action.icon}
                    title={action.title}
                    onClick={action.fn}
                  />
                );
              })}
              <div style={{ flex: 1 }} />
              <div className="be-toolbar-text" style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 600, alignSelf: 'center', letterSpacing: '0.05em' }}>
                MARKDOWN SUPPORTED
              </div>
            </div>

            <textarea
              ref={contentRef}
              className="be-content-area"
              style={{ borderRadius: '0 0 12px 12px', borderTop: 'none' }}
              placeholder={`Tulis konten artikel Anda di sini...\n\n## Gunakan heading untuk struktur yang baik\n\nSertakan focus keyword secara alami di paragraf pertama.\n\n### Tips menulis konten SEO-friendly:\n- Gunakan focus keyword 2–3x per 100 kata\n- Tambahkan internal link ke halaman relevan\n- Tulis minimal 300 kata untuk konten berkualitas`}
              value={form.content}
              onChange={e => set('content', e.target.value)}
            />
          </div>

          {/* Tags */}
          <div style={{ marginBottom: 24 }}>
            <label className="be-label"><i className="bx bx-purchase-tag" style={{ marginRight: 4, fontSize: 12 }} />Tags (pisahkan dengan koma)</label>
            <input className="be-input" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="skincare, tips, akuglow, promo, ..." />
            {form.tags && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {form.tags.split(',').map(t => t.trim()).filter(Boolean).map((t, i) => (
                  <span key={i} style={{ padding: '3px 10px', background: '#eef2ff', color: '#4f46e5', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>#{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Bottom save bar */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '20px 0', borderTop: '1px solid #f1f5f9' }}>
            <Link to="/admin/blogs" className="be-btn be-btn-ghost" style={{ textDecoration: 'none', display: 'inline-flex' }}>
              Batal
            </Link>
            <button className="be-btn be-btn-ghost" type="button" onClick={() => handleSave('draft')} disabled={saving}>
              <i className="bx bx-save" /> Simpan Draft
            </button>
            <button className="be-btn be-btn-primary" type="button" onClick={() => handleSave()} disabled={saving}>
              {saving ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-send" /> {form.status === 'published' ? 'Perbarui Artikel' : 'Terbitkan Artikel'}</>}
            </button>
          </div>
        </div>

        {/* ═══ SIDEBAR ════════════════════════════════════════ */}
        <div className="be-sidebar">
          {/* Tab switcher */}
          <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', background: '#fafbff' }}>
            {[
              { key: 'seo', icon: 'bx-search-alt', label: 'SEO' },
              { key: 'settings', icon: 'bx-cog', label: 'Pengaturan' },
              { key: 'preview', icon: 'bx-desktop', label: 'Preview' },
            ].map(tab => (
              <button
                key={tab.key}
                className={`sidebar-tab ${sideTab === tab.key ? 'active' : ''}`}
                onClick={() => setSideTab(tab.key)}
                type="button"
              >
                <i className={`bx ${tab.icon}`} style={{ display: 'block', fontSize: 18, margin: '0 auto 3px' }} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── SEO TAB ──────────────────────────────────────── */}
          {sideTab === 'seo' && (
            <div>
              {/* Score gauge */}
              <div style={{ padding: '20px 18px', background: 'linear-gradient(135deg, #fafbff, #fff)', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ position: 'relative', width: 70, height: 70, flexShrink: 0 }}>
                    <svg width="70" height="70" viewBox="0 0 70 70">
                      <circle cx="35" cy="35" r="28" fill="none" stroke="#f1f5f9" strokeWidth="7" />
                      <circle cx="35" cy="35" r="28" fill="none"
                        stroke={scoreColor(seo.score)} strokeWidth="7"
                        strokeDasharray={`${(seo.score / 100) * 175.9} 175.9`}
                        strokeLinecap="round"
                        transform="rotate(-90 35 35)"
                        style={{ transition: 'stroke-dasharray 0.4s' }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: scoreColor(seo.score), lineHeight: 1 }}>{seo.score}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: scoreColor(seo.score) }}>
                      SEO {scoreLabel(seo.score)}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                      {seo.passed}/{seo.total} pemeriksaan lolos
                    </div>
                    {form.focus_keyword && (
                      <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', background: '#eef2ff', borderRadius: 20, fontSize: 11, color: '#4f46e5', fontWeight: 700 }}>
                        <i className="bx bx-key" style={{ fontSize: 12 }} />
                        {form.focus_keyword}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Focus keyword input */}
              <Section icon="bx-key" title="Focus Keyword" iconColor="#6366f1" defaultOpen>
                <label className="be-label">Focus Keyword</label>
                <input
                  className="be-input"
                  placeholder="contoh: tips skincare untuk pemula"
                  value={form.focus_keyword}
                  onChange={e => set('focus_keyword', e.target.value)}
                />
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                  Kata kunci utama yang ingin Anda rangking di Google untuk artikel ini.
                </div>
              </Section>

              {/* Meta Title */}
              <Section icon="bx-heading" title="Meta Title" iconColor="#6366f1" defaultOpen>
                <label className="be-label">Meta Title <span style={{ color: '#94a3b8', fontWeight: 500, textTransform: 'none' }}>(maks 60 karakter)</span></label>
                <input
                  className="be-input"
                  placeholder="Judul untuk mesin pencari..."
                  value={form.meta_title}
                  onChange={e => setForm(prev => ({ ...prev, meta_title: e.target.value, _meta_title_manual: true }))}
                  maxLength={70}
                />
                <CharBar val={form.meta_title.length} min={30} max={60} />
              </Section>

              {/* Meta Description */}
              <Section icon="bx-detail" title="Meta Description" iconColor="#6366f1" defaultOpen>
                <label className="be-label">Meta Description <span style={{ color: '#94a3b8', fontWeight: 500, textTransform: 'none' }}>(maks 155 karakter)</span></label>
                <textarea
                  className="be-input"
                  style={{ height: 80, resize: 'vertical', lineHeight: 1.5 }}
                  placeholder="Deskripsi singkat yang muncul di hasil pencarian Google..."
                  value={form.meta_description}
                  onChange={e => setForm(prev => ({ ...prev, meta_description: e.target.value, _meta_desc_manual: true }))}
                  maxLength={170}
                />
                <CharBar val={form.meta_description.length} min={70} max={155} />
              </Section>

              {/* SEO Checks */}
              <Section icon="bx-list-check" title={`Analisis SEO (${seo.passed}/${seo.total})`} iconColor="#16a34a" defaultOpen>
                {seo.checks.map(c => (
                  <div key={c.key} className="seo-check">
                    <div className="seo-dot" style={{ background: c.ok ? '#16a34a' : '#dc2626' }} />
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 12, marginBottom: 2 }}>{c.label}</div>
                      <div style={{ fontSize: 11, color: c.ok ? '#16a34a' : '#dc2626', lineHeight: 1.4 }}>{c.msg}</div>
                    </div>
                  </div>
                ))}
              </Section>
            </div>
          )}

          {/* ── SETTINGS TAB ─────────────────────────────────── */}
          {sideTab === 'settings' && (
            <div>
              <Section icon="bx-category" title="Penerbitan" iconColor="#6366f1" defaultOpen>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="be-label">Status</label>
                    <select className="be-input" value={form.status} onChange={e => set('status', e.target.value)}>
                      <option value="draft">📁 Draft</option>
                      <option value="published">✅ Published</option>
                    </select>
                  </div>
                  <div>
                    <label className="be-label">Kategori</label>
                    <select className="be-input" value={form.category} onChange={e => set('category', e.target.value)}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="be-label">Penulis</label>
                    <input className="be-input" value={form.author} onChange={e => set('author', e.target.value)} />
                  </div>
                </div>
              </Section>

              <Section icon="bx-image" title="Open Graph (Sosial Media)" iconColor="#e879f9" defaultOpen>
                <label className="be-label">OG Image</label>
                <div className="be-img-drop" style={{ height: form.og_image ? 120 : 80 }}>
                  {form.og_image
                    ? <img src={formatImage(form.og_image)} alt="og" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ textAlign: 'center' }}>
                        <i className="bx bx-image-add" style={{ fontSize: 24, color: '#cbd5e1', display: 'block', marginBottom: 4 }} />
                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>OG Image (1200×630px ideal)</span>
                      </div>
                  }
                  <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'og_image')} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                  {form.og_image && (
                    <button type="button" onClick={() => set('og_image', '')}
                      style={{ position: 'absolute', top: 6, right: 6, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer', color: '#dc2626' }}>
                      ✕
                    </button>
                  )}
                </div>
                <button type="button"
                  className="be-btn be-btn-ghost be-btn-sm"
                  style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
                  onClick={() => openMediaPicker('og_image')}
                >
                  <i className="bx bx-images" /> Pilih dari Pustaka Media
                </button>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>Gambar yang tampil saat artikel dibagikan di Facebook, Twitter, WhatsApp, dll.</div>
              </Section>

              <Section icon="bx-link" title="Advanced SEO" iconColor="#0891b2" defaultOpen={false}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label className="be-label">Canonical URL (opsional)</label>
                    <input className="be-input" value={form.canonical_url} onChange={e => set('canonical_url', e.target.value)} placeholder="https://akuglow.com/blog/..." />
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Biarkan kosong jika URL halaman ini sudah benar.</div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.no_index}
                      onChange={e => set('no_index', e.target.checked)}
                      style={{ width: 16, height: 16 }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>noindex — Sembunyikan dari Google</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Gunakan hanya untuk konten yang tidak ingin diindeks mesin pencari.</div>
                    </div>
                  </label>
                </div>
              </Section>

              <Section icon="bx-stats" title="Statistik Konten" iconColor="#7c3aed" defaultOpen>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Jumlah Kata', val: wc.toLocaleString('id-ID'), icon: 'bx-text', color: '#4f46e5' },
                    { label: 'Waktu Baca', val: `~${rt} menit`, icon: 'bx-time', color: '#0891b2' },
                    { label: 'Kalimat', val: sentenceCount, icon: 'bx-pencil', color: '#7c3aed' },
                    { label: 'Paragraf', val: (form.content.split(/\n\n+/).filter(Boolean).length) || 0, icon: 'bx-paragraph', color: '#16a34a' },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                        <i className={`bx ${s.icon}`} style={{ marginRight: 3 }} />{s.label}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* ── PREVIEW TAB ──────────────────────────────────── */}
          {sideTab === 'preview' && (
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Preview Hasil Pencarian Google
              </div>
              <div className="meta-preview">
                {/* URL */}
                <div style={{ fontSize: 12, color: '#1a6b1a', marginBottom: 2 }}>
                  {getSiteUrl().replace('http://','').replace('https://','')} › blog › <span style={{ fontWeight: 600 }}>{form.slug || 'url-artikel'}</span>
                </div>
                {/* Title */}
                <div style={{ fontSize: 17, color: '#1a0dab', fontWeight: 400, marginBottom: 4, lineHeight: 1.3 }}>
                  {form.meta_title || form.title || 'Judul Artikel'}
                </div>
                {/* Description */}
                <div style={{ fontSize: 13, color: '#545454', lineHeight: 1.5 }}>
                  {form.meta_description || form.summary || 'Deskripsi artikel akan muncul di sini. Pastikan mengandung focus keyword dan menarik perhatian pembaca untuk mengklik.'}
                </div>
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '20px 0 12px' }}>
                Preview Share Sosial Media
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', fontFamily: 'Helvetica, sans-serif' }}>
                {(form.og_image || form.image) && (
                  <img src={formatImage(form.og_image || form.image)} alt="og" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                )}
                <div style={{ padding: '10px 12px', background: '#f9f9f9' }}>
                  <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>AKUGLOW.COM</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1c1e21', marginBottom: 4 }}>
                    {form.meta_title || form.title || 'Judul Artikel'}
                  </div>
                  <div style={{ fontSize: 12, color: '#606770', lineHeight: 1.4 }}>
                    {(form.meta_description || form.summary || '').slice(0, 100)}{form.meta_description?.length > 100 ? '...' : ''}
                  </div>
                </div>
              </div>

              {form.no_index && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, fontSize: 12, color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="bx bx-hide" />
                  Artikel ini diset noindex — tidak akan muncul di Google.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ MEDIA LIBRARY PICKER MODAL ═══════════════════════ */}
      {mediaPickerOpen && (
        <div className="mp-overlay" onClick={e => { if (e.target === e.currentTarget) setMediaPickerOpen(false); }}>
          <div className="mp-dialog">
            {/* Header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                  <i className="bx bx-images" style={{ color: '#6366f1', marginRight: 8 }} />
                  Pustaka Media
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  Pilih gambar untuk {mediaPickerField === 'og_image' ? 'Open Graph' : 'gambar utama artikel'}
                </div>
              </div>
              <button type="button" onClick={() => setMediaPickerOpen(false)}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 18 }}>
                ✕
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f8fafc', flexShrink: 0, display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <i className="bx bx-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16 }} />
                <input
                  className="be-input"
                  style={{ paddingLeft: 36 }}
                  placeholder="Cari nama file..."
                  value={mediaSearch}
                  onChange={e => {
                    setMediaSearch(e.target.value);
                    loadMediaLibrary(e.target.value);
                  }}
                />
              </div>
              <button type="button" className="be-btn be-btn-ghost be-btn-sm" onClick={() => loadMediaLibrary(mediaSearch)}>
                <i className="bx bx-refresh" /> Muat Ulang
              </button>
            </div>

            {/* Grid */}
            <div className="mp-grid">
              {mediaLoading ? (
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, flexDirection: 'column', gap: 12 }}>
                  <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Memuat media...</span>
                </div>
              ) : mediaList.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48, color: '#94a3b8' }}>
                  <i className="bx bx-image-alt" style={{ fontSize: 48, display: 'block', marginBottom: 12 }} />
                  <div style={{ fontWeight: 700 }}>Pustaka media kosong</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Upload gambar terlebih dahulu di halaman Media Library</div>
                </div>
              ) : (
                mediaList
                  .filter(m => !m.mime_type?.startsWith('video/'))
                  .map(item => {
                    const sel = mediaSel?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`mp-item ${sel ? 'mp-selected' : ''}`}
                        onClick={() => setMediaSel(sel ? null : item)}
                        title={item.filename}
                      >
                        <img src={formatImage(item.url)} alt={item.filename} loading="lazy" />
                        {sel && (
                          <div className="mp-item-check">
                            <i className="bx bx-check" style={{ fontSize: 14 }} />
                          </div>
                        )}
                        {/* WebP badge */}
                        {(item.filename?.endsWith('.webp') || item.mime_type === 'image/webp') && (
                          <div style={{ position: 'absolute', bottom: 5, left: 5, background: 'rgba(79,70,229,0.9)', color: '#fff', fontSize: 8, fontWeight: 900, padding: '1px 5px', borderRadius: 4, letterSpacing: '0.03em' }}>
                            WebP
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#fafbff' }}>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                {mediaSel
                  ? <><i className="bx bx-check-circle" style={{ color: '#16a34a', marginRight: 4 }} /><strong style={{ color: '#1e293b' }}>{mediaSel.filename}</strong> dipilih</>
                  : `${mediaList.filter(m => !m.mime_type?.startsWith('video/')).length} gambar tersedia`
                }
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="be-btn be-btn-ghost be-btn-sm" onClick={() => setMediaPickerOpen(false)}>
                  Batal
                </button>
                <button
                  type="button"
                  className="be-btn be-btn-primary be-btn-sm"
                  disabled={!mediaSel}
                  onClick={confirmMediaPick}
                >
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

