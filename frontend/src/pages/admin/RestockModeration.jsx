import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import { PageHeader, TablePanel, Modal, FieldLabel, statusBadge, idr, fmtDate, A } from '../../lib/adminStyles';

export default function RestockModeration() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchJson(`${ADMIN_API_BASE}/merchants/restock?status=${filter}`);
      setRequests(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [trackingNumber, setTrackingNumber] = useState('');

  const handleModerate = async (status) => {
    if (!modal) return;
    try {
      let url = `${ADMIN_API_BASE}/merchants/restock/moderate`;
      let body = { request_id: modal.id, status, admin_note: note };

      // Use new warehouse logic for actual stock movement
      if (status === 'approved') {
        url = `${ADMIN_API_BASE}/warehouse/restock/approve/${modal.id}`;
        body = { admin_note: note };
      } else if (status === 'shipped') {
        url = `${ADMIN_API_BASE}/warehouse/restock/ship/${modal.id}`;
        body = { tracking_number: trackingNumber, admin_note: note };
      }

      await fetchJson(url, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      
      toast.success(`Berhasil update status ke ${status}`);
      setModal(null);
      setTrackingNumber('');
      load();
    } catch (err) {
      toast.error('Gagal: ' + err.message);
    }
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'requested': return { color: '#6366f1', bg: '#eef2ff', label: 'Requested' };
      case 'approved':  return { color: '#16a34a', bg: '#f0fdf4', label: 'Ready to Ship' };
      case 'shipped':   return { color: '#7c3aed', bg: '#f5f3ff', label: 'Shipped' };
      case 'rejected':  return { color: '#dc2626', bg: '#fff1f2', label: 'Rejected' };
      case 'received':  return { color: '#0891b2', bg: '#ecfeff', label: 'Received' };
      default:          return { color: '#64748b', bg: '#f1f5f9', label: status };
    }
  };

  return (
    <div style={A.page} className="fade-in">
      <PageHeader title="Stock Distribution" subtitle="Review and approve inventory replenishment for localized merchant warehouses.">
         <button onClick={load} style={A.btnGhost}><i className={`bx bx-refresh ${loading ? 'bx-spin' : ''}`} /></button>
      </PageHeader>

      <TablePanel 
        loading={loading}
        tabs={
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['', 'requested', 'approved', 'shipped', 'received', 'rejected'].map(t => (
              <button key={t} style={A.tab(filter === t)} onClick={() => setFilter(t)}>{t || 'All'}</button>
            ))}
          </div>
        }
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...A.th, paddingLeft: 24 }}>MERCHANT / STORE</th>
              <th style={A.th}>ITEMS</th>
              <th style={A.th}>REQUEST DATE</th>
              <th style={A.th}>STATUS</th>
              <th style={{ ...A.th, paddingRight: 24, textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 && !loading ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center' }}>No restock requests found.</td></tr>
            ) : requests.map((req, i) => {
              const s = getStatusStyle(req.status);
              return (
                <tr key={req.id} style={{ borderBottom: i === requests.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                  <td style={{ ...A.td, paddingLeft: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        <i className='bx bx-store-alt' style={{ fontSize: 18 }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{req.merchant?.store_name || "Unknown Store"}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{req.merchant_id.slice(0,8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td style={A.td}>
                    <div style={{ fontWeight: 700 }}>{req.items?.length || 0} SKUs</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{req.total_items} Total Items</div>
                  </td>
                  <td style={A.td}>{new Date(req.created_at).toLocaleString()}</td>
                  <td style={A.td}>
                    <span style={{ 
                      ...A.badge(s.color, s.bg),
                      padding: '4px 12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em'
                    }}>
                      {s.label}
                    </span>
                  </td>
                  <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                     <button 
                       onClick={() => { setNote(req.admin_note || ''); setModal(req); }} 
                       style={{ ...A.btnPrimary, padding: '8px 16px', fontSize: 12, borderRadius: 10, background: '#0f172a' }}
                     >
                       <i className='bx bx-edit-alt' style={{ fontSize: 16 }} /> Review
                     </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TablePanel>

      {modal && (
        <Modal title="Review Restock Request" onClose={() => setModal(null)} wide>
          <div style={{ padding: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Merchant Store</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{modal.merchant?.store_name}</div>
              </div>
              <div style={A.badge(getStatusStyle(modal.status).color, getStatusStyle(modal.status).bg)}>
                {modal.status}
              </div>
            </div>

            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 800, color: '#64748b' }}>Request Items</h4>
            <div style={{ background: '#f8fafc', borderRadius: 16, padding: '16px', marginBottom: 20, border: '1px solid #f1f5f9' }}>
              {modal.items?.map(it => (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                     <img src={formatImage(it.product?.image)} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
                     <div>
                       <div style={{ fontSize: 13, fontWeight: 800 }}>{it.product?.name}</div>
                       <div style={{ fontSize: 11, color: '#64748b' }}>SKU: {it.product?.sku}</div>
                     </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: 16, color: '#0f172a' }}>x{it.quantity}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{idr(it.product?.price * it.quantity)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: '#f8fafc', padding: 24, borderRadius: 20, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Moderation Action</div>
              
              <FieldLabel>Admin Response Note</FieldLabel>
              <textarea 
                style={{ ...A.textarea, marginBottom: 20, minHeight: 70, background: '#fff' }} 
                placeholder="Provide a reason for approval/rejection or shipping notes..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />

              <div style={{ display: 'flex', gap: 12 }}>
                {(modal.status === 'pending' || modal.status === 'requested') && (
                  <>
                    <button onClick={() => handleModerate('rejected')} style={{ ...A.btnGhost, color: '#ef4444', borderColor: '#ef4444', flex: 1 }}>Reject Request</button>
                    <button onClick={() => handleModerate('approved')} style={{ ...A.btnPrimary, flex: 2 }}>Approve & Deduct Stock</button>
                  </>
                )}
                {modal.status === 'approved' && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <FieldLabel>Nomor Resi / Surat Jalan (B2B)</FieldLabel>
                    <input 
                      type="text" 
                      style={A.input} 
                      placeholder="Contoh: RESI-GUDANG-001..." 
                      value={trackingNumber}
                      onChange={e => setTrackingNumber(e.target.value)}
                    />
                    <button 
                      onClick={() => handleModerate('shipped')} 
                      disabled={!trackingNumber}
                      style={{ ...A.btnPrimary, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', opacity: !trackingNumber ? 0.6 : 1 }}
                    >
                      <i className='bx bxs-truck' style={{ marginRight: 8 }} />
                      Konfirmasi Pengiriman Barang
                    </button>
                  </div>
                )}
                {modal.status === 'shipped' && (
                  <div style={{ flex: 1, textAlign: 'center', padding: '16px', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 12, color: '#64748b', fontSize: 13, fontWeight: 600 }}>
                    <i className='bx bx-time-five' style={{ marginRight: 6 }} />
                    Waiting for Merchant to receive items...
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
