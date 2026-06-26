import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchJson, putJson, postJson, ADMIN_API_BASE } from '../../../lib/api';
import toast from 'react-hot-toast';
import RenderPreview from './RenderPreview';

const PLATFORMS = [
  { key: 'landing_page', label: 'Landing Page', icon: 'web' },
  { key: 'affiliate_dashboard', label: 'Affiliate', icon: 'groups' },
  { key: 'merchant_dashboard', label: 'Merchant', icon: 'store' },
];

const PAGES = [
  { key: 'home', label: 'Beranda', icon: 'home' },
  { key: 'about', label: 'Tentang', icon: 'info' },
  { key: 'shop', label: 'Belanja', icon: 'shopping_bag' },
  { key: 'business', label: 'Bisnis', icon: 'trending_up' },
  { key: 'blog', label: 'Blog', icon: 'article' },
  { key: 'contact', label: 'Kontak', icon: 'mail' },
];

const TABS = [
  { key: 'theme', label: 'Theme', icon: 'palette' },
  { key: 'sections', label: 'Sections', icon: 'layers' },
  { key: 'menu', label: 'Menu', icon: 'menu' },
  { key: 'content', label: 'Konten', icon: 'article' },
];

export default function CMSPlatformEditor() {
  const { platform } = useParams();
  const [tab, setTab] = useState('theme');
  const [theme, setTheme] = useState(null);
  const [sections, setSections] = useState([]);
  const [menu, setMenu] = useState(null);
  const [pageContent, setPageContent] = useState(null);
  const [contentPage, setContentPage] = useState('home');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [livePreview, setLivePreview] = useState(false);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [authSideImage, setAuthSideImage] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s, m, c] = await Promise.all([
        fetchJson(`${ADMIN_API_BASE}/cms/theme?platform=${platform}`),
        fetchJson(`${ADMIN_API_BASE}/cms/sections?platform=${platform}`),
        fetchJson(`${ADMIN_API_BASE}/cms/menus?platform=${platform}`),
        fetchJson(`${ADMIN_API_BASE}/configs`),
      ]);
      setTheme(t); setSections(s || []); setMenu(m);
      if (c && Array.isArray(c)) {
        const found = c.find(cfg => cfg.key === 'auth_side_image');
        if (found) setAuthSideImage(found.value);
      }
    } catch (e) {
      toast.error(e.message || 'Gagal memuat data CMS');
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => { loadAll() }, [loadAll]);

  const uploadAuthImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    try {
      toast.loading('Mengunggah gambar...', { id: 'upload-auth' });
      const token = localStorage.getItem('token');
      const resp = await window.fetch(`${ADMIN_API_BASE}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      });
      if (!resp.ok) throw new Error('Gagal mengunggah gambar');
      const data = await resp.json();
      if (data.url) {
        setAuthSideImage(data.url);
        // Langsung simpan ke backend
        await fetchJson(`${ADMIN_API_BASE}/configs/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([{ key: 'auth_side_image', value: data.url, description: 'Gambar Samping Halaman Autentikasi' }])
        });
        toast.success('Gambar autentikasi berhasil disimpan!', { id: 'upload-auth' });
      } else {
        throw new Error('URL gambar tidak ditemukan');
      }
    } catch (err) {
      toast.error(err.message || 'Gagal mengunggah', { id: 'upload-auth' });
    }
  };

  const DEFAULT_SCHEMAS = {
    home: {
      features: { title: 'Keunggulan Kami', items: [] },
      about_mission: { label: 'Tentang AkuGlow', title: 'Formula Premium Korea untuk Kecantikan Alami Anda.', highlight: 'Kecantikan Alami', desc: 'Kami percaya bahwa setiap orang berhak memiliki kulit sehat dan bercahaya. Dengan standar formulasi dari Korea, kami menghadirkan rangkaian perawatan kulit yang aman, lembut, namun sangat efektif.', image: '/skincare_ingredients.webp' },
      stats: { items: [] },
      testimonials_title: 'Kata Mereka Tentang AkuGlow',
      diagnostic: { label: 'Smart Diagnostic', title: 'Tampil Percaya Diri dengan Kulit Impian Anda.', highlight: 'Kulit Impian', desc: 'Bingung memilih produk yang tepat? Ikuti tes kesehatan kulit kami dan dapatkan rekomendasi produk yang dipersonalisasi khusus untuk Anda.', image: '/skincare_diagnostic.webp' }
    },
    about: {
      hero_title: 'Tentang AkuGlow',
      hero_image: '',
      story: 'AkuGlow lahir dari semangat untuk memberdayakan setiap individu agar memiliki kepercayaan diri melalui kulit yang sehat dan bercahaya. Kami memahami bahwa kecantikan bukan sekadar tampilan luar, melainkan refleksi dari kesehatan dan kebahagiaan batin.\n\nDengan riset mendalam dan kolaborasi bersama para ahli dermatologi, kami menghadirkan rangkaian produk skincare premium yang diformulasikan khusus untuk iklim tropis. Setiap tetes produk kami mengandung bahan aktif berkualitas tinggi yang aman dan teruji.',
      vision: 'Menjadi brand skincare nomor satu yang dipercaya masyarakat Indonesia untuk solusi kecantikan kulit sehat alami yang berkelanjutan.',
      mission: 'Memberikan edukasi kecantikan yang tepat, menyediakan produk berkualitas tinggi dengan harga terjangkau, dan membangun komunitas yang sehat.',
      mission_items: [
          { title: 'Innovation', desc: 'Terus berinovasi dalam menghadirkan formula skincare premium berbasis riset dermatologi terbaru.', icon: 'lightbulb' },
          { title: 'Sustainability', desc: 'Berkomitmen pada praktik bisnis yang berkelanjutan dan penggunaan bahan baku yang ramah lingkungan.', icon: 'sync' },
          { title: 'Empowerment', desc: 'Memberdayakan mitra affiliate kami dengan sistem bagi hasil yang adil dan pelatihan bisnis intensif.', icon: 'person' },
          { title: 'Quality', desc: 'Menjamin setiap produk memiliki standar kualitas tertinggi dan telah lulus uji klinis BPOM.', icon: 'verified' },
          { title: 'Distribution', desc: 'Membangun jaringan distribusi yang efisien untuk memastikan produk sampai ke tangan Anda dengan aman.', icon: 'local_shipping' },
          { title: 'Target', desc: 'Menjadi solusi kecantikan utama bagi seluruh masyarakat Indonesia dengan produk yang inklusif.', icon: 'target' }
      ],
      cards_items: [
          { title: 'Good Quality', desc: 'Produk kami melewati standar kontrol kualitas yang ketat untuk memastikan hasil terbaik bagi kulit Anda.', icon: 'verified' },
          { title: 'Best Service', desc: 'Kami berkomitmen memberikan pelayanan terbaik mulai dari konsultasi hingga dukungan purna jual.', icon: 'volunteer_activism' },
          { title: 'Fast & Save', desc: 'Pengiriman cepat dan terjamin keamanannya ke seluruh wilayah Indonesia dengan partner logistik terpercaya.', icon: 'local_shipping' }
      ],
      values_items: [
          { title: 'Creative and Innovative', desc: 'Solusi cerdas untuk setiap masalah.', icon: 'lightbulb' },
          { title: 'Respect', desc: 'Menghargai setiap perbedaan.', icon: 'handshake' },
          { title: 'Humility', desc: 'Tetap rendah hati dalam kesuksesan.', icon: 'person_check' },
          { title: 'Skillful', desc: 'Keahlian terasah dan profesional.', icon: 'settings' },
          { title: 'Teamwork', desc: 'Sinergi mencapai tujuan bersama.', icon: 'groups' },
          { title: 'Ethics and Integrity', desc: 'Integritas dalam setiap tindakan.', icon: 'shield_check' },
          { title: 'Adaptive', desc: 'Cepat beradaptasi dengan perubahan.', icon: 'sync' }
      ]
    },
    blog: {
      hero_title: 'Blog & Edukasi',
      hero_subtitle: 'Temukan berbagai tips kecantikan, panduan perawatan kulit, dan informasi terbaru.'
    },
    shop: {
      hero_title: 'Katalog Produk',
      hero_subtitle: 'Pilih rangkaian perawatan kulit terbaik untukmu.'
    },
    business: {
      hero_title: 'Peluang Bisnis Skincare Resmi',
      hero_headline: 'Pelanggan Jadi Asetmu, Komisi Masuk Selamanya',
      hero_subtitle: 'Bisnis skincare premium tanpa modal, tanpa stok. Cukup bagikan link, ajak mitra, dan dapatkan penghasilan jutaan rupiah setiap bulan — bahkan saat tidur sekalipun.',
      hero_cta_text: 'Daftar Gratis Sekarang',
      hero_cta_secondary: 'Lihat Simulasi Komisi',
      difference_title: 'Kenapa Bisnis Ini Berbeda?',
      difference_subtitle: 'Tidak ada bisnis lain yang semudah dan sefleksibel ini.',
      how_it_works_title: 'Cara Kerjanya Sangat Simpel',
      how_it_works_subtitle: 'Hanya 4 langkah untuk mulai menghasilkan komisi',
      pricing_title: 'Struktur Komisi Member',
      pricing_subtitle: 'Pilih paket yang sesuai dengan target penghasilan Anda',
      simulation_title: 'Simulasi Potensi Komisi',
      simulation_subtitle: 'Lihat berapa yang bisa Anda hasilkan dengan sistem duplikasi',
      target_title: 'Cocok untuk Siapa?',
      target_subtitle: 'Bisnis ini terbuka untuk semua kalangan',
      cta_final_title: 'Saatnya Bangun Masa Depanmu!',
      cta_final_subtitle: 'Tidak perlu modal besar untuk memulai perubahan. Cukup gunakan produknya, bagikan linknya, dan nikmati komisinya.',
      cta_final_text: 'GABUNG SEKARANG',
      cta_final_secondary: 'Lihat Produk Dulu',
      difference_items: [
        { icon: '🚀', title: 'Tanpa Modal', desc: 'Mulai bisnis 100% gratis, tidak ada biaya apapun.' },
        { icon: '📦', title: 'Tanpa Stok', desc: 'Tidak perlu gudang atau menumpuk barang di rumah.' },
        { icon: '🚚', title: 'Tanpa Kirim', desc: 'Semua pengiriman ke pelanggan diurus oleh pusat.' },
        { icon: '📱', title: 'Cukup dari HP', desc: 'Kelola bisnis kapan saja dan di mana saja.' },
      ],
      how_it_works_items: [
        { num: '01', title: 'Daftar Mitra Gratis', desc: 'Daftar sebagai mitra di AkuGlow.com tanpa biaya apapun. Tidak ada minimum pembelian.' },
        { num: '02', title: 'Ambil Link Unikmu', desc: 'Gunakan link produk atau link pendaftaran unik dari Dashboard Member Anda.' },
        { num: '03', title: 'Bagikan Konten', desc: 'Share ke WhatsApp, TikTok, atau Instagram. Foto & video promosi sudah kami siapkan.' },
        { num: '04', title: 'Komisi Masuk Otomatis', desc: 'Dapatkan komisi otomatis dari setiap transaksi yang terjadi melalui link Anda.' },
      ],
      target_items: [
        { icon: '👩‍🍳', label: 'Ibu Rumah Tangga' },
        { icon: '🎓', label: 'Mahasiswa' },
        { icon: '👨‍💻', label: 'Karyawan Kantoran' },
        { icon: '👩‍🎨', label: 'Freelancer' },
        { icon: '💼', label: 'Pemilik Usaha' },
        { icon: '🌟', label: 'Semua Orang!' },
      ],
      simulations: [
        {
          id: '5',
          title: 'Simulasi Duplikasi 5 Orang',
          desc: 'Asumsi setiap orang mengajak 5 mitra baru dan belanja Rp 250rb/bln.',
          premium: 'Rp 5.250.000',
          free: 'Rp 175.000',
          level_1_name: 'Level 1 (5 org)', level_1_income: 'Rp 187.500',
          level_2_name: 'Level 2 (25 org)', level_2_income: 'Rp 437.500',
          level_3_name: 'Level 3 (125 org)', level_3_income: 'Rp 1.562.500',
          level_4_name: 'Level 4 (625 org)', level_4_income: 'Rp 3.125.000',
          level_5_name: 'Level 5 (3125 org)', level_5_income: 'Rp 7.812.500',
        },
        {
          id: '10',
          title: 'Simulasi Duplikasi 10 Orang',
          desc: 'Asumsi setiap orang mengajak 10 mitra baru dan belanja Rp 250rb/bln.',
          premium: 'Rp 45.000.000+',
          free: 'Rp 850.000',
          level_1_name: 'Level 1 (10 org)', level_1_income: 'Rp 375.000',
          level_2_name: 'Level 2 (100 org)', level_2_income: 'Rp 1.750.000',
          level_3_name: 'Level 3 (1000 org)', level_3_income: 'Rp 12.500.000',
          level_4_name: 'Level 4 (10000 org)', level_4_income: 'Rp 50.000.000',
          level_5_name: 'Level 5 (100000 org)', level_5_income: 'Rp 250.000.000',
        }
      ]
    },
    contact: {
      hero_title: 'Hubungi Kami',
      hero_subtitle: 'Ada pertanyaan atau butuh bantuan? Tim kami siap membantu Anda kapan saja.',
      form_title: 'Kirim Pesan',
      form_name_label: 'Nama Lengkap',
      form_email_label: 'Email',
      form_subject_label: 'Subjek',
      form_message_label: 'Pesan',
      address: 'Jl. Sudirman No. 123, Jakarta Pusat',
      phone: '+62 21 1234 5678',
      email: 'support@akuglow.id'
    }
  };

  const loadContent = useCallback(async (page) => {
    try {
      const d = await fetchJson(`${ADMIN_API_BASE}/cms/page-content?platform=${platform}&page=${page}`);
      let content = d?.content || {};
      const defaultSchema = DEFAULT_SCHEMAS[page] || { title: `Halaman ${page}`, content: 'Konten belum tersedia' };
      
      // Merge content with defaultSchema to ensure new schema fields exist
      const merged = JSON.parse(JSON.stringify(defaultSchema));
      
      // Strict deep merge helper to only keep keys from schema
      const mergeObjects = (target, source) => {
        Object.keys(source).forEach(key => {
          if (target[key] !== undefined) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
              mergeObjects(target[key], source[key]);
            } else {
              target[key] = source[key];
            }
          }
        });
      };
      
      if (Object.keys(content).length > 0) {
        mergeObjects(merged, content);
      }
      
      setPageContent(merged);
    } catch (e) {
      toast.error(e.message || 'Gagal memuat konten');
    }
  }, [platform]);

  useEffect(() => { if (tab === 'content') loadContent(contentPage) }, [tab, contentPage, loadContent]);

  // ─── Theme ───
  const updateTheme = (section, field, value) => {
    setTheme(prev => {
      const next = { ...prev, [section]: { ...prev[section], [field]: value } };
      clearTimeout(window._cms_t_timer);
      window._cms_t_timer = setTimeout(() => doSaveTheme(next), 800);
      return next;
    });
  };

  const doSaveTheme = async (data) => {
    setSaving(true);
    try {
      await putJson(`${ADMIN_API_BASE}/cms/theme/update?platform=${platform}`, data || theme);
    } catch (e) { toast.error(e.message || 'Gagal simpan') }
    finally { setSaving(false) }
  };

  const applyColorPreset = (preset) => {
    setTheme(prev => {
      const next = { ...prev, colors: { ...prev.colors, ...preset } };
      doSaveTheme(next);
      return next;
    });
    toast.success('Warna diterapkan');
  };

  // ─── Sections ───
  const addSection = async (tpl) => {
    try {
      await postJson(`${ADMIN_API_BASE}/cms/sections/create`, {
        platform, page: 'home', key: tpl.key, title: tpl.title,
        variant: tpl.variant || 'default', content: tpl.content || {},
        order: sections.length, is_active: true,
      });
      toast.success(`Section "${tpl.title}" ditambahkan`);
      setShowSectionPicker(false);
      const s = await fetchJson(`${ADMIN_API_BASE}/cms/sections?platform=${platform}`);
      setSections(s || []);
    } catch (e) { toast.error(e.message || 'Gagal') }
  };

  const toggleSection = async (sec) => {
    await putJson(`${ADMIN_API_BASE}/cms/sections/update?id=${sec.id}`, { ...sec, is_active: !sec.is_active });
    setSections(prev => prev.map(s => s.id === sec.id ? { ...s, is_active: !s.is_active } : s));
  };

  const deleteSection = async (id) => {
    if (!confirm('Hapus section ini?')) return;
    await fetchJson(`${ADMIN_API_BASE}/cms/sections/delete?id=${id}`, { method: 'DELETE' });
    setSections(prev => prev.filter(s => s.id !== id));
    toast.success('Section dihapus');
  };

  // ─── Content ───
  const updateContent = (path, value) => {
    const keys = path.split('.');
    const newObj = JSON.parse(JSON.stringify(pageContent));
    let curr = newObj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!curr[keys[i]] || typeof curr[keys[i]] !== 'object') curr[keys[i]] = {};
      curr = curr[keys[i]];
    }
    curr[keys[keys.length - 1]] = value;
    setPageContent(newObj);
    clearTimeout(window._cms_c_timer);
    window._cms_c_timer = setTimeout(async () => {
      try {
        await putJson(`${ADMIN_API_BASE}/cms/page-content/update?platform=${platform}&page=${contentPage}`, { content: newObj });
      } catch (e) { toast.error(e.message || 'Gagal simpan') }
    }, 1200);
  };

  const saveContentNow = async () => {
    try {
      await putJson(`${ADMIN_API_BASE}/cms/page-content/update?platform=${platform}&page=${contentPage}`, { content: pageContent });
      toast.success('Konten tersimpan');
    } catch (e) { toast.error(e.message || 'Gagal') }
  };

  // ─── Menu ───
  const updateMenu = (idx, field, val) => {
    setMenu(prev => {
      const items = [...(prev?.items || [])];
      items[idx] = { ...items[idx], [field]: val };
      return { ...prev, items };
    });
    clearTimeout(window._cms_m_timer);
    window._cms_m_timer = setTimeout(saveMenu, 1000);
  };

  const saveMenu = async () => {
    try {
      await putJson(`${ADMIN_API_BASE}/cms/menus/update?platform=${platform}`, { location: 'main', items: menu?.items || [] });
    } catch (e) { toast.error(e.message || 'Gagal simpan menu') }
  };

  const addMenuItem = () => {
    setMenu(prev => ({ ...prev, items: [...(prev?.items || []), { label: '', url: '#', is_active: true, order: (prev?.items?.length || 0) + 1, children: [] }] }));
  };

  const deleteMenuItem = (idx) => {
    setMenu(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
    setTimeout(saveMenu, 500);
  };

  const sectionTemplates = {
    hero: { key: 'hero', title: 'Hero', content: { headline: 'Judul', cta_text: 'Mulai' } },
    features: { key: 'features', title: 'Fitur', content: { items: [{ icon: 'star', title: 'Fitur 1', desc: '...' }] } },
    testimonials: { key: 'testimonials', title: 'Testimoni', content: { items: [{ name: 'Nama', text: '...' }] } },
    stats: { key: 'stats', title: 'Statistik', content: { items: [{ value: '100+', label: 'User' }] } },
    pricing: { key: 'pricing', title: 'Harga', content: { plans: [{ name: 'Basic', price: '99rb' }] } },
    faq: { key: 'faq', title: 'FAQ', content: { items: [{ question: '?', answer: '...' }] } },
    cta: { key: 'cta', title: 'CTA', variant: 'accent', content: { headline: 'Ayo Mulai', button_text: 'Daftar' } },
    footer: { key: 'footer', title: 'Footer', variant: 'dark', content: { copyright: '© 2024' } },
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-sm text-slate-400">Memuat...</p></div>
    </div>
  );

  const activePlatform = PLATFORMS.find(p => p.key === platform);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* TOP BAR */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin/cms" className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined text-xl">arrow_back</span></Link>
            <div className="flex items-center gap-2">
              {PLATFORMS.map(p => (
                <Link key={p.key} to={`/admin/cms/${p.key}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${p.key === platform ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  <span className="material-symbols-outlined text-sm">{p.icon}</span>
                  {p.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLivePreview(!livePreview)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${livePreview ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <span className="material-symbols-outlined text-sm">{livePreview ? 'visibility' : 'visibility_off'}</span>
              {livePreview ? 'Preview Nyala' : 'Live Preview'}
            </button>
            <Link to={
              platform === 'affiliate_dashboard' ? '/affiliate' : 
              platform === 'merchant_dashboard' ? '/merchant' : 
              (tab === 'content' ? (
                contentPage === 'home' ? '/' : 
                contentPage === 'business' ? '/peluang-bisnis' : 
                `/${contentPage}`
              ) : '/')
            } target="_blank"
              className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">open_in_new</span> Tab Baru
            </Link>
            <span className={`text-[10px] ${saving ? 'text-indigo-600 font-semibold' : 'text-slate-400'}`}>{saving ? 'Menyimpan...' : ''}</span>
          </div>
        </div>
        {/* TABS */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <span className="material-symbols-outlined text-sm">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* ──────── THEME TAB ──────── */}
        {tab === 'theme' && theme && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Warna</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { name: 'Default', colors: { primary: '#4f46e5', secondary: '#7c3aed', accent: '#f59e0b' } },
                  { name: 'Dark', colors: { primary: '#818cf8', secondary: '#a78bfa', accent: '#fbbf24', background: '#0f172a', text: '#f1f5f9', muted: '#94a3b8', border: '#334155', card: '#1e293b' } },
                  { name: 'Nature', colors: { primary: '#059669', secondary: '#0d9488', accent: '#eab308' } },
                  { name: 'Rose', colors: { primary: '#e11d48', secondary: '#be185d', accent: '#fbbf24' } },
                ].map(p => (
                  <button key={p.name} onClick={() => applyColorPreset(p.colors)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-300 text-xs font-semibold text-slate-700 flex items-center gap-2">
                    <div className="flex -space-x-1">{['primary', 'secondary', 'accent'].map(k => <div key={k} className="w-3 h-3 rounded-full border border-white" style={{ background: p.colors[k] }} />)}</div>
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['primary', 'secondary', 'accent', 'background', 'text', 'muted', 'border', 'card', 'success', 'warning', 'error'].map(k => (
                  <div key={k}>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">{k}</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={theme.colors?.[k] || '#000'} onChange={e => updateTheme('colors', k, e.target.value)}
                        className="w-8 h-8 rounded border border-slate-200 cursor-pointer shrink-0" />
                      <input value={theme.colors?.[k] || ''} onChange={e => updateTheme('colors', k, e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-mono outline-none focus:border-indigo-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Font & Ukuran</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{ key: 'font_family', label: 'Font Body' }, { key: 'heading_font', label: 'Font Judul' }, { key: 'base_size', label: 'Ukuran Dasar' }].map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">{f.label}</label>
                    <input value={theme.typography?.[f.key] || ''} onChange={e => updateTheme('typography', f.key, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Custom CSS</p>
              <textarea value={theme.custom_css || ''} onChange={e => setTheme(prev => { const n = { ...prev, custom_css: e.target.value }; clearTimeout(window._cms_t_timer); window._cms_t_timer = setTimeout(() => doSaveTheme(n), 800); return n; })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono outline-none focus:border-indigo-400 h-32 resize-y" placeholder="/* CSS tambahan */" />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gambar Autentikasi (Global)</p>
              <p className="text-[10px] text-slate-500 mb-3">Gambar ini akan tampil di halaman Login & Register untuk seluruh platform.</p>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden relative shrink-0">
                  {authSideImage ? (
                    <img src={authSideImage} alt="Auth Side" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-slate-300 text-3xl">image</span>
                  )}
                  <input type="file" accept="image/*" onChange={uploadAuthImage} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <div className="text-xs text-slate-500">
                  <p className="mb-1">Rekomendasi ukuran: <b>800x1200 px (Portrait)</b>.</p>
                  <p>Format yang didukung: JPG, PNG, WEBP.</p>
                  <p className="mt-2 text-indigo-600 font-semibold cursor-pointer relative overflow-hidden inline-block">
                    Pilih Gambar
                    <input type="file" accept="image/*" onChange={uploadAuthImage} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──────── SECTIONS TAB ──────── */}
        {tab === 'sections' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-slate-500">{sections.length} section{sections.length !== 1 ? 's' : ''}</p>
              <button onClick={() => setShowSectionPicker(true)}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">add</span> Tambah
              </button>
            </div>
            {showSectionPicker && (
              <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowSectionPicker(false)}>
                <div className="bg-white rounded-xl max-w-lg w-full max-h-[70vh] overflow-y-auto p-4" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-3"><p className="text-sm font-bold">Pilih Template</p><button onClick={() => setShowSectionPicker(false)} className="text-slate-400"><span className="material-symbols-outlined">close</span></button></div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(sectionTemplates).map(([k, t]) => (
                      <button key={k} onClick={() => addSection(t)}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-300 text-center">
                        <span className="material-symbols-outlined text-xl text-indigo-500 mb-1">{k === 'hero' ? 'responsive' : k === 'features' ? 'grid_view' : k === 'testimonials' ? 'format_quote' : k === 'stats' ? 'bar_chart' : k === 'pricing' ? 'sell' : k === 'faq' ? 'help' : k === 'cta' ? 'ads_click' : 'call_to_action'}</span>
                        <p className="text-[10px] font-bold text-slate-700">{t.title}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {sections.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-2">layers</span>
                <p className="text-sm text-slate-500 mb-3">Belum ada section</p>
                <button onClick={() => setShowSectionPicker(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold">Tambah Section</button>
              </div>
            ) : (
              <div className="space-y-2">
                {sections.map(sec => (
                  <div key={sec.id} className={`bg-white rounded-xl border ${sec.is_active ? 'border-slate-200' : 'border-red-100 bg-red-50/30'} p-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-300 text-sm">drag_indicator</span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{sec.title || sec.key}</p>
                        <p className="text-[10px] text-slate-400">{sec.key} · {sec.variant}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleSection(sec)} className={`p-1.5 rounded-lg ${sec.is_active ? 'text-emerald-600' : 'text-slate-300'}`}>
                        <span className="material-symbols-outlined text-lg">{sec.is_active ? 'toggle_on' : 'toggle_off'}</span>
                      </button>
                      <button onClick={() => deleteSection(sec.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ──────── MENU TAB ──────── */}
        {tab === 'menu' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-slate-500">Menu Utama</p>
              <button onClick={addMenuItem} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">add</span> Item
              </button>
            </div>
            {(!menu?.items || menu.items.length === 0) ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-2">menu</span>
                <p className="text-sm text-slate-500 mb-3">Belum ada item menu</p>
                <button onClick={addMenuItem} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold">Tambah Item</button>
              </div>
            ) : (
              <div className="space-y-2">
                {menu.items.map((item, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center gap-2">
                      <input value={item.label} onChange={e => updateMenu(idx, 'label', e.target.value)}
                        placeholder="Nama" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
                      <input value={item.url} onChange={e => updateMenu(idx, 'url', e.target.value)}
                        placeholder="/link" className="w-40 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono outline-none focus:border-indigo-400" />
                      <button onClick={() => deleteMenuItem(idx)} className="p-1.5 text-slate-400 hover:text-red-600">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ──────── CONTENT TAB ──────── */}
        {tab === 'content' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                {PAGES.map(p => (
                  <button key={p.key} onClick={() => { setContentPage(p.key); setPageContent(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${contentPage === p.key ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <span className="material-symbols-outlined text-sm">{p.icon}</span>
                    {p.label}
                  </button>
                ))}
              </div>
              <button onClick={saveContentNow} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 ml-4">
                <span className="material-symbols-outlined text-sm">save</span> Simpan Konten
              </button>
            </div>
            {pageContent && Object.keys(pageContent).length > 0 ? (
              <div className={`flex gap-4 ${livePreview ? '' : ''}`}>
                <div className={livePreview ? 'w-1/2' : 'w-full'}>
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <ContentFields data={pageContent} path="" onChange={updateContent} />
                  </div>
                </div>
                {livePreview && (
                  <div className="w-1/2">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden sticky top-24">
                      <div className="bg-slate-800 text-white text-[10px] px-3 py-1.5 flex items-center gap-2">
                        <span className="material-symbols-outlined text-xs">preview</span> Preview — {contentPage}
                      </div>
                      <div className="p-4 text-sm max-h-[70vh] overflow-y-auto space-y-4 preview-content relative">
                        <RenderPreview data={pageContent} platform={platform} page={contentPage} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-2">article</span>
                <p className="text-sm text-slate-500">Memuat konten...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ContentFields({ data, path, onChange, level = 0 }) {
  if (!data || typeof data !== 'object') return null;
  
  return Object.entries(data).map(([key, val]) => {
    const fullPath = path ? `${path}.${key}` : key;
    const displayKey = key.replace(/_/g, ' ').toUpperCase();
    
    if (Array.isArray(val)) {
      return (
        <div key={fullPath} className="mb-6 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-500 text-sm">view_list</span>
            <span className="text-xs font-black text-slate-700 tracking-wide">{displayKey}</span>
            <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">{val.length} items</span>
          </div>
          <div className="p-4 space-y-4 bg-slate-50/50">
            {val.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm relative transition-all duration-200 hover:shadow-md hover:border-indigo-300">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl opacity-50"></div>
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 rounded-t-xl flex justify-between items-center">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Item {i + 1}</span>
                </div>
                <div className="p-4 grid gap-3">
                  <ContentFields data={item} path={`${fullPath}.${i}`} onChange={onChange} level={level + 1} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    if (typeof val === 'object' && val !== null) {
      return (
        <div key={fullPath} className="mb-5">
          <label className="text-xs font-bold text-slate-700 uppercase block mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-indigo-500">folder_open</span> 
            {displayKey}
          </label>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-slate-300 rounded-l-xl"></div>
            <ContentFields data={val} path={fullPath} onChange={onChange} level={level + 1} />
          </div>
        </div>
      );
    }
    
    // Determine if it should be a text area based on length or key semantics
    const isTextArea = String(val || '').length > 50 || ['desc', 'story', 'vision', 'mission', 'subtitle'].some(k => key.toLowerCase().includes(k));
    const isIcon = key.toLowerCase().includes('icon');
    
    return (
      <div key={fullPath} className="mb-4 group">
        <label className="text-[11px] font-bold text-slate-500 block mb-1.5 flex items-center gap-1.5 transition-colors group-focus-within:text-indigo-600">
          <span className="material-symbols-outlined text-[14px]">{isIcon ? 'emoji_objects' : 'edit_square'}</span>
          <span className="capitalize">{key.replace(/_/g, ' ')}</span>
        </label>
        <div className="relative">
          {isTextArea ? (
            <textarea value={val || ''} onChange={e => onChange(fullPath, e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 min-h-[80px] resize-y" 
              placeholder={`Masukkan ${key.replace(/_/g, ' ')}...`}
            />
          ) : (
            <div className="relative flex items-center">
              {isIcon && (
                 <span className="absolute left-3 text-slate-400 material-symbols-outlined text-[18px] pointer-events-none">interests</span>
              )}
              <input value={val || ''} onChange={e => onChange(fullPath, e.target.value)}
                className={`w-full bg-slate-50 border border-slate-200 rounded-lg ${isIcon ? 'pl-10' : 'px-3'} py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10`} 
                placeholder={`Masukkan ${key.replace(/_/g, ' ')}...`}
              />
            </div>
          )}
        </div>
      </div>
    );
  });
}

// Removed inline RenderPreview since it's now imported
