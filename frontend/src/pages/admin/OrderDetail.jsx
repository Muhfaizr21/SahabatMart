import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { A, PageHeader, StatRow, TablePanel, FieldLabel, idr, fmtDate } from '../../lib/adminStyles';

const nextAllowedStatus = {
  pending_payment: ['paid', 'cancelled'],
  paid:            ['processing', 'refund_requested'],
  processing:      ['ready_to_ship', 'refund_requested'],
  ready_to_ship:   ['shipped', 'refund_requested'],
  shipped:         ['delivered', 'refund_requested'],
  delivered:       ['completed', 'refund_requested'],
  refund_requested: ['refund_processing', 'paid'],
  refund_processing: ['refunded', 'paid'],
};

const statusColors = {
  pending_payment: '#d97706',
  paid: '#2563eb',
  processing: '#7c3aed',
  ready_to_ship: '#0891b2',
  shipped: '#6366f1',
  delivered: '#16a34a',
  completed: '#16a34a',
  cancelled: '#dc2626'
};

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState('');

  const load = () => {
    setLoading(true);
    fetchJson(`${ADMIN_API_BASE}/orders/${id}`)
      .then(d => setOrder(d))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const updateStatus = (newStatus) => {
    if (!window.confirm(`Ganti status ke ${newStatus.toUpperCase()}?`)) return;
    setUpdating(true);
    fetchJson(`${ADMIN_API_BASE}/orders/status`, {
      method: 'POST',
      body: JSON.stringify({ order_id: id, status: newStatus, note })
    }).then(() => {
      load();
      setNote('');
    }).catch(err => alert(err.message))
      .finally(() => setUpdating(false));
  };

  if (loading) return (
    <div style={{...A.page, alignItems: 'center', justifyContent: 'center', minHeight: '60vh'}}>
      <div className="spinner-border text-primary" />
    </div>
  );
  
  if (!order) return (
    <div style={A.page}>
      <div style={{...A.card, padding: 30, textAlign: 'center'}}>
        <i className='bx bx-search-alt' style={{fontSize: 48, color: '#ccd6e0', marginBottom: 16}} />
        <h4 style={{margin: 0, fontWeight: 800}}>Pesanan Tidak Ditemukan</h4>
        <p style={{color: '#64748b', marginTop: 8}}>Pastikan ID yang Anda cari benar.</p>
        <Link to="/admin/orders" style={{...A.btnGhost, marginTop: 16}}>Kembali ke Daftar</Link>
      </div>
    </div>
  );

  const allowedNext = nextAllowedStatus[order.status] || [];
  const statusSteps = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'completed'];
  const currentStepIdx = statusSteps.indexOf(order.status);

  return (
    <div style={A.page}>
      <PageHeader title={`Pesanan #${order.order_number || order.id.slice(0,8)}`} subtitle={`Dibuat pada ${fmtDate(order.created_at)}`}>
        <div style={A.badge(statusColors[order.status], (statusColors[order.status] || '#64748b') + '15')}>
          {order.status.toUpperCase().replace('_', ' ')}
        </div>
        <Link to="/admin/orders" style={A.btnGhost}>
          <i className='bx bx-arrow-back' /> Kembali
        </Link>
      </PageHeader>

      {/* Progress Timeline */}
      <div style={{...A.card, padding: '24px 40px'}}>
        <FieldLabel>Progress Workflow</FieldLabel>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', marginTop: 20}}>
          <div style={{position: 'absolute', top: 15, left: '5%', right: '5%', height: 3, background: '#f1f5f9', zIndex: 0}} />
          <div style={{position: 'absolute', top: 15, left: '5%', width: `${Math.max(0, currentStepIdx) * 18}%`, height: 3, background: '#6366f1', zIndex: 0, transition: 'all 0.4s'}} />
          
          {statusSteps.map((s, i) => {
            const active = i <= currentStepIdx;
            return (
              <div key={s} style={{zIndex: 1, textAlign: 'center', width: '10%'}}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', margin: '0 auto', fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? '#6366f1' : '#fff', 
                  border: active ? 'none' : '3px solid #f1f5f9',
                  color: active ? '#fff' : '#94a3b8',
                  fontWeight: 800, transition: 'all 0.3s'
                }}>
                  {active ? <i className='bx bx-check' /> : i + 1}
                </div>
                <div style={{fontSize: 10, fontWeight: 700, marginTop: 8, color: active ? '#1e293b' : '#94a3b8', textTransform: 'uppercase'}}>
                  {s.split('_')[0]}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24}}>
        {/* Left Column: Details & Items */}
        <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
          
          <TablePanel toolbar={<h6 style={{margin: 0, fontWeight: 800, fontSize: 14}}>Rincian Produk per Toko</h6>}>
            <div style={{padding: 24, display: 'flex', flexDirection: 'column', gap: 20}}>
              {order.merchant_groups?.map(group => (
                <div key={group.id} style={{border: '1px solid #f1f5f9', borderRadius: 12, overflow: 'hidden'}}>
                  <div style={{background: '#f8fafc', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                      <div style={A.iconBox('#6366f1')}><i className='bx bx-store' /></div>
                      <span style={{fontWeight: 700, fontSize: 13}}>{group.merchant?.store_name || `Merchant ID: ${group.merchant_id.slice(0,8)}`}</span>
                    </div>
                    <div style={A.badge('#6366f1', '#6366f115')}>{group.status.toUpperCase()}</div>
                  </div>
                  <div style={{padding: '0 16px'}}>
                    {group.items?.map((it, idx) => (
                      <div key={it.id} style={{
                        display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0',
                        borderBottom: idx === group.items.length - 1 ? 'none' : '1px solid #f1f5f9'
                      }}>
                        <div style={{width: 50, height: 50, borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9'}}>
                          <i className='bx bx-package' style={{fontSize: 24, color: '#cbd5e1'}} />
                        </div>
                        <div style={{flex: 1}}>
                          <div style={{fontWeight: 700, fontSize: 13, color: '#1e293b'}}>{it.product_name}</div>
                          
                          {/* Display Global Attributes Metadata */}
                          {(() => {
                              try {
                                 const meta = JSON.parse(it.metadata || '{}');
                                 if (Object.keys(meta).length === 0) return null;
                                 return (
                                    <div style={{display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap'}}>
                                       {Object.entries(meta).map(([k, v]) => (
                                          <span key={k} style={{padding: '1px 6px', background: '#f1f5f9', borderRadius: 4, fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', border: '1px solid #e2e8f0'}}>
                                             {k}: <span style={{color: '#1e293b'}}>{v}</span>
                                          </span>
                                       ))}
                                    </div>
                                 );
                              } catch(e) { return null; }
                          })()}
                          
                          <div style={{fontSize: 11, color: '#64748b', marginTop: 4}}>Komisi: {idr(it.commission_amount)} ({ (it.commission_rate * 100).toFixed(1) }%)</div>
                        </div>
                        <div style={{textAlign: 'right'}}>
                          <div style={{fontWeight: 800, color: '#6366f1'}}>{idr(it.subtotal)}</div>
                          <div style={{fontSize: 11, color: '#94a3b8'}}>Qty: {it.quantity}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TablePanel>
        </div>

        {/* Right Column: Actions & Summary */}
        <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
          <div style={A.card}>
            <div style={{...A.cardBody, borderBottom: '1px solid #f1f5f9'}}>
              <h6 style={{margin: 0, fontWeight: 800, fontSize: 14}}>Aksi Pesanan</h6>
            </div>
            <div style={A.cardBody}>
              <FieldLabel>Internal Note</FieldLabel>
              <textarea 
                style={A.textarea} 
                rows="3" 
                placeholder="Catatan untuk update status..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
              <div style={{display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16}}>
                {allowedNext.length > 0 ? allowedNext.map(st => (
                  <button 
                    key={st} 
                    style={st.includes('refund') || st === 'cancelled' ? A.btnGhost : A.btnPrimary}
                    onClick={() => updateStatus(st)}
                    disabled={updating}
                  >
                    {updating ? 'Processing...' : `PINDAH KE ${st.toUpperCase()}`}
                  </button>
                )) : (
                  <div style={{textAlign: 'center', padding: 12, background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#64748b', fontWeight: 600}}>
                    Status Akhir (No Actions)
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={A.card}>
            <div style={{...A.cardBody, borderBottom: '1px solid #f1f5f9'}}>
              <h6 style={{margin: 0, fontWeight: 800, fontSize: 14}}>Ringkasan Finansial</h6>
            </div>
            <div style={A.cardBody}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
                <span style={{fontSize: 13, color: '#64748b'}}>Platform Fee</span>
                <span style={{fontSize: 13, fontWeight: 700, color: '#16a34a'}}>+{idr(order.total_platform_fee)}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
                <span style={{fontSize: 13, color: '#64748b'}}>Komisi Affiliate</span>
                <span style={{fontSize: 13, fontWeight: 700, color: '#dc2626'}}>-{idr(order.total_commission)}</span>
              </div>
              <div style={{background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px dashed #e2e8f0'}}>
                <div style={{fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4}}>Total Payout Merchant</div>
                <div style={{fontSize: 18, fontWeight: 900, color: '#6366f1'}}>
                  {idr(order.grand_total - order.total_platform_fee - order.total_commission)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
