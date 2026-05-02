import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson, deleteJson, formatImage } from '../../lib/api';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total_pages: 1, total: 0 });
  const limit = 20;

  useEffect(() => {
    fetchReviews();
  }, [page]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await fetchJson(`${ADMIN_API_BASE}/reviews?page=${page}&limit=${limit}`);
      
      if (res && res.data) {
        setReviews(res.data || []);
        setMeta({ 
          total_pages: res.total_pages || 1, 
          total: res.total || 0 
        });
      } else {
        setReviews(res || []);
      }
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      alert("Gagal menghapus ulasan");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Ulasan Produk</h1>
          <p className="text-gray-500 text-sm mt-1">Pantau semua ulasan dan rating produk dari pembeli ({meta.total} Total)</p>
        </div>
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
                        <button 
                          onClick={() => handleDelete(review.id)}
                          className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg transition-colors"
                          title="Hapus Ulasan"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination UI */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
              <span className="text-xs text-gray-500">Halaman {page} dari {meta.total_pages}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`p-2 rounded-lg border transition-all ${page === 1 ? 'bg-gray-100 text-gray-400 border-gray-100' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-500 hover:text-blue-600'}`}
                >
                  <span className="material-symbols-outlined text-sm block">chevron_left</span>
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(meta.total_pages, p + 1))}
                  disabled={page === meta.total_pages}
                  className={`p-2 rounded-lg border transition-all ${page === meta.total_pages ? 'bg-gray-100 text-gray-400 border-gray-100' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-500 hover:text-blue-600'}`}
                >
                  <span className="material-symbols-outlined text-sm block">chevron_right</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
