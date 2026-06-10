import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { fetchJson, AFFILIATE_API_BASE, API_BASE } from '../../lib/api';
import { getStoredUser } from '../../lib/auth';

const toast = (msg, type = 'success') => {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 700;
    background: ${type === 'success' ? '#7c3aed' : '#dc2626'};
    color: white; box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
};

export default function AffiliateLinks() {
  const user = getStoredUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'links';
  const [links, setLinks] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    target_url: '',
    title: '',
    product_id: '',
  });
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  const refCode = (user?.affiliate?.ref_code || user?.affiliate_ref_code || 'AGL-REF').toUpperCase();

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchJson(`${AFFILIATE_API_BASE}/links`);
      setLinks(Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []));
    } catch (_err) {
      console.error(_err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetchJson(`${AFFILIATE_API_BASE}/products`);
      const dataArr = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []);
      setProducts(dataArr.slice(0, 50));
    } catch (_err) {
      console.error(_err);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
    fetchProducts();
  }, [fetchLinks, fetchProducts]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.target_url && !form.product_id) {
      toast('Isi URL target atau pilih produk', 'error');
      return;
    }
    setCreating(true);
    try {
      let targetURL = form.target_url;

      // If product selected, build product URL
      if (form.product_id) {
        const prod = products.find((p) => p.id === form.product_id);
        if (prod) {
          targetURL = `${window.location.origin}/product/${prod.slug || prod.id}`;
        }
      }

      await fetchJson(`${AFFILIATE_API_BASE}/links/create`, {
        method: 'POST',
        body: JSON.stringify({
          target_url: targetURL,
          title: form.title || 'Link Afiliasi',
          product_id: form.product_id || null,
        }),
      });
      toast('Link berhasil dibuat!');
      setShowForm(false);
      setForm({ target_url: '', title: '', product_id: '' });
      fetchLinks();
    } catch (_err) {
      toast(_err.message || 'Gagal membuat link', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus link ini?')) return;
    try {
      await fetchJson(`${AFFILIATE_API_BASE}/links/delete?id=${id}`, { method: 'DELETE' });
      toast('Link dihapus');
      fetchLinks();
    } catch (_err) {
      toast(_err.message, 'error');
    }
  };

  const buildShareURL = (shortCode) =>
    `${window.location.origin}?ref=${refCode}&lc=${shortCode}`;

  const copyURL = (url) => {
    navigator.clipboard.writeText(url);
    toast('URL disalin ke clipboard!');
  };

  const downloadQRCard = () => {
    toast('Sedang mempersiapkan Kartu Referral...');
    // Create an off-screen canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');

    // 1. Draw Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, 800, 1000);
    gradient.addColorStop(0, '#0c0a0f');
    gradient.addColorStop(0.5, '#0f172a');
    gradient.addColorStop(1, '#020617');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 1000);

    // Draw ambient glows
    ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
    ctx.beginPath();
    ctx.arc(150, 150, 250, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
    ctx.beginPath();
    ctx.arc(650, 850, 300, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw Decorative Border / Card Frame
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(40, 40, 720, 920, 40);
    } else {
      ctx.rect(40, 40, 720, 920);
    }
    ctx.stroke();

    // Corner highlights
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 8;
    // Top-Left Corner
    ctx.beginPath();
    ctx.moveTo(100, 40);
    if (ctx.roundRect) {
      ctx.arcTo(40, 40, 40, 100, 40);
    } else {
      ctx.lineTo(40, 40);
      ctx.lineTo(40, 100);
    }
    ctx.lineTo(40, 120);
    ctx.stroke();

    // Top-Right Corner
    ctx.beginPath();
    ctx.moveTo(700, 40);
    if (ctx.roundRect) {
      ctx.arcTo(760, 40, 760, 100, 40);
    } else {
      ctx.lineTo(760, 40);
      ctx.lineTo(760, 100);
    }
    ctx.lineTo(760, 120);
    ctx.stroke();

    // Bottom-Left Corner
    ctx.beginPath();
    ctx.moveTo(40, 880);
    if (ctx.roundRect) {
      ctx.arcTo(40, 960, 100, 960, 40);
    } else {
      ctx.lineTo(40, 960);
      ctx.lineTo(100, 960);
    }
    ctx.lineTo(120, 960);
    ctx.stroke();

    // Bottom-Right Corner
    ctx.beginPath();
    ctx.moveTo(760, 880);
    if (ctx.roundRect) {
      ctx.arcTo(760, 960, 700, 960, 40);
    } else {
      ctx.lineTo(760, 960);
      ctx.lineTo(700, 960);
    }
    ctx.lineTo(680, 960);
    ctx.stroke();

    // 3. Draw Branding Logo or Title
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('AKUGLOW', 400, 130);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('MITRA AFILIASI RESMI', 400, 170);

    // 4. Draw QR Code Container Box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(175, 235, 450, 450, 30);
    } else {
      ctx.rect(175, 235, 450, 450);
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Load QR image
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(window.location.origin + '/register?ref=' + refCode)}`;
    qrImg.src = qrUrl;

    qrImg.onload = () => {
      // Draw QR Image
      ctx.drawImage(qrImg, 200, 260, 400, 400);

      // Draw QR Corner Accents
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 4;
      // top-left
      ctx.beginPath(); ctx.moveTo(215, 260); ctx.lineTo(200, 260); ctx.lineTo(200, 275); ctx.stroke();
      // top-right
      ctx.beginPath(); ctx.moveTo(585, 260); ctx.lineTo(600, 260); ctx.lineTo(600, 275); ctx.stroke();
      // bottom-left
      ctx.beginPath(); ctx.moveTo(215, 660); ctx.lineTo(200, 660); ctx.lineTo(200, 645); ctx.stroke();
      // bottom-right
      ctx.beginPath(); ctx.moveTo(585, 660); ctx.lineTo(600, 660); ctx.lineTo(600, 645); ctx.stroke();

      // 5. Draw Referral Info
      ctx.fillStyle = '#818cf8';
      ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('KODE REFERRAL ANDA', 400, 760);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 64px "Plus Jakarta Sans", sans-serif';
      const spacedCode = refCode.split('').join(' ');
      ctx.fillText(spacedCode, 400, 840);

      ctx.fillStyle = '#64748b';
      ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Scan QR Code untuk bergabung sebagai Mitra', 400, 900);

      // Trigger Download
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `Referral-Card-${refCode}.png`;
        link.href = dataUrl;
        link.click();
        toast('Kartu Referral berhasil diunduh!');
      } catch (err) {
        console.error(err);
        toast('Gagal mengunduh gambar: Cross-Origin restriction', 'error');
      }
    };
    qrImg.onerror = () => {
      toast('Gagal memuat QR Code', 'error');
    };
  };

  const baseStyle = {
    background: 'rgba(35, 41, 60, 0.4)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(77, 67, 84, 0.15)',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white font-['Plus_Jakarta_Sans']">
            {activeTab === 'links' ? (
              <>
                Generate <span style={{ background: 'linear-gradient(135deg, #ddb7ff, #b76dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Links</span>
              </>
            ) : (
              <>
                Kode <span style={{ background: 'linear-gradient(135deg, #ddb7ff, #b76dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Referral</span>
              </>
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {activeTab === 'links' 
              ? 'Buat dan kelola link afiliasi trackable Anda' 
              : 'Bagikan QR Code dan Kode Referral Anda untuk merekrut mitra baru'}
          </p>
        </div>

        {activeTab === 'links' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
          >
            <span className="material-symbols-outlined text-lg">add_link</span>
            Buat Link Baru
          </button>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl max-w-xs sm:max-w-md">
        <button
          onClick={() => setSearchParams({ tab: 'links' })}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
            activeTab === 'links'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/35'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Link Affiliate
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'referral' })}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
            activeTab === 'referral'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/35'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Kode Referral
        </button>
      </div>

      {activeTab === 'referral' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: The grand dynamic QR Card */}
          <div className="lg:col-span-7 rounded-3xl p-8 relative overflow-hidden flex flex-col items-center justify-center text-center shadow-2xl border"
            style={{
              ...baseStyle,
              background: 'linear-gradient(145deg, rgba(30, 27, 75, 0.4), rgba(15, 23, 42, 0.4))',
              borderColor: 'rgba(99, 102, 241, 0.25)',
              boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.1)'
            }}
          >
            {/* Ambient glows */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* AkuGlow Brand Logo */}
            <img 
              src="/akuglow.jpg" 
              alt="AkuGlow Logo" 
              className="h-10 w-auto object-contain brightness-110 mb-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" 
            />

            {/* QR Frame with inner glow and gradient border */}
            <div className="relative p-6 rounded-2xl bg-white/5 border border-white/10 shadow-2xl mb-6">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + '/register?ref=' + refCode)}`} 
                alt="Referral QR Code" 
                className="w-48 h-48 sm:w-56 sm:h-56 rounded-lg border-4 border-[#0c1324]" 
              />
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-400" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-400" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-400" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-400" />
            </div>

            {/* Referral Info */}
            <div className="space-y-2 mb-6">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">
                KODE REFERRAL ANDA
              </span>
              <h2 className="text-3xl font-black text-white tracking-widest uppercase">
                {refCode}
              </h2>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg">
              <button 
                onClick={() => copyURL(refCode)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10 hover:border-white/20 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-lg">content_copy</span>
                Salin Kode
              </button>
              <button 
                onClick={() => copyURL(`${window.location.origin}/register?ref=${refCode}`)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10 hover:border-white/20 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-lg">link</span>
                Salin Link
              </button>
              <button 
                onClick={downloadQRCard}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                Unduh Kartu
              </button>
            </div>
          </div>

          {/* Right: How to use / Info card */}
          <div className="lg:col-span-5 space-y-6">
            {/* Quick Share Info */}
            <div className="p-6 rounded-2xl border bg-white/5 border-white/10" style={baseStyle}>
              <h3 className="text-white font-bold text-base mb-4 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400">help_outline</span>
                Bagaimana Cara Menggunakannya?
              </h3>
              
              <ul className="space-y-4 text-xs text-slate-400">
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center shrink-0">1</div>
                  <p className="leading-relaxed">
                    <strong className="text-white">Scan QR Code:</strong> Calon mitra memindai QR code di samping langsung menggunakan kamera ponsel mereka.
                  </p>
                </li>
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center shrink-0">2</div>
                  <p className="leading-relaxed">
                    <strong className="text-white">Otomatis Terisi:</strong> Mereka akan langsung diarahkan ke halaman pendaftaran mitra dengan kode referral Anda yang otomatis terisi.
                  </p>
                </li>
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center shrink-0">3</div>
                  <p className="leading-relaxed">
                    <strong className="text-white">Bagikan Link/Kode:</strong> Anda juga bisa langsung menyalin Kode Referral Anda atau Link Rekrutmen untuk dibagikan lewat chat.
                  </p>
                </li>
              </ul>
            </div>

            {/* Perks card */}
            <div className="p-6 rounded-2xl border bg-gradient-to-br from-indigo-500/5 to-purple-500/5"
              style={{
                ...baseStyle,
                borderColor: 'rgba(99, 102, 241, 0.15)'
              }}
            >
              <h3 className="text-white font-bold text-base mb-3 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400">military_tech</span>
                Keuntungan Rekrutmen
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Setiap mitra baru yang mendaftar menggunakan referral Anda akan tergabung ke dalam jaringan tim Anda.
                Dapatkan bonus rekrutmen instan serta komisi multi-level dari setiap transaksi belanja tim Anda.
              </p>
              <Link to="/affiliate/status" className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
                Lihat Jenjang Karir & Bonus
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Quick Links per user request */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1 */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group flex flex-col justify-between">
                  <div>
                    <span className="material-symbols-outlined text-indigo-400 mb-2">home</span>
                    <h4 className="text-white font-bold text-sm font-['Plus_Jakarta_Sans']">Link Utama Website</h4>
                    <p className="text-slate-400 text-[11px] mt-2 leading-relaxed font-medium">Arahkan calon mitra ke halaman beranda AkuGlow.</p>
                  </div>
                  <button 
                    onClick={() => copyURL(`${window.location.origin}?ref=${refCode}`)}
                    className="mt-5 w-full py-2.5 rounded-xl bg-white/5 text-slate-300 text-[11px] font-bold uppercase tracking-wider group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 hover:scale-[1.02]"
                  >
                    Salin Link Utama
                  </button>
              </div>

              {/* Card 2 */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="material-symbols-outlined text-emerald-400">group_add</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">NEW</span>
                    </div>
                    <h4 className="text-white font-bold text-sm font-['Plus_Jakarta_Sans']">Link Rekrutmen</h4>
                    <p className="text-slate-400 text-[11px] mt-2 leading-relaxed font-medium">Link khusus pendaftaran mitra baru (Otomatis isi Referral).</p>
                  </div>
                  <button 
                    onClick={() => copyURL(`${window.location.origin}/register?ref=${refCode}`)}
                    className="mt-5 w-full py-2.5 rounded-xl bg-white/5 text-slate-300 text-[11px] font-bold uppercase tracking-wider group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 hover:scale-[1.02]"
                  >
                    Salin Link Daftar
                  </button>
              </div>

              {/* Card 3 */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 group flex flex-col justify-between">
                  <div>
                    <span className="material-symbols-outlined text-blue-400 mb-2">shopping_bag</span>
                    <h4 className="text-white font-bold text-sm font-['Plus_Jakarta_Sans']">Link Langsung Produk</h4>
                    <p className="text-slate-400 text-[11px] mt-2 leading-relaxed font-medium">Arahkan langsung ke halaman detail produk tertentu.</p>
                  </div>
                  <button 
                     onClick={() => { setShowForm(true); setForm({ ...form, product_id: products[0]?.id || '' })}}
                     className="mt-5 w-full py-2.5 rounded-xl bg-white/5 text-slate-300 text-[11px] font-bold uppercase tracking-wider group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 hover:scale-[1.02]"
                  >
                    Pilih Produk
                  </button>
              </div>

              {/* Card 4 */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/40 hover:shadow-lg hover:shadow-pink-500/5 transition-all duration-300 group flex flex-col justify-between">
                  <div>
                    <span className="material-symbols-outlined text-pink-400 mb-2">campaign</span>
                    <h4 className="text-white font-bold text-sm font-['Plus_Jakarta_Sans']">Link Promo Khusus</h4>
                    <p className="text-slate-400 text-[11px] mt-2 leading-relaxed font-medium">Link untuk kampanye marketing atau landing page event.</p>
                  </div>
                  <button 
                    onClick={() => copyURL(`${window.location.origin}/promo/special?ref=${refCode}`)}
                    className="mt-5 w-full py-2.5 rounded-xl bg-white/5 text-slate-300 text-[11px] font-bold uppercase tracking-wider group-hover:bg-pink-600 group-hover:text-white transition-all duration-300 hover:scale-[1.02]"
                  >
                    Salin Link Promo
                  </button>
              </div>
          </div>

          {/* Create Form */}
          {showForm && (
            <div className="rounded-2xl p-6 relative z-50" style={baseStyle}>
              <h3 className="text-white font-bold mb-5 font-['Plus_Jakarta_Sans']">Buat Link Afiliasi Baru</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Judul Link
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="cth: Link Promo Ramadan"
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 border outline-none transition-all focus:border-purple-500"
                    style={{
                      background: 'rgba(12, 19, 36, 0.6)',
                      border: '1px solid rgba(77, 67, 84, 0.3)',
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Pilih Produk (Searchable)
                    </label>
                    
                    {/* Custom Searchable Dropdown */}
                    <div className="relative group">
                      <div 
                        onClick={() => setShowProductSearch(!showProductSearch)}
                        className="w-full px-4 py-3 rounded-xl text-sm text-white border cursor-pointer flex items-center justify-between transition-all hover:bg-white/5"
                        style={{
                          background: 'rgba(12, 19, 36, 0.6)',
                          border: '1px solid rgba(77, 67, 84, 0.3)',
                        }}
                      >
                        <span className={form.product_id ? "text-white font-semibold" : "text-slate-500"}>
                          {form.product_id ? products.find(p => p.id === form.product_id)?.name : "-- Pilih Produk --"}
                        </span>
                        <span className="material-symbols-outlined text-slate-500 transition-transform" style={{ transform: showProductSearch ? 'rotate(180deg)' : 'none' }}>
                          expand_more
                        </span>
                      </div>

                      {showProductSearch && (
                        <div 
                          className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl overflow-hidden border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
                          style={{
                            background: '#1a1f2e',
                            border: '1px solid rgba(124, 58, 237, 0.3)',
                            maxHeight: '300px',
                          }}
                        >
                          <div className="p-2 border-b border-white/5 sticky top-0 bg-[#1a1f2e] z-10">
                            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                              <span className="material-symbols-outlined text-sm text-slate-500">search</span>
                              <input 
                                autoFocus
                                type="text"
                                value={productSearchQuery}
                                onChange={(e) => setProductSearchQuery(e.target.value)}
                                placeholder="Cari nama produk..."
                                className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-slate-600"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>

                          <div className="overflow-y-auto" style={{ maxHeight: '240px' }}>
                            <div 
                              onClick={() => { setForm({ ...form, product_id: '' }); setShowProductSearch(false); }}
                              className="px-4 py-3 text-xs text-slate-400 hover:bg-white/5 cursor-pointer font-bold"
                            >
                              -- Kosongkan Pilihan --
                            </div>
                            {products
                              .filter(p => !productSearchQuery || p.name.toLowerCase().includes(productSearchQuery.toLowerCase()))
                              .map((p) => (
                                <div 
                                  key={p.id}
                                  onClick={() => {
                                    setForm({ ...form, product_id: p.id });
                                    setShowProductSearch(false);
                                    setProductSearchQuery('');
                                  }}
                                  className="px-4 py-3 hover:bg-purple-600/20 cursor-pointer border-b border-white/5 last:border-none flex items-center justify-between group/item"
                                >
                                  <div className="min-w-0 pr-4">
                                    <p className="text-white text-[13px] font-bold truncate group-hover/item:text-purple-300">
                                      {p.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 group-hover/item:text-purple-400">
                                        {p.category}
                                      </span>
                                      <span className="text-[10px] text-amber-500 font-bold">
                                        Rp {Number(p.price).toLocaleString('id-ID')}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="material-symbols-outlined text-sm text-purple-500 opacity-0 group-hover/item:opacity-100">
                                    check_circle
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Atau Masukkan URL Custom
                    </label>
                    <input
                      type="url"
                      value={form.target_url}
                      onChange={(e) => setForm({ ...form, target_url: e.target.value })}
                      placeholder="https://..."
                      disabled={!!form.product_id}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 border outline-none transition-all focus:border-purple-500 disabled:opacity-50"
                      style={{
                        background: 'rgba(12, 19, 36, 0.6)',
                        border: '1px solid rgba(77, 67, 84, 0.3)',
                      }}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
                  >
                    {creating ? (
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-sm">add_link</span>
                    )}
                    {creating ? 'Membuat...' : 'Buat Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-slate-400 border border-slate-600/30 hover:border-slate-500 transition-all"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Links List */}
          <div className="rounded-2xl overflow-hidden" style={baseStyle}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold font-['Plus_Jakarta_Sans']">Link Afiliasi Saya</h3>
                <p className="text-slate-400 text-xs mt-0.5">{links.length} link aktif</p>
              </div>
              <button
                onClick={fetchLinks}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <span className="material-symbols-outlined">refresh</span>
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
              </div>
            ) : links.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <span className="material-symbols-outlined text-5xl mb-3 opacity-30">link_off</span>
                <p className="text-sm font-semibold">Belum ada link afiliasi</p>
                <p className="text-xs mt-1">Klik "Buat Link Baru" untuk memulai</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {links.map((link) => {
                  const shareURL = buildShareURL(link.short_code);
                  return (
                    <div
                      key={link.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-white/3 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: link.is_active ? '#4ade80' : '#64748b' }}
                          />
                          <p className="text-white font-bold text-sm truncate">{link.title || 'Link Afiliasi'}</p>
                        </div>
                        <p className="text-xs text-slate-500 truncate font-mono">{shareURL}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">ads_click</span>
                            {link.clicks_count || 0} klik
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">shopping_cart_checkout</span>
                            {link.conversions_count || 0} konversi
                          </span>
                          <span className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">payments</span>
                            Rp {Number(link.total_commission || 0).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => copyURL(shareURL)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-300 border border-purple-500/30 hover:bg-purple-500/10 transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">content_copy</span>
                          Salin
                        </button>
                        <button
                          onClick={() => handleDelete(link.id)}
                          className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Share Info */}
          <div
            className="p-5 rounded-2xl"
            style={{
              background: 'rgba(124, 58, 237, 0.08)',
              border: '1px solid rgba(124, 58, 237, 0.2)',
            }}
          >
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-purple-400 mt-0.5">info</span>
              <div>
                <p className="text-sm font-bold text-purple-300 mb-1">Cara Kerja Link Afiliasi</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Setiap link memiliki kode unik. Ketika pelanggan mengklik link Anda dan melakukan pembelian,
                  sistem akan otomatis mencatat konversi dan menghitung komisi berdasarkan kategori produk.
                  Cookie berlaku selama 30 hari dari klik pertama.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
