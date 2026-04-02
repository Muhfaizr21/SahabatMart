import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;
const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
const EMPTY_FORM = { id: 0, code: '', title: '', discount_type: 'percent', discount_value: 0, min_order: 0, quota: 0, status: 'active' };

const AdminVouchers = () => {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const loadVouchers = () => {
        fetchJson(`${API}/vouchers`)
            .then(d => setVouchers(d.data || []))
            .catch(err => console.error("Error loading vouchers:", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchJson(`${API}/vouchers`)
            .then(d => setVouchers(d.data || []))
            .catch(err => console.error("Error loading vouchers:", err))
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSaving(true);
        setLoading(true);
        fetch(`${API}/vouchers/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        }).then(r => r.json()).then(() => {
            loadVouchers();
            setFormData(EMPTY_FORM);
        }).finally(() => setSaving(false));
    };

    return (
        <>
            <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
                <div className="breadcrumb-title pe-3">Pemasaran</div>
                <div className="ps-3">
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-0 p-0">
                            <li className="breadcrumb-item"><Link to="/admin"><i className="bx bx-home-alt"></i></Link></li>
                            <li className="breadcrumb-item active" aria-current="page">Voucher Platform (Subsidi)</li>
                        </ol>
                    </nav>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-12 col-lg-4">
                    <div className="card shadow-none border">
                        <div className="card-header py-3 bg-light-info">
                            <h6 className="mb-0 fw-bold text-info"><i className="bi bi-gift me-2"></i>Buat Voucher Subsidi</h6>
                        </div>
                        <div className="card-body">
                            <form className="row g-3" onSubmit={handleSubmit}>
                                <div className="col-12">
                                    <label className="form-label small fw-bold">Kode Voucher</label>
                                    <input type="text" className="form-control form-control-sm text-uppercase font-monospace" placeholder="SAHABATRAMADAN" 
                                        value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} required />
                                </div>
                                <div className="col-12">
                                    <label className="form-label small fw-bold">Judul Promo</label>
                                    <input type="text" className="form-control form-control-sm" placeholder="Diskon Subsidi Harbolnas" 
                                        value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                                </div>
                                <div className="col-6">
                                    <label className="form-label small fw-bold">Tipe Diskon</label>
                                    <select className="form-select form-select-sm" value={formData.discount_type} onChange={e => setFormData({...formData, discount_type: e.target.value})}>
                                        <option value="percent">Persentase (%)</option>
                                        <option value="fixed">Nilai Tetap (Rp)</option>
                                    </select>
                                </div>
                                <div className="col-6">
                                    <label className="form-label small fw-bold">Nilai Diskon</label>
                                    <input type="number" className="form-control form-control-sm" value={formData.discount_value} onChange={e => setFormData({...formData, discount_value: parseFloat(e.target.value)})} />
                                </div>
                                <div className="col-12">
                                    <label className="form-label small fw-bold">Minimal Belanja (Rp)</label>
                                    <input type="number" className="form-control form-control-sm" value={formData.min_order} onChange={e => setFormData({...formData, min_order: parseFloat(e.target.value)})} />
                                </div>
                                <div className="col-12">
                                    <label className="form-label small fw-bold">Kuota Total Penggunaan</label>
                                    <input type="number" className="form-control form-control-sm" value={formData.quota} onChange={e => setFormData({...formData, quota: parseInt(e.target.value)})} />
                                </div>
                                <div className="col-12 mt-3">
                                    <button type="submit" className="btn btn-sm btn-primary w-100" disabled={saving}>
                                        {saving ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-save me-1"></i>}
                                        Aktifkan Voucher
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-8">
                    <div className="card shadow-none border">
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table align-middle table-striped mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Kode & Promo</th>
                                            <th>Diskon</th>
                                            <th>Kuota</th>
                                            <th>Status</th>
                                            <th className="text-end">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={5} className="text-center py-4"><div className="spinner-border text-primary"></div></td></tr>
                                        ) : vouchers.length === 0 ? (
                                            <tr><td colSpan={5} className="text-center py-4 text-muted">Belum ada voucher aktif.</td></tr>
                                        ) : vouchers.map(v => (
                                            <tr key={v.id}>
                                                <td>
                                                    <div className="fw-bold font-monospace text-primary">{v.code}</div>
                                                    <div className="small text-muted" style={{fontSize:10}}>{v.title}</div>
                                                </td>
                                                <td>
                                                    <div className="small">
                                                        {v.discount_type === 'percent' ? v.discount_value + '%' : fmt(v.discount_value)}
                                                    </div>
                                                    <div className="text-muted" style={{fontSize:9}}>Min. Order: {fmt(v.min_order)}</div>
                                                </td>
                                                <td><span className="small">{v.used} / {v.quota}</span></td>
                                                <td>
                                                    <span className={`badge rounded-pill bg-light-${v.status === 'active' ? 'success text-success' : 'danger text-danger'}`}>
                                                        {v.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    <button className="btn btn-xs btn-outline-warning" onClick={() => setFormData({
                                                        id: v.id || 0,
                                                        code: v.code || '',
                                                        title: v.title || '',
                                                        discount_type: v.discount_type || 'percent',
                                                        discount_value: v.discount_value || 0,
                                                        min_order: v.min_order || 0,
                                                        quota: v.quota || 0,
                                                        status: v.status || 'active',
                                                    })}><i className="bi bi-pencil"></i></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminVouchers;
