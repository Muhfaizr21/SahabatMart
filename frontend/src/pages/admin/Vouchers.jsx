import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const AdminVouchers = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: 0, code: '', title: '', discount_type: 'fixed', discount_value: 0, min_order: 0, quota: 100, status: 'active' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchJson(`${API}/vouchers`)
      .then(d => setVouchers(d.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openForm = (v = null) => {
    if (v) {
      setFormData(v);
    } else {
      setFormData({ id: 0, code: '', title: '', discount_type: 'fixed', discount_value: 0, min_order: 0, quota: 100, status: 'active' });
    }
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    fetchJson(`${API}/vouchers/upsert`, {
      method: 'POST',
      body: JSON.stringify(formData)
    }).then(() => {
      load();
      setShowModal(false);
    }).catch(err => alert("Gagal: " + err.message))
      .finally(() => setSaving(false));
  };

  const handleDelete = (id) => {
    if (!window.confirm("Hapus voucher ini secara permanen?")) return;
    fetchJson(`${API}/vouchers/delete?id=${id}`, { method: 'DELETE' })
      .then(() => load())
      .catch(err => alert("Gagal: " + err.message));
  };

  return (
    <div className="container-fluid py-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Monster Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 bg-white p-4 rounded-4 shadow-sm border border-light gap-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">Marketing Vouchers</h4>
          <p className="text-secondary small mb-0">Kelola kampanye diskon dan insentif belanja platform.</p>
        </div>
        <button className="btn btn-primary px-4 py-2 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow" onClick={() => openForm()}>
          <i className="bx bx-plus fs-5" /> Buat Voucher Baru
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : vouchers.length === 0 ? (
        <div className="text-center py-5 bg-white rounded-4 border">
           <i className="bx bxs-coupon text-light mb-3" style={{ fontSize: 60 }} />
           <p className="text-muted">Belum ada promo aktif.</p>
        </div>
      ) : (
        <div className="row g-4">
          {vouchers.map(v => {
            const usedPct = v.quota > 0 ? Math.round((v.used / v.quota) * 100) : 0;
            return (
              <div key={v.id} className="col-12 col-md-6 col-xl-4">
                <div className="card border-0 rounded-4 shadow-sm overflow-hidden h-100 transition-all border border-light">
                  <div className="p-4" style={{ borderBottom: '1px dashed #e2e8f0' }}>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="bg-primary-subtle text-primary p-2 rounded-3">
                        <i className="bx bxs-coupon fs-4" />
                      </div>
                      <span className={`badge rounded-pill px-3 py-2 ${v.status === 'active' ? 'bg-success-subtle text-success' : 'bg-light text-secondary'}`}>
                        {v.status.toUpperCase()}
                      </span>
                    </div>
                    <h6 className="fw-bold text-dark mb-1">{v.title}</h6>
                    <div className="d-inline-block bg-light border px-3 py-2 rounded-3 mt-2 fw-bold text-primary font-monospace" style={{ letterSpacing: 1 }}>
                      {v.code}
                    </div>
                  </div>
                  <div className="p-4 flex-grow-1">
                    <div className="row g-3 mb-4">
                      <div className="col-6">
                        <small className="text-uppercase text-secondary fw-bold" style={{ fontSize: 10 }}>Diskon</small>
                        <div className="fw-bold text-dark">{v.discount_type === 'percent' ? `${v.discount_value}%` : fmt(v.discount_value)}</div>
                      </div>
                      <div className="col-6 text-end">
                        <small className="text-uppercase text-secondary fw-bold" style={{ fontSize: 10 }}>Min. Order</small>
                        <div className="fw-bold text-dark">{fmt(v.min_order)}</div>
                      </div>
                    </div>
                    <div>
                      <div className="d-flex justify-content-between small mb-2 text-secondary">
                        <span>Penggunaan</span>
                        <span className="fw-bold">{v.used || 0} / {v.quota}</span>
                      </div>
                      <div className="progress rounded-pill shadow-sm" style={{ height: 8 }}>
                        <div className={`progress-bar rounded-pill ${usedPct > 80 ? 'bg-danger' : 'bg-primary'}`} style={{ width: `${usedPct}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-light border-top d-flex gap-2">
                     <button className="btn btn-white border w-50 fw-bold small text-warning d-flex align-items-center justify-content-center gap-1" onClick={() => openForm(v)}>
                       <i className="bx bx-edit" /> Edit
                     </button>
                     <button className="btn btn-white border w-50 fw-bold small text-danger d-flex align-items-center justify-content-center gap-1" onClick={() => handleDelete(v.id)}>
                       <i className="bx bx-trash" /> Hapus
                     </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MONSTER MODAL */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <div className="modal-header border-0 bg-light p-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bx bxs-coupon text-primary" />
                  {formData.id ? 'Perbarui Aturan Voucher' : 'Buat Voucher Kampanye Baru'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body p-4 p-md-5">
                <form onSubmit={handleSubmit}>
                  <div className="row g-4">
                    <div className="col-12">
                      <label className="form-label small fw-bold text-uppercase text-secondary">Judul Voucher</label>
                      <input type="text" className="form-control form-control-lg border-2 rounded-3 fs-6" 
                        placeholder="Misal: Promo Ramadhan Berkah" value={formData.title} 
                        onChange={e => setFormData({...formData, title: e.target.value})} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-uppercase text-secondary">Kode (Unik)</label>
                      <input type="text" className="form-control form-control-lg border-2 rounded-3 fs-6 fw-bold text-primary" 
                        placeholder="KODE123" value={formData.code} 
                        onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-uppercase text-secondary">Status</label>
                      <select className="form-select form-select-lg border-2 rounded-3 fs-6" 
                        value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                        <option value="active">Aktif (Live)</option>
                        <option value="inactive">Nonaktif</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-uppercase text-secondary">Tipe Diskon</label>
                      <select className="form-select form-select-lg border-2 rounded-3 fs-6" 
                        value={formData.discount_type} onChange={e => setFormData({...formData, discount_type: e.target.value})}>
                        <option value="fixed">Nominal Tetap (IDR)</option>
                        <option value="percent">Persentase (%)</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-uppercase text-secondary">Nilai Diskon</label>
                      <input type="number" className="form-control form-control-lg border-2 rounded-3 fs-6" 
                        value={formData.discount_value} onChange={e => setFormData({...formData, discount_value: parseFloat(e.target.value) || 0})} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-uppercase text-secondary">Min. Pembelian</label>
                      <input type="number" className="form-control form-control-lg border-2 rounded-3 fs-6" 
                        value={formData.min_order} onChange={e => setFormData({...formData, min_order: parseFloat(e.target.value) || 0})} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-uppercase text-secondary">Kuota Total</label>
                      <input type="number" className="form-control form-control-lg border-2 rounded-3 fs-6" 
                        value={formData.quota} onChange={e => setFormData({...formData, quota: parseInt(e.target.value) || 0})} required />
                    </div>
                  </div>

                  <div className="d-flex gap-3 mt-5">
                    <button type="button" className="btn btn-light w-100 py-3 rounded-3 fw-bold text-secondary" onClick={() => setShowModal(false)}>Batalkan</button>
                    <button type="submit" className="btn btn-primary w-100 py-3 rounded-3 fw-bold shadow-lg" disabled={saving}>
                      {saving ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bx bx-check-double me-2" />}
                      {formData.id ? 'Simpan Perubahan' : 'Terbitkan Voucher'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVouchers;
