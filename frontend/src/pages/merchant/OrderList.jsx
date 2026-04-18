import React, { useState, useEffect } from 'react';
import { fetchJson, MERCHANT_API_BASE, formatImage } from '../../lib/api';
import { PageHeader, A, idr, fmtDate } from '../../lib/adminStyles.jsx';

export default function MerchantOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('');
  const [updating, setUpdating] = useState(null);

  useEffect(() => { loadOrders(); }, [activeStatus]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchJson(`${MERCHANT_API_BASE}/orders?status=${activeStatus}`);
      setOrders(data.data || []);
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
      loadOrders();
    } catch (err) {
      alert('Gagal update status: ' + err.message);
    } finally {
      setUpdating(null);
    }
  };

  const statuses = [
    { label: 'All Orders', value: '' },
    { label: 'New', value: 'new' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Processing', value: 'processing' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Completed', value: 'completed' },
  ];

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Order Fulfillment" subtitle="Lacak dan atur pengiriman barang mewah Anda.">
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
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13, background: '#fff', borderRadius: 16 }}>Loading orders...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: 16, border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>No active orders found</div>
          </div>
        ) : orders.map(order => (
          <div key={order.id} style={{ ...A.card, transition: 'all 0.2s', border: '1px solid #f1f5f9' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#c7d2fe'} onMouseLeave={e => e.currentTarget.style.borderColor = '#f1f5f9'}>
            
            <div style={{ padding: 24, borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, background: '#f8fafc' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                 <div style={A.iconBox('#8b5cf6')}><i className="bx bx-receipt" style={{ fontSize: 20, color:'#8b5cf6' }} /></div>
                 <div>
                   <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Order #{order.id.slice(0,8).toUpperCase()}</div>
                   <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginTop: 3 }}>Placed {fmtDate(order.created_at)}</div>
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
                 <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Contract Items</div>
                 {order.items?.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 16, padding: 12, background: '#f8fafc', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                       <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', background: '#fff', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                         <img src={formatImage(item.product_image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                         <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{item.product_name}</div>
                         <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.variant_name || 'Original Edition'}</div>
                         <div style={{ fontSize: 12, fontWeight: 800, color: '#4f46e5', marginTop: 6 }}>Qty: {item.quantity} × {idr(item.unit_price)}</div>
                       </div>
                    </div>
                 ))}
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                 <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                   <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Logistics Details</div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                     <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Carrier</span>
                     <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{order.courier_code || 'Pending Discovery'}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                     <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Tracking Info</span>
                     <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{order.tracking_number || 'Awaiting Shipment'}</span>
                   </div>
                 </div>

                 <div style={{ display: 'flex', gap: 12 }}>
                   {order.status === 'new' && (
                     <button style={{ ...A.btnPrimary, flex: 1, height: 48 }} onClick={() => handleUpdateStatus(order.id, 'confirmed')} disabled={updating === order.id}>Confirm Order</button>
                   )}
                   {order.status === 'confirmed' && (
                     <button style={{ ...A.btnPrimary, flex: 1, height: 48 }} onClick={() => handleUpdateStatus(order.id, 'processing')} disabled={updating === order.id}>Process Item</button>
                   )}
                   {order.status === 'processing' && (
                     <button style={{ ...A.btnPrimary, flex: 1, height: 48, background: '#4f46e5', borderColor: '#4f46e5' }} onClick={() => handleUpdateStatus(order.id, 'shipped')} disabled={updating === order.id}>Input Resi & Ship</button>
                   )}
                   {order.status === 'shipped' && (
                     <div style={{ flex: 1, textAlign: 'center', padding: 14, background: '#f1f5f9', color: '#64748b', fontSize: 12, fontWeight: 800, borderRadius: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Package in Transit</div>
                   )}
                   {order.status === 'completed' && (
                     <div style={{ flex: 1, textAlign: 'center', padding: 14, background: '#ecfdf5', color: '#10b981', fontSize: 12, fontWeight: 800, borderRadius: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Transaction Finalized</div>
                   )}
                 </div>
               </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
