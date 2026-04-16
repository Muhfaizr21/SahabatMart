import React, { useState, useEffect } from 'react';
import { ADMIN_API_BASE, fetchJson } from '../../lib/api';

const API = ADMIN_API_BASE;

const AdminLogistics = () => {
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadLogistics = () => {
        setLoading(true);
        fetchJson(`${API}/logistics`)
            .then(d => setChannels(d.data || []))
            .catch(err => console.error("Error loading logistics:", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadLogistics(); }, []);

    const toggleChannelStatus = (id, active) => {
        fetchJson(`${API}/logistics/toggle`, {
            method: 'POST',
            body: JSON.stringify({ id, active }),
        }).then(() => loadLogistics())
          .catch(err => alert("Gagal ubah status: " + err.message));
    };

    return (
        <div className="container-fluid py-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Monster Header */}
            <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 bg-white p-4 rounded-4 shadow-sm border border-light gap-3">
                <div>
                    <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                        <i className="bx bxs-truck text-primary" />
                        Courier Integration Center
                    </h4>
                    <p className="text-secondary small mb-0">Kelola gateway ekspedisi dan partner pengiriman platform SahabatMart.</p>
                </div>
                <button className="btn btn-light-primary fw-bold px-4 rounded-3 border" onClick={loadLogistics}>
                    <i className="bx bx-refresh ms-1" /> Sinkronkan Data
                </button>
            </div>

            <div className="row g-4">
                {loading ? (
                    <div className="col-12 text-center py-5"><div className="spinner-border text-primary" /></div>
                ) : channels.length === 0 ? (
                    <div className="col-12 text-center py-5 bg-white rounded-4 border">
                        <i className="bx bx-info-circle text-muted fs-1 mb-2" />
                        <p className="text-muted">Data saluran logistik belum tersedia.</p>
                    </div>
                ) : channels.map(c => (
                    <div key={c.id} className="col-12 col-md-6 col-lg-4">
                        <div className="card border-0 rounded-4 shadow-sm transition-all border border-light overflow-hidden h-100">
                            <div className="card-body p-4">
                                <div className="d-flex align-items-center gap-3 mb-3">
                                    <div className="bg-light p-2 rounded-3 border d-flex align-items-center justify-content-center shadow-sm" style={{ width: 60, height: 60 }}>
                                        <img src={`https://ui-avatars.com/api/?name=${c.code}&background=4361ee&color=fff&size=100`} 
                                            alt={c.name} className="rounded-2" style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                            onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/713/713311.png'; }} />
                                    </div>
                                    <div className="flex-grow-1">
                                        <h6 className="fw-bold text-dark mb-0">{c.name}</h6>
                                        <span className="badge bg-light text-primary font-monospace mt-1" style={{ fontSize: 10 }}>{c.code.toUpperCase()}</span>
                                    </div>
                                    <div className="form-check form-switch ms-auto">
                                        <input className="form-check-input shadow-none" type="checkbox" role="switch" style={{ width: '2.5em', height: '1.25em', cursor: 'pointer' }}
                                            checked={c.is_active} onChange={e => toggleChannelStatus(c.id, e.target.checked)} />
                                    </div>
                                </div>
                                <div className="pt-3 border-top mt-3">
                                    <div className="d-flex justify-content-between align-items-center small text-secondary">
                                        <span>Status Operasional:</span>
                                        <span className={`fw-bold ${c.is_active ? 'text-success' : 'text-danger'}`}>
                                            {c.is_active ? 'ACTIVE' : 'DISABLED'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="alert bg-primary-subtle border-primary mt-5 p-4 rounded-4 shadow-sm border-0 d-flex align-items-start gap-3">
                <i className="bx bx-info-square fs-3 text-primary" />
                <div>
                   <h6 className="fw-bold text-primary-emphasis mb-1">Penting: Perubahan Masif</h6>
                   <p className="text-primary-emphasis small mb-0">Mengaktifkan/menonaktifkan saluran logistik di sini akan berdampak langsung pada opsi pengiriman bagi semua merchant dan pembeli di platform SahabatMart secara real-time.</p>
                </div>
            </div>
        </div>
    );
};

export default AdminLogistics;
