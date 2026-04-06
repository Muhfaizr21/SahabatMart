import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;

export default function AdminCommissions() {
  const [categories, setCategories] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [catComms, setCatComms] = useState([]);
  const [merchComms, setMerchComms] = useState([]);
  const [activeTab, setActiveTab] = useState('category');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('category'); // 'category' or 'merchant'
  const [formData, setFormData] = useState({
    id: 0,
    category_id: 0,
    merchant_id: '',
    fee_percent: 0.05,
    fixed_fee: 0,
    is_active: true
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchJson(API + '/categories'),
      fetchJson(API + '/merchants'),
      fetchJson(API + '/commissions/category'),
      fetchJson(API + '/commissions/merchant'),
    ]).then(([c, m, cc, mc]) => {
      setCategories(c.data || []);
      setMerchants(m.data || []);
      setCatComms(cc.data || []);
      setMerchComms(mc.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = (e) => {
    e.preventDefault();
    const endpoint = modalType === 'category' ? '/commissions/category' : '/commissions/merchant';
    fetchJson(API + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    }).then(() => {
      loadData();
      setShowModal(false);
    });
  };

  return (
    <div className="fade-in px-4 py-3">
      <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-4">
        <div className="breadcrumb-title pe-3 border-0 h4 mb-0 fw-bold text-dark">Commission Engine</div>
        <div className="ps-3 border-start">
          <nav><ol className="breadcrumb mb-0 p-0 bg-transparent">
            <li className="breadcrumb-item"><Link to="/admin" className="text-decoration-none text-muted small"><i className="bx bx-home-alt"></i></Link></li>
            <li className="breadcrumb-item active text-muted small" aria-current="page">Fee Analytics & Protocols</li>
          </ol></nav>
        </div>
      </div>

      <div className="card border-0 shadow-sm overflow-hidden">
        <div className="card-header bg-white border-bottom-0 pt-4 px-4 pb-0">
          <ul className="nav nav-tabs border-bottom-0 gap-4" style={{ marginBottom: -1 }}>
            <li className="nav-item">
              <button className={`nav-link border-0 px-0 py-3 fw-bold small text-uppercase letter-spacing-1 ${activeTab === 'category' ? 'active border-bottom border-primary border-4 text-primary bg-transparent' : 'text-muted opacity-50'}`} 
                onClick={() => setActiveTab('category')}>
                <i className="bx bx-grid-alt me-2"></i> Category Defaults
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link border-0 px-0 py-3 fw-bold small text-uppercase letter-spacing-1 ${activeTab === 'merchant' ? 'active border-bottom border-primary border-4 text-primary bg-transparent' : 'text-muted opacity-50'}`} 
                onClick={() => setActiveTab('merchant')}>
                <i className="bx bx-store-alt me-2"></i> Merchant Overrides
              </button>
            </li>
          </ul>
        </div>
        <div className="card-body p-4 pt-1">
          <div className="d-flex align-items-center justify-content-between mb-4 mt-3">
             <div className="bg-light p-3 radius-12 border-0 flex-grow-1 me-3">
                <div className="d-flex align-items-center gap-2 mb-1">
                   <div className="dot rounded-circle bg-primary" style={{ width: 8, height: 8 }}></div>
                   <h6 className="fw-bold mb-0 small text-uppercase letter-spacing-1 text-dark">Operational Intelligence</h6>
                </div>
                <p className="mb-0 x-small text-muted fw-medium">Global fee percentages drive automated settlements per transaction across the platform ecosystem.</p>
             </div>
             <button className="btn btn-primary radius-10 px-4 py-2 fw-bold shadow-sm" onClick={() => { setModalType(activeTab); setFormData({ id: 0, category_id: 0, merchant_id: '', fee_percent: 0.05, fixed_fee: 0, is_active: true }); setShowModal(true); }}>
               <i className="bx bx-plus-circle me-1"></i> New Protocol
             </button>
          </div>

          <div className="table-responsive">
            <table className="table align-middle table-hover border-top">
              <thead>
                <tr className="x-small text-uppercase text-muted fw-bold bg-light bg-opacity-50">
                  <th className="ps-4 py-3 border-0">Subject Identifier</th>
                  <th className="py-3 border-0">Base Fee (%)</th>
                  <th className="py-3 border-0">Fixed Surcharge</th>
                  <th className="py-3 border-0">Status</th>
                  <th className="pe-4 text-end py-3 border-0">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeTab === 'category' ? (
                  catComms.map(c => {
                    const catName = categories.find(cat => cat.id === c.category_id)?.name || 'Generic';
                    return (
                      <tr key={c.id}>
                        <td className="ps-4"><span className="fw-bold text-dark">{catName.toUpperCase()}</span></td>
                        <td><span className="badge bg-primary bg-opacity-10 text-primary radius-pill px-3 py-1 fw-bold">{(c.fee_percent * 100).toFixed(1)}%</span></td>
                        <td><span className="fw-medium text-dark">Rp {c.fixed_fee.toLocaleString()}</span></td>
                        <td><span className={`badge ${c.is_active ? 'bg-success' : 'bg-danger'} bg-opacity-10 ${c.is_active ? 'text-success' : 'text-danger'} radius-pill px-2 py-1 x-small fw-bold`}>{c.is_active ? 'ENABLED' : 'DISABLED'}</span></td>
                        <td className="pe-4 text-end">
                          <button className="btn btn-sm btn-light border-0 shadow-sm radius-8 px-3 fw-bold" onClick={() => { setModalType('category'); setFormData(c); setShowModal(true); }}>
                             <i className="bx bx-pencil me-1"></i> Modify
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  merchComms.map(m => {
                    const storeName = merchants.find(merch => merch.id === m.merchant_id)?.store_name || 'Individual Merchant';
                    return (
                      <tr key={m.id}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center gap-2">
                             <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3"><i className="bx bx-store fs-6"></i></div>
                             <span className="fw-bold text-dark">{storeName}</span>
                          </div>
                        </td>
                        <td><span className="badge bg-primary bg-opacity-10 text-primary radius-pill px-3 py-1 fw-bold">{(m.fee_percent * 100).toFixed(1)}%</span></td>
                        <td><span className="fw-medium text-dark">Rp {m.fixed_fee.toLocaleString()}</span></td>
                        <td><span className="badge bg-light text-muted radius-pill border shadow-sm px-2 py-1 x-small fw-bold">MASTER DEAL</span></td>
                        <td className="pe-4 text-end">
                          <button className="btn btn-sm btn-light border-0 shadow-sm radius-8 px-3 fw-bold" onClick={() => { setModalType('merchant'); setFormData(m); setShowModal(true); }}>
                             <i className="bx bx-pencil me-1"></i> Edit Deal
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter:'blur(8px)' }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: '500px' }}>
            <div className="modal-content border-0 radius-20 shadow-lg">
              <form onSubmit={handleSave}>
                <div className="modal-header border-0 p-4 pb-0">
                   <div>
                      <h5 className="modal-title fw-bold text-dark">Commission Protocol</h5>
                      <p className="text-muted x-small mb-0 text-uppercase fw-bold letter-spacing-1">Override dynamic settlement rates</p>
                   </div>
                   <button type="button" className="btn-close shadow-none" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    {modalType === 'category' ? (
                      <div className="col-12">
                        <label className="form-label x-small fw-bold text-muted text-uppercase mb-2">Subject Category</label>
                        <select className="form-select radius-12 bg-light border-0 py-2 fw-medium shadow-none" 
                          value={formData.category_id} onChange={e => setFormData({ ...formData, category_id: parseInt(e.target.value) })} required>
                          <option value="0">-- Select Catalog Index --</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div className="col-12">
                        <label className="form-label x-small fw-bold text-muted text-uppercase mb-2">Subject Merchant</label>
                        <select className="form-select radius-12 bg-light border-0 py-2 fw-medium shadow-none" 
                          value={formData.merchant_id} onChange={e => setFormData({ ...formData, merchant_id: e.target.value })} required>
                          <option value="">-- Select Registered Merchant --</option>
                          {merchants.map(m => <option key={m.id} value={m.id}>{m.store_name.toUpperCase()}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="col-md-6">
                      <label className="form-label x-small fw-bold text-muted text-uppercase mb-2">Relative Fee Rate</label>
                      <div className="input-group">
                        <input type="number" step="0.0001" className="form-control radius-12 bg-light border-0 py-2 fw-bold shadow-none" 
                          value={formData.fee_percent} onChange={e => setFormData({ ...formData, fee_percent: parseFloat(e.target.value) })} />
                        <span className="input-group-text bg-light border-0 x-small fw-bold">RATIO</span>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label x-small fw-bold text-muted text-uppercase mb-2">Fixed Surcharge</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-0 x-small fw-bold">RP</span>
                        <input type="number" className="form-control radius-12 bg-light border-0 py-2 fw-bold shadow-none" 
                          value={formData.fixed_fee} onChange={e => setFormData({ ...formData, fixed_fee: parseFloat(e.target.value) })} />
                      </div>
                    </div>
                    <div className="col-12">
                       <div className="bg-light p-3 radius-12 d-flex align-items-center justify-content-between border border-white">
                          <div>
                            <span className="x-small fw-bold text-dark text-uppercase d-block mb-0">Protocol State</span>
                            <span className="x-small text-muted">Toggle settlement automation</span>
                          </div>
                          <div className="form-check form-switch mb-0">
                             <input className="form-check-input ms-0 shadow-none" type="checkbox" style={{ width: '2.5rem', height: '1.25rem', cursor: 'pointer' }}
                               checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 p-4 pt-0">
                  <button type="submit" className="btn btn-primary radius-10 w-100 fw-bold shadow-sm py-2">Save Commission Logic <i className="bx bx-check-circle ms-1"></i></button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
