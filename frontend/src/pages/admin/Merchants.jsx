import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const AdminMerchants = () => {
  const [merchants, setMerchants] = useState([]);
  const [stats, setStats] = useState({});
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [actionNote, setActionNote] = useState('');

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.append('status', filterStatus);
    if (search) params.append('search', search);

    Promise.all([
      fetchJson(API + '/merchants?' + params),
      fetchJson(API + '/merchants/stats'),
    ]).then(([list, s]) => {
      setMerchants(list.data || []);
      setStats(s || {});
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterStatus]);

  const updateStatus = (merchantId, status, note = '') => {
    fetchJson(API + '/merchants/status', {
      method: 'PUT',
      body: JSON.stringify({ merchant_id: merchantId, status, suspend_note: note }),
    }).then(() => {
      load();
      setShowModal(false);
      setActionNote('');
    });
  };

  const verify = (merchantId, verified) => {
    fetchJson(API + '/merchants/verify', {
      method: 'PUT',
      body: JSON.stringify({ merchant_id: merchantId, verified }),
    }).then(() => {
        load();
        if (selected) {
           setSelected({...selected, is_verified: verified});
        }
    });
  };

  const openManage = (m) => {
    setSelected(m);
    setShowModal(true);
  };

  return (
    <div className="container-fluid py-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Monster Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 bg-white p-4 rounded-4 shadow-sm border border-light gap-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">Merchant Command Center</h4>
          <p className="text-secondary small mb-0">Otoritas pusat untuk verifikasi, moderasi, dan audit seluruh mitra toko SahabatMart.</p>
        </div>
        <div className="d-flex gap-2">
           <input type="text" className="form-control border-light shadow-none" placeholder="Cari nama toko..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
           <button className="btn btn-primary px-4 fw-bold shadow-sm" onClick={load}>Filter</button>
        </div>
      </div>

      {/* Luxury Stats Grid */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Vendor', val: stats.total || 0, icon: 'bx-store-alt', color: '#4361ee' },
          { label: 'Verified', val: stats.active || 0, icon: 'bx-badge-check', color: '#10b981' },
          { label: 'Waiting', val: stats.pending || 0, icon: 'bx-hourglass', color: '#f59e0b' },
          { label: 'Restricted', val: stats.suspended || 0, icon: 'bx-shield-x', color: '#f43f5e' },
        ].map(s => (
          <div key={s.label} className="col-6 col-md-3">
            <div className="card border-0 rounded-4 shadow-sm h-100 overflow-hidden border border-light transition-all">
               <div className="card-body p-4 position-relative">
                  <div className="position-absolute end-0 top-0 mt-3 me-3 opacity-25">
                     <i className={`bx ${s.icon} fs-1`} style={{ color: s.color }} />
                  </div>
                  <div className="text-muted small fw-bold text-uppercase mb-1">{s.label}</div>
                  <h3 className="fw-bold mb-0" style={{ color: s.color }}>{s.val}</h3>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Table View */}
      <div className="card border-0 rounded-4 shadow-sm overflow-hidden border border-light">
        <div className="card-header bg-white border-bottom py-3">
           <div className="d-flex gap-2 overflow-auto no-scrollbar">
              {['', 'active', 'pending', 'suspended'].map(v => (
                 <button key={v} className={`btn btn-sm px-4 rounded-pill fw-bold transition-all ${filterStatus === v ? 'btn-dark' : 'btn-light border'}`} onClick={() => setFilterStatus(v)}>
                    {v === '' ? 'Semua Toko' : v.toUpperCase()}
                 </button>
              ))}
           </div>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4 py-3 text-uppercase small fw-bold text-secondary">Toko & Identitas</th>
                <th className="py-3 text-uppercase small fw-bold text-secondary text-center">Verifikasi</th>
                <th className="py-3 text-uppercase small fw-bold text-secondary">Finansial</th>
                <th className="pe-4 py-3 text-uppercase small fw-bold text-secondary text-end">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-5"><div className="spinner-border text-primary" /></td></tr>
              ) : merchants.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-5 text-muted small">Tidak ada data merchant ditemukan.</td></tr>
              ) : merchants.map(m => (
                <tr key={m.id}>
                  <td className="ps-4 py-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-light-primary text-primary rounded-3 d-flex align-items-center justify-content-center border" style={{ width: 48, height: 48 }}>
                        <i className="bx bx-store fs-4" />
                      </div>
                      <div>
                        <div className="fw-bold text-dark">{m.store_name}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>UID: {m.id.slice(0, 8).toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={`badge rounded-pill px-3 py-2 ${m.is_verified ? 'bg-success-subtle text-success border border-success' : 'bg-light text-muted border'}`}>
                       {m.is_verified ? 'OFFICIAL STORE' : 'NOT VERIFIED'}
                    </span>
                  </td>
                  <td>
                    <div className="fw-bold text-dark">{fmt(m.balance)}</div>
                    <div className="text-muted" style={{ fontSize: 10 }}>Total Sales: {fmt(m.total_sales)}</div>
                  </td>
                  <td className="pe-4 text-end">
                    <button className="btn btn-light-primary btn-sm px-3 rounded-pill fw-bold border" onClick={() => openManage(m)}>
                       Control <i className="bx bx-cog ms-1" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MERCHANT MANAGEMENT MODAL */}
      {showModal && selected && (
        <div className="modal show d-block" style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <div className="modal-header border-0 bg-dark text-white p-4">
                 <div className="d-flex align-items-center gap-3">
                    <div className="bg-white text-dark rounded-3 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                       <i className="bx bx-store-alt fs-4" />
                    </div>
                    <div>
                       <h5 className="modal-title fw-bold mb-0">{selected.store_name}</h5>
                       <small className="text-white-50">Merchant Controller Panel</small>
                    </div>
                 </div>
                 <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)} />
              </div>
              
              <div className="modal-body p-4">
                 <div className="row g-4 text-center mb-4">
                    <div className="col-4 border-end">
                       <div className="text-muted small fw-bold mb-1">TOTAL SALES</div>
                       <h5 className="fw-bold text-dark">{fmt(selected.total_sales)}</h5>
                    </div>
                    <div className="col-4 border-end">
                       <div className="text-muted small fw-bold mb-1">WALLET BAL</div>
                       <h5 className="fw-bold text-primary">{fmt(selected.balance)}</h5>
                    </div>
                    <div className="col-4">
                       <div className="text-muted small fw-bold mb-1">JOINED DATE</div>
                       <h5 className="fw-bold text-dark">{new Date(selected.joined_at).toLocaleDateString()}</h5>
                    </div>
                 </div>

                 <div className="p-4 bg-light rounded-4 border border-light mb-4 text-center">
                    <h6 className="fw-bold text-dark mb-3">Otoritas Verifikasi</h6>
                    <div className="d-flex justify-content-center gap-2">
                       <button className={`btn btn-sm px-4 rounded-pill fw-bold ${selected.is_verified ? 'btn-success' : 'btn-outline-primary'}`} onClick={() => verify(selected.id, !selected.is_verified)}>
                          <i className={`bx ${selected.is_verified ? 'bxs-check-shield' : 'bx-shield'} me-1`} /> 
                          {selected.is_verified ? 'Merchant Terverifikasi' : 'Terbitkan Verifikasi'}
                       </button>
                    </div>
                 </div>

                 <div className="mb-4">
                    <label className="form-label small fw-bold text-uppercase text-secondary">Ubah Status Operasional</label>
                    <div className="d-grid gap-2 mb-3">
                       <div className="btn-group shadow-sm border rounded-pill overflow-hidden">
                          <button className={`btn btn-sm ${selected.status === 'active' ? 'btn-success' : 'btn-light'}`} onClick={() => updateStatus(selected.id, 'active')}>ACTIVE</button>
                          <button className={`btn btn-sm ${selected.status === 'pending' ? 'btn-warning' : 'btn-light'}`} onClick={() => updateStatus(selected.id, 'pending')}>PENDING</button>
                          <button className={`btn btn-sm ${selected.status === 'suspended' ? 'btn-danger' : 'btn-light'}`} onClick={() => updateStatus(selected.id, 'suspended', actionNote)}>SUSPEND</button>
                       </div>
                    </div>
                    <textarea className="form-control bg-light border-0 py-3" rows="3" placeholder="Berikan catatan jika Anda memilih SUSPEND..." value={actionNote} onChange={e => setActionNote(e.target.value)} />
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMerchants;
