import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BUYER_API_BASE, fetchJson, postJson, uploadFile, API_BASE, formatImage, formatPaymentMethod } from '../lib/api';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Review State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedItemForReview, setSelectedItemForReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImage, setReviewImage] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Dispute State
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeAmount, setDisputeAmount] = useState('');
  const [disputeImage, setDisputeImage] = useState(null);
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const handleSubmitDispute = async () => {
    if (!disputeReason.trim()) {
      alert("Alasan komplain tidak boleh kosong");
      return;
    }
    const amt = parseFloat(disputeAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Nominal pengembalian dana tidak valid");
      return;
    }
    if (amt > order.grand_total) {
      alert(`Nominal pengembalian tidak boleh melebihi total pesanan (Rp${order.grand_total?.toLocaleString('id')})`);
      return;
    }
    setSubmittingDispute(true);
    try {
      let imageUrl = "";
      if (disputeImage) {
        const uploadRes = await uploadFile(`${API_BASE}/api/buyer/upload`, disputeImage, 'image');
        if (uploadRes && uploadRes.url) {
          imageUrl = uploadRes.url;
        }
      }
      await postJson(`${BUYER_API_BASE}/orders/dispute`, {
        order_id: id,
        reason: disputeReason,
        amount: amt,
        attachments: imageUrl ? [imageUrl] : []
      });
      alert("Komplain berhasil diajukan!");
      setDisputeModalOpen(false);
      loadDetail();
    } catch (_err) {
      alert(_err.message || "Gagal mengajukan komplain");
    } finally {
      setSubmittingDispute(false);
    }
  };

  const handleOpenReview = (item) => {
    setSelectedItemForReview(item);
    setReviewRating(5);
    setReviewComment('');
    setReviewImage(null);
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      alert("Komentar ulasan tidak boleh kosong");
      return;
    }
    setSubmittingReview(true);
    try {
      let imageUrl = "";
      if (reviewImage) {
        const uploadRes = await uploadFile(`${API_BASE}/api/buyer/upload`, reviewImage, 'image');
        if (uploadRes && uploadRes.url) {
          imageUrl = uploadRes.url;
        }
      }

      await postJson(`${BUYER_API_BASE}/products/review`, {
        product_id: selectedItemForReview.product_id,
        merchant_id: selectedItemForReview.merchant_id || "00000000-0000-0000-0000-000000000000",
        order_id: data.order.id,
        order_item_id: selectedItemForReview.id || "00000000-0000-0000-0000-000000000000",
        rating: reviewRating,
        comment: reviewComment,
        image_url: imageUrl
      });

      alert("Ulasan berhasil dikirim!");
      setReviewModalOpen(false);
      loadDetail(); // Refresh order data to update review buttons
    } catch (_err) {
      alert(_err.message || "Gagal mengirim ulasan, mungkin Anda sudah memberikan ulasan untuk produk ini.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCancelOrder = async () => {
    const reason = prompt("Alasan pembatalan (opsional):");
    if (reason === null) return; // Cancel prompt

    try {
      setLoading(true);
      await postJson(`${BUYER_API_BASE}/orders/cancel`, {
        order_id: id,
        reason: reason || "Dibatalkan oleh pembeli"
      });
      alert("Pesanan berhasil dibatalkan");
      loadDetail();
    } catch (_err) {
      alert(_err.message || "Gagal membatalkan pesanan");
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async () => {
    try {
      setLoading(true);
      const res = await fetchJson(`${BUYER_API_BASE}/orders/detail?id=${id}`);
      setData(res);
    } catch (_err) {
      console.error(_err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data?.order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <h2 className="text-2xl font-black text-gray-900 mb-4">Pesanan Tidak Ditemukan</h2>
        <Link to="/profile?tab=orders" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">Kembali ke Riwayat</Link>
      </div>
    );
  }

  const { order, payment } = data;

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/profile?tab=orders" className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-blue-50 transition-colors">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">Detail Pesanan</h1>
            <p className="text-sm text-gray-400 font-medium">Nomor: <span className="font-bold text-gray-800">#{String(order.id).substring(0,8).toUpperCase()}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Saat Ini</p>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-black ${
                    order.status === 'completed' ? 'bg-green-50 text-green-600' : 
                    order.status === 'shipped' ? 'bg-blue-50 text-blue-600' : 
                    order.status === 'cancelled' ? 'bg-red-50 text-red-600' : 
                    order.status === 'disputed' ? 'bg-amber-50 text-amber-600' : 
                    order.status === 'refunded' ? 'bg-gray-100 text-gray-600' : 
                    'bg-orange-50 text-orange-600'}`}>
                    {order.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tanggal Pesanan</p>
                  <p className="font-bold text-gray-900">{new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            </div>

            {/* Merchant Groups */}
            {order.merchant_groups?.map((group, gidx) => (
              <div key={gidx} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50/50 px-8 py-4 border-b border-gray-50 flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </div>
                  <h3 className="font-black text-gray-900 text-sm uppercase tracking-wide">{group.merchant?.merchant_name || 'Toko AkuGlow'}</h3>
                </div>
                <div className="p-8 space-y-6">
                  {group.items?.map((item, iidx) => (
                    <div key={iidx} className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-50 rounded-2xl border border-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {item.product_image_url ? (
                          <img src={formatImage(item.product_image_url)} alt={item.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-200">
                            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-sm leading-tight mb-1">{item.product_name}</h4>
                        <p className="text-xs text-gray-400 mb-2">{item.variant_name}</p>
                        <div className="flex justify-between items-end">
                          <p className="text-xs text-gray-500 font-bold">{item.quantity}x <span className="text-gray-900">Rp{item.unit_price?.toLocaleString('id')}</span></p>
                          <p className="font-black text-gray-900 text-sm">Rp{(item.unit_price * item.quantity).toLocaleString('id')}</p>
                        </div>
                        {item.is_downloadable && item.downloadable_files && (() => {
                          let files = [];
                          try {
                            files = JSON.parse(item.downloadable_files || '[]');
                          } catch (e) {
                            files = [];
                          }
                          if (files.length === 0) return null;
                          return (
                            <div className="mt-3 p-3 bg-violet-50/70 border border-violet-100 rounded-2xl">
                              <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">download</span>
                                File Unduhan Digital
                              </p>
                              <div className="flex flex-col gap-1.5">
                                {files.map((file, fidx) => (
                                  <a key={fidx} href={file.file_url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs text-violet-700 font-bold hover:text-violet-900 transition-colors">
                                    <span className="material-symbols-outlined text-sm">download_for_offline</span>
                                    {file.name || `Unduh File ${fidx + 1}`}
                                  </a>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                        {item.purchase_note && (
                          <div className="mt-3 p-3 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-start gap-2 text-blue-700">
                            <span className="material-symbols-outlined text-base mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                            <div className="flex-1 text-xs">
                              <p className="font-black uppercase tracking-wider text-[10px] text-blue-500 mb-0.5">Catatan Pembelian</p>
                              <p className="font-semibold whitespace-pre-line leading-relaxed">{item.purchase_note}</p>
                            </div>
                          </div>
                        )}
                        {order.status === 'completed' && item.enable_reviews !== false && (
                          <div className="mt-3">
                            {item.is_reviewed ? (
                              <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-4 py-2 rounded-xl border border-green-100 w-fit">
                                <i className="bx bxs-check-circle text-lg"></i>
                                <span className="text-[10px] font-black uppercase tracking-widest">Ulasan Terkirim</span>
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleOpenReview(item)}
                                className="bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 shadow-sm"
                              >
                                Beri Ulasan
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar / Summary */}
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
              <h3 className="font-black text-gray-900 text-lg mb-6">Ringkasan</h3>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Subtotal</span>
                  <span className="text-gray-900 font-bold">Rp{order.subtotal?.toLocaleString('id')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Ongkos Kirim</span>
                  <span className="text-gray-900 font-bold">Rp{order.total_shipping_cost?.toLocaleString('id')}</span>
                </div>
                {order.total_discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Diskon</span>
                    <span className="text-green-600 font-bold">-Rp{order.total_discount?.toLocaleString('id')}</span>
                  </div>
                )}
                <div className="pt-4 border-t border-gray-50 flex justify-between">
                  <span className="text-gray-900 font-black">Total</span>
                  <span className="text-blue-600 font-black text-lg">Rp{order.grand_total?.toLocaleString('id')}</span>
                </div>
              </div>
              
                <div className="space-y-3">
                  {order.status === 'pending_payment' && (
                    <>
                      {order.expired_at && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-2xl border border-red-100 text-red-600 mb-2">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          <p className="text-[11px] font-bold">
                            Batas Bayar: {new Date(order.expired_at).toLocaleString('id-ID', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })} WIB
                          </p>
                        </div>
                      )}
                      <button 
                      onClick={() => {
                        if (payment?.checkout_url) {
                          window.location.href = payment.checkout_url;
                        } else {
                          alert("Link pembayaran belum siap, silakan coba beberapa saat lagi.");
                        }
                      }}
                      className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
                    >
                      Bayar Sekarang
                      </button>
                    </>
                  )}
                  
                  <Link 
                    to={`/invoice/${order.id}`}
                    className="w-full bg-white text-gray-900 border border-gray-100 font-black py-4 rounded-2xl shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-2 4H8v-4h8v4z"/></svg>
                    Cetak Invoice
                  </Link>

                  {(order.status === 'pending_payment' || order.status === 'paid' || order.status === 'processing') && (
                    <button 
                      onClick={handleCancelOrder}
                      className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-2xl border border-red-100 hover:bg-red-600 hover:text-white transition-all text-xs"
                    >
                      Batalkan Pesanan
                    </button>
                  )}

                  {(order.status === 'shipped' || order.status === 'delivered' || order.status === 'completed' || order.status === 'refund_requested') && (
                    <button 
                      onClick={() => {
                        setDisputeReason('');
                        setDisputeAmount(order.grand_total || 0);
                        setDisputeImage(null);
                        setDisputeModalOpen(true);
                      }}
                      className="w-full bg-amber-50 text-amber-700 font-bold py-3 rounded-2xl border border-amber-200 hover:bg-amber-600 hover:text-white transition-all text-xs"
                    >
                      Ajukan Komplain
                    </button>
                  )}
                 </div>
            </div>

            {/* Payment Info */}
            {payment && (
              <div className="bg-blue-50 rounded-[2rem] p-8 border border-blue-100">
                <h3 className="font-black text-blue-900 text-lg mb-4">Pembayaran</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Metode</p>
                    <p className="font-bold text-blue-900">{formatPaymentMethod(payment.payment_name || payment.payment_method)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Status</p>
                    <p className="font-bold text-blue-900 uppercase">{payment.status}</p>
                  </div>
                  {payment.pay_code && (
                    <div className="bg-white rounded-xl p-3 border border-blue-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Kode Bayar</p>
                      <p className="text-lg font-black text-gray-900 tracking-wider">{payment.pay_code}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Shipping Address */}
            <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
               <h3 className="font-black text-gray-900 text-lg mb-4">Alamat Kirim</h3>
               <p className="font-bold text-gray-900 text-sm mb-1">{order.shipping_name}</p>
               <p className="text-xs text-gray-400 font-bold mb-3">{order.shipping_phone}</p>
               <p className="text-xs text-gray-500 leading-relaxed font-medium">
                 {order.shipping_address}, {order.shipping_city}, {order.shipping_province} {order.shipping_postal_code}
               </p>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {reviewModalOpen && selectedItemForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl relative">
            <button 
              onClick={() => setReviewModalOpen(false)}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
            <h2 className="text-xl font-black text-gray-900 mb-6">Beri Ulasan</h2>
            
            <div className="flex gap-4 items-center mb-6 bg-gray-50 p-4 rounded-2xl">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                 <span className="material-symbols-outlined text-gray-300">image</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm line-clamp-1">{selectedItemForReview.product_name}</p>
                <p className="text-xs text-gray-500">{selectedItemForReview.variant_name}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className={`material-symbols-outlined text-3xl transition-colors ${star <= reviewRating ? 'text-amber-400' : 'text-gray-200'}`}
                      style={{ fontVariationSettings: star <= reviewRating ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      star
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Komentar</label>
                <textarea 
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  rows="3"
                  placeholder="Bagaimana kualitas produk ini?"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Foto (Opsional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setReviewImage(e.target.files[0])}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <button 
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="w-full mt-4 bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {submittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setDisputeModalOpen(false)}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
            <h2 className="text-xl font-black text-gray-900 mb-6">Ajukan Komplain</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-left">Alasan Sengketa / Komplain</label>
                <textarea 
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-gray-900"
                  rows="3"
                  placeholder="Jelaskan alasan komplain secara detail (misal: barang rusak/kurang)..."
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-left">
                  Nominal Refund Pengembalian Dana (Max Rp{order.grand_total?.toLocaleString('id')})
                </label>
                <input 
                  type="number"
                  value={disputeAmount}
                  onChange={(e) => setDisputeAmount(e.target.value)}
                  max={order.grand_total}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-gray-900"
                  placeholder="Masukkan nominal refund..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-left">Foto Bukti (Opsional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setDisputeImage(e.target.files[0])}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer"
                />
              </div>

              <button 
                onClick={handleSubmitDispute}
                disabled={submittingDispute}
                className="w-full mt-4 bg-amber-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-amber-500/20 hover:bg-amber-700 transition-all disabled:opacity-50"
              >
                {submittingDispute ? 'Mengirim...' : 'Kirim Komplain'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
