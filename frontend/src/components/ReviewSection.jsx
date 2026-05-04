import { useState, useEffect } from 'react';
import { PUBLIC_API_BASE, BUYER_API_BASE, fetchJson } from '../lib/api';
import { isAuthenticated } from '../lib/auth';

function StarRating({ rating, size = 16, interactive = false, onRatingChange }) {
    return (
      <div className="flex items-center gap-1">
        {[1,2,3,4,5].map(s => (
          <button 
            key={s} 
            type={interactive ? "button" : "submit"}
            disabled={!interactive}
            onClick={() => interactive && onRatingChange(s)}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
          >
            <svg width={size} height={size} viewBox="0 0 24 24" fill={s <= (rating || 0) ? '#facc15' : '#e5e7eb'}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
        ))}
      </div>
    );
}

export default function ReviewSection({ productID }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [orderID, setOrderID] = useState(null);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
    checkEligibility();
  }, [productID]);

  const fetchReviews = async () => {
    try {
      const res = await fetchJson(`${PUBLIC_API_BASE.replace('/public', '')}/public/products/reviews?product_id=${productID}`);
      setReviews(res || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const checkEligibility = async () => {
    if (!isAuthenticated()) return;
    try {
      const res = await fetchJson(`${BUYER_API_BASE.replace('/buyer', '')}/buyer/products/can-review?product_id=${productID}`);
      setCanReview(res.can_review);
      setOrderID(res.order_id);
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
        await fetchJson(`${BUYER_API_BASE.replace('/buyer', '')}/buyer/products/review`, {
            method: 'POST',
            body: JSON.stringify({
                product_id: productID,
                order_id: orderID,
                rating: newRating,
                comment: newComment
            })
        });
        setShowForm(false);
        setCanReview(false);
        fetchReviews();
        alert('Terima kasih atas ulasan Anda!');
    } catch(e) {
        alert(e.message);
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return <div className="animate-pulse text-gray-400 font-bold uppercase tracking-widest text-[10px]">Memuat ulasan...</div>;

  return (
    <div className="space-y-10">
      {/* Header & Write Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-gray-900">Ulasan Pelanggan ({reviews.length})</h3>
        {canReview && !showForm && (
            <button 
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
            >
                Tulis Ulasan
            </button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
          <form onSubmit={handleSubmit} className="bg-blue-50/50 p-8 rounded-[2rem] border border-blue-100 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-gray-900">Berikan Penilaian Anda</h4>
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><i className="bx bx-x text-2xl"></i></button>
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Rating Bintang</label>
                <StarRating rating={newRating} onRatingChange={setNewRating} size={32} interactive={true} />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Komentar Ulasan</label>
                <textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    required
                    placeholder="Ceritakan pengalaman Anda menggunakan produk ini..."
                    className="w-full bg-white border border-blue-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px] transition-all"
                />
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:bg-gray-300"
              >
                {submitting ? 'Mengirim...' : 'Kirim Ulasan Sekarang'}
              </button>
          </form>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.length === 0 ? (
            <div className="text-center py-20 bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-200">
                <div className="text-4xl mb-4">✍️</div>
                <p className="text-gray-400 font-bold">Belum ada ulasan untuk produk ini.</p>
                <p className="text-[10px] text-gray-300 uppercase tracking-widest mt-1">Jadilah yang pertama memberikan ulasan!</p>
            </div>
        ) : (
            reviews.map(r => (
                <div key={r.id} className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm hover:shadow-md transition-shadow group">
                   <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center font-black text-blue-600 text-xl shadow-sm">
                            {r.buyer?.profile?.full_name?.charAt(0) || "U"}
                         </div>
                         <div>
                             <div className="font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase text-sm tracking-tight">{r.buyer?.profile?.full_name || "User AkuGlow"}</div>
                             <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                                 <i className="bx bxs-check-circle text-green-500"></i> Verified Purchase • {new Date(r.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}
                             </div>
                         </div>
                     </div>
                     <div className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                        <StarRating rating={r.rating} size={12} />
                     </div>
                   </div>
                   <p className="text-gray-600 leading-relaxed font-medium pl-1">"{r.comment}"</p>
                </div>
              ))
        )}
      </div>
    </div>
  );
}
