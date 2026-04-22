import React, { useState, useEffect, useCallback } from 'react';
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

  const refCode = user?.affiliate_ref_code || 'AG-REF';

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchJson(`${AFFILIATE_API_BASE}/links`);
      setLinks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetchJson(`${AFFILIATE_API_BASE}/products`);
      setProducts(Array.isArray(res.data) ? res.data.slice(0, 50) : []);
    } catch (err) {
      console.error(err);
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
          targetURL = `${window.location.origin}/product/${prod.id}`;
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
    } catch (err) {
      toast(err.message || 'Gagal membuat link', 'error');
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
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const buildShareURL = (shortCode) =>
    `${window.location.origin}?ref=${refCode}&lc=${shortCode}`;

  const copyURL = (url) => {
    navigator.clipboard.writeText(url);
    toast('URL disalin ke clipboard!');
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
            Generate <span style={{ background: 'linear-gradient(135deg, #ddb7ff, #b76dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Links</span>
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Buat dan kelola link afiliasi trackable Anda</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
        >
          <span className="material-symbols-outlined text-lg">add_link</span>
          Buat Link Baru
        </button>
      </div>

      {/* Quick Links per user request */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all group flex flex-col justify-between">
              <div>
                <span className="material-symbols-outlined text-purple-400 mb-2">home</span>
                <h4 className="text-white font-bold text-sm">Link Utama Website</h4>
                <p className="text-slate-500 text-[10px] mt-1">Arahkan calon mitra ke halaman beranda AkuGrow.</p>
              </div>
              <button 
                onClick={() => copyURL(`${window.location.origin}?ref=${refCode}`)}
                className="mt-4 w-full py-2 rounded-lg bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider group-hover:bg-purple-600 transition-all"
              >
                Salin Link Utama
              </button>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all group flex flex-col justify-between">
              <div>
                <span className="material-symbols-outlined text-blue-400 mb-2">shopping_bag</span>
                <h4 className="text-white font-bold text-sm">Link Langsung Produk</h4>
                <p className="text-slate-500 text-[10px] mt-1">Arahkan langsung ke halaman detail produk tertentu.</p>
              </div>
              <button 
                 onClick={() => { setShowForm(true); setForm({ ...form, product_id: products[0]?.id || '' })}}
                 className="mt-4 w-full py-2 rounded-lg bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider group-hover:bg-blue-600 transition-all"
              >
                Pilih Produk
              </button>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/50 transition-all group flex flex-col justify-between">
              <div>
                <span className="material-symbols-outlined text-pink-400 mb-2">campaign</span>
                <h4 className="text-white font-bold text-sm">Link Promo Khusus</h4>
                <p className="text-slate-500 text-[10px] mt-1">Link untuk kampanye marketing atau landing page event.</p>
              </div>
              <button 
                onClick={() => copyURL(`${window.location.origin}/promo/special?ref=${refCode}`)}
                className="mt-4 w-full py-2 rounded-lg bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider group-hover:bg-pink-600 transition-all"
              >
                Salin Link Promo
              </button>
          </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-2xl p-6" style={baseStyle}>
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
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Pilih Produk (Opsional)
                </label>
                <select
                  value={form.product_id}
                  onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white border outline-none transition-all focus:border-purple-500"
                  style={{
                    background: 'rgba(12, 19, 36, 0.6)',
                    border: '1px solid rgba(77, 67, 84, 0.3)',
                  }}
                >
                  <option value="">-- Pilih Produk --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
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
    </div>
  );
}
