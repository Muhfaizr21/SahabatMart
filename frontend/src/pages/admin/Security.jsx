import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;

const AdminSecurity = () => {
    const [clicks, setClicks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, fraud: 0, bots: 0 });

    const loadClicks = () => {
        fetchJson(`${API}/affiliate-clicks`)
            .then(d => {
                const list = d.data || [];
                setClicks(list);
                setStats({
                    total: list.length,
                    fraud: list.filter(c => c.is_fraud).length,
                    bots: list.filter(c => c.is_bot).length
                });
            })
            .catch(err => console.error("Error loading affiliate audit:", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchJson(`${API}/affiliate-clicks`)
            .then(d => {
                const list = d.data || [];
                setClicks(list);
                setStats({
                    total: list.length,
                    fraud: list.filter(c => c.is_fraud).length,
                    bots: list.filter(c => c.is_bot).length
                });
            })
            .catch(err => console.error("Error loading affiliate audit:", err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <>
            <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
                <div className="breadcrumb-title pe-3">Keamanan & Audit</div>
                <div className="ps-3">
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-0 p-0">
                            <li className="breadcrumb-item"><Link to="/admin"><i className="bx bx-home-alt"></i></Link></li>
                            <li className="breadcrumb-item active" aria-current="page">Fraud Detection (Affiliate)</li>
                        </ol>
                    </nav>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col col-lg-4">
                    <div className="card shadow-none border bg-light-primary mb-0">
                        <div className="card-body">
                            <div className="d-flex align-items-center gap-3">
                                <div className="p-3 bg-white rounded-circle"><i className="bi bi-mouse-fill text-primary"></i></div>
                                <div><h5 className="mb-0 fw-bold">{stats.total}</h5><p className="mb-0 small text-muted">Total Klik Afiliasi</p></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col col-lg-4">
                    <div className="card shadow-none border bg-light-danger mb-0">
                        <div className="card-body">
                            <div className="d-flex align-items-center gap-3">
                                <div className="p-3 bg-white rounded-circle"><i className="bi bi-shield-slash text-danger"></i></div>
                                <div><h5 className="mb-0 fw-bold">{stats.fraud}</h5><p className="mb-0 small text-muted">Klik Mencurigakan</p></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col col-lg-4">
                    <div className="card shadow-none border bg-light-warning mb-0">
                        <div className="card-body">
                            <div className="d-flex align-items-center gap-3">
                                <div className="p-3 bg-white rounded-circle"><i className="bi bi-robot text-warning"></i></div>
                                <div><h5 className="mb-0 fw-bold">{stats.bots}</h5><p className="mb-0 small text-muted">Aktivitas Bot</p></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col col-lg-3">
                    <div className="card shadow-none border bg-light-dark mb-0">
                        <div className="card-body">
                            <div className="d-flex align-items-center gap-3">
                                <div className="p-3 bg-white rounded-circle"><i className="bi bi-key-fill text-dark"></i></div>
                                <div><h5 className="mb-0 fw-bold">12</h5><p className="mb-0 small text-muted">Failed Logins (24h)</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-none border">
                <div className="card-header py-3 d-flex align-items-center">
                    <h6 className="mb-0 fw-bold"><i className="bi bi-incognito me-2"></i>Audit Log Klik Afiliasi</h6>
                    <button className="ms-auto btn btn-xs btn-outline-secondary" onClick={loadClicks}><i className="bi bi-arrow-clockwise"></i> Refresh</button>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table align-middle table-striped mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Waktu</th>
                                    <th>IP Address</th>
                                    <th>Affiliate ID</th>
                                    <th>Referrer</th>
                                    <th className="text-center">Status</th>
                                    <th className="text-end">Tindakan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-5"><div className="spinner-border text-primary"></div></td></tr>
                                ) : clicks.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-4 text-muted">Belum ada audit data.</td></tr>
                                ) : clicks.map(c => (
                                    <tr key={c.id}>
                                        <td className="small">{new Date(c.created_at).toLocaleString('id-ID')}</td>
                                        <td><code>{c.ip_address}</code></td>
                                        <td className="small">{c.affiliate_id.slice(0,8)}</td>
                                        <td className="text-truncate" style={{maxWidth:200}}><small className="text-muted">{c.referrer || 'Direct'}</small></td>
                                        <td className="text-center">
                                            {c.is_fraud ? <span className="badge bg-danger">FRAUD</span> : 
                                             c.is_bot ? <span className="badge bg-warning text-dark">BOT</span> : 
                                             <span className="badge bg-success">SECURE</span>}
                                        </td>
                                        <td className="text-end">
                                            <button className="btn btn-xs btn-outline-danger" title="Block Affiliate"><i className="bi bi-slash-circle"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="alert alert-light mt-4 border-0 shadow-sm" style={{fontSize:11}}>
                <h6 className="fw-bold small mb-1">Informasi Analisis Fraud:</h6>
                Sistem secara otomatis mendeteksi pola klik yang tidak wajar seperti IP berturut-turut dalam waktu singkat, User Agent bot yang dikenal, dan Referrer kosong pada konversi tinggi. Super Admin berhak membatalkan pembayaran komisi jika terbukti ada kecurangan.
            </div>
        </>
    );
};

export default AdminSecurity;
