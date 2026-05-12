import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson, formatImage } from '../../lib/api';
import { PageHeader, TablePanel, Modal, FieldLabel, statusBadge, idr, fmtDate, A } from '../../lib/adminStyles';
import toast from 'react-hot-toast';

export default function RestockModeration() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchJson(`${ADMIN_API_BASE}/merchants/restock?status=${filter}`);
      setRequests(data || []);
    } catch (_err) {
      console.error(_err);
      toast.error('Gagal memuat data: ' + _err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (status) => {
    if (!modal) return;
    
    const loadingToast = toast.loading(`Memproses status ${status}...`);
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
      
      toast.success(`Berhasil update status ke ${status}`, { id: loadingToast });
      setModal(null);
      setNote('');
      setTrackingNumber('');
      load();
    } catch (_err) {
      toast.error('Gagal: ' + _err.message, { id: loadingToast });
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
         <button onClick={load} style={A.btnGhost} className="hover:bg-slate-100 p-2 rounded-full transition-all">
           <i className={`bx bx-refresh ${loading ? 'bx-spin' : ''}`} style={{ fontSize: 20 }} />
         </button>
      </PageHeader>

      <TablePanel 
        loading={loading}
        tabs={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 4px' }}>
            {['', 'requested', 'approved', 'shipped', 'received', 'rejected'].map(t => (
              <button key={t} style={A.tab(filter === t)} onClick={() => setFilter(t)}>
                {t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Semua Permintaan'}
              </button>
            ))}
          </div>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
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
                <tr>
                  <td colSpan={5} style={{ padding: '80px 24px', textAlign: 'center' }}>
                    <div style={{ opacity: 0.4, marginBottom: 12 }}>
                      <i className='bx bx-package' style={{ fontSize: 48 }} />
                    </div>
                    <div style={{ color: '#64748b', fontWeight: 600 }}>Tidak ada permintaan restock ditemukan.</div>
                  </td>
                </tr>
              ) : requests.map((req, i) => {
                const s = getStatusStyle(req.status);
                return (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ ...A.td, paddingLeft: 24, py: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', border: '1px solid #e2e8f0' }}>
                          <i className='bx bx-store' style={{ fontSize: 20 }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{req.merchant?.store_name || "Unknown Store"}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{req.merchant_id.split('-')[0]}</div>
                        </div>
                      </div>
                    </td>
                    <td style={A.td}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{req.items?.length || 0} SKUs</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{req.total_items} Pcs</span>
                      </div>
                    </td>
                    <td style={A.td}>
                      <div style={{ fontSize: 13, color: '#475569' }}>{fmtDate(req.created_at)}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(req.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td style={A.td}>
                      <span style={{ 
                        ...A.badge(s.color, s.bg),
                        padding: '4px 10px',
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRadius: 6
                      }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={{ ...A.td, paddingRight: 24, textAlign: 'right' }}>
                       <button 
                         onClick={() => { setNote(req.admin_note || ''); setModal(req); }} 
                         style={{ ...A.btnGhost, padding: '8px 16px', fontSize: 12, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' }}
                       >
                         <i className='bx bx-search-alt-2' style={{ fontSize: 16, marginRight: 6 }} /> Detail
                       </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </TablePanel>

      {modal && (
        <Modal title="Detail Permintaan Restock" onClose={() => setModal(null)} wide>
          <div style={{ padding: '0 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, padding: '16px', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', color: '#0f172a' }}>
                  <i className='bx bx-package' style={{ fontSize: 24 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Merchant Destination</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{modal.merchant?.store_name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>ID: {modal.id}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Current Status</div>
                <span style={A.badge(getStatusStyle(modal.status).color, getStatusStyle(modal.status).bg)}>
                  {getStatusStyle(modal.status).label}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h4 style={{ margin: '0 0 12px 4px', fontSize: 13, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daftar Produk</h4>
              <div style={{ border: '1px solid #f1f5f9', borderRadius: 16, overflow: 'hidden' }}>
                {modal.items?.map((it, idx) => (
                  <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: idx % 2 === 0 ? '#fff' : '#fcfcfc', borderBottom: idx === modal.items.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                       <img src={formatImage(it.product?.image)} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid #f1f5f9' }} />
                       <div>
                         <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{it.product?.name}</div>
                         <div style={{ fontSize: 11, color: '#64748b' }}>SKU: {it.product?.sku}</div>
                       </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 900, fontSize: 16, color: '#0f172a' }}>{it.quantity} Pcs</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Valuasi: {idr(it.product?.price * it.quantity)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: 24, borderRadius: 24, border: '1px solid #e2e8f0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, textAlign: 'center' }}>Moderasi & Logistik</div>
              
              <div style={{ marginBottom: 20 }}>
                <FieldLabel>Catatan Admin / Internal</FieldLabel>
                <textarea 
                  style={{ ...A.textarea, minHeight: 80, background: '#fff', fontSize: 14, borderRadius: 12 }} 
                  placeholder="Contoh: Stok mencukupi, segera kirim via kurir internal..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                {(modal.status === 'pending' || modal.status === 'requested') && (
                  <>
                    <button onClick={() => handleModerate('rejected')} style={{ ...A.btnGhost, color: '#ef4444', borderColor: '#ef4444', flex: 1, height: 48, borderRadius: 12 }}>
                      Tolak Permintaan
                    </button>
                    <button onClick={() => handleModerate('approved')} style={{ ...A.btnPrimary, flex: 2, height: 48, borderRadius: 12, background: '#0f172a' }}>
                      Setujui & Potong Stok Pusat
                    </button>
                  </>
                )}
                {modal.status === 'approved' && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ background: '#fff', padding: 16, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                      <FieldLabel>Nomor Resi / Surat Jalan (B2B)</FieldLabel>
                      <input 
                        type="text" 
                        style={{ ...A.input, marginBottom: 16 }} 
                        placeholder="Masukkan nomor pelacakan..." 
                        value={trackingNumber}
                        onChange={e => setTrackingNumber(e.target.value)}
                      />
                      <button 
                        onClick={() => handleModerate('shipped')} 
                        disabled={!trackingNumber}
                        style={{ ...A.btnPrimary, width: '100%', height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #0f172a, #334155)', opacity: !trackingNumber ? 0.6 : 1 }}
                      >
                        <i className='bx bxs-truck' style={{ marginRight: 8 }} />
                        Konfirmasi Pengiriman
                      </button>
                    </div>
                  </div>
                )}
                {modal.status === 'shipped' && (
                  <div style={{ flex: 1, textAlign: 'center', padding: '24px', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 20, color: '#64748b', fontSize: 13, fontWeight: 600 }}>
                    <i className='bx bx-time-five' style={{ fontSize: 32, display: 'block', marginBottom: 12, color: '#94a3b8' }} />
                    Menunggu konfirmasi penerimaan oleh Merchant...
                  </div>
                )}
                {(modal.status === 'received' || modal.status === 'rejected') && (
                  <div style={{ flex: 1, textAlign: 'center', padding: '24px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, color: '#0f172a', fontSize: 13, fontWeight: 700 }}>
                    <i className='bx bx-check-double' style={{ fontSize: 32, display: 'block', marginBottom: 12, color: '#16a34a' }} />
                    Proses Selesai. Status Akhir: {modal.status.toUpperCase()}
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
