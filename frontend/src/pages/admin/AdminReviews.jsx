import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ADMIN_API_BASE, fetchJson, deleteJson, postJson, putJson, formatImage } from '../../lib/api';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total_pages: 1, total: 0 });
  const limit = 20;

  const [showModal, setShowModal] = useState(false);
  const [editReview, setEditReview] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const searchTimer = useRef(null);

  const isEditing = editReview !== null;

  useEffect(() => {
    fetchReviews();
  }, [page]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await fetchJson(`${ADMIN_API_BASE}/reviews?page=${page}&limit=${limit}`);
      if (res && Array.isArray(res.data)) {
        setReviews(res.data);
        setMeta({ total_pages: res.total_pages || 1, total: res.total || 0 });
      } else if (Array.isArray(res)) {
        setReviews(res);
      } else {
        setReviews([]);
      }
    } catch (_err) {
      console.error(_err);
      alert("Gagal memuat ulasan");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus ulasan ini? Rating produk akan dikalkulasi ulang.")) return;
    try {
      await deleteJson(`${ADMIN_API_BASE}/reviews/delete?id=${id}`);
      fetchReviews();
    } catch (_err) {
      alert("Gagal menghapus ulasan");
    }
  };

  const searchProducts = useCallback((q) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q || q.length < 2) { setProductResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetchJson(`${ADMIN_API_BASE}/products?search=${encodeURIComponent(q)}&limit=10`);
        if (res && Array.isArray(res.data)) setProductResults(res.data);
      } catch (_err) { /* silent */ }
    }, 300);
  }, []);

  const handleSubmit = async () => {
    if (!isEditing && !selectedProduct) { alert("Pilih produk terlebih dahulu"); return; }
    if (!comment.trim()) { alert("Komentar wajib diisi"); return; }
    setSubmitting(true);
    try {
      if (isEditing) {
        await putJson(`${ADMIN_API_BASE}/reviews/update`, {
          id: editReview.id,
          rating,
          comment: comment.trim(),
          buyer_name: buyerName.trim() || undefined,
        });
      } else {
        await postJson(`${ADMIN_API_BASE}/reviews/fake`, {
          product_id: selectedProduct.id,
          rating,
          comment: comment.trim(),
          buyer_name: buyerName.trim() || undefined,
        });
      }
      setShowModal(false);
      setEditReview(null);
      setSelectedProduct(null);
      setProductSearch('');
      setProductResults([]);
      setBuyerName('');
      setComment('');
      setRating(5);
      fetchReviews();
    } catch (_err) {
      alert(_err.message || "Gagal menyimpan review");
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setEditReview(null);
    setSelectedProduct(null);
    setProductSearch('');
    setProductResults([]);
    setBuyerName('');
    setComment('');
    setRating(5);
    setShowModal(true);
  };

  const openEditModal = (review) => {
    setEditReview(review);
    setSelectedProduct({ id: review.product_id, name: review.product_name });
    setProductSearch(review.product_name);
    setProductResults([]);
    setBuyerName(review.buyer?.profile?.full_name || '');
    setComment(review.comment || '');
    setRating(review.rating);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Ulasan Produk</h1>
          <p className="text-gray-500 text-sm mt-1">Pantau semua ulasan dan rating produk dari pembeli ({meta.total} Total)</p>
        </div>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all">
          <span className="material-symbols-outlined text-sm">rate_review</span>
          Buat Review Palsu
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat data...</div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <span className="material-symbols-outlined text-5xl mb-3 opacity-30">reviews</span>
            <p className="font-bold">Belum ada ulasan</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Pembeli & Waktu</th>
                    <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Produk</th>
                    <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Ulasan</th>
                    <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reviews.map(review => (
                    <tr key={review.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 align-top">
                        <p className="font-bold text-gray-900 text-sm">{review.buyer?.profile?.full_name || 'User'}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(review.created_at).toLocaleDateString('id-ID')}</p>
                      </td>
                      <td className="p-4 align-top max-w-[200px]">
                        <p className="font-bold text-gray-900 text-sm line-clamp-2">{review.product_name}</p>
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex text-amber-400 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: i < review.rating ? "'FILL' 1" : "'FILL' 0" }}>
                              star
                            </span>
                          ))}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-3">{review.comment}</p>
                        {review.image_url && (
                          <div className="mt-3">
                            <a href={formatImage(review.image_url)} target="_blank" rel="noreferrer">
                              <img src={formatImage(review.image_url)} alt="Review" className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditModal(review)} className="text-indigo-500 hover:text-indigo-700 bg-indigo-50 p-2 rounded-lg transition-colors" title="Edit Ulasan">
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button onClick={() => handleDelete(review.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg transition-colors" title="Hapus Ulasan">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
              <span className="text-xs text-gray-500">Halaman {page} dari {meta.total_pages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={`p-2 rounded-lg border transition-all ${page === 1 ? 'bg-gray-100 text-gray-400 border-gray-100' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-500 hover:text-indigo-600'}`}>
                  <span className="material-symbols-outlined text-sm block">chevron_left</span>
                </button>
                <button onClick={() => setPage(p => Math.min(meta.total_pages, p + 1))} disabled={page === meta.total_pages} className={`p-2 rounded-lg border transition-all ${page === meta.total_pages ? 'bg-gray-100 text-gray-400 border-gray-100' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-500 hover:text-indigo-600'}`}>
                  <span className="material-symbols-outlined text-sm block">chevron_right</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showModal && createPortal(
<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-white text-2xl">{isEditing ? 'edit' : 'rate_review'}</span>
                  <div>
                    <h2 className="text-lg font-black text-white">{isEditing ? 'Edit Review' : 'Buat Review Palsu'}</h2>
                    <p className="text-indigo-200 text-xs">{isEditing ? 'Ubah rating dan komentar review' : 'Review akan langsung tampil di halaman produk'}</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{isEditing ? 'Nama Pembeli' : 'Nama Pembeli (opsional — admin akan jadi reviewer jika dikosongkan)'}</label>
                <input
                  type="text"
                  placeholder="Ketik nama pembeli..."
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Produk</label>
                {isEditing ? (
                  <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-xl text-sm font-medium">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {selectedProduct?.name}
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Ketik minimal 2 huruf..."
                      value={productSearch}
                      onChange={e => { setProductSearch(e.target.value); searchProducts(e.target.value); }}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                    {productResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {productResults.map(p => (
                          <button
                            key={p.id}
                            onClick={() => { setSelectedProduct(p); setProductSearch(p.name); setProductResults([]); }}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0"
                          >
                            <span className="font-medium">{p.name}</span>
                            <span className="text-gray-400 ml-2 text-xs">{p.sku || ''}</span>
                          </button>
                        ))}
                      </div>,
        document.body
      )}
                    {selectedProduct && !productResults.length && (
                      <div className="mt-2 flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        {selectedProduct.name}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setRating(n)} className="p-1 transition-all hover:scale-110">
                      <span className={`material-symbols-outlined text-3xl ${n <= rating ? 'text-amber-400' : 'text-gray-300'}`} style={{ fontVariationSettings: n <= rating ? "'FILL' 1" : "'FILL' 0" }}>
                        star
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Komentar</label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={4}
                  placeholder="Tulis ulasan di sini..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all">
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || (!isEditing && !selectedProduct) || !comment.trim()}
                className="px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menyimpan...
                  </span>
                ) : isEditing ? 'Simpan Perubahan' : 'Buat Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
