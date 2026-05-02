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
  const limit = 5; // User wants shorter pages

  useEffect(() => { 
    setPage(1);
    loadOrders(1); 
  }, [activeStatus]);

  const loadOrders = async (targetPage = page) => {
    setLoading(true);
    try {
      const data = await fetchJson(`${MERCHANT_API_BASE}/orders?status=${activeStatus}&page=${targetPage}&limit=${limit}`);
      // Handling both direct array (old) and paginated response (new)
      const list = Array.isArray(data) ? data : (data.data || []);
      setOrders(list);
      
      if (!Array.isArray(data)) {
        const total = data.total || 0;
        setTotalPages(Math.ceil(total / limit) || 1);
      } else {
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
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
    } catch (err) {
      alert('Gagal update status: ' + err.message);
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
    { label: 'Semua Pesanan', value: '' },
    { label: 'Baru', value: 'new' },
    { label: 'Dikonfirmasi', value: 'confirmed' },
    { label: 'Diproses', value: 'processing' },
    { label: 'Dikirim', value: 'shipped' },
    { label: 'Selesai', value: 'completed' },
  ];

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Pemenuhan Pesanan" subtitle="Lacak dan atur pengiriman barang pesanan Anda.">
        <div style={{ display: 'flex', gap: 6, background: '#f8fafc', padding: 6, borderRadius: 12, border: '1px solid #f1f5f9' }}>
          {statuses.map(s => {
            const isActive = activeStatus === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setActiveStatus(s.value)}
                style={{
                  ...A.btnGhost,
                  background: isActive ? '#fff' : 'transparent',
                  color: isActive ? '#4f46e5' : '#64748b',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                  border: isActive ? '1px solid #e2e8f0' : '1px solid transparent'
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </PageHeader>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13, background: '#fff', borderRadius: 16 }}>Memuat pesanan...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: 16, border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Tidak ada pesanan aktif</div>
          </div>
        ) : orders.map(order => (
          <div key={order.id} style={{ ...A.card, transition: 'all 0.2s', border: '1px solid #f1f5f9' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#c7d2fe'} onMouseLeave={e => e.currentTarget.style.borderColor = '#f1f5f9'}>
            
            <div style={{ padding: 24, borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, background: '#f8fafc' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                 <div style={A.iconBox('#8b5cf6')}><i className="bx bx-receipt" style={{ fontSize: 20, color:'#8b5cf6' }} /></div>
                 <div>
                   <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Pesanan #{order.id.slice(0,8).toUpperCase()}</div>
                   <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginTop: 3 }}>Dibuat pada {fmtDate(order.created_at)}</div>
                 </div>
               </div>
               
               <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                 <div style={{ padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5,
                   background: order.status === 'completed' ? '#ecfdf5' : '#fffbeb',
                   color: order.status === 'completed' ? '#10b981' : '#f59e0b'
                 }}>
                   {order.status}
                 </div>
                 <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{idr(order.merchant_payout || 0)}</div>
               </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(300px, 400px)', gap: 30, padding: 24 }}>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                 <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Detail Barang</div>
                 {order.items?.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 16, padding: 12, background: '#f8fafc', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                       <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', background: '#fff', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                         <img src={formatImage(item.product_image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                         <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{item.product_name}</div>
                         
                         {/* GLOBAL ATTRIBUTES METADATA */}
                         {(() => {
                              try {
                                 const meta = JSON.parse(item.metadata || '{}');
                                 if (Object.keys(meta).length === 0) return null;
                                 return (
                                    <div style={{display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap'}}>
                                       {Object.entries(meta).map(([k, v]) => (
                                          <span key={k} style={{padding: '1px 5px', background: '#fff', borderRadius: 4, fontSize: 8, fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)'}}>
                                             {k}: {v}
                                          </span>
                                       ))}
                                    </div>
                                 );
                              } catch(e) { return null; }
                          })()}

                         <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.variant_name || 'Original Edition'}</div>
                         <div style={{ fontSize: 12, fontWeight: 800, color: '#4f46e5', marginTop: 6 }}>Qty: {item.quantity} × {idr(item.unit_price)}</div>
                       </div>
                    </div>
                 ))}
               </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Detail Logistik</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Kurir</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{order.courier_code || 'Menunggu Konfirmasi'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>No. Resi</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{order.tracking_number || 'Belum Dikirim'}</span>
                    </div>
                  </div>

                  <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #c7d2fe', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.05)' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="bx bx-wallet" /> Ringkasan Keuangan
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Subtotal Barang</span>
                        <span style={{ color: '#0f172a', fontWeight: 800 }}>{idr(order.subtotal)}</span>
                      </div>
                      
                      {order.discount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: '#64748b', fontWeight: 600 }}>Potongan Diskon</span>
                          <span style={{ color: '#ef4444', fontWeight: 800 }}>-{idr(order.discount)}</span>
                        </div>
                      )}

                      <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Biaya Platform (Fee)</span>
                        <span style={{ color: '#64748b', fontWeight: 700 }}>-{idr(order.platform_fee)}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Komisi Afiliasi</span>
                        <span style={{ color: '#64748b', fontWeight: 700 }}>-{idr(order.affiliate_commission)}</span>
                      </div>

                      <div style={{ marginTop: 8, padding: '12px', background: '#f5f3ff', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' }}>Hasil Bersih</span>
                        <span style={{ fontSize: 14, fontWeight: 900, color: '#4f46e5' }}>{idr(order.merchant_payout)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    {order.status === 'new' && (
                      <button style={{ ...A.btnPrimary, flex: 1, height: 48 }} onClick={() => handleUpdateStatus(order.id, 'confirmed')} disabled={updating === order.id}>Konfirmasi Pesanan</button>
                    )}
                    {order.status === 'confirmed' && (
                      <button style={{ ...A.btnPrimary, flex: 1, height: 48 }} onClick={() => handleUpdateStatus(order.id, 'processing')} disabled={updating === order.id}>Proses Barang</button>
                    )}
                    {order.status === 'processing' && (
                      <button style={{ ...A.btnPrimary, flex: 1, height: 48, background: '#4f46e5', borderColor: '#4f46e5' }} onClick={() => handleUpdateStatus(order.id, 'shipped')} disabled={updating === order.id}>Input Resi & Kirim</button>
                    )}
                    {order.status === 'shipped' && (
                      <div style={{ flex: 1, textAlign: 'center', padding: 14, background: '#f1f5f9', color: '#64748b', fontSize: 12, fontWeight: 800, borderRadius: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Paket dalam Perjalanan</div>
                    )}
                    {order.status === 'completed' && (
                      <div style={{ flex: 1, textAlign: 'center', padding: 14, background: '#ecfdf5', color: '#10b981', fontSize: 12, fontWeight: 800, borderRadius: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Transaksi Selesai</div>
                    )}
                  </div>
                </div>

            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 40, paddingBottom: 40 }}>
          <button 
            onClick={() => handlePageChange(page - 1)} 
            disabled={page === 1}
            style={{ ...A.btnGhost, padding: '8px 16px', opacity: page === 1 ? 0.5 : 1 }}
          >
            <i className="bx bx-chevron-left" /> Sebelumnya
          </button>
          
          <div style={{ display: 'flex', gap: 6 }}>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => handlePageChange(i + 1)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  transition: 'all 0.2s',
                  background: page === i + 1 ? '#4f46e5' : '#fff',
                  color: page === i + 1 ? '#fff' : '#64748b',
                  border: page === i + 1 ? 'none' : '1px solid #e2e8f0',
                  cursor: 'pointer'
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button 
            onClick={() => handlePageChange(page + 1)} 
            disabled={page === totalPages}
            style={{ ...A.btnGhost, padding: '8px 16px', opacity: page === totalPages ? 0.5 : 1 }}
          >
            Berikutnya <i className="bx bx-chevron-right" />
          </button>
        </div>
      )}
    </div>
  );
}
