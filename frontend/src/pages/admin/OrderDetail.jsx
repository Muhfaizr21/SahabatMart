import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

// Transition rules matching backend (utils/order_logic.go)
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

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState('');

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/orders/${id}`)
      .then(d => setOrder(d.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const updateStatus = (newStatus) => {
    if (!window.confirm(`Ganti status ke ${newStatus.toUpperCase()}?`)) return;
    setUpdating(true);
    fetchJson(`${API}/orders/status`, {
      method: 'POST',
      body: JSON.stringify({ order_id: id, status: newStatus, note })
    }).then(() => {
      load();
      setNote('');
    }).catch(err => alert(err.message))
      .finally(() => setUpdating(false));
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  if (!order) return <div className="alert alert-warning m-4">Pesanan tidak ditemukan.</div>;

  const allowedNext = nextAllowedStatus[order.status] || [];

  return (
    <>
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
        <div className="breadcrumb-title pe-3">Super Admin</div>
        <div className="ps-3">
          <nav><ol className="breadcrumb mb-0 p-0">
            <li className="breadcrumb-item"><Link to="/admin/orders">Semua Pesanan</Link></li>
            <li className="breadcrumb-item active">Detail #{order.order_number || order.id.slice(0,8)}</li>
          </ol></nav>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <div className="card radius-10 shadow-sm border-0 mb-3">
            <div className="card-header bg-white py-3 border-bottom-0">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="mb-0 fw-bold">Detail Pesanan</h6>
                  <small className="text-muted">ID: {order.id}</small>
                </div>
                <span className={`badge px-3 py-2 rounded-pill ${order.status === 'completed' ? 'bg-success' : 'bg-primary'}`}>
                  {order.status.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="card-body">
              {/* Status Timeline - Requirement 1 */}
              <div className="mb-4">
                <h6 className="fw-bold small mb-3">PROGRESS PESANAN (STATE MACHINE)</h6>
                <div className="d-flex justify-content-between position-relative">
                   <div className="position-absolute start-0 end-0 top-50 translate-middle-y bg-light" style={{height:2, zIndex:0}}></div>
                   {['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'completed'].map((st, idx) => {
                     const isDone = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'completed'].indexOf(order.status) >= idx;
                     return (
                       <div key={st} className="text-center" style={{zIndex:1, width:'15%'}}>
                          <div className={`mx-auto mb-1 rounded-circle d-flex align-items-center justify-content-center ${isDone ? 'bg-primary text-white' : 'bg-white border text-muted'}`} style={{width:24, height:24, fontSize:10}}>
                            {isDone ? <i className="bi bi-check"></i> : idx+1}
                          </div>
                          <div style={{fontSize:9, fontWeight: isDone ? 700 : 400}} className={isDone ? 'text-primary' : 'text-muted'}>{st.replace('_',' ')}</div>
                       </div>
                     )
                   })}
                </div>
              </div>

              {/* Items per Merchant - Requirement 6 */}
              <h6 className="fw-bold small mb-3">ITEMS PER MERCHANT GRAP</h6>
              {order.merchant_groups?.map(group => (
                <div key={group.id} className="p-3 border rounded mb-3 bg-light bg-opacity-10">
                   <div className="d-flex justify-content-between mb-2">
                      <span className="fw-bold text-primary small">Store ID: {group.merchant_id.slice(0,8)}...</span>
                      <span className="badge bg-info bg-opacity-10 text-info">{group.status}</span>
                   </div>
                   {group.items?.map(it => (
                     <div key={it.id} className="d-flex gap-3 align-items-center mb-2">
                        <div className="bg-white border rounded" style={{width:50, height:50}}></div>
                        <div className="flex-grow-1">
                           <div className="fw-medium small">{it.product_name}</div>
                           <div className="text-muted x-small">Commission: {fmt(it.commission_amount)} ({ (it.commission_rate * 100).toFixed(1) }%)</div>
                        </div>
                        <div className="text-end fw-bold small">{fmt(it.subtotal)}</div>
                     </div>
                   ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          {/* Action Card - Order State Machine */}
          <div className="card radius-10 border-0 shadow-sm mb-3">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Update Progress</h6>
              <div className="mb-3">
                <label className="form-label small">Tambah Catatan (Internal)</label>
                <textarea className="form-control form-control-sm" rows="2" value={note} onChange={e => setNote(e.target.value)} placeholder="Alasan perubahan atau info kurir..."></textarea>
              </div>
              <div className="d-grid gap-2">
                {allowedNext.length > 0 ? allowedNext.map(st => (
                  <button key={st} className={`btn btn-sm ${st.includes('refund') || st === 'cancelled' ? 'btn-outline-danger' : 'btn-primary'}`} disabled={updating} onClick={() => updateStatus(st)}>
                     {updating ? 'Processing...' : `MOVE TO ${st.toUpperCase()}`}
                  </button>
                )) : <div className="alert alert-light small text-center">No further actions available.</div>}
              </div>
              <div className="mt-3 x-small text-muted border-top pt-2">
                <i className="bi bi-shield-check me-1"></i> Actions are restricted by state machine rules.
              </div>
            </div>
          </div>

          <div className="card radius-10 border-0 shadow-sm">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Financial Snapshot</h6>
              <div className="d-flex justify-content-between mb-2 x-small">
                 <span>Platform Fee</span>
                 <span className="text-success fw-bold">+{fmt(order.total_platform_fee)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 x-small">
                 <span>Affiliate Commission</span>
                 <span className="text-danger fw-bold">-{fmt(order.total_commission)}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between small fw-bold">
                 <span>Merchant Payout</span>
                 <span className="text-primary">{fmt(order.grand_total - order.total_platform_fee - order.total_commission)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
