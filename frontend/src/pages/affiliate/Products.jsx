import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchJson, AFFILIATE_API_BASE, formatImage } from '../../lib/api';
import { getStoredUser } from '../../lib/auth';

const formatRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

export default function AffiliateProducts() {
  const user = getStoredUser();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const refCode = user?.affiliate_ref_code || user?.affiliate?.ref_code || 'SM-REF';

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchJson(`${AFFILIATE_API_BASE}/products`);
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const generateLink = (product) => {
    return `${window.location.origin}/product/${product.id}?ref=${refCode}`;
  };

  const copyLink = (product) => {
    navigator.clipboard.writeText(generateLink(product));
    setCopiedId(product.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase()) ||
    p.store_name?.toLowerCase().includes(search.toLowerCase())
  );

  const baseStyle = {
    background: 'rgba(35, 41, 60, 0.4)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(77, 67, 84, 0.15)',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white font-['Plus_Jakarta_Sans']">
          Top <span style={{ background: 'linear-gradient(135deg, #ddb7ff, #b76dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Produk</span>
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Produk terlaris untuk dipromosikan — klik untuk salin link afiliasi
        </p>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={baseStyle}
      >
        <span className="material-symbols-outlined text-slate-500">search</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari produk, kategori, atau toko..."
          className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-slate-600"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-500 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>

      {/* Stats Banner */}
      <div
        className="p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{
          background: 'rgba(124, 58, 237, 0.08)',
          border: '1px solid rgba(124, 58, 237, 0.2)',
        }}
      >
        <div>
          <p className="text-xs font-bold text-purple-400 tracking-widest uppercase mb-1">
            Kode Referral Aktif
          </p>
          <p className="text-xl font-black text-white tracking-widest">{refCode}</p>
        </div>
        <div className="text-xs text-slate-400">
          <p>Setiap pembelian melalui link Anda = komisi otomatis</p>
          <p className="mt-1">Cookie aktif 30 hari setelah klik</p>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={baseStyle}>
              <div className="h-44 bg-slate-800/50" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-slate-700/50 rounded w-3/4" />
                <div className="h-3 bg-slate-700/50 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500" style={baseStyle}>
          <span className="material-symbols-outlined text-5xl mb-3 opacity-30">search_off</span>
          <p className="font-semibold">Produk tidak ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((product) => {
            const imgSrc = formatImage(product.image);
            const isCopied = copiedId === product.id;
            const commRate = product.comm_rate ? `${(product.comm_rate * 100).toFixed(1)}%` : '5%';

            return (
              <div
                key={product.id}
                className="rounded-2xl overflow-hidden group hover:scale-[1.02] transition-all duration-300 cursor-pointer flex flex-col"
                style={baseStyle}
              >
                {/* Image */}
                <div className="h-44 overflow-hidden relative bg-slate-800/50">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-slate-600">image</span>
                    </div>
                  )}
                  {/* Commission badge */}
                  <div
                    className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[10px] font-black tracking-wider"
                    style={{ background: 'rgba(124, 58, 237, 0.9)', color: 'white' }}
                  >
                    {commRate} komisi
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex-1 mb-3">
                    <h4 className="text-white font-bold text-sm leading-tight line-clamp-2 mb-1">
                      {product.name}
                    </h4>
                    <p className="text-slate-500 text-xs">{product.store_name}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-amber-400 font-black text-sm">
                        {formatRp(product.price)}
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">sell</span>
                        {product.total_sold || 0} terjual
                      </span>
                    </div>
                    {product.category && (
                      <span
                        className="inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                        style={{ background: 'rgba(183, 109, 255, 0.15)', color: '#ddb7ff' }}
                      >
                        {product.category}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => copyLink(product)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={
                      isCopied
                        ? { background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80' }
                        : { background: 'rgba(124, 58, 237, 0.15)', color: '#ddb7ff', border: '1px solid rgba(124, 58, 237, 0.3)' }
                    }
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isCopied ? 'check_circle' : 'content_copy'}
                    </span>
                    {isCopied ? 'Disalin!' : 'Salin Link Afiliasi'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
