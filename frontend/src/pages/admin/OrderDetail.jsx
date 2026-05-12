import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';
import { A, PageHeader, StatRow, TablePanel, FieldLabel, idr, fmtDate } from '../../lib/adminStyles';

const nextAllowedStatus = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['processing', 'refund_requested'],
  processing: ['ready_to_ship', 'refund_requested'],
  ready_to_ship: ['shipped', 'refund_requested'],
  shipped: ['delivered', 'refund_requested'],
  delivered: ['completed', 'refund_requested'],
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
      .catch(err => console.error(_err))
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
    }).catch(err => alert(_err.message))
      .finally(() => setUpdating(false));
  };

  if (loading) return (
    <div style={{ ...A.page, alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="spinner-border text-primary" />
    </div>
  );

  if (!order) return (
    <div style={A.page}>
      <div style={{ ...A.card, padding: 30, textAlign: 'center' }}>
        <i className='bx bx-search-alt' style={{ fontSize: 48, color: '#ccd6e0', marginBottom: 16 }} />
        <h4 style={{ margin: 0, fontWeight: 800 }}>Pesanan Tidak Ditemukan</h4>
        <p style={{ color: '#64748b', marginTop: 8 }}>Pastikan ID yang Anda cari benar.</p>
        <Link to="/admin/orders" style={{ ...A.btnGhost, marginTop: 16 }}>Kembali ke Daftar</Link>
      </div>
    </div>
  );

  const allowedNext = nextAllowedStatus[order.status] || [];
  const statusSteps = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'completed'];
  const currentStepIdx = statusSteps.indexOf(order.status);

  return (
    <div style={{ ...A.page, padding: '20px 16px', background: '#fafbff' }}>
      <style>{`
        @media (max-width: 1024px) {
          .order-detail-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .timeline-steps {
            overflow-x: auto;
            padding: 20px 0;
          }
          .timeline-steps > div {
            min-width: 80px;
          }
          .product-item {
            flex-direction: column;
            align-items: flex-start !important;
            text-align: left !important;
          }
          .product-right {
            width: 100%;
            text-align: left !important;
            margin-top: 12px;
          }
        }
        
        @media (max-width: 768px) {
          .order-header {
            flex-direction: column;
            gap: 12px;
          }
          .merchant-header {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 10px;
          }
          .status-buttons {
            flex-direction: column;
          }
          .status-buttons button {
            width: 100%;
          }
        }
        
        .timeline-steps {
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          margin-top: 20px;
        }
        
        @media (max-width: 640px) {
          .timeline-steps > div {
            min-width: 65px;
          }
          .timeline-steps > div > div:first-child {
            width: 28px !important;
            height: 28px !important;
            font-size: 11px !important;
          }
          .timeline-steps > div > div:last-child {
            font-size: 9px !important;
          }
        }
        
        .product-metadata {
          display: flex;
          gap: 6px;
          margin-top: 4px;
          flex-wrap: wrap;
        }
        
        @media print {
          .action-buttons {
            display: none;
          }
        }
      `}</style>

      {/* Header Section - Responsive */}
      <div style={{ marginBottom: 24 }}>
        <div className="order-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 16
        }}>
          <div style={{ flex: 1 }}>
            <PageHeader
              title={`Pesanan #${order.order_number || order.id.slice(0, 8)}`}
              subtitle={`Dibuat pada ${fmtDate(order.created_at)}`}
              noMargin
            />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={A.badge(statusColors[order.status] || '#64748b', (statusColors[order.status] || '#64748b') + '15')}>
              {order.status.toUpperCase().replace('_', ' ')}
            </div>
            <Link to="/admin/orders" style={{ ...A.btnGhost, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <i className='bx bx-arrow-back' /> Kembali
            </Link>
          </div>
        </div>
      </div>

      {/* Progress Timeline - Responsive with horizontal scroll on mobile */}
      <div style={{ ...A.card, padding: '20px 24px', marginBottom: 24, overflowX: 'auto' }}>
        <FieldLabel>Progress Workflow</FieldLabel>
        <div className="timeline-steps" style={{ position: 'relative', marginTop: 20 }}>
          {/* Progress Bar Background */}
          <div style={{
            position: 'absolute',
            top: 15,
            left: '5%',
            right: '5%',
            height: 3,
            background: '#f1f5f9',
            zIndex: 0
          }} />

          {/* Progress Bar Active */}
          <div style={{
            position: 'absolute',
            top: 15,
            left: '5%',
            width: `${Math.min(90, Math.max(0, currentStepIdx) * 18)}%`,
            height: 3,
            background: 'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)',
            zIndex: 0,
            transition: 'all 0.4s'
          }} />

          {/* Steps */}
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', position: 'relative', zIndex: 1 }}>
            {statusSteps.map((s, i) => {
              const active = i <= currentStepIdx;
              return (
                <div key={s} style={{ textAlign: 'center', width: '10%', minWidth: 60 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', margin: '0 auto', fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' : '#fff',
                    border: active ? 'none' : '2px solid #e2e8f0',
                    color: active ? '#fff' : '#94a3b8',
                    fontWeight: 800, transition: 'all 0.3s',
                    boxShadow: active ? '0 2px 8px rgba(99,102,241,0.3)' : 'none'
                  }}>
                    {active ? <i className='bx bx-check' style={{ fontSize: 16 }} /> : i + 1}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, marginTop: 8,
                    color: active ? '#1e293b' : '#94a3b8',
                    textTransform: 'uppercase', letterSpacing: '0.3px'
                  }}>
                    {s.split('_')[0]}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Grid - Responsive */}
      <div className="order-detail-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Left Column: Details & Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          <TablePanel toolbar={<h6 style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>Rincian Produk per Toko</h6>}>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {order.merchant_groups?.map(group => (
                <div key={group.id} style={{
                  border: '1px solid #eef2ff',
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: '#fff',
                  transition: 'box-shadow 0.2s'
                }}>
                  {/* Merchant Header */}
                  <div className="merchant-header" style={{
                    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                    padding: '14px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #eef2ff',
                    flexWrap: 'wrap',
                    gap: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                        color: '#fff', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 18
                      }}>
                        <i className='bx bx-store' />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                        {group.merchant?.store_name || `Merchant ID: ${group.merchant_id.slice(0, 8)}`}
                      </span>
                    </div>
                    <div style={{
                      ...A.badge('#6366f1', '#6366f115'),
                      fontSize: 11,
                      fontWeight: 700
                    }}>
                      {group.status.toUpperCase()}
                    </div>
                  </div>

                  {/* Items List */}
                  <div style={{ padding: '0 20px' }}>
                    {group.items?.map((it, idx) => (
                      <div key={it.id} className="product-item" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        padding: '20px 0',
                        borderBottom: idx === group.items.length - 1 ? 'none' : '1px solid #f0f2f5'
                      }}>
                        {/* Product Image/Icon */}
                        <div style={{
                          width: 60, height: 60, borderRadius: 12,
                          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', border: '1px solid #eef2ff',
                          flexShrink: 0
                        }}>
                          <i className='bx bx-package' style={{ fontSize: 28, color: '#94a3b8' }} />
                        </div>

                        {/* Product Details */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 6 }}>
                            {it.product_name}
                          </div>

                          {/* Global Attributes Metadata */}
                          {(() => {
                            try {
                              const meta = JSON.parse(it.metadata || '{}');
                              if (Object.keys(meta).length === 0) return null;
                              return (
                                <div className="product-metadata">
                                  {Object.entries(meta).map(([k, v]) => (
                                    <span key={k} style={{
                                      padding: '2px 8px',
                                      background: '#f1f5f9',
                                      borderRadius: 6,
                                      fontSize: 9,
                                      fontWeight: 700,
                                      color: '#64748b',
                                      textTransform: 'uppercase',
                                      border: '1px solid #e2e8f0'
                                    }}>
                                      {k}: <span style={{ color: '#1e293b' }}>{v}</span>
                                    </span>
                                  ))}
                                </div>
                              );
                            } catch (_e) { return null; }
                          })()}

                          <div style={{
                            fontSize: 11,
                            color: '#64748b',
                            marginTop: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: '#f8fafc',
                            padding: '2px 8px',
                            borderRadius: 6
                          }}>
                            <i className='bx bx-percent' style={{ fontSize: 10 }} />
                            Komisi: {idr(it.commission_amount)} ({(it.commission_rate * 100).toFixed(1)}%)
                          </div>
                        </div>

                        {/* Price & Quantity */}
                        <div className="product-right" style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 800, color: '#6366f1', fontSize: 16, marginBottom: 4 }}>
                            {idr(it.subtotal)}
                          </div>
                          <div style={{
                            fontSize: 11,
                            color: '#94a3b8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: '#f1f5f9',
                            padding: '2px 8px',
                            borderRadius: 12
                          }}>
                            <i className='bx bx-cart' /> Qty: {it.quantity}
                          </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Action Buttons */}
          <div style={{ ...A.card, overflow: 'hidden' }}>
            <div style={{
              ...A.cardBody,
              borderBottom: '1px solid #f0f2f5',
              background: 'linear-gradient(135deg, #fafbff 0%, #ffffff 100%)'
            }}>
              <h6 style={{ margin: 0, fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className='bx bx-cog' /> Aksi Pesanan
              </h6>
            </div>
            <div style={A.cardBody}>
              <FieldLabel>
                <i className='bx bx-note' style={{ marginRight: 4 }} /> Internal Note
              </FieldLabel>
              <textarea
                style={{
                  ...A.textarea,
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  fontSize: 13,
                  transition: 'all 0.2s'
                }}
                rows="3"
                placeholder="Tambahkan catatan internal untuk update status..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
              <div className="status-buttons" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                {allowedNext.length > 0 ? allowedNext.map(st => (
                  <button
                    key={st}
                    style={{
                      ...(st.includes('refund') || st === 'cancelled' ? A.btnGhost : A.btnPrimary),
                      padding: '12px',
                      borderRadius: 12,
                      fontWeight: 700,
                      fontSize: 13,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: updating ? 'not-allowed' : 'pointer',
                      opacity: updating ? 0.7 : 1
                    }}
                    onClick={() => updateStatus(st)}
                    disabled={updating}
                  >
                    {updating ? (
                      <>
                        <i className='bx bx-loader-alt bx-spin' /> Processing...
                      </>
                    ) : (
                      <>
                        <i className='bx bx-transfer-alt' /> PINDAH KE {st.toUpperCase()}
                      </>
                    )}
                  </button>
                )) : (
                  <div style={{
                    textAlign: 'center',
                    padding: 16,
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#64748b',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}>
                    <i className='bx bx-check-circle' style={{ fontSize: 18, color: '#16a34a' }} />
                    Status Akhir (No Actions Available)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div style={{ ...A.card, overflow: 'hidden' }}>
            <div style={{
              ...A.cardBody,
              borderBottom: '1px solid #f0f2f5',
              background: 'linear-gradient(135deg, #fafbff 0%, #ffffff 100%)'
            }}>
              <h6 style={{ margin: 0, fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className='bx bx-dollar-circle' /> Ringkasan Finansial
              </h6>
            </div>
            <div style={A.cardBody}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, padding: '8px 0' }}>
                <span style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className='bx bx-trending-up' style={{ fontSize: 14 }} /> Platform Fee
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>
                  +{idr(order.total_platform_fee)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, padding: '8px 0' }}>
                <span style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className='bx bx-trending-down' style={{ fontSize: 14 }} /> Komisi Affiliate
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>
                  -{idr(order.total_commission)}
                </span>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                padding: 16,
                borderRadius: 14,
                border: '1px solid #eef2ff',
                marginTop: 8
              }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <i className='bx bx-wallet' /> Total Payout Merchant
                </div>
                <div style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: '#6366f1',
                  letterSpacing: '-0.5px'
                }}>
                  {idr(order.grand_total - order.total_platform_fee - order.total_commission)}
                </div>
                <div style={{
                  fontSize: 10,
                  color: '#94a3b8',
                  marginTop: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <i className='bx bx-info-circle' />
                  Grand Total: {idr(order.grand_total)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}