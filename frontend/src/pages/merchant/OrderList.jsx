import React, { useState, useEffect } from 'react';
import { fetchJson, MERCHANT_API_BASE, formatImage } from '../../lib/api';
import { PageHeader, A, idr, fmtDate } from '../../lib/adminStyles.jsx';

export default function MerchantOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('');
  const [updating, setUpdating] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 });
  const limit = 10;

  useEffect(() => { 
    setPage(1);
    loadOrders(1); 
  }, [activeStatus]);

  const loadOrders = async (targetPage = page) => {
    setLoading(true);
    try {
      const data = await fetchJson(`${MERCHANT_API_BASE}/orders?status=${activeStatus}&page=${targetPage}&limit=${limit}`);
      const list = Array.isArray(data) ? data : (data.data || []);
      setOrders(list);
      
      if (!Array.isArray(data)) {
        const total = data.total || 0;
        setTotalPages(Math.ceil(total / limit) || 1);
        
        // Simple heuristic for stats since backend might not provide them explicitly
        // In a real app, these would come from a separate endpoint
        setStats({
          total: data.total || 0,
          pending: list.filter(o => ['new', 'confirmed', 'processing'].includes(o.status)).length,
          completed: list.filter(o => o.status === 'completed').length
        });
      }
    } catch (_err) {
      console.error('Failed to load orders:', _err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (groupId, newStatus) => {
    let trackingNumber = '';
    let courierCode = '';
    if (newStatus === 'shipped') {
      trackingNumber = window.prompt('Masukkan Nomor Resi (Tracking Number):');
      if (!trackingNumber) return;
      courierCode = window.prompt('Masukkan Kode Kurir (misal: JNE, SICEPAT):', 'JNE');
      if (!courierCode) return;
    }

    setUpdating(groupId);
    try {
      await fetchJson(`${MERCHANT_API_BASE}/orders/status`, {
        method: 'POST',
        body: JSON.stringify({ group_id: groupId, status: newStatus, tracking_number: trackingNumber, courier_code: courierCode })
      });
      loadOrders(page);
      if (selectedOrder?.id === groupId) {
         setSelectedOrder(null);
      }
    } catch (_err) {
      alert('Gagal update status: ' + _err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handlePageChange = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    loadOrders(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const statuses = [
    { label: 'Semua', value: '' },
    { label: 'Baru', value: 'new' },
    { label: 'Diproses', value: 'processing' },
    { label: 'Dikirim', value: 'shipped' },
    { label: 'Selesai', value: 'completed' },
  ];

  const getStatusStyle = (status) => {
    switch (status) {
      case 'completed': return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', label: 'Selesai' };
      case 'shipped': return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', label: 'Dikirim' };
      case 'processing': return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', label: 'Diproses' };
      case 'new': return { bg: 'rgba(219, 39, 119, 0.1)', text: '#db2777', label: 'Baru' };
      case 'confirmed': return { bg: 'rgba(124, 58, 237, 0.1)', text: '#a78bfa', label: 'Dikonfirmasi' };
      case 'ready_for_pickup': return { bg: 'rgba(2, 132, 199, 0.1)', text: '#38bdf8', label: 'Siap Diambil' };
      default: return { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8', label: status };
    }
  };

  const renderPaginationRange = () => {
    const range = [];
    const delta = 2;
    const left = page - delta;
    const right = page + delta + 1;
    
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i < right)) {
        range.push(i);
      }
    }

    const finalRange = [];
    let l;
    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          finalRange.push(l + 1);
        } else if (i - l !== 1) {
          finalRange.push('...');
        }
      }
      finalRange.push(i);
      l = i;
    }
    return finalRange;
  };

  return (
    <div style={{ ...A.page, background: '#F8FAFC', minHeight: '100vh', padding: '32px 40px' }} className="fade-in">
      <div style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em' }}>Pesanan Masuk</h1>
          <p style={{ fontSize: 15, color: '#64748B', marginTop: 6 }}>Manajemen alur kerja pemenuhan pesanan Anda secara real-time.</p>
        </div>
        <div style={{ padding: '8px 16px', background: '#F1F5F9', borderRadius: 12, fontSize: 13, fontWeight: 700, color: '#475569' }}>
           <i className="bx bx-sync" style={{ marginRight: 8 }} />
           Terakhir diperbarui: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 40 }}>
        <div style={{ background: '#fff', padding: 28, borderRadius: 24, border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Total Pesanan</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#0F172A', marginTop: 8 }}>{stats.total}</div>
              </div>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', border: '1px solid #E2E8F0' }}>
                <i className="bx bx-package text-2xl" />
              </div>
           </div>
        </div>
        <div style={{ background: '#fff', padding: 28, borderRadius: 24, border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Perlu Diproses</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#F59E0B', marginTop: 8 }}>{stats.pending}</div>
              </div>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B', border: '1px solid #FEF3C7' }}>
                <i className="bx bx-time-five text-2xl" />
              </div>
           </div>
        </div>
        <div style={{ background: '#fff', padding: 28, borderRadius: 24, border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Selesai</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#10B981', marginTop: 8 }}>{stats.completed}</div>
              </div>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', border: '1px solid #DCFCE7' }}>
                <i className="bx bx-check-circle text-2xl" />
              </div>
           </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 28, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.04)' }}>
        {/* Filter Tabs */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #F1F5F9', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', gap: 8, background: '#F1F5F9', padding: 4, borderRadius: 16 }}>
            {statuses.map(s => (
              <button
                key={s.value}
                onClick={() => setActiveStatus(s.value)}
                style={{
                  padding: '10px 24px',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 800,
                  transition: 'all 0.2s ease',
                  background: activeStatus === s.value ? '#fff' : 'transparent',
                  color: activeStatus === s.value ? '#0F172A' : '#64748B',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: activeStatus === s.value ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          
          <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
             <i className="bx bx-search" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
             <input 
               type="text" 
               placeholder="Cari ID Pesanan..." 
               style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: 18, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', fontSize: 14, outline: 'none', transition: 'all 0.2s' }}
               onFocus={e => { e.target.style.borderColor = '#94A3B8'; e.target.style.background = '#fff'; }}
               onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC'; }}
             />
          </div>
        </div>

        {/* Orders Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                <th style={{ padding: '20px 32px', fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>Identitas</th>
                <th style={{ padding: '20px 32px', fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>Produk</th>
                <th style={{ padding: '20px 32px', fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>Status</th>
                <th style={{ padding: '20px 32px', fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>Payout</th>
                <th style={{ padding: '20px 32px', fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ padding: 80, textAlign: 'center', color: '#94A3B8', fontSize: 15 }}>
                  <i className="bx bx-loader-alt animate-spin text-3xl mb-4" />
                  <div>Memuat data pesanan...</div>
                </td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: 100, textAlign: 'center', color: '#94A3B8', fontSize: 15 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 20, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="bx bx-package text-3xl" />
                    </div>
                    <span>Belum ada pesanan yang masuk.</span>
                  </div>
                </td></tr>
              ) : orders.map(order => {
                const s = getStatusStyle(order.status);
                return (
                  <tr key={order.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '24px 32px' }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>#{order.id.slice(0, 8).toUpperCase()}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>{fmtDate(order.created_at)}</div>
                    </td>
                    <td style={{ padding: '24px 32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, overflow: 'hidden', background: '#F1F5F9', border: '1px solid #E2E8F0' }}>
                          <img src={formatImage(order.items?.[0]?.product_image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#334155' }}>
                            {order.items?.length || 0} Barang
                          </div>
                          {order.items?.length > 0 && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.items[0].product_name}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '24px 32px' }}>
                      <span style={{ padding: '8px 16px', borderRadius: 12, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', background: s.bg, color: s.text, border: `1px solid ${s.text}30`, letterSpacing: 0.5 }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={{ padding: '24px 32px' }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#0F172A' }}>{idr(order.merchant_payout || 0)}</div>
                    </td>
                    <td style={{ padding: '24px 32px' }}>
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        style={{ padding: '10px 20px', borderRadius: 14, border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 800, background: '#fff', color: '#475569', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                        onMouseEnter={e => { e.target.style.background = '#0F172A'; e.target.style.color = '#fff'; e.target.style.borderColor = '#0F172A'; }}
                        onMouseLeave={e => { e.target.style.background = '#fff'; e.target.style.color = '#475569'; e.target.style.borderColor = '#E2E8F0'; }}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '28px 32px', borderTop: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 700 }}>
              Menampilkan Halaman <span style={{ color: '#0F172A' }}>{page}</span> dari <span style={{ color: '#0F172A' }}>{totalPages}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => handlePageChange(page - 1)} disabled={page === 1} style={{ background: '#fff', border: '1px solid #E2E8F0', color: '#475569', width: 40, height: 40, borderRadius: 14, cursor: 'pointer', opacity: page === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bx bx-chevron-left text-xl" />
              </button>
              
              <div style={{ display: 'flex', gap: 6 }}>
                {renderPaginationRange().map((p, i) => (
                  p === '...' ? (
                    <span key={`sep-${i}`} style={{ padding: '0 8px', color: '#94A3B8' }}>...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      style={{
                        width: 40, height: 40, borderRadius: 14, fontSize: 14, fontWeight: 900,
                        background: page === p ? '#0F172A' : '#fff',
                        color: page === p ? '#fff' : '#64748B',
                        border: page === p ? '1px solid #0F172A' : '1px solid #E2E8F0', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      {p}
                    </button>
                  )
                ))}
              </div>

              <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages} style={{ background: '#fff', border: '1px solid #E2E8F0', color: '#475569', width: 40, height: 40, borderRadius: 14, cursor: 'pointer', opacity: page === totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bx bx-chevron-right text-xl" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 32, width: '100%', maxWidth: 760, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 100px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '32px 40px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
               <div>
                 <div style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em' }}>Detail Transaksi #{selectedOrder.id.slice(0,8).toUpperCase()}</div>
                 <div style={{ fontSize: 13, color: '#64748B', marginTop: 6, fontWeight: 700 }}>Diterima pada {fmtDate(selectedOrder.created_at)}</div>
               </div>
               <button onClick={() => setSelectedOrder(null)} style={{ border: 'none', background: '#E2E8F0', width: 44, height: 44, borderRadius: 16, cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="bx bx-x text-2xl" /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 40 }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 40 }}>
                  <div style={{ padding: 28, background: '#F8FAFC', borderRadius: 24, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20 }}>Informasi Logistik</div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>Metode</span>
                          <span style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>{selectedOrder.shipping_type === 'pickup' ? '🏪 Pickup' : '🚚 Kurir'}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>Kurir</span>
                          <span style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>{selectedOrder.courier_code || '-'}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>No. Resi</span>
                          <span style={{ fontSize: 14, fontWeight: 900, color: '#8B5CF6' }}>{selectedOrder.tracking_number || 'Menunggu Input'}</span>
                       </div>
                     </div>
                  </div>
                  <div style={{ padding: 28, background: '#F8FAFC', borderRadius: 24, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20 }}>Analisis Keuangan</div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>Gross Sales</span>
                          <span style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>{idr(selectedOrder.subtotal)}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>Platform Fee</span>
                          <span style={{ fontSize: 14, fontWeight: 900, color: '#F43F5E' }}>-{idr(selectedOrder.platform_fee)}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: 16, marginTop: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>Net Payout</span>
                          <span style={{ fontSize: 18, fontWeight: 900, color: '#10B981' }}>{idr(selectedOrder.merchant_payout)}</span>
                       </div>
                     </div>
                  </div>
               </div>

               <div style={{ fontSize: 12, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20 }}>Daftar Belanja</div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 24, padding: 24, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 24 }}>
                       <div style={{ width: 72, height: 72, borderRadius: 18, overflow: 'hidden', border: '1px solid #F1F5F9' }}>
                          <img src={formatImage(item.product_image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                       </div>
                       <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: '#0F172A' }}>{item.product_name}</div>
                          <div style={{ fontSize: 13, color: '#64748B', marginTop: 6, fontWeight: 700 }}>{item.variant_name || 'Original Edition'}</div>
                       </div>
                       <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: '#0F172A' }}>{idr(item.unit_price)}</div>
                          <div style={{ fontSize: 13, color: '#64748B', marginTop: 6, fontWeight: 700 }}>Qty: {item.quantity}</div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div style={{ padding: '32px 40px', borderTop: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', gap: 20 }}>
               {selectedOrder.status === 'new' && (
                 <button style={{ ...A.btnPrimary, flex: 1, background: '#0F172A', color: '#fff', height: 56, borderRadius: 18, fontSize: 15, fontWeight: 900 }} onClick={() => handleUpdateStatus(selectedOrder.id, 'confirmed')} disabled={updating}>Konfirmasi Pesanan</button>
               )}
               {selectedOrder.status === 'confirmed' && (
                 <button style={{ ...A.btnPrimary, flex: 1, background: '#0F172A', color: '#fff', height: 56, borderRadius: 18, fontSize: 15, fontWeight: 900 }} onClick={() => handleUpdateStatus(selectedOrder.id, 'processing')} disabled={updating}>Mulai Proses</button>
               )}
               {selectedOrder.status === 'processing' && (
                 selectedOrder.shipping_type === 'pickup' ? (
                   <button style={{ ...A.btnPrimary, flex: 1, background: '#0F172A', color: '#fff', height: 56, borderRadius: 18, fontSize: 15, fontWeight: 900 }} onClick={() => handleUpdateStatus(selectedOrder.id, 'ready_for_pickup')} disabled={updating}>Siap Diambil</button>
                 ) : (
                   <button style={{ ...A.btnPrimary, flex: 1, background: '#0F172A', color: '#fff', height: 56, borderRadius: 18, fontSize: 15, fontWeight: 900 }} onClick={() => handleUpdateStatus(selectedOrder.id, 'shipped')} disabled={updating}>Input Resi & Kirim</button>
                 )
               )}
               <button onClick={() => setSelectedOrder(null)} style={{ padding: '0 32px', height: 56, borderRadius: 18, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontWeight: 900, cursor: 'pointer' }}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

